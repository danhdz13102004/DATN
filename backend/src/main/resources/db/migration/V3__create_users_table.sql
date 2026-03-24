-- V3: Users table (soft delete)
CREATE TABLE IF NOT EXISTS users (
    id              UUID            PRIMARY KEY,
    email           VARCHAR(255)    NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    role            user_role       NOT NULL,
    status          user_status     NOT NULL DEFAULT 'PENDING_VERIFICATION',
    email_verified_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL,
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

-- Unique email among non-deleted users
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email
    ON users (email) WHERE deleted_at IS NULL;
