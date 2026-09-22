CREATE TABLE IF NOT EXISTS passes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_passes_one_live_per_user ON passes(user_id) WHERE status IN ('active','suspended');

CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY,
  pass_id UUID REFERENCES passes(id) ON DELETE SET NULL,
  checkpoint_type TEXT NOT NULL,
  scanner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  result TEXT NOT NULL CHECK (result IN ('granted','denied','expired')),
  reason TEXT DEFAULT '',
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_scan_logs_pass_time ON scan_logs(pass_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanner_time ON scan_logs(scanner_user_id, scanned_at DESC);

CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gate','canteen','mandir','camp')),
  institution TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkpoints_name_type ON checkpoints(name,type,institution);

INSERT INTO checkpoints(id,name,type,institution,active) VALUES
(gen_random_uuid(),'Main Gate','gate','',TRUE),
(gen_random_uuid(),'Canteen','canteen','',TRUE),
(gen_random_uuid(),'Mandir','mandir','',TRUE),
(gen_random_uuid(),'Mobile Camp','camp','',TRUE)
ON CONFLICT (name,type,institution) DO NOTHING;

-- Existing approved healthcare volunteers receive their first lifetime pass during migration.
INSERT INTO passes(id,user_id,token,status,issued_at)
SELECT gen_random_uuid(), d.user_id, 'PSK-' || gen_random_uuid(), 'active', NOW()
FROM doctors d
WHERE d.status='approved'
  AND NOT EXISTS (SELECT 1 FROM passes p WHERE p.user_id=d.user_id AND p.status IN ('active','suspended'));
