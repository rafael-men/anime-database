import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationPage } from './validation-page';

describe('ValidationPage', () => {
  let component: ValidationPage;
  let fixture: ComponentFixture<ValidationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
