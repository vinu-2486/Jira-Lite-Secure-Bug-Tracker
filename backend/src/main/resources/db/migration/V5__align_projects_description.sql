SET @add_project_description = (
  SELECT CASE
    WHEN COUNT(*) = 0 THEN
      'ALTER TABLE projects ADD COLUMN description VARCHAR(500) NULL'
    ELSE 'SELECT 1'
  END
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND COLUMN_NAME = 'description'
);
PREPARE add_project_description FROM @add_project_description;
EXECUTE add_project_description;
DEALLOCATE PREPARE add_project_description;
