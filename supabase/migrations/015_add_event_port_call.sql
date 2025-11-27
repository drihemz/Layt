-- Link SOF events to port calls for reversible scope handling
ALTER TABLE calculation_events
  ADD COLUMN IF NOT EXISTS port_call_id UUID REFERENCES port_calls(id) ON DELETE SET NULL;
