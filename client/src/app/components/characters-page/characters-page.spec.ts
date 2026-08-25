import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { CharactersPage } from './characters-page';
import { CharacterService } from '../../../api/services/character.service';
import { SessionService } from '../../../api/services/session.service';
import { UsersService } from '../../../api/services/users.service';

describe('CharactersPage', () => {
  let component: CharactersPage;
  let fixture: ComponentFixture<CharactersPage>;

  let characterServiceSpy: { getCharacters: Mock };
  let routerSpy: { navigate: Mock };
  let sessionServiceSpy: { getUser: Mock; updateUser: Mock; clearSession: Mock };
  let usersServiceSpy: { getProfile: Mock };

  const mockCharacters = [
    { mal_id: 1, name: 'Naruto Uzumaki' } as any,
    { mal_id: 2, name: 'Sasuke Uchiha' } as any,
  ];

  const mockPageResponse = {
    data: mockCharacters,
    pagination: { has_next_page: true },
  };

  const mockUser = { userId: '1', username: 'testuser', avatarUrl: null };
  const mockProfile = { username: 'testuser', avatarUrl: 'http://avatar.png' };

  // Helper to (re)build the TestBed with a given PLATFORM_ID value.
  async function setupComponent(platform: 'browser' | 'server' = 'browser') {
    await TestBed.configureTestingModule({
      imports: [CharactersPage],
      providers: [
        { provide: CharacterService, useValue: characterServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: SessionService, useValue: sessionServiceSpy },
        { provide: UsersService, useValue: usersServiceSpy },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CharactersPage);
    component = fixture.componentInstance;
  }

  beforeEach(async () => {
    characterServiceSpy = { getCharacters: vi.fn() };
    routerSpy = { navigate: vi.fn() };
    sessionServiceSpy = { getUser: vi.fn(), updateUser: vi.fn(), clearSession: vi.fn() };
    usersServiceSpy = { getProfile: vi.fn() };

    sessionServiceSpy.getUser.mockReturnValue(mockUser as any);
    usersServiceSpy.getProfile.mockReturnValue(of(mockProfile as any));
    characterServiceSpy.getCharacters.mockReturnValue(of(mockPageResponse as any));

    await setupComponent('browser');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load the user and the first page of characters (browser)', () => {
      fixture.detectChanges(); // runs ngOnInit

      expect(sessionServiceSpy.getUser).toHaveBeenCalled();
      expect(usersServiceSpy.getProfile).toHaveBeenCalledWith(mockUser.userId);
      expect(characterServiceSpy.getCharacters).toHaveBeenCalledWith(1, undefined);

      expect(component.username()).toBe(mockProfile.username);
      expect(component.avatarUrl()).toBe(mockProfile.avatarUrl);
      expect(component.characters()).toEqual(mockCharacters);
      expect(component.hasNextPage()).toBe(true);
      expect(component.isLoading()).toBe(false);
    });

    it('should update the session with the fetched profile', () => {
      fixture.detectChanges();

      expect(sessionServiceSpy.updateUser).toHaveBeenCalledWith({
        username: mockProfile.username,
        avatarUrl: mockProfile.avatarUrl,
      });
    });

    it('should do nothing on the server (SSR)', async () => {
      await setupComponent('server');
      fixture.detectChanges();

      expect(sessionServiceSpy.getUser).not.toHaveBeenCalled();
      expect(characterServiceSpy.getCharacters).not.toHaveBeenCalled();
    });

    it('should not fetch a profile when there is no logged-in user', () => {
      sessionServiceSpy.getUser.mockReturnValue(null as any);

      fixture.detectChanges();

      expect(usersServiceSpy.getProfile).not.toHaveBeenCalled();
      expect(component.username()).toBe('');
      expect(component.avatarUrl()).toBeNull();
    });

    it('should silently ignore profile-fetch errors', () => {
      usersServiceSpy.getProfile.mockReturnValue(throwError(() => new Error('fail')));

      expect(() => fixture.detectChanges()).not.toThrow();
    });
  });

  describe('loadCharacters', () => {
    beforeEach(() => fixture.detectChanges());

    it('should populate characters and reset the page on success', () => {
      component.searchInput = 'naruto';
      characterServiceSpy.getCharacters.mockClear();

      component.loadCharacters();

      expect(characterServiceSpy.getCharacters).toHaveBeenCalledWith(1, 'naruto');
      expect(component.characters()).toEqual(mockCharacters);
      expect(component.currentPage()).toBe(1);
      expect(component.errorMessage()).toBe('');
      expect(component.isLoading()).toBe(false);
    });

    it('should trim the search term and send undefined when it is blank', () => {
      component.searchInput = '   ';
      characterServiceSpy.getCharacters.mockClear();

      component.loadCharacters();

      expect(characterServiceSpy.getCharacters).toHaveBeenCalledWith(1, undefined);
    });

    it('should set an error message when the request fails', () => {
      characterServiceSpy.getCharacters.mockReturnValue(throwError(() => new Error('network')));

      component.loadCharacters();

      expect(component.errorMessage()).toBe('Erro ao carregar personagens. Tente novamente.');
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('onSearchInput', () => {
    it('should delegate to loadCharacters', () => {
      fixture.detectChanges();
      const spy = vi.spyOn(component, 'loadCharacters');

      component.onSearchInput();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('loadMore', () => {
    beforeEach(() => fixture.detectChanges());

    it('should append the next page and advance currentPage', () => {
      const moreCharacters = [{ mal_id: 3, name: 'Sakura Haruno' } as any];
      characterServiceSpy.getCharacters.mockReturnValue(
        of({ data: moreCharacters, pagination: { has_next_page: false } } as any),
      );

      component.loadMore();

      expect(characterServiceSpy.getCharacters).toHaveBeenCalledWith(2, undefined);
      expect(component.characters()).toEqual([...mockCharacters, ...moreCharacters]);
      expect(component.hasNextPage()).toBe(false);
      expect(component.isLoading()).toBe(false);
    });

    it('should be a no-op while already loading', () => {
      component.isLoading.set(true);
      characterServiceSpy.getCharacters.mockClear();

      component.loadMore();

      expect(characterServiceSpy.getCharacters).not.toHaveBeenCalled();
    });

    it('should be a no-op when there is no next page', () => {
      component.hasNextPage.set(false);
      characterServiceSpy.getCharacters.mockClear();

      component.loadMore();

      expect(characterServiceSpy.getCharacters).not.toHaveBeenCalled();
    });

    it('should roll back the page number on error', () => {
      const pageBefore = component.currentPage();
      characterServiceSpy.getCharacters.mockReturnValue(throwError(() => new Error('fail')));

      component.loadMore();

      expect(component.currentPage()).toBe(pageBefore);
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('navigation helpers', () => {
    beforeEach(() => fixture.detectChanges());

    it('openCharacterAnime should navigate when animeId is present', () => {
      component.openCharacterAnime(42);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/anime', 42]);
    });

    it('openCharacterAnime should do nothing when animeId is null', () => {
      component.openCharacterAnime(null);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('goHome should navigate to /home', () => {
      component.goHome();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('onTabChange should navigate home when leaving the personagens tab', () => {
      component.onTabChange('inicio' as any);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('onTabChange should not navigate when already on personagens', () => {
      component.onTabChange('personagens' as any);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  describe('profile menu', () => {
    beforeEach(() => fixture.detectChanges());

    it('toggleProfileMenu should flip visibility', () => {
      expect(component.showProfileMenu()).toBe(false);
      component.toggleProfileMenu();
      expect(component.showProfileMenu()).toBe(true);
      component.toggleProfileMenu();
      expect(component.showProfileMenu()).toBe(false);
    });

    it('closeProfileMenu should always set it to false', () => {
      component.showProfileMenu.set(true);
      component.closeProfileMenu();
      expect(component.showProfileMenu()).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear the session and navigate to /login', () => {
      fixture.detectChanges();

      component.logout();

      expect(sessionServiceSpy.clearSession).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('userInitial', () => {
    it('should return the uppercase first letter of the username', () => {
      fixture.detectChanges();
      component.username.set('joao');
      expect(component.userInitial()).toBe('J');
    });

    it('should fall back to "U" when there is no username', () => {
      fixture.detectChanges();
      component.username.set('');
      expect(component.userInitial()).toBe('U');
    });
  });
});