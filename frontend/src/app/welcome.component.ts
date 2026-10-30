import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  imports: [CommonModule, RouterLink],
  template: `<main class="welcome-page">
    <a class="brand" routerLink="/"><span class="brand-mark">J</span><span>JILA</span></a>
    <section>
      <p class="auth-eyebrow">Signed in</p>
      <h1>Welcome, {{ auth.currentUser()?.displayName }}.</h1>
      <p>Your session is active. Your workspace is ready.</p>
      <a class="button button-dark" routerLink="/workspace">Open workspace</a>
    </section>
  </main>`,
  styleUrl: './auth-page.css',
})
export class WelcomeComponent implements OnInit {
  constructor(
    readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.auth.refreshSession().subscribe({
      next: (user) => {
        if (!user) this.router.navigate(['/login']);
      },
      error: () => this.router.navigate(['/login']),
    });
  }
}
