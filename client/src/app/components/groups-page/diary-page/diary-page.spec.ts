import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiaryPage } from './diary-page';

describe('DiaryPage', () => {
  let component: DiaryPage;
  let fixture: ComponentFixture<DiaryPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiaryPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DiaryPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
