import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

export const DEFAULT_JSON_BODY_LIMIT = '100kb';
export const DEFAULT_URLENCODED_BODY_LIMIT = '50kb';

/** Teto absoluto: um limite acima disso nao faz sentido para uma API JSON. */
export const MAX_BODY_LIMIT_BYTES = 2 * 1024 * 1024;

const LIMIT_PATTERN = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i;
const UNIT_MULTIPLIERS: Record<string, number> = {
  b: 1,
  kb: 1024,
  mb: 1024 * 1024,
  gb: 1024 * 1024 * 1024,
};

export function toBytes(raw: string): number | null {
  const match = LIMIT_PATTERN.exec(raw.trim());

  if (!match) {
    return null;
  }

  const unit = (match[2] ?? 'b').toLowerCase();

  return Number(match[1]) * (UNIT_MULTIPLIERS[unit] ?? 1);
}

/**
 * Le um limite do ambiente no formato aceito pelo body-parser (`100kb`,
 * `1mb`). Valores invalidos caem no padrao e valores acima do teto sao
 * cortados, para que um erro de digitacao nao abra a porta para payloads
 * arbitrarios.
 */
export function resolveBodyLimit(
  raw: string | undefined,
  fallback: string,
  name: string,
): string {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const bytes = toBytes(raw);

  if (bytes === null || bytes <= 0) {
    Logger.warn(
      `${name} invalido ("${raw}"); usando o padrao ${fallback}.`,
      'BodyLimits',
    );
    return fallback;
  }

  if (bytes > MAX_BODY_LIMIT_BYTES) {
    Logger.warn(
      `${name} (${raw}) acima do teto de ${MAX_BODY_LIMIT_BYTES} bytes; limitando a 2mb.`,
      'BodyLimits',
    );
    return '2mb';
  }

  return raw.trim().toLowerCase();
}

export interface BodyLimits {
  json: string;
  urlencoded: string;
}

export function resolveBodyLimits(
  env: NodeJS.ProcessEnv = process.env,
): BodyLimits {
  return {
    json: resolveBodyLimit(
      env.BODY_LIMIT_JSON,
      DEFAULT_JSON_BODY_LIMIT,
      'BODY_LIMIT_JSON',
    ),
    urlencoded: resolveBodyLimit(
      env.BODY_LIMIT_URLENCODED,
      DEFAULT_URLENCODED_BODY_LIMIT,
      'BODY_LIMIT_URLENCODED',
    ),
  };
}

/**
 * Registra os parsers de corpo com limite explicito. Precisa ser chamado num
 * app criado com `{ bodyParser: false }`: caso contrario o parser padrao do
 * Nest (100kb) roda antes e rejeita o payload mesmo quando o limite e maior.
 */
export function applyBodyParsers(
  app: NestExpressApplication,
  env: NodeJS.ProcessEnv = process.env,
): BodyLimits {
  const limits = resolveBodyLimits(env);

  app.useBodyParser('json', { limit: limits.json });
  app.useBodyParser('urlencoded', { extended: true, limit: limits.urlencoded });

  return limits;
}
