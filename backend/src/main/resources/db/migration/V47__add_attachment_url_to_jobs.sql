-- Adds attachment_url column to jobs table for storing job attachment file URLs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(1024);
