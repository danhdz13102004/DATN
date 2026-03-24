-- V11: Resumes (soft delete, with pgvector embedding)
CREATE TABLE IF NOT EXISTS resumes (
    id              UUID            PRIMARY KEY,
    job_seeker_id   UUID            NOT NULL REFERENCES job_seekers(id),
    file_url        VARCHAR(500)    NOT NULL,
    parsed_text     TEXT,
    embedding       vector(384),
    created_at      TIMESTAMPTZ     NOT NULL,
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_resumes_job_seeker_id ON resumes (job_seeker_id);
