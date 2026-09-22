import { randomUUID } from "crypto";
import { db } from "./db.js";

let QRCode;
async function getQRCode() {
  if (!QRCode) QRCode = (await import("qrcode")).default;
  return QRCode;
}

const PASS_STATUSES = new Set(["active", "suspended", "revoked"]);
const SCAN_RESULTS = new Set(["granted", "denied", "expired"]);
const CHECKPOINT_TYPES = new Set(["gate", "canteen", "mandir", "camp"]);

function publicPass(pass) {
  return {
    id: pass.id,
    user_id: pass.user_id,
    token: pass.token,
    status: pass.status,
    issued_at: pass.issued_at,
    revoked_at: pass.revoked_at,
    code: `PSK-${String(pass.token).replace(/^PSK-/, "").slice(0, 4).toUpperCase()}-${String(pass.token).replace(/^PSK-/, "").slice(4, 8).toUpperCase()}-${String(pass.token).replace(/^PSK-/, "").slice(-4).toUpperCase()}`,
  };
}

function getPublicWebOrigin() {
  const configured = String(process.env.PUBLIC_WEB_ORIGIN || process.env.FRONTEND_ORIGIN || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
  return configured || "http://localhost:5173";
}

function makeVerifyUrl(token) {
  return `${getPublicWebOrigin()}/verify/${encodeURIComponent(token)}`;
}

async function makeQrDataUrl(token) {
  const qrcode = await getQRCode();
  return qrcode.toDataURL(makeVerifyUrl(token), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 420,
  });
}

export async function issuePassForApprovedDoctor(userId, actorUserId = null) {
  const doctor = (await db.query(
    `SELECT d.*, p.full_name, p.profile_picture, p.institution, p.service_category, p.mobile
     FROM doctors d JOIN profiles p ON p.user_id=d.user_id WHERE d.user_id=$1`,
    [userId],
  )).rows[0];
  if (!doctor) throw new Error("Healthcare volunteer application not found.");
  if (doctor.status !== "approved") throw new Error("A pass can only be issued after Directorate approval.");

  const active = (await db.query("SELECT * FROM passes WHERE user_id=$1 AND status IN ('active','suspended') ORDER BY issued_at DESC LIMIT 1", [userId])).rows[0];
  if (active) return { ...publicPass(active), qr_data_url: await makeQrDataUrl(active.token) };

  const token = `PSK-${randomUUID()}`;
  const row = (await db.query(
    `INSERT INTO passes(id,user_id,token,status,issued_at)
     VALUES($1,$2,$3,'active',NOW()) RETURNING *`,
    [randomUUID(), userId, token],
  )).rows[0];

  await db.query(
    `INSERT INTO audit(id,subject_type,subject_id,actor_user_id,action,note,metadata)
     VALUES(gen_random_uuid(),'pass',$1,$2,'pass_issued','Lifetime QR pass issued after Directorate approval',$3)`,
    [row.id, actorUserId || null, JSON.stringify({ token_prefix: token.slice(0, 12) })],
  );
  return { ...publicPass(row), qr_data_url: await makeQrDataUrl(token) };
}

export async function reissuePass(passId, actorUserId = null) {
  const oldPass = (await db.query("SELECT pa.*, d.status AS doctor_status FROM passes pa JOIN doctors d ON d.user_id=pa.user_id WHERE pa.id=$1", [passId])).rows[0];
  if (!oldPass) throw new Error("Pass not found.");
  if (oldPass.doctor_status !== "approved") throw new Error("A new pass can only be issued for an approved healthcare volunteer.");
  if (oldPass.status !== "revoked") throw new Error("Only a revoked pass can be reissued.");
  return issuePassForApprovedDoctor(oldPass.user_id, actorUserId);
}

export async function getPassForUser(userId) {
  const row = (await db.query("SELECT * FROM passes WHERE user_id=$1 ORDER BY issued_at DESC LIMIT 1", [userId])).rows[0];
  if (!row) return null;
  return { ...publicPass(row), qr_data_url: await makeQrDataUrl(row.token) };
}

export async function listPasses() {
  const rows = (await db.query(
    `SELECT pa.*, p.full_name, p.profile_picture, p.institution, p.service_category, u.email
     FROM passes pa JOIN users u ON u.id=pa.user_id LEFT JOIN profiles p ON p.user_id=pa.user_id
     ORDER BY pa.issued_at DESC`,
  )).rows;
  return rows.map((row) => ({ ...publicPass(row), full_name: row.full_name, profile_picture: row.profile_picture, institution: row.institution, service_category: row.service_category, email: row.email }));
}

export async function revokePass(passId, actorUserId) {
  const row = (await db.query("UPDATE passes SET status='revoked',revoked_at=NOW() WHERE id=$1 AND status<>'revoked' RETURNING *", [passId])).rows[0];
  if (!row) throw new Error("Pass not found or already revoked.");
  await db.query(
    `INSERT INTO audit(id,subject_type,subject_id,actor_user_id,action,note,metadata)
     VALUES(gen_random_uuid(),'pass',$1,$2,'pass_revoked','Pass revoked by Admin',$3)`,
    [passId, actorUserId, JSON.stringify({ user_id: row.user_id })],
  );
  return publicPass(row);
}

export async function suspendPass(passId, actorUserId) {
  const row = (await db.query("UPDATE passes SET status='suspended' WHERE id=$1 AND status='active' RETURNING *", [passId])).rows[0];
  if (!row) throw new Error("Only an active pass can be suspended.");
  await db.query(
    `INSERT INTO audit(id,subject_type,subject_id,actor_user_id,action,note,metadata)
     VALUES(gen_random_uuid(),'pass',$1,$2,'pass_suspended','Pass suspended by Admin',$3)`,
    [passId, actorUserId, JSON.stringify({ user_id: row.user_id })],
  );
  return publicPass(row);
}

async function checkpointFor(type, institution) {
  const row = (await db.query(
    `SELECT * FROM checkpoints WHERE type=$1 AND active=TRUE
     ORDER BY CASE WHEN institution=$2 THEN 0 ELSE 1 END, name LIMIT 1`,
    [type, institution || ""],
  )).rows[0];
  return row || null;
}

function isActiveVisit(accommodation) {
  if (!accommodation?.check_in || !accommodation?.check_out) return false;
  const now = new Date();
  const start = new Date(accommodation.check_in);
  const end = new Date(accommodation.check_out);
  return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && now >= start && now <= end;
}

export async function publicResolvePass({ token, checkpointType, location = "" }) {
  return resolvePass({ token, checkpointType, scannerUserId: null, location });
}

export async function resolvePass({ token, checkpointType, scannerUserId, location = "" }) {
  const cleanToken = String(token || "").trim();
  const type = String(checkpointType || "").trim().toLowerCase();
  if (!cleanToken || !CHECKPOINT_TYPES.has(type)) throw new Error("Provide a valid pass token and checkpoint type.");
  const pass = (await db.query(
    `SELECT pa.*, p.full_name, p.profile_picture, p.institution, p.service_category, d.specialty,
            a.check_in, a.check_out, a.status AS accommodation_status,
            (SELECT status FROM darshan WHERE user_id=pa.user_id ORDER BY created_at DESC LIMIT 1) AS darshan_status,
            (SELECT requested_date FROM darshan WHERE user_id=pa.user_id ORDER BY created_at DESC LIMIT 1) AS darshan_date
     FROM passes pa
     JOIN profiles p ON p.user_id=pa.user_id
     LEFT JOIN doctors d ON d.user_id=pa.user_id
     LEFT JOIN accommodation a ON a.user_id=pa.user_id
     WHERE pa.token=$1`,
    [cleanToken],
  )).rows[0];

  let result = "denied";
  let reason = "Pass not found.";
  let data = null;
  let checkpoint = null;

  if (pass) {
    checkpoint = await checkpointFor(type, pass.institution);
    if (!checkpoint) {
      reason = "This checkpoint is not configured or is inactive.";
    } else if (pass.status === "revoked") {
      reason = "Pass has been revoked.";
    } else if (pass.status === "suspended") {
      reason = "Pass is currently suspended.";
    } else {
      const activeVisit = isActiveVisit(pass);
      if (type === "gate") {
        data = { name: pass.full_name, photo: pass.profile_picture || "", active_visit: activeVisit ? "yes" : "no", institution: pass.institution };
      } else if (type === "canteen") {
        data = { name: pass.full_name, photo: pass.profile_picture || "", meal_entitled: "yes" };
      } else if (type === "mandir") {
        data = { name: pass.full_name, photo: pass.profile_picture || "", darshan_pass_issued: pass.darshan_status === "issued" ? "yes" : "no", seating_date: pass.darshan_date || "" };
      } else if (type === "camp") {
        data = { name: pass.full_name, photo: pass.profile_picture || "", specialty: pass.specialty || pass.service_category || "" };
      }
      result = "granted";
      reason = "Pass verified.";
    }
  }

  const log = (await db.query(
    `INSERT INTO scan_logs(id,pass_id,checkpoint_type,scanner_user_id,result,reason,scanned_at,location)
     VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,NOW(),$6) RETURNING *`,
    [pass?.id || null, type, scannerUserId, result, reason, String(location || "")],
  )).rows[0];

  return { result, reason, checkpoint: checkpoint ? { id: checkpoint.id, name: checkpoint.name, type: checkpoint.type, institution: checkpoint.institution } : null, data, scan_id: log.id };
}

export async function getScanHistory(userId) {
  return (await db.query(
    `SELECT s.*, c.name AS checkpoint_name, c.institution
     FROM scan_logs s LEFT JOIN checkpoints c ON c.type=s.checkpoint_type
     WHERE ($1::uuid IS NULL OR s.pass_id IN (SELECT id FROM passes WHERE user_id=$1))
     ORDER BY s.scanned_at DESC LIMIT 500`,
    [userId || null],
  )).rows;
}

export { PASS_STATUSES, SCAN_RESULTS, CHECKPOINT_TYPES };
