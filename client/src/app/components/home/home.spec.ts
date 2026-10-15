import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach } from 'vitest';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { of } from 'rxjs';

import { Home } from './home';
import { UsersService } from '../../../api/services/users.service';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        {
          provide: UsersService,
          useValue: { getProfile: vi.fn().mockReturnValue(of({ username: 'tester', avatarUrl: null })) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    // Sem o teardown do TestBed, o modulo fica instanciado entre arquivos e o
    // proximo configureTestingModule falha com "already been instantiated".
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
