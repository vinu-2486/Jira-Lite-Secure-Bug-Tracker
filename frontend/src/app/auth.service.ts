import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { catchError, Observable, of, switchMap, tap, throwError } from 'rxjs';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupDetails {
  email: string;
  displayName: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<AuthUser | null>(null);

  constructor(private readonly http: HttpClient) {}

  refreshSession(): Observable<AuthUser | null> {
    return this.http.get<AuthUser>('/api/auth/me').pipe(
      tap((user) => this.currentUser.set(user)),
      catchError((error) => {
        if (error.status === 401) {
          this.currentUser.set(null);
          return of(null);
        }
        return throwError(() => error);
      }),
    );
  }

  login(credentials: LoginCredentials): Observable<AuthUser> {
    return this.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<AuthUser>('/api/auth/login', credentials)),
      switchMap(() => this.refreshSession()),
      switchMap((user) =>
        user ? of(user) : throwError(() => new Error('The session could not be restored.')),
      ),
    );
  }

  register(details: SignupDetails): Observable<AuthUser> {
    return this.bootstrapCsrf().pipe(
      switchMap(() => this.http.post<AuthUser>('/api/auth/signup', details)),
    );
  }

  private bootstrapCsrf(): Observable<AuthUser | null> {
    return this.refreshSession();
  }
}
