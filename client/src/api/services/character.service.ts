import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_ROUTES } from '../routes/routes';

const CHARACTERS_QUERY = `
query ($page: Int, $perPage: Int, $search: String, $sort: [CharacterSort] = [FAVOURITES_DESC]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { currentPage hasNextPage lastPage total }
    characters(search: $search, sort: $sort) {
      id
      name { full native }
      image { large medium }
      gender
      favourites
      media(perPage: 1, sort: [POPULARITY_DESC], type: ANIME) {
        nodes {
          id
          title { romaji english }
        }
      }
    }
  }
}`;

export interface CharacterResult {
  id: number;
  name: string;
  nameNative: string;
  image: string;
  gender: string | null;
  favourites: number;
  animeTitle: string;
  animeId: number | null;
}

export interface CharacterSearchResponse {
  data: CharacterResult[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
  };
}

interface AniListCharacter {
  id: number;
  name?: { full?: string; native?: string };
  image?: { large?: string; medium?: string };
  gender?: string | null;
  favourites?: number;
  media?: {
    nodes?: {
      id: number;
      title?: { romaji?: string; english?: string };
    }[];
  };
}

interface AniListCharacterPageResponse {
  data: {
    Page: {
      pageInfo: {
        currentPage: number;
        hasNextPage: boolean;
        lastPage: number;
        total: number;
      };
      characters: AniListCharacter[];
    };
  };
}

@Injectable({ providedIn: 'root' })
export class CharacterService {
  private readonly http = inject(HttpClient);

  getCharacters(
    page: number = 1,
    search?: string,
    sort: string = 'FAVOURITES_DESC',
  ): Observable<CharacterSearchResponse> {
    return this.http
      .post<AniListCharacterPageResponse>(API_ROUTES.anime.graphql, {
        query: CHARACTERS_QUERY,
        variables: {
          page,
          perPage: 24,
          ...(search?.trim() ? { search: search.trim() } : {}),
          sort: [sort],
        },
      })
      .pipe(
        map((res) => ({
          data: res.data.Page.characters.map((c) => this.mapCharacter(c)),
          pagination: {
            last_visible_page: res.data.Page.pageInfo.lastPage,
            has_next_page: res.data.Page.pageInfo.hasNextPage,
            current_page: res.data.Page.pageInfo.currentPage,
          },
        })),
      );
  }

  private mapCharacter(c: AniListCharacter): CharacterResult {
    const anime = c.media?.nodes?.[0];
    return {
      id: c.id,
      name: c.name?.full ?? 'Desconhecido',
      nameNative: c.name?.native ?? '',
      image: c.image?.large ?? c.image?.medium ?? '',
      gender: c.gender ?? null,
      favourites: c.favourites ?? 0,
      animeTitle: anime?.title?.english || anime?.title?.romaji || '',
      animeId: anime?.id ?? null,
    };
  }
}
