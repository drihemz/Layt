-- Add holiday handling to terms
ALTER TABLE terms
  ADD COLUMN IF NOT EXISTS include_holidays BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS holiday_name TEXT,
  ADD COLUMN IF NOT EXISTS holiday_start DATE,
  ADD COLUMN IF NOT EXISTS holiday_end DATE;

-- Separate table for multiple holidays per term with time support
CREATE TABLE IF NOT EXISTS term_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  holiday_name TEXT,
  holiday_start TIMESTAMP WITH TIME ZONE,
  holiday_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_term_holidays_term_id ON term_holidays(term_id);
CREATE TRIGGER update_term_holidays_updated_at BEFORE UPDATE ON term_holidays
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
