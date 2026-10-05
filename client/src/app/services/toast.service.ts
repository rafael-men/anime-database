import { Injectable, signal } from '@angular/core';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<ToastMessage[]>([]);
  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(message: string, type: ToastType = 'info', duration = 5000): void {
    const text = message.trim();
    if (!text) {
      return;
    }

    const id = this.nextId++;
    this.messages.update((messages) => [
      ...messages.slice(-3),
      { id, type, message: text },
    ]);

    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => this.dismiss(id), duration);
      this.timers.set(id, timer);
    }
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.messages.update((messages) => messages.filter((toast) => toast.id !== id));
  }
}
