-- Add Google OAuth fields to users table
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Index for fast google_id lookups
CREATE INDEX idx_users_google_id ON users(google_id);
