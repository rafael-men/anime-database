import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnimeGrid } from './anime-grid';

describe('AnimeGrid', () => {
  let component: AnimeGrid;
  let fixture: ComponentFixture<AnimeGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimeGrid],
    }).compileComponents();

    fixture = TestBed.createComponent(AnimeGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
