import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) console.warn("DATABASE_URL is not set. Configure PostgreSQL in .env before starting the API.");

export const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX || 15),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});
pool.on("error", (error) => console.error("PostgreSQL pool error:", error));

const ALLOWED_TABLES = new Set([
  "users", "profiles", "doctors", "roster", "accommodation", "darshan", "travel",
  "audit", "notifications", "documents", "review_threads", "review_messages",
]);
function assertTable(table) { if (!ALLOWED_TABLES.has(table)) throw new Error(`Unsupported database table: ${table}`); }
export async function query(text, params=[]) { return pool.query(text, params); }
export async function withTransaction(callback) {
  const client = await pool.connect();
  try { await client.query("BEGIN"); const result = await callback(client); await client.query("COMMIT"); return result; }
  catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
// Compatibility helpers retained from the Excel-era API. They are async now.
export async function recordAudit({ subjectType, subjectId, actorUserId, action, note="", metadata={} }) {
  return (await query(`INSERT INTO audit(id,subject_type,subject_id,actor_user_id,action,note,metadata) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6) RETURNING *`, [subjectType, subjectId, actorUserId || null, action, note, JSON.stringify(metadata)])).rows[0];
}

export async function read(table) { assertTable(table); return (await query(`SELECT * FROM ${table}`)).rows; }
export async function write(table, rows) {
  assertTable(table);
  await withTransaction(async (client) => {
    await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    for (const row of rows) {
      const keys=Object.keys(row); if (!keys.length) continue;
      const cols=keys.map(k=>`"${k}"`).join(","); const placeholders=keys.map((_,i)=>`$${i+1}`).join(",");
      await client.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, keys.map(k=>row[k]));
    }
  });
}
export const db={ query, withTransaction, recordAudit, read, write, pool };
