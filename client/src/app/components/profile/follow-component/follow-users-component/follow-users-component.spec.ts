import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { FollowUsersComponent } from './follow-users-component';
import { UsersService } from '../../../../../api/services/users.service';

function makeFollowUser(id: string, username: string) {
  return {
    id,
    username,
    email: `${username}@test.com`,
    avatarUrl: null,
    bio: null,
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  };
}

describe('FollowUsersComponent', () => {
  let component: FollowUsersComponent;
  let fixture: ComponentFixture<FollowUsersComponent>;
  let followersMock: ReturnType<typeof vi.fn>;
  let followingMock: ReturnType<typeof vi.fn>;
  let clickHandler: (id: string) => void;

  beforeEach(async () => {
    followersMock = vi.fn(() => of([makeFollowUser('u1', 'ana'), makeFollowUser('u2', 'bob')]));
    followingMock = vi.fn(() => of([makeFollowUser('u3', 'caio')]));

    await TestBed.configureTestingModule({
      imports: [FollowUsersComponent],
      providers: [
        provideHttpClient(),
        {
          provide: UsersService,
          useValue: {
            getFollowers: followersMock,
            getFollowing: followingMock,
          },
        },
      ],
    }).compileComponents();

    localStorage.clear();

    fixture = TestBed.createComponent(FollowUsersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userId', 'profile-1');
    fixture.componentRef.setInput('type', 'followers');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load followers', () => {
    expect(component).toBeTruthy();
    expect(followersMock).toHaveBeenCalledWith('profile-1');
    expect(component.users().length).toBe(2);
    expect(component.isLoading()).toBe(false);
  });

  it('should load following when type changes', () => {
    fixture.componentRef.setInput('type', 'following');
    fixture.detectChanges();

    expect(followingMock).toHaveBeenCalledWith('profile-1');
    expect(component.users().length).toBe(1);
    expect(component.users()[0].username).toBe('caio');
  });

  it('should emit user id on row click', () => {
    clickHandler = vi.fn();
    component.userClick.subscribe(clickHandler);

    component.onUserClick('u1');
    expect(clickHandler).toHaveBeenCalledWith('u1');
  });

  it('should render empty state when no users', () => {
    followersMock.mockReturnValue(of([]));

    fixture = TestBed.createComponent(FollowUsersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userId', 'profile-1');
    fixture.componentRef.setInput('type', 'followers');
    fixture.detectChanges();

    expect(component.users().length).toBe(0);
    expect(component.isLoading()).toBe(false);
  });
});