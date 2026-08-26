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

const CHARACTER_BY_ID_QUERY = `
query ($id: Int) {
  Character(id: $id) {
    id
    name { full native alternative }
    image { large medium }
    gender
    favourites
    description
    dateOfBirth { year month day }
    age
    bloodType
    media(perPage: 25, sort: [POPULARITY_DESC], type: ANIME) {
      nodes {
        id
        title { romaji english }
        coverImage { large }
        format
        episodes
        status
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

export interface CharacterDetailResult {
  id: number;
  name: string;
  nameNative: string;
  alternative: string[];
  image: string;
  gender: string | null;
  favourites: number;
  description: string;
  dateOfBirth: string;
  age: string;
  height: string;
  bloodType: string;
  media: {
    id: number;
    title: string;
    coverImage: string;
    format: string;
    episodes: number | null;
    status: string;
  }[];
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

interface AniListCharacterDetails {
  id: number;
  name?: { full?: string; native?: string; alternative?: string[] };
  image?: { large?: string; medium?: string };
  gender?: string | null;
  favourites?: number;
  description?: string | null;
  dateOfBirth?: { year?: number | null; month?: number | null; day?: number | null };
  age?: string | null;
  bloodType?: string | null;
  media?: {
    nodes?: {
      id: number;
      title?: { romaji?: string; english?: string };
      coverImage?: { large?: string };
      format?: string;
      episodes?: number | null;
      status?: string;
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

  getByIds(ids: number[]): Observable<CharacterResult[]> {
    if (!ids.length) return new Observable((obs) => { obs.next([]); obs.complete(); });

    const query = `
      query ($ids: [Int]) {
        Page(perPage: 50) {
          characters(id_in: $ids) {
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

    return this.http
      .post<{ data: { Page: { characters: AniListCharacter[] } } }>(API_ROUTES.anime.graphql, {
        query,
        variables: { ids },
      })
      .pipe(
        map((res) => (res.data.Page.characters ?? []).map((c) => this.mapCharacter(c))),
      );
  }

  getById(id: number): Observable<CharacterDetailResult> {
    return this.http
      .post<{ data: { Character: AniListCharacterDetails } }>(API_ROUTES.anime.graphql, {
        query: CHARACTER_BY_ID_QUERY,
        variables: { id },
      })
      .pipe(map((res) => this.mapCharacterDetails(res.data.Character)));
  }

  private mapCharacterDetails(c: AniListCharacterDetails): CharacterDetailResult {
    const dob = c.dateOfBirth;
    let dateOfBirth = '';
    if (dob?.year && dob?.month && dob?.day) {
      dateOfBirth = `${String(dob.day).padStart(2, '0')}/${String(dob.month).padStart(2, '0')}/${dob.year}`;
    }

    const rawDesc = c.description ?? '';
    let age = c.age ?? '';
    let height = '';
    let description = rawDesc;

    const heightMatch = description.match(/(?:Height|Altura)\s*:\s*([^\n<]+)/i);
    if (heightMatch) {
      height = heightMatch[1].trim().replace(/^__+|__+$/g, '').trim();
      description = description.replace(heightMatch[0], ' ');
    }

    if (!age || age.toLowerCase() === 'unknown') {
      const ageMatch = description.match(/(?:age|aparente?ly\s+(?:around|about|in\s+his|in\s+her|in\s+their))\s*[:\-]?\s*(\d{1,3})\s*(?:years?\s*old)?/i)
        ?? description.match(/(\d{1,3})\s*years?\s*old/i);
      if (ageMatch) {
        age = ageMatch[1];
      }
    }

    if (age && age.toLowerCase() !== 'unknown') {
      const agePatterns = [
        new RegExp(`\\bAge\\s*[:\\-]?\\s*${age}\\s*(?:years?\\s*old)?\\.?\\s*`, 'gi'),
        new RegExp(`\\b${age}\\s*years?\\s*old\\.?\\s*`, 'gi'),
        new RegExp(`(?:appears?|looks?)\\s+(?:to\\s+be\\s+)?(?:around\\s+|about\\s+)?${age}\\s*\\.?\\s*`, 'gi'),
      ];
      for (const pat of agePatterns) {
        description = description.replace(pat, ' ');
      }
    }

    description = description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();

    return {
      id: c.id,
      name: c.name?.full ?? 'Desconhecido',
      nameNative: c.name?.native ?? '',
      alternative: (c.name?.alternative ?? []).filter(Boolean),
      image: c.image?.large ?? c.image?.medium ?? '',
      gender: c.gender ?? null,
      favourites: c.favourites ?? 0,
      description,
      dateOfBirth,
      age,
      height,
      bloodType: c.bloodType ?? '',
      media: (c.media?.nodes ?? []).map((m) => ({
        id: m.id,
        title: m.title?.english || m.title?.romaji || 'Sem título',
        coverImage: m.coverImage?.large ?? '',
        format: m.format ?? '',
        episodes: m.episodes ?? null,
        status: m.status ?? '',
      })),
    };
  }

  private sanitizeDescription(raw: string | null | undefined): string {
    if (!raw) return '';
    return raw.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/__+([^_]+)__/g, '$1').replace(/_([^_]+)_/g, '$1').replace(/\n{3,}/g, '\n\n').trim();
  }
}
