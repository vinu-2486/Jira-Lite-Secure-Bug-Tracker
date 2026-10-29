import { Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { LoginComponent } from './login.component';
import { RegisterComponent } from './register.component';
import { WorkspaceComponent } from './workspace.component';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'welcome', redirectTo: 'workspace', pathMatch: 'full' },
  { path: 'workspace', component: WorkspaceComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
