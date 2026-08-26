import { Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs';
import { TranslateService } from './../api/services/translate.service';

@Pipe({
  name: 'bioTranslate',
  standalone: true 
})
export class TranslatePipe implements PipeTransform {
  constructor(private translateService: TranslateService) {}

  transform(value: string, target = 'pt'): Observable<string> {
    return this.translateService.translate(value, target);
  }
}