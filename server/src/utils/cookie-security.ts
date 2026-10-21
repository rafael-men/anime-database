import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

export type CookieSameSite = 'lax' | 'strict' | 'none';

export const COOKIE_ATTRIBUTE_DEFAULTS = {
  sameSite: 'lax' as CookieSameSite,
  path: '/',
};

export interface CookieSecuritySettings {
  /** Dominio explicito (ex.: `.exemplo.com`). Ausente = cookie host-only. */
  domain?: string;
  sameSite: CookieSameSite;
  /**
   * `true` em producao por padrao. `SameSite=None` exige `Secure`, entao
   * `COOKIE_SAME_SITE=none` forca `secure: true` mesmo em desenvolvimento.
   */
  secure: boolean;
  path: string;
}

const VALID_SAME_SITE: readonly CookieSameSite[] = ['lax', 'strict', 'none'];
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

function readBoolean(raw: string | undefined): boolean | undefined {
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }

  const value = raw.trim().toLowerCase();

  if (TRUE_VALUES.has(value)) {
    return true;
  }

  if (FALSE_VALUES.has(value)) {
    return false;
  }

  return undefined;
}

/**
 * Aceita apenas um host (com ou sem ponto inicial). Valores com protocolo,
 * caminho ou espaco sao descartados: um `domain` invalido faria o navegador
 * rejeitar o cookie silenciosamente e derrubar o login.
 */
export function normalizeCookieDomain(
  raw: string | undefined,
): string | undefined {
  const value = raw?.trim().toLowerCase();

  if (!value) {
    return undefined;
  }

  if (value.startsWith('localhost')) {
    return undefined;
  }

  if (
    !/^\.?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(
      value,
    )
  ) {
    Logger.warn(
      `COOKIE_DOMAIN invalido ("${raw}") ignorado; o cookie sera host-only.`,
      'CookieSecurity',
    );
    return undefined;
  }

  return value;
}

export function resolveCookieSecurity(
  config: Pick<ConfigService, 'get'>,
): CookieSecuritySettings {
  const isProduction =
    config.get<string>('NODE_ENV', 'development') === 'production';

  const rawSameSite = config.get<string>(
    'COOKIE_SAME_SITE',
    COOKIE_ATTRIBUTE_DEFAULTS.sameSite,
  );
  const normalizedSameSite = rawSameSite?.trim().toLowerCase();
  let sameSite: CookieSameSite = COOKIE_ATTRIBUTE_DEFAULTS.sameSite;

  if (
    normalizedSameSite &&
    VALID_SAME_SITE.includes(normalizedSameSite as CookieSameSite)
  ) {
    sameSite = normalizedSameSite as CookieSameSite;
  } else if (normalizedSameSite) {
    Logger.warn(
      `COOKIE_SAME_SITE invalido ("${rawSameSite}"); usando "${sameSite}".`,
      'CookieSecurity',
    );
  }

  const configuredSecure = readBoolean(config.get<string>('COOKIE_SECURE'));
  let secure = configuredSecure ?? isProduction;

  if (sameSite === 'none' && !secure) {
    Logger.warn(
      'SameSite=None exige Secure; forçando COOKIE_SECURE=true para o cookie.',
      'CookieSecurity',
    );
    secure = true;
  }

  return {
    domain: normalizeCookieDomain(config.get<string>('COOKIE_DOMAIN')),
    sameSite,
    secure,
    path: COOKIE_ATTRIBUTE_DEFAULTS.path,
  };
}

/**
 * Opcoes usadas ao gravar o cookie de sessao/consentimento. `domain` so e
 * enviado quando configurado de forma explicita; sem ele o cookie e host-only,
 * que e o padrao mais restritivo.
 */
export function buildCookieOptions(
  security: CookieSecuritySettings,
  maxAgeMs: number,
  options: { httpOnly?: boolean; sameSite?: CookieSameSite } = {},
): CookieOptions {
  const cookie: CookieOptions = {
    httpOnly: options.httpOnly ?? true,
    sameSite: options.sameSite ?? security.sameSite,
    secure: security.secure,
    path: security.path,
    maxAge: maxAgeMs,
  };

  if (security.domain) {
    cookie.domain = security.domain;
  }

  return cookie;
}

/**
 * Opcoes usadas ao apagar o cookie. Sem `maxAge`/`expires` da gravacao: o
 * `clearCookie` do Express ja envia `Expires` no passado, e o `domain`/`path`
 * precisam ser identicos aos da gravacao para o navegador remover o cookie.
 */
export function buildClearCookieOptions(
  security: CookieSecuritySettings,
  options: { httpOnly?: boolean } = {},
): CookieOptions {
  const cookie: CookieOptions = {
    httpOnly: options.httpOnly ?? true,
    sameSite: security.sameSite,
    secure: security.secure,
    path: security.path,
  };

  if (security.domain) {
    cookie.domain = security.domain;
  }

  return cookie;
}
