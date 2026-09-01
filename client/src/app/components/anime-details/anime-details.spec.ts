import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { of } from 'rxjs';

import { AnimeDetails } from './anime-details';
import { UsersService } from '../../../api/services/users.service';

describe('AnimeDetails', () => {
  let component: AnimeDetails;
  let fixture: ComponentFixture<AnimeDetails>;

  beforeEach(async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ userId: 'u1', username: 'tester', email: 'tester@test.com' }),
    );

    await TestBed.configureTestingModule({
      imports: [AnimeDetails],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: UsersService,
          useValue: { getProfile: vi.fn().mockReturnValue(of({ username: 'tester', avatarUrl: null })) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnimeDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error message for invalid anime id', () => {
    fixture.detectChanges();
    expect(component.errorMessage()).toBe('Anime não encontrado.');
    expect(component.anime()).toBeNull();
  });

  it('should map status labels to portuguese', () => {
    expect(component.statusLabel('RELEASING')).toBe('Em lançamento');
    expect(component.statusLabel('FINISHED')).toBe('Finalizado');
    expect(component.statusLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('should format season label with year', () => {
    expect(component.seasonLabel('WINTER', 2021)).toBe('Inverno 2021');
    expect(component.seasonLabel('', null)).toBe('');
  });
});
