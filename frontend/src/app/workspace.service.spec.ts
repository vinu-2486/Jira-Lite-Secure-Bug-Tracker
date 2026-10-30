import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspaceService } from './workspace.service';

describe('WorkspaceService project endpoints', () => {
  let service: WorkspaceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WorkspaceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the checked-out project creation DTO to the existing endpoint', () => {
    const request = {
      key: 'JILA',
      name: 'JILA project',
      description: null,
      leadUserId: 7,
    };
    service.createProject(request).subscribe();

    const result = http.expectOne('/api/projects');
    expect(result.request.method).toBe('POST');
    expect(result.request.body).toEqual(request);
    result.flush({ id: 3, ...request });
  });

  it('reads the stated project-member array from the reported endpoint', () => {
    const members = [{ userId: 7, displayName: 'Project lead', role: 'PROJECT_LEAD' }];
    let response: unknown;
    service.getProjectMembers(3).subscribe((value) => (response = value));

    const result = http.expectOne('/api/projects/3/members');
    expect(result.request.method).toBe('GET');
    result.flush(members);

    expect(response).toEqual(members);
  });

  it('posts the supported member DTO to the checked-out add-member endpoint', () => {
    const request = { userId: 12, role: 'DEVELOPER' as const };
    service.addProjectMember(3, request).subscribe();

    const result = http.expectOne('/api/projects/3/members');
    expect(result.request.method).toBe('POST');
    expect(result.request.body).toEqual(request);
    result.flush(null);
  });

  it('uses the confirmed admin user list, create and role-update contracts', () => {
    const user = {
      id: 12,
      email: 'member@example.test',
      displayName: 'Member',
      role: 'USER',
    };
    let listedUsers: unknown;
    service.getAdminUsers().subscribe((users) => (listedUsers = users));
    const list = http.expectOne('/api/admin/users');
    expect(list.request.method).toBe('GET');
    list.flush([user]);
    expect(listedUsers).toEqual([user]);

    const createRequest = {
      email: 'new@example.test',
      displayName: 'New User',
      password: 'a-test-only-password',
      role: 'USER' as const,
    };
    service.createAdminUser(createRequest).subscribe();
    const create = http.expectOne('/api/admin/users');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(createRequest);
    create.flush({ ...user, email: createRequest.email, displayName: createRequest.displayName });

    const updateRequest = { role: 'APP_ADMIN' as const, enabled: null };
    service.updateAdminUser(12, updateRequest).subscribe();
    const update = http.expectOne('/api/admin/users/12');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual(updateRequest);
    update.flush({ ...user, role: 'APP_ADMIN' });
  });

  it('posts only the confirmed repository-binding fields and returns binding details', () => {
    const request = {
      projectId: 3,
      installationId: 51,
      repositoryId: 29,
      owner: 'acme',
      repositoryName: 'bugs',
      fullName: 'acme/bugs',
    };
    const response = { projectId: 3, repositoryId: 29, fullName: 'acme/bugs' };
    let binding: unknown;
    service.bindGitHubRepository(request).subscribe((value) => (binding = value));

    const result = http.expectOne('/api/admin/github/repositories');
    expect(result.request.method).toBe('POST');
    expect(result.request.body).toEqual(request);
    result.flush(response);

    expect(binding).toEqual(response);
  });

  it('sends only supported bug-list filters and zero-based pagination parameters', () => {
    let response: unknown;
    service
      .getBugs(3, {
        text: ' login ',
        status: 'OPEN',
        priority: 'HIGH',
        severity: 'MAJOR',
        page: 2,
        size: 50,
        sort: 'updatedAt',
        direction: 'asc',
      })
      .subscribe((value) => (response = value));

    const result = http.expectOne((request) => request.url === '/api/projects/3/bugs');
    expect(result.request.method).toBe('GET');
    expect(result.request.params.keys().sort()).toEqual([
      'direction',
      'page',
      'priority',
      'severity',
      'size',
      'sort',
      'status',
      'text',
    ]);
    expect(result.request.params.get('page')).toBe('2');
    expect(result.request.params.get('size')).toBe('50');
    expect(result.request.params.get('text')).toBe('login');
    expect(result.request.params.get('sort')).toBe('updatedAt');
    expect(result.request.params.get('direction')).toBe('asc');
    expect(result.request.params.has('assignee')).toBe(false);
    result.flush([]);
    expect(response).toEqual([]);
  });

  it('omits empty optional bug-list filters', () => {
    service
      .getBugs(3, {
        text: ' ',
        status: '',
        priority: '',
        severity: '',
        page: 0,
        size: 25,
        sort: 'createdAt',
        direction: 'desc',
      })
      .subscribe();

    const result = http.expectOne((request) => request.url === '/api/projects/3/bugs');
    expect(result.request.params.keys().sort()).toEqual(['direction', 'page', 'size', 'sort']);
    result.flush([]);
  });
});
