import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import {
  Bug,
  BugDetail,
  BugPriority,
  BugSeverity,
  BugStatus,
  Comment as BugComment,
  HistoryEvent,
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
  @ViewChild('referenceCloseButton') referenceCloseButton?: ElementRef<HTMLButtonElement>;
  mode: 'demo' | 'real' = 'demo';
  projects: Project[] = [];
  bugs: Bug[] = [];
  selectedProject: Project | null = null;
  selectedBug: Bug | null = null;
  selectedDetail: BugDetail | null = null;
  comments: BugComment[] = [];
  history: HistoryEvent[] = [];
  commentsLoading = false;
  commentsError = '';
  historyLoading = false;
  historyError = '';
  detailLoading = false;
  detailError = '';
  commentBody = '';
  commentSubmitting = false;
  commentSubmitError = '';
  actionSubmitting = false;
  editTitle = '';
  editDescription = '';
  editPriority: BugPriority = 'MEDIUM';
  editSeverity: BugSeverity = 'MAJOR';
  editSubmitting = false;
  editError = '';
  assigneeUserId = '';
  assignSubmitting = false;
  referenceBug: Bug | null = null;
  loadingProjects = false;
  loadingBugs = false;
  projectsError = '';
  bugsError = '';
  filterText = '';
  filterStatus: BugStatus | '' = '';
  filterPriority: BugPriority | '' = '';
  showCreateForm = false;
  creating = false;
  createError = '';
  private issueSelectionId = 0;
  private commentsLoadSubscription?: Subscription;
  private historyLoadSubscription?: Subscription;
  readonly priorities: BugPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly severities: BugSeverity[] = ['TRIVIAL', 'MINOR', 'MAJOR', 'CRITICAL'];
  readonly statuses: BugStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'];
  readonly demoBugs: Bug[] = [
    {
      id: 101,
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
      id: 102,
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
    this.resetIssueDetailState();
    this.mode = 'demo';
    this.selectedProject = null;
    this.selectedBug = this.demoBugs[0];
    this.bugsError = '';
    this.resetFilters();
  }

  switchToReal(): void {
    this.resetIssueDetailState();
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
    this.resetIssueDetailState();
    this.mode = 'real';
    this.selectedProject = project;
    this.selectedBug = null;
    this.filterText = '';
    this.filterStatus = '';
    this.filterPriority = '';
    this.loadBugs(project.id);
  }

  selectBug(bug: Bug): void {
    this.resetIssueDetailState();
    this.selectedBug = bug;
    this.selectedDetail = null;
    this.detailError = '';
    if (this.mode === 'real' && this.selectedProject) {
      const selectionId = this.issueSelectionId;
      const projectId = this.selectedProject.id;
      this.detailLoading = true;
      this.loadComments(selectionId, projectId, bug.id);
      this.loadHistory(selectionId, projectId, bug.id);
      this.workspace.getBug(projectId, bug.id).subscribe({
        next: (detail) => {
          if (selectionId !== this.issueSelectionId) return;
          this.selectedDetail = detail;
          this.editTitle = detail.bug.title;
          this.editDescription = detail.bug.description;
          this.editPriority = detail.bug.priority;
          this.editSeverity = detail.bug.severity;
          this.editError = '';
          this.detailLoading = false;
        },
        error: (error) => {
          if (selectionId !== this.issueSelectionId) return;
          this.detailLoading = false;
          this.handleRequestError(error, 'Issue details could not be loaded.');
        },
      });
    }
  }

  addComment(): void {
    const project = this.selectedProject;
    const bug = this.selectedBug;
    const draft = this.commentBody;
    const body = draft.trim();
    const selectionId = this.issueSelectionId;
    if (!project || !bug || !body || this.commentSubmitting) return;

    this.commentSubmitting = true;
    this.commentSubmitError = '';
    this.workspace.addComment(project.id, bug.id, body).subscribe({
      next: () => {
        if (selectionId !== this.issueSelectionId) return;
        this.commentSubmitting = false;
        if (this.commentBody === draft) this.commentBody = '';
        this.loadComments(selectionId, project.id, bug.id, true);
        this.loadHistory(selectionId, project.id, bug.id, true);
      },
      error: (error) => {
        if (selectionId !== this.issueSelectionId) return;
        this.commentSubmitting = false;
        this.commentSubmitError = 'Comment could not be added.';
        this.redirectOnUnauthorized(error);
      },
    });
  }

  retryComments(): void {
    if (!this.selectedProject || !this.selectedBug) return;
    this.loadComments(this.issueSelectionId, this.selectedProject.id, this.selectedBug.id);
  }

  retryHistory(): void {
    if (!this.selectedProject || !this.selectedBug) return;
    this.loadHistory(this.issueSelectionId, this.selectedProject.id, this.selectedBug.id);
  }

  formatHistoryEventType(eventType: string): string {
    const labels: Record<string, string> = {
      FIELD_EDIT: 'Issue fields edited',
      STATUS_CHANGE: 'Status changed',
      ASSIGNMENT: 'Assignee changed',
      COMMENT: 'Comment added',
      COMMIT: 'Commit linked',
      PULL_REQUEST: 'Pull request linked',
      CREATED: 'Issue created',
    };
    return labels[eventType] ?? eventType.replaceAll('_', ' ').toLowerCase();
  }

  historyActorLabel(event: HistoryEvent): string {
    if (event.externalAuthor) return `GitHub author: ${event.externalAuthor}`;
    if (event.actorId !== null) return `User ID ${event.actorId}`;
    return 'External activity (author not provided)';
  }

  historyEventSummary(event: HistoryEvent): string {
    if (event.eventType === 'COMMENT') {
      return event.reason ?? 'Comment text was not provided.';
    }
    if (event.eventType === 'STATUS_CHANGE') {
      const change = `${this.formatHistoryValue(event.oldValue)} → ${this.formatHistoryValue(event.newValue)}`;
      return event.reason ? `${change}\nReason: ${event.reason}` : change;
    }
    if (event.eventType === 'ASSIGNMENT') {
      return `${this.formatAssignee(event.oldValue)} → ${this.formatAssignee(event.newValue)}`;
    }
    return event.newValue ?? event.reason ?? 'No event details were provided.';
  }

  safeExternalUrl(value: string | null): string | null {
    if (!value) return null;
    const match = value.match(/https?:\/\/[^\s<>"']+/i);
    if (!match) return null;
    const candidate = match[0].replace(/[),.;!?]+$/, '');
    try {
      const url = new URL(candidate);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
      return null;
    }
  }

  isExternalHistoryEvent(eventType: string): boolean {
    return eventType === 'COMMIT' || eventType === 'PULL_REQUEST';
  }

  saveEdit(): void {
    if (!this.selectedProject || !this.selectedDetail || this.editSubmitting) return;
    if (this.editTitle.trim().length < 5 || !this.editDescription.trim()) {
      this.editError = 'Title and description are required.';
      return;
    }

    this.editSubmitting = true;
    this.editError = '';
    this.workspace
      .updateBug(this.selectedProject.id, this.selectedDetail.bug.id, {
        title: this.editTitle,
        description: this.editDescription,
        priority: this.editPriority,
        severity: this.editSeverity,
        version: this.selectedDetail.bug.version,
      })
      .subscribe({
        next: (bug) => {
          this.replaceBug(bug);
          this.selectedBug = bug;
          this.selectedDetail = { ...this.selectedDetail!, bug };
          this.editSubmitting = false;
        },
        error: (error) => {
          this.editSubmitting = false;
          this.handleRequestError(error, 'Issue could not be updated.');
        },
      });
  }

  assignIssue(): void {
    if (!this.selectedProject || !this.selectedDetail || this.assignSubmitting) return;
    const userId = Number(this.assigneeUserId);
    if (!Number.isInteger(userId) || userId < 1) return;
    this.assignSubmitting = true;
    this.workspace
      .assignBug(
        this.selectedProject.id,
        this.selectedDetail.bug.id,
        userId,
        this.selectedDetail.bug.version,
      )
      .subscribe({
        next: (bug) => {
          this.replaceBug(bug);
          this.selectedBug = bug;
          this.selectedDetail = { ...this.selectedDetail!, bug };
          this.assigneeUserId = '';
          this.assignSubmitting = false;
        },
        error: (error) => {
          this.assignSubmitting = false;
          this.handleRequestError(error, 'Issue could not be assigned.');
        },
      });
  }

  transition(status: BugStatus): void {
    if (!this.selectedProject || !this.selectedDetail || this.actionSubmitting) return;
    const selectionId = this.issueSelectionId;
    const projectId = this.selectedProject.id;
    const reason =
      status === 'CLOSED' || status === 'REOPENED' ? window.prompt('Enter a reason') || '' : '';
    if ((status === 'CLOSED' || status === 'REOPENED') && !reason.trim()) return;
    this.actionSubmitting = true;
    this.workspace
      .transitionBug(
        this.selectedProject.id,
        this.selectedDetail.bug.id,
        status,
        this.selectedDetail.bug.version,
        reason,
      )
      .subscribe({
        next: (bug) => {
          if (selectionId !== this.issueSelectionId) return;
          this.replaceBug(bug);
          this.selectedBug = bug;
          this.selectedDetail = { bug, allowedActions: this.selectedDetail!.allowedActions };
          this.actionSubmitting = false;
          this.loadHistory(selectionId, projectId, bug.id, true);
        },
        error: (error) => {
          if (selectionId !== this.issueSelectionId) return;
          this.actionSubmitting = false;
          this.handleRequestError(error, 'Issue status could not be changed.');
        },
      });
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
        this.referenceBug = bug;
        setTimeout(() => this.referenceCloseButton?.nativeElement.focus());
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

  closeReference(): void {
    this.referenceBug = null;
  }

  retryProjects(): void {
    this.loadProjects();
  }

  onReferenceKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeReference();
    }
  }

  copyReference(): void {
    if (this.referenceBug) void navigator.clipboard.writeText(this.referenceBug.key);
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
    if (this.loadingProjects) return;
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
    if (this.redirectOnUnauthorized(error)) return;
    if (fallback === 'Issues could not be loaded.') this.bugsError = fallback;
    else if (fallback === 'Issue details could not be loaded.') this.detailError = fallback;
    else if (fallback === 'Issue could not be updated.') this.editError = fallback;
    else if (fallback !== 'Projects could not be loaded.') this.detailError = fallback;
    else if (fallback === 'Projects could not be loaded.') this.projectsError = fallback;
    else this.createError = fallback;
  }

  private replaceBug(bug: Bug): void {
    this.bugs = this.bugs.map((existing) => (existing.id === bug.id ? bug : existing));
  }

  private resetIssueDetailState(): void {
    this.issueSelectionId++;
    this.commentsLoadSubscription?.unsubscribe();
    this.historyLoadSubscription?.unsubscribe();
    this.commentsLoadSubscription = undefined;
    this.historyLoadSubscription = undefined;
    this.comments = [];
    this.history = [];
    this.commentsLoading = false;
    this.commentsError = '';
    this.historyLoading = false;
    this.historyError = '';
    this.commentBody = '';
    this.commentSubmitting = false;
    this.commentSubmitError = '';
    this.detailLoading = false;
    this.detailError = '';
    this.actionSubmitting = false;
  }

  private loadComments(selectionId: number, projectId: number, bugId: number, force = false): void {
    if (selectionId !== this.issueSelectionId) return;
    if (this.commentsLoading && !force) return;
    if (force) this.commentsLoadSubscription?.unsubscribe();

    this.commentsLoading = true;
    this.commentsError = '';
    this.commentsLoadSubscription = this.workspace.getComments(projectId, bugId).subscribe({
      next: (comments) => {
        if (selectionId !== this.issueSelectionId) return;
        this.comments = comments;
        this.commentsLoading = false;
      },
      error: (error) => {
        if (selectionId !== this.issueSelectionId) return;
        this.commentsLoading = false;
        this.commentsError = 'Comments could not be loaded.';
        this.redirectOnUnauthorized(error);
      },
    });
  }

  private loadHistory(selectionId: number, projectId: number, bugId: number, force = false): void {
    if (selectionId !== this.issueSelectionId) return;
    if (this.historyLoading && !force) return;
    if (force) this.historyLoadSubscription?.unsubscribe();

    this.historyLoading = true;
    this.historyError = '';
    this.historyLoadSubscription = this.workspace.getHistory(projectId, bugId).subscribe({
      next: (history) => {
        if (selectionId !== this.issueSelectionId) return;
        this.history = history;
        this.historyLoading = false;
      },
      error: (error) => {
        if (selectionId !== this.issueSelectionId) return;
        this.historyLoading = false;
        this.historyError = 'Activity could not be loaded.';
        this.redirectOnUnauthorized(error);
      },
    });
  }

  private formatHistoryValue(value: string | null): string {
    return value ? value.replaceAll('_', ' ').toLowerCase() : 'Unknown status';
  }

  private formatAssignee(value: string | null): string {
    return value ? `User ID ${value}` : 'Unassigned';
  }

  private redirectOnUnauthorized(error: { status?: number }): boolean {
    if (error.status !== 401) return false;
    this.auth.currentUser.set(null);
    this.router.navigate(['/login']);
    return true;
  }
}
