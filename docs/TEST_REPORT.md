# Verification and Test Report

## Jira Lite Secure Bug Tracker

---

## 1. Test Strategy

The verification strategy employs a layered testing architecture covering unit, integration, security, and concurrency controls:

### 1.1 Unit Testing Strategy
- Utilizes JUnit 5 and Mockito to verify service and controller business logic in isolation without starting the Spring context or provisioning external infrastructure.
- Isolates boundaries using `@Mock`, `@InjectMocks`, and `ArgumentCaptor` to assert method parameters, state transitions, and error handling.
- Validates edge cases including input validation bounds, unauthorized actors, and missing reason strings.

### 1.2 Integration Testing Strategy
- Uses `@SpringBootTest` with `@AutoConfigureMockMvc` against a dedicated MySQL 8.4 schema running on a loopback interface (`127.0.0.1`).
- Enforces strict database safety via `IsolatedDatabaseTestSupport`: validates that the JDBC target is loopback, that ports are non-privileged, and that no unsafe overrides exist in system properties or environment variables.
- Verifies full-stack integration across HTTP request processing, filter chains, Flyway migrations, JPA entity mappings, and database constraint enforcement.

### 1.3 Security Testing Strategy
- Asserts that unauthenticated requests to protected administrative and project endpoints return HTTP 401 Unauthorized.
- Validates role-based authorization: tests that standard authenticated `USER` accounts receive HTTP 403 Forbidden when attempting administrative operations.
- Verifies CSRF protection: asserts that mutation requests lacking the `X-XSRF-TOKEN` header or bearing invalid tokens return HTTP 403 Forbidden.
- Tests password masking: verifies that administrative and project API JSON responses never expose passwords, password hashes, or sensitive credentials.
- Validates brute-force lockout: tests that 5 consecutive failed login attempts trigger a 15-minute account lock and that successful logins reset the failure counter.
- Validates webhook authentication: tests that forged HMAC-SHA256 signatures are rejected before any database insertion or queueing occurs.

### 1.4 Concurrency Testing Strategy
- Tests optimistic locking controls using JPA `@Version`: ensures that conflicting concurrent updates on bugs with stale version numbers trigger HTTP 409 Conflict rather than silently overwriting data.

---

## 2. Test Class Inventory

The backend test suite comprises the following test classes:

| Test Class | Focus & Verification Scope |
|---|---|
| `BackendApplicationTests` | Verifies that the Spring application context initializes successfully and connects to the dedicated isolated MySQL test schema. |
| `AdminApiSecurityIntegrationTest` | Full-stack MockMvc integration test verifying administrative security boundaries, CSRF enforcement, user creation/patching, password hashing, and GitHub repository binding. |
| `BugAttachmentControllerTest` | Unit test verifying attachment uploads, downloads, 10 MB size limits, project membership checks, and filesystem cleanup. |
| `BugServiceTest` | Unit test verifying bug listing, project-scoped visibility, optimistic locking, transition permissions, assignment rules, reopen logic, and fresh entity version returns via `saveAndFlush`. |
| `SecurityConfigTest` | Unit test verifying explicit CORS origin resolution, wildcard rejection with credentials, allowed HTTP methods/headers, and defense-in-depth security headers (HSTS, nosniff, DENY, no-referrer, CSP). |
| Google Sign-In | Google sign-in is out of scope for this release. |
| `GitHubWebhookControllerTest` | Unit test verifying HMAC-SHA256 signature verification over raw request bytes and delivery deduplication. |
| `ProjectControllerTest` | Unit test verifying project member list sorting, credential exclusion, and 404 responses for non-member project inquiries. |
| `LoginAttemptServiceTest` | Unit test verifying account locking after 5 failed login attempts and lockout reset upon successful authentication. |

---

## 3. Test Execution & CI Verification Results

**Execution Date:** October 31, 2026  
**Environment:** Windows (Local Execution) / Ubuntu 24.04 (GitHub Actions CI)

### Backend Unit Test Suite Totals
```text
Running test suites: BugServiceTest, SecurityConfigTest, GoogleIdentityServiceTest, BugAttachmentControllerTest, GitHubWebhookControllerTest, ProjectControllerTest, LoginAttemptServiceTest
Total tests run: 37
Passed: 37
Failures: 0
Errors: 0
Skipped: 0
Execution time: ~8.9s
```

### Backend Checkstyle Result
```text
Plugin: maven-checkstyle-plugin:3.6.0
Rule definition: .github/checkstyle.xml (banning System.out, System.err, printStackTrace)
Checkstyle audit violations: 0 violations
Status: BUILD SUCCESS
```

### Frontend Vitest Suite Totals
```text
Test Files: 3 passed (src/app/app.spec.ts, src/app/workspace.service.spec.ts, src/app/workspace.component.spec.ts)
Tests: 55 passed (55)
Failures: 0
Errors: 0
Skipped: 0
Duration: ~6.7s
```

### Frontend Prettier Formatting & Lint
```text
Command: prettier --check 'src/**/*.{ts,html,css,json}' angular.json package.json proxy.conf.json
Status: All matched files use Prettier code style!
Violations: 0
```

### Frontend Production Build
```text
Command: ng build
Initial Chunk Files:
  main-*.js: 443.19 kB (103.85 kB transfer)
  styles-*.css: 14.81 kB (2.00 kB transfer)
Initial Total: 458.00 kB (105.85 kB transfer)
Status: Application bundle generation complete. [SUCCESS]
```
