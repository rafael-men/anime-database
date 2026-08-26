import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { CharacterDetails } from './character-details';
import { CharacterService } from '../../../api/services/character.service';
import { UsersService } from '../../../api/services/users.service';
import { SessionService } from '../../../api/services/session.service';
import { TranslateService } from '../../../api/services/translate.service';

describe('CharacterDetails', () => {
  let component: CharacterDetails;
  let fixture: ComponentFixture<CharacterDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterDetails],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
        { provide: Router, useValue: { navigate: () => {} } },
        { provide: CharacterService, useValue: { getById: () => of({ id: 1, name: 'Test', nameNative: '', alternative: [], image: '', gender: null, favourites: 0, description: '', dateOfBirth: '', age: '', height: '', bloodType: '', media: [] }) } },
        { provide: UsersService, useValue: { getKinCount: () => of(0), getProfile: () => of({}) } },
        { provide: SessionService, useValue: { getUser: () => null } },
        { provide: TranslateService, useValue: { translate: () => of('') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
