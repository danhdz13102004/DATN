-- V38: Distinguish must-have skills (existing job_skills junction) and add nice_to_have_skills text array
-- The job_skills table already represents must-have skills (linked to skill master entities).
-- This migration adds a free-text array column for nice-to-have skills.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS nice_to_have_skills TEXT[];
