# Deployment & Operations Guide

## Jira Lite Secure Bug Tracker

This document provides complete instructions for building, configuring, migrating, and deploying the Jira Lite Secure Bug Tracker application.

---

## 1. Build Procedures

### 1.1 Backend Packaging (Spring Boot JAR)
The backend compiles into an executable Spring Boot fat JAR:

```bash
cd backend
./mvnw clean package -DskipTests
```

The resulting artifact is located at:
```text
backend/target/backend-0.0.1-SNAPSHOT.jar
```

To run the packaged JAR:
```bash
java -jar backend/target/backend-0.0.1-SNAPSHOT.jar
```

### 1.2 Frontend Packaging (Angular Production Bundle)
The frontend builds static browser assets using the Angular build pipeline:

```bash
cd frontend
npm ci
npm run build
```

The compiled production bundle is generated at:
```text
frontend/dist/frontend/browser/
```
These static assets can be served by Nginx, Caddy, Cloudflare Pages, or reverse-proxied to the backend.

---

## 2. Environment Configuration

All environment variables used by the backend runtime, integration test runners, and CI pipelines are cataloged below:

### 2.1 Backend Runtime Variables

| Variable Name | Required | Default Value | Format / Example | Description |
|---|---|---|---|---|
| `DB_USER` | **Yes** | *None* | `jira_user` | MySQL user with DDL and DML permissions on the application database. |
| `DB_PASSWORD` | **Yes** | *None* | `strong_db_password` | Password for the MySQL user. |
| `GOOGLE_CLIENT_ID` / `JIRALITE_GOOGLE_CLIENT_ID` | No | `""` | `client-id.apps.googleusercontent.com` | Google OAuth Web Client ID for audience verification. If unset, Google auth is cleanly disabled. |
| `APP_CORS_ALLOWED_ORIGINS` | No | `http://localhost:4200,http://127.0.0.1:4200` | Comma-separated list | Allowed origins for CORS. Wildcards are rejected when credentials are enabled. |
| `JIRALITE_ADMIN_EMAIL` | No | `""` | `admin@example.com` | Email address for initial administrator creation via `AdminBootstrap`. Only executed once when no `APP_ADMIN` exists. |
| `JIRALITE_ADMIN_PASSWORD` | No | `""` | `Minimum12Characters!` | Password for initial administrator (must be 12 to 72 characters). |
| `SESSION_COOKIE_SECURE` | No | `false` | `true` or `false` | Controls whether the `JSESSIONID` cookie requires HTTPS (`Secure` flag). Must be set to `true` in production. |
| `JILA_GITHUB_WEBHOOK_SECRET`| No | `""` | `hex_or_alphanumeric_secret` | Secret key used to verify HMAC-SHA256 signatures for GitHub App webhooks. |

### 2.2 Integration Test Runner Variables

| Variable Name | Required for `mvn test` | Format / Example | Description |
|---|---|---|---|
| `JIRALITE_TEST_DB_URL` | **Yes** | `jdbc:mysql://127.0.0.1:3306/jira_lite_test` | Loopback JDBC URL. Tested by `IsolatedDatabaseTestSupport`. |
| `JIRALITE_TEST_DB_USERNAME` | **Yes** | `jiralite_ci` | Dedicated test database username. |
| `JIRALITE_TEST_DB_PASSWORD` | **Yes** | `ci-only-db-password` | Dedicated test database password. |
| `JIRALITE_TEST_DB_SCHEMA` | **Yes** | `jira_lite_test` | Database schema name (must match URL). |
| `JIRALITE_TEST_DB_PORT` | **Yes** | `"3306"` | Non-privileged port string. |

### 2.3 CI / Pipeline Secrets

| Secret Name | Required in CI | Description |
|---|---|---|
| `NVD_API_KEY` | Optional | NVD (National Vulnerability Database) API key for OWASP Dependency-Check rate limiting. |

---

## 3. Database Migration Order (Flyway)

Database schema migrations are located in `backend/src/main/resources/db/migration/`. They run automatically in strict lexical sequence on application startup:

| Version | Migration Script | Purpose & Key Schema Operations |
|---|---|---|
| `V1` | `V1__init.sql` | Creates initial `users` table with email, display name, password hash, role check (`REPORTER`, `DEVELOPER`, `PROJECT_LEAD`, `ADMIN`), lockout tracking, and timestamps. |
| `V2` | `V2__align_user_role_constraint.sql` | Drops existing user role check constraint dynamically from `information_schema` and re-applies `ck_users_role`. |
| `V3` | `V3__create_projects_and_attachments.sql` | Creates `projects` (key, name, description), `project_members` (composite PK, role check), and `bug_attachments` (storage UUID, size, user FK). |
| `V4` | `V4__align_project_members_role.sql` | Adds default `'REPORTER'` role column to `project_members` if not already present. |
| `V5` | `V5__align_projects_description.sql` | Adds optional `description VARCHAR(500)` column to `projects` table if missing. |
| `V6` | `V6__align_project_key.sql` | Ensures `project_key` column exists, backfills legacy empty keys with `CONCAT('P', id)`, and sets `NOT NULL`. |
| `V7` | `V7__create_bugs.sql` | Creates `bugs` table with project FK, reporter FK, optional assignee FK, priority/severity/status check constraints, version counter (`optimistic locking`), and indexes. |
| `V8` | `V8__separate_global_and_project_roles.sql` | Separates global roles from project roles: updates `users.role` to `USER` or `APP_ADMIN`, and updates `ck_users_role` constraint to `CHECK (role IN ('USER', 'APP_ADMIN'))`. |
| `V9` | `V9__create_bug_comments_and_history.sql` | Creates `bug_comments` (body, author FK, bug FK) and `bug_history` (audit trail with event types, before/after values, reasons) with composite indexes. |
| `V10` | `V10__github_tracking.sql` | Alters `bug_history` to make `actor_id` nullable and add `external_author`. Creates `github_repository_bindings`, `github_webhook_deliveries`, and `github_event_references`. |
| `V11` | `V11__add_google_identity.sql` | Alters `users` to add `google_sub VARCHAR(255) NULL` with unique constraint `uq_users_google_sub` for Google OAuth subject mapping. |

---

## 4. Continuous Integration (CI) Workflow Summary

The CI pipeline is defined in `.github/workflows/ci.yml`.

- **Triggers:** Push to `main`, Pull Requests targeting `main`, and manual execution via `workflow_dispatch`.
- **Concurrency:** `cancel-in-progress: true` groups jobs by workflow and ref.

### Job 1: `backend` (Verify & Lint)
- **Runner:** `ubuntu-latest`
- **Timeout:** 20 minutes
- **Services:** Spawns a `mysql:8.4` container with health checking on port 3306.
- **Workflow Steps:**
  1. Checks out source code (`actions/checkout@v4`).
  2. Sets up JDK 21 Temurin with Maven cache (`actions/setup-java@v4`).
  3. Waits for MySQL readiness via `mysqladmin ping` retry loop.
  4. Runs Checkstyle lint (`maven-checkstyle-plugin:3.6.0:check`) using `.github/checkstyle.xml`.
  5. Runs full verification with tests (`mvn --batch-mode verify`).
  6. Uploads Surefire test reports and Checkstyle XML artifacts (7-day retention).
  7. Packages and uploads `backend-0.0.1-SNAPSHOT.jar` artifact upon success.

### Job 2: `frontend` (Lint, Test & Build)
- **Runner:** `ubuntu-latest`
- **Timeout:** 15 minutes
- **Workflow Steps:**
  1. Checks out source code (`actions/checkout@v4`).
  2. Sets up Node.js 24 with npm cache (`actions/setup-node@v4`).
  3. Installs clean dependencies via `npm ci`.
  4. Runs Prettier formatting check (`npm run lint`).
  5. Executes Vitest unit tests in single-run mode (`npm test -- --watch=false`).
  6. Compiles production Angular bundle (`npm run build`).
  7. Uploads production distribution files from `frontend/dist/frontend/browser/**` (7-day retention).

### Job 3: `dependency-scan` (Vulnerability Audit)
- **Runner:** `ubuntu-latest`
- **Timeout:** 60 minutes
- **Workflow Steps:**
  1. Checks out source code.
  2. Sets up JDK 21 and Node.js 24.
  3. Installs frontend dependencies (`npm ci`).
  4. Executes `npm audit --audit-level=high --json > npm-audit.json`.
  5. Restores NVD cache with `actions/cache/restore` and saves NVD cache with `actions/cache/save` (`if: always()`) so database data is retained even if the job fails or is cancelled.
  6. Executes OWASP Dependency-Check Maven plugin (`org.owasp:dependency-check-maven:13.0.0:check`) with `-DfailBuildOnCVSS=7`, optionally passing `-DnvdApiKey="$NVD_API_KEY"` if the secret is provided.
  7. Fails the build explicitly if either scan identifies vulnerabilities at or above their respective thresholds.
  8. Uploads `npm-audit.json` and Maven dependency check reports.
