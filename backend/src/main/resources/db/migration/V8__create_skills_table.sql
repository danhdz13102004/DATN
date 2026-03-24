-- V8: Skills (master data)
CREATE TABLE IF NOT EXISTS skills (
    id      UUID            PRIMARY KEY,
    name    VARCHAR(100)    NOT NULL UNIQUE
);
