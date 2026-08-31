import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FavouriteMangas } from './favourite-mangas';

describe('FavouriteMangas', () => {
  let component: FavouriteMangas;
  let fixture: ComponentFixture<FavouriteMangas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FavouriteMangas],
    }).compileComponents();

    fixture = TestBed.createComponent(FavouriteMangas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
