import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { query } from "./db.js";
const migrationsDir=path.resolve(process.cwd(),"server/migrations");
export async function applyMigrations(){
 await query(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 const files=(await fs.readdir(migrationsDir)).filter(x=>x.endsWith(".sql")).sort();
 for(const name of files){
  if((await query("SELECT 1 FROM _migrations WHERE name=$1",[name])).rowCount) continue;
  const sql=await fs.readFile(path.join(migrationsDir,name),"utf8");
  const client=await (await import("./db.js")).pool.connect();
  try{ await client.query("BEGIN"); await client.query(sql); await client.query("INSERT INTO _migrations(name) VALUES($1)",[name]); await client.query("COMMIT"); console.log(`Applied migration: ${name}`); }
  catch(e){ await client.query("ROLLBACK"); throw e; } finally{ client.release(); }
 }
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) applyMigrations().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
