-- V10: Job-skills bridge table
CREATE TABLE IF NOT EXISTS job_skills (
    id          UUID    PRIMARY KEY,
    job_id      UUID    NOT NULL REFERENCES jobs(id),
    skill_id    UUID    NOT NULL REFERENCES skills(id)
);

CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills (job_id);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill_id ON job_skills (skill_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_job_skills_job_skill ON job_skills (job_id, skill_id);
