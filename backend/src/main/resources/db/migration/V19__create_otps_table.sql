-- V19: OTPs (hard delete)
CREATE TABLE IF NOT EXISTS otps (
    id          UUID        PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    code        VARCHAR(10)  NOT NULL,
    type        otp_type     NOT NULL,
    is_used     BOOLEAN      NOT NULL DEFAULT FALSE,
    attempts    INT          NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otps_email ON otps (email);
