-- Allow calculation_events_audit to keep history after claim deletion
ALTER TABLE calculation_events_audit
  ALTER COLUMN claim_id DROP NOT NULL;

ALTER TABLE calculation_events_audit
  DROP CONSTRAINT IF EXISTS calculation_events_audit_claim_id_fkey,
  ADD CONSTRAINT calculation_events_audit_claim_id_fkey
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE SET NULL;
