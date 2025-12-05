-- Laytime foundations: core tables for cargo/CP/profile/calculation/events
CREATE TABLE IF NOT EXISTS charter_parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  voyage_id UUID REFERENCES voyages(id) ON DELETE CASCADE,
  cp_number TEXT,
  charterer_id UUID REFERENCES parties(id),
  laytime_allowed_value NUMERIC,
  laytime_allowed_unit TEXT CHECK (laytime_allowed_unit IN ('HOURS','DAYS','TONNES_PER_DAY')),
  laytime_scope TEXT CHECK (laytime_scope IN ('PER_PORT','AGGREGATE_PORTS','PER_OPERATION')),
  demurrage_rate_per_day NUMERIC,
  despatch_rate_per_day NUMERIC,
  currency TEXT,
  reversible_terms_enabled BOOLEAN DEFAULT FALSE,
  proration_allowed BOOLEAN DEFAULT FALSE,
  cargo_match_allowed BOOLEAN DEFAULT FALSE,
  despatch_applicability TEXT CHECK (despatch_applicability IN ('ALL','DRY_ONLY','NONE')) DEFAULT 'ALL',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cargoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  voyage_id UUID REFERENCES voyages(id) ON DELETE CASCADE,
  cp_id UUID REFERENCES charter_parties(id) ON DELETE SET NULL,
  cargo_name TEXT NOT NULL,
  grade TEXT,
  quantity NUMERIC,
  unit TEXT,
  load_port_call_id UUID REFERENCES port_calls(id) ON DELETE SET NULL,
  discharge_port_call_id UUID REFERENCES port_calls(id) ON DELETE SET NULL,
  laytime_terms_profile_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS laytime_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  working_time_definition TEXT CHECK (working_time_definition IN ('SHEX','SHINC','WWD','CUSTOM')),
  nor_start_trigger TEXT CHECK (nor_start_trigger IN ('NOR_TENDERED','NOR_ACCEPTED','CUSTOM_DATE')) DEFAULT 'NOR_TENDERED',
  nor_offset_hours NUMERIC DEFAULT 0,
  start_next_working_period BOOLEAN DEFAULT FALSE,
  rounding_rule TEXT CHECK (rounding_rule IN ('EXACT','ROUND_UP_HOUR','ROUND_DOWN_HOUR')) DEFAULT 'EXACT',
  default_count_rules JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS laytime_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  voyage_id UUID REFERENCES voyages(id) ON DELETE CASCADE,
  cp_ids UUID[] DEFAULT '{}',
  cargo_ids UUID[] DEFAULT '{}',
  status TEXT CHECK (status IN ('draft','final','cancelled')) DEFAULT 'draft',
  calculation_method TEXT CHECK (calculation_method IN ('STANDARD','REVERSIBLE','AVERAGE')) DEFAULT 'STANDARD',
  time_on_demurrage_minutes NUMERIC DEFAULT 0,
  time_on_despatch_minutes NUMERIC DEFAULT 0,
  time_used_minutes NUMERIC DEFAULT 0,
  time_allowed_minutes NUMERIC DEFAULT 0,
  demurrage_amount NUMERIC DEFAULT 0,
  despatch_amount NUMERIC DEFAULT 0,
  currency TEXT,
  statement_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS port_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  laytime_calculation_id UUID REFERENCES laytime_calculations(id) ON DELETE CASCADE,
  port_call_id UUID REFERENCES port_calls(id) ON DELETE CASCADE,
  event_type TEXT,
  from_datetime TIMESTAMPTZ,
  to_datetime TIMESTAMPTZ,
  duration_minutes NUMERIC,
  count_behavior JSONB DEFAULT '{}'::jsonb,
  deduction_reason_code TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS port_deductions_additions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  laytime_calculation_id UUID REFERENCES laytime_calculations(id) ON DELETE CASCADE,
  port_call_id UUID REFERENCES port_calls(id) ON DELETE CASCADE,
  applies_to_cargo_ids UUID[] DEFAULT '{}',
  type TEXT CHECK (type IN ('DEDUCTION','ADDITION')),
  reason_code TEXT,
  description TEXT,
  from_datetime TIMESTAMPTZ,
  to_datetime TIMESTAMPTZ,
  flat_duration_minutes NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cargo_port_laytime_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  laytime_calculation_id UUID REFERENCES laytime_calculations(id) ON DELETE CASCADE,
  cargo_id UUID REFERENCES cargoes(id) ON DELETE CASCADE,
  port_call_id UUID REFERENCES port_calls(id) ON DELETE CASCADE,
  operation_type TEXT CHECK (operation_type IN ('LOAD','DISCHARGE')),
  laytime_allowed_minutes NUMERIC DEFAULT 0,
  laytime_used_minutes NUMERIC DEFAULT 0,
  deductions_minutes NUMERIC DEFAULT 0,
  additions_minutes NUMERIC DEFAULT 0,
  time_on_demurrage_minutes NUMERIC DEFAULT 0,
  time_on_despatch_minutes NUMERIC DEFAULT 0,
  reversible_group_id TEXT,
  prorate_group_id TEXT,
  cargo_match_group_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS and policies (tenant-scoped; service_role bypasses)
ALTER TABLE charter_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE laytime_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE laytime_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE port_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE port_deductions_additions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargo_port_laytime_rows ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
  pol_name TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'charter_parties',
      'cargoes',
      'laytime_profiles',
      'laytime_calculations',
      'port_activities',
      'port_deductions_additions',
      'cargo_port_laytime_rows'
    ])
  LOOP
    pol_name := tbl || '_tenant_select';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = pol_name) THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = current_setting(''request.jwt.claim.tenantId'', true)::uuid OR auth.role() = ''service_role'')', pol_name, tbl);
    END IF;

    pol_name := tbl || '_tenant_insert';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = pol_name) THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (tenant_id = current_setting(''request.jwt.claim.tenantId'', true)::uuid OR auth.role() = ''service_role'')', pol_name, tbl);
    END IF;

    pol_name := tbl || '_tenant_update';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = pol_name) THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (tenant_id = current_setting(''request.jwt.claim.tenantId'', true)::uuid OR auth.role() = ''service_role'')', pol_name, tbl);
    END IF;

    pol_name := tbl || '_tenant_delete';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = pol_name) THEN
      EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (tenant_id = current_setting(''request.jwt.claim.tenantId'', true)::uuid OR auth.role() = ''service_role'')', pol_name, tbl);
    END IF;
  END LOOP;
END $$;
