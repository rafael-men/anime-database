import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { ProfileMenu } from './profile-menu';

describe('ProfileMenu', () => {
  let component: ProfileMenu;
  let fixture: ComponentFixture<ProfileMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileMenu],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to the seguindo page and close the menu', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    const closeSpy = vi.fn();
    component.close.subscribe(closeSpy);

    component.goToFollowing();

    expect(closeSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/seguindo']);
  });
});
