-- V15: Notifications (hard delete)
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID                PRIMARY KEY,
    user_id         UUID                NOT NULL REFERENCES users(id),
    type            notification_type   NOT NULL,
    content         TEXT                NOT NULL,
    is_read         BOOLEAN             NOT NULL DEFAULT FALSE,
    reference_id    UUID,
    reference_type  VARCHAR(50),
    created_at      TIMESTAMPTZ         NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read
    ON notifications (user_id, is_read) WHERE is_read = FALSE;
