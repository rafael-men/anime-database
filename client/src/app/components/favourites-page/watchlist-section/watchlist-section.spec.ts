import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WatchlistSection } from './watchlist-section';

describe('WatchlistSection', () => {
  let component: WatchlistSection;
  let fixture: ComponentFixture<WatchlistSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WatchlistSection],
    }).compileComponents();

    fixture = TestBed.createComponent(WatchlistSection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
