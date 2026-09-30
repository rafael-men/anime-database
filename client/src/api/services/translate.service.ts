import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<string>>();
  private readonly apiUrl = 'https://translate.googleapis.com/translate_a/single';
  private readonly storagePrefix = 'anime-database.translation.v1:';
  private readonly maxRequestLength = 1000;

  translate(text: string, target = 'pt'): Observable<string> {
    const normalizedText = text.trim();
    if (!normalizedText) return of('');

    const key = `${target}:${normalizedText}`;
    const memoryValue = this.cache.get(key);
    if (memoryValue) return memoryValue;

    const storedValue = this.readStoredTranslation(target, normalizedText);
    if (storedValue) {
      const stored$ = of(storedValue);
      this.cache.set(key, stored$);
      return stored$;
    }

    if (normalizedText.length > this.maxRequestLength) {
      const fallback$ = of(normalizedText);
      this.cache.set(key, fallback$);
      return fallback$;
    }

    const params = new HttpParams()
      .set('client', 'gtx')
      .set('sl', 'en')
      .set('tl', target)
      .set('dt', 't')
      .set('q', normalizedText);

    const request$ = this.http.get<unknown>(this.apiUrl, { params }).pipe(
      map((response) => this.extractTranslatedText(response)),
      tap((translatedText) => {
        if (translatedText) {
          this.storeTranslation(target, normalizedText, translatedText);
        }
      }),
      catchError(() => of(normalizedText)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.cache.set(key, request$);
    return request$;
  }

  private extractTranslatedText(response: unknown): string {
    if (!Array.isArray(response) || !Array.isArray(response[0])) return '';

    return response[0]
      .filter((segment): segment is unknown[] => Array.isArray(segment))
      .map((segment) => (typeof segment[0] === 'string' ? segment[0] : ''))
      .join('');
  }

  private storageKey(target: string, text: string): string {
    return `${this.storagePrefix}${target}:${text}`;
  }

  private readStoredTranslation(
    target: string,
    text: string,
  ): string | null {
    if (typeof localStorage === 'undefined') return null;

    try {
      return localStorage.getItem(this.storageKey(target, text));
    } catch {
      return null;
    }
  }

  private storeTranslation(
    target: string,
    text: string,
    translatedText: string,
  ): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(
        this.storageKey(target, text),
        translatedText,
      );
    } catch {
    }
  }
}