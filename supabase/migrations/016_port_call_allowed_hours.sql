-- Add allowed hours per port call to support reversible laytime pooling
ALTER TABLE port_calls
  ADD COLUMN IF NOT EXISTS allowed_hours DECIMAL(15,2);
