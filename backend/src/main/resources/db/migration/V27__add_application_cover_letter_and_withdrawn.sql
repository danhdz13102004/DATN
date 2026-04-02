-- V27: Add cover_letter column and WITHDRAWN status to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'WITHDRAWN';
