import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-menu.html',
  styleUrl: './profile-menu.css',
})
export class ProfileMenu {
  username = input<string>('');
  userInitial = input<string>('U');
  isOpen = input<boolean>(false);
  logout = output<void>();
  close = output<void>();

  private readonly router = inject(Router);

  goToFavourites(): void {
    this.close.emit();
    this.router.navigate(['/favourites']);
  }
}
