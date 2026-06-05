-- V44: Add benefits column expected by Company entity
ALTER TABLE companies ADD COLUMN IF NOT EXISTS benefits TEXT;
