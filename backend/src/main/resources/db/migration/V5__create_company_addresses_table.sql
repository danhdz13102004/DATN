-- V5: Company addresses
CREATE TABLE IF NOT EXISTS company_addresses (
    id              UUID            PRIMARY KEY,
    company_id      UUID            NOT NULL REFERENCES companies(id),
    label           VARCHAR(100),
    address_line    VARCHAR(500)    NOT NULL,
    city            VARCHAR(100),
    country         VARCHAR(100)    NOT NULL DEFAULT 'Vietnam',
    is_default      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL,
    updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_company_addresses_company_id
    ON company_addresses (company_id);
