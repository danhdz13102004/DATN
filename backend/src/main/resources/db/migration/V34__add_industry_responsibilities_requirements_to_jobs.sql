-- V34: Add industry, responsibilities, requirements, job_data_structure to jobs

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS industry           VARCHAR(255),
    ADD COLUMN IF NOT EXISTS responsibilities   TEXT[],
    ADD COLUMN IF NOT EXISTS requirements       TEXT[],
    ADD COLUMN IF NOT EXISTS job_data_structure JSONB;
