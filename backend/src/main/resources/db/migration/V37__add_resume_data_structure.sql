-- V37: Add resume_data_structure JSONB column to resumes table
-- Stores AI-extracted structured data (role, seniority, skills, etc.)
-- for use in ML-based candidate matching.
ALTER TABLE resumes
    ADD COLUMN IF NOT EXISTS resume_data_structure JSONB;
