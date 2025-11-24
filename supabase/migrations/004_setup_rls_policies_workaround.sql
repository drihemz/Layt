-- ============================================
-- MIGRATION 004: SETUP RLS POLICIES (WORKAROUND)
-- This migration uses a direct JWT claim access method within each policy
-- to avoid the 'permission denied for schema auth' error.
-- ============================================

-- ============================================
-- TABLE: parties
-- ============================================
CREATE POLICY "Allow tenant members to read parties"
  ON public.parties FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to insert parties"
  ON public.parties FOR INSERT
  WITH CHECK (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to update parties"
  ON public.parties FOR UPDATE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to delete parties"
  ON public.parties FOR DELETE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));


-- ============================================
-- TABLE: vessels
-- ============================================
CREATE POLICY "Allow tenant members to read vessels"
  ON public.vessels FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to insert vessels"
  ON public.vessels FOR INSERT
  WITH CHECK (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to update vessels"
  ON public.vessels FOR UPDATE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to delete vessels"
  ON public.vessels FOR DELETE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));


-- ============================================
-- TABLE: ports
-- ============================================
CREATE POLICY "Allow tenant members to read ports"
  ON public.ports FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to insert ports"
  ON public.ports FOR INSERT
  WITH CHECK (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to update ports"
  ON public.ports FOR UPDATE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to delete ports"
  ON public.ports FOR DELETE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));


-- ============================================
-- TABLE: cargo_names
-- ============================================
CREATE POLICY "Allow tenant members to read cargo_names"
  ON public.cargo_names FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to insert cargo_names"
  ON public.cargo_names FOR INSERT
  WITH CHECK (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to update cargo_names"
  ON public.cargo_names FOR UPDATE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to delete cargo_names"
  ON public.cargo_names FOR DELETE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));


-- ============================================
-- TABLE: charter_parties
-- ============================================
CREATE POLICY "Allow tenant members to read charter_parties"
  ON public.charter_parties FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to insert charter_parties"
  ON public.charter_parties FOR INSERT
  WITH CHECK (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to update charter_parties"
  ON public.charter_parties FOR UPDATE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to delete charter_parties"
  ON public.charter_parties FOR DELETE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));


-- ============================================
-- TABLE: voyages
-- ============================================
CREATE POLICY "Allow tenant members to read voyages"
  ON public.voyages FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to insert voyages"
  ON public.voyages FOR INSERT
  WITH CHECK (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to update voyages"
  ON public.voyages FOR UPDATE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to delete voyages"
  ON public.voyages FOR DELETE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));


-- ============================================
-- TABLE: claims
-- ============================================
CREATE POLICY "Allow tenant members to read claims"
  ON public.claims FOR SELECT
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to insert claims"
  ON public.claims FOR INSERT
  WITH CHECK (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to update claims"
  ON public.claims FOR UPDATE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));

CREATE POLICY "Allow tenant members to delete claims"
  ON public.claims FOR DELETE
  USING (tenant_id = (nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId', '')::uuid));


-- Final notification
SELECT 'Migration 004_setup_rls_policies_workaround.sql executed successfully.' as result;

