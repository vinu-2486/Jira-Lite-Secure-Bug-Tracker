CREATE TABLE bug_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bug_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    body VARCHAR(5000) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_bug_comments_bug FOREIGN KEY (bug_id) REFERENCES bugs(id),
    CONSTRAINT fk_bug_comments_author FOREIGN KEY (author_id) REFERENCES users(id),
    INDEX idx_bug_comments_bug_created (bug_id, created_at)
);

CREATE TABLE bug_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bug_id BIGINT NOT NULL,
    actor_id BIGINT NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    old_value VARCHAR(5000),
    new_value VARCHAR(5000),
    reason VARCHAR(5000),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_bug_history_bug FOREIGN KEY (bug_id) REFERENCES bugs(id),
    CONSTRAINT fk_bug_history_actor FOREIGN KEY (actor_id) REFERENCES users(id),
    INDEX idx_bug_history_bug_created (bug_id, created_at)
);
