-- Compatibility migration for databases created by the earlier Excel/Postgres prototypes.
-- Older local databases may have stored user identifiers as TEXT. The application schema
-- now uses UUID consistently so foreign keys and joins remain type-safe.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('user_id', 'doctor_user_id', 'author_user_id', 'reviewed_by', 'actor_user_id')
      AND data_type IN ('text', 'character varying')
      AND table_name IN ('profiles','doctors','roster','accommodation','darshan','travel','notifications','documents','review_threads','review_messages','audit')
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I TYPE uuid USING NULLIF(trim(%I), '''')::uuid',
      rec.table_name, rec.column_name, rec.column_name
    );
  END LOOP;
END $$;

-- Rebuild the critical foreign keys when they are missing on upgraded databases.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='doctors')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='doctors_user_id_fkey') THEN
    ALTER TABLE doctors ADD CONSTRAINT doctors_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
