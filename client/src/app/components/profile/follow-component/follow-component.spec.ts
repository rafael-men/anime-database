import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { FollowComponent } from './follow-component';
import { UsersService } from '../../../../api/services/users.service';

describe('FollowComponent', () => {
  let component: FollowComponent;
  let fixture: ComponentFixture<FollowComponent>;
  let followMock: ReturnType<typeof vi.fn>;
  let unfollowMock: ReturnType<typeof vi.fn>;
  let isFollowingMock: ReturnType<typeof vi.fn>;
  let followCountsMock: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    followMock = vi.fn(() => of(undefined));
    unfollowMock = vi.fn(() => of(undefined));
    isFollowingMock = vi.fn(() => of(false));
    followCountsMock = vi.fn(() => of({ followers: 0, following: 0 }));

    await TestBed.configureTestingModule({
      imports: [FollowComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: UsersService,
          useValue: {
            follow: followMock,
            unfollow: unfollowMock,
            isFollowing: isFollowingMock,
            getFollowCounts: followCountsMock,
          },
        },
      ],
    }).compileComponents();

    localStorage.clear();
    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');

    fixture = TestBed.createComponent(FollowComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userId', 'user-2');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load counts', () => {
    expect(component).toBeTruthy();
    expect(followCountsMock).toHaveBeenCalledWith('user-2');
    expect(component.counts()).toEqual({ followers: 0, following: 0 });
  });

  it('should follow and update counts', () => {
    component.toggleFollow();
    fixture.detectChanges();

    expect(followMock).toHaveBeenCalledWith('user-2');
    expect(component.isFollowing()).toBe(true);
    expect(component.counts().followers).toBe(1);
  });

  it('should unfollow and update counts', () => {
    component.isFollowing.set(true);
    component.counts.set({ followers: 3, following: 1 });
    fixture.detectChanges();

    component.toggleFollow();
    fixture.detectChanges();

    expect(unfollowMock).toHaveBeenCalledWith('user-2');
    expect(component.isFollowing()).toBe(false);
    expect(component.counts().followers).toBe(2);
  });

  it('should navigate to profile on goToProfile', () => {
    component.goToProfile('user-3');
    expect(navigateSpy).toHaveBeenCalledWith(['/profile', 'user-3']);
  });
});