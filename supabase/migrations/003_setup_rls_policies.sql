-- ============================================
-- MIGRATION 003: SETUP ROW LEVEL SECURITY (RLS) POLICIES
-- This migration adds the necessary SELECT, INSERT, UPDATE, DELETE policies
-- to all tenant-scoped tables.
-- ============================================

-- Helper function to get tenant_id from the current session
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid;
$$ LANGUAGE SQL STABLE;


-- ============================================
-- TABLE: parties
-- ============================================
-- Allow users to read parties from their own tenant
CREATE POLICY "Allow tenant members to read parties"
  ON public.parties FOR SELECT
  USING (tenant_id = auth.tenant_id());

-- Allow users to insert parties into their own tenant
CREATE POLICY "Allow tenant members to insert parties"
  ON public.parties FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

-- Allow users to update parties in their own tenant
CREATE POLICY "Allow tenant members to update parties"
  ON public.parties FOR UPDATE
  USING (tenant_id = auth.tenant_id());

-- Allow users to delete parties from their own tenant
CREATE POLICY "Allow tenant members to delete parties"
  ON public.parties FOR DELETE
  USING (tenant_id = auth.tenant_id());


-- ============================================
-- TABLE: vessels
-- ============================================
CREATE POLICY "Allow tenant members to read vessels"
  ON public.vessels FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to insert vessels"
  ON public.vessels FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to update vessels"
  ON public.vessels FOR UPDATE
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to delete vessels"
  ON public.vessels FOR DELETE
  USING (tenant_id = auth.tenant_id());


-- ============================================
-- TABLE: ports
-- ============================================
CREATE POLICY "Allow tenant members to read ports"
  ON public.ports FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to insert ports"
  ON public.ports FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to update ports"
  ON public.ports FOR UPDATE
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to delete ports"
  ON public.ports FOR DELETE
  USING (tenant_id = auth.tenant_id());


-- ============================================
-- TABLE: cargo_names
-- ============================================
CREATE POLICY "Allow tenant members to read cargo_names"
  ON public.cargo_names FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to insert cargo_names"
  ON public.cargo_names FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to update cargo_names"
  ON public.cargo_names FOR UPDATE
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to delete cargo_names"
  ON public.cargo_names FOR DELETE
  USING (tenant_id = auth.tenant_id());


-- ============================================
-- TABLE: charter_parties
-- ============================================
CREATE POLICY "Allow tenant members to read charter_parties"
  ON public.charter_parties FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to insert charter_parties"
  ON public.charter_parties FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to update charter_parties"
  ON public.charter_parties FOR UPDATE
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to delete charter_parties"
  ON public.charter_parties FOR DELETE
  USING (tenant_id = auth.tenant_id());


-- ============================================
-- TABLE: voyages
-- ============================================
CREATE POLICY "Allow tenant members to read voyages"
  ON public.voyages FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to insert voyages"
  ON public.voyages FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to update voyages"
  ON public.voyages FOR UPDATE
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to delete voyages"
  ON public.voyages FOR DELETE
  USING (tenant_id = auth.tenant_id());


-- ============================================
-- TABLE: claims
-- ============================================
CREATE POLICY "Allow tenant members to read claims"
  ON public.claims FOR SELECT
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to insert claims"
  ON public.claims FOR INSERT
  WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to update claims"
  ON public.claims FOR UPDATE
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "Allow tenant members to delete claims"
  ON public.claims FOR DELETE
  USING (tenant_id = auth.tenant_id());


-- Final notification
SELECT 'Migration 003_setup_rls_policies.sql executed successfully.' as result;
