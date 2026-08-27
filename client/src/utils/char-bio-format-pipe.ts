import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'bioFormat',
  standalone: true
})
export class CharBioFormatPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined, hideSpoilers = true): SafeHtml {
    if (!value) return '';

    let text = this.escapeHtml(value);
    text = text.replace(/^__\s/, '');
    text = text.replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>');
    text = text.replace(/(\*|_)(.+?)\1/g, '<em>$2</em>');
    text = text.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    text = hideSpoilers
      ? text.replace(
          /~!([\s\S]+?)!~/g,
          '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>'
        )
      : text.replace(/~!([\s\S]+?)!~/g, '$1');

    return this.sanitizer.bypassSecurityTrustHtml(text);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}