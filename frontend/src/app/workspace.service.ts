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
}
