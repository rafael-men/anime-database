import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { FormCard } from './form-card';
import { AuthService } from '../../../../../api/services/auth.service';
import { SessionService } from '../../../../../api/services/session.service';

describe('FormCard', () => {
  let component: FormCard;
  let fixture: ComponentFixture<FormCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormCard],
      providers: [
        { provide: AuthService, useValue: { login: () => of({}) } },
        { provide: SessionService, useValue: { setSession: () => {} } },
        { provide: Router, useValue: { navigate: () => {} } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
