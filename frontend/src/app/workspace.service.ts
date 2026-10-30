import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Project {
  id: number;
  key: string;
  name: string;
  description: string | null;
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

  getBugs(projectId: number): Observable<Bug[]> {
    return this.http.get<Bug[]>(`/api/projects/${projectId}/bugs`);
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
