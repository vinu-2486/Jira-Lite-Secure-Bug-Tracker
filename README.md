# Jira Lite Secure Bug Tracker

A secure, lightweight bug tracking application built using Java and Spring Boot. The application provides project-based bug management with authentication, role-based access control, and relational database persistence.

---

## 1. Features

### Core Functionality

- User authentication using Spring Security.
- Role-based access control.
- Project creation and membership management.
- Bug creation within projects.
- Bug listing with project membership validation.
- Bug priority and severity classification.
- Bug status and resolution tracking.
- Bug assignment to project members (subject to implementation and testing).
- Optimistic locking for concurrent bug updates.

### Security

- Spring Security integration.
- Application-level roles:
  - `REPORTER`
  - `DEVELOPER`
  - `PROJECT_LEAD`
  - `ADMIN`
- Project-level membership validation.
- Request validation using Jakarta Bean Validation.
- Centralized persistence through Spring Data JPA.

### Technology Stack

| Component | Technology |
|---|---|
| Programming language | Java |
| Backend framework | Spring Boot |
| Security | Spring Security |
| Persistence | Spring Data JPA |
| ORM | Hibernate |
| Database | MySQL |
| Database migrations | Flyway |
| Build tool | Maven |
| API architecture | REST |
| Validation | Jakarta Bean Validation |

---

## 2. Prerequisites

Install the following software before running the application.

| Requirement | Version |
|---|---|
| Java JDK | 21 (verify project configuration) |
| Maven | 3.8 or later |
| MySQL Server | 8.0 or compatible |
| Git | Latest stable version |

Verify installations:

```bash
java -version
mvn -version
mysql --version
git --version
```

Ensure that MySQL is running and accessible before starting the backend.

---

## 3. Project Setup

### Step 1: Clone the repository

```bash
git clone <REPOSITORY_URL>
cd Jira-Lite-Secure-Bug-Tracker
```

Replace `<REPOSITORY_URL>` with the actual Git repository URL.

### Step 2: Create the database

Log in to MySQL:

```bash
mysql -u root -p
```

Create the application database:

```sql
CREATE DATABASE jira_lite;
```

Exit the MySQL shell:

```sql
EXIT;
```

If your existing application configuration uses a different database name, use that configured name instead.

### Step 3: Configure database credentials

Navigate to the backend directory:

```bash
cd backend
```

Inspect the application configuration:

```bash
find src/main/resources -maxdepth 2 -type f
```

Configure the database connection using the existing Spring Boot configuration.

Example configuration:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/jira_lite
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
```

Set the corresponding environment variables before starting the application.

Linux/macOS:

```bash
export DB_USERNAME=root
export DB_PASSWORD=your_password
```

Windows PowerShell:

```powershell
$env:DB_USERNAME="root"
$env:DB_PASSWORD="your_password"
```

**Important:** The property names and environment variable names must match the application's actual configuration. Do not commit real database credentials to Git.

### Step 4: Database initialization

Flyway manages database schema migrations.

On application startup, Flyway applies pending migrations configured in the project.

Verify that:
- The database exists.
- The database credentials are valid.
- The migration scripts are present.
- The configured MySQL user has the necessary permissions.

Avoid manually recreating tables already managed by Flyway.

---

## 4. Running the Application

From the `backend` directory, run:

```bash
mvn spring-boot:run
```

Alternatively, build the application first:

```bash
mvn clean package
```

Then execute the generated JAR:

```bash
java -jar target/*.jar
```

The default Spring Boot port is `8080`, unless overridden by the application configuration.

The API should then be accessible at:

```text
http://localhost:8080
```

---

## 5. Running Tests

Execute the test suite from the backend directory:

```bash
mvn test
```

To perform a clean build and execute tests:

```bash
mvn clean verify
```

### Test prerequisites

- MySQL must be available if the integration tests use the configured database.
- The test database must be configured correctly.
- Flyway migrations must execute successfully.
- Required environment variables must be available.

### What should be verified

| Test area | Expected verification |
|---|---|
| Authentication | Protected endpoints reject unauthenticated requests. |
| Project membership | Non-members cannot access protected project bug resources. |
| Bug creation | Valid requests create bug records. |
| Bug retrieval | Project members can retrieve project bugs. |
| Validation | Invalid request payloads are rejected. |
| Authorization | Restricted operations reject users without the required permissions. |
| Persistence | Changes are correctly stored in MySQL. |

Only tests actually present in the repository should be reported as implemented test coverage.

---

## 6. Demo Accounts

Demo credentials must be created or seeded before the application can be demonstrated.

The following are suggested demonstration roles, not verified existing accounts.

| Account | Role | Intended demonstration |
|---|---|---|
| Admin account | `ADMIN` | Administrative operations |
| Project lead account | `PROJECT_LEAD` | Project membership management |
| Developer account | `DEVELOPER` | Development and bug handling |
| Reporter account | `REPORTER` | Bug reporting |

**Credentials:** Not included in this README because the repository's seed data and authentication configuration have not yet been verified.

For a demonstration:
1. Create or seed the required users.
2. Assign their appropriate application roles.
3. Create a project.
4. Add users as project members.
5. Authenticate as a project member.
6. Create a bug.
7. Retrieve the project's bug list.
8. Test authorization using an account without the required permissions.

Never use production credentials as demonstration credentials.

---

## 7. API Overview

The backend exposes REST endpoints.

### Bug Management

Base path:

```text
/api/projects/{projectId}/bugs
```

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/projects/{projectId}/bugs` | Create a bug |
| GET | `/api/projects/{projectId}/bugs` | Retrieve project bugs |

### Project Management

Base path:

```text
/api/projects
```

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/projects` | List projects |
| POST | `/api/projects/{id}/members` | Add a project member |

Additional bug operations should be documented here as they are implemented and verified.

---

## 8. Assumptions

The following assumptions apply to this version of the project:

1. MySQL is used as the primary relational database.
2. The backend is a Spring Boot application.
3. Maven manages backend dependencies and builds.
4. Flyway is responsible for database schema versioning.
5. Java 21 is the expected development runtime, subject to confirmation from the build configuration.
6. Users must be authenticated to access protected application operations.
7. Project-specific bug operations require appropriate project membership.
8. Application roles determine access to restricted operations.
9. Database configuration is provided externally and should not contain committed production secrets.
10. The default backend port is `8080`, unless changed through configuration.

---

## 9. Troubleshooting

### Problem 1: Database connection refused

**Possible causes:**
- MySQL is not running.
- The database port is incorrect.
- The database host is unreachable.

**Resolution:**

Check whether MySQL is running:

```bash
sudo service mysql status
```

Check the connection:

```bash
mysql -u root -p -h localhost -P 3306
```

Verify the configured JDBC URL.

### Problem 2: Access denied for database user

**Possible causes:**
- Incorrect username or password.
- Insufficient database privileges.

**Resolution:**
- Verify database credentials.
- Confirm the database user has the necessary permissions.
- Check environment variable configuration.

### Problem 3: Flyway migration failure

**Possible causes:**
- Invalid SQL migration.
- Existing schema conflicts.
- Database permissions are insufficient.
- An already-applied migration was modified.

**Resolution:**
- Inspect the application startup logs.
- Review the failing migration file.
- Check the `flyway_schema_history` table.
- Do not edit migrations that have already been applied to shared environments. Create a new migration to correct the schema instead.

### Problem 4: Port 8080 already in use

**Possible cause:**
Another process is using the backend port.

**Resolution:**

Find the process:

```bash
lsof -i :8080
```

Stop the conflicting process if appropriate, or configure a different application port.

### Problem 5: Maven build failure

**Possible causes:**
- Incorrect Java version.
- Dependency download failure.
- Compilation errors.

**Resolution:**

```bash
java -version
mvn -version
mvn clean test
```

Check the first compilation or dependency error in the Maven output.

### Problem 6: HTTP 401 Unauthorized

**Possible causes:**
- Missing authentication credentials.
- Invalid credentials.
- Expired or invalid authentication token/session.

**Resolution:**
- Authenticate before accessing protected endpoints.
- Verify the authentication mechanism configured in Spring Security.
- Check the request's authentication headers or session cookies.

### Problem 7: HTTP 403 Forbidden

**Possible causes:**
- The authenticated user lacks the required role.
- The user is not a member of the requested project.
- The operation requires project-lead or administrator privileges.

**Resolution:**
- Verify the user's application role.
- Check project membership.
- Confirm that the requested operation is permitted for that role.

### Problem 8: HTTP 404 Not Found

**Possible causes:**
- Invalid project ID.
- Invalid bug key.
- Requested resource does not exist.

**Resolution:**
- Verify the resource identifier.
- Confirm that the corresponding database record exists.

---

## 10. Security Considerations

- Do not commit passwords, database credentials, API keys, or signing secrets.
- Use HTTPS in deployed environments.
- Store passwords using a secure password-hashing mechanism.
- Enforce authorization on every protected endpoint.
- Validate incoming request data.
- Keep dependencies updated.
- Run dependency vulnerability scans.
- Restrict access to the database.
- Use separate configurations for development, testing, and production.

---

## 11. Future Enhancements

Potential improvements include:

- Bug comments and discussion threads.
- Bug history and audit trails.
- Advanced search and filtering.
- Pagination and sorting.
- Enhanced dashboard and reporting.
- Automated notification support.
- Improved audit logging.
- Expanded integration and security testing.

---

## 12. License

Specify the project's chosen license here before public distribution.

---

## 13. Maintainers

Jira Lite Secure Bug Tracker is developed as a software engineering project.

Repository: `<REPOSITORY_URL>`
