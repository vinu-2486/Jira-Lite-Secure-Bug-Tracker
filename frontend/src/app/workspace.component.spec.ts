import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService, AuthUser } from './auth.service';
import {
  AddProjectMemberRequest,
  AdminUser,
  BindGitHubRepositoryRequest,
  Bug,
  BugDetail,
  BugListQuery,
  Comment,
  CreateAdminUserRequest,
  CreateProjectRequest,
  GitHubRepositoryBinding,
  HistoryEvent,
  Project,
  ProjectMember,
  ProjectRole,
  UpdateBugRequest,
  WorkspaceService,
  BugStatus,
  UpdateAdminUserRequest,
} from './workspace.service';
import { WorkspaceComponent } from './workspace.component';

const savedBug: Bug = {
  id: 8,
  key: 'JILA-8',
  projectId: 3,
  title: 'Saved issue title',
  description: 'Saved issue description',
  priority: 'MEDIUM',
  severity: 'MAJOR',
  status: 'OPEN',
  reporterId: 1,
  assigneeId: null,
  resolution: null,
  version: 0,
  createdAt: '2026-10-30T12:00:00Z',
  updatedAt: '2026-10-30T12:00:00Z',
};

const issueA: Bug = { ...savedBug, id: 21, key: 'JILA-21', title: 'Issue A' };
const issueB: Bug = { ...savedBug, id: 22, key: 'JILA-22', title: 'Issue B' };
const detailFor = (bug: Bug): BugDetail => ({ bug, allowedActions: [] });
const adminUser: AdminUser = {
  id: 12,
  email: 'member@example.test',
  displayName: 'Member',
  role: 'USER',
};
const comment: Comment = {
  id: 30,
  authorId: 7,
  body: 'A saved comment',
  createdAt: '2026-10-30T12:05:00Z',
};
const historyEvent = (
  fields: Partial<HistoryEvent> & Pick<HistoryEvent, 'id' | 'eventType'>,
): HistoryEvent => ({
  id: fields.id,
  actorId: fields.actorId ?? null,
  eventType: fields.eventType,
  oldValue: fields.oldValue ?? null,
  newValue: fields.newValue ?? null,
  reason: fields.reason ?? null,
  externalAuthor: fields.externalAuthor ?? null,
  createdAt: fields.createdAt ?? '2026-10-30T12:00:00Z',
});

describe('WorkspaceComponent', () => {
  const currentUser = signal<AuthUser | null>(null);
  const project: Project = {
    id: 3,
    key: 'JILA',
    name: 'JILA project',
    description: null,
  };
  const workspace = {
    getProjects: vi.fn<() => Observable<Project[]>>(),
    createProject: vi.fn<(request: CreateProjectRequest) => Observable<Project>>(),
    getAdminUsers: vi.fn<() => Observable<AdminUser[]>>(),
    createAdminUser: vi.fn<(request: CreateAdminUserRequest) => Observable<AdminUser>>(),
    updateAdminUser:
      vi.fn<(userId: number, request: UpdateAdminUserRequest) => Observable<AdminUser>>(),
    bindGitHubRepository:
      vi.fn<(request: BindGitHubRepositoryRequest) => Observable<GitHubRepositoryBinding>>(),
    getProjectMembers: vi.fn<(projectId: number) => Observable<ProjectMember[]>>(),
    addProjectMember:
      vi.fn<(projectId: number, request: AddProjectMemberRequest) => Observable<void>>(),
    getBugs: vi.fn<(projectId: number, query: BugListQuery) => Observable<Bug[]>>(),
    createBug: vi.fn(() => of(savedBug)),
    getBug: vi.fn<(projectId: number, bugId: number) => Observable<BugDetail>>(),
    updateBug:
      vi.fn<(projectId: number, bugId: number, request: UpdateBugRequest) => Observable<Bug>>(),
    transitionBug:
      vi.fn<
        (
          projectId: number,
          bugId: number,
          status: BugStatus,
          version: number,
          reason?: string,
        ) => Observable<Bug>
      >(),
    getComments: vi.fn<(projectId: number, bugId: number) => Observable<Comment[]>>(),
    addComment: vi.fn<(projectId: number, bugId: number, body: string) => Observable<Comment>>(),
    getHistory: vi.fn<(projectId: number, bugId: number) => Observable<HistoryEvent[]>>(),
    assignBug:
      vi.fn<
        (projectId: number, bugId: number, userId: number, version: number) => Observable<Bug>
      >(),
  };

  beforeEach(async () => {
    currentUser.set(null);
    workspace.getProjects.mockClear();
    workspace.createProject.mockReset();
    workspace.getAdminUsers.mockReset();
    workspace.createAdminUser.mockReset();
    workspace.updateAdminUser.mockReset();
    workspace.bindGitHubRepository.mockReset();
    workspace.getProjectMembers.mockReset();
    workspace.addProjectMember.mockReset();
    workspace.getBugs.mockReset();
    workspace.createBug.mockClear();
    workspace.assignBug.mockReset();
    workspace.getBug.mockReset();
    workspace.updateBug.mockReset();
    workspace.transitionBug.mockReset();
    workspace.getComments.mockReset();
    workspace.addComment.mockReset();
    workspace.getHistory.mockReset();
    workspace.getProjects.mockReturnValue(of([]));
    workspace.createProject.mockReturnValue(of(project));
    workspace.getAdminUsers.mockReturnValue(of([]));
    workspace.createAdminUser.mockReturnValue(of(adminUser));
    workspace.updateAdminUser.mockReturnValue(of(adminUser));
    workspace.bindGitHubRepository.mockReturnValue(
      of({ projectId: 3, repositoryId: 29, fullName: 'acme/bugs' }),
    );
    workspace.getProjectMembers.mockReturnValue(of([]));
    workspace.addProjectMember.mockReturnValue(of(void 0));
    workspace.getBugs.mockReturnValue(of([]));
    workspace.createBug.mockReturnValue(of(savedBug));
    workspace.updateBug.mockReturnValue(of(savedBug));
    workspace.transitionBug.mockReturnValue(of(savedBug));
    workspace.assignBug.mockReturnValue(of(savedBug));
    workspace.getBug.mockImplementation((_projectId, bugId) =>
      of(detailFor(bugId === issueA.id ? issueA : issueB)),
    );
    workspace.getComments.mockReturnValue(of([]));
    workspace.addComment.mockReturnValue(of(comment));
    workspace.getHistory.mockReturnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [WorkspaceComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { currentUser, logout: vi.fn(() => of(void 0)) },
        },
        { provide: WorkspaceService, useValue: workspace },
      ],
    }).compileComponents();
  });

  it('keeps both demo issues clearly labeled as illustrative and unsaved', async () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Demo data - not saved');
    expect(fixture.nativeElement.textContent).toContain('These two records are illustrative only.');
    expect(fixture.nativeElement.textContent).toContain('DEMO-101');
    expect(fixture.nativeElement.textContent).toContain('DEMO-102');
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(2);
  }, 25000);

  it('keeps issue rows keyboard focusable and opens them with Enter and Space', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.mode = 'real';
    component.selectedProject = project;
    component.bugs = [issueA];
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    const selectedBug = () => component.selectedBug;
    expect(row.tabIndex).toBe(0);
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(selectedBug()?.id).toBe(issueA.id);

    component.selectedBug = null;
    row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(selectedBug()?.id).toBe(issueA.id);
  });

  it('shows the saved reference modal after a successful issue save', async () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.mode = 'real';
    component.selectedProject = project;
    component.createForm.setValue({
      title: 'Saved issue title',
      description: 'Saved issue description',
      priority: 'MEDIUM',
      severity: 'MAJOR',
    });
    fixture.detectChanges();

    component.submitBug();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(workspace.createBug).toHaveBeenCalledWith(project.id, {
      title: 'Saved issue title',
      description: 'Saved issue description',
      priority: 'MEDIUM',
      severity: 'MAJOR',
    });
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Saved reference');
    expect(dialog.textContent).toContain('JILA-8');
    expect(dialog.textContent).toContain('Saved issue title');
    expect(dialog.textContent).toContain('Copy reference');
  });

  it('shows loading only while the project request is pending and avoids duplicates', async () => {
    const pendingProjects = new Subject<Project[]>();
    workspace.getProjects.mockReturnValue(pendingProjects);
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading projects');
    expect(fixture.nativeElement.textContent).not.toContain('No projects yet');

    fixture.componentInstance.retryProjects();
    expect(workspace.getProjects).toHaveBeenCalledTimes(1);

    pendingProjects.next([]);
    pendingProjects.complete();
    expect(fixture.componentInstance.loadingProjects).toBe(false);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Loading projects');
  });

  it('shows the empty state after a successful empty project response', () => {
    workspace.getProjects.mockReturnValue(of([]));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No projects yet');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('renders projects after a successful project response', () => {
    workspace.getProjects.mockReturnValue(of([project]));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('JILA project');
    expect(fixture.nativeElement.textContent).not.toContain('No projects yet');
    expect(fixture.nativeElement.textContent).not.toContain('Loading projects');
  });

  it('shows a request error and retries the project request', () => {
    workspace.getProjects
      .mockReturnValueOnce(throwError(() => new Error('Network unavailable')))
      .mockReturnValueOnce(of([project]));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Projects could not be loaded.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('No projects yet');
    expect(workspace.getProjects).toHaveBeenCalledTimes(1);

    fixture.nativeElement.querySelector('.project-retry').click();
    fixture.detectChanges();

    expect(workspace.getProjects).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('JILA project');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('keeps comments and activity loading, empty, retry, and error states independent', async () => {
    const pendingComments = new Subject<Comment[]>();
    const pendingHistory = new Subject<HistoryEvent[]>();
    workspace.getComments.mockReturnValue(pendingComments);
    workspace.getHistory.mockReturnValue(pendingHistory);
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();
    fixture.componentInstance.mode = 'real';
    fixture.componentInstance.selectedProject = project;
    fixture.componentInstance.selectBug(issueA);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.mode).toBe('real');
    expect(fixture.componentInstance.selectedBug).toBe(issueA);
    expect(fixture.componentInstance.selectedDetail?.bug).toBe(issueA);
    expect(fixture.nativeElement.textContent).toContain('Loading comments');
    expect(fixture.nativeElement.textContent).toContain('Loading activity');
    fixture.componentInstance.retryComments();
    fixture.componentInstance.retryHistory();
    expect(workspace.getComments).toHaveBeenCalledTimes(1);
    expect(workspace.getHistory).toHaveBeenCalledTimes(1);

    pendingComments.next([]);
    pendingComments.complete();
    pendingHistory.error(new Error('Timeline offline'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No comments yet.');
    expect(fixture.nativeElement.textContent).toContain('Activity could not be loaded.');
    expect(fixture.nativeElement.textContent).not.toContain('No activity yet.');
    expect(fixture.componentInstance.commentsLoading).toBe(false);
    expect(fixture.componentInstance.historyLoading).toBe(false);

    workspace.getHistory.mockReturnValue(of([]));
    fixture.nativeElement.querySelector('.activity-error button').click();
    fixture.detectChanges();

    expect(workspace.getHistory).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('No activity yet.');
    expect(fixture.nativeElement.textContent).not.toContain('Activity could not be loaded.');
  });

  it('retries failed comment loads without changing the independent activity result', async () => {
    workspace.getComments
      .mockReturnValueOnce(throwError(() => new Error('Comments offline')))
      .mockReturnValueOnce(of([comment]));
    workspace.getHistory.mockReturnValue(
      of([historyEvent({ id: 20, eventType: 'CREATED', newValue: 'JILA-21' })]),
    );
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();
    fixture.componentInstance.mode = 'real';
    fixture.componentInstance.selectedProject = project;
    fixture.componentInstance.selectBug(issueA);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Comments could not be loaded.');
    expect(fixture.nativeElement.textContent).toContain('Issue created');
    expect(fixture.nativeElement.textContent).not.toContain('No comments yet.');

    fixture.nativeElement.querySelector('.comment-box .activity-error button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(workspace.getComments).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.comments).toEqual([comment]);
    expect(fixture.nativeElement.textContent).not.toContain('Comments could not be loaded.');
  });

  it('renders known timeline event data, nullable actor fallbacks, and only safe external links', async () => {
    const events = [
      historyEvent({
        id: 1,
        eventType: 'COMMENT',
        actorId: null,
        reason: 'A timeline comment',
      }),
      historyEvent({
        id: 2,
        eventType: 'STATUS_CHANGE',
        actorId: 9,
        oldValue: 'IN_PROGRESS',
        newValue: 'RESOLVED',
        reason: 'Verified',
      }),
      historyEvent({
        id: 3,
        eventType: 'ASSIGNMENT',
        actorId: 9,
        oldValue: null,
        newValue: '17',
      }),
      historyEvent({
        id: 4,
        eventType: 'FIELD_EDIT',
        oldValue: 'Old title\\nOld description',
        newValue: 'New title\\nNew description',
      }),
      historyEvent({
        id: 5,
        eventType: 'COMMIT',
        newValue: 'https://github.com/example/repo/commit/abc123',
        externalAuthor: 'octocat',
      }),
      historyEvent({
        id: 6,
        eventType: 'PULL_REQUEST',
        newValue: 'Fixes issue (https://github.com/example/repo/pull/42)',
      }),
      historyEvent({
        id: 7,
        eventType: 'COMMIT',
        newValue: 'Unsafe: javascript:alert(1)',
      }),
    ];
    workspace.getHistory.mockReturnValue(of(events));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();
    fixture.componentInstance.mode = 'real';
    fixture.componentInstance.selectedProject = project;
    fixture.componentInstance.selectBug(issueA);
    await fixture.whenStable();
    fixture.detectChanges();

    const timeline = fixture.nativeElement.querySelector('.detail-history') as HTMLElement;
    const rendered = timeline.textContent as string;
    expect(rendered).toContain('External activity (author not provided)');
    expect(rendered).toContain('A timeline comment');
    expect(rendered).toContain('in progress → resolved');
    expect(rendered).toContain('Reason: Verified');
    expect(rendered).toContain('Unassigned → User ID 17');
    expect(rendered).toContain('Old title');
    expect(rendered).toContain('New title');
    expect(rendered).toContain('GitHub author: octocat');
    expect(timeline.querySelectorAll('article.history-item')).toHaveLength(7);
    expect(
      Array.from(timeline.querySelectorAll<HTMLElement>('.history-heading strong')).map((node) =>
        node.textContent?.trim(),
      ),
    ).toEqual([
      'Comment added',
      'Status changed',
      'Assignee changed',
      'Issue fields edited',
      'Commit linked',
      'Pull request linked',
      'Commit linked',
    ]);
    const externalLinks = timeline.querySelectorAll<HTMLAnchorElement>('a.history-link');
    expect(externalLinks).toHaveLength(2);
    expect(externalLinks[0].getAttribute('href')).toBe(
      'https://github.com/example/repo/commit/abc123',
    );
    expect(externalLinks[1].getAttribute('href')).toBe('https://github.com/example/repo/pull/42');
    expect(externalLinks[0].getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('refreshes comments after success without duplicates and blocks repeat submissions', async () => {
    const pendingPost = new Subject<Comment>();
    workspace.getComments.mockReturnValueOnce(of([])).mockReturnValueOnce(of([comment]));
    workspace.addComment.mockReturnValue(pendingPost);
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();
    fixture.componentInstance.mode = 'real';
    fixture.componentInstance.selectedProject = project;
    fixture.componentInstance.selectBug(issueA);
    await fixture.whenStable();

    fixture.componentInstance.commentBody = '   ';
    fixture.componentInstance.addComment();
    expect(workspace.addComment).not.toHaveBeenCalled();

    fixture.componentInstance.commentBody = '  A saved comment  ';
    fixture.componentInstance.addComment();
    fixture.componentInstance.addComment();
    expect(workspace.addComment).toHaveBeenCalledTimes(1);
    expect(workspace.addComment).toHaveBeenCalledWith(project.id, issueA.id, 'A saved comment');
    expect(fixture.componentInstance.commentBody).toBe('  A saved comment  ');

    pendingPost.next(comment);
    pendingPost.complete();
    await fixture.whenStable();

    expect(fixture.componentInstance.commentBody).toBe('');
    expect(workspace.getComments).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.comments).toEqual([comment]);
  });

  it('preserves the comment draft after a failed submission', async () => {
    workspace.addComment.mockReturnValue(throwError(() => new Error('Write failed')));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();
    fixture.componentInstance.mode = 'real';
    fixture.componentInstance.selectedProject = project;
    fixture.componentInstance.selectBug(issueA);
    await fixture.whenStable();
    fixture.componentInstance.commentBody = 'Keep this draft';

    fixture.componentInstance.addComment();
    await fixture.whenStable();

    expect(fixture.componentInstance.commentBody).toBe('Keep this draft');
    expect(fixture.componentInstance.commentSubmitting).toBe(false);
    expect(fixture.componentInstance.commentSubmitError).toBe('Comment could not be added.');
  });

  it('ignores stale comments, history, and comment submissions after switching issues', async () => {
    const commentsA = new Subject<Comment[]>();
    const historyA = new Subject<HistoryEvent[]>();
    const postA = new Subject<Comment>();
    const commentsB = new Subject<Comment[]>();
    const historyB = new Subject<HistoryEvent[]>();
    workspace.getComments.mockImplementation((_projectId, bugId) =>
      bugId === issueA.id ? commentsA : commentsB,
    );
    workspace.getHistory.mockImplementation((_projectId, bugId) =>
      bugId === issueA.id ? historyA : historyB,
    );
    workspace.addComment.mockReturnValue(postA);
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();
    fixture.componentInstance.mode = 'real';
    fixture.componentInstance.selectedProject = project;
    fixture.componentInstance.selectBug(issueA);
    fixture.componentInstance.commentBody = 'Draft for A';
    fixture.componentInstance.addComment();

    fixture.componentInstance.selectBug(issueB);
    fixture.componentInstance.commentBody = 'Draft for B';
    expect(fixture.componentInstance.commentSubmitting).toBe(false);
    expect(fixture.componentInstance.commentsLoading).toBe(true);
    expect(fixture.componentInstance.historyLoading).toBe(true);

    commentsA.next([comment]);
    commentsA.complete();
    historyA.next([historyEvent({ id: 10, eventType: 'COMMENT', reason: 'Stale timeline' })]);
    historyA.complete();
    postA.next(comment);
    postA.complete();
    await fixture.whenStable();

    expect(fixture.componentInstance.comments).toEqual([]);
    expect(fixture.componentInstance.history).toEqual([]);
    expect(fixture.componentInstance.commentBody).toBe('Draft for B');
    expect(fixture.componentInstance.commentSubmitting).toBe(false);
    expect(fixture.componentInstance.commentsLoading).toBe(true);
    expect(fixture.componentInstance.historyLoading).toBe(true);

    commentsB.next([]);
    commentsB.complete();
    historyB.next([]);
    historyB.complete();
    await fixture.whenStable();

    expect(fixture.componentInstance.commentsLoading).toBe(false);
    expect(fixture.componentInstance.historyLoading).toBe(false);
    expect(fixture.componentInstance.commentBody).toBe('Draft for B');
  });

  it('creates projects only for app admins and refreshes after a successful save', () => {
    const pendingCreate = new Subject<Project>();
    workspace.createProject.mockReturnValue(pendingCreate);
    currentUser.set({
      id: 1,
      email: 'admin@example.test',
      displayName: 'Admin',
      role: 'APP_ADMIN',
    });
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.createProjectForm.setValue({
      key: ' NEW ',
      name: ' New project ',
      description: '  ',
      leadUserId: 7,
    });

    component.createProject();
    component.createProject();

    expect(workspace.createProject).toHaveBeenCalledTimes(1);
    expect(workspace.createProject).toHaveBeenCalledWith({
      key: 'NEW',
      name: 'New project',
      description: null,
      leadUserId: 7,
    });
    expect(component.creatingProject).toBe(true);

    pendingCreate.next(project);
    pendingCreate.complete();

    expect(component.creatingProject).toBe(false);
    expect(component.createProjectForm.controls.key.value).toBe('');
    expect(workspace.getProjects).toHaveBeenCalledTimes(2);
  });

  it('preserves project form input after a failed create and rejects non-admins', () => {
    currentUser.set({ id: 11, email: 'user@example.test', displayName: 'User', role: 'USER' });
    workspace.createProject.mockReturnValue(throwError(() => ({ status: 409 })));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.createProjectForm.setValue({
      key: 'DUP',
      name: 'Duplicate project',
      description: 'Keep this description',
      leadUserId: 6,
    });

    component.createProject();
    expect(workspace.createProject).not.toHaveBeenCalled();

    currentUser.set({
      id: 1,
      email: 'admin@example.test',
      displayName: 'Admin',
      role: 'APP_ADMIN',
    });
    component.createProject();

    expect(component.createProjectForm.controls.key.value).toBe('DUP');
    expect(component.createProjectForm.controls.name.value).toBe('Duplicate project');
    expect(component.createProjectForm.controls.leadUserId.value).toBe(6);
    expect(component.createProjectError).toContain('already in use');
  });

  it('validates project and member IDs as positive whole numbers', () => {
    currentUser.set({
      id: 1,
      email: 'admin@example.test',
      displayName: 'Admin',
      role: 'APP_ADMIN',
    });
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.createProjectForm.setValue({
      key: 'JILA',
      name: 'JILA project',
      description: '',
      leadUserId: 1.5,
    });

    expect(component.createProjectForm.invalid).toBe(true);
    component.createProject();
    expect(workspace.createProject).not.toHaveBeenCalled();

    component.addMemberForm.setValue({ userId: 2.5, role: 'DEVELOPER' });
    expect(component.addMemberForm.invalid).toBe(true);
  });

  it('derives project-lead permissions from membership, separately from global admin', () => {
    currentUser.set({ id: 11, email: 'lead@example.test', displayName: 'Lead', role: 'USER' });
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.selectedProject = project;
    component.projectMembers = [{ userId: 11, displayName: 'Lead', role: 'PROJECT_LEAD' }];

    expect(component.currentProjectRole).toBe('PROJECT_LEAD');
    expect(component.canManageProjectMembers).toBe(true);
    expect(component.isAppAdmin).toBe(false);
    expect(component.availableMemberRoles).toEqual(['DEVELOPER', 'REPORTER']);

    component.addMemberForm.setValue({ userId: 12, role: 'PROJECT_LEAD' });
    component.addProjectMember();
    expect(workspace.addProjectMember).not.toHaveBeenCalled();

    workspace.addProjectMember.mockReturnValueOnce(throwError(() => ({ status: 403 })));
    component.addMemberForm.setValue({ userId: 12, role: 'DEVELOPER' });
    component.addProjectMember();
    expect(workspace.addProjectMember).toHaveBeenCalledWith(project.id, {
      userId: 12,
      role: 'DEVELOPER',
    });
    expect(component.addMemberForm.controls.userId.value).toBe(12);
    expect(component.addMemberError).toContain('not allowed');

    currentUser.set({
      id: 99,
      email: 'admin@example.test',
      displayName: 'Admin',
      role: 'APP_ADMIN',
    });
    component.projectMembers = [];
    expect(component.currentProjectRole).toBeNull();
    expect(component.canManageProjectMembers).toBe(true);
    expect(component.availableMemberRoles).toEqual(['PROJECT_LEAD', 'DEVELOPER', 'REPORTER']);
  });

  it('does not grant project-lead permission for an unknown role or unmatched user', () => {
    currentUser.set({ id: 11, email: 'user@example.test', displayName: 'User', role: 'UNKNOWN' });
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.selectedProject = project;
    component.projectMembers = [
      { userId: 11, displayName: 'User', role: 'UNKNOWN' as ProjectRole },
    ];

    expect(component.currentProjectRole).toBeNull();
    expect(component.canManageProjectMembers).toBe(false);
    expect(component.isAppAdmin).toBe(false);
  });

  it('prevents duplicate member saves while the first request is pending', () => {
    currentUser.set({ id: 11, email: 'lead@example.test', displayName: 'Lead', role: 'USER' });
    const pendingAdd = new Subject<void>();
    workspace.addProjectMember.mockReturnValue(pendingAdd);
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.selectedProject = project;
    component.projectMembers = [{ userId: 11, displayName: 'Lead', role: 'PROJECT_LEAD' }];
    component.addMemberForm.setValue({ userId: 12, role: 'REPORTER' });

    component.addProjectMember();
    component.addProjectMember();

    expect(workspace.addProjectMember).toHaveBeenCalledTimes(1);
    expect(component.addingMember).toBe(true);
    pendingAdd.next(undefined);
    pendingAdd.complete();

    expect(component.addingMember).toBe(false);
    expect(component.addMemberForm.controls.userId.value).toBeNull();
    expect(component.addMemberSuccess).toBe('Project member added.');
  });

  it('shows a 404 member lookup as unavailable and retries independently', () => {
    const member: ProjectMember = { userId: 12, displayName: 'Developer', role: 'DEVELOPER' };
    workspace.getProjectMembers
      .mockReturnValueOnce(throwError(() => ({ status: 404 })))
      .mockReturnValueOnce(of([member]));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;

    component.selectProject(project);
    expect(component.membersError).toContain('unavailable or this project is not accessible');
    expect(component.membersLoaded).toBe(false);
    expect(component.projectMembers).toEqual([]);

    component.retryProjectMembers();
    expect(component.membersError).toBe('');
    expect(component.membersLoaded).toBe(true);
    expect(component.projectMembers).toEqual([member]);
    expect(workspace.getProjectMembers).toHaveBeenCalledTimes(2);
  });

  it('assigns only a listed member and sends the current bug version', () => {
    const member: ProjectMember = { userId: 12, displayName: 'Developer', role: 'DEVELOPER' };
    const assignedBug = { ...issueA, assigneeId: member.userId, version: 3 };
    workspace.getProjectMembers.mockReturnValue(of([member]));
    workspace.getBug
      .mockReturnValueOnce(of({ ...detailFor(issueA), allowedActions: ['ASSIGN'] }))
      .mockReturnValueOnce(of({ ...detailFor(assignedBug), allowedActions: ['ASSIGN'] }));
    workspace.assignBug.mockReturnValue(of(assignedBug));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;

    component.selectProject(project);
    component.selectBug(issueA);
    component.assigneeUserId = 999;
    component.assignIssue();
    expect(workspace.assignBug).not.toHaveBeenCalled();
    expect(component.assignError).toContain('Choose a member');

    component.assigneeUserId = member.userId;
    component.assignIssue();
    expect(workspace.assignBug).toHaveBeenCalledWith(project.id, issueA.id, member.userId, 0);
    expect(component.selectedDetail?.bug.assigneeId).toBe(member.userId);
  });

  it('ignores stale member, issue-list, and assignment responses after selection changes', () => {
    const oldMembers = new Subject<ProjectMember[]>();
    const currentMembers = new Subject<ProjectMember[]>();
    const oldBugs = new Subject<Bug[]>();
    const currentBugs = new Subject<Bug[]>();
    const pendingAssignment = new Subject<Bug>();
    const projectB = { ...project, id: 4, key: 'NEXT', name: 'Next project' };
    workspace.getProjectMembers.mockImplementation((projectId) =>
      projectId === project.id ? oldMembers : currentMembers,
    );
    workspace.getBugs.mockImplementation((projectId) =>
      projectId === project.id ? oldBugs : currentBugs,
    );
    workspace.getBug.mockImplementation((_projectId, bugId) =>
      of({ ...detailFor(bugId === issueA.id ? issueA : issueB), allowedActions: ['ASSIGN'] }),
    );
    workspace.assignBug.mockReturnValue(pendingAssignment);
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;

    component.selectProject(project);
    component.selectProject(projectB);
    oldBugs.next([issueA]);
    oldMembers.next([{ userId: 1, displayName: 'Stale', role: 'DEVELOPER' }]);
    currentBugs.next([issueB]);
    currentMembers.next([{ userId: 2, displayName: 'Current', role: 'REPORTER' }]);

    expect(component.bugs).toEqual([issueB]);
    expect(component.projectMembers[0]?.displayName).toBe('Current');

    component.selectBug(issueA);
    component.assigneeUserId = 2;
    component.assignIssue();
    component.selectBug(issueB);
    pendingAssignment.next({ ...issueA, assigneeId: 2 });
    pendingAssignment.complete();

    expect(component.selectedBug?.id).toBe(issueB.id);
    expect(component.selectedDetail?.bug.id).toBe(issueB.id);
    expect(component.assignSubmitting).toBe(false);
  });

  it('applies supported filters, sorting, page size, and zero-based page reset', () => {
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.pageSize = 50;
    component.selectProject(project);

    expect(workspace.getBugs).toHaveBeenLastCalledWith(project.id, {
      text: '',
      status: '',
      priority: '',
      severity: '',
      page: 0,
      size: 50,
      sort: 'createdAt',
      direction: 'desc',
    });

    component.pageIndex = 4;
    component.filterText = ' login ';
    component.filterStatus = 'OPEN';
    component.filterPriority = 'HIGH';
    component.filterSeverity = 'MAJOR';
    component.sortField = 'updatedAt';
    component.sortDirection = 'asc';
    component.pageSize = 100;
    component.applyIssueFilters();

    expect(workspace.getBugs).toHaveBeenLastCalledWith(project.id, {
      text: ' login ',
      status: 'OPEN',
      priority: 'HIGH',
      severity: 'MAJOR',
      page: 0,
      size: 100,
      sort: 'updatedAt',
      direction: 'asc',
    });
    expect(component.pageIndex).toBe(0);
  });

  it('treats a short page as the last page and keeps the previous page after an empty next page', () => {
    const firstPage = [issueA, issueB];
    const secondPage = [issueB, issueA];
    const emptyNextPage = new Subject<Bug[]>();
    workspace.getBugs
      .mockReturnValueOnce(of(firstPage))
      .mockReturnValueOnce(of(secondPage))
      .mockReturnValueOnce(emptyNextPage)
      .mockReturnValueOnce(of([issueA]));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.pageSize = 2;
    component.selectProject(project);

    expect(component.hasNextPage).toBe(true);
    expect(component.pageIndex).toBe(0);
    component.nextBugPage();
    expect(component.pageIndex).toBe(1);
    expect(component.bugs).toEqual(secondPage);
    component.nextBugPage();
    expect(component.loadingBugs).toBe(true);

    emptyNextPage.next([]);
    emptyNextPage.complete();
    expect(component.bugs).toEqual(secondPage);
    expect(component.pageIndex).toBe(1);
    expect(component.hasNextPage).toBe(false);
    expect(component.noMoreIssues).toBe(true);

    component.previousBugPage();
    expect(component.pageIndex).toBe(0);
    expect(component.bugs).toEqual([issueA]);
    expect(component.hasNextPage).toBe(false);
  });

  it('marks fewer than page size results as the last page', () => {
    workspace.getBugs.mockReturnValue(of([issueA]));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.pageSize = 2;
    component.selectProject(project);

    expect(component.bugs).toEqual([issueA]);
    expect(component.hasNextPage).toBe(false);
  });

  it('ignores an issue-list response from the previously selected project', () => {
    const staleResponse = new Subject<Bug[]>();
    const currentResponse = new Subject<Bug[]>();
    const otherProject = { ...project, id: 4, key: 'NEXT' };
    workspace.getBugs.mockImplementation((projectId) =>
      projectId === project.id ? staleResponse : currentResponse,
    );
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.selectProject(project);
    component.selectProject(otherProject);
    staleResponse.next([issueA]);
    currentResponse.next([issueB]);

    expect(component.selectedProject?.id).toBe(otherProject.id);
    expect(component.bugs).toEqual([issueB]);
  });

  it('cancels an old filtered-list response and retries list failures without empty-success fallback', () => {
    const oldQuery = new Subject<Bug[]>();
    const latestQuery = new Subject<Bug[]>();
    workspace.getBugs
      .mockReturnValueOnce(throwError(() => ({ status: 404 })))
      .mockReturnValueOnce(oldQuery)
      .mockReturnValueOnce(latestQuery);
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;

    component.selectProject(project);
    expect(component.bugsError).toContain('unavailable or not accessible');
    expect(component.bugs).toEqual([]);
    component.retryBugs();
    component.filterText = 'latest';
    component.applyIssueFilters();
    oldQuery.next([issueA]);
    latestQuery.next([issueB]);

    expect(component.bugs).toEqual([issueB]);
    expect(component.bugsError).toBe('');
    expect(workspace.getBugs).toHaveBeenLastCalledWith(
      project.id,
      expect.objectContaining({ text: 'latest', page: 0 }),
    );
  });

  it('prevents duplicate issue creation and preserves the draft after validation failure', () => {
    const pendingCreate = new Subject<Bug>();
    workspace.createBug.mockReturnValue(pendingCreate);
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.mode = 'real';
    component.selectedProject = project;
    component.createForm.setValue({
      title: ' Draft issue ',
      description: ' Draft description ',
      priority: 'HIGH',
      severity: 'MAJOR',
    });

    component.submitBug();
    component.submitBug();
    expect(workspace.createBug).toHaveBeenCalledTimes(1);
    expect(workspace.createBug).toHaveBeenCalledWith(project.id, {
      title: 'Draft issue',
      description: 'Draft description',
      priority: 'HIGH',
      severity: 'MAJOR',
    });

    pendingCreate.error({ status: 422 });
    expect(component.creating).toBe(false);
    expect(component.createForm.controls.title.value).toBe(' Draft issue ');
    expect(component.createForm.controls.description.value).toBe(' Draft description ');
    expect(component.createError).toContain('could not be processed');
  });

  it('does not mislabel an issue-creation conflict as a version conflict', () => {
    workspace.createBug.mockReturnValue(throwError(() => ({ status: 409 })));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.mode = 'real';
    component.selectedProject = project;
    component.createForm.setValue({
      title: 'Issue title',
      description: 'Issue description',
      priority: 'MEDIUM',
      severity: 'MAJOR',
    });

    component.submitBug();

    expect(component.createError).toContain('conflicts with existing data');
    expect(component.createError).not.toContain('version');
    expect(component.createForm.controls.title.value).toBe('Issue title');
  });

  it('keeps edit drafts on a version conflict and offers latest-version review', () => {
    const latest = { ...issueA, version: 5, title: 'Latest server title' };
    workspace.updateBug.mockReturnValue(throwError(() => ({ status: 409 })));
    workspace.getBug.mockReturnValue(of({ ...detailFor(latest), allowedActions: ['EDIT_FIELDS'] }));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.mode = 'real';
    component.selectedProject = project;
    component.selectedBug = issueA;
    component.selectedDetail = { ...detailFor(issueA), allowedActions: ['EDIT_FIELDS'] };
    component.editTitle = 'My unsaved title';
    component.editDescription = 'My unsaved description';

    component.saveEdit();
    expect(component.editError).toContain('changed since it was loaded');
    expect(component.editConflict).toBe(component.editError);
    expect(component.editTitle).toBe('My unsaved title');

    component.reloadIssueForReview();
    expect(component.selectedDetail?.bug.version).toBe(5);
    expect(component.editTitle).toBe('My unsaved title');
    expect(component.editDescription).toBe('My unsaved description');
    expect(component.latestVersionNotice).toContain('draft is unchanged');
  });

  it('sends trimmed edit fields with the selected issue version', () => {
    const versionedIssue = { ...issueA, version: 8 };
    const saved = { ...versionedIssue, title: 'Updated title', description: 'Updated description' };
    workspace.updateBug.mockReturnValue(of(saved));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.mode = 'real';
    component.selectedProject = project;
    component.selectedBug = versionedIssue;
    component.selectedDetail = { ...detailFor(versionedIssue), allowedActions: ['EDIT_FIELDS'] };
    component.editTitle = ' Updated title ';
    component.editDescription = ' Updated description ';

    component.saveEdit();

    expect(workspace.updateBug).toHaveBeenCalledWith(project.id, issueA.id, {
      title: 'Updated title',
      description: 'Updated description',
      priority: versionedIssue.priority,
      severity: versionedIssue.severity,
      version: 8,
    });
    expect(component.editTitle).toBe('Updated title');
  });

  it.each([
    [0, 'Network request failed'],
    [401, 'session expired'],
    [403, 'Access denied'],
    [404, 'unavailable'],
    [409, 'changed since it was loaded'],
    [422, 'could not be processed'],
  ])('classifies issue update status %s without discarding the draft', (status, message) => {
    workspace.updateBug.mockReturnValue(throwError(() => ({ status })));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const component = fixture.componentInstance;
    component.selectedProject = project;
    component.selectedBug = issueA;
    component.selectedDetail = { ...detailFor(issueA), allowedActions: ['EDIT_FIELDS'] };
    component.editTitle = 'Draft issue title';
    component.editDescription = 'Draft issue description';

    component.saveEdit();

    expect(component.editError).toContain(message);
    expect(component.editTitle).toBe('Draft issue title');
    expect(component.editDescription).toBe('Draft issue description');
    if (status === 401) {
      expect(navigate).toHaveBeenCalledWith(['/login']);
      expect(currentUser()).toBeNull();
    }
    navigate.mockRestore();
  });

  it('uses allowedActions and the current issue version for reason-required transitions', () => {
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Required close reason');
    const versionedIssue = { ...issueA, version: 6 };
    workspace.transitionBug.mockReturnValue(of({ ...versionedIssue, status: 'CLOSED' }));
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.selectedProject = project;
    component.selectedBug = versionedIssue;
    component.selectedDetail = { ...detailFor(versionedIssue), allowedActions: [] };

    component.transition('CLOSED');
    expect(workspace.transitionBug).not.toHaveBeenCalled();

    component.selectedDetail = {
      ...detailFor(versionedIssue),
      allowedActions: ['CLOSE'],
    };
    component.transition('CLOSED');

    expect(workspace.transitionBug).toHaveBeenCalledWith(
      project.id,
      issueA.id,
      'CLOSED',
      6,
      'Required close reason',
    );
    prompt.mockRestore();
  });

  it('shows admin controls only to an APP_ADMIN and loads users with retry', () => {
    workspace.getAdminUsers
      .mockReturnValueOnce(throwError(() => ({ status: 0 })))
      .mockReturnValueOnce(of([adminUser]));
    currentUser.set({
      id: 1,
      email: 'admin@example.test',
      displayName: 'Admin',
      role: 'APP_ADMIN',
    });
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Admin controls');
    expect(fixture.nativeElement.textContent).toContain('Network request failed');
    const retry = fixture.nativeElement.querySelector(
      '.admin-controls button',
    ) as HTMLButtonElement;
    retry.click();
    fixture.detectChanges();

    expect(workspace.getAdminUsers).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('member@example.test');
  });

  it('does not request admin users or render admin controls for a regular user', () => {
    currentUser.set({
      id: 1,
      email: 'user@example.test',
      displayName: 'User',
      role: 'USER',
    });
    const fixture = TestBed.createComponent(WorkspaceComponent);
    fixture.detectChanges();

    expect(workspace.getAdminUsers).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#admin-controls')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Admin controls');
  });

  it('shows an admin project-creation action in the real empty-project state', () => {
    currentUser.set({
      id: 1,
      email: 'admin@example.test',
      displayName: 'Admin',
      role: 'APP_ADMIN',
    });
    const fixture = TestBed.createComponent(WorkspaceComponent);
    const component = fixture.componentInstance;
    component.mode = 'real';
    fixture.detectChanges();

    const createProject = fixture.nativeElement.querySelector(
      '.no-project-state button.create-submit',
    ) as HTMLButtonElement | null;
    expect(createProject).toBeDefined();
    createProject?.click();
    fixture.detectChanges();

    expect(component.showCreateProjectForm).toBe(true);
    expect(fixture.nativeElement.querySelector('#project-create-form')).not.toBeNull();
  });

  it('prevents duplicate user creation and retains the form after a conflict', () => {
    const pendingCreate = new Subject<AdminUser>();
    workspace.createAdminUser.mockReturnValue(pendingCreate);
    currentUser.set({
      id: 1,
      email: 'admin@example.test',
      displayName: 'Admin',
      role: 'APP_ADMIN',
    });
    const component = TestBed.createComponent(WorkspaceComponent).componentInstance;
    component.createAdminUserForm.setValue({
      email: 'new@example.test',
      displayName: 'New User',
      password: 'a-test-only-password',
      role: 'USER',
    });

    component.createAdminUser();
    component.createAdminUser();
    expect(workspace.createAdminUser).toHaveBeenCalledTimes(1);
    expect(workspace.createAdminUser).toHaveBeenCalledWith({
      email: 'new@example.test',
      displayName: 'New User',
      password: 'a-test-only-password',
      role: 'USER',
    });
    pendingCreate.error({ status: 409 });

    expect(component.creatingAdminUser).toBe(false);
    expect(component.createAdminUserError).toContain('already registered');
    expect(component.createAdminUserForm.controls.email.value).toBe('new@example.test');
    expect(component.createAdminUserForm.controls.password.value).toBe('a-test-only-password');
  });

  it('rejects invalid admin user input and clears the transient password after success', () => {
    currentUser.set({
      id: 1,
      email: 'admin@example.test',
      displayName: 'Admin',
      role: 'APP_ADMIN',
    });
    const component = TestBed.createComponent(WorkspaceComponent).componentInstance;
    component.createAdminUserForm.setValue({
      email: 'new@example.test',
      displayName: 'New User',
      password: 'short',
      role: 'USER',
    });

    component.createAdminUser();
    expect(workspace.createAdminUser).not.toHaveBeenCalled();
    expect(component.createAdminUserForm.controls.password.touched).toBe(true);

    component.createAdminUserForm.controls.password.setValue('long-test-only-password');
    component.createAdminUser();
    expect(workspace.createAdminUser).toHaveBeenCalledTimes(1);
    expect(component.createAdminUserForm.controls.password.value).toBe('');
    expect(component.createAdminUserSuccess).toContain('was created');
  });

  it('sends the selected global role while preserving role edits after an update failure', () => {
    workspace.updateAdminUser.mockReturnValue(throwError(() => ({ status: 404 })));
    currentUser.set({
      id: 1,
      email: 'admin@example.test',
      displayName: 'Admin',
      role: 'APP_ADMIN',
    });
    const component = TestBed.createComponent(WorkspaceComponent).componentInstance;
    component.adminUserEdits[adminUser.id] = { role: 'APP_ADMIN' };

    component.updateAdminUser(adminUser);

    expect(workspace.updateAdminUser).toHaveBeenCalledWith(adminUser.id, {
      role: 'APP_ADMIN',
      enabled: null,
    });
    expect(component.adminUserEdits[adminUser.id].role).toBe('APP_ADMIN');
    expect(component.adminUserUpdates[adminUser.id].error).toContain('no longer exists');
  });

  it('derives GitHub fullName, blocks duplicate binding and preserves failed form input', () => {
    const pendingBinding = new Subject<GitHubRepositoryBinding>();
    workspace.bindGitHubRepository.mockReturnValue(pendingBinding);
    currentUser.set({
      id: 1,
      email: 'admin@example.test',
      displayName: 'Admin',
      role: 'APP_ADMIN',
    });
    const component = TestBed.createComponent(WorkspaceComponent).componentInstance;
    component.bindGitHubForm.setValue({
      projectId: 3,
      installationId: 51,
      repositoryId: 29,
      owner: ' acme ',
      repositoryName: ' bugs ',
    });

    component.bindGitHubRepository();
    component.bindGitHubRepository();
    expect(workspace.bindGitHubRepository).toHaveBeenCalledTimes(1);
    expect(workspace.bindGitHubRepository).toHaveBeenCalledWith({
      projectId: 3,
      installationId: 51,
      repositoryId: 29,
      owner: 'acme',
      repositoryName: 'bugs',
      fullName: 'acme/bugs',
    });
    pendingBinding.error({ status: 409 });

    expect(component.bindingGitHubRepository).toBe(false);
    expect(component.bindGitHubError).toContain('already bound');
    expect(component.bindGitHubForm.controls.owner.value).toBe(' acme ');
    expect(component.bindGitHubForm.controls.repositoryName.value).toBe(' bugs ');

    workspace.bindGitHubRepository.mockReturnValue(
      of({ projectId: 3, repositoryId: 29, fullName: 'acme/bugs' }),
    );
    component.retryGitHubBinding();
    expect(workspace.bindGitHubRepository).toHaveBeenCalledTimes(2);
    expect(component.githubBindingResult).toEqual({
      projectId: 3,
      repositoryId: 29,
      fullName: 'acme/bugs',
    });
    expect(component.bindGitHubForm.controls.owner.value).toBe('');
  });

  it('rejects invalid GitHub IDs before sending the binding request', () => {
    currentUser.set({
      id: 1,
      email: 'admin@example.test',
      displayName: 'Admin',
      role: 'APP_ADMIN',
    });
    const component = TestBed.createComponent(WorkspaceComponent).componentInstance;
    component.bindGitHubForm.setValue({
      projectId: 0,
      installationId: 51,
      repositoryId: 29,
      owner: 'acme',
      repositoryName: 'bugs',
    });

    component.bindGitHubRepository();

    expect(workspace.bindGitHubRepository).not.toHaveBeenCalled();
    expect(component.bindGitHubForm.controls.projectId.touched).toBe(true);
  });
});
