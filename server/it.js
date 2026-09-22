import { db } from "./db.js";

export async function listITUsers() {
  return (await db.query(`
    SELECT u.id, u.email, u.role, u.active, u.created_at,
           p.full_name, p.department, p.institution
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    ORDER BY u.created_at DESC
  `)).rows;
}

export async function updateITUserStatus(userId, active, actorUserId) {
  if (!userId) throw new Error("User id is required.");
  const result = await db.query(
    "UPDATE users SET active=$1 WHERE id=$2 RETURNING id,email,role,active,created_at",
    [Boolean(active), userId],
  );
  if (!result.rowCount) throw new Error("Account not found.");
  await db.query(
    `INSERT INTO audit(id,subject_type,subject_id,actor_user_id,action,note,metadata)
     VALUES(gen_random_uuid(),'user',$1,$2,$3,$4,$5::jsonb)`,
    [userId, actorUserId, active ? "Account activated" : "Account suspended", "Updated by IT", JSON.stringify({ active: Boolean(active) })],
  );
  return result.rows[0];
}

export async function listITAuditLog(limit = 20) {
  return (await db.query(`
    SELECT a.id, a.subject_type, a.subject_id, a.action, a.note, a.created_at,
           COALESCE(p.full_name, u.email, 'System') AS actor_name,
           u.email AS actor_email
    FROM audit a
    LEFT JOIN users u ON u.id = a.actor_user_id
    LEFT JOIN profiles p ON p.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT $1
  `, [Math.min(Math.max(Number(limit) || 20, 1), 100)])).rows;
}
