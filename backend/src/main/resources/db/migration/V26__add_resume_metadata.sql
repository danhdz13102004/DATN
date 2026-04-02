-- V26: Add resume metadata columns
-- label: user-defined display name (not the real filename — MinIO uses randomized keys)
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS label VARCHAR(255);
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;
