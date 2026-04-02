-- V25: Job seeker skills (many-to-many join table)
CREATE TABLE IF NOT EXISTS job_seeker_skills (
    job_seeker_id UUID NOT NULL REFERENCES job_seekers(id),
    skill_id      UUID NOT NULL REFERENCES skills(id),
    PRIMARY KEY (job_seeker_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_jss_seeker ON job_seeker_skills (job_seeker_id);
