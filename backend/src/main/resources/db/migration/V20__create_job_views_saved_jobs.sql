-- V20: Job views and Saved jobs (behavioral signals for AI)

CREATE TABLE IF NOT EXISTS job_views (
    id                  UUID        PRIMARY KEY,
    job_seeker_id       UUID        NOT NULL REFERENCES job_seekers(id),
    job_id              UUID        NOT NULL REFERENCES jobs(id),
    viewed_at           TIMESTAMPTZ NOT NULL,
    duration_seconds    INT
);

CREATE INDEX IF NOT EXISTS idx_job_views_job_seeker_id ON job_views (job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views (job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_seeker_job ON job_views (job_seeker_id, job_id);

CREATE TABLE IF NOT EXISTS saved_jobs (
    id              UUID        PRIMARY KEY,
    job_seeker_id   UUID        NOT NULL REFERENCES job_seekers(id),
    job_id          UUID        NOT NULL REFERENCES jobs(id),
    created_at      TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_jobs_seeker_job ON saved_jobs (job_seeker_id, job_id);
