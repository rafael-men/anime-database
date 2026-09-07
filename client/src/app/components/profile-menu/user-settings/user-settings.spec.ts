import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { UserProfile, UsersService } from '../../../../api/services/users.service';
import { PreferencesService } from '../../../../api/services/preferences.service';
import { UserSettings } from './user-settings';

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

describe('UserSettings', () => {
  let component: UserSettings;
  let fixture: ComponentFixture<UserSettings>;
  let getProfileMock: ReturnType<typeof vi.fn>;
  let setNsfwFilterMock: ReturnType<typeof vi.fn>;
  let saveNsfwFilterMock: ReturnType<typeof vi.fn>;
  let setAdultContentMock: ReturnType<typeof vi.fn>;
  let setAdultRequestStatusMock: ReturnType<typeof vi.fn>;
  let setBirthDateMock: ReturnType<typeof vi.fn>;
  let saveAdultContentMock: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  function seedSession(): void {
    localStorage.setItem(
      'user',
      JSON.stringify({ userId: 'u1', username: 'rafael', email: 'rafael@test.com' }),
    );
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(UserSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    getProfileMock = vi.fn().mockReturnValue(of(makeProfile()));
    setNsfwFilterMock = vi.fn();
    saveNsfwFilterMock = vi.fn().mockResolvedValue(undefined);
    setAdultContentMock = vi.fn();
    setAdultRequestStatusMock = vi.fn();
    setBirthDateMock = vi.fn();
    saveAdultContentMock = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [UserSettings],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: UsersService,
          useValue: { getProfile: getProfileMock },
        },
        {
          provide: PreferencesService,
          useValue: {
            setNsfwFilter: setNsfwFilterMock,
            saveNsfwFilter: saveNsfwFilterMock,
            setAdultContent: setAdultContentMock,
            setAdultRequestStatus: setAdultRequestStatusMock,
            setBirthDate: setBirthDateMock,
            saveAdultContent: saveAdultContentMock,
          },
        },
      ],
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should create and load nsfwFilter preference', () => {
    seedSession();
    createComponent();

    expect(component).toBeTruthy();
    expect(getProfileMock).toHaveBeenCalledWith('u1');
    expect(component.nsfwFilter()).toBe(false);
    expect(component.username()).toBe('rafael');
    expect(component.userInitial()).toBe('R');
    expect(component.isLoading()).toBe(false);
  });

  it('should load nsfwFilter as enabled when profile has it on', () => {
    seedSession();
    getProfileMock.mockReturnValue(of(makeProfile({ nsfwFilter: true })));
    createComponent();

    expect(component.nsfwFilter()).toBe(true);
    expect(setNsfwFilterMock).toHaveBeenCalledWith(true);
  });

  it('should redirect to login when there is no session', () => {
    createComponent();

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    expect(getProfileMock).not.toHaveBeenCalled();
  });

  it('should show error state when loading fails', () => {
    seedSession();
    getProfileMock.mockReturnValue(throwError(() => new Error('fail')));
    createComponent();

    expect(component.errorMessage()).toContain('Erro ao carregar');
    expect(component.isLoading()).toBe(false);
  });

  it('should toggle nsfw filter and save optimistically', async () => {
    seedSession();
    createComponent();

    await component.toggleNsfwFilter();

    expect(component.nsfwFilter()).toBe(true);
    expect(saveNsfwFilterMock).toHaveBeenCalledWith('u1', true);
    expect(component.saveError()).toBe('');
  });

  it('should rollback nsfw filter when save fails', async () => {
    seedSession();
    createComponent();
    saveNsfwFilterMock.mockRejectedValueOnce(new Error('fail'));

    await component.toggleNsfwFilter();

    expect(component.nsfwFilter()).toBe(false);
    expect(component.saveError()).toContain('Erro ao salvar');
    expect(component.isSaving()).toBe(false);
  });

  it('should navigate home on tab change', () => {
    seedSession();
    createComponent();

    component.onTabChange('ovas');
    expect(navigateSpy).toHaveBeenCalledWith(['/home']);
  });

  it('should load approved adult content and status from profile', () => {
    seedSession();
    getProfileMock.mockReturnValue(
      of(makeProfile({ adultRequestStatus: 'approved', birthDate: '2000-01-15' })),
    );
    createComponent();

    expect(component.adultStatus()).toBe('approved');
    expect(component.adultContent()).toBe(true);
    expect(component.birthDate()).toBe('2000-01-15');
    expect(component.formattedBirthDate()).toBe('15/01/2000');
    expect(setAdultRequestStatusMock).toHaveBeenCalledWith('approved');
    expect(setBirthDateMock).toHaveBeenCalledWith('2000-01-15');
  });

  it('should load pending status and keep content off', () => {
    seedSession();
    getProfileMock.mockReturnValue(
      of(makeProfile({ adultRequestStatus: 'pending', birthDate: '2000-01-15' })),
    );
    createComponent();

    expect(component.adultStatus()).toBe('pending');
    expect(component.adultContent()).toBe(false);
  });

  it('should submit a request when birthDate is already stored', async () => {
    seedSession();
    getProfileMock.mockReturnValue(
      of(makeProfile({ birthDate: '2000-01-15' })),
    );
    createComponent();

    await component.toggleAdultContent();

    expect(component.adultStatus()).toBe('pending');
    expect(component.adultContent()).toBe(false);
    expect(saveAdultContentMock).toHaveBeenCalledWith('u1', true, undefined);
    expect(component.adultGateOpen()).toBe(false);
    expect(component.adultSuccess()).toContain('análise');
  });

  it('should open the birthDate gate when no birthDate is stored', async () => {
    seedSession();
    createComponent();

    await component.toggleAdultContent();

    expect(component.adultStatus()).toBe('none');
    expect(component.adultGateOpen()).toBe(true);
    expect(saveAdultContentMock).not.toHaveBeenCalled();
  });

  it('should keep the gate open when confirming without a birthDate', async () => {
    seedSession();
    createComponent();
    component.adultGateOpen.set(true);

    await component.confirmAdultContent();

    expect(component.adultSaveError()).toContain('Digite');
    expect(saveAdultContentMock).not.toHaveBeenCalled();
  });

  it('should submit a request through the gate with a birthDate', async () => {
    seedSession();
    createComponent();
    component.adultGateOpen.set(true);
    component.onBirthDateInput('2000-01-15');

    await component.confirmAdultContent();

    expect(component.adultStatus()).toBe('pending');
    expect(component.adultContent()).toBe(false);
    expect(component.birthDate()).toBe('2000-01-15');
    expect(component.adultGateOpen()).toBe(false);
    expect(saveAdultContentMock).toHaveBeenCalledWith('u1', true, '2000-01-15');
    expect(component.adultSuccess()).toContain('análise');
  });

  it('should keep the gate open and show server message when the request fails', async () => {
    seedSession();
    createComponent();
    component.adultGateOpen.set(true);
    component.onBirthDateInput('2000-01-15');
    saveAdultContentMock.mockRejectedValueOnce({
      error: { message: 'Data de nascimento inválida.' },
    });

    await component.confirmAdultContent();

    expect(component.adultStatus()).toBe('none');
    expect(component.adultSaveError()).toContain('Data de nascimento');
  });

  it('should show denied hint and open the gate when toggling while denied', async () => {
    seedSession();
    getProfileMock.mockReturnValue(
      of(makeProfile({ adultRequestStatus: 'denied' })),
    );
    createComponent();

    await component.toggleAdultContent();

    expect(component.adultGateOpen()).toBe(true);
    expect(component.adultSaveError()).toContain('negada');
    expect(saveAdultContentMock).not.toHaveBeenCalled();
  });

  it('should do nothing while a request is pending', async () => {
    seedSession();
    getProfileMock.mockReturnValue(
      of(makeProfile({ adultRequestStatus: 'pending' })),
    );
    createComponent();

    await component.toggleAdultContent();

    expect(component.adultStatus()).toBe('pending');
    expect(component.adultGateOpen()).toBe(false);
    expect(saveAdultContentMock).not.toHaveBeenCalled();
  });

  it('should disable adult content when toggling an approved status', async () => {
    seedSession();
    getProfileMock.mockReturnValue(
      of(makeProfile({ adultRequestStatus: 'approved' })),
    );
    createComponent();

    await component.toggleAdultContent();

    expect(component.adultStatus()).toBe('none');
    expect(component.adultContent()).toBe(false);
    expect(saveAdultContentMock).toHaveBeenCalledWith('u1', false);
    expect(component.adultSuccess()).toContain('desativado');
  });

  it('should show an error when disabling fails', async () => {
    seedSession();
    getProfileMock.mockReturnValue(
      of(makeProfile({ adultRequestStatus: 'approved' })),
    );
    createComponent();
    saveAdultContentMock.mockRejectedValueOnce(new Error('fail'));

    await component.toggleAdultContent();

    expect(component.adultStatus()).toBe('approved');
    expect(component.adultContent()).toBe(true);
    expect(component.adultSaveError()).toContain('Erro ao salvar');
  });
});