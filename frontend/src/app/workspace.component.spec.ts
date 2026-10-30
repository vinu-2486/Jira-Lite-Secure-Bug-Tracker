import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import {
  Bug,
  BugDetail,
  Comment,
  HistoryEvent,
  Project,
  WorkspaceService,
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
  const project: Project = {
    id: 3,
    key: 'JILA',
    name: 'JILA project',
    description: null,
  };
  const workspace = {
    getProjects: vi.fn<() => Observable<Project[]>>(),
    createBug: vi.fn(() => of(savedBug)),
    getBug: vi.fn<(projectId: number, bugId: number) => Observable<BugDetail>>(),
    getComments: vi.fn<(projectId: number, bugId: number) => Observable<Comment[]>>(),
    addComment: vi.fn<(projectId: number, bugId: number, body: string) => Observable<Comment>>(),
    getHistory: vi.fn<(projectId: number, bugId: number) => Observable<HistoryEvent[]>>(),
  };

  beforeEach(async () => {
    workspace.getProjects.mockClear();
    workspace.createBug.mockClear();
    workspace.getBug.mockReset();
    workspace.getComments.mockReset();
    workspace.addComment.mockReset();
    workspace.getHistory.mockReset();
    workspace.getProjects.mockReturnValue(of([]));
    workspace.createBug.mockReturnValue(of(savedBug));
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
          useValue: { currentUser: signal(null), logout: vi.fn(() => of(void 0)) },
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
});
