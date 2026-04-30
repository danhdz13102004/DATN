-- V33: Add allow_use_ai_matching column to subscriptions table
-- Copied from the plan at subscription-creation time so it persists even if the plan changes.
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS allow_use_ai_matching BOOLEAN NOT NULL DEFAULT FALSE;
