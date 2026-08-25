import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FavCharactersComponent } from './fav-characters-component';

describe('FavCharactersComponent', () => {
  let component: FavCharactersComponent;
  let fixture: ComponentFixture<FavCharactersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FavCharactersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FavCharactersComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
