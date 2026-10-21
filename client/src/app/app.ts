import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainer } from './components/toast-container/toast-container';
import { CookieConsentBanner } from './components/cookie-consent-banner/cookie-consent-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainer, CookieConsentBanner],
  templateUrl: './app.html',
})
export class App {
  protected readonly title = 'Database';
}
