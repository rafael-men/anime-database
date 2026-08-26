import { Routes } from '@angular/router';
import { FormCard } from './components/auth-page/login/form-card/form-card';
import { RegisterCard } from './components/auth-page/register/register-card/register-card';
import { Home } from './components/home/home';
import { FavouritesPage } from './components/favourites-page/favourites-page';
import { AnimeDetails } from './components/anime-details/anime-details';
import { CharacterDetails } from './components/character-details/character-details';
import { Profile } from './components/profile/profile';
import { CharactersPage } from './components/characters-page/characters-page';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: FormCard },
  { path: 'register', component: RegisterCard },
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'favourites', component: FavouritesPage, canActivate: [authGuard] },
  { path: 'characters', component: CharactersPage, canActivate: [authGuard] },
  { path: 'character/:id', component: CharacterDetails, canActivate: [authGuard] },
  { path: 'anime/:id', component: AnimeDetails, canActivate: [authGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
