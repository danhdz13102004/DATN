-- V32: Fix job_skills table — replace surrogate UUID PK with composite PK (job_id, skill_id)
-- The surrogate id column caused Hibernate @ManyToMany inserts to fail with a NOT NULL violation
-- because the generated SQL only provides (job_id, skill_id).
ALTER TABLE job_skills DROP CONSTRAINT IF EXISTS job_skills_pkey;
ALTER TABLE job_skills DROP COLUMN IF EXISTS id;
ALTER TABLE job_skills ADD PRIMARY KEY (job_id, skill_id);
