import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AddComponent } from './add-component';
import { UsersService } from '../../../../api/services/users.service';

describe('AddComponent', () => {
  let component: AddComponent;
  let fixture: ComponentFixture<AddComponent>;

  beforeEach(async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ userId: 'u1', username: 'tester', email: 'tester@test.com' }),
    );

    await TestBed.configureTestingModule({
      imports: [AddComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: UsersService,
          useValue: {
            getProfile: vi.fn(() => of({ username: 'tester', avatarUrl: null })),
            getFollowers: vi.fn(() => of([])),
            getFollowing: vi.fn(() => of([])),
            searchUsers: vi.fn(() => of([])),
            follow: vi.fn(() => of(undefined)),
            unfollow: vi.fn(() => of(undefined)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should create and load current user id', () => {
    expect(component).toBeTruthy();
    expect(component.currentUserId()).toBe('u1');
    expect(component.username()).toBe('tester');
  });

  it('should default to the following tab', () => {
    expect(component.activeTab()).toBe('following');
  });

  it('should switch tab between following and followers', () => {
    component.setTab('followers');
    expect(component.activeTab()).toBe('followers');

    component.setTab('following');
    expect(component.activeTab()).toBe('following');
  });

  it('should navigate to the selected user profile', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.openProfile('u2');

    expect(navigateSpy).toHaveBeenCalledWith(['/profile', 'u2']);
  });

  it('should render the Seguindo header', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Amizades');
    expect(element.textContent).toContain('Buscar pessoas');
  });
});
