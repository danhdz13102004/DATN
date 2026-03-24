-- V13: Interviews
CREATE TABLE IF NOT EXISTS interviews (
    id              UUID                PRIMARY KEY,
    application_id  UUID                NOT NULL REFERENCES applications(id),
    interviewer_id  UUID                NOT NULL REFERENCES staff(id),
    scheduled_time  TIMESTAMPTZ         NOT NULL,
    meeting_type    meeting_type        NOT NULL,
    meeting_link    VARCHAR(500),
    status          interview_status    NOT NULL DEFAULT 'PENDING',
    note            TEXT,
    created_at      TIMESTAMPTZ         NOT NULL,
    updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_interviews_application_id ON interviews (application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON interviews (interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_time ON interviews (scheduled_time);
