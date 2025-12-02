-- Broaden claim_status to align with QC-driven workflow
-- Map old statuses and expand allowed values
UPDATE claims
SET claim_status = 'created'
WHERE claim_status = 'draft';

ALTER TABLE claims
  DROP CONSTRAINT IF EXISTS claims_claim_status_check,
  ALTER COLUMN claim_status SET DEFAULT 'created',
  ADD CONSTRAINT claims_claim_status_check
    CHECK (claim_status IN (
      'created',
      'in_progress',
      'for_qc',
      'qc_in_progress',
      'pending_reply',
      'missing_information',
      'pending_counter_check',
      'completed',
      'archived'
    ));
