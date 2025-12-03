-- Broaden insert policy so authenticated users can create notifications (for cross-user alerts)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'notifications_insert_service'
  ) THEN
    DROP POLICY notifications_insert_service ON notifications;
  END IF;

  CREATE POLICY notifications_insert_authenticated
    ON notifications
    FOR INSERT
    WITH CHECK (auth.role() IN ('authenticated', 'service_role'));
END $$;
