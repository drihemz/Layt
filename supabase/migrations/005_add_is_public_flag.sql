-- ============================================
-- MIGRATION 005: ADD IS_PUBLIC FLAG TO LOOKUP TABLES
-- This migration adds an is_public boolean flag to all lookup tables
-- to allow super admins to create records that are visible to all tenants.
-- ============================================

-- Add is_public column to parties table
ALTER TABLE public.parties ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Add is_public column to vessels table
ALTER TABLE public.vessels ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Add is_public column to ports table
ALTER TABLE public.ports ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Add is_public column to cargo_names table
ALTER TABLE public.cargo_names ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Add is_public column to charter_parties table
ALTER TABLE public.charter_parties ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- ============================================
-- UPDATE RLS POLICIES
-- This section updates the RLS policies to allow all users to read
-- records where is_public is true.
-- ============================================

-- Update parties read policy
DROP POLICY "Allow tenant members to read parties" ON public.parties;
CREATE POLICY "Allow tenant members to read parties"
  ON public.parties FOR SELECT
  USING (tenant_id = auth.tenant_id() OR is_public = TRUE);

-- Update vessels read policy
DROP POLICY "Allow tenant members to read vessels" ON public.vessels;
CREATE POLICY "Allow tenant members to read vessels"
  ON public.vessels FOR SELECT
  USING (tenant_id = auth.tenant_id() OR is_public = TRUE);

-- Update ports read policy
DROP POLICY "Allow tenant members to read ports" ON public.ports;
CREATE POLICY "Allow tenant members to read ports"
  ON public.ports FOR SELECT
  USING (tenant_id = auth.tenant_id() OR is_public = TRUE);

-- Update cargo_names read policy
DROP POLICY "Allow tenant members to read cargo_names" ON public.cargo_names;
CREATE POLICY "Allow tenant members to read cargo_names"
  ON public.cargo_names FOR SELECT
  USING (tenant_id = auth.tenant_id() OR is_public = TRUE);

-- Update charter_parties read policy
DROP POLICY "Allow tenant members to read charter_parties" ON public.charter_parties;
CREATE POLICY "Allow tenant members to read charter_parties"
  ON public.charter_parties FOR SELECT
  USING (tenant_id = auth.tenant_id() OR is_public = TRUE);


-- Final notification
SELECT 'Migration 005_add_is_public_flag.sql executed successfully.' as result;
