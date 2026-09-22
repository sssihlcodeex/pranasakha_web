import { randomUUID } from "crypto";
import { db } from "./db.js";
async function dispatchEmail(notification){
 if(!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.NOTIFICATION_EMAIL_LOOKUP_URL) return "not_configured";
 try{
  const lookup=await fetch(`${process.env.NOTIFICATION_EMAIL_LOOKUP_URL}/${notification.user_id}`); const recipient=await lookup.json(); if(!recipient.email) return "skipped";
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[recipient.email],subject:notification.title,text:notification.message})});
  return response.ok?"sent":"failed";
 }catch(error){console.error("Notification email dispatch failed:",error.message);return "failed";}
}
export async function createNotification({user_id,type,title,message,action_url="",source_audit_id=null}){
 const id=randomUUID(); const result=await db.query(`INSERT INTO notifications(id,user_id,type,title,message,action_url,source_audit_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[id,user_id,type,title,message,action_url,source_audit_id]);
 const email_status=await dispatchEmail(result.rows[0]);
 if(email_status!=="not_configured"){await db.query("UPDATE notifications SET email_status=$1 WHERE id=$2",[email_status,id]);result.rows[0].email_status=email_status;}
 return result.rows[0];
}
export async function listNotifications(userId){return (await db.query("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",[userId])).rows;}
export async function markNotificationRead(id,userId){const r=await db.query("UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND user_id=$2 RETURNING *",[id,userId]);if(!r.rowCount)throw new Error("Notification not found.");return r.rows[0];}
