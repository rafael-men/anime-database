import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminService,
  AdultRequest,
  AdultRequestStatus,
} from '../../../../api/services/admin.service';

@Component({
  selector: 'app-validation-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './validation-page.html',
  styleUrl: './validation-page.css',
})
export class ValidationPage {
  private readonly adminService = inject(AdminService);

  isAuthenticating = signal(false);
  isLoggedIn = signal(false);
  adminUsername = signal('');

  requests = signal<AdultRequest[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  actionError = signal('');
  actionUserId = signal('');
  isActionRunning = signal(false);

  readonly pendingCount = computed(
    () => this.requests().filter((r) => r.adultRequestStatus === 'pending').length,
  );

  
  ngOnInit(): void {
    this.checkSession();
  }

  private checkSession(): void {
    this.isAuthenticating.set(true);

    this.adminService.getSession().subscribe({
      next: (session) => {
        this.isLoggedIn.set(true);
        this.adminUsername.set(session.username);
        this.isAuthenticating.set(false);
        this.refreshRequests();
      },
      error: () => {
        this.isAuthenticating.set(false);
        this.adminService.startLogin();
      },
    });
  }

  login(): void {
    this.adminService.startLogin();
  }

  refreshRequests(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.adminService.listRequests().subscribe({
      next: (requests: AdultRequest[]) => {
        this.requests.set(requests);
        this.isLoggedIn.set(true);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Erro ao carregar solicitações. Tente novamente.');
      },
    });
  }

  approve(request: AdultRequest): void {
    this.runAction(request, 'approve');
  }

  deny(request: AdultRequest): void {
    this.runAction(request, 'deny');
  }

  private runAction(request: AdultRequest, action: 'approve' | 'deny'): void {
    if (this.isActionRunning()) return;

    this.actionUserId.set(request.id);
    this.isActionRunning.set(true);
    this.actionError.set('');

    const call$ = action === 'approve'
      ? this.adminService.approve(request.id)
      : this.adminService.deny(request.id);

    call$.subscribe({
      next: (updated) => {
        this.requests.update((list) =>
          list.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
        );
        this.actionUserId.set('');
        this.isActionRunning.set(false);
      },
      error: () => {
        this.actionUserId.set('');
        this.isActionRunning.set(false);
        this.actionError.set(`Erro ao ${action === 'approve' ? 'validar' : 'negar'} a solicitação.`);
      },
    });
  }

  logout(): void {
    this.adminService.startLogout();
  }

  formatDate(date?: string | null): string {
    if (!date) return '—';
    const [year, month, day] = date.split('-');
    if (!year || !month || !day) return date;
    return `${day}/${month}/${year}`;
  }

  statusLabel(status: AdultRequestStatus): string {
    const labels: Record<AdultRequestStatus, string> = {
      none: 'Sem solicitação',
      pending: 'Em análise',
      approved: 'Aprovado',
      denied: 'Negado',
    };
    return labels[status];
  }
}