-- Migration to expand lookup tables for more detailed data management

-- ============================================
-- STEP 1: CREATE NEW 'parties' TABLE
-- This table will replace owner_names, charterer_names, counterparties
-- ============================================
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  party_type VARCHAR(100), -- e.g., 'Vessel Owner', 'Charterer', 'Port Agent'
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  tax_id VARCHAR(100),
  kyc_status VARCHAR(50) DEFAULT 'Pending', -- e.g., 'Pending', 'Verified', 'Rejected'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, tenant_id)
);
CREATE INDEX idx_parties_tenant_id ON parties(tenant_id);
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_parties_updated_at BEFORE UPDATE ON parties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- STEP 2: REMOVE FOREIGN KEY CONSTRAINTS FROM OLD TABLES
-- We must do this before we can drop the old tables.
-- ============================================
-- Alter voyages table
ALTER TABLE voyages DROP CONSTRAINT IF EXISTS voyages_owner_name_id_fkey;
ALTER TABLE voyages DROP CONSTRAINT IF EXISTS voyages_charterer_name_id_fkey;
-- Alter claims table
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_counterparty_id_fkey;


-- ============================================
-- STEP 3: DROP OLD LOOKUP TABLES
-- ============================================
DROP TABLE IF EXISTS owner_names;
DROP TABLE IF EXISTS charterer_names;
DROP TABLE IF EXISTS counterparties;


-- ============================================
-- STEP 4: ADD NEW FOREIGN KEY COLUMNS to voyages/claims
-- These will link to the new 'parties' table
-- ============================================
ALTER TABLE voyages ADD COLUMN owner_id UUID REFERENCES parties(id);
ALTER TABLE voyages ADD COLUMN charterer_id UUID REFERENCES parties(id);
-- Remove old columns
ALTER TABLE voyages DROP COLUMN IF EXISTS owner_name_id;
ALTER TABLE voyages DROP COLUMN IF EXISTS charterer_name_id;

ALTER TABLE claims ADD COLUMN counterparty_id_new UUID REFERENCES parties(id);
-- We'll rename this back to counterparty_id later, this is to avoid type conflicts
ALTER TABLE claims DROP COLUMN IF EXISTS counterparty_id;
ALTER TABLE claims RENAME COLUMN counterparty_id_new TO counterparty_id;


-- ============================================
-- STEP 5: EXPAND 'vessels' TABLE
-- ============================================
ALTER TABLE vessels ADD COLUMN imo_number INT;
ALTER TABLE vessels ADD COLUMN call_sign VARCHAR(50);
ALTER TABLE vessels ADD COLUMN mmsi INT;
ALTER TABLE vessels ADD COLUMN flag VARCHAR(100);
ALTER TABLE vessels ADD COLUMN year_built INT;
ALTER TABLE vessels ADD COLUMN dwt DECIMAL(15, 2);
ALTER TABLE vessels ADD COLUMN gross_tonnage DECIMAL(15, 2);
ALTER TABLE vessels ADD COLUMN net_tonnage DECIMAL(15, 2);
ALTER TABLE vessels ADD COLUMN vessel_type VARCHAR(100);
ALTER TABLE vessels ADD COLUMN technical_owner_id UUID REFERENCES parties(id);
ALTER TABLE vessels ADD COLUMN commercial_owner_id UUID REFERENCES parties(id);
-- Add unique constraint for IMO number per tenant
ALTER TABLE vessels ADD CONSTRAINT unique_imo_tenant UNIQUE (imo_number, tenant_id);


-- ============================================
-- STEP 6: EXPAND 'ports' TABLE
-- ============================================
ALTER TABLE ports ADD COLUMN un_locode VARCHAR(10);
ALTER TABLE ports ADD COLUMN country VARCHAR(100);
ALTER TABLE ports ADD COLUMN latitude DECIMAL(9, 6);
ALTER TABLE ports ADD COLUMN longitude DECIMAL(9, 6);
-- Add unique constraint for UN/LOCODE per tenant
ALTER TABLE ports ADD CONSTRAINT unique_unlocode_tenant UNIQUE (un_locode, tenant_id);


-- ============================================
-- STEP 7: EXPAND 'charter_parties' TABLE
-- ============================================
ALTER TABLE charter_parties ADD COLUMN charter_party_type VARCHAR(100); -- 'Voyage' or 'Time'
ALTER TABLE charter_parties ADD COLUMN signed_date DATE;
ALTER TABLE charter_parties ADD COLUMN document_url TEXT; -- Link to stored document

-- Note: No changes to 'cargo_names' or 'terms' in this migration.

-- Final notification
SELECT 'Migration 002_expand_lookup_tables.sql executed successfully.' as result;
