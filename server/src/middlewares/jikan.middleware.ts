import { Router } from 'express';
import { JikanClientService } from '../utils/jikan-client';

const router = Router();
const jikanClient = new JikanClientService();

router.get('/health', (_req, res) => {
   res.json({ status: 'ok', service: 'jikan' });
});

async function searchAnimes(req: any, res: any) {
   try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const genre = typeof req.query.genre === 'string' ? req.query.genre : undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;
      const category =
         typeof req.query.category === 'string' ? req.query.category : undefined;
      const startDate =
         typeof req.query.start_date === 'string' ? req.query.start_date : undefined;
      const endDate =
         typeof req.query.end_date === 'string' ? req.query.end_date : undefined;

      const mappedGenre = genre ? thisMapGenreToJikanId(genre) : undefined;
      const mappedType = category ? normalizeCategory(category) : undefined;

      const result = await jikanClient.searchAnime({
         q,
         page,
         limit,
         type: mappedType,
         status:
            typeof req.query.status === 'string' ? req.query.status : undefined,
         order_by:
            typeof req.query.order_by === 'string' ? req.query.order_by : undefined,
         sort:
            req.query.sort === 'asc' || req.query.sort === 'desc'
               ? req.query.sort
               : undefined,
         sfw:
            req.query.sfw === 'true' || req.query.sfw === 'false'
               ? req.query.sfw === 'true'
               : undefined,
         genres: mappedGenre,
         year,
         start_date: startDate,
         end_date: endDate,
      });

      res.json(result);
   } catch (error) {
      const message =
         error instanceof Error ? error.message : 'Unexpected Jikan error';
      sendJikanError(res, message);
   }
}

function sendJikanError(res: any, message: string) {
   const isUpstreamIssue = /Jikan API error|504|503|timeout|failed to fetch|failed to connect/i.test(
      message,
   );

   res.status(isUpstreamIssue ? 503 : 500).json({
      message: isUpstreamIssue
         ? 'Jikan service is temporarily unavailable. Please try again in a moment.'
         : message,
      retryable: isUpstreamIssue,
      details: message,
   });
}

router.get('/anime', searchAnimes);

function normalizeCategory(category?: string) {
   if (!category) return undefined;

   const normalized = category.trim().toLowerCase();
   const map: Record<string, string> = {
      serie: 'tv',
      series: 'tv',
      movie: 'movie',
      filme: 'movie',
      ova: 'ova',
      ona: 'ona',
      special: 'special',
      especial: 'special',
   };

   return map[normalized] ?? normalized;
}

function thisMapGenreToJikanId(genre: string) {
   const normalized = genre.trim().toLowerCase();
   const genreMap: Record<string, number> = {
      action: 1,
      adventure: 2,
      cars: 3,
      comedy: 4,
      crime: 5,
      drama: 8,
      fantasy: 10,
      horror: 14,
      mecha: 18,
      music: 19,
      mystery: 7,
      romance: 22,
      sci: 24,
      scifi: 24,
      thriller: 41,
      sports: 30,
      supernatural: 37,
      military: 38,
      police: 39,
      psychological: 40,
      historical: 13,
      isekai: 62,
      shonen: 27,
      seinen: 42,
      slice: 36,
      'slice-of-life': 36,
      ecchi: 9,
      hentai: 12,
   };

   return genreMap[normalized] ?? undefined;
}

async function getAnimeByIdRoute(req: any, res: any) {
   try {
      const result = await jikanClient.getAnimeById(req.params.id);
      res.json(result);
   } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected Jikan error';
      sendJikanError(res, message);
   }
}

router.get('/anime/:id', getAnimeByIdRoute);

async function getAnimeReviewsRoute(req: any, res: any) {
   try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const result = await jikanClient.getAnimeReviews(req.params.id, page);
      res.json(result);
   } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected Jikan error';
      sendJikanError(res, message);
   }
}

router.get('/anime/:id/reviews', getAnimeReviewsRoute);

async function getStreamingLinksRoute(req: any, res: any) {
   try {
      const result = await jikanClient.getAnimeById(req.params.id);
      const payload = result?.data ?? result ?? {};

      res.json({
         animeId: payload.mal_id ?? req.params.id,
         streaming: payload.streaming ?? [],
         external: payload.external ?? [],
      });
   } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected Jikan error';
      sendJikanError(res, message);
   }
}

router.get('/anime/:id/streaming-links', getStreamingLinksRoute);

export { router as jikanMiddleware };
