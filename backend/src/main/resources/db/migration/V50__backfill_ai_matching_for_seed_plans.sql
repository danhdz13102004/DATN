-- V50: Seeded Pro/Premium plans were inserted before allow_use_ai_matching
-- was included in DataSeederConfig, so they inherited the default FALSE value.
UPDATE plans
SET allow_use_ai_matching = TRUE
WHERE name IN ('Pro', 'Premium');

UPDATE subscriptions s
SET allow_use_ai_matching = TRUE
FROM plans p
WHERE s.plan_id = p.id
  AND p.allow_use_ai_matching = TRUE;
