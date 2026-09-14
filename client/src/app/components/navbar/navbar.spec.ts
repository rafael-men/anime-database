import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';

import { Navbar } from './navbar';
import { SessionService } from '../../../api/services/session.service';
import { UsersService } from '../../../api/services/users.service';
import { PreferencesService } from '../../../api/services/preferences.service';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;
  let getProfileMock: ReturnType<typeof vi.fn>;
  let setAdultRequestStatusMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getProfileMock = vi.fn();
    setAdultRequestStatusMock = vi.fn();

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        {
          provide: SessionService,
          useValue: { getUser: vi.fn(() => null) },
        },
        {
          provide: UsersService,
          useValue: { getProfile: getProfileMock },
        },
        {
          provide: PreferencesService,
          useValue: { setAdultRequestStatus: setAdultRequestStatusMock },
        },
      ],
    }).compileComponents();

    localStorage.clear();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch adult request status when a session exists', () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ userId: 'u1', username: 'rafael', email: 'rafael@test.com' }),
    );
    TestBed.inject(SessionService).getUser = vi.fn(() => ({
      userId: 'u1',
      username: 'rafael',
      email: 'rafael@test.com',
    }));
    getProfileMock.mockReturnValue(of({ adultRequestStatus: 'approved' }));
    component.ngOnInit();

    expect(getProfileMock).toHaveBeenCalledWith('u1');
    expect(component.adultRequestStatus()).toBe('approved');
    expect(setAdultRequestStatusMock).toHaveBeenCalledWith('approved');
  });

  it('should show an unread notification badge for approved status and mark it seen', () => {
    component.adultRequestStatus.set('approved');

    expect(component.hasNotification()).toBe(true);
    expect(component.hasUnreadNotification()).toBe(true);

    component.markNotificationsSeen();

    expect(component.hasUnreadNotification()).toBe(false);
    expect(localStorage.getItem('adult_request_seen')).toBe('approved');
  });

  it('should show an unread notification for denied status', () => {
    component.adultRequestStatus.set('denied');

    expect(component.hasNotification()).toBe(true);
    expect(component.hasUnreadNotification()).toBe(true);
  });

  it('should not show a notification when status is pending or none', () => {
    component.adultRequestStatus.set('pending');
    expect(component.hasNotification()).toBe(false);

    component.adultRequestStatus.set('none');
    expect(component.hasNotification()).toBe(false);
  });

  it('should escape user data in highlight output', () => {
    expect(component.highlight('Título & <b>X</b>', '')).toBe('Título &amp; &lt;b&gt;X&lt;/b&gt;');
    expect(component.highlight('<script>alert(1)</script>', 'script')).toBe(
      '&lt;<mark class="search-highlight">script</mark>&gt;alert(1)&lt;/<mark class="search-highlight">script</mark>&gt;'
    );
    expect(component.highlight('One Piece', 'one')).toBe(
      '<mark class="search-highlight">One</mark> Piece'
    );
    expect(component.highlight('One < Two', '<')).toBe(
      'One <mark class="search-highlight">&lt;</mark> Two'
    );
  });

  it('should not mark a non-terminal status as seen', () => {
    component.adultRequestStatus.set('pending');
    component.markNotificationsSeen();

    expect(component.hasUnreadNotification()).toBe(false);
    expect(localStorage.getItem('adult_request_seen')).toBeNull();
  });
});