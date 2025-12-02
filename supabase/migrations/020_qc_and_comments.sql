-- QC fields on claims
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS qc_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS qc_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qc_notes TEXT;

-- Claim comments for collaboration
CREATE TABLE IF NOT EXISTS claim_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_comments_claim_id ON claim_comments(claim_id);
