-- V42: Add missing columns to companies table
-- These columns exist in the Company entity but were never migrated
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count_min INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count_max INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_at TIMESTAMPTZ;
