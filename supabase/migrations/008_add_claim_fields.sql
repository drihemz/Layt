-- Add extended laytime/demurrage fields to claims
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS operation_type VARCHAR(20) CHECK (operation_type IN ('load','discharge')),
  ADD COLUMN IF NOT EXISTS port_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS load_discharge_rate DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS load_discharge_rate_unit VARCHAR(20) CHECK (load_discharge_rate_unit IN ('per_day','per_hour','fixed_duration')),
  ADD COLUMN IF NOT EXISTS fixed_rate_duration_hours DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS reversible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS demurrage_rate DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS demurrage_currency VARCHAR(10),
  ADD COLUMN IF NOT EXISTS demurrage_after_hours DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS demurrage_rate_after DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS despatch_type VARCHAR(20) CHECK (despatch_type IN ('amount','percent')),
  ADD COLUMN IF NOT EXISTS despatch_rate_value DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS despatch_currency VARCHAR(10),
  ADD COLUMN IF NOT EXISTS laycan_start TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS laycan_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS nor_tendered_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS loading_start_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS loading_end_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS laytime_start TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS laytime_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS turn_time_method TEXT,
  ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id);

-- Add weekend/holiday window info and is_public to terms
ALTER TABLE terms
  ADD COLUMN IF NOT EXISTS window_start_day VARCHAR(20),
  ADD COLUMN IF NOT EXISTS window_start_time TIME,
  ADD COLUMN IF NOT EXISTS window_end_day VARCHAR(20),
  ADD COLUMN IF NOT EXISTS window_end_time TIME,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Update read policy for terms to include public visibility
DROP POLICY IF EXISTS "Allow tenant members to read terms" ON public.terms;
CREATE POLICY "Allow tenant members to read terms"
  ON public.terms FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid) OR is_public = TRUE);
