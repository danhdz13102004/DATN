-- V45: Allow admins to block companies from logging in and public job visibility.
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
