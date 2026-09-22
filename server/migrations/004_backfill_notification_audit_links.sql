-- Backfill application-notification -> decision-history links.
--
-- IMPORTANT: this uses a correlated scalar subquery instead of
-- `UPDATE ... FROM LATERAL`, because PostgreSQL does not allow the target
-- table alias (`n`) to be referenced from that lateral FROM item in this
-- UPDATE form. The scalar subquery can safely correlate to the target row.

UPDATE notifications AS n
SET source_audit_id = (
  SELECT a.id
  FROM audit AS a
  JOIN doctors AS d
    ON d.id::text = a.subject_id
  WHERE a.subject_type = 'doctor_application'
    AND d.user_id = n.user_id
    AND a.action = CASE
      WHEN n.title = 'Application approved' THEN 'approved'
      WHEN n.title = 'More information requested' THEN 'info_requested'
      WHEN n.title = 'Application update' THEN 'declined'
      WHEN n.title = 'Application updated' THEN 'pending'
      ELSE NULL
    END
    AND a.created_at BETWEEN n.created_at - INTERVAL '15 minutes'
                         AND n.created_at + INTERVAL '15 minutes'
  ORDER BY ABS(EXTRACT(EPOCH FROM (a.created_at - n.created_at))) ASC
  LIMIT 1
)
WHERE n.type = 'application'
  AND n.source_audit_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM audit AS a
    JOIN doctors AS d
      ON d.id::text = a.subject_id
    WHERE a.subject_type = 'doctor_application'
      AND d.user_id = n.user_id
      AND a.action = CASE
        WHEN n.title = 'Application approved' THEN 'approved'
        WHEN n.title = 'More information requested' THEN 'info_requested'
        WHEN n.title = 'Application update' THEN 'declined'
        WHEN n.title = 'Application updated' THEN 'pending'
        ELSE NULL
      END
      AND a.created_at BETWEEN n.created_at - INTERVAL '15 minutes'
                           AND n.created_at + INTERVAL '15 minutes'
  );

CREATE INDEX IF NOT EXISTS idx_audit_doctor_application_time
  ON audit(subject_type, subject_id, action, created_at DESC);
