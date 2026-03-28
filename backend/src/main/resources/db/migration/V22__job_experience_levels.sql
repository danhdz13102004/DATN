-- V22: Replace jobs.experience_level (single) with job_experience_levels join table (multi)

-- 1. Create the new join table
CREATE TABLE IF NOT EXISTS job_experience_levels (
    job_id  UUID             NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    level   experience_level NOT NULL,
    PRIMARY KEY (job_id, level)
);

-- 2. Migrate existing data from the old single-value column
INSERT INTO job_experience_levels (job_id, level)
SELECT id, experience_level
FROM jobs
WHERE experience_level IS NOT NULL;

-- 3. Drop the old column
ALTER TABLE jobs DROP COLUMN IF EXISTS experience_level;
