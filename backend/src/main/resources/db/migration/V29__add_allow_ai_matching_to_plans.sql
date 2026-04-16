-- V29: Add allow_use_ai_matching column to plans table
ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS allow_use_ai_matching BOOLEAN NOT NULL DEFAULT FALSE;
