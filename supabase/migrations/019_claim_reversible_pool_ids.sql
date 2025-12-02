-- Persist reversible pooling selection per claim
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS reversible_pool_ids UUID[] DEFAULT '{}';

