import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileCustomization } from './profile-customization';

describe('ProfileCustomization', () => {
  let component: ProfileCustomization;
  let fixture: ComponentFixture<ProfileCustomization>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileCustomization],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileCustomization);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
