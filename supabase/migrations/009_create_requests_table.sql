-- Requests table for operator-submitted lookup additions
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  request_type VARCHAR(50) NOT NULL, -- e.g., parties, vessels, ports, cargo_names, charter_parties, terms
  name TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_tenant_id ON requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Basic RLS: tenant members can see their requests; super_admin unrestricted
CREATE POLICY "requests_select" ON requests
  FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid) OR (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'super_admin'));

CREATE POLICY "requests_insert" ON requests
  FOR INSERT
  WITH CHECK (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "requests_update" ON requests
  FOR UPDATE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid) OR (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'super_admin'));

-- Trigger updated_at
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
