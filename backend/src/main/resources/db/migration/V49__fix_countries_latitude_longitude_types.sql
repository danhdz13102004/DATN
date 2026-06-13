-- Fix latitude/longitude column types: DECIMAL -> DOUBLE PRECISION
-- Hibernate maps Java Double to DOUBLE PRECISION, not DECIMAL
ALTER TABLE countries ALTER COLUMN latitude TYPE DOUBLE PRECISION;
ALTER TABLE countries ALTER COLUMN longitude TYPE DOUBLE PRECISION;
