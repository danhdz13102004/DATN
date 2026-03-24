-- V4: Companies table (soft delete)
CREATE TABLE IF NOT EXISTS companies (
    id              UUID            PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    website         VARCHAR(500),
    logo_url        VARCHAR(500),
    is_verified     BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL,
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);
