import { Routes } from '@angular/router';
import { FormCard } from './components/auth-page/login/form-card/form-card';
import { RegisterCard } from './components/auth-page/register/register-card/register-card';
import { Home } from './components/home/home';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: FormCard },
  { path: 'register', component: RegisterCard },
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
