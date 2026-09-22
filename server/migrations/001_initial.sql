CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK (role IN ('doctor','director','hod','accommodation','mandir','travel','it','admin')),
 active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS profiles (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 full_name TEXT NOT NULL DEFAULT '', department TEXT NOT NULL DEFAULT '', institution TEXT NOT NULL DEFAULT '',
 dob TEXT DEFAULT '', gender TEXT DEFAULT '', nationality TEXT DEFAULT '', passport_number TEXT DEFAULT '', passport_country TEXT DEFAULT '', passport_expiry TEXT DEFAULT '',
 country_code TEXT DEFAULT '+91', mobile TEXT DEFAULT '', address TEXT DEFAULT '', has_nmc TEXT DEFAULT '', council_number TEXT DEFAULT '', council_authority TEXT DEFAULT '',
 sub_specialty TEXT DEFAULT '', affiliation TEXT DEFAULT '', languages TEXT DEFAULT '', sai_center_affiliated TEXT DEFAULT '', sai_center_name TEXT DEFAULT '',
 institutions TEXT DEFAULT '', clinical_scope TEXT DEFAULT '', preferred_from TEXT DEFAULT '', preferred_to TEXT DEFAULT '', family TEXT DEFAULT '', dietary TEXT DEFAULT '', accessibility TEXT DEFAULT '',
 airport TEXT DEFAULT '', flight_number TEXT DEFAULT '', airline TEXT DEFAULT '', darshan TEXT DEFAULT 'None', profile_picture TEXT DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS doctors (
 id UUID PRIMARY KEY, user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 specialty TEXT DEFAULT '', years_experience TEXT DEFAULT '', preferred_institutions TEXT DEFAULT '', clinical_scope TEXT DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','info_requested','declined')),
 department_route TEXT DEFAULT '', director_note TEXT DEFAULT '', reviewed_at TIMESTAMPTZ, reviewed_by UUID REFERENCES users(id),
 profile_updated_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doctors_status_department ON doctors(status, department_route);
CREATE TABLE IF NOT EXISTS roster (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, department TEXT NOT NULL, day TEXT NOT NULL, slot TEXT NOT NULL, location TEXT NOT NULL, details TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roster_user ON roster(user_id);
CREATE TABLE IF NOT EXISTS accommodation (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, block TEXT DEFAULT '', room TEXT DEFAULT '', check_in TEXT DEFAULT '', check_out TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS darshan (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose TEXT DEFAULT 'Morning Darshan', requested_date TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS travel (
 id UUID PRIMARY KEY, user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, airport TEXT DEFAULT '', flight_details TEXT DEFAULT '', letter_status TEXT DEFAULT 'not_generated', pickup_status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS audit (
 id UUID PRIMARY KEY, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL, actor_user_id UUID REFERENCES users(id), action TEXT NOT NULL, note TEXT DEFAULT '', metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_subject ON audit(subject_type, subject_id, created_at DESC);
CREATE TABLE IF NOT EXISTS notifications (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, action_url TEXT DEFAULT '', read_at TIMESTAMPTZ, email_status TEXT NOT NULL DEFAULT 'not_configured', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS documents (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, document_type TEXT NOT NULL, original_name TEXT NOT NULL, storage_name TEXT NOT NULL, storage_url TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes BIGINT NOT NULL,
 verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
 uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), verified_at TIMESTAMPTZ, verified_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id, uploaded_at DESC);
CREATE TABLE IF NOT EXISTS review_threads (
 id UUID PRIMARY KEY, document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE, doctor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')), created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ, resolved_by UUID REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS review_messages (
 id UUID PRIMARY KEY, thread_id UUID NOT NULL REFERENCES review_threads(id) ON DELETE CASCADE, author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, attachment_document_id UUID REFERENCES documents(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_messages_thread ON review_messages(thread_id, created_at);
