CREATE TABLE users (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(254) NOT NULL,
  display_name    VARCHAR(100) NOT NULL,
  password_hash   VARCHAR(100) NOT NULL,
  role            VARCHAR(20)  NOT NULL,
  enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
  failed_attempts INT          NOT NULL DEFAULT 0,
  locked_until    TIMESTAMP(6) NULL,
  created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT ck_users_role CHECK (role IN ('REPORTER','DEVELOPER','PROJECT_LEAD','ADMIN'))
);
