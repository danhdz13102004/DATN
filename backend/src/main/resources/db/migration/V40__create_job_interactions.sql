-- V40: Job interactions table for behavioral tracking and AI recommendation signals

DO $$ BEGIN
    CREATE TYPE interaction_event_type AS ENUM ('click', 'save', 'apply');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS job_interactions (
    id            UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    job_seeker_id UUID                    REFERENCES job_seekers(id) ON DELETE SET NULL,
    job_id        UUID                    NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    event_type    interaction_event_type  NOT NULL,
    metadata      JSONB,
    created_at    TIMESTAMPTZ             NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_interactions_job_seeker_id ON job_interactions (job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_job_interactions_job_id        ON job_interactions (job_id);
CREATE INDEX IF NOT EXISTS idx_job_interactions_event_type    ON job_interactions (event_type);
CREATE INDEX IF NOT EXISTS idx_job_interactions_seeker_job    ON job_interactions (job_seeker_id, job_id);

-- Add updated_at to saved_jobs for completeness
ALTER TABLE saved_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
