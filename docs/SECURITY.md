# Security Architecture & Controls Specification

## Jira Lite Secure Bug Tracker

This document details all security controls actively implemented in the Jira Lite Secure Bug Tracker codebase, followed by an honest analysis of known security limitations and residual risks.

---

## 1. Implemented Security Controls

### 1.1 Password Hashing & Management
- **Adaptive Salting & Hashing:** Passwords are cryptographically hashed using Spring Security's `DelegatingPasswordEncoder` defaulting to BCrypt (`{bcrypt}$2a$10$...`). BCrypt uses a salted, adaptive hashing algorithm that resists GPU-accelerated dictionary and rainbow table attacks.
- **Coverage:** All user registration and creation pathways (`SignupController.signup`, `UserAdminController.create`, and `AdminBootstrap.run`) encode plaintext passwords through `PasswordEncoder.encode()` prior to database persistence.
- **Credential Protection:** Passwords and password hashes are never returned across any API endpoint. Response DTOs (`MeResponse`, `MemberResponse`, `BugResponse`) omit password fields entirely.
- **Length Bounds:** `PasswordPolicy.validate()` strictly enforces a minimum length of 12 characters and a maximum length of 72 characters (matching BCrypt's effective 72-byte truncation boundary).

### 1.2 Authentication & Session Management
- **Stateful HTTP Sessions:** Authenticated sessions are tracked via standard Spring Security `HttpSessionSecurityContextRepository`.
- **Hardened Session Cookie:** `JSESSIONID` is configured in `application.yml` with:
  - `http-only: true`: Prevents client-side scripts (XSS) from reading the session cookie.
  - `same-site: lax`: Mitigates Cross-Site Request Forgery during cross-origin top-level navigation.
  - `timeout: 30m`: Automatically expires idle sessions after 30 minutes.
  - `secure: ${SESSION_COOKIE_SECURE:false}`: Configurable flag to enforce HTTPS-only transmission in deployed environments.
- **Session Fixation Defense:** In `AuthController.login()`, the application calls `req.changeSessionId()` immediately upon successful authentication, assigning a new session ID and invalidating the pre-authentication session ID.
- **Account Lockout (Brute-Force Mitigation):** `LoginAttemptService` tracks failed attempts in `users.failed_attempts`. Upon the 5th consecutive failed attempt, `users.locked_until` is set to 15 minutes in the future.
- **User Enumeration Defense:** Failed login attempts due to bad credentials, locked accounts, or disabled users return the exact same HTTP 401 Unauthorized response (`"Invalid email or password"`).

### 1.3 Cross-Site Request Forgery (CSRF) Protection
- **SPA CSRF Configuration:** `SecurityConfig` specifies `.csrf(csrf -> csrf.spa())`.
- **Token Synchronization:** `CsrfCookieFilter` forces the generation and exposure of the `XSRF-TOKEN` cookie on every request.
- **Header Enforcement:** All mutating HTTP verbs (POST, PUT, PATCH, DELETE) require the client to supply the matching token in the `X-XSRF-TOKEN` header.
- **Login Verification:** `AuthController.login()` implements an explicit verification using constant-time byte comparison (`MessageDigest.isEqual`) between the request header and cookie before evaluating credentials.

### 1.4 Dual-Tier Role-Based Access Control (RBAC)
- **Global Roles:** Enforces `GlobalRole` (`APP_ADMIN` vs `USER`). Administrative routes (`/api/admin/**`) are restricted exclusively to `APP_ADMIN` via Spring Security URL patterns.
- **Project Membership Roles:** Enforces `ProjectRole` (`PROJECT_LEAD`, `DEVELOPER`, `REPORTER`) stored in `project_members`.
- **Tenant Isolation:** Controller and service layers verify that the authenticated caller has a valid `project_members` record for the target project.
- **Resource Existence Obfuscation:** Access attempts by non-members return HTTP 404 Not Found rather than HTTP 403 Forbidden, preventing unauthorized actors from enumerating project existence or bug IDs.

### 1.5 Input Validation & Sanitization
- **Jakarta Bean Validation:** Controller endpoints declare `@Valid` on request bodies, enforcing annotations such as `@NotBlank`, `@Size`, `@Email`, and `@NotNull`.
- **State Transition Guardrails:** State transitions are verified against an explicit allowed transition matrix. Invalid transitions return HTTP 422 Unprocessable Entity.
- **Mandatory Reopening & Closing Explanations:** Reopening and closing actions mandate non-blank reasons.
- **Concurrency Protection:** Optimistic locking via JPA `@Version` requires clients to supply the current version, returning HTTP 409 Conflict if concurrent updates collide.

### 1.6 File Upload Restrictions
- **Strict Size Caps:** Files are checked against a hard limit of 10 MB (`10 * 1024 * 1024` bytes). Exceeding files are rejected with HTTP 413 Payload Too Large.
- **Path Traversal Defense:** Filenames are sanitized with `StringUtils.cleanPath()` and rejected with HTTP 400 Bad Request if containing `".."`.
- **Storage Isolation:** Uploads are stored under randomly generated UUID filenames (`storage_name`), preventing direct execution, file replacement, or directory browsing.
- **Containment Check:** File download verifies that the resolved path is strictly contained within the attachment directory (`file.startsWith(root)`).
- **Access Control:** File downloads verify that the caller belongs to the project owning the bug.

### 1.7 Webhook Authentication & Deduplication
- **HMAC-SHA256 Verification:** `GitHubWebhookController` computes HMAC-SHA256 signatures over raw request body bytes and compares them against the `X-Hub-Signature-256` header using constant-time comparison (`MessageDigest.isEqual`).
- **Deduplication:** Webhook deliveries are deduplicated by the unique `X-GitHub-Delivery` ID header, preventing replay attacks.

### 1.8 Continuous Dependency Vulnerability Scanning
- **Frontend CI Scanning:** Node dependencies are scanned using `npm audit --audit-level=high` in `.github/workflows/ci.yml`.
- **Backend CI Scanning:** Maven dependencies are scanned using `org.owasp:dependency-check-maven:13.0.0` with `-DfailBuildOnCVSS=7` and NVD data caching with `actions/cache/save` (`if: always()`). The CI pipeline fails if high-severity vulnerabilities are detected.

### 1.9 HTTP Security Headers
All responses emitted by the Spring Security filter chain enforce strict defense-in-depth HTTP response headers:
- **HSTS:** `Strict-Transport-Security: max-age=31536000; includeSubDomains` enforces HTTPS-only navigation.
- **MIME Sniffing Defense:** `X-Content-Type-Options: nosniff` stops MIME-type interpretation attacks.
- **Clickjacking Protection:** `X-Frame-Options: DENY` forbids rendering in frames/iframes.
- **Referrer Privacy:** `Referrer-Policy: no-referrer` prevents leakage of request paths in referrer headers.
- **Content Security Policy:** `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` isolates API JSON responses and prevents unauthorized framing.

### 1.10 Explicit Cross-Origin Resource Sharing (CORS)
- **Origin Validation:** Origins are resolved strictly from the `app.cors.allowed-origins` property. Wildcards (`*`) are disallowed when `allowCredentials: true` is configured.
- **Methods:** Permitted methods are restricted to `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- **Headers:** Permitted headers are restricted to `Authorization`, `Content-Type`, `X-XSRF-TOKEN`.

### 1.11 Google Sign-In
Google sign-in is out of scope for this release.

---

## 2. Known Limitations & Residual Risks

| Area | Nature of Limitation | Specific Risk / Impact | Recommended Mitigation |
|---|---|---|---|
| **Rate Limiting** | **Not implemented** | While accounts lock after 5 failed attempts per email, there is no IP-based or distributed rate limiting. An attacker can execute distributed credential-stuffing attacks across many distinct emails. | Introduce a bucket-based rate limiter (such as Bucket4j or Redis rate limiting) on `/api/auth/**`. |
| **Password Deny-List** | **Not implemented** | `PasswordPolicy.java` contains a `// TODO` comment to check against common passwords. Currently, any password meeting the 12-character minimum is accepted (e.g., `password123456`). | Implement a dictionary deny-list or integrate with HaveIBeenPwned API for breached password checks. |
| **Antivirus / Malware Scanning** | **Not implemented** | Attachments are validated for size and filename syntax, but their binary contents are not scanned for malicious payloads. | Integrate an asynchronous ClamAV scanner or cloud-native malware detection pipeline prior to saving files to disk. |
| **Local Filesystem Attachment Storage** | **Limitation** | Files are written to the local host filesystem (`./data/attachments`). In a multi-instance or containerized cluster, attachments will not be shared across backend instances, and files lack encryption at rest. | Transition attachment storage to an S3-compatible object store (AWS S3, MinIO, GCP Cloud Storage) with server-side encryption. |
| **In-Memory Bug Listing** | **Limitation** | `BugService.listBugs` loads all bugs for a project into memory before applying filtering, sorting, and pagination. Projects with large defect histories will cause JVM memory pressure. | Migrate pagination and filtering directly into Spring Data JPA repository queries (`Pageable`, `Specification`, or JPQL). |
| **Spring Actuator Health Endpoint** | **Not implemented** | `SecurityConfig` permits `/actuator/health`, but `spring-boot-starter-actuator` is omitted from `pom.xml`, leaving health checks unmonitored. | Add `spring-boot-starter-actuator` to `backend/pom.xml`. |
