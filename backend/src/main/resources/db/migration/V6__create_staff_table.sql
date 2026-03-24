-- V6: Staff table (company members)
CREATE TABLE IF NOT EXISTS staff (
    id              UUID                PRIMARY KEY,
    user_id         UUID                NOT NULL REFERENCES users(id),
    company_id      UUID                NOT NULL REFERENCES companies(id),
    role            company_user_role   NOT NULL,
    created_at      TIMESTAMPTZ         NOT NULL,
    updated_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_user_id ON staff (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_company_id ON staff (company_id);
