-- Port calls per voyage
CREATE TABLE IF NOT EXISTS port_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voyage_id UUID REFERENCES voyages(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  port_id UUID REFERENCES ports(id) ON DELETE SET NULL,
  port_name TEXT NOT NULL,
  activity VARCHAR(20) CHECK (activity IN ('load','discharge','bunker','other')) DEFAULT 'other',
  sequence INT DEFAULT 1,
  eta TIMESTAMPTZ,
  etd TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_port_calls_voyage_id ON port_calls(voyage_id);
CREATE INDEX IF NOT EXISTS idx_port_calls_tenant_id ON port_calls(tenant_id);

CREATE OR REPLACE FUNCTION update_port_calls_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_port_calls_updated ON port_calls;
CREATE TRIGGER trg_port_calls_updated BEFORE UPDATE ON port_calls
  FOR EACH ROW EXECUTE FUNCTION update_port_calls_updated_at();

-- Reversible scope for claims (load-only, discharge-only, or all)
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS reversible_scope VARCHAR(20) CHECK (reversible_scope IN ('load_only','discharge_only','all_ports')) DEFAULT 'all_ports',
  ADD COLUMN IF NOT EXISTS port_call_id UUID REFERENCES port_calls(id) ON DELETE SET NULL;
