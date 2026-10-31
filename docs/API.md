# REST API Reference Documentation

## Jira Lite Secure Bug Tracker

This document provides a comprehensive endpoint reference for the Jira Lite Secure Bug Tracker backend. All request/response contracts and validation rules reflect the controller implementations and integration tests.

---

## 1. Authentication Controller (`AuthController`)

**Base Path:** `/api/auth`

| Method | Path | Auth Required | Role Allowed | Request Body Fields | Response Fields | Status Codes | Validation Rules |
|---|---|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | **Public** | Any (Unauthenticated) | `email`: String<br/>`password`: String | `id`: Long<br/>`email`: String<br/>`displayName`: String<br/>`role`: String | `200 OK`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`403 Forbidden` | `email`: `@NotBlank`, max 254 chars.<br/>`password`: `@NotBlank`, max 72 chars.<br/>Requires matching `X-XSRF-TOKEN` header and `XSRF-TOKEN` cookie (403 if invalid). |
| `GET` | `/api/auth/config` | **Public** | Any (Unauthenticated) | *None* | `googleClientId`: String or null<br/>`googleEnabled`: Boolean | `200 OK` | Exposes public client ID for Google Sign-In widget. Returns `googleEnabled: false` if not configured. |
| `POST` | `/api/auth/google` | **Public** | Any (Unauthenticated) | `credential`: String | `id`: Long<br/>`email`: String<br/>`displayName`: String<br/>`role`: String | `200 OK`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`503 Service Unavailable` | Google sign-in is out of scope for this release. |
| `GET` | `/api/auth/me` | Yes | Any Authenticated | *None* | `id`: Long<br/>`email`: String<br/>`displayName`: String<br/>`role`: String | `200 OK`<br/>`401 Unauthorized` | Must provide active session cookie (`JSESSIONID`). |
| `POST` | `/api/auth/logout` | Yes | Any Authenticated | *None* | *None* (Empty body) | `204 No Content`<br/>`401 Unauthorized`<br/>`403 Forbidden` | Invalides session and deletes `JSESSIONID` cookie. Requires CSRF header. |

### Example Payloads (`AuthController`)

**Login Request:**
```json
{
  "email": "reporter@example.com",
  "password": "CorrectHorseBatteryStaple123"
}
```

**Google Auth Request:**
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Ni..."
}
```

**Auth Config Response:**
```json
{
  "googleClientId": "1234567890-abc.apps.googleusercontent.com",
  "googleEnabled": true
}
```

**Login / Google Auth / Me Response:**
```json
{
  "id": 1,
  "email": "reporter@example.com",
  "displayName": "Alice Smith",
  "role": "USER"
}
```

---

## 2. Signup Controller (`SignupController`)

**Base Path:** `/api/auth`

| Method | Path | Auth Required | Role Allowed | Request Body Fields | Response Fields | Status Codes | Validation Rules |
|---|---|---|---|---|---|---|---|
| `POST` | `/api/auth/signup` | **Public** | Any (Unauthenticated) | `email`: String<br/>`displayName`: String<br/>`password`: String | `id`: Long<br/>`email`: String<br/>`displayName`: String<br/>`role`: String | `201 Created`<br/>`400 Bad Request`<br/>`409 Conflict` | `email`: `@NotBlank`, `@Email`, max 254 chars.<br/>`displayName`: `@NotBlank`, max 100 chars.<br/>`password`: `@NotBlank`, min 12, max 72 chars (400 if violated).<br/>Email must be unique case-insensitively (409 if taken). Automatically assigns `GlobalRole.USER`. |

### Example Payloads (`SignupController`)

**Signup Request:**
```json
{
  "email": "newuser@example.com",
  "displayName": "New Team Member",
  "password": "SecurePassword2026!"
}
```

**Signup Response (`201 Created`):**
```json
{
  "id": 2,
  "email": "newuser@example.com",
  "displayName": "New Team Member",
  "role": "USER"
}
```

---

## 3. User Administration Controller (`UserAdminController`)

**Base Path:** `/api/admin/users`

| Method | Path | Auth Required | Role Allowed | Request Body Fields | Response Fields | Status Codes | Validation Rules |
|---|---|---|---|---|---|---|---|
| `GET` | `/api/admin/users` | Yes | `APP_ADMIN` | *None* | Array of:<br/>`id`: Long<br/>`email`: String<br/>`displayName`: String<br/>`role`: String | `200 OK`<br/>`401 Unauthorized`<br/>`403 Forbidden` | Restricted strictly to `APP_ADMIN`. Passwords and hashes are never exposed. |
| `POST` | `/api/admin/users` | Yes | `APP_ADMIN` | `email`: String<br/>`displayName`: String<br/>`password`: String<br/>`role`: String | `id`: Long<br/>`email`: String<br/>`displayName`: String<br/>`role`: String | `201 Created`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`403 Forbidden`<br/>`409 Conflict` | `email`: `@NotBlank`, `@Email`, max 254 chars.<br/>`displayName`: `@NotBlank`, max 100 chars.<br/>`password`: `@NotBlank`, min 12, max 72 chars.<br/>`role`: `@NotNull` enum (`USER` or `APP_ADMIN`). |
| `PATCH` | `/api/admin/users/{id}` | Yes | `APP_ADMIN` | `role`: String (Optional)<br/>`enabled`: Boolean (Optional) | `id`: Long<br/>`email`: String<br/>`displayName`: String<br/>`role`: String | `200 OK`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`403 Forbidden`<br/>`404 Not Found` | `role`: enum (`USER`, `APP_ADMIN`) if provided.<br/>`enabled`: boolean if provided.<br/>Target `id` must exist (404 otherwise). |

### Example Payloads (`UserAdminController`)

**Create User Request:**
```json
{
  "email": "developer@example.com",
  "displayName": "Dev User",
  "password": "LongValidPassword123",
  "role": "USER"
}
```

**Patch User Request:**
```json
{
  "role": "APP_ADMIN",
  "enabled": false
}
```

---

## 4. Project Controller (`ProjectController`)

**Base Path:** `/api/projects`

| Method | Path | Auth Required | Role Allowed | Request Body Fields | Response Fields | Status Codes | Validation Rules |
|---|---|---|---|---|---|---|---|
| `GET` | `/api/projects` | Yes | Any Authenticated | *None* | Array of:<br/>`id`: Long<br/>`key`: String<br/>`name`: String<br/>`description`: String | `200 OK`<br/>`401 Unauthorized` | Returns only projects where the authenticated caller has a record in `project_members`. |
| `GET` | `/api/projects/{projectId}/members` | Yes | Project Member (Any Role) | *None* | Array of:<br/>`userId`: Long<br/>`displayName`: String<br/>`role`: String | `200 OK`<br/>`401 Unauthorized`<br/>`404 Not Found` | Returns member roster sorted by `userId ASC`. Non-members receive 404 to avoid leaking project existence. |
| `POST` | `/api/projects` | Yes | `APP_ADMIN` | `key`: String<br/>`name`: String<br/>`description`: String<br/>`leadUserId`: Long | `id`: Long<br/>`key`: String<br/>`name`: String<br/>`description`: String | `201 Created`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`403 Forbidden`<br/>`404 Not Found`<br/>`409 Conflict` | `key`: `@NotBlank`, max 20 chars (must be unique case-insensitively, uppercase enforced).<br/>`name`: `@NotBlank`, max 100 chars.<br/>`description`: max 500 chars.<br/>`leadUserId`: `@NotNull` (must exist in `users`). Automatically creates `PROJECT_LEAD` membership for `leadUserId`. |
| `POST` | `/api/projects/{id}/members` | Yes | `APP_ADMIN` or Project's `PROJECT_LEAD` | `userId`: Long<br/>`role`: String | *None* (Empty body) | `204 No Content`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`403 Forbidden`<br/>`404 Not Found` | `userId`: `@NotNull` (user must exist).<br/>`role`: `@NotNull` (`REPORTER`, `DEVELOPER`, `PROJECT_LEAD`).<br/>A `PROJECT_LEAD` cannot appoint another `PROJECT_LEAD` (requires `APP_ADMIN`). |

### Example Payloads (`ProjectController`)

**Create Project Request:**
```json
{
  "key": "JILA",
  "name": "Jira Lite Application",
  "description": "Core defect tracking system",
  "leadUserId": 3
}
```

**Add Member Request:**
```json
{
  "userId": 5,
  "role": "DEVELOPER"
}
```

**List Members Response (`200 OK`):**
```json
[
  {
    "userId": 3,
    "displayName": "Lead Engineer",
    "role": "PROJECT_LEAD"
  },
  {
    "userId": 5,
    "displayName": "Bob Developer",
    "role": "DEVELOPER"
  }
]
```

---

## 5. Bug Controller (`BugController`)

**Base Path:** `/api/projects/{projectId}/bugs`

| Method | Path | Auth Required | Role Allowed | Request Body Fields | Response Fields | Status Codes | Validation Rules |
|---|---|---|---|---|---|---|---|
| `POST` | `/api/projects/{projectId}/bugs` | Yes | Project Member | `title`: String<br/>`description`: String<br/>`priority`: String<br/>`severity`: String | `BugResponse` (see schema below) | `201 Created`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`404 Not Found` | Caller must be a project member (404 otherwise).<br/>`title`: `@NotBlank`, 5-120 chars.<br/>`description`: `@NotBlank`, max 5000 chars.<br/>`priority`: `@NotNull` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).<br/>`severity`: `@NotNull` (`TRIVIAL`, `MINOR`, `MAJOR`, `CRITICAL`). |
| `GET` | `/api/projects/{projectId}/bugs` | Yes | Project Member | *Query parameters:*<br/>`text`: String<br/>`status`: String<br/>`priority`: String<br/>`severity`: String<br/>`page`: Int (def 0)<br/>`size`: Int (def 100)<br/>`sort`: String (def "createdAt")<br/>`direction`: String (def "desc") | Array of `BugResponse` | `200 OK`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`404 Not Found` | Caller must be project member.<br/>`page` >= 0; `size` 1-100.<br/>`sort` must be in: `createdAt`, `updatedAt`, `title`, `status`, `priority`.<br/>`direction` must be `asc` or `desc`. |
| `GET` | `/api/projects/{projectId}/bugs/{bugId}` | Yes | Project Member | *None* | `bug`: `BugResponse`<br/>`allowedActions`: Set of Strings | `200 OK`<br/>`401 Unauthorized`<br/>`404 Not Found` | Caller must be project member. Dynamic `allowedActions` includes eligible actions (`EDIT_FIELDS`, `ASSIGN`, `START`, `RESOLVE`, `CLOSE`, `REOPEN`). |
| `PATCH` | `/api/projects/{projectId}/bugs/{bugId}` | Yes | Project Lead OR (Reporter if status is `OPEN`) | `title`: String<br/>`description`: String<br/>`priority`: String<br/>`severity`: String<br/>`version`: Long | `BugResponse` | `200 OK`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`403 Forbidden`<br/>`404 Not Found`<br/>`409 Conflict` | Status must NOT be `CLOSED`.<br/>Optimistic locking: `version` must match current entity version (409 Conflict on mismatch). |
| `PUT` | `/api/projects/{projectId}/bugs/{bugId}/assignee` | Yes | `PROJECT_LEAD` | `userId`: Long<br/>`version`: Long | `BugResponse` | `200 OK`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`403 Forbidden`<br/>`404 Not Found`<br/>`409 Conflict` | Only `PROJECT_LEAD` can assign bugs.<br/>Target `userId` must be an existing project member (400 otherwise). `version` must match (409 on conflict). |
| `POST` | `/api/projects/{projectId}/bugs/{bugId}/transitions` | Yes | Assignee, Reporter, or Lead (by state) | `status`: String<br/>`reason`: String (Optional/Required)<br/>`version`: Long | `BugResponse` | `200 OK`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`403 Forbidden`<br/>`404 Not Found`<br/>`409 Conflict`<br/>`422 Unprocessable` | State transition must be valid (422 if invalid).<br/>`-> IN_PROGRESS` and `-> RESOLVED` require actor to be assignee (403 otherwise).<br/>`-> CLOSED` and `-> REOPENED` require actor to be reporter or project lead (403 otherwise) AND `reason` cannot be blank (400 if blank).<br/>`version` must match (409 on conflict). |
| `POST` | `/api/projects/{projectId}/bugs/{bugId}/comments` | Yes | Project Member | `body`: String | `id`: Long<br/>`authorId`: Long<br/>`body`: String<br/>`createdAt`: ISO Instant | `201 Created`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`404 Not Found` | `body`: `@NotBlank`, max 5000 chars. Appends to audit history. |
| `GET` | `/api/projects/{projectId}/bugs/{bugId}/comments` | Yes | Project Member | *None* | Array of `CommentResponse` | `200 OK`<br/>`401 Unauthorized`<br/>`404 Not Found` | Returns discussion comments ordered by `createdAt ASC`. |
| `GET` | `/api/projects/{projectId}/bugs/{bugId}/history` | Yes | Project Member | *None* | Array of `HistoryResponse` | `200 OK`<br/>`401 Unauthorized`<br/>`404 Not Found` | Returns immutable audit history events ordered by `createdAt ASC`. |

### `BugResponse` JSON Schema
```json
{
  "id": 42,
  "key": "JILA-42",
  "projectId": 1,
  "title": "NullPointerException when opening user profile",
  "description": "Clicking avatar triggers NPE in controller",
  "priority": "HIGH",
  "severity": "MAJOR",
  "status": "OPEN",
  "reporterId": 5,
  "assigneeId": null,
  "resolution": null,
  "version": 0,
  "createdAt": "2026-10-30T21:00:00Z",
  "updatedAt": "2026-10-30T21:00:00Z"
}
```

### Example Payloads (`BugController`)

**Create Bug Request:**
```json
{
  "title": "NullPointerException when opening user profile",
  "description": "Clicking avatar triggers NPE in controller",
  "priority": "HIGH",
  "severity": "MAJOR"
}
```

**Assign Bug Request:**
```json
{
  "userId": 8,
  "version": 0
}
```

**Status Transition Request (`RESOLVED -> CLOSED`):**
```json
{
  "status": "CLOSED",
  "reason": "Verified fix in staging build v1.2.0",
  "version": 2
}
```

**Add Comment Request:**
```json
{
  "body": "Root cause identified in UserService line 45."
}
```

---

## 6. Bug Attachment Controller (`BugAttachmentController`)

**Base Path:** `/api/bugs/{key}/attachments`

| Method | Path | Auth Required | Role Allowed | Request Body Fields | Response Fields | Status Codes | Validation Rules |
|---|---|---|---|---|---|---|---|
| `POST` | `/api/bugs/{key}/attachments` | Yes | Project Member | Multipart form part `file` (Binary) | `id`: Long<br/>`bugKey`: String<br/>`fileName`: String<br/>`contentType`: String | `201 Created`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`404 Not Found`<br/>`413 Payload Too Large` | Caller must be a member of the project owning the bug (404 otherwise).<br/>File must be non-empty and <= 10 MB (413 if exceeded).<br/>Filename cannot contain `".."`. |
| `GET` | `/api/bugs/{key}/attachments/{id}` | Yes | Project Member | *None* | Binary Stream (`Resource`) | `200 OK`<br/>`401 Unauthorized`<br/>`404 Not Found` | Must be a project member. Sets `Content-Disposition: attachment; filename="<original_name>"`. Re-verifies canonical storage path containment. |

### Example Payloads (`BugAttachmentController`)

**Upload Response (`201 Created`):**
```json
{
  "id": 1,
  "bugKey": "JILA-42",
  "fileName": "error_stacktrace.log",
  "contentType": "text/plain"
}
```

---

## 7. GitHub Admin Controller (`GitHubAdminController`)

**Base Path:** `/api/admin/github`

| Method | Path | Auth Required | Role Allowed | Request Body Fields | Response Fields | Status Codes | Validation Rules |
|---|---|---|---|---|---|---|---|
| `POST` | `/api/admin/github/repositories` | Yes | `APP_ADMIN` | `projectId`: Long<br/>`installationId`: Long<br/>`repositoryId`: Long<br/>`owner`: String<br/>`repositoryName`: String<br/>`fullName`: String | `projectId`: Long<br/>`repositoryId`: Long<br/>`fullName`: String | `201 Created`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`403 Forbidden`<br/>`404 Not Found`<br/>`409 Conflict` | Restricted to `APP_ADMIN`.<br/>`owner` and `repositoryName` must concatenate to `fullName` (`owner + "/" + repositoryName == fullName`).<br/>Project and repository ID must not already be bound (409 Conflict if either is bound). |

### Example Payloads (`GitHubAdminController`)

**Bind Repository Request:**
```json
{
  "projectId": 1,
  "installationId": 1045,
  "repositoryId": 98765432,
  "owner": "octocat",
  "repositoryName": "bug-tracker-repo",
  "fullName": "octocat/bug-tracker-repo"
}
```

**Bind Repository Response (`201 Created`):**
```json
{
  "projectId": 1,
  "repositoryId": 98765432,
  "fullName": "octocat/bug-tracker-repo"
}
```

---

## 8. GitHub Webhook Controller (`GitHubWebhookController`)

**Base Path:** `/api/integrations/github`

| Method | Path | Auth Required | Role Allowed | Request Body Fields | Response Fields | Status Codes | Validation Rules |
|---|---|---|---|---|---|---|---|
| `POST` | `/api/integrations/github/webhook` | **Public** (HMAC-SHA256 Signature Verified) | GitHub Webhook Service | Raw GitHub Event JSON Payload | *None* (Empty body) | `202 Accepted`<br/>`400 Bad Request`<br/>`401 Unauthorized`<br/>`503 Service Unavailable` | `503` if `JILA_GITHUB_WEBHOOK_SECRET` is not set.<br/>Header `X-Hub-Signature-256` verified over raw request bytes via HMAC-SHA256 (401 if invalid).<br/>`X-GitHub-Event` must be `push` or `pull_request` (400 if unsupported).<br/>Deduplicates deliveries by `X-GitHub-Delivery` ID. |

---

## 9. Global Security Headers & CORS Policy

All HTTP responses emitted by the Spring Security filter chain enforce the following security headers:

| Header | Configured Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS on modern user agents for 1 year across all subdomains. |
| `X-Content-Type-Options` | `nosniff` | Blocks MIME-type sniffing attacks. |
| `X-Frame-Options` | `DENY` | Prevents framing or clickjacking across all pages. |
| `Referrer-Policy` | `no-referrer` | Disallows transmitting referrer headers to third parties. |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` | Restrictive CSP tailored for API responses blocking resource loads and embedding. |

### CORS Configuration
Cross-Origin Resource Sharing is explicitly managed via `CorsConfigurationSource`:
- **Allowed Origins:** Configured via `app.cors.allowed-origins` property (defaults to `http://localhost:4200,http://127.0.0.1:4200`). Wildcard (`*`) origins are rejected when credentials are enabled.
- **Allowed Methods:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- **Allowed Headers:** `Authorization`, `Content-Type`, `X-XSRF-TOKEN`.
- **Credentials:** `allowCredentials: true` supported with exact origin validation.
