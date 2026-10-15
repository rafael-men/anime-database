import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { ReviewDetails } from './review-details';

describe('ReviewDetails', () => {
  let component: ReviewDetails;
  let fixture: ComponentFixture<ReviewDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewDetails],
      providers: [
        provideHttpClient(),
        {
          // O componente assina route.queryParamMap com pipe(), nao snapshot.
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of({
              get: (key: string) =>
                key === 'reviewId'
                  ? 'rev-1'
                  : key === 'animeId'
                    ? '1'
                    : key === 'userId'
                      ? 'u1'
                      : null,
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});