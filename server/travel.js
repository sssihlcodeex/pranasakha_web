import {randomUUID}from"crypto";import{db}from"./db.js";import{createNotification}from"./notifications.js";
export async function ensureTravelRecord(input){const e=await db.query("SELECT * FROM travel WHERE user_id=$1",[input.user_id]);if(e.rowCount)return e.rows[0];return(await db.query(`INSERT INTO travel(id,user_id,airport,flight_details) VALUES($1,$2,$3,$4) RETURNING *`,[randomUUID(),input.user_id,input.airport||"",input.flight_details||""])).rows[0];}
export async function listTravelForApprovedDoctors(){return(await db.query(`SELECT d.user_id,p.full_name,u.email,d.specialty,d.preferred_institutions,t.id AS travel_id,COALESCE(t.letter_status,'not_generated') AS letter_status,COALESCE(t.pickup_status,'pending') AS pickup_status FROM doctors d JOIN users u ON u.id=d.user_id JOIN profiles p ON p.user_id=d.user_id LEFT JOIN travel t ON t.user_id=d.user_id WHERE d.status='approved' ORDER BY p.full_name`)).rows;}
export async function generateVisaLetter(userId){const rec=await ensureTravelRecord({user_id:userId});const r=await db.query("UPDATE travel SET letter_status='generated' WHERE id=$1 RETURNING *",[rec.id]);await createNotification({user_id:userId,type:"travel",title:"Visa support letter generated",message:"The Travel Desk has generated your support letter.",action_url:"/dashboard/doctor#visit-essentials"});return r.rows[0];}
export async function getTravelForUser(userId){return(await db.query("SELECT * FROM travel WHERE user_id=$1",[userId])).rows[0]||null;}
export async function updateTravelStatus(userId,status,actorUserId){
  const allowed=["pending","ready","completed"];
  if(!allowed.includes(status)) throw new Error("Invalid pickup status.");
  const rec=await ensureTravelRecord({user_id:userId});
  const r=await db.query("UPDATE travel SET pickup_status=$1 WHERE id=$2 RETURNING *",[status,rec.id]);
  if(!r.rowCount) throw new Error("Travel record not found.");
  await db.query(`INSERT INTO audit(id,subject_type,subject_id,actor_user_id,action,note,metadata) VALUES(gen_random_uuid(),'travel',$1,$2,$3,'',$4::jsonb)`,[userId,actorUserId,`Travel pickup ${status}`,JSON.stringify({status})]);
  return r.rows[0];
}
