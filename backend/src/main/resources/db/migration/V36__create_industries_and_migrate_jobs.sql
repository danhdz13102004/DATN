-- V36: Create industries table, seed data, migrate jobs.industry → industry_id FK, drop old column

-- 1. Create industries table
CREATE TABLE IF NOT EXISTS industries (
    id   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_industries_name ON industries (name);

-- 2. Seed industries
INSERT INTO industries (id, name) VALUES
    (gen_random_uuid(), 'Technology & IT'),
    (gen_random_uuid(), 'Finance & Banking'),
    (gen_random_uuid(), 'Healthcare & Medical'),
    (gen_random_uuid(), 'Education'),
    (gen_random_uuid(), 'Manufacturing'),
    (gen_random_uuid(), 'Retail & E-commerce'),
    (gen_random_uuid(), 'Marketing & Advertising'),
    (gen_random_uuid(), 'Legal & Compliance'),
    (gen_random_uuid(), 'Real Estate'),
    (gen_random_uuid(), 'Media & Entertainment'),
    (gen_random_uuid(), 'Transportation & Logistics'),
    (gen_random_uuid(), 'Food & Beverage'),
    (gen_random_uuid(), 'Construction'),
    (gen_random_uuid(), 'Government & Public Sector'),
    (gen_random_uuid(), 'Non-profit & NGO'),
    (gen_random_uuid(), 'Energy & Utilities'),
    (gen_random_uuid(), 'Telecommunications'),
    (gen_random_uuid(), 'Consulting'),
    (gen_random_uuid(), 'Human Resources'),
    (gen_random_uuid(), 'Agriculture')
ON CONFLICT (name) DO NOTHING;

-- 3. Add industry_id FK column to jobs
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES industries(id);

-- 4. Migrate existing industry text values to FK references (best-effort match)
UPDATE jobs j
SET industry_id = i.id
FROM industries i
WHERE j.industry IS NOT NULL
  AND LOWER(i.name) = LOWER(j.industry);

-- 5. Drop the old industry varchar column
ALTER TABLE jobs DROP COLUMN IF EXISTS industry;

-- 6. Create index on industry_id
CREATE INDEX IF NOT EXISTS idx_jobs_industry_id ON jobs (industry_id);
