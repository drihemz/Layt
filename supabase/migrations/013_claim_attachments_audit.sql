-- Attachments for claims (NOR/SOF/other)
CREATE TABLE IF NOT EXISTS claim_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  attachment_type VARCHAR(20) CHECK (attachment_type IN ('nor','sof','other')) DEFAULT 'other',
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_attachments_claim_id ON claim_attachments(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_attachments_tenant_id ON claim_attachments(tenant_id);

-- Audit trail for calculation_events
CREATE TABLE IF NOT EXISTS calculation_events_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE NOT NULL,
  event_id UUID,
  action VARCHAR(10) CHECK (action IN ('insert','update','delete')),
  data JSONB,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calc_events_audit_claim_id ON calculation_events_audit(claim_id);

CREATE OR REPLACE FUNCTION log_calculation_event_audit() RETURNS trigger AS $$
DECLARE
  uid UUID := null;
BEGIN
  BEGIN
    uid := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
  EXCEPTION WHEN others THEN
    uid := null;
  END;
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO calculation_events_audit (claim_id, event_id, action, data, user_id)
    VALUES (OLD.claim_id, OLD.id, 'delete', to_jsonb(OLD), uid);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO calculation_events_audit (claim_id, event_id, action, data, user_id)
    VALUES (NEW.claim_id, NEW.id, 'update', to_jsonb(NEW), uid);
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO calculation_events_audit (claim_id, event_id, action, data, user_id)
    VALUES (NEW.claim_id, NEW.id, 'insert', to_jsonb(NEW), uid);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_events_audit ON calculation_events;
CREATE TRIGGER trg_calc_events_audit
AFTER INSERT OR UPDATE OR DELETE ON calculation_events
FOR EACH ROW EXECUTE FUNCTION log_calculation_event_audit();
