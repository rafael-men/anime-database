export interface OriginSources {
  frontendUrls?: string;
  frontendUrl?: string;
  adminFrontendUrl?: string;
}

export const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:4200';
export const DEFAULT_ADMIN_FRONTEND_ORIGIN = 'http://localhost:4000';

export function normalizeOrigin(raw: string | undefined | null): string | null {
  const value = raw?.trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function parseOrigins(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => origin !== null);
}

export function resolveAllowedOrigins(sources: OriginSources): string[] {
  const origins = new Set<string>([
    ...parseOrigins(sources.frontendUrls),
    ...parseOrigins(sources.frontendUrl),
    ...parseOrigins(sources.adminFrontendUrl),
  ]);

  if (origins.size === 0) {
    origins.add(DEFAULT_FRONTEND_ORIGIN);
  }

  origins.add(DEFAULT_FRONTEND_ORIGIN);
  origins.add(DEFAULT_ADMIN_FRONTEND_ORIGIN);

  return [...origins];
}
