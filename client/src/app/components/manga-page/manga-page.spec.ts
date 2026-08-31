import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MangaPage } from './manga-page';

describe('MangaPage', () => {
  let component: MangaPage;
  let fixture: ComponentFixture<MangaPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MangaPage],
    }).compileComponents();

    fixture = TestBed.createComponent(MangaPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
