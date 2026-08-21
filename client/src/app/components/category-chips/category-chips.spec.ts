import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryChips } from './category-chips';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('CategoryChips', () => {
  let component: CategoryChips;
  let fixture: ComponentFixture<CategoryChips>;

  beforeAll(() => {
    if (!('ResizeObserver' in globalThis)) {
      (globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;
    }
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryChips],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryChips);
    fixture.componentRef.setInput('categories', ['Ação', 'Aventura', 'Comédia']);
    fixture.componentRef.setInput('selectedCategory', '');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one chip per category', () => {
    const el: HTMLElement = fixture.nativeElement;
    const chips = el.querySelectorAll('[aria-label="Scroll left"] ~ div button, div button');
    expect(chips.length).toBe(3);
    expect(el.textContent).toContain('Ação');
  });

  it('should emit the selected category when a chip is clicked', () => {
    let selected = '';
    component.categorySelect.subscribe((category) => (selected = category));

    const carousel = fixture.nativeElement.querySelector('#carousel') as HTMLElement;
    const chips = carousel.querySelectorAll('button');
    (chips[1] as HTMLElement).click();

    expect(selected).toBe('Aventura');
  });
});
