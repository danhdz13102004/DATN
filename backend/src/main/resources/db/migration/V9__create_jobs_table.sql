-- V9: Jobs table (soft delete, with pgvector embedding)
CREATE TABLE IF NOT EXISTS jobs (
    id                  UUID                PRIMARY KEY,
    company_id          UUID                NOT NULL REFERENCES companies(id),
    company_address_id  UUID                REFERENCES company_addresses(id),
    title               VARCHAR(255)        NOT NULL,
    description         TEXT,
    experience_level    experience_level,
    location            VARCHAR(255),
    salary_min          INT,
    salary_max          INT,
    job_type            job_type            NOT NULL,
    status              job_status          NOT NULL DEFAULT 'DRAFT',
    embedding           vector(384),
    created_at          TIMESTAMPTZ         NOT NULL,
    updated_at          TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status) WHERE deleted_at IS NULL;
