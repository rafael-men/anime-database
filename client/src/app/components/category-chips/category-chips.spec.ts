import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryChips } from './category-chips';

describe('CategoryChips', () => {
  let component: CategoryChips;
  let fixture: ComponentFixture<CategoryChips>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryChips],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryChips);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
