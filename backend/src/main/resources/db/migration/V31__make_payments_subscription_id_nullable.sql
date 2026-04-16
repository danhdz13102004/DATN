-- A pending Stripe payment has no subscription yet — it is linked after the webhook fires.
ALTER TABLE payments
    ALTER COLUMN subscription_id DROP NOT NULL;
