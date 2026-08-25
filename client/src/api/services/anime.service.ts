import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import { API_ROUTES } from '../routes/routes';

const MEDIA_QUERY = `
query ($page: Int, $perPage: Int, $search: String, $genre: String, $format: MediaFormat, $seasonYear: Int, $status: MediaStatus, $sort: [MediaSort] = [SCORE_DESC]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { currentPage hasNextPage lastPage total }
    media(search: $search, genre: $genre, type: ANIME, format: $format, seasonYear: $seasonYear, status: $status, sort: $sort) {
      id
      title { romaji english }
      coverImage { large }
      genres
averageScore
      episodes
      status
      startDate { year }
    }
  }
}`;

const MEDIA_BY_ID_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english }
    coverImage { large }
    genres
    averageScore
    episodes
    status
    startDate { year }
  }
}`;

const MEDIA_BY_IDS_QUERY = `
query ($ids: [Int]) {
  Page(perPage: 50) {
    media(id_in: $ids, type: ANIME) {
      id
      title { romaji english }
      coverImage { large }
      genres
      averageScore
      episodes
      status
      startDate { year }
    }
  }
}`;

const MEDIA_DETAILS_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    description
    coverImage { extraLarge large }
    bannerImage
    genres
    averageScore
    episodes
    duration
    format
    status
    season
    seasonYear
    source
    popularity
    favourites
    startDate { day month year }
    endDate { day month year }
    studios(isMain: true) { nodes { name } }
    trailer { id site }
    externalLinks { id url site type language color icon isDisabled }
  }
}`;

const GENRES_QUERY = `query { GenreCollection }`;

const SUGGESTIONS_QUERY = `
query ($search: String, $perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title { romaji english }
      coverImage { large }
      averageScore
      episodes
      format
      seasonYear
    }
  }
}`;

interface AniListMedia {
  id: number;
  title?: { romaji?: string; english?: string };
  coverImage?: { large?: string };
  genres?: string[];
  averageScore?: number | null;
  episodes?: number | null;
  status?: string;
  startDate?: { year?: number | null };
  format?: string | null;
  seasonYear?: number | null;
}

export interface SearchOptions {
  format?: string;
  year?: number;
  status?: string;
  sort?: string;
}

interface AniListPageResponse {
  data: {
    Page: {
      pageInfo: {
        currentPage: number;
        hasNextPage: boolean;
        lastPage: number;
        total: number;
      };
      media: AniListMedia[];
    };
  };
}

export interface AniListDate {
  day?: number | null;
  month?: number | null;
  year?: number | null;
}

interface AniListMediaDetails {
  id: number;
  title?: { romaji?: string; english?: string; native?: string };
  description?: string | null;
  coverImage?: { extraLarge?: string; large?: string };
  bannerImage?: string | null;
  genres?: string[];
  averageScore?: number | null;
  episodes?: number | null;
  duration?: number | null;
  format?: string | null;
  status?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  source?: string | null;
  popularity?: number | null;
  favourites?: number | null;
  startDate?: AniListDate | null;
  endDate?: AniListDate | null;
  studios?: { nodes?: { name: string }[] };
  trailer?: { id?: string; site?: string } | null;
  externalLinks?: AniListExternalLink[] | null;
}

interface AniListExternalLink {
  id: number;
  url: string;
  site: string;
  type?: string | null;
  language?: string | null;
  color?: string | null;
  icon?: string | null;
  isDisabled?: boolean | null;
}

export interface StreamingLink {
  url: string;
  site: string;
  color: string;
  icon: string;
}

export interface AnimeDetailsData {
  mal_id: number;
  title: string;
  titleNative: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  bannerImage: string;
  score: number | null;
  genres: { name: string }[];
  episodes: number | null;
  duration: number | null;
  status: string;
  format: string;
  season: string;
  seasonYear: number | null;
  startDate: string;
  endDate: string;
  synopsis: string;
  studios: string[];
  source: string;
  popularity: number;
  favourites: number;
  trailerUrl: string | null;
  streamingLinks: StreamingLink[];
}

export interface AnimeResult {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
  score: number | null;
  genres: { name: string }[];
  episodes: number | null;
  status: string;
  year: number | null;
  synopsis: string;
  type: string;
  members: number;
}

export interface AnimeSearchResponse {
  data: AnimeResult[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AnimeService {
  private readonly http = inject(HttpClient);
  private readonly perPage = 12;

  search(query: string, page: number = 1, options: SearchOptions = {}): Observable<AnimeSearchResponse> {
    return this.fetchMedia({ page, search: query.trim() || undefined, ...options });
  }

  searchByGenre(genre: string, page: number = 1, options: SearchOptions = {}): Observable<AnimeSearchResponse> {
    return this.fetchMedia({ page, genre, ...options });
  }

  getSuggestions(query: string): Observable<AnimeResult[]> {
    const term = query.trim();
    if (term.length < 2) return of([]);

    return this.http
      .post<AniListPageResponse>(API_ROUTES.anime.graphql, {
        query: SUGGESTIONS_QUERY,
        variables: { search: term, perPage: 6 },
      })
      .pipe(map((res) => res.data.Page.media.map((m) => this.mapAnime(m))));
  }

  getGenres(): Observable<string[]> {
    return this.http
      .post<{ data: { GenreCollection: string[] } }>(API_ROUTES.anime.graphql, {
        query: GENRES_QUERY,
      })
      .pipe(map((res) => res.data.GenreCollection));
  }

  getById(id: number): Observable<AnimeResult> {
    return this.http
      .post<{ data: { Media: AniListMedia } }>(API_ROUTES.anime.graphql, {
        query: MEDIA_BY_ID_QUERY,
        variables: { id },
      })
      .pipe(map((res) => this.mapAnime(res.data.Media)));
  }

  getByIds(ids: number[]): Observable<AnimeResult[]> {
    if (!ids.length) return of([]);
    return this.http
      .post<{ data: { Page: { media: AniListMedia[] } } }>(
        API_ROUTES.anime.graphql,
        { query: MEDIA_BY_IDS_QUERY, variables: { ids } },
      )
      .pipe(map((res) => res.data.Page.media.map((m) => this.mapAnime(m))));
  }

  getDetails(id: number): Observable<AnimeDetailsData> {
    return this.http
      .post<{ data: { Media: AniListMediaDetails } }>(API_ROUTES.anime.graphql, {
        query: MEDIA_DETAILS_QUERY,
        variables: { id },
      })
      .pipe(map((res) => this.mapDetails(res.data.Media)));
  }

  translateSynopsis(text: string): Observable<string> {
    const trimmed = text.trim();
    if (!trimmed) return of('');

    return this.http
      .get<string[][][]>(API_ROUTES.anime.translate(trimmed))
      .pipe(
        map((res) => (res[0] ?? []).map((seg) => seg?.[0] ?? '').join('')),
        map((translated) => translated.trim() || trimmed),
        catchError(() => of(trimmed)),
      );
  }

  private mapDetails(m: AniListMediaDetails): AnimeDetailsData {
    const imageUrl = m.coverImage?.extraLarge ?? m.coverImage?.large ?? '';
    const trailerUrl =
      m.trailer?.site?.toLowerCase() === 'youtube' && m.trailer.id
        ? `https://youtu.be/${m.trailer.id}`
        : null;

    return {
      mal_id: m.id,
      title: m.title?.english || m.title?.romaji || 'Sem título',
      titleNative: m.title?.native ?? '',
      images: { jpg: { image_url: imageUrl, large_image_url: imageUrl } },
      bannerImage: m.bannerImage ?? '',
      score: m.averageScore != null ? m.averageScore / 10 : null,
      genres: (m.genres ?? []).map((g) => ({ name: g })),
      episodes: m.episodes ?? null,
      duration: m.duration ?? null,
      status: m.status ?? '',
      format: m.format ?? '',
      season: m.season ?? '',
      seasonYear: m.seasonYear ?? null,
      startDate: this.formatDate(m.startDate),
      endDate: this.formatDate(m.endDate),
      synopsis: (m.description ?? '').replace(/<[^>]*>/g, '').trim(),
      studios: (m.studios?.nodes ?? []).map((n) => n.name),
      source: m.source ?? '',
      popularity: m.popularity ?? 0,
      favourites: m.favourites ?? 0,
      trailerUrl,
      streamingLinks: (m.externalLinks ?? [])
        .filter((l) => l.type === 'STREAMING' && !l.isDisabled)
        .map((l) => ({
          url: l.url,
          site: l.site,
          color: l.color ?? '',
          icon: l.icon ?? '',
        })),
    };
  }

  private formatDate(date?: AniListDate | null): string {
    if (!date?.day || !date?.month || !date?.year) return '';
    return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`;
  }

  private fetchMedia(variables: {
    page: number;
    search?: string;
    genre?: string;
  } & SearchOptions): Observable<AnimeSearchResponse> {
    const { format, year, status, sort, ...rest } = variables;
    return this.http
      .post<AniListPageResponse>(API_ROUTES.anime.graphql, {
        query: MEDIA_QUERY,
        variables: {
          perPage: this.perPage,
          ...rest,
          ...(format ? { format } : {}),
          ...(year ? { seasonYear: year } : {}),
          ...(status ? { status } : {}),
          ...(sort ? { sort: [sort] } : {}),
        },
      })
      .pipe(
        map((res) => ({
          data: res.data.Page.media.map((m) => this.mapAnime(m)),
          pagination: {
            last_visible_page: res.data.Page.pageInfo.lastPage,
            has_next_page: res.data.Page.pageInfo.hasNextPage,
            current_page: res.data.Page.pageInfo.currentPage,
          },
        })),
      );
  }

  private mapAnime(m: AniListMedia): AnimeResult {
    const imageUrl = m.coverImage?.large ?? '';
    return {
      mal_id: m.id,
      title: m.title?.english || m.title?.romaji || 'Sem título',
      images: { jpg: { image_url: imageUrl, large_image_url: imageUrl } },
      score: m.averageScore != null ? m.averageScore / 10 : null,
      genres: (m.genres ?? []).map((g) => ({ name: g })),
      episodes: m.episodes ?? null,
      status: m.status ?? '',
      year: m.startDate?.year ?? m.seasonYear ?? null,
      synopsis: '',
      type: m.format ?? 'ANIME',
      members: 0,
    };
  }
}