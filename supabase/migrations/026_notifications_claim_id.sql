-- Ensure claim_id column exists on notifications (in case earlier migration missed cache)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS claim_id UUID REFERENCES claims(id) ON DELETE CASCADE;
