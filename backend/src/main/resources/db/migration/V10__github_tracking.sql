ALTER TABLE bug_history
    MODIFY actor_id BIGINT NULL;

ALTER TABLE bug_history
    ADD COLUMN external_author VARCHAR(254) NULL;

CREATE TABLE github_repository_bindings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    installation_id BIGINT NOT NULL,
    repository_id BIGINT NOT NULL,
    owner VARCHAR(100) NOT NULL,
    repository_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(201) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_github_binding_repository UNIQUE (repository_id),
    CONSTRAINT uq_github_binding_project UNIQUE (project_id),
    CONSTRAINT fk_github_binding_project FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE github_webhook_deliveries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    payload MEDIUMBLOB NOT NULL,
    status VARCHAR(20) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    last_error VARCHAR(1000) NULL,
    received_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    processed_at TIMESTAMP(6) NULL,
    CONSTRAINT uq_github_delivery UNIQUE (delivery_id)
);

CREATE TABLE github_event_references (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_id BIGINT NOT NULL,
    reference_key VARCHAR(100) NOT NULL,
    external_type VARCHAR(20) NOT NULL,
    external_id VARCHAR(200) NOT NULL,
    repository_id BIGINT NOT NULL,
    bug_id BIGINT NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_github_event_reference UNIQUE (repository_id, external_type, external_id, bug_id),
    CONSTRAINT fk_github_event_delivery FOREIGN KEY (delivery_id) REFERENCES github_webhook_deliveries(id),
    CONSTRAINT fk_github_event_bug FOREIGN KEY (bug_id) REFERENCES bugs(id)
);
