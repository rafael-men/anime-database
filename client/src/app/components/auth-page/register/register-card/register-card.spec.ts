import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterCard } from './register-card';

describe('RegisterCard', () => {
  let component: RegisterCard;
  let fixture: ComponentFixture<RegisterCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterCard],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
