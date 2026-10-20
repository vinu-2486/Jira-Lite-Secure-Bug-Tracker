SET @add_project_key = (
  SELECT CASE
    WHEN COUNT(*) = 0 THEN
      'ALTER TABLE projects ADD COLUMN project_key VARCHAR(20) NULL'
    ELSE 'SELECT 1'
  END
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND COLUMN_NAME = 'project_key'
);
PREPARE add_project_key FROM @add_project_key;
EXECUTE add_project_key;
DEALLOCATE PREPARE add_project_key;

UPDATE projects
SET project_key = CONCAT('P', id)
WHERE project_key IS NULL OR project_key = '';

ALTER TABLE projects MODIFY project_key VARCHAR(20) NOT NULL;
