import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
export class RegisterComponent {
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
