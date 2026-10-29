import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import {
  Bug,
  BugPriority,
  BugSeverity,
  BugStatus,
  CreateBugRequest,
  Project,
  WorkspaceService,
} from './workspace.service';

@Component({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css',
})
export class WorkspaceComponent implements OnInit {
  mode: 'demo' | 'real' = 'demo';
  projects: Project[] = [];
  bugs: Bug[] = [];
  selectedProject: Project | null = null;
  selectedBug: Bug | null = null;
  loadingProjects = true;
  loadingBugs = false;
  projectsError = '';
  bugsError = '';
  filterText = '';
  filterStatus: BugStatus | '' = '';
  filterPriority: BugPriority | '' = '';
  showCreateForm = false;
  creating = false;
  createError = '';
  readonly priorities: BugPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly severities: BugSeverity[] = ['TRIVIAL', 'MINOR', 'MAJOR', 'CRITICAL'];
  readonly statuses: BugStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'];
  readonly demoBugs: Bug[] = [
    {
      key: 'DEMO-101',
      projectId: 0,
      title: 'Login button overlaps password field on mobile',
      description: 'Illustrative demo record. This is not an actual defect verified in JILA.',
      priority: 'HIGH',
      severity: 'MAJOR',
      status: 'OPEN',
      reporterId: 0,
      assigneeId: null,
      resolution: null,
      version: 0,
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-01-15T10:00:00Z',
    },
    {
      key: 'DEMO-102',
      projectId: 0,
      title: 'Issue title is cut off on narrow screens',
      description: 'Illustrative demo record. This is not an actual defect verified in JILA.',
      priority: 'MEDIUM',
      severity: 'MINOR',
      status: 'IN_PROGRESS',
      reporterId: 0,
      assigneeId: null,
      resolution: null,
      version: 0,
      createdAt: '2026-01-14T10:00:00Z',
      updatedAt: '2026-01-14T10:00:00Z',
    },
  ];
  readonly createForm: FormGroup<{
    title: FormControl<string>;
    description: FormControl<string>;
    priority: FormControl<BugPriority>;
    severity: FormControl<BugSeverity>;
  }>;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly workspace: WorkspaceService,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {
    this.createForm = this.formBuilder.nonNullable.group({
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
      description: ['', [Validators.required, Validators.maxLength(5000)]],
      priority: ['MEDIUM' as BugPriority, Validators.required],
      severity: ['MAJOR' as BugSeverity, Validators.required],
    });
  }

  ngOnInit(): void {
    this.selectedBug = this.demoBugs[0];
    this.loadProjects();
  }

  get displayedBugs(): Bug[] {
    return this.mode === 'demo' ? this.demoBugs : this.bugs;
  }

  get filteredBugs(): Bug[] {
    const text = this.filterText.trim().toLowerCase();
    return this.displayedBugs.filter((bug) => {
      const matchesText =
        !text ||
        bug.key.toLowerCase().includes(text) ||
        bug.title.toLowerCase().includes(text) ||
        bug.description.toLowerCase().includes(text);
      return (
        matchesText &&
        (!this.filterStatus || bug.status === this.filterStatus) &&
        (!this.filterPriority || bug.priority === this.filterPriority)
      );
    });
  }

  get totalCount(): number {
    return this.filteredBugs.length;
  }

  countByStatus(status: BugStatus): number {
    return this.filteredBugs.filter((bug) => bug.status === status).length;
  }

  countByPriority(priority: BugPriority): number {
    return this.filteredBugs.filter((bug) => bug.priority === priority).length;
  }

  percentByStatus(status: BugStatus): number {
    return this.totalCount ? Math.round((this.countByStatus(status) / this.totalCount) * 100) : 0;
  }

  switchToDemo(): void {
    this.mode = 'demo';
    this.selectedProject = null;
    this.selectedBug = this.demoBugs[0];
    this.bugsError = '';
    this.resetFilters();
  }

  switchToReal(): void {
    this.mode = 'real';
    this.selectedBug = null;
    this.resetFilters();
    if (this.selectedProject) {
      this.loadBugs(this.selectedProject.id);
    } else if (this.projects.length) {
      this.selectProject(this.projects[0]);
    }
  }

  selectProject(project: Project): void {
    this.mode = 'real';
    this.selectedProject = project;
    this.selectedBug = null;
    this.filterText = '';
    this.filterStatus = '';
    this.filterPriority = '';
    this.loadBugs(project.id);
  }

  selectBug(bug: Bug): void {
    this.selectedBug = bug;
  }

  submitBug(): void {
    if (this.mode === 'demo') return;
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid || !this.selectedProject || this.creating) return;
    this.creating = true;
    this.createError = '';
    const request: CreateBugRequest = this.createForm.getRawValue();
    this.workspace.createBug(this.selectedProject.id, request).subscribe({
      next: (bug) => {
        this.bugs = [bug, ...this.bugs.filter((existing) => existing.key !== bug.key)];
        this.selectedBug = bug;
        this.createForm.reset({
          title: '',
          description: '',
          priority: 'MEDIUM',
          severity: 'MAJOR',
        });
        this.showCreateForm = false;
        this.creating = false;
      },
      error: (error) => {
        this.creating = false;
        this.handleRequestError(error, 'We could not create this issue.');
      },
    });
  }

  formatStatus(status: BugStatus): string {
    return status
      .replace('_', ' ')
      .toLowerCase()
      .replace(/^\w/, (letter) => letter.toUpperCase());
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

  private resetFilters(): void {
    this.filterText = '';
    this.filterStatus = '';
    this.filterPriority = '';
  }

  private loadProjects(): void {
    this.loadingProjects = true;
    this.projectsError = '';
    this.workspace.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loadingProjects = false;
      },
      error: (error) => {
        this.loadingProjects = false;
        this.handleRequestError(error, 'Projects could not be loaded.');
      },
    });
  }

  private loadBugs(projectId: number): void {
    this.loadingBugs = true;
    this.bugsError = '';
    this.workspace.getBugs(projectId).subscribe({
      next: (bugs) => {
        this.bugs = bugs;
        this.loadingBugs = false;
      },
      error: (error) => {
        this.loadingBugs = false;
        this.handleRequestError(error, 'Issues could not be loaded.');
      },
    });
  }

  private handleRequestError(error: { status?: number }, fallback: string): void {
    if (error.status === 401) {
      this.auth.currentUser.set(null);
      this.router.navigate(['/login']);
      return;
    }
    if (fallback === 'Issues could not be loaded.') this.bugsError = fallback;
    else if (fallback === 'Projects could not be loaded.') this.projectsError = fallback;
    else this.createError = fallback;
  }
}
