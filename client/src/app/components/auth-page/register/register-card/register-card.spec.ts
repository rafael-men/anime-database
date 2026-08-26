import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { RegisterCard } from './register-card';
import { AuthService } from '../../../../../api/services/auth.service';
import { SessionService } from '../../../../../api/services/session.service';

describe('RegisterCard', () => {
  let component: RegisterCard;
  let fixture: ComponentFixture<RegisterCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterCard],
      providers: [
        { provide: AuthService, useValue: { register: () => of({}) } },
        { provide: SessionService, useValue: { setSession: () => {} } },
        { provide: Router, useValue: { navigate: () => {} } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
