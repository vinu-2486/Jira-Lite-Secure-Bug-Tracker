import { Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { LoginComponent } from './login.component';
import { RegisterComponent } from './register.component';
import { WorkspaceComponent } from './workspace.component';
import { authGuard, guestGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent, canActivate: [guestGuard] },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'welcome', redirectTo: 'workspace', pathMatch: 'full' },
  { path: 'workspace', component: WorkspaceComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
