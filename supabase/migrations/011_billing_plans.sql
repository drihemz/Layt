-- Billing and plans
CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TYPE plan_status AS ENUM ('active', 'inactive');
CREATE TYPE tenant_plan_status AS ENUM ('active', 'canceled', 'trialing');
CREATE TYPE invoice_status AS ENUM ('draft', 'due', 'paid', 'overdue');

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price_cents BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  max_admins INT,
  max_operators INT,
  allow_data_management BOOLEAN DEFAULT TRUE,
  data_tabs JSONB DEFAULT '{}'::jsonb, -- per-tab enable/disable
  max_voyages INT,
  max_claims INT,
  status plan_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE RESTRICT NOT NULL,
  status tenant_plan_status NOT NULL DEFAULT 'active',
  seats_admins INT,
  seats_operators INT,
  starts_at DATE DEFAULT CURRENT_DATE,
  ends_at DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  period_start DATE,
  period_end DATE,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status invoice_status NOT NULL DEFAULT 'draft',
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_tenant_id ON tenant_plans(tenant_id);

-- Timestamp triggers
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_tenant_plans_updated BEFORE UPDATE ON tenant_plans FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_timestamp();

