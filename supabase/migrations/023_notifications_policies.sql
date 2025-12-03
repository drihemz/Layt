-- Enable RLS and policies on notifications for per-user access
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'notifications_select_own'
  ) THEN
    CREATE POLICY notifications_select_own
      ON notifications
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'notifications_update_own'
  ) THEN
    CREATE POLICY notifications_update_own
      ON notifications
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'notifications_insert_service'
  ) THEN
    CREATE POLICY notifications_insert_service
      ON notifications
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);
  END IF;
END $$;
