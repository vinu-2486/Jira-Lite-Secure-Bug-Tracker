import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
  BugListQuery,
  BugSortField,
  BugSeverity,
  BugStatus,
  Comment as BugComment,
  HistoryEvent,
  AddProjectMemberRequest,
  CreateProjectRequest,
  CreateBugRequest,
  Project,
  ProjectMember,
  ProjectRole,
  SortDirection,
  AdminUser,
  BindGitHubRepositoryRequest,
  CreateAdminUserRequest,
  GlobalRole,
  GitHubRepositoryBinding,
  WorkspaceService,
} from './workspace.service';

@Component({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.css',
})
export class WorkspaceComponent implements OnInit {
  @ViewChild('referenceCloseButton') referenceCloseButton?: ElementRef<HTMLButtonElement>;
  mode: 'demo' | 'real' = 'real';
  viewMode: 'list' | 'board' = 'list';
  draggedBug: Bug | null = null;
  boardMessage = '';
  private searchTimeout?: ReturnType<typeof setTimeout>;

  readonly boardColumns: { status: BugStatus; label: string }[] = [
    { status: 'OPEN', label: 'Open' },
    { status: 'IN_PROGRESS', label: 'In progress' },
    { status: 'RESOLVED', label: 'Resolved' },
    { status: 'CLOSED', label: 'Closed' },
    { status: 'REOPENED', label: 'Reopened' },
  ];
  projects: Project[] = [];
  bugs: Bug[] = [];
  selectedProject: Project | null = null;
  selectedBug: Bug | null = null;
  selectedDetail: BugDetail | null = null;
  comments: BugComment[] = [];
  history: HistoryEvent[] = [];
  createDueDate = '';
  detailDueDate = '';
  stagedAttachments: File[] = [];
  isDraggingOver = false;
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
  actionError = '';
  actionConflict = false;
  editTitle = '';
  editDescription = '';
  editPriority: BugPriority = 'MEDIUM';
  editSeverity: BugSeverity = 'MAJOR';
  editSubmitting = false;
  editError = '';
  editConflict = '';
  latestVersionNotice = '';
  assigneeUserId: number | null = null;
  assignSubmitting = false;
  assignError = '';
  assignConflict = false;
  referenceBug: Bug | null = null;
  loadingProjects = false;
  loadingBugs = false;
  projectsError = '';
  bugsError = '';
  filterText = '';
  filterStatus: BugStatus | '' = '';
  filterPriority: BugPriority | '' = '';
  filterSeverity: BugSeverity | '' = '';
  pageIndex = 0;
  pageSize = 25;
  hasNextPage = false;
  noMoreIssues = false;
  sortField: BugSortField = 'createdAt';
  sortDirection: SortDirection = 'desc';
  private failedBugPage: number | null = null;
  activeNav: 'overview' | 'issues' | 'admin' = 'issues';
  mobileSidebarOpen = false;
  showCreateUserModal = false;
  showCreateForm = false;
  creating = false;
  createError = '';
  showCreateProjectForm = false;
  creatingProject = false;
  createProjectError = '';
  addingMember = false;
  addMemberError = '';
  addMemberSuccess = '';
  projectMembers: ProjectMember[] = [];
  membersLoading = false;
  membersLoaded = false;
  membersError = '';
  adminUsers: AdminUser[] = [];
  adminUsersLoading = false;
  adminUsersLoaded = false;
  adminUsersError = '';
  creatingAdminUser = false;
  createAdminUserError = '';
  createAdminUserSuccess = '';
  adminUserEdits: Record<number, { role: GlobalRole | '' }> = {};
  adminUserUpdates: Record<number, { loading: boolean; error: string }> = {};
  bindingGitHubRepository = false;
  bindGitHubError = '';
  githubBindingResult: GitHubRepositoryBinding | null = null;
  private issueSelectionId = 0;
  private projectSelectionId = 0;
  private refreshProjectsAfterLoad = false;
  private commentsLoadSubscription?: Subscription;
  private historyLoadSubscription?: Subscription;
  private membersLoadSubscription?: Subscription;
  private adminUsersLoadSubscription?: Subscription;
  private bugsLoadSubscription?: Subscription;
  private bugsRequestId = 0;
  readonly pageSizes = [25, 50, 100];
  readonly sortFields: BugSortField[] = ['createdAt', 'updatedAt', 'title', 'status', 'priority'];
  readonly projectRoles: ProjectRole[] = ['PROJECT_LEAD', 'DEVELOPER', 'REPORTER'];
  readonly globalRoles: GlobalRole[] = ['USER', 'APP_ADMIN'];
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
  readonly createProjectForm: FormGroup<{
    key: FormControl<string>;
    name: FormControl<string>;
    description: FormControl<string>;
    leadUserId: FormControl<number | null>;
  }>;
  readonly addMemberForm: FormGroup<{
    userId: FormControl<number | null>;
    role: FormControl<ProjectRole>;
  }>;
  readonly createAdminUserForm: FormGroup<{
    email: FormControl<string>;
    displayName: FormControl<string>;
    password: FormControl<string>;
    role: FormControl<GlobalRole>;
  }>;
  readonly bindGitHubForm: FormGroup<{
    projectId: FormControl<number | null>;
    installationId: FormControl<number | null>;
    repositoryId: FormControl<number | null>;
    owner: FormControl<string>;
    repositoryName: FormControl<string>;
  }>;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly workspace: WorkspaceService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.createForm = this.formBuilder.nonNullable.group({
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
      description: ['', [Validators.required, Validators.maxLength(5000)]],
      priority: ['MEDIUM' as BugPriority, Validators.required],
      severity: ['MAJOR' as BugSeverity, Validators.required],
    });
    this.createProjectForm = this.formBuilder.group({
      key: this.formBuilder.nonNullable.control('', [
        Validators.required,
        Validators.maxLength(20),
      ]),
      name: this.formBuilder.nonNullable.control('', [
        Validators.required,
        Validators.maxLength(100),
      ]),
      description: this.formBuilder.nonNullable.control('', Validators.maxLength(500)),
      leadUserId: this.formBuilder.control<number | null>(null, [
        Validators.required,
        Validators.min(1),
        Validators.pattern(/^[1-9]\d*$/),
      ]),
    });
    this.addMemberForm = this.formBuilder.group({
      userId: this.formBuilder.control<number | null>(null, [
        Validators.required,
        Validators.min(1),
        Validators.pattern(/^[1-9]\d*$/),
      ]),
      role: this.formBuilder.nonNullable.control<ProjectRole>('DEVELOPER', Validators.required),
    });
    this.createAdminUserForm = this.formBuilder.nonNullable.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      displayName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(72)]],
      role: ['USER' as GlobalRole, Validators.required],
    });
    const positiveIdValidators = [
      Validators.required,
      Validators.min(1),
      Validators.pattern(/^[1-9]\d*$/),
    ];
    this.bindGitHubForm = this.formBuilder.group({
      projectId: this.formBuilder.control<number | null>(null, positiveIdValidators),
      installationId: this.formBuilder.control<number | null>(null, positiveIdValidators),
      repositoryId: this.formBuilder.control<number | null>(null, positiveIdValidators),
      owner: this.formBuilder.nonNullable.control('', [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(100),
      ]),
      repositoryName: this.formBuilder.nonNullable.control('', [
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(100),
      ]),
    });
  }

  markForCheck(): void {
    this.cdr.markForCheck();
  }

  setViewMode(mode: 'list' | 'board'): void {
    this.viewMode = mode;
    this.markForCheck();
  }

  ngOnInit(): void {
    this.selectedBug = null;
    this.loadProjects();
    if (this.isAppAdmin) this.loadAdminUsers();
  }

  get displayedBugs(): Bug[] {
    return this.bugs;
  }

  get isAppAdmin(): boolean {
    return this.auth.currentUser()?.role === 'APP_ADMIN';
  }

  get currentProjectRole(): ProjectRole | null {
    const userId = this.auth.currentUser()?.id;
    if (userId === undefined) return null;
    const role = this.projectMembers.find((member) => member.userId === userId)?.role;
    return role && this.projectRoles.includes(role) ? role : null;
  }

  get canManageProjectMembers(): boolean {
    return this.isAppAdmin || this.currentProjectRole === 'PROJECT_LEAD';
  }

  get availableMemberRoles(): ProjectRole[] {
    return this.isAppAdmin
      ? this.projectRoles
      : this.projectRoles.filter((role) => role !== 'PROJECT_LEAD');
  }

  get filteredBugs(): Bug[] {
    if (this.mode === 'real') return this.bugs;
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
        (!this.filterPriority || bug.priority === this.filterPriority) &&
        (!this.filterSeverity || bug.severity === this.filterSeverity)
      );
    });
  }

  get totalCount(): number {
    return this.filteredBugs.length;
  }

  get hasActiveIssueFilters(): boolean {
    return Boolean(
      this.filterText.trim() || this.filterStatus || this.filterPriority || this.filterSeverity,
    );
  }

  formatSortField(field: BugSortField): string {
    return field.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
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

  get shouldShowUserDisplayName(): boolean {
    const name = this.currentUser?.displayName?.trim().toLowerCase();
    return Boolean(
      name &&
      name !== 'administrator' &&
      name !== 'admin' &&
      name !== 'app_admin' &&
      name !== 'user',
    );
  }

  get resolvedThisWeekCount(): number {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.bugs.filter(
      (b) =>
        (b.status === 'RESOLVED' || b.status === 'CLOSED') &&
        new Date(b.updatedAt).getTime() >= oneWeekAgo,
    ).length;
  }

  get updatedThisWeekCount(): number {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.bugs.filter((b) => new Date(b.updatedAt).getTime() >= oneWeekAgo).length;
  }

  get createdThisWeekCount(): number {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.bugs.filter((b) => new Date(b.createdAt).getTime() >= oneWeekAgo).length;
  }

  get dueSoonCount(): number {
    return 0;
  }

  get openBugs(): Bug[] {
    return this.bugs.filter((b) => b.status !== 'RESOLVED' && b.status !== 'CLOSED');
  }

  get openBugsCount(): number {
    return this.openBugs.length;
  }

  get statusDonutSegments(): Array<{
    status: BugStatus;
    label: string;
    count: number;
    percent: number;
    color: string;
    strokeDasharray: string;
    strokeDashoffset: number;
  }> {
    const total = this.bugs.length;
    if (total === 0) return [];
    const circumference = 2 * Math.PI * 50;
    const statusMeta: Record<BugStatus, { label: string; color: string }> = {
      OPEN: { label: 'Open', color: '#38bdf8' },
      IN_PROGRESS: { label: 'In progress', color: '#6366f1' },
      RESOLVED: { label: 'Resolved', color: '#10b981' },
      CLOSED: { label: 'Closed', color: '#94a3b8' },
      REOPENED: { label: 'Reopened', color: '#f59e0b' },
    };

    let cumulative = 0;
    return this.statuses.map((status) => {
      const count = this.bugs.filter((b) => b.status === status).length;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      const dash = total > 0 ? (count / total) * circumference : 0;
      const offset = -cumulative;
      cumulative += dash;
      return {
        status,
        label: statusMeta[status]?.label ?? this.formatStatus(status),
        count,
        percent,
        color: statusMeta[status]?.color ?? '#6b7280',
        strokeDasharray: `${dash.toFixed(2)} ${circumference.toFixed(2)}`,
        strokeDashoffset: parseFloat(offset.toFixed(2)),
      };
    });
  }

  get priorityBreakdown(): Array<{
    priority: string;
    label: string;
    count: number;
    percent: number;
    color: string;
  }> {
    const total = this.bugs.length;
    const config = [
      { priority: 'CRITICAL', label: 'Highest', color: '#f43f5e' },
      { priority: 'HIGH', label: 'High', color: '#fb923c' },
      { priority: 'MEDIUM', label: 'Medium', color: '#38bdf8' },
      { priority: 'LOW', label: 'Low', color: '#10b981' },
      { priority: 'NONE', label: 'None', color: '#cbd5e1' },
    ];
    return config.map((c) => {
      const count =
        c.priority === 'NONE' ? 0 : this.bugs.filter((b) => b.priority === c.priority).length;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        priority: c.priority,
        label: c.label,
        count,
        percent,
        color: c.color,
      };
    });
  }

  get workTypesBreakdown(): Array<{
    type: string;
    label: string;
    count: number;
    percent: number;
    color: string;
  }> {
    const total = this.bugs.length;
    const config = [
      { type: 'CRITICAL', label: 'Critical Defect', color: '#f43f5e' },
      { type: 'MAJOR', label: 'Major Defect', color: '#6366f1' },
      { type: 'MINOR', label: 'Minor Defect', color: '#0ea5e9' },
      { type: 'TRIVIAL', label: 'Trivial Defect', color: '#10b981' },
    ];
    return config.map((c) => {
      const count = this.bugs.filter((b) => b.severity === c.type).length;
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        type: c.type,
        label: c.label,
        count,
        percent,
        color: c.color,
      };
    });
  }

  get teamWorkload(): Array<{
    assigneeName: string;
    count: number;
    percent: number;
    color: string;
  }> {
    const openTotal = this.openBugsCount;
    if (openTotal === 0) return [];
    const colors = ['#38bdf8', '#10b981', '#6366f1', '#14b8a6', '#0284c7', '#059669', '#94a3b8'];

    const countsByAssignee = new Map<number | null, number>();
    for (const bug of this.openBugs) {
      const key = bug.assigneeId;
      countsByAssignee.set(key, (countsByAssignee.get(key) ?? 0) + 1);
    }

    const memberMap = new Map<number, string>();
    for (const member of this.projectMembers) {
      memberMap.set(member.userId, member.displayName);
    }

    const result: Array<{ assigneeName: string; count: number; percent: number; color: string }> =
      [];
    let colorIdx = 0;

    countsByAssignee.forEach((count, assigneeId) => {
      let name = 'Unassigned';
      if (assigneeId !== null) {
        name = memberMap.get(assigneeId) ?? `User ID ${assigneeId}`;
      }
      const percent = Math.round((count / openTotal) * 100);
      result.push({
        assigneeName: name,
        count,
        percent,
        color: colors[colorIdx % colors.length],
      });
      colorIdx++;
    });

    return result.sort((a, b) => b.count - a.count);
  }

  get recentActivityList(): Array<{
    actor: string;
    action: string;
    targetKey: string;
    timeAgo: string;
  }> {
    if (this.history.length > 0) {
      return this.history.slice(0, 15).map((evt) => ({
        actor: this.historyActorLabel(evt),
        action: this.historyEventSummary(evt),
        targetKey: this.selectedBug ? this.selectedBug.key : '',
        timeAgo: this.timeAgo(evt.createdAt),
      }));
    }
    return [...this.bugs]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 15)
      .map((b) => ({
        actor: b.assigneeId
          ? `User ID ${b.assigneeId}`
          : b.reporterId
            ? `User ID ${b.reporterId}`
            : 'Project member',
        action: `Updated status to ${this.formatStatus(b.status)}: "${b.title}"`,
        targetKey: b.key,
        timeAgo: this.timeAgo(b.updatedAt),
      }));
  }

  timeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return 'recently';
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return 'recently';
    const diffMs = Date.now() - time;
    const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSecs < 60) return 'just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver = false;
    if (event.dataTransfer?.files?.length) {
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        this.stagedAttachments.push(event.dataTransfer.files[i]);
      }
    }
  }

  onFilesPicked(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target?.files?.length) {
      for (let i = 0; i < target.files.length; i++) {
        this.stagedAttachments.push(target.files[i]);
      }
      target.value = '';
    }
  }

  removeStagedFile(index: number): void {
    this.stagedAttachments.splice(index, 1);
  }

  switchToDemo(): void {
    this.switchToReal();
  }

  switchToReal(): void {
    this.resetIssueDetailState();
    this.mode = 'real';
    this.selectedBug = null;
    this.resetFilters();
    if (this.selectedProject) {
      this.pageIndex = 0;
      this.loadBugs(this.selectedProject.id, this.projectSelectionId, 0);
      this.loadProjectMembers(this.selectedProject.id, this.projectSelectionId);
    } else if (this.projects.length) {
      this.selectProject(this.projects[0]);
    }
  }

  selectProject(project: Project): void {
    this.resetIssueDetailState();
    this.mode = 'real';
    this.selectedProject = project;
    this.selectedBug = null;
    this.creating = false;
    this.bugs = [];
    this.resetFilters();
    this.pageIndex = 0;
    this.hasNextPage = false;
    this.noMoreIssues = false;
    this.failedBugPage = null;
    this.bugsLoadSubscription?.unsubscribe();
    this.resetProjectMemberState();
    const selectionId = ++this.projectSelectionId;
    this.loadBugs(project.id, selectionId, 0);
    this.loadProjectMembers(project.id, selectionId);
    this.markForCheck();
  }

  onSearchChange(text: string): void {
    this.filterText = text;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyIssueFilters();
    }, 300);
  }

  clearSearchText(): void {
    this.filterText = '';
    clearTimeout(this.searchTimeout);
    this.applyIssueFilters();
  }

  applyIssueFilters(): void {
    if (this.mode !== 'real' || !this.selectedProject) return;
    this.clearSelectedIssue();
    this.pageIndex = 0;
    this.hasNextPage = false;
    this.noMoreIssues = false;
    this.failedBugPage = null;
    this.loadBugs(this.selectedProject.id, this.projectSelectionId, 0);
    this.markForCheck();
  }

  clearIssueFilters(): void {
    clearTimeout(this.searchTimeout);
    this.filterText = '';
    this.filterStatus = '';
    this.filterPriority = '';
    this.filterSeverity = '';
    this.noMoreIssues = false;
    this.failedBugPage = null;
    this.sortField = 'createdAt';
    this.sortDirection = 'desc';
    this.pageSize = 25;
    if (this.mode === 'real') this.applyIssueFilters();
    this.markForCheck();
  }

  getUserDisplayName(userId: number | null | undefined): string {
    if (userId === null || userId === undefined) return 'Unassigned';
    const member = this.projectMembers.find((m) => m.userId === userId);
    if (member?.displayName) return member.displayName;
    const adminUser = this.adminUsers.find((u) => u.id === userId);
    if (adminUser?.displayName) return adminUser.displayName;
    if (this.currentUser?.id === userId && this.currentUser?.displayName) {
      return this.currentUser.displayName;
    }
    return `User ID ${userId}`;
  }

  bugsForColumn(status: BugStatus): Bug[] {
    return this.filteredBugs.filter((bug) => bug.status === status);
  }

  onCardDragStart(event: DragEvent, bug: Bug): void {
    this.draggedBug = bug;
    this.boardMessage = '';
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', String(bug.id));
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onColumnDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onColumnDrop(event: DragEvent, targetStatus: BugStatus): void {
    event.preventDefault();
    const bug = this.draggedBug;
    this.draggedBug = null;
    if (!bug || !this.selectedProject) return;
    if (bug.status === targetStatus) return;

    const validation = this.validateTransition(bug, targetStatus);
    if (!validation.allowed) {
      this.boardMessage = validation.message;
      this.markForCheck();
      return;
    }

    let reason = '';
    if (targetStatus === 'CLOSED' || targetStatus === 'REOPENED') {
      const promptReason = window.prompt('Enter a reason (required)');
      if (promptReason === null || !promptReason.trim()) {
        this.boardMessage = 'Status change cancelled: reason is required.';
        this.markForCheck();
        return;
      }
      reason = promptReason.trim();
    }

    const projectId = this.selectedProject.id;
    const selectionId = this.issueSelectionId;
    this.boardMessage = '';
    this.workspace.transitionBug(projectId, bug.id, targetStatus, bug.version, reason).subscribe({
      next: (updatedBug) => {
        this.replaceBug(updatedBug);
        if (this.selectedBug?.id === updatedBug.id) {
          this.selectedBug = updatedBug;
          if (this.selectedDetail) {
            this.selectedDetail = { ...this.selectedDetail, bug: updatedBug };
          }
        }
        this.refreshCurrentBugPage();
        this.loadHistory(selectionId, projectId, bug.id, true);
        this.markForCheck();
      },
      error: (err) => {
        this.boardMessage = this.formatRequestError(err, 'versioned', 'Could not move issue.');
        this.markForCheck();
      },
    });
  }

  validateTransition(bug: Bug, targetStatus: BugStatus): { allowed: boolean; message: string } {
    const actorId = this.auth.currentUser()?.id;
    const isLead = this.currentProjectRole === 'PROJECT_LEAD' || this.isAppAdmin;
    const isReporter = bug.reporterId === actorId;
    const isAssignee = bug.assigneeId !== null && bug.assigneeId === actorId;

    let requiredAction: string | null = null;
    if ((bug.status === 'OPEN' || bug.status === 'REOPENED') && targetStatus === 'IN_PROGRESS') {
      requiredAction = 'START';
    } else if (bug.status === 'IN_PROGRESS' && targetStatus === 'RESOLVED') {
      requiredAction = 'RESOLVE';
    } else if (bug.status === 'RESOLVED' && targetStatus === 'CLOSED') {
      requiredAction = 'CLOSE';
    } else if (
      (bug.status === 'RESOLVED' || bug.status === 'CLOSED') &&
      targetStatus === 'REOPENED'
    ) {
      requiredAction = 'REOPEN';
    }

    if (!requiredAction) {
      return {
        allowed: false,
        message: `Moving from ${this.formatStatus(bug.status)} to ${this.formatStatus(targetStatus)} is not allowed.`,
      };
    }

    if (this.selectedDetail?.bug.id === bug.id) {
      if (!this.selectedDetail.allowedActions.includes(requiredAction)) {
        return {
          allowed: false,
          message: `Action ${requiredAction} is not permitted for your current role.`,
        };
      }
      return { allowed: true, message: '' };
    }

    let roleAllowed = false;
    if (requiredAction === 'START' && isAssignee) {
      roleAllowed = true;
    } else if (requiredAction === 'RESOLVE' && isAssignee) {
      roleAllowed = true;
    } else if (requiredAction === 'CLOSE' && (isReporter || isLead)) {
      roleAllowed = true;
    } else if (requiredAction === 'REOPEN' && (isReporter || isLead)) {
      roleAllowed = true;
    }

    if (!roleAllowed) {
      return {
        allowed: false,
        message: `You do not have permission to perform action ${requiredAction} on this issue.`,
      };
    }

    return { allowed: true, message: '' };
  }

  previousBugPage(): void {
    if (this.loadingBugs || this.pageIndex < 1 || !this.selectedProject) return;
    this.clearSelectedIssue();
    this.noMoreIssues = false;
    this.loadBugs(this.selectedProject.id, this.projectSelectionId, this.pageIndex - 1);
  }

  nextBugPage(): void {
    if (this.loadingBugs || !this.hasNextPage || !this.selectedProject) return;
    this.clearSelectedIssue();
    this.noMoreIssues = false;
    this.loadBugs(this.selectedProject.id, this.projectSelectionId, this.pageIndex + 1);
  }

  retryBugs(): void {
    if (!this.selectedProject) return;
    const page = this.failedBugPage ?? this.pageIndex;
    this.loadBugs(this.selectedProject.id, this.projectSelectionId, page);
  }

  selectBug(bug: Bug): void {
    this.resetIssueDetailState();
    this.selectedBug = bug;
    this.selectedDetail = null;
    this.detailError = '';
    this.markForCheck();
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
          this.assigneeUserId = detail.bug.assigneeId;
          this.markForCheck();
        },
        error: (error) => {
          if (selectionId !== this.issueSelectionId) return;
          this.detailLoading = false;
          this.handleRequestError(error, 'Issue details could not be loaded.');
          this.markForCheck();
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
        this.markForCheck();
      },
      error: (error) => {
        if (selectionId !== this.issueSelectionId) return;
        this.commentSubmitting = false;
        this.commentSubmitError = 'Comment could not be added.';
        this.redirectOnUnauthorized(error);
        this.markForCheck();
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
    if (event.actorId !== null) return this.getUserDisplayName(event.actorId);
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
    const project = this.selectedProject;
    const detail = this.selectedDetail;
    if (
      !project ||
      !detail ||
      !detail.allowedActions.includes('EDIT_FIELDS') ||
      this.editSubmitting
    ) {
      return;
    }
    const title = this.editTitle.trim();
    const description = this.editDescription.trim();
    if (title.length < 5 || title.length > 120 || !description || description.length > 5000) {
      this.editError = 'Title must be 5–120 characters and description 1–5000 characters.';
      return;
    }

    const selectionId = this.issueSelectionId;
    this.editSubmitting = true;
    this.editError = '';
    this.editConflict = '';
    this.latestVersionNotice = '';
    this.workspace
      .updateBug(project.id, detail.bug.id, {
        title,
        description,
        priority: this.editPriority,
        severity: this.editSeverity,
        version: detail.bug.version,
      })
      .subscribe({
        next: (bug) => {
          if (selectionId !== this.issueSelectionId) return;
          this.replaceBug(bug);
          this.selectedBug = bug;
          this.selectedDetail = { ...this.selectedDetail!, bug };
          this.editTitle = bug.title;
          this.editDescription = bug.description;
          this.editPriority = bug.priority;
          this.editSeverity = bug.severity;
          this.editSubmitting = false;
          this.refreshCurrentBugPage();
          this.markForCheck();
        },
        error: (error) => {
          if (selectionId !== this.issueSelectionId) return;
          this.editSubmitting = false;
          this.editError = this.formatRequestError(error, 'edit', 'Issue could not be updated.');
          this.editConflict = error.status === 409 ? this.editError : '';
          this.latestVersionNotice = '';
          this.redirectOnUnauthorized(error);
          this.markForCheck();
        },
      });
  }

  reloadIssueForReview(): void {
    const project = this.selectedProject;
    const bug = this.selectedBug;
    const selectionId = this.issueSelectionId;
    if (!project || !bug || this.detailLoading) return;
    this.detailLoading = true;
    this.detailError = '';
    this.workspace.getBug(project.id, bug.id).subscribe({
      next: (detail) => {
        if (selectionId !== this.issueSelectionId) return;
        this.selectedDetail = detail;
        this.selectedBug = detail.bug;
        this.replaceBug(detail.bug);
        this.detailLoading = false;
        this.latestVersionNotice =
          'Latest server version loaded. Your draft is unchanged; review it before saving again.';
        this.editConflict = '';
        this.editError = '';
        this.actionError = '';
        this.actionConflict = false;
        this.assignError = '';
        this.assignConflict = false;
        this.refreshCurrentBugPage();
        this.markForCheck();
      },
      error: (error) => {
        if (selectionId !== this.issueSelectionId) return;
        this.detailLoading = false;
        this.detailError = this.formatRequestError(
          error,
          'detail',
          'Latest issue version could not be loaded.',
        );
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  assignIssue(): void {
    const project = this.selectedProject;
    const detail = this.selectedDetail;
    const bug = this.selectedBug;
    const userId = this.assigneeUserId;
    if (
      !project ||
      !detail ||
      !bug ||
      !detail.allowedActions.includes('ASSIGN') ||
      !this.membersLoaded ||
      this.assignSubmitting
    ) {
      return;
    }
    if (userId === null || !this.projectMembers.some((member) => member.userId === userId)) {
      this.assignError = 'Choose a member of this project.';
      return;
    }
    const selectionId = this.issueSelectionId;
    const projectSelectionId = this.projectSelectionId;
    this.assignSubmitting = true;
    this.assignError = '';
    this.assignConflict = false;
    this.latestVersionNotice = '';
    this.workspace.assignBug(project.id, detail.bug.id, userId, detail.bug.version).subscribe({
      next: (bug) => {
        if (
          selectionId !== this.issueSelectionId ||
          projectSelectionId !== this.projectSelectionId
        ) {
          return;
        }
        this.replaceBug(bug);
        this.selectedBug = bug;
        this.selectedDetail = { ...this.selectedDetail!, bug };
        this.assigneeUserId = bug.assigneeId;
        this.assignSubmitting = false;
        this.assignConflict = false;
        this.latestVersionNotice = '';
        this.refreshSelectedDetail(project.id, bug.id, selectionId);
        this.refreshCurrentBugPage();
        this.markForCheck();
      },
      error: (error) => {
        if (
          selectionId !== this.issueSelectionId ||
          projectSelectionId !== this.projectSelectionId
        ) {
          return;
        }
        this.assignSubmitting = false;
        this.assignError = this.formatRequestError(
          error,
          'versioned',
          'Issue could not be assigned.',
        );
        this.assignConflict = error.status === 409;
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  createProject(): void {
    if (!this.isAppAdmin || this.creatingProject) return;
    this.createProjectForm.markAllAsTouched();
    const value = this.createProjectForm.getRawValue();
    if (
      this.createProjectForm.invalid ||
      !value.key.trim() ||
      !value.name.trim() ||
      value.leadUserId === null
    ) {
      return;
    }

    const request: CreateProjectRequest = {
      key: value.key.trim(),
      name: value.name.trim(),
      description: value.description.trim() || null,
      leadUserId: value.leadUserId,
    };
    this.creatingProject = true;
    this.createProjectError = '';
    this.workspace.createProject(request).subscribe({
      next: () => {
        this.creatingProject = false;
        this.createProjectForm.reset({ key: '', name: '', description: '', leadUserId: null });
        this.showCreateProjectForm = false;
        this.refreshProjects();
        this.markForCheck();
      },
      error: (error: { status?: number }) => {
        this.creatingProject = false;
        if (this.redirectOnUnauthorized(error)) return;
        this.createProjectError =
          error.status === 409
            ? 'That project key is already in use.'
            : error.status === 404
              ? 'The lead user ID was not found.'
              : error.status === 403
                ? 'Only application admins can create projects.'
                : 'Project could not be created. Check the form and try again.';
        this.markForCheck();
      },
    });
  }

  addProjectMember(): void {
    const project = this.selectedProject;
    if (!project || !this.canManageProjectMembers || this.addingMember) return;
    this.addMemberForm.markAllAsTouched();
    const value = this.addMemberForm.getRawValue();
    if (
      this.addMemberForm.invalid ||
      value.userId === null ||
      !this.availableMemberRoles.includes(value.role)
    ) {
      return;
    }

    const selectionId = this.projectSelectionId;
    const request: AddProjectMemberRequest = { userId: value.userId, role: value.role };
    this.addingMember = true;
    this.addMemberError = '';
    this.addMemberSuccess = '';
    this.workspace.addProjectMember(project.id, request).subscribe({
      next: () => {
        if (selectionId !== this.projectSelectionId || this.selectedProject?.id !== project.id) {
          return;
        }
        this.addingMember = false;
        this.addMemberForm.reset({ userId: null, role: 'DEVELOPER' });
        this.addMemberSuccess = 'Project member added.';
        this.loadProjectMembers(project.id, selectionId, true);
        this.markForCheck();
      },
      error: (error: { status?: number }) => {
        if (selectionId !== this.projectSelectionId || this.selectedProject?.id !== project.id) {
          return;
        }
        this.addingMember = false;
        this.addMemberError =
          error.status === 404
            ? 'The user or project was not found.'
            : error.status === 403
              ? 'You are not allowed to add this member or role.'
              : 'Project member could not be added.';
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  retryProjectMembers(): void {
    if (!this.selectedProject || this.membersLoading) return;
    this.loadProjectMembers(this.selectedProject.id, this.projectSelectionId, true);
  }

  transition(status: BugStatus): void {
    const project = this.selectedProject;
    const detail = this.selectedDetail;
    const actionByStatus: Partial<Record<BugStatus, string>> = {
      IN_PROGRESS: 'START',
      RESOLVED: 'RESOLVE',
      CLOSED: 'CLOSE',
      REOPENED: 'REOPEN',
    };
    const requiredAction = actionByStatus[status];
    if (
      !project ||
      !detail ||
      !requiredAction ||
      !detail.allowedActions.includes(requiredAction) ||
      this.actionSubmitting
    ) {
      return;
    }
    const selectionId = this.issueSelectionId;
    const projectId = project.id;
    const bugId = detail.bug.id;
    const reasonRequired = status === 'CLOSED' || status === 'REOPENED';
    const reason = reasonRequired ? window.prompt('Enter a reason (required)') || '' : '';
    if (reasonRequired && !reason.trim()) return;
    if (reason.length > 5000) {
      this.actionError = 'Reason must be 5000 characters or fewer.';
      return;
    }
    this.actionSubmitting = true;
    this.actionError = '';
    this.actionConflict = false;
    this.latestVersionNotice = '';
    this.workspace.transitionBug(projectId, bugId, status, detail.bug.version, reason).subscribe({
      next: (bug) => {
        if (selectionId !== this.issueSelectionId) return;
        this.replaceBug(bug);
        this.selectedBug = bug;
        this.selectedDetail = { bug, allowedActions: this.selectedDetail!.allowedActions };
        this.actionSubmitting = false;
        this.actionConflict = false;
        this.refreshSelectedDetail(projectId, bug.id, selectionId);
        this.refreshCurrentBugPage();
        this.loadHistory(selectionId, projectId, bug.id, true);
        this.markForCheck();
      },
      error: (error) => {
        if (selectionId !== this.issueSelectionId) return;
        this.actionSubmitting = false;
        this.actionError = this.formatRequestError(
          error,
          'versioned',
          'Issue status could not be changed.',
        );
        this.actionConflict = error.status === 409;
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  submitBug(): void {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid || !this.selectedProject || this.creating) return;
    const formValue = this.createForm.getRawValue();
    const title = formValue.title.trim();
    const description = formValue.description.trim();
    if (title.length < 5 || title.length > 120 || !description || description.length > 5000) {
      this.createError = 'Title must be 5–120 characters and description 1–5000 characters.';
      return;
    }
    this.creating = true;
    this.createError = '';
    const selectionId = this.projectSelectionId;
    const project = this.selectedProject;
    const request: CreateBugRequest = {
      ...formValue,
      title,
      description,
    };
    this.workspace.createBug(project.id, request).subscribe({
      next: (bug) => {
        if (selectionId !== this.projectSelectionId || this.selectedProject?.id !== project.id)
          return;
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
        this.createDueDate = '';
        this.stagedAttachments = [];
        this.showCreateForm = false;
        this.creating = false;
        this.refreshCurrentBugPage();
        this.markForCheck();
      },
      error: (error) => {
        if (selectionId !== this.projectSelectionId) return;
        this.creating = false;
        this.createError = this.formatRequestError(
          error,
          'create',
          'We could not create this issue.',
        );
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  closeReference(): void {
    this.referenceBug = null;
  }

  retryProjects(): void {
    this.loadProjects();
  }

  retryAdminUsers(): void {
    this.loadAdminUsers(true);
  }

  createAdminUser(): void {
    if (!this.isAppAdmin || this.creatingAdminUser) return;
    this.createAdminUserForm.markAllAsTouched();
    const value = this.createAdminUserForm.getRawValue();
    const email = value.email.trim();
    const displayName = value.displayName.trim();
    if (
      this.createAdminUserForm.invalid ||
      !email ||
      !displayName ||
      value.password.length < 12 ||
      value.password.length > 72
    ) {
      return;
    }

    const request: CreateAdminUserRequest = {
      email,
      displayName,
      password: value.password,
      role: value.role,
    };
    this.creatingAdminUser = true;
    this.createAdminUserError = '';
    this.createAdminUserSuccess = '';
    this.workspace.createAdminUser(request).subscribe({
      next: (user) => {
        this.creatingAdminUser = false;
        this.createAdminUserSuccess = `User ${user.email} was created.`;
        this.createAdminUserForm.reset({ email: '', displayName: '', password: '', role: 'USER' });
        this.showCreateUserModal = false;
        this.adminUsers = [user, ...this.adminUsers.filter((existing) => existing.id !== user.id)];
        this.adminUserEdits[user.id] = { role: this.globalRoleForUser(user.role) };
        this.markForCheck();
      },
      error: (error: { status?: number }) => {
        this.creatingAdminUser = false;
        this.createAdminUserError = this.adminMutationError(error, 'create user');
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  updateAdminUser(user: AdminUser): void {
    if (!this.isAppAdmin || this.adminUserUpdates[user.id]?.loading) return;
    const role = this.adminUserEdits[user.id]?.role;
    if (!role || !this.globalRoles.includes(role)) return;
    this.adminUserUpdates[user.id] = { loading: true, error: '' };
    this.workspace.updateAdminUser(user.id, { role, enabled: null }).subscribe({
      next: (updated) => {
        this.adminUsers = this.adminUsers.map((existing) =>
          existing.id === updated.id ? updated : existing,
        );
        this.adminUserEdits[updated.id] = { role: this.globalRoleForUser(updated.role) };
        this.adminUserUpdates[updated.id] = { loading: false, error: '' };
        this.markForCheck();
      },
      error: (error: { status?: number }) => {
        this.adminUserUpdates[user.id] = {
          loading: false,
          error: this.adminMutationError(error, 'update user role'),
        };
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  bindGitHubRepository(): void {
    if (!this.isAppAdmin || this.bindingGitHubRepository) return;
    this.bindGitHubForm.markAllAsTouched();
    const value = this.bindGitHubForm.getRawValue();
    const owner = value.owner.trim();
    const repositoryName = value.repositoryName.trim();
    if (
      this.bindGitHubForm.invalid ||
      value.projectId === null ||
      value.installationId === null ||
      value.repositoryId === null ||
      !owner ||
      !repositoryName ||
      owner.length > 100 ||
      repositoryName.length > 100 ||
      owner.length + repositoryName.length + 1 > 201
    ) {
      return;
    }

    const request: BindGitHubRepositoryRequest = {
      projectId: value.projectId,
      installationId: value.installationId,
      repositoryId: value.repositoryId,
      owner,
      repositoryName,
      fullName: `${owner}/${repositoryName}`,
    };
    this.bindingGitHubRepository = true;
    this.bindGitHubError = '';
    this.githubBindingResult = null;
    this.workspace.bindGitHubRepository(request).subscribe({
      next: (binding) => {
        this.bindingGitHubRepository = false;
        this.githubBindingResult = binding;
        this.bindGitHubForm.reset({
          projectId: null,
          installationId: null,
          repositoryId: null,
          owner: '',
          repositoryName: '',
        });
        this.markForCheck();
      },
      error: (error: { status?: number }) => {
        this.bindingGitHubRepository = false;
        this.bindGitHubError = this.adminMutationError(error, 'bind repository');
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  retryGitHubBinding(): void {
    if (!this.bindingGitHubRepository) this.bindGitHubRepository();
  }

  setActiveNav(nav: 'overview' | 'issues' | 'admin'): void {
    this.activeNav = nav;
    this.mobileSidebarOpen = false;
    if (nav === 'admin' && this.isAppAdmin && !this.adminUsersLoaded) {
      this.loadAdminUsers();
    }
    this.markForCheck();
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
    this.markForCheck();
  }

  openCreateIssue(): void {
    this.showCreateForm = true;
    this.markForCheck();
  }

  closeCreateIssue(): void {
    this.showCreateForm = false;
    this.createError = '';
    this.createDueDate = '';
    this.stagedAttachments = [];
    this.markForCheck();
  }

  openCreateProject(): void {
    this.showCreateProjectForm = true;
    if (this.isAppAdmin && !this.adminUsersLoaded) {
      this.loadAdminUsers();
    }
    this.markForCheck();
  }

  closeCreateProject(): void {
    this.showCreateProjectForm = false;
    this.createProjectError = '';
    this.markForCheck();
  }

  openCreateUser(): void {
    this.showCreateUserModal = true;
    this.markForCheck();
  }

  closeCreateUser(): void {
    this.showCreateUserModal = false;
    this.createAdminUserError = '';
    this.markForCheck();
  }

  get currentUser() {
    return this.auth.currentUser();
  }

  scrollToSection(id: string): void {
    if (id === 'dashboard') this.setActiveNav('overview');
    else if (id === 'issues') this.setActiveNav('issues');
    else if (id === 'admin-controls') this.setActiveNav('admin');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private refreshProjects(): void {
    if (this.loadingProjects) {
      this.refreshProjectsAfterLoad = true;
      return;
    }
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
    this.filterSeverity = '';
  }

  private loadProjects(): void {
    if (this.loadingProjects) return;
    this.loadingProjects = true;
    this.projectsError = '';
    this.markForCheck();
    this.workspace.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loadingProjects = false;
        if (projects.length > 0 && !this.selectedProject) {
          this.selectProject(projects[0]);
        }
        this.loadQueuedProjectRefresh();
        this.markForCheck();
      },
      error: (error) => {
        this.loadingProjects = false;
        this.handleRequestError(error, 'Projects could not be loaded.');
        this.loadQueuedProjectRefresh();
        this.markForCheck();
      },
    });
  }

  private loadAdminUsers(force = false): void {
    if (!this.isAppAdmin || (this.adminUsersLoading && !force)) return;
    if (force) this.adminUsersLoadSubscription?.unsubscribe();
    this.adminUsersLoading = true;
    this.adminUsersError = '';
    this.markForCheck();
    this.adminUsersLoadSubscription = this.workspace.getAdminUsers().subscribe({
      next: (users) => {
        this.adminUsersLoading = false;
        if (!this.isAppAdmin) return;
        const userList = Array.isArray(users) ? users : [];
        this.adminUsers = userList;
        this.adminUserEdits = Object.fromEntries(
          userList.map((user) => [user.id, { role: this.globalRoleForUser(user.role) }]),
        );
        this.adminUsersLoaded = true;
        this.markForCheck();
      },
      error: (error: { status?: number }) => {
        this.adminUsersLoading = false;
        this.adminUsersLoaded = false;
        this.adminUsersError = this.adminMutationError(error, 'load users');
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  private globalRoleForUser(role: string): GlobalRole | '' {
    return this.globalRoles.find((supportedRole) => supportedRole === role) ?? '';
  }

  private adminMutationError(error: { status?: number }, operation: string): string {
    switch (error.status) {
      case 0:
        return `Network request failed while attempting to ${operation}.`;
      case 401:
        return 'Your session expired. Sign in again to continue.';
      case 403:
        return 'Access denied. Application admin permission is required.';
      case 404:
        return operation === 'update user role'
          ? 'The user no longer exists.'
          : operation === 'bind repository'
            ? 'The project ID was not found.'
            : 'The admin users resource was not found.';
      case 409:
        return operation === 'create user'
          ? 'That email address is already registered.'
          : operation === 'bind repository'
            ? 'The repository or project is already bound.'
            : 'The request conflicts with existing data.';
      case 400:
      case 422:
        return `The request to ${operation} was rejected. Check the entered values.`;
      default:
        return `Could not ${operation}. Retry the request.`;
    }
  }

  private loadQueuedProjectRefresh(): void {
    if (!this.refreshProjectsAfterLoad) return;
    this.refreshProjectsAfterLoad = false;
    this.loadProjects();
  }

  private loadBugs(projectId: number, selectionId: number, page: number): void {
    if (selectionId !== this.projectSelectionId) return;
    this.bugsLoadSubscription?.unsubscribe();
    const requestId = ++this.bugsRequestId;
    const query: BugListQuery = {
      text: this.filterText,
      status: this.filterStatus,
      priority: this.filterPriority,
      severity: this.filterSeverity,
      page,
      size: this.pageSize,
      sort: this.sortField,
      direction: this.sortDirection,
    };
    this.loadingBugs = true;
    this.bugsError = '';
    this.markForCheck();
    this.bugsLoadSubscription = this.workspace.getBugs(projectId, query).subscribe({
      next: (bugs) => {
        if (
          requestId !== this.bugsRequestId ||
          selectionId !== this.projectSelectionId ||
          this.selectedProject?.id !== projectId
        ) {
          return;
        }
        this.loadingBugs = false;
        this.failedBugPage = null;
        if (bugs.length === 0 && page > 0 && page > this.pageIndex) {
          this.hasNextPage = false;
          this.noMoreIssues = true;
          this.markForCheck();
          return;
        }
        this.bugs = bugs;
        this.pageIndex = page;
        this.hasNextPage = bugs.length === this.pageSize;
        this.noMoreIssues = false;
        this.markForCheck();
      },
      error: (error) => {
        if (
          requestId !== this.bugsRequestId ||
          selectionId !== this.projectSelectionId ||
          this.selectedProject?.id !== projectId
        ) {
          return;
        }
        this.loadingBugs = false;
        this.failedBugPage = page;
        this.bugsError = this.formatRequestError(error, 'list', 'Issues could not be loaded.');
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  private loadProjectMembers(projectId: number, selectionId: number, force = false): void {
    if (selectionId !== this.projectSelectionId) return;
    if (this.membersLoading && !force) return;
    if (force) this.membersLoadSubscription?.unsubscribe();

    this.projectMembers = [];
    this.membersLoading = true;
    this.membersLoaded = false;
    this.membersError = '';
    this.markForCheck();
    this.membersLoadSubscription = this.workspace.getProjectMembers(projectId).subscribe({
      next: (members) => {
        if (selectionId !== this.projectSelectionId || this.selectedProject?.id !== projectId) {
          return;
        }
        this.projectMembers = members;
        this.membersLoading = false;
        this.membersLoaded = true;
        this.markForCheck();
      },
      error: (error: { status?: number }) => {
        if (selectionId !== this.projectSelectionId || this.selectedProject?.id !== projectId) {
          return;
        }
        this.membersLoading = false;
        this.membersLoaded = false;
        this.membersError =
          error.status === 404
            ? 'Members are unavailable or this project is not accessible.'
            : 'Project members could not be loaded.';
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  private resetProjectMemberState(): void {
    this.membersLoadSubscription?.unsubscribe();
    this.membersLoadSubscription = undefined;
    this.projectMembers = [];
    this.membersLoading = false;
    this.membersLoaded = false;
    this.membersError = '';
    this.addingMember = false;
    this.addMemberError = '';
    this.addMemberSuccess = '';
    this.addMemberForm.reset({ userId: null, role: 'DEVELOPER' });
  }

  private handleRequestError(error: { status?: number }, fallback: string): void {
    if (this.redirectOnUnauthorized(error)) return;
    const message = this.formatRequestError(error, 'general', fallback);
    if (fallback === 'Issues could not be loaded.') this.bugsError = message;
    else if (fallback === 'Issue details could not be loaded.') this.detailError = message;
    else if (fallback === 'Issue could not be updated.') this.editError = message;
    else if (fallback === 'Projects could not be loaded.') this.projectsError = message;
    else this.createError = message;
  }

  private formatRequestError(
    error: { status?: number },
    context: 'list' | 'detail' | 'create' | 'edit' | 'versioned' | 'general',
    fallback: string,
  ): string {
    switch (error.status) {
      case 0:
        return 'Network request failed. Check your connection and retry.';
      case 401:
        return 'Your session expired. Sign in again to continue.';
      case 403:
        return 'Access denied. Your account is not allowed to perform this action.';
      case 404:
        return context === 'list' || context === 'detail'
          ? 'The project or issue is unavailable or not accessible.'
          : 'The requested project or record is unavailable.';
      case 409:
        return context === 'edit' || context === 'versioned'
          ? 'This issue changed since it was loaded. Reload the latest version before retrying.'
          : 'This request conflicts with existing data. Review the values and try again.';
      case 422:
        return 'The request could not be processed. Check the values and allowed action, then retry.';
      case 400:
        return 'The request was invalid. Check required fields and any required reason.';
      default:
        return fallback;
    }
  }

  private refreshCurrentBugPage(): void {
    if (!this.selectedProject || this.mode !== 'real') return;
    this.loadBugs(this.selectedProject.id, this.projectSelectionId, this.pageIndex);
  }

  private clearSelectedIssue(): void {
    this.resetIssueDetailState();
    this.selectedBug = null;
    this.selectedDetail = null;
  }

  private refreshSelectedDetail(projectId: number, bugId: number, selectionId: number): void {
    this.detailLoading = true;
    this.detailError = '';
    this.markForCheck();
    this.workspace.getBug(projectId, bugId).subscribe({
      next: (detail) => {
        if (
          selectionId !== this.issueSelectionId ||
          this.selectedProject?.id !== projectId ||
          this.selectedBug?.id !== bugId
        ) {
          return;
        }
        this.selectedDetail = detail;
        this.selectedBug = detail.bug;
        this.replaceBug(detail.bug);
        this.assigneeUserId = detail.bug.assigneeId;
        this.detailLoading = false;
        this.markForCheck();
      },
      error: (error) => {
        if (
          selectionId !== this.issueSelectionId ||
          this.selectedProject?.id !== projectId ||
          this.selectedBug?.id !== bugId
        ) {
          return;
        }
        this.detailLoading = false;
        this.detailError = this.formatRequestError(
          error,
          'detail',
          'Issue details could not be refreshed.',
        );
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
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
    this.actionError = '';
    this.actionConflict = false;
    this.assignSubmitting = false;
    this.assignError = '';
    this.assignConflict = false;
    this.assigneeUserId = null;
    this.editSubmitting = false;
    this.editError = '';
    this.editConflict = '';
    this.latestVersionNotice = '';
  }

  private loadComments(selectionId: number, projectId: number, bugId: number, force = false): void {
    if (selectionId !== this.issueSelectionId) return;
    if (this.commentsLoading && !force) return;
    if (force) this.commentsLoadSubscription?.unsubscribe();

    this.commentsLoading = true;
    this.commentsError = '';
    this.markForCheck();
    this.commentsLoadSubscription = this.workspace.getComments(projectId, bugId).subscribe({
      next: (comments) => {
        if (selectionId !== this.issueSelectionId) return;
        this.comments = comments;
        this.commentsLoading = false;
        this.markForCheck();
      },
      error: (error) => {
        if (selectionId !== this.issueSelectionId) return;
        this.commentsLoading = false;
        this.commentsError = 'Comments could not be loaded.';
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  private loadHistory(selectionId: number, projectId: number, bugId: number, force = false): void {
    if (selectionId !== this.issueSelectionId) return;
    if (this.historyLoading && !force) return;
    if (force) this.historyLoadSubscription?.unsubscribe();

    this.historyLoading = true;
    this.historyError = '';
    this.markForCheck();
    this.historyLoadSubscription = this.workspace.getHistory(projectId, bugId).subscribe({
      next: (history) => {
        if (selectionId !== this.issueSelectionId) return;
        this.history = history;
        this.historyLoading = false;
        this.markForCheck();
      },
      error: (error) => {
        if (selectionId !== this.issueSelectionId) return;
        this.historyLoading = false;
        this.historyError = 'Activity could not be loaded.';
        this.redirectOnUnauthorized(error);
        this.markForCheck();
      },
    });
  }

  private formatHistoryValue(value: string | null): string {
    return value ? value.replaceAll('_', ' ').toLowerCase() : 'Unknown status';
  }

  private formatAssignee(value: string | null): string {
    if (!value) return 'Unassigned';
    const num = Number(value);
    if (!isNaN(num)) return this.getUserDisplayName(num);
    return value;
  }

  private redirectOnUnauthorized(error: { status?: number }): boolean {
    if (error.status !== 401) return false;
    this.auth.currentUser.set(null);
    this.router.navigate(['/login']);
    return true;
  }
}
