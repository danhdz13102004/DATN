-- V18: Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID            PRIMARY KEY,
    user_id     UUID            REFERENCES users(id),
    action      audit_action    NOT NULL,
    entity_type VARCHAR(50)     NOT NULL,
    entity_id   UUID,
    metadata    JSONB,
    created_at  TIMESTAMPTZ     NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
