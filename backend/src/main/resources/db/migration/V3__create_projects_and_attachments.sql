CREATE TABLE IF NOT EXISTS projects (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_key VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT uq_projects_key UNIQUE (project_key)
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(20) NOT NULL,
  PRIMARY KEY (project_id, user_id),
  CONSTRAINT fk_project_members_project FOREIGN KEY (project_id) REFERENCES projects(id),
  CONSTRAINT fk_project_members_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT ck_project_members_role CHECK (role IN ('REPORTER','DEVELOPER','PROJECT_LEAD'))
);

CREATE TABLE IF NOT EXISTS bug_attachments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bug_key VARCHAR(50) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  storage_name VARCHAR(100) NOT NULL,
  size_bytes BIGINT NOT NULL,
  uploaded_by BIGINT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT uq_bug_attachments_storage UNIQUE (storage_name),
  CONSTRAINT fk_bug_attachments_user FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
