import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './auth-page.css',
})
export class LoginComponent implements OnInit {
  readonly form: FormGroup<{
    email: FormControl<string>;
    password: FormControl<string>;
  }>;
  showPassword = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    route: ActivatedRoute,
  ) {
    this.form = formBuilder.nonNullable.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      password: ['', [Validators.required, Validators.maxLength(72)]],
    });
    this.successMessage = route.snapshot.queryParamMap.get('message') ?? '';
  }

  ngOnInit(): void {
    if (this.auth.currentUser()) {
      void this.router.navigate(['/workspace']);
      return;
    }
    const config = this.auth.authConfig();
    if (config.googleEnabled && config.googleClientId) {
      this.initGoogleGsi(config.googleClientId);
    }
  }

  get googleEnabled(): boolean {
    return this.auth.authConfig().googleEnabled;
  }

  continueWithGoogle(): void {
    if (!this.googleEnabled || this.submitting) return;
    const w = window as unknown as {
      google?: {
        accounts?: {
          id?: { prompt: () => void };
        };
      };
    };
    if (w.google?.accounts?.id) {
      w.google.accounts.id.prompt();
    } else {
      const dummyToken = window.prompt('Enter Google ID token:');
      if (!dummyToken?.trim()) return;
      this.submitting = true;
      this.errorMessage = '';
      this.auth.loginWithGoogle(dummyToken.trim()).subscribe({
        next: () => this.router.navigate(['/workspace']),
        error: (err: { status?: number }) => {
          this.submitting = false;
          this.errorMessage =
            err.status === 401
              ? 'Invalid Google credential.'
              : 'Google sign-in could not be completed.';
        },
      });
    }
  }

  private initGoogleGsi(clientId: string): void {
    const w = window as unknown as {
      google?: {
        accounts?: {
          id?: {
            initialize: (cfg: unknown) => void;
            prompt: () => void;
          };
        };
      };
    };
    if (w.google?.accounts?.id) {
      try {
        w.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response?.credential) {
              this.submitting = true;
              this.errorMessage = '';
              this.auth.loginWithGoogle(response.credential).subscribe({
                next: () => this.router.navigate(['/workspace']),
                error: (err: { status?: number }) => {
                  this.submitting = false;
                  this.errorMessage =
                    err.status === 401
                      ? 'Invalid Google credential.'
                      : 'Google sign-in could not be completed.';
                },
              });
            }
          },
        });
      } catch {
        // GSI initialization error ignored in test/unsupported environments
      }
    }
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.errorMessage = '';
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/workspace']),
      error: (error) => {
        this.submitting = false;
        this.errorMessage =
          error.status === 401
            ? 'Invalid email or password'
            : 'We could not sign you in. Please try again.';
      },
    });
  }
}
