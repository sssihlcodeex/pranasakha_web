-- Link application notifications to the exact audit/decision record that created them.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS source_audit_id UUID NULL REFERENCES audit(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_source_audit
  ON notifications(source_audit_id);
