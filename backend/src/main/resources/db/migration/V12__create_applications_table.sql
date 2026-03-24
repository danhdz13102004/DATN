-- V12: Applications (soft delete)
CREATE TABLE IF NOT EXISTS applications (
    id              UUID                    PRIMARY KEY,
    job_id          UUID                    NOT NULL REFERENCES jobs(id),
    job_seeker_id   UUID                    NOT NULL REFERENCES job_seekers(id),
    resume_id       UUID                    REFERENCES resumes(id),
    ai_score        FLOAT,
    status          application_status      NOT NULL DEFAULT 'APPLIED',
    created_at      TIMESTAMPTZ             NOT NULL,
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

-- Prevent duplicate applications per job-seeker pair
CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_job_seeker
    ON applications (job_id, job_seeker_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_applications_job_id_status
    ON applications (job_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_applications_job_seeker_id
    ON applications (job_seeker_id);
