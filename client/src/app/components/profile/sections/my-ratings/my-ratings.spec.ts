import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyRatings } from './my-ratings';

describe('MyRatings', () => {
  let component: MyRatings;
  let fixture: ComponentFixture<MyRatings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyRatings],
    }).compileComponents();

    fixture = TestBed.createComponent(MyRatings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
