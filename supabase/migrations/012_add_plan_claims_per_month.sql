ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS max_claims_per_month INT;
