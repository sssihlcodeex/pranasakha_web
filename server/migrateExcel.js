import XLSX from "xlsx";
import path from "path";
import { db } from "./db.js";
import { applyMigrations } from "./migrate.js";

const workbookPath = path.resolve(process.cwd(), "data/database.xlsx");
const tables = ["users","profiles","doctors","roster","accommodation","darshan","travel","audit","notifications"];

async function main(){
  await applyMigrations();
  const wb=XLSX.readFile(workbookPath);
  for(const table of tables){
    const sheet=wb.Sheets[table];
    if(!sheet) continue;
    const rows=XLSX.utils.sheet_to_json(sheet).filter(row=>Object.values(row).some(v=>v!==""));
    if(!rows.length) continue;
    if(table === "users") rows.forEach(r=>{if(r.active!==undefined)r.active=String(r.active).toLowerCase()!=='false';});
    await db.withTransaction(async client=>{
      for(const row of rows){
        const keys=Object.keys(row);if(!keys.length)continue;
        const cols=keys.map(k=>`"${k}"`).join(",");const vals=keys.map((_,i)=>`$${i+1}`).join(",");
        await client.query(`INSERT INTO ${table} (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING`,keys.map(k=>row[k]));
      }
    });
    console.log(`Migrated ${rows.length} rows from ${table}.`);
  }
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});
