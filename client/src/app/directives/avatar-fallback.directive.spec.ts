import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarFallbackDirective } from './avatar-fallback.directive';

@Component({
  standalone: true,
  imports: [AvatarFallbackDirective],
  template: `<img [src]="src" avatarFallback />`,
})
class TestHost {
  src = 'http://invalid.invalid/avatar.jpg';
}

describe('AvatarFallbackDirective', () => {
  let fixture: ComponentFixture<TestHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHost],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
  });

  it('should swap the src to a data URI when the image fails to load', () => {
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;

    expect(img.src).toBe('http://invalid.invalid/avatar.jpg');

    img.dispatchEvent(new Event('error'));

    expect(img.src).toMatch(/^data:image\/svg\+xml/);
  });

  it('should keep the original src on successful load', () => {
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;

    img.dispatchEvent(new Event('load'));

    expect(img.src).toBe('http://invalid.invalid/avatar.jpg');
  });
});
