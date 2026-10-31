# Jira Lite Secure Bug Tracker

Jira Lite Secure Bug Tracker is a lightweight, secure defect management web application built with Java, Spring Boot, and Angular. It provides project-scoped bug reporting and tracking with strict role-based access control, optimistic concurrency locking, audit trail history, file attachments, and read-only GitHub integration.

---

## 1. Project Purpose

The system is designed for engineering teams needing a structured, secure defect tracker. It guarantees tenant-like data isolation across projects: users cannot view or interact with bugs, comments, attachments, or member rosters for projects they do not belong to. All state changes are tracked in an immutable audit history, and concurrent modifications are guarded by optimistic locking.

---

## 2. Technology Stack & Versions

All versions are declared directly in project configuration files (`backend/pom.xml`, `backend/application.yml`, `.github/workflows/ci.yml`, and `frontend/package.json`):

| Layer / Component | Technology | Version | Source File |
|---|---|---|---|
| Language | Java (JDK) | 21 (Temurin) | `backend/pom.xml` (`<java.version>21</java.version>`), CI |
| Backend Framework | Spring Boot | 4.1.1 | `backend/pom.xml` (`<parent><version>4.1.1</version></parent>`) |
| Web Layer | Spring Boot Starter Web MVC | Inherited from Boot | `backend/pom.xml` |
| Security | Spring Security | Inherited from Boot | `backend/pom.xml` |
| Persistence | Spring Data JPA / Hibernate | Inherited from Boot | `backend/pom.xml` |
| Database Migrations | Flyway (with MySQL extension) | Inherited from Boot | `backend/pom.xml` (`flyway-mysql`) |
| Database Driver | MySQL Connector/J | Inherited from Boot | `backend/pom.xml` (`mysql-connector-j`) |
| JSON Serialization | Jackson Databind | Inherited from Boot | `backend/pom.xml` |
| Database Engine | MySQL Server | 8.4 | `.github/workflows/ci.yml` (`image: mysql:8.4`) |
| Build Tool | Apache Maven / Maven Wrapper | 3.9+ / wrapper | `backend/mvnw`, `backend/pom.xml` |
| Code Quality | Apache Maven Checkstyle Plugin | 3.6.0 | `.github/workflows/ci.yml`, `.github/checkstyle.xml` |
| Security Scanner | OWASP Dependency-Check Maven | 13.0.0 | `.github/workflows/ci.yml` |
| Frontend Runtime | Node.js / npm | Node 24 / npm 11.19.0 | `.github/workflows/ci.yml`, `frontend/package.json` |
| Frontend Framework | Angular | 22.2.0 | `frontend/package.json` |
| Frontend Tooling | Angular CLI & Build Tools | 22.2.5 | `frontend/package.json` |
| Frontend Test Runner | Vitest & JSDOM | 5.0.0 / 30.0.0 | `frontend/package.json` |
| Code Formatter / Linter | Prettier | 3.8.1 | `frontend/package.json` |

---

## 3. Folder Structure

```text
Jira-Lite-Secure-Bug-Tracker/
├── .github/
│   ├── workflows/
│   │   └── ci.yml                     # 3-job CI pipeline (Backend, Frontend, Dependency Scan)
│   └── checkstyle.xml                 # Checkstyle rule denying System.out/err and printStackTrace
├── backend/
│   ├── .env.example                   # Template for backend environment variables
│   ├── application.yml                # Base Spring Boot configuration
│   ├── mvnw / mvnw.cmd                # Maven Wrapper executables
│   ├── pom.xml                        # Maven project descriptor
│   └── src/
│       ├── main/
│       │   ├── java/com/jiralite/backend/
│       │   │   ├── BackendApplication.java       # Main entry point with @EnableAsync
│       │   │   ├── attachment/                   # File attachment entity, controller, repository
│       │   │   ├── auth/                         # Authentication & registration endpoints and DTOs
│       │   │   ├── bug/                          # Bug entity, service, lifecycle, comments, history
│       │   │   ├── config/                       # SecurityConfig, CsrfCookieFilter, GoogleAuthConfig
│       │   │   ├── github/                       # Read-only GitHub webhook ingestion & binding
│       │   │   ├── project/                      # Project & ProjectMember entities, controller, repositories
│       │   │   ├── security/                     # UserDetails, UserDetailsService, LoginAttemptService
│       │   │   └── user/                         # User entity, GlobalRole, AdminBootstrap, UserAdminController
│       │   └── resources/
│       │       └── db/migration/                 # Flyway migrations V1__init.sql through V11__add_google_identity.sql
│       └── test/
│           ├── java/com/jiralite/backend/        # Unit & Integration test suites
│           └── resources/
│               └── application-isolated-test.yml # Spring profile for disposable test databases
├── docs/                                         # Technical specifications and submission docs
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── BUG_LIFECYCLE.md
│   ├── CHANGELOG_AND_STATUS.md
│   ├── DEPLOYMENT.md
│   ├── ER.md
│   ├── SECURITY.md
│   └── TEST_REPORT.md
├── frontend/                                     # Angular 22 Single Page Application (Linear-inspired light theme)
│   ├── package.json
│   └── src/app/
└── README.md
```

---

## 4. Prerequisites

Before building or running the project, ensure the following software is installed:

- **Java Development Kit (JDK):** Version 21 (Temurin or OpenJDK recommended).
- **Maven:** Version 3.9+ (or use the repository's `./mvnw` wrapper).
- **Node.js & npm:** Node.js 24.x and npm 11.x (for frontend builds).
- **MySQL Server:** Version 8.4 (or 8.0+ compatible).

Verify installed tool versions:

```bash
java -version
node -v
npm -v
mysql --version
```

---

## 5. Environment Variables

All configuration is externalized. Never commit real credentials to Git.

### Backend Application Runtime

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_USER` | Yes | *None* | MySQL database username. |
| `DB_PASSWORD` | Yes | *None* | MySQL database password. |
| `GOOGLE_CLIENT_ID` / `JIRALITE_GOOGLE_CLIENT_ID` | Optional | `""` | Google OAuth 2.0 Web Client ID for audience token verification. If unset, Google sign-in is cleanly disabled. |
| `APP_CORS_ALLOWED_ORIGINS` | No | `http://localhost:4200,http://127.0.0.1:4200` | Explicit allowed origins for CORS. Wildcards are rejected when credentials are enabled. |
| `JIRALITE_ADMIN_EMAIL` | Optional | `""` | Bootstrap administrator email (only used if no `APP_ADMIN` exists). |
| `JIRALITE_ADMIN_PASSWORD` | Optional | `""` | Bootstrap administrator password (must satisfy 12-72 character policy). |
| `SESSION_COOKIE_SECURE` | No | `false` | Set to `true` in production to enforce HTTPS cookie flag. |
| `JILA_GITHUB_WEBHOOK_SECRET` | Optional | `""` | Shared secret for HMAC-SHA256 signature verification of GitHub webhooks. |

### Integration Test Runner (Isolated Database)

| Variable | Required for `mvn test` | Description |
|---|---|---|
| `JIRALITE_TEST_DB_URL` | Yes | Loopback JDBC URL (e.g., `jdbc:mysql://127.0.0.1:3306/jira_lite_test`). |
| `JIRALITE_TEST_DB_USERNAME` | Yes | Disposable test database username. |
| `JIRALITE_TEST_DB_PASSWORD` | Yes | Disposable test database password. |
| `JIRALITE_TEST_DB_SCHEMA` | Yes | Schema name (must match database path, e.g., `jira_lite_test`). |
| `JIRALITE_TEST_DB_PORT` | Yes | Non-privileged port string (e.g., `"3306"`). |

### CI Vulnerability Scanner

| Variable | Required in CI | Description |
|---|---|---|
| `NVD_API_KEY` | Optional (in GitHub Secrets) | National Vulnerability Database API key for OWASP Dependency-Check rate limiting. |

---

## 6. How to Run the Backend

1. **Create the MySQL Database:**
   ```sql
   CREATE DATABASE jira_lite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Configure Environment:**
   Copy `backend/.env.example` to `backend/.env` and update the variables:
   ```bash
   cp backend/.env.example backend/.env
   ```

3. **Start the Backend Server:**
   Navigate to the `backend` directory and execute:
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
   Flyway will automatically run all pending migrations (V1 through V11) on startup. The API will listen on `http://localhost:8080`.

---

## 7. How to Run Tests

Integration tests require a running loopback MySQL instance configured via test environment variables.

1. **Create the Test Database:**
   ```sql
   CREATE DATABASE jira_lite_test;
   ```

2. **Set Test Environment Variables:**
   ```bash
   export DB_USER=root
   export DB_PASSWORD=your_password
   export JIRALITE_TEST_DB_URL=jdbc:mysql://127.0.0.1:3306/jira_lite_test
   export JIRALITE_TEST_DB_USERNAME=root
   export JIRALITE_TEST_DB_PASSWORD=your_password
   export JIRALITE_TEST_DB_SCHEMA=jira_lite_test
   export JIRALITE_TEST_DB_PORT="3306"
   ```

3. **Execute Test Suite:**
   ```bash
   cd backend
   ./mvnw clean test
   ```
   Or run full verification:
   ```bash
   ./mvnw clean verify
   ```

---

## 8. How to Run Checkstyle

The backend enforces Java coding standards via Checkstyle, prohibiting `System.out.println`, `System.err.println`, and `e.printStackTrace()` in favor of SLF4J logging:

```bash
cd backend
./mvnw org.apache.maven.plugins:maven-checkstyle-plugin:3.6.0:check \
  -Dcheckstyle.config.location=../.github/checkstyle.xml \
  -Dcheckstyle.consoleOutput=true \
  -Dcheckstyle.failOnViolation=true
```

---

## 9. How CI Works

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push and pull requests to `main`, plus manual `workflow_dispatch`.

It executes three parallel jobs:

1. **`backend` (Timeout: 20 minutes):**
   - Spawns a `mysql:8.4` service container on port 3306 with health check verification.
   - Sets up JDK 21 (Temurin) with Maven caching.
   - Waits for MySQL readiness via `mysqladmin ping`.
   - Runs Checkstyle lint (`maven-checkstyle-plugin:3.6.0`).
   - Runs `mvn verify` against the real test container.
   - Uploads Surefire test reports and Checkstyle XML artifacts (7-day retention).
   - Packages and uploads `backend-0.0.1-SNAPSHOT.jar`.

2. **`frontend` (Timeout: 15 minutes):**
   - Sets up Node.js 24 with npm caching.
   - Runs `npm ci`.
   - Runs Prettier lint (`npm run lint`).
   - Runs Vitest unit tests (`npm test -- --watch=false`).
   - Builds Angular production artifacts (`npm run build`).
   - Uploads compiled browser bundle (`frontend/dist/frontend/browser/**`).

3. **`dependency-scan` (Timeout: 60 minutes):**
   - Scans npm dependencies with `npm audit --audit-level=high`.
   - Restores cached NVD data via `actions/cache/restore` and always saves cache via `actions/cache/save` (`if: always()`) to prevent redundant downloads across runs.
   - Reads optional `NVD_API_KEY` secret to mitigate NVD rate limiting.
   - Scans Maven dependencies using `org.owasp:dependency-check-maven:13.0.0` with `-DfailBuildOnCVSS=7`.
   - Fails the build if high-severity npm vulnerabilities or CVSS >= 7 Maven vulnerabilities are detected.
   - Uploads `npm-audit.json` and `dependency-check-report.*` artifacts.

---

## 10. Known Limitations

- **Missing Spring Actuator Starter:** SecurityConfig explicitly permits `/actuator/health`, but `spring-boot-starter-actuator` is omitted from `backend/pom.xml`. The health check is not implemented.
- **In-Memory Bug Filtering & Pagination:** `BugService.listBugs` fetches all project bugs from MySQL and performs filtering, sorting, and pagination in Java memory. This is a performance bottleneck for projects with tens of thousands of bugs.
- **Rate Limiting:** IP-based request throttling is not implemented. Brute-force protection relies solely on account locking (5 consecutive failed attempts per email locks the account for 15 minutes).
- **Password Deny-List:** Common password deny-list validation is flagged as a `// TODO` in `PasswordPolicy.java` and is not implemented.
- **Local File Storage Only:** Bug attachments are stored on the local backend filesystem. Clustered deployments or cloud object storage (S3/GCS) are not implemented.
- **No Attachment Malware Scanning:** Uploaded attachments are checked for file size and path traversal (`..`), but no virus scanning is implemented.
- **No Bug Deletion or Project Deletion:** Soft or hard deletions for projects and bugs are not implemented.
