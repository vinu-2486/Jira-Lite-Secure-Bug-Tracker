ALTER TABLE users
  ADD COLUMN google_sub VARCHAR(255) NULL,
  ADD CONSTRAINT uq_users_google_sub UNIQUE (google_sub);
