export const ADULT_REQUEST_STATUSES = [
  'none',
  'pending',
  'approved',
  'denied',
] as const;

export type AdultRequestStatus = (typeof ADULT_REQUEST_STATUSES)[number];

export const DEFAULT_ADULT_REQUEST_STATUS: AdultRequestStatus = 'none';
