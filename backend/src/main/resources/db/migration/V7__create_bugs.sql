CREATE TABLE bugs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    bug_key VARCHAR(50) NOT NULL,
    project_id BIGINT NOT NULL,
    reporter_id BIGINT NOT NULL,
    assignee_id BIGINT NULL,

    title VARCHAR(120) NOT NULL,
    description VARCHAR(5000) NOT NULL,

    priority VARCHAR(20) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    resolution VARCHAR(500) NULL,

    version BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT uq_bugs_key UNIQUE (bug_key),

    CONSTRAINT fk_bugs_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id),

    CONSTRAINT fk_bugs_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES users(id),

    CONSTRAINT fk_bugs_assignee
        FOREIGN KEY (assignee_id)
        REFERENCES users(id),

    CONSTRAINT ck_bugs_priority
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),

    CONSTRAINT ck_bugs_severity
        CHECK (severity IN ('TRIVIAL', 'MINOR', 'MAJOR', 'CRITICAL')),

    CONSTRAINT ck_bugs_status
        CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED')),

    INDEX idx_bugs_project (project_id),
    INDEX idx_bugs_reporter (reporter_id),
    INDEX idx_bugs_assignee (assignee_id),
    INDEX idx_bugs_status (status),
    INDEX idx_bugs_created_at (created_at)
);