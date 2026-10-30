# Security Note — Jira Lite Secure Bug Tracker

## 1. Overview

Jira Lite Secure Bug Tracker is a Spring Boot-based bug tracking application that uses Spring Security for authentication and role-based authorization. The application manages users, projects, project membership, and bug records.

The primary security objective is to ensure that only authenticated and appropriately authorized users can access project resources or perform operations on bugs.

## 2. Threat Model

The application considers the following potential threats:

| Threat | Description | Potential impact |
|---|---|---|
| Unauthorized access | An unauthenticated user attempts to access protected API endpoints. | Exposure or modification of application data. |
| Broken access control | An authenticated user attempts to access a project or bug without the required permissions. | Unauthorized data access or modification. |
| Privilege escalation | A user attempts to perform operations reserved for project leads or administrators. | Unauthorized administrative actions. |
| Unauthorized project membership | A user attempts to access project resources without being a project member. | Exposure of project information. |
| Malicious input | An attacker submits invalid or crafted values through API requests. | Data corruption, unexpected application behaviour, or injection attacks. |
| Credential attacks | An attacker attempts password guessing or credential abuse. | Compromise of user accounts. |
| Dependency vulnerabilities | An application dependency contains a known security vulnerability. | Exploitation of vulnerable application components. |

## 3. Security Controls Implemented

The following controls are supported by the implementation reviewed so far.

### 3.1 Authentication

- Spring Security is included in the backend application.
- Protected controller operations obtain the authenticated user through Spring Security's `@AuthenticationPrincipal`.
- User identity is represented by the application's `AppUserDetails` implementation.

### 3.2 Role-Based Access Control

The application defines the following roles:

- `REPORTER`
- `DEVELOPER`
- `PROJECT_LEAD`
- `ADMIN`

Project membership records also contain a role, allowing authorization decisions to consider a user's role within a particular project.

The project member-management endpoint checks whether the requesting user is an administrator or a project lead before allowing membership changes.

### 3.3 Project-Level Authorization

- Bug creation checks whether the requesting user belongs to the specified project.
- Bug listing checks project membership before returning bug records.
- Project membership is verified using the project-member repository.
- Missing projects and unauthorized project access are handled with appropriate HTTP error responses.

### 3.4 Input Validation and Error Handling

- Request DTOs use Jakarta Bean Validation annotations such as `@NotNull`.
- Controller request bodies are validated using `@Valid`.
- Invalid or unauthorized operations are handled using HTTP status exceptions.
- Database access is implemented through Spring Data JPA.

### 3.5 Database and Persistence

- Hibernate/JPA is used for database persistence.
- Flyway is used for database schema migrations.
- Entity relationships represent users, projects, project memberships, and bugs.
- The bug entity uses optimistic locking through the `@Version` field to help prevent conflicting concurrent updates.

## 4. Known Limitations and Recommended Improvements

The following areas require additional verification or implementation before the application can be considered production-ready.

| Area | Limitation / required improvement |
|---|---|
| Password security | Verify that passwords are stored using a strong adaptive password hash such as BCrypt or Argon2. Never store plaintext passwords. |
| Brute-force protection | Verify that failed-login tracking and account-lockout logic are enforced correctly. |
| Token/session security | Review token expiration, signing, storage, revocation, and refresh behaviour, or session-cookie security if sessions are used. |
| Authorization coverage | Ensure every endpoint checks both authentication and the required project-level permissions. |
| CSRF protection | Verify CSRF handling based on whether the application uses browser sessions or stateless token authentication. |
| Rate limiting | Add limits to login attempts and other sensitive API operations. |
| Input sanitization | Validate and constrain user-controlled strings and prevent unsafe output rendering. |
| Transport security | Enforce HTTPS in deployed environments. |
| Secrets management | Keep database credentials, signing keys, and other secrets outside source control. |
| Audit logging | Record sensitive actions such as assignments, status changes, membership changes, and administrative operations. |
| Dependency security | Run automated dependency vulnerability scans and address identified vulnerabilities. |

These are review items, not claims that the corresponding controls are absent. Their actual implementation must be checked against the source code and deployment configuration.

## 5. Dependency Scan Summary

**Scan status: Pending**

A dependency vulnerability scan has not yet been executed for this project. Therefore, no claim is made that the dependencies are free of known vulnerabilities.

The backend uses the Maven build system. The following checks are recommended:

1. Review declared dependencies in `backend/pom.xml`.
2. Run the OWASP Dependency-Check Maven plugin.
3. Review reported CVEs, affected dependency versions, and severity ratings.
4. Upgrade vulnerable dependencies where compatible.
5. Re-run the scan after applying updates.

Suggested scan command, after configuring the OWASP Dependency-Check Maven plugin:

```bash
cd backend
mvn org.owasp:dependency-check-maven:check
```

The generated report should be reviewed for:

- Critical vulnerabilities
- High-severity vulnerabilities
- Medium- and low-severity vulnerabilities
- Vulnerable transitive dependencies
- Dependencies requiring upgrades or further investigation

**Scan result:** Not yet available.

**Remediation status:** Pending scan execution and report review.

## 6. Security Assessment

The application establishes a foundation for security through Spring Security, role-based access control, project membership checks, request validation, and JPA-based persistence.

However, a complete security assessment requires verification of password hashing, authentication configuration, endpoint authorization coverage, deployment security, and dependency vulnerabilities.

The application should undergo automated dependency scanning and security testing before production deployment.

---

**Document status:** Initial security note  
**Project:** Jira Lite Secure Bug Tracker  
**Technology:** Java, Spring Boot, Spring Security, Spring Data JPA, Hibernate, MySQL, Maven, Flyway
