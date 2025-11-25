-- ============================================
-- MIGRATION 007: GRANT ROLES
-- This migration grants the customer_admin and operator roles
-- to the authenticator role.
-- ============================================

GRANT customer_admin, operator TO authenticator;

-- Final notification
SELECT 'Migration 007_grant_roles.sql executed successfully.' as result;
