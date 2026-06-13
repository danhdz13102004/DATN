-- V48: Countries and Cities tables + FK in company_addresses
-- Step 1: Create countries table
CREATE TABLE IF NOT EXISTS countries (
    id          BIGSERIAL PRIMARY KEY,
    iso2        VARCHAR(2) UNIQUE NOT NULL,
    iso3        VARCHAR(3),
    name        VARCHAR(255) NOT NULL,
    latitude    DECIMAL(10, 7),
    longitude   DECIMAL(10, 7)
);

CREATE INDEX IF NOT EXISTS idx_countries_name ON countries (name);

-- Step 2: Create cities table
CREATE TABLE IF NOT EXISTS cities (
    id          BIGSERIAL PRIMARY KEY,
    country_id  BIGINT NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cities_country_id ON cities (country_id);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities (name);

-- Step 3: Add country_id and city_id to company_addresses
ALTER TABLE company_addresses ADD COLUMN IF NOT EXISTS country_id BIGINT REFERENCES countries(id);
ALTER TABLE company_addresses ADD COLUMN IF NOT EXISTS city_id BIGINT REFERENCES cities(id);

-- Step 4: Migrate existing data — match country string to new country names
UPDATE company_addresses ca
SET country_id = c.id
FROM countries c
WHERE LOWER(TRIM(ca.country)) = LOWER(c.name)
  AND ca.country_id IS NULL;

-- After migration, city/country string columns are kept for backward compatibility
-- but should be considered deprecated. The FK columns are the source of truth going forward.
