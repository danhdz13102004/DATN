-- V30: Add Stripe session ID column to payments table
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);
