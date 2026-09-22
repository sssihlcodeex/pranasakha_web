import {randomUUID} from "crypto";import {db} from "./db.js";import {createNotification} from "./notifications.js";
export async function requestAccommodation(input){const e=await db.query("SELECT * FROM accommodation WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",[input.user_id]);if(e.rowCount)return e.rows[0];return(await db.query(`INSERT INTO accommodation(id,user_id,check_in,check_out,status) VALUES($1,$2,$3,$4,'pending') RETURNING *`,[randomUUID(),input.user_id,input.check_in||"",input.check_out||""])).rows[0];}
export async function listAccommodationRequests(){return(await db.query(`SELECT a.*,p.full_name,u.email FROM accommodation a JOIN users u ON u.id=a.user_id JOIN profiles p ON p.user_id=a.user_id ORDER BY a.created_at DESC`)).rows;}
export async function confirmAccommodation(id,block,room){const r=await db.query("UPDATE accommodation SET block=$1,room=$2,status='confirmed' WHERE id=$3 RETURNING *",[block,room,id]);if(!r.rowCount)throw new Error("Request not found.");await createNotification({user_id:r.rows[0].user_id,type:"accommodation",title:"Accommodation confirmed",message:`Your accommodation is confirmed in ${block}, room ${room}.`,action_url:"/dashboard/doctor#visit-essentials"});return r.rows[0];}
export async function getAccommodationForUser(userId){return(await db.query("SELECT * FROM accommodation WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",[userId])).rows[0]||null;}
export async function updateAccommodationStatus(id,status,actorUserId){
  const allowed=["pending","confirmed","rejected","cancelled"];
  if(!allowed.includes(status)) throw new Error("Invalid accommodation status.");
  const r=await db.query("UPDATE accommodation SET status=$1 WHERE id=$2 RETURNING *",[status,id]);
  if(!r.rowCount) throw new Error("Request not found.");
  await db.query(`INSERT INTO audit(id,subject_type,subject_id,actor_user_id,action,note,metadata) VALUES(gen_random_uuid(),'accommodation',$1,$2,$3,'',$4::jsonb)`,[id,actorUserId,`Accommodation request ${status}`,JSON.stringify({status})]);
  return r.rows[0];
}
