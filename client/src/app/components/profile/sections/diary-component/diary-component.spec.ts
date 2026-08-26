import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiaryComponent } from './diary-component';

describe('DiaryComponent', () => {
  let component: DiaryComponent;
  let fixture: ComponentFixture<DiaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiaryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DiaryComponent);
    fixture.componentRef.setInput('reviews', []);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
