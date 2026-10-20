SET @add_member_role = (
  SELECT CASE
    WHEN COUNT(*) = 0 THEN
      'ALTER TABLE project_members ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT ''REPORTER'''
    ELSE 'SELECT 1'
  END
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'project_members'
    AND COLUMN_NAME = 'role'
);
PREPARE add_member_role FROM @add_member_role;
EXECUTE add_member_role;
DEALLOCATE PREPARE add_member_role;
