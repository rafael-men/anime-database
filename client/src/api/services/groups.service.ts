import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ROUTES } from '../routes/routes';

export interface Group {
  id: string;
  ownerId: string;
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt?: string | null;
  groupItems?: GroupItem[];
}

export interface GroupItem {
  groupId: string;
  externalAnimeId: string;
  order: number;
  note?: string | null;
}

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly http = inject(HttpClient);

  getGroupsByOwner(ownerId: string): Observable<Group[]> {
    return this.http.get<Group[]>(API_ROUTES.groups.byOwner(ownerId));
  }

  getGroupById(id: string): Observable<Group> {
    return this.http.get<Group>(API_ROUTES.groups.byId(id));
  }

  createGroup(data: {
    ownerId: string;
    name: string;
    description?: string;
    coverImageUrl?: string;
    isPublic?: boolean;
  }): Observable<Group> {
    return this.http.post<Group>(API_ROUTES.groups.base, data);
  }

  updateGroup(
    id: string,
    data: {
      name?: string;
      description?: string;
      coverImageUrl?: string;
      isPublic?: boolean;
    },
  ): Observable<Group> {
    return this.http.patch<Group>(API_ROUTES.groups.byId(id), data);
  }

  deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(API_ROUTES.groups.byId(id));
  }

  addItem(
    groupId: string,
    data: { externalAnimeId: string; order?: number; note?: string },
  ): Observable<GroupItem> {
    return this.http.post<GroupItem>(API_ROUTES.groups.items(groupId), data);
  }

  removeItem(groupId: string, animeId: string): Observable<void> {
    return this.http.delete<void>(
      `${API_ROUTES.groups.items(groupId)}/${animeId}`,
    );
  }
}
