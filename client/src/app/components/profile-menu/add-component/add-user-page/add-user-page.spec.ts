import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AddUserPage } from './add-user-page';
import { UsersService } from '../../../../../api/services/users.service';

function makeSearchUser(id: string, username: string, isFollowing: boolean) {
  return {
    id,
    username,
    avatarUrl: null,
    bio: null,
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    isFollowing,
  };
}

describe('AddUserPage', () => {
  let component: AddUserPage;
  let fixture: ComponentFixture<AddUserPage>;
  let searchMock: ReturnType<typeof vi.fn>;
  let followMock: ReturnType<typeof vi.fn>;
  let unfollowMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    searchMock = vi.fn(() => of([makeSearchUser('u1', 'ana', false)]));
    followMock = vi.fn(() => of(undefined));
    unfollowMock = vi.fn(() => of(undefined));

    await TestBed.configureTestingModule({
      imports: [AddUserPage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: UsersService,
          useValue: {
            searchUsers: searchMock,
            follow: followMock,
            unfollow: unfollowMock,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddUserPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clear results when search term is blank', () => {
    component.search();
    expect(searchMock).not.toHaveBeenCalled();
    expect(component.results().length).toBe(0);
  });

  it('should search and set results', () => {
    component.onSearchQueryChange('ana');
    component.search();

    expect(searchMock).toHaveBeenCalledWith('ana');
    expect(component.results().length).toBe(1);
    expect(component.results()[0].username).toBe('ana');
    expect(component.isLoading()).toBe(false);
  });

  it('should set error message when search fails', () => {
    searchMock.mockReturnValue(throwError(() => new Error('fail')));

    component.onSearchQueryChange('ana');
    component.search();

    expect(component.searchError()).toContain('Erro ao buscar');
    expect(component.isLoading()).toBe(false);
  });

  it('should follow a user and update local state', () => {
    component.onSearchQueryChange('ana');
    component.search();

    component.toggleFollow(component.results()[0]);

    expect(followMock).toHaveBeenCalledWith('u1');
    expect(component.results()[0].isFollowing).toBe(true);
    expect(component.isToggling('u1')).toBe(false);
  });

  it('should unfollow a user and update local state', () => {
    searchMock.mockReturnValue(of([makeSearchUser('u1', 'ana', true)]));

    component.onSearchQueryChange('ana');
    component.search();

    component.toggleFollow(component.results()[0]);

    expect(unfollowMock).toHaveBeenCalledWith('u1');
    expect(component.results()[0].isFollowing).toBe(false);
  });

  it('should navigate to the user profile', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.openProfile('u1');

    expect(navigateSpy).toHaveBeenCalledWith(['/profile', 'u1']);
  });

  it('should return uppercase initial for userInitial', () => {
    expect(component.userInitial('bob')).toBe('B');
    expect(component.userInitial('')).toBe('U');
  });
});
