import { randomUUID } from "crypto";
import { db } from "./db.js";
import { createNotification } from "./notifications.js";
import { issuePassForApprovedDoctor } from "./passes.js";
const select=`SELECT d.*,u.email,u.role,p.*, 
(SELECT a.action FROM audit a 
 WHERE a.subject_type='doctor_application' 
 AND a.subject_id=d.id::text 
 ORDER BY a.created_at DESC LIMIT 1) AS latest_review_action, 

(SELECT a.note FROM audit a 
 WHERE a.subject_type='doctor_application' 
 AND a.subject_id=d.id::text 
 ORDER BY a.created_at DESC LIMIT 1) AS latest_review_note, 

(SELECT a.created_at FROM audit a 
 WHERE a.subject_type='doctor_application' 
 AND a.subject_id=d.id::text 
 ORDER BY a.created_at DESC LIMIT 1) AS latest_review_at 

FROM doctors d 
JOIN users u ON u.id=d.user_id 
JOIN profiles p ON p.user_id=d.user_id`;
export async function createDoctorApplication(input){const e=await db.query("SELECT * FROM doctors WHERE user_id=$1",[input.user_id]);if(e.rowCount)return e.rows[0];const id=randomUUID();return (await db.query(`INSERT INTO doctors(id,user_id,specialty,years_experience,preferred_institutions,clinical_scope,status) VALUES($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,[id,input.user_id,input.specialty||"",String(input.years_experience||""),Array.isArray(input.preferred_institutions)?input.preferred_institutions.join(", "):input.preferred_institutions||"",Array.isArray(input.clinical_scope)?input.clinical_scope.join(", "):input.clinical_scope||""])).rows[0];}
export async function listDoctorsWithProfile(){return (await db.query(`${select} ORDER BY d.created_at DESC`)).rows;}
export async function getDoctorByUserId(userId){return (await db.query(`${select} WHERE d.user_id=$1`,[userId])).rows[0]||null;}
export async function updateDoctorStatus({id,status,departmentRoute,actorUserId,note}){
 const valid=new Set(["pending","approved","info_requested","declined"]);if(!valid.has(status))throw new Error("Invalid application status.");
 const current=await db.query("SELECT * FROM doctors WHERE id=$1",[id]);if(!current.rowCount)throw new Error("Application not found.");
 if(status==="approved"&&!String(departmentRoute||"").trim())throw new Error("Select a department before approving this application.");
 const old=current.rows[0],route=String(departmentRoute||old.department_route||"").trim(),clean=String(note||"").trim();
 let decisionAuditId="";
 await db.withTransaction(async c=>{await c.query("UPDATE doctors SET status=$1,department_route=$2,director_note=$3,reviewed_at=NOW(),reviewed_by=$4 WHERE id=$5",[status,route,clean,actorUserId,id]);const audit=(await c.query(`INSERT INTO audit(id,subject_type,subject_id,actor_user_id,action,note,metadata) VALUES($1,'doctor_application',$2,$3,$4,$5,$6) RETURNING id`,[randomUUID(),id,actorUserId,status,clean,JSON.stringify({department_route:route})])).rows[0];decisionAuditId=audit.id;});
 if (status === "approved") {
   try { await issuePassForApprovedDoctor(old.user_id, actorUserId); } catch (error) { console.error("Pass issuance after approval failed:", error.message); }
 }
 const title=status==="approved"?"Application approved":status==="info_requested"?"More information requested":status==="declined"?"Application update":"Application updated";
 const message=status==="approved"?`Your application has been approved and routed to ${route}.`:status==="info_requested"?clean||"The Directorate has requested additional information.":status==="declined"?clean||"The Directorate has updated your application status.":"Your application status has been updated.";
 await createNotification({user_id:old.user_id,type:"application",title,message,action_url:"/dashboard/doctor#application-status",source_audit_id:decisionAuditId});
 return getDoctorByUserId(old.user_id);
}
export async function updateDoctorProfile(userId,input){
 const current=await getDoctorByUserId(userId);
 if(!current)throw new Error("No healthcare volunteer application found.");
 return db.withTransaction(async(client)=>{
  const profileFields=["full_name","department","institution","dob","gender","nationality","passport_number","passport_country","passport_expiry","country_code","mobile","address","has_nmc","council_number","council_authority","sub_specialty","affiliation","languages","sai_center_affiliated","sai_center_name","institutions","clinical_scope","preferred_from","preferred_to","family","dietary","accessibility","airport","flight_number","airline","darshan","service_category","norms_accepted","consent_data","consent_declaration","consent_seva"];
  const values=[],sets=[];
  const aliases={passportNumber:"passport_number",passportCountry:"passport_country",passportExpiry:"passport_expiry",countryCode:"country_code",hasNmc:"has_nmc",councilNumber:"council_number",councilAuthority:"council_authority",subSpecialty:"sub_specialty",saiCenterAffiliated:"sai_center_affiliated",saiCenterName:"sai_center_name",preferredFrom:"preferred_from",preferredTo:"preferred_to",flightNumber:"flight_number",serviceCategory:"service_category",normsAccepted:"norms_accepted",consentData:"consent_data",consentDeclaration:"consent_declaration",consentSeva:"consent_seva"};
  for(const f of profileFields){
   let raw=input[f];
   if(raw===undefined){const camel=Object.keys(aliases).find(k=>aliases[k]===f);if(camel)raw=input[camel];}
   if(raw!==undefined){values.push(Array.isArray(raw)?raw.join(", "):raw);sets.push(`${f}=$${values.length}`);}
  }
  if(sets.length){values.push(userId);await client.query(`UPDATE profiles SET ${sets.join(",")},updated_at=NOW() WHERE user_id=$${values.length}`,values);}
  const dFields={specialty:input.specialty,years_experience:input.years_experience??input.yearsExperience,preferred_institutions:input.preferred_institutions??input.institutions,clinical_scope:input.clinical_scope??input.clinicalScope};
  const dVals=[],dSets=[];
  for(const [f,v] of Object.entries(dFields))if(v!==undefined){dVals.push(Array.isArray(v)?v.join(", "):v);dSets.push(`${f}=$${dVals.length}`);}
  if(dSets.length){dVals.push(current.id);await client.query(`UPDATE doctors SET ${dSets.join(",")},profile_updated_at=NOW() WHERE id=$${dVals.length}`,dVals);}
  const result=await client.query(`${select} WHERE d.user_id=$1`,[userId]);
  return result.rows[0]||null;
 });
}

export async function listDoctorsForDepartment(department){return (await db.query(`${select} WHERE d.status='approved' AND d.department_route=$1 ORDER BY p.full_name`,[department])).rows;}
export async function publishRosterEntry(input){const doctor=await getDoctorByUserId(input.user_id);if(!doctor||doctor.status!=="approved"||doctor.department_route!==input.department)throw new Error("Only approved doctors routed to this department can be rostered.");const row=(await db.query(`INSERT INTO roster(id,user_id,department,day,slot,location,details) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[randomUUID(),input.user_id,input.department,input.day,input.slot,input.location,input.details||""])).rows[0];await createNotification({user_id:input.user_id,type:"roster",title:"New Seva duty published",message:`${row.day}: ${row.slot} at ${row.location}.`,action_url:"/dashboard/doctor#roster-schedule"});return row;}

export async function listDoctorReviewHistory(userId){
 const r=await db.query(`SELECT a.id,a.action,a.note,a.metadata,a.created_at,a.actor_user_id,COALESCE(p.full_name,u.email,'Reviewer') AS actor_name FROM audit a LEFT JOIN users u ON u.id=a.actor_user_id LEFT JOIN profiles p ON p.user_id=a.actor_user_id WHERE a.subject_type='doctor_application' AND a.subject_id=(SELECT id::text FROM doctors WHERE user_id=$1 LIMIT 1) ORDER BY a.created_at DESC`,[userId]);
 return r.rows;
}

export async function listRosterForUser(userId){return (await db.query("SELECT * FROM roster WHERE user_id=$1 ORDER BY created_at DESC",[userId])).rows;}
export async function listRosterForDepartment(department){return (await db.query("SELECT * FROM roster WHERE department=$1 ORDER BY day,slot",[department])).rows;}
