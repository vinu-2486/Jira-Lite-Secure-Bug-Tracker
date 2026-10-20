SET @drop_role_check = (
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 'SELECT 1'
    ELSE CONCAT('ALTER TABLE users DROP CHECK `', MAX(CONSTRAINT_NAME), '`')
  END
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND CONSTRAINT_TYPE = 'CHECK'
    AND CONSTRAINT_NAME IN ('chk_users_role', 'ck_users_role')
);
PREPARE drop_role_check FROM @drop_role_check;
EXECUTE drop_role_check;
DEALLOCATE PREPARE drop_role_check;

ALTER TABLE users
  ADD CONSTRAINT ck_users_role
  CHECK (role IN ('REPORTER','DEVELOPER','PROJECT_LEAD','ADMIN'));
