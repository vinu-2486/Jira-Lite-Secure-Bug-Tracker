# Implementation Status & Changelog

## Jira Lite Secure Bug Tracker

This document provides a transparent, truthful assessment of the current state of the Jira Lite Secure Bug Tracker codebase, distinguishing completed capabilities from partial implementations and non-implemented features.

---

## 1. What Is Done (Completed Implementation)

The following components and features are fully implemented in the codebase and verified by automated tests:

### 1.1 Authentication & Security Architecture
- **Password Salting & Hashing:** Implemented via Spring Security's `DelegatingPasswordEncoder` defaulting to adaptive BCrypt (`{bcrypt}$2a$10$...`).
- **Password Complexity Rules:** Enforces 12-character minimum and 72-character maximum lengths in `PasswordPolicy.validate()`.
- **Session Authentication:** Implements stateful HTTP sessions with `JSESSIONID` cookie security (`http-only: true`, `same-site: lax`, 30-minute expiration, configurable HTTPS `secure` flag).
- **Session Fixation Defense:** Invokes `request.changeSessionId()` upon successful login.
- **Brute-Force Account Lockout:** Tracks failed logins in `LoginAttemptService`. Automatically locks accounts for 15 minutes after 5 consecutive failures.
- **Uniform Error Handling:** Returns identical HTTP 401 Unauthorized messages for missing accounts, wrong passwords, disabled users, or locked accounts to prevent user enumeration.
- **CSRF Defense for SPA:** Implements Spring Security SPA CSRF configuration, `CsrfCookieFilter` for `XSRF-TOKEN` cookie exposure, and header verification (`X-XSRF-TOKEN`).
- **HTTP Security Headers:** Spring Security enforces HSTS (`max-age=31536000; includeSubDomains`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and restrictive `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`.
- **Explicit CORS Policy:** `CorsConfigurationSource` resolves permitted origins from `app.cors.allowed-origins`, methods GET, POST, PUT, PATCH, DELETE, OPTIONS, headers Authorization, Content-Type, X-XSRF-TOKEN, and disallows wildcards with credentials.
- **Google Sign-In:** Google sign-in is out of scope for this release.
- **First-Run Bootstrap:** `AdminBootstrap` checks `users.role` on startup and provisions an initial `APP_ADMIN` if the table contains zero administrators and environment credentials are provided.

### 1.2 Access Control & Project Isolation
- **Dual-Tier Role Model:** Distinguishes global roles (`GlobalRole`: `USER`, `APP_ADMIN`) from project-level roles (`ProjectRole`: `PROJECT_LEAD`, `DEVELOPER`, `REPORTER`).
- **Administrative Endpoints:** URL-level protection restricts `/api/admin/**` exclusively to `APP_ADMIN`.
- **Project Creation:** Restricted to `APP_ADMIN`. Automatically designates the project lead as a `PROJECT_LEAD` member.
- **Project Membership Management:** Only `APP_ADMIN` or the project's `PROJECT_LEAD` may add members. Project Leads cannot appoint other Project Leads unless they possess global `APP_ADMIN` privileges.
- **Tenant Isolation:** Controller and service layers strictly verify `project_members` records. Requests to non-member projects return HTTP 404 Not Found to prevent resource enumeration.

### 1.3 Defect Tracking & Bug Lifecycle
- **Bug Key Generation:** Generates structured, unique bug keys in the format `<PROJECT_KEY>-<ID>` (e.g., `JILA-42`).
- **Defect State Machine:** Implements five statuses (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REOPENED`) and enforces explicit transition rules.
- **Transition Authorization:** Restricts `IN_PROGRESS` and `RESOLVED` transitions to assignees; restricts `CLOSED` and `REOPENED` transitions to reporters or project leads.
- **Mandatory Reopening / Closing Reasons:** Requires a non-blank reason when moving to `CLOSED` or `REOPENED`. Clears the resolution when reopening.
- **Bug Assignment:** Restricted to `PROJECT_LEAD` and validates that the assignee is an existing member of the project.
- **Optimistic Concurrency Control & Fresh Version Return:** Enforces JPA `@Version` on all mutating bug operations. Uses `saveAndFlush(bug)` so that updated entities return the fresh incremented version for client reuse.
- **Discussion Comments:** Enables project members to post and retrieve timestamped comments on bugs.
- **Audit History Trail:** Automatically records all changes (creations, field edits, assignments, transitions, comments, and external GitHub references) in the `bug_history` table.

### 1.4 Attachment Management
- **Size Bounds:** Enforces a 10 MB per-file upload limit.
- **Path Traversal Defense:** Sanitizes filenames and rejects paths containing `".."`.
- **Storage Decoupling:** Generates random UUID storage filenames on disk, isolating the original filenames and MIME types in MySQL.
- **Secure Retrieval:** Validates project membership before streaming attachment files.

### 1.5 GitHub Tracking Webhook Ingestion
- **HMAC-SHA256 Signature Verification:** Verifies incoming raw request bytes against `X-Hub-Signature-256`.
- **Event Filtering:** Validates supported events (`push` and `pull_request`).
- **Deduplication:** Prevents duplicate processing using the unique `X-GitHub-Delivery` ID header.
- **Asynchronous Ingestion:** Processes commits and PR references asynchronously without blocking the webhook acknowledgment.

### 1.6 Database, CI Pipeline & Frontend
- **Flyway Migrations:** 11 committed migrations (`V1` through `V11`) managing table creation, constraint updates, Google identity support, and indexes.
- **Continuous Integration Pipeline:** Automated 3-job workflow (`backend`, `frontend`, `dependency-scan`) running on MySQL 8.4, JDK 21, and Node 24. NVD cache split across `restore` and `always()` save with 60-minute timeout.
- **Code Quality:** Checkstyle rule enforcing logger usage over direct console output.
- **Linear-Inspired Light Theme Frontend:** Full Angular UI redesign with 240px fixed left sidebar, top bar with JILA brand mark, 4 stat cards, single-row toolbar with table, slide-over issue creator, and 2-column issue detail view.

---

## 2. What Is Partially Done (Functional with Constraints)

| Feature | Current State | Operational Constraint / Limitation |
|---|---|---|
| **GitHub Integration Activation** | Controller, signature verification, repository binding, and regex reference extraction are fully implemented. | Activation requires out-of-band GitHub App installation by the repository owner, configuration of read-only permissions, and an HTTPS reverse proxy with the `JILA_GITHUB_WEBHOOK_SECRET` environment variable. |
| **Bug Listing, Search & Pagination** | `BugService.listBugs` supports keyword text filtering, status, priority, severity filters, pagination, and sorting. | Filtering, sorting, and pagination currently execute in JVM memory after fetching all project bugs from MySQL, rather than pushing `WHERE`, `ORDER BY`, and `LIMIT` clauses to the database. |
| **Administrator Bootstrapping** | `AdminBootstrap` provisions the initial administrator during application startup. | It only runs once when no admin exists; dynamic password resets or CLI management tools are not implemented. |

---

## 3. What Is Not Done (Out of Scope / Missing)

| Feature / Capability | Status | Justification / Source Code Evidence |
|---|---|---|
| **Spring Boot Actuator Health Check** | **Not implemented** | `/actuator/health` is permitted in `SecurityConfig.java`, but `spring-boot-starter-actuator` is omitted from `backend/pom.xml`. The endpoint returns HTTP 404 at runtime. |
| **IP-Based API Rate Limiting** | **Not implemented** | General rate limiting (via token bucket or Redis) is not implemented on API or authentication routes. Brute-force protection relies solely on account locking. |
| **Password Deny-List** | **Not implemented** | Deny-list validation for common passwords is noted as a `// TODO` in `PasswordPolicy.java`. |
| **Attachment Malware / Virus Scanning** | **Not implemented** | Uploaded binary files are checked for size and path traversal, but are not passed through an antivirus engine like ClamAV. |
| **Cloud Object Storage (S3 / GCS)** | **Not implemented** | Attachments are stored on the local backend filesystem. Multi-instance distributed storage is not implemented. |
| **Project Deletion & Bug Deletion** | **Not implemented** | There are no DELETE endpoints for bugs or projects; data removal must be handled via direct SQL. |
| **Email & Push Notifications** | **Not implemented** | No mail sender or notification mechanism is implemented for bug assignments, comments, or status changes. |
