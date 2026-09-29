import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { Observable, defer, from, of, throwError, timer } from 'rxjs';
import {
  catchError,
  delayWhen,
  finalize,
  map,
  retryWhen,
  scan,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import { ANILIST_API_BASE } from '../routes/routes';

interface CacheEntry {
  response: HttpResponse<unknown>;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Observable<HttpEvent<unknown>>>();

const MAX_CONCURRENT_REQUESTS = 4;
const CACHE_TTL_MS = 30_000;

let activeRequests = 0;
const waitingRequests: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    waitingRequests.push(() => {
      activeRequests++;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeRequests--;

  const next = waitingRequests.shift();

  if (next) {
    next();
  }
}

function createRequestKey(
  url: string,
  body: unknown,
): string {
  return `${url}:${JSON.stringify(body ?? null)}`;
}

function getRetryDelay(
  error: HttpErrorResponse,
  attempt: number,
): number {
  const retryAfter = error.headers.get('Retry-After');

  if (retryAfter) {
    const seconds = Number(retryAfter);

    if (Number.isFinite(seconds)) {
      return Math.min(seconds * 1000, 10_000);
    }
  }

  return Math.min(1000 * 2 ** attempt, 5000);
}

export const anilistInterceptor: HttpInterceptorFn = (
  req,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const isAniListRequest =
    req.url === ANILIST_API_BASE ||
    req.url.startsWith(`${ANILIST_API_BASE}/`);

  if (!isAniListRequest || req.method.toUpperCase() !== 'POST') {
    return next(req);
  }

  const key = createRequestKey(req.urlWithParams, req.body);
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now) {
    return of(cached.response);
  }

  const pending = pendingRequests.get(key);

  if (pending) {
    return pending;
  }

  const request$ = defer(() => acquireSlot()).pipe(
    switchMap(() =>
      next(req).pipe(
        retryWhen((errors) =>
          errors.pipe(
            scan(
              (
                state: { attempt: number; error: HttpErrorResponse },
                error: HttpErrorResponse,
              ) => {
                const retryable =
                  error.status === 429 ||
                  error.status >= 500;

                if (!retryable || state.attempt >= 2) {
                  throw error;
                }

                return { attempt: state.attempt + 1, error };
              },
              {
                attempt: 0,
                error: undefined as unknown as HttpErrorResponse,
              },
            ),
            delayWhen((state) =>
              timer(getRetryDelay(state.error, state.attempt)),
            ),
          ),
        ),
        tap((event) => {
          if (event instanceof HttpResponse) {
            cache.set(key, {
              response: event,
              expiresAt: Date.now() + CACHE_TTL_MS,
            });
          }
        }),
        finalize(() => {
          releaseSlot();
        }),
      ),
    ),
    catchError((error: HttpErrorResponse) => {
      const expiredCache = cache.get(key);

      if (expiredCache) {
        return of(expiredCache.response);
      }

      return throwError(() => error);
    }),
    shareReplay({
      bufferSize: 1,
      refCount: false,
    }),
  );

  pendingRequests.set(key, request$);

  request$
    .pipe(
      finalize(() => {
        pendingRequests.delete(key);
      }),
    )
    .subscribe({
      next: () => {},
      error: () => {},
    });

  return request$;
};