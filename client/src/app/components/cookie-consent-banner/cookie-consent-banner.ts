import { Component, OnInit, inject } from '@angular/core';
import { ConsentService } from '../../../api/services/consent.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-cookie-consent-banner',
  standalone: true,
  templateUrl: './cookie-consent-banner.html',
  styleUrl: './cookie-consent-banner.css',
})
export class CookieConsentBanner implements OnInit {
  readonly consent = inject(ConsentService);
  private readonly toastService = inject(ToastService);

  ngOnInit(): void {
    void this.consent.load();
  }

  acceptAll(): void {
    void this.save(() => this.consent.acceptAll());
  }

  acceptEssentialOnly(): void {
    void this.save(() => this.consent.acceptEssentialOnly());
  }

  private async save(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch {
      this.toastService.error(
        'Não foi possível salvar sua preferência de cookies. Tente novamente.',
      );
    }
  }
}
