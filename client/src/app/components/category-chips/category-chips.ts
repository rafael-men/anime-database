import { Component, input, output, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-chips',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-chips.html',
  styleUrl: './category-chips.css',
})
export class CategoryChips implements AfterViewInit, OnDestroy {
  categories = input.required<string[]>();
  selectedCategory = input<string>('');
  categorySelect = output<string>();

  @ViewChild('carousel') carouselRef!: ElementRef<HTMLDivElement>;

  showLeftArrow = false;
  showRightArrow = false;
  private resizeObserver?: ResizeObserver;
  private timers: ReturnType<typeof setTimeout>[] = [];

  ngAfterViewInit(): void {
    const el = this.carouselRef?.nativeElement;
    if (!el) return;

    this.resizeObserver = new ResizeObserver(() => this.checkArrows());
    this.resizeObserver.observe(el);

    [0, 50, 150, 300].forEach(ms =>
      this.timers.push(setTimeout(() => this.checkArrows(), ms))
    );
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.timers.forEach(clearTimeout);
  }

  scrollLeft(): void {
    const el = this.carouselRef.nativeElement;
    el.scrollBy({ left: -200, behavior: 'smooth' });
    this.timers.push(setTimeout(() => this.checkArrows(), 300));
  }

  scrollRight(): void {
    const el = this.carouselRef.nativeElement;
    el.scrollBy({ left: 200, behavior: 'smooth' });
    this.timers.push(setTimeout(() => this.checkArrows(), 300));
  }

  onScroll(): void {
    this.checkArrows();
  }

  private checkArrows(): void {
    const el = this.carouselRef?.nativeElement;
    if (!el) return;
    const left = el.scrollLeft > 5;
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 5;
    if (left !== this.showLeftArrow) this.showLeftArrow = left;
    if (right !== this.showRightArrow) this.showRightArrow = right;
  }
}
