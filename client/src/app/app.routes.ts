import { Routes } from '@angular/router';
import { FormCard } from './components/auth-page/login/form-card/form-card';
import { RegisterCard } from './components/auth-page/register/register-card/register-card';
import { Home } from './components/home/home';
import { FavouritesPage } from './components/favourites-page/favourites-page';
import { AnimeDetails } from './components/anime-details/anime-details';
import { CharacterDetails } from './components/character-details/character-details';
import { Profile } from './components/profile/profile';
import { CharactersPage } from './components/characters-page/characters-page';
import { GroupDetail } from './components/groups-component/group-detail/group-detail';
import { UserSettings } from './components/profile-menu/user-settings/user-settings';
import { ValidationPage } from './components/admin/validation-page/validation-page';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: FormCard },
  { path: 'register', component: RegisterCard },
  { path: 'control', component: ValidationPage },
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  { path: 'profile/:id', component: Profile, canActivate: [authGuard] },
  { path: 'settings', component: UserSettings, canActivate: [authGuard] },
  { path: 'favourites', component: FavouritesPage, canActivate: [authGuard] },
  { path: 'groups/:id', component: GroupDetail, canActivate: [authGuard] },
  { path: 'characters', component: CharactersPage, canActivate: [authGuard] },
  { path: 'character/:id', component: CharacterDetails, canActivate: [authGuard] },
  { path: 'anime/:id', component: AnimeDetails, canActivate: [authGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
