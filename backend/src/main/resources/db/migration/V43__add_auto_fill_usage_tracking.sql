-- V43: Add auto-fill usage tracking fields
-- auto_fill_limit: max uses per subscription period (0 = unlimited)
-- auto_fill_usage_count: how many times the company has used AI auto-fill

ALTER TABLE plans
    ADD COLUMN IF NOT EXISTS auto_fill_limit INTEGER NOT NULL DEFAULT 0;

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS auto_fill_usage_count INTEGER NOT NULL DEFAULT 0;
