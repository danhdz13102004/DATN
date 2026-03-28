-- V23: Fix job_skills table — drop redundant unique index now that composite PK exists
-- History: the surrogate `id UUID PRIMARY KEY` was causing Hibernate @ManyToMany inserts to fail
-- with a NOT NULL constraint violation. The id column was dropped and a composite PK (job_id, skill_id)
-- was applied manually. This migration only cleans up the now-redundant unique index from V10.
DROP INDEX IF EXISTS uq_job_skills_job_skill;
