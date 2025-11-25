-- ============================================
-- MIGRATION 006: CREATE ROLES
-- This migration creates the customer_admin and operator roles
-- and grants them the necessary permissions.
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'customer_admin') THEN
    CREATE ROLE customer_admin;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'operator') THEN
    CREATE ROLE operator;
  END IF;
END
$$;

-- Grant usage on schema to roles
GRANT USAGE ON SCHEMA public TO customer_admin, operator;

-- Grant permissions to customer_admin
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO customer_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO customer_admin;

-- Grant permissions to operator
GRANT SELECT ON ALL TABLES IN SCHEMA public TO operator;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO operator;

-- Final notification
SELECT 'Migration 006_create_roles.sql executed successfully.' as result;
