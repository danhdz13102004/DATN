-- V39: Add json_matching JSONB column to applications table
-- Stores detailed AI matching result (skills, experience, seniority, industry, nice_to_have_skills, overall_score)
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS json_matching JSONB;
