-- V7: Job seekers
CREATE TABLE IF NOT EXISTS job_seekers (
    id                  UUID            PRIMARY KEY,
    user_id             UUID            NOT NULL REFERENCES users(id),
    avatar_url          VARCHAR(500),
    bio                 TEXT,
    location            VARCHAR(255),
    experience_years    INT,
    created_at          TIMESTAMPTZ     NOT NULL,
    updated_at          TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_seekers_user_id ON job_seekers (user_id);
