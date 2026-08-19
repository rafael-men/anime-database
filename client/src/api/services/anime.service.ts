import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ROUTES } from '../routes/routes';

const MEDIA_QUERY = `
query ($page: Int, $perPage: Int, $search: String, $genre: String) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { currentPage hasNextPage lastPage total }
    media(search: $search, genre: $genre, type: ANIME, sort: SCORE_DESC) {
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

const GENRES_QUERY = `query { GenreCollection }`;

interface AniListMedia {
  id: number;
  title?: { romaji?: string; english?: string };
  coverImage?: { large?: string };
  genres?: string[];
  averageScore?: number | null;
  episodes?: number | null;
  status?: string;
  startDate?: { year?: number | null };
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

  search(query: string, page: number = 1): Observable<AnimeSearchResponse> {
    return this.fetchMedia({ page, search: query.trim() || undefined });
  }

  searchByGenre(genre: string, page: number = 1): Observable<AnimeSearchResponse> {
    return this.fetchMedia({ page, genre });
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

  private fetchMedia(variables: {
    page: number;
    search?: string;
    genre?: string;
  }): Observable<AnimeSearchResponse> {
    return this.http
      .post<AniListPageResponse>(API_ROUTES.anime.graphql, {
        query: MEDIA_QUERY,
        variables: { perPage: this.perPage, ...variables },
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
      year: m.startDate?.year ?? null,
      synopsis: '',
      type: 'ANIME',
      members: 0,
    };
  }
}