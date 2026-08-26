import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private cache = new Map<string, Observable<string>>();
  private apiUrl = 'https://libretranslate.com/translate'; 

  constructor(private http: HttpClient) {}

  translate(text: string, target = 'pt'): Observable<string> {
    if (!text) return of('');

    const key = `${target}:${text}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const request$ = this.http.post<{ translatedText: string }>(this.apiUrl, {
      q: text,
      source: 'en',
      target,
      format: 'text'
    }).pipe(
      map(res => res.translatedText),
      catchError(() => of(text)), 
      shareReplay(1)
    );

    this.cache.set(key, request$);
    return request$;
  }
}