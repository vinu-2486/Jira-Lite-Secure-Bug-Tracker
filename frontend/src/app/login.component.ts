import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
export class LoginComponent {
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

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.errorMessage = '';
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/welcome']),
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
