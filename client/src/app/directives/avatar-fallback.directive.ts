import { Directive, ElementRef, HostListener } from '@angular/core';

const FALLBACK_AVATAR_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
     <rect width="200" height="200" fill="#1f1f1f"/>
     <circle cx="100" cy="76" r="34" fill="#3a3a3a"/>
     <path d="M42 168c6-30 36-42 58-42s52 12 58 42z" fill="#3a3a3a"/>
   </svg>`,
)}`;

@Directive({
  selector: 'img[avatarFallback]',
  standalone: true,
})
export class AvatarFallbackDirective {
  private replaced = false;

  constructor(private readonly el: ElementRef<HTMLImageElement>) {}

  @HostListener('error')
  onError(): void {
    if (this.replaced) return;
    this.replaced = true;
    this.el.nativeElement.src = FALLBACK_AVATAR_SVG;
  }
}
