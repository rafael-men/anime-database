export interface JikanQueryParams {
   q?: string;
   page?: number;
   limit?: number;
   type?: string;
   status?: string;
   order_by?: string;
   sort?: 'asc' | 'desc';
   sfw?: boolean;
   genres?: string | number;
   letter?: string;
   start_date?: string;
   end_date?: string;
   year?: number;
}

type JikanRequestParams = Record<
   string,
   string | number | boolean | undefined | null
>;

export class JikanClientService {
   private readonly baseUrl =
      process.env.JIKAN_API_BASE_URL ?? 'https://api.jikan.moe/v4';
   private readonly maxRetries = Number(process.env.JIKAN_MAX_RETRIES ?? 3);
   private readonly requestTimeoutMs = Number(
      process.env.JIKAN_REQUEST_TIMEOUT_MS ?? 12000,
   );

   async searchAnime(params: JikanQueryParams = {}) {
      return this.request('/anime', params as JikanRequestParams);
   }

   async getAnimeById(id: string | number) {
      return this.request(`/anime/${id}/full`);
   }

   async getAnimeReviews(id: string | number, page = 1) {
      return this.request(`/anime/${id}/reviews`, { page });
   }

   async getAnimeVideos(id: string | number) {
      return this.request(`/anime/${id}/videos`);
   }

   private async request(path: string, params: JikanRequestParams = {}) {
      const url = new URL(`${this.baseUrl}${path}`);

      Object.entries(params).forEach(([key, value]) => {
         if (value === undefined || value === null || value === '') return;
         url.searchParams.append(key, String(value));
      });

      let lastError: unknown;

      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
         const controller = new AbortController();
         const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

         try {
            const response = await fetch(url.toString(), {
               method: 'GET',
               headers: {
                  Accept: 'application/json',
               },
               signal: controller.signal,
            });

            if (!response.ok) {
               const errorText = await response.text();
               const message =
                  errorText || response.statusText || 'Unknown Jikan error';

               lastError = new Error(
                  `Jikan API error (${response.status}): ${message}`,
               );

               if ((response.status >= 500 || response.status === 429) && attempt < this.maxRetries) {
                  await this.delay(attempt * 500);
                  continue;
               }

               throw lastError;
            }

            return await response.json();
         } catch (error) {
            lastError = error;

            if (this.shouldRetry(error) && attempt < this.maxRetries) {
               await this.delay(attempt * 500);
               continue;
            }

            throw error;
         } finally {
            clearTimeout(timeoutId);
         }
      }

      throw lastError instanceof Error
         ? lastError
         : new Error('Jikan request failed unexpectedly');
   }

   private shouldRetry(error: unknown): boolean {
      if (error instanceof Error) {
         const message = error.message.toLowerCase();
         return (
            message.includes('timeout') ||
            message.includes('aborted') ||
            message.includes('failed to fetch') ||
            message.includes('network') ||
            message.includes('5') ||
            message.includes('429') ||
            message.includes('503') ||
            message.includes('504')
         );
      }

      return false;
   }

   private delay(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
   }
}
