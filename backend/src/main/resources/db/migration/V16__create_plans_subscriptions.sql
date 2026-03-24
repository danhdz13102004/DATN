-- V16: Plans and Subscriptions
CREATE TABLE IF NOT EXISTS plans (
    id              UUID            PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    price           DECIMAL(12,2)   NOT NULL,
    job_post_limit  INT             NOT NULL,
    duration_days   INT             NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id                  UUID                    PRIMARY KEY,
    company_id          UUID                    NOT NULL REFERENCES companies(id),
    plan_id             UUID                    NOT NULL REFERENCES plans(id),
    start_date          TIMESTAMPTZ             NOT NULL,
    end_date            TIMESTAMPTZ             NOT NULL,
    status              subscription_status     NOT NULL DEFAULT 'ACTIVE',
    jobs_posted_count   INT                     NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ             NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON subscriptions (company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions (plan_id);
