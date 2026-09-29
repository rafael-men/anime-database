import { HttpException,HttpStatus,Injectable } from '@nestjs/common';

interface GraphqlRequest {
   query: string;
   variables?: Record<string, unknown>;
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

class AniListError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

@Injectable()
export class AnimeProxyService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly pending = new Map<string, Promise<unknown>>();

  async execute(body: GraphqlRequest): Promise<unknown> {
    if (!body?.query || typeof body.query !== 'string') {
      throw new HttpException(
        'GraphQL query is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const key = JSON.stringify({
      query: body.query,
      variables: body.variables ?? {},
    });

    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const existingRequest = this.pending.get(key);

    if (existingRequest) {
      return existingRequest;
    }

    const request = this.requestAniList(body, cached?.value);

    this.pending.set(key, request);

    try {
      return await request;
    } finally {
      this.pending.delete(key);
    }
  }

  private async requestAniList(
    body: GraphqlRequest,
    staleValue?: unknown,
  ): Promise<unknown> {
    try {
      const response = await this.fetchWithRetry(body);
      const ttl = this.getCacheTtl(body.query);

      this.cache.set(
        JSON.stringify({
          query: body.query,
          variables: body.variables ?? {},
        }),
        {
          value: response,
          expiresAt: Date.now() + ttl,
        },
      );

      return response;
    } catch (error) {
      if (staleValue !== undefined) {
        return staleValue;
      }

      if (error instanceof AniListError) {
        throw new HttpException(
          'Anime provider is temporarily unavailable.',
          error.statusCode,
        );
      }

      throw new HttpException(
        'Could not contact anime provider.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async fetchWithRetry(
    body: GraphqlRequest,
  ): Promise<unknown> {
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });

        if (response.ok) {
          const payload = (await response.json()) as {
            errors?: unknown[];
          };

          if (payload.errors?.length) {
            throw new AniListError(
              'AniList returned GraphQL errors.',
              HttpStatus.BAD_GATEWAY,
            );
          }

          return payload;
        }

        const retryable =
          response.status === HttpStatus.TOO_MANY_REQUESTS ||
          response.status >= 500;

        if (!retryable) {
          throw new AniListError(
            `AniList returned status ${response.status}.`,
            HttpStatus.BAD_GATEWAY,
          );
        }

        if (attempt === maxAttempts - 1) {
          throw new AniListError(
            'AniList rate limit exceeded.',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }

        const retryAfter = this.getRetryAfter(
          response.headers.get('retry-after'),
        );

        await this.delay(
          retryAfter ?? Math.min(1000 * 2 ** attempt, 5000),
        );
      } catch (error) {
        if (error instanceof AniListError && error.statusCode < 500) {
          throw error;
        }

        if (attempt === maxAttempts - 1) {
          if (error instanceof AniListError) {
            throw error;
          }

          throw new AniListError(
            'AniList request failed.',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }

        await this.delay(Math.min(1000 * 2 ** attempt, 5000));
      }
    }

    throw new AniListError(
      'AniList request failed.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private getCacheTtl(query: string): number {
    if (query.includes('GenreCollection')) {
      return 24 * 60 * 60 * 1000;
    }

    if (query.includes('Media(id:')) {
      return 60 * 60 * 1000;
    }

    return 30 * 1000;
  }

  private getRetryAfter(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const seconds = Number(value);

    if (!Number.isFinite(seconds)) {
      return null;
    }

    return Math.min(seconds * 1000, 10_000);
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}