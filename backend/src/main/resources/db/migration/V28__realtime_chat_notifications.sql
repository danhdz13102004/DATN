-- V28: Realtime Chat & Notification Schema
-- Drops old tables and recreates with full real-time schema

-- ─── Add new enum types (idempotent) ──────────────────────────────────────
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
        CREATE TYPE message_type AS ENUM ('TEXT', 'FILE');
    END IF;
END $$;

-- ─── Drop old tables (order matters: FK children first) ────────────────────
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS message_reads CASCADE;

-- ─── conversations ─────────────────────────────────────────────────────────
CREATE TABLE conversations (
    id              UUID        PRIMARY KEY,
    application_id  UUID        NOT NULL REFERENCES applications(id),
    staff_id        UUID        NOT NULL REFERENCES staff(id),
    job_seeker_id   UUID        NOT NULL REFERENCES job_seekers(id),
    is_initiated    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ,
    CONSTRAINT uq_conversations_participants UNIQUE (application_id, staff_id, job_seeker_id)
);

CREATE INDEX idx_conversations_application_id ON conversations (application_id);
CREATE INDEX idx_conversations_staff_id       ON conversations (staff_id);
CREATE INDEX idx_conversations_job_seeker_id  ON conversations (job_seeker_id);

-- ─── messages ──────────────────────────────────────────────────────────────
CREATE TABLE messages (
    id               UUID            PRIMARY KEY,
    conversation_id  UUID            NOT NULL REFERENCES conversations(id),
    sender_id        UUID            NOT NULL REFERENCES users(id),
    content          TEXT,
    type             message_type    NOT NULL DEFAULT 'TEXT',
    file_key         VARCHAR(500),
    file_name        VARCHAR(255),
    file_size_bytes  BIGINT,
    idempotency_key  VARCHAR(100)    UNIQUE,
    created_at       TIMESTAMPTZ     NOT NULL
);

CREATE INDEX idx_messages_conversation_id           ON messages (conversation_id);
CREATE INDEX idx_messages_sender_id                 ON messages (sender_id);
CREATE INDEX idx_messages_conversation_created_at   ON messages (conversation_id, created_at);

-- ─── message_reads ─────────────────────────────────────────────────────────
CREATE TABLE message_reads (
    id                    UUID        PRIMARY KEY,
    conversation_id       UUID        NOT NULL REFERENCES conversations(id),
    user_id               UUID        NOT NULL REFERENCES users(id),
    last_read_message_id  UUID        NOT NULL REFERENCES messages(id),
    read_at               TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_message_reads_conv_user UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_message_reads_conversation_id ON message_reads (conversation_id);
CREATE INDEX idx_message_reads_user_id         ON message_reads (user_id);

-- ─── notifications ─────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id              UUID                PRIMARY KEY,
    user_id         UUID                NOT NULL REFERENCES users(id),
    type            notification_type   NOT NULL,
    title           VARCHAR(255)        NOT NULL,
    content         TEXT                NOT NULL,
    is_read         BOOLEAN             NOT NULL DEFAULT FALSE,
    reference_id    UUID,
    reference_type  VARCHAR(50),
    created_at      TIMESTAMPTZ         NOT NULL
);

CREATE INDEX idx_notifications_user_is_read     ON notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user_created_at  ON notifications (user_id, created_at DESC);
