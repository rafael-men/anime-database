import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private cache = new Map<string, Observable<string>>();
  private apiUrl = 'https://translate.googleapis.com/translate_a/single';

  constructor(private http: HttpClient) {}

  translate(text: string, target = 'pt'): Observable<string> {
    if (!text) return of('');

    const key = `${target}:${text}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const params = new HttpParams()
      .set('client', 'gtx')
      .set('sl', 'en')
      .set('tl', target)
      .set('dt', 't')
      .set('q', text);

    const request$ = this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => this.extractTranslatedText(res)),
      catchError(() => of(text)), // fallback: mostra o original se der erro
      shareReplay(1)
    );

    this.cache.set(key, request$);
    return request$;
  }

  private extractTranslatedText(response: any): string {
    // Formato da resposta: [[["texto traduzido","texto original",null,null,...], [...]], ...]
    if (!Array.isArray(response) || !Array.isArray(response[0])) return '';
    return response[0].map((segment: any[]) => segment[0]).join('');
  }
}