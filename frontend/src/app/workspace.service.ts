import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Project {
  id: number;
  key: string;
  name: string;
  description: string | null;
}

export type ProjectRole = 'PROJECT_LEAD' | 'DEVELOPER' | 'REPORTER';

export interface ProjectMember {
  userId: number;
  displayName: string;
  role: ProjectRole;
}

export interface CreateProjectRequest {
  key: string;
  name: string;
  description: string | null;
  leadUserId: number;
}

export interface AddProjectMemberRequest {
  userId: number;
  role: ProjectRole;
}

export type GlobalRole = 'USER' | 'APP_ADMIN';

export interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  role: string;
}

export interface CreateAdminUserRequest {
  email: string;
  displayName: string;
  password: string;
  role: GlobalRole;
}

export interface UpdateAdminUserRequest {
  role: GlobalRole | null;
  enabled: boolean | null;
}

export interface BindGitHubRepositoryRequest {
  projectId: number;
  installationId: number;
  repositoryId: number;
  owner: string;
  repositoryName: string;
  fullName: string;
}

export interface GitHubRepositoryBinding {
  projectId: number;
  repositoryId: number;
  fullName: string;
}

export type BugPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BugSeverity = 'TRIVIAL' | 'MINOR' | 'MAJOR' | 'CRITICAL';
export type BugStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';

export interface Bug {
  id: number;
  key: string;
  projectId: number;
  title: string;
  description: string;
  priority: BugPriority;
  severity: BugSeverity;
  status: BugStatus;
  reporterId: number;
  assigneeId: number | null;
  resolution: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type BugSortField = 'createdAt' | 'updatedAt' | 'title' | 'status' | 'priority';
export type SortDirection = 'asc' | 'desc';

export interface BugListQuery {
  text?: string;
  status?: BugStatus | '';
  priority?: BugPriority | '';
  severity?: BugSeverity | '';
  page: number;
  size: number;
  sort: BugSortField;
  direction: SortDirection;
}

export interface CreateBugRequest {
  title: string;
  description: string;
  priority: BugPriority;
  severity: BugSeverity;
}

export interface BugDetail {
  bug: Bug;
  allowedActions: string[];
}

export interface UpdateBugRequest {
  title: string;
  description: string;
  priority: BugPriority;
  severity: BugSeverity;
  version: number;
}

export interface Comment {
  id: number;
  authorId: number;
  body: string;
  createdAt: string;
}

export interface HistoryEvent {
  id: number;
  actorId: number | null;
  eventType: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  externalAuthor: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  constructor(private readonly http: HttpClient) {}

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>('/api/projects');
  }

  createProject(request: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>('/api/projects', request);
  }

  getProjectMembers(projectId: number): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(`/api/projects/${projectId}/members`);
  }

  addProjectMember(projectId: number, request: AddProjectMemberRequest): Observable<void> {
    return this.http.post<void>(`/api/projects/${projectId}/members`, request);
  }

  getAdminUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>('/api/admin/users');
  }

  createAdminUser(request: CreateAdminUserRequest): Observable<AdminUser> {
    return this.http.post<AdminUser>('/api/admin/users', request);
  }

  updateAdminUser(userId: number, request: UpdateAdminUserRequest): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`/api/admin/users/${userId}`, request);
  }

  bindGitHubRepository(request: BindGitHubRepositoryRequest): Observable<GitHubRepositoryBinding> {
    return this.http.post<GitHubRepositoryBinding>('/api/admin/github/repositories', request);
  }

  getBugs(projectId: number, query: BugListQuery): Observable<Bug[]> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('size', query.size)
      .set('sort', query.sort)
      .set('direction', query.direction);
    if (query.text?.trim()) params = params.set('text', query.text.trim());
    if (query.status) params = params.set('status', query.status);
    if (query.priority) params = params.set('priority', query.priority);
    if (query.severity) params = params.set('severity', query.severity);
    return this.http.get<Bug[]>(`/api/projects/${projectId}/bugs`, { params });
  }

  createBug(projectId: number, request: CreateBugRequest): Observable<Bug> {
    return this.http.post<Bug>(`/api/projects/${projectId}/bugs`, request);
  }

  getBug(projectId: number, bugId: number): Observable<BugDetail> {
    return this.http.get<BugDetail>(`/api/projects/${projectId}/bugs/${bugId}`);
  }

  updateBug(projectId: number, bugId: number, request: UpdateBugRequest): Observable<Bug> {
    return this.http.patch<Bug>(`/api/projects/${projectId}/bugs/${bugId}`, request);
  }

  assignBug(projectId: number, bugId: number, userId: number, version: number): Observable<Bug> {
    return this.http.put<Bug>(`/api/projects/${projectId}/bugs/${bugId}/assignee`, {
      userId,
      version,
    });
  }

  transitionBug(
    projectId: number,
    bugId: number,
    status: BugStatus,
    version: number,
    reason?: string,
  ): Observable<Bug> {
    return this.http.post<Bug>(`/api/projects/${projectId}/bugs/${bugId}/transitions`, {
      status,
      version,
      reason,
    });
  }

  getComments(projectId: number, bugId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`/api/projects/${projectId}/bugs/${bugId}/comments`);
  }

  addComment(projectId: number, bugId: number, body: string): Observable<Comment> {
    return this.http.post<Comment>(`/api/projects/${projectId}/bugs/${bugId}/comments`, { body });
  }

  getHistory(projectId: number, bugId: number): Observable<HistoryEvent[]> {
    return this.http.get<HistoryEvent[]>(`/api/projects/${projectId}/bugs/${bugId}/history`);
  }
}
