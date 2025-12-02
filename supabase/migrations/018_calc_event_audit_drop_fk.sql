-- Remove FK on calculation_events_audit.claim_id to avoid failures when claims/events are deleted
ALTER TABLE calculation_events_audit
  DROP CONSTRAINT IF EXISTS calculation_events_audit_claim_id_fkey;

ALTER TABLE calculation_events_audit
  ALTER COLUMN claim_id DROP NOT NULL;
