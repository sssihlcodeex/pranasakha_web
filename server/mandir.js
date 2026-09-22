import {randomUUID} from "crypto";import {db} from "./db.js";import {createNotification} from "./notifications.js";
export async function requestDarshanPass(input){const e=await db.query("SELECT * FROM darshan WHERE user_id=$1 AND status='pending' LIMIT 1",[input.user_id]);if(e.rowCount)return e.rows[0];return(await db.query(`INSERT INTO darshan(id,user_id,purpose,requested_date,status) VALUES($1,$2,$3,$4,'pending') RETURNING *`,[randomUUID(),input.user_id,input.purpose||"Morning Darshan",input.requested_date||""])).rows[0];}
export async function listDarshanRequests(){return(await db.query(`SELECT d.*,p.full_name,u.email FROM darshan d JOIN users u ON u.id=d.user_id JOIN profiles p ON p.user_id=d.user_id ORDER BY d.created_at DESC`)).rows;}
export async function issueDarshanPass(id){const r=await db.query("UPDATE darshan SET status='issued' WHERE id=$1 RETURNING *",[id]);if(!r.rowCount)throw new Error("Request not found.");await createNotification({user_id:r.rows[0].user_id,type:"darshan",title:"Darshan pass issued",message:"Your Darshan request has been issued by the Mandir Committee.",action_url:"/dashboard/doctor#visit-essentials"});return r.rows[0];}
export async function listDarshanForUser(userId){return(await db.query("SELECT * FROM darshan WHERE user_id=$1 ORDER BY created_at DESC",[userId])).rows;}
export async function updateDarshanStatus(id,status,actorUserId){
  const allowed=["pending","issued","rejected","cancelled"];
  if(!allowed.includes(status)) throw new Error("Invalid Darshan status.");
  const r=await db.query("UPDATE darshan SET status=$1 WHERE id=$2 RETURNING *",[status,id]);
  if(!r.rowCount) throw new Error("Request not found.");
  await db.query(`INSERT INTO audit(id,subject_type,subject_id,actor_user_id,action,note,metadata) VALUES(gen_random_uuid(),'darshan',$1,$2,$3,'', $4::jsonb)`,[id,actorUserId,`Darshan request ${status}`,JSON.stringify({status})]);
  return r.rows[0];
}
