-- V14: Conversations and Messages
CREATE TABLE IF NOT EXISTS conversations (
    id              UUID    PRIMARY KEY,
    job_id          UUID    NOT NULL REFERENCES jobs(id),
    company_user_id UUID    NOT NULL REFERENCES staff(id),
    jobseeker_id    UUID    NOT NULL REFERENCES job_seekers(id),
    created_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_company_user_id ON conversations (company_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_jobseeker_id ON conversations (jobseeker_id);

CREATE TABLE IF NOT EXISTS messages (
    id              UUID            PRIMARY KEY,
    conversation_id UUID            NOT NULL REFERENCES conversations(id),
    sender_id       UUID            NOT NULL REFERENCES users(id),
    message         TEXT            NOT NULL,
    type            message_type    NOT NULL DEFAULT 'TEXT',
    created_at      TIMESTAMPTZ     NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);
