import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileMenu } from '../profile-menu/profile-menu';
import { CategoryChips } from '../category-chips/category-chips';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfileMenu, CategoryChips],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  activeTab = input<'todos' | 'categorias'>('todos');
  selectedCategory = input<string>('');
  searchQuery = input<string>('');
  username = input<string>('');
  userInitial = input<string>('U');
  showProfileMenu = input<boolean>(false);
  categories = input<string[]>([]);

  tabChange = output<'todos' | 'categorias'>();
  search = output<void>();
  searchQueryChange = output<string>();
  toggleProfile = output<void>();
  closeProfile = output<void>();
  logout = output<void>();
  categorySelect = output<string>();

  localQuery = '';

  syncQuery = effect(() => {
    this.localQuery = this.searchQuery();
  });

  onSearchInput(): void {
    this.searchQueryChange.emit(this.localQuery);
  }

  onSearch(): void {
    this.searchQueryChange.emit(this.localQuery);
    this.search.emit();
  }

  onClear(): void {
    this.localQuery = '';
    this.searchQueryChange.emit('');
    this.search.emit();
  }
}
