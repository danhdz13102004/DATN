-- V17: Payments
CREATE TABLE IF NOT EXISTS payments (
    id              UUID                PRIMARY KEY,
    company_id      UUID                NOT NULL REFERENCES companies(id),
    subscription_id UUID                NOT NULL REFERENCES subscriptions(id),
    amount          DECIMAL(12,2)       NOT NULL,
    currency        VARCHAR(10)         NOT NULL DEFAULT 'VND',
    gateway         payment_gateway     NOT NULL,
    status          payment_status      NOT NULL DEFAULT 'PENDING',
    transaction_id  VARCHAR(255),
    created_at      TIMESTAMPTZ         NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments (company_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments (subscription_id);
