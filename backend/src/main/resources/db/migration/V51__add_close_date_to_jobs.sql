ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS close_date DATE;

CREATE INDEX IF NOT EXISTS idx_jobs_public_close_date
    ON jobs (status, close_date)
    WHERE deleted_at IS NULL;
