-- ============================================
-- MIGRATION 005: ADD IS_PUBLIC FLAG AND UPDATE RLS POLICIES (DIRECT)
-- This migration adds an is_public boolean flag to all lookup tables
-- to allow super admins to create records that are visible to all tenants,
-- and it updates the RLS policies accordingly.
-- This version uses the direct current_setting call to avoid issues with the auth.tenant_id() function.
-- This migration is idempotent and can be run multiple times.
-- ============================================

-- Add is_public column to parties table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='parties' AND column_name='is_public') THEN
    ALTER TABLE public.parties ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add is_public column to vessels table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='vessels' AND column_name='is_public') THEN
    ALTER TABLE public.vessels ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add is_public column to ports table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='ports' AND column_name='is_public') THEN
    ALTER TABLE public.ports ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add is_public column to cargo_names table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='cargo_names' AND column_name='is_public') THEN
    ALTER TABLE public.cargo_names ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add is_public column to charter_parties table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='charter_parties' AND column_name='is_public') THEN
    ALTER TABLE public.charter_parties ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ============================================
-- UPDATE RLS POLICIES
-- This section updates the RLS policies to allow all users to read
-- records where is_public is true.
-- ============================================

-- Update parties read policy
DROP POLICY IF EXISTS "Allow tenant members to read parties" ON public.parties;
CREATE POLICY "Allow tenant members to read parties"
  ON public.parties FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid) OR is_public = TRUE);

-- Update vessels read policy
DROP POLICY IF EXISTS "Allow tenant members to read vessels" ON public.vessels;
CREATE POLICY "Allow tenant members to read vessels"
  ON public.vessels FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid) OR is_public = TRUE);

-- Update ports read policy
DROP POLICY IF EXISTS "Allow tenant members to read ports" ON public.ports;
CREATE POLICY "Allow tenant members to read ports"
  ON public.ports FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid) OR is_public = TRUE);

-- Update cargo_names read policy
DROP POLICY IF EXISTS "Allow tenant members to read cargo_names" ON public.cargo_names;
CREATE POLICY "Allow tenant members to read cargo_names"
  ON public.cargo_names FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid) OR is_public = TRUE);

-- Update charter_parties read policy
DROP POLICY IF EXISTS "Allow tenant members to read charter_parties" ON public.charter_parties;
CREATE POLICY "Allow tenant members to read charter_parties"
  ON public.charter_parties FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid) OR is_public = TRUE);


-- Final notification
SELECT 'Migration 005_add_is_public_flag_and_update_rls_direct.sql executed successfully.' as result;
