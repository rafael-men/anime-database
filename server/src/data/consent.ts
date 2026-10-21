export const CONSENT_COOKIE_NAME = 'cookie_consent';
export const CONSENT_VERSION = '1';
export const CONSENT_TTL_MS = 180 * 24 * 60 * 60 * 1000;
export const CONSENT_MAX_COOKIE_LENGTH = 512;

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing';

export interface ConsentDecision {
  version: string;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
}

export interface ConsentStatus {
  version: string;
  decided: boolean;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string | null;
}

export function createConsentDecision(input: {
  analytics: boolean;
  marketing: boolean;
  now?: Date;
}): ConsentDecision {
  return {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: input.analytics,
    marketing: input.marketing,
    decidedAt: (input.now ?? new Date()).toISOString(),
  };
}

export function parseConsent(
  raw: string | undefined | null,
): ConsentDecision | null {
  if (!raw || raw.length > CONSENT_MAX_COOKIE_LENGTH) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const candidate = parsed as Record<string, unknown>;

  if (
    candidate.version !== CONSENT_VERSION ||
    typeof candidate.analytics !== 'boolean' ||
    typeof candidate.marketing !== 'boolean' ||
    candidate.necessary !== true ||
    typeof candidate.decidedAt !== 'string' ||
    Number.isNaN(Date.parse(candidate.decidedAt))
  ) {
    return null;
  }

  return {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: candidate.analytics,
    marketing: candidate.marketing,
    decidedAt: candidate.decidedAt,
  };
}

export function serializeConsent(decision: ConsentDecision): string {
  return JSON.stringify(decision);
}

export function toConsentStatus(
  decision: ConsentDecision | null,
): ConsentStatus {
  return {
    version: CONSENT_VERSION,
    decided: decision !== null,
    necessary: true,
    analytics: decision?.analytics ?? false,
    marketing: decision?.marketing ?? false,
    decidedAt: decision?.decidedAt ?? null,
  };
}
