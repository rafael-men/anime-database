import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { FavoriteItem, FavoritesService } from '../../../api/services/favorites.service';
import { UserProfile, UserReview, UsersService } from '../../../api/services/users.service';
import { Profile } from './profile';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'u1',
    username: 'rafael',
    email: 'rafael@test.com',
    avatarUrl: null,
    bio: null,
    createdAt: new Date('2024-03-15T12:00:00Z').toISOString(),
    updatedAt: null,
    ...overrides,
  };
}

function makeFavorite(externalAnimeId: number): FavoriteItem {
  return {
    id: `fav-${externalAnimeId}`,
    userId: 'u1',
    externalAnimeId: String(externalAnimeId),
    status: 'PLANNED',
    addedAt: new Date().toISOString(),
  };
}

function makeReview(externalAnimeId: number): UserReview {
  return {
    id: `rev-${externalAnimeId}`,
    userId: 'u1',
    externalAnimeId: String(externalAnimeId),
    rating: 8,
    comment: null,
    watchedAt: new Date().toISOString(),
    isRewatch: false,
    hasSpoilers: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeFileEvent(file: File): Event {
  return {
    target: { files: [file], value: '' },
  } as unknown as Event;
}

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let getProfileMock: ReturnType<typeof vi.fn>;
  let updateProfileMock: ReturnType<typeof vi.fn>;
  let uploadAvatarMock: ReturnType<typeof vi.fn>;
  let getReviewsMock: ReturnType<typeof vi.fn>;
  let getFavoritesMock: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  function seedSession(): void {
    sessionStorage.setItem('access_token', 'token');
    sessionStorage.setItem(
      'user',
      JSON.stringify({ userId: 'u1', username: 'rafael', email: 'rafael@test.com' }),
    );
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    getProfileMock = vi.fn().mockReturnValue(of(makeProfile()));
    updateProfileMock = vi.fn((id: string, payload: Partial<UserProfile>) =>
      of(makeProfile({ ...payload })),
    );
    uploadAvatarMock = vi.fn(() => of(makeProfile()));
    getReviewsMock = vi.fn().mockReturnValue(of([makeReview(1), makeReview(2), makeReview(3)]));
    getFavoritesMock = vi.fn().mockReturnValue(of([makeFavorite(1), makeFavorite(2)]));

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        {
          provide: UsersService,
          useValue: {
            getProfile: getProfileMock,
            updateProfile: updateProfileMock,
            uploadAvatar: uploadAvatarMock,
            getReviews: getReviewsMock,
          },
        },
        { provide: FavoritesService, useValue: { getFavorites: getFavoritesMock } },
      ],
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');
    sessionStorage.clear();
  });

  it('should create and load profile with stats', () => {
    seedSession();
    createComponent();

    expect(component).toBeTruthy();
    expect(getProfileMock).toHaveBeenCalledWith('u1');
    expect(component.profile()?.username).toBe('rafael');
    expect(component.username()).toBe('rafael');
    expect(component.userInitial()).toBe('R');
    expect(component.isLoading()).toBe(false);
    expect(component.favoritesCount()).toBe(2);
    expect(component.reviewsCount()).toBe(3);
    expect(component.memberSince()).toContain('2024');
  });

  it('should redirect to login when there is no session', () => {
    createComponent();

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    expect(getProfileMock).not.toHaveBeenCalled();
  });

  it('should show error state when loading profile fails', () => {
    seedSession();
    getProfileMock.mockReturnValue(throwError(() => new Error('fail')));
    createComponent();

    expect(component.errorMessage()).toContain('Erro ao carregar');
    expect(component.isLoading()).toBe(false);
  });

  it('should populate fields when editing and revert on cancel', () => {
    seedSession();
    createComponent();

    component.startEditing();
    expect(component.isEditing()).toBe(true);
    expect(component.editUsername).toBe('rafael');
    expect(component.editBio).toBe('');

    component.editUsername = 'alterado';
    component.cancelEditing();

    expect(component.isEditing()).toBe(false);
    expect(component.profile()?.username).toBe('rafael');
  });

  it('should reject avatar files with invalid type or size', () => {
    seedSession();
    createComponent();

    component.startEditing();

    const invalidType = { type: 'application/pdf', size: 100 } as File;
    component.onAvatarSelected(makeFileEvent(invalidType));
    expect(component.selectedAvatarFile()).toBeNull();

    const tooBig = { type: 'image/png', size: 3 * 1024 * 1024 } as File;
    component.onAvatarSelected(makeFileEvent(tooBig));
    expect(component.selectedAvatarFile()).toBeNull();

    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('should select a valid avatar file and upload it before saving', async () => {
    seedSession();
    createComponent();

    let objectUrlCounter = 0;
    const revokeSpy = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: () => `blob:${++objectUrlCounter}`,
      revokeObjectURL: revokeSpy,
    });

    component.startEditing();
    const file = { type: 'image/png', size: 1024, name: 'foto.png' } as File;
    component.onAvatarSelected(makeFileEvent(file));

    expect(component.avatarPreview()).toBe('blob:1');

    component.editUsername = 'novoNome';
    updateProfileMock.mockReturnValue(of(makeProfile({ username: 'novoNome' })));
    await component.saveProfile();

    expect(uploadAvatarMock).toHaveBeenCalledWith('u1', file);
    expect(component.profile()?.username).toBe('novoNome');
    expect(component.isEditing()).toBe(false);

    vi.unstubAllGlobals();
  });

  it('should clear avatar when photo is removed and saved', async () => {
    seedSession();
    getProfileMock.mockReturnValue(of(makeProfile({ avatarUrl: '/uploads/old.png' })));
    createComponent();

    component.startEditing();
    component.removeAvatar();

    expect(component.avatarRemoved()).toBe(true);

    await component.saveProfile();

    expect(uploadAvatarMock).not.toHaveBeenCalled();
    expect(updateProfileMock).toHaveBeenCalledWith('u1', {
      username: 'rafael',
      bio: null,
      avatarUrl: null,
    });
  });

  it('should not save when username is empty', () => {
    seedSession();
    createComponent();

    component.startEditing();
    component.editUsername = '   ';
    component.saveProfile();

    expect(updateProfileMock).not.toHaveBeenCalled();
    expect(component.saveErrorMessage()).toContain('não pode ficar vazio');
  });

  it('should save profile and refresh session user', () => {
    seedSession();
    createComponent();

    component.startEditing();
    component.editUsername = 'novoNome';
    component.editBio = 'minha bio';
    component.saveProfile();

    expect(updateProfileMock).toHaveBeenCalledWith('u1', {
      username: 'novoNome',
      bio: 'minha bio',
    });
    expect(component.profile()?.username).toBe('novoNome');
    expect(component.isEditing()).toBe(false);
    expect(component.successMessage()).toContain('sucesso');

    const stored = JSON.parse(sessionStorage.getItem('user') ?? '{}');
    expect(stored.username).toBe('novoNome');
  });

  it('should show friendly message when username is duplicated', () => {
    seedSession();
    createComponent();

    component.startEditing();
    updateProfileMock.mockReturnValue(throwError(() => ({ status: 409 })));
    component.saveProfile();

    expect(component.saveErrorMessage()).toContain('já está em uso');
    expect(component.isSaving()).toBe(false);
  });

  it('should navigate home', () => {
    seedSession();
    createComponent();

    component.goHome();
    expect(navigateSpy).toHaveBeenCalledWith(['/home']);
  });
});
