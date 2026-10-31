import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

function matchingPasswords(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './auth-page.css',
})
export class RegisterComponent implements OnInit {
  readonly form: FormGroup<{
    displayName: FormControl<string>;
    email: FormControl<string>;
    password: FormControl<string>;
    confirmPassword: FormControl<string>;
  }>;
  showPassword = false;
  showConfirmPassword = false;
  submitting = false;
  errorMessage = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {
    this.form = this.formBuilder.nonNullable.group(
      {
        displayName: ['', [Validators.required, Validators.maxLength(100)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
        password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: matchingPasswords },
    );
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
        // Ignored
      }
    }
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.errorMessage = '';
    const { email, displayName, password } = this.form.getRawValue();
    this.auth.register({ email, displayName, password }).subscribe({
      next: () =>
        this.router.navigate(['/login'], {
          queryParams: { message: 'Account created. Log in to continue.' },
        }),
      error: (error) => {
        this.submitting = false;
        this.errorMessage =
          error.status === 409
            ? 'Email is already registered'
            : error.status === 400
              ? 'Please check the information you entered.'
              : 'We could not create your account. Please try again.';
      },
    });
  }
}
