import express from "express";import cors from "cors";import path from "path";import{fileURLToPath}from"url";import{signup,login,seedDemoUsers,buildOAuthUrl,oauthCallback,completeSocialSignup,updateMyProfile,getFullCurrentUser,issueToken}from"./auth.js";import{authenticateRequest,requireRoles,assertSelfOrRole}from"./access.js";import{listDoctorsWithProfile,updateDoctorStatus,listDoctorsForDepartment,getDoctorByUserId,updateDoctorProfile,publishRosterEntry,listRosterForUser,listRosterForDepartment,listDoctorReviewHistory}from"./doctors.js";import{requestAccommodation,listAccommodationRequests,confirmAccommodation,getAccommodationForUser}from"./accommodation.js";import{requestDarshanPass,listDarshanRequests,issueDarshanPass,listDarshanForUser}from"./mandir.js";import{listTravelForApprovedDoctors,generateVisaLetter,getTravelForUser}from"./travel.js";import{listNotifications,markNotificationRead,createNotification}from"./notifications.js";import{uploadMiddleware,documentUploadUrl,UPLOAD_ROOT}from"./storage/upload.js";import{randomUUID}from"crypto";import fs from"fs";import{createDocumentRecord,listDoctorDocuments,listReviewThreads,getThreadWithMessages,createReviewThread,addReviewMessage,resolveReviewThread}from"./reviews.js";import{db}from"./db.js";import{applyMigrations}from"./migrate.js";
import{issuePassForApprovedDoctor,reissuePass,getPassForUser,listPasses,revokePass,suspendPass,resolvePass,publicResolvePass,getScanHistory}from"./passes.js";
const app=express(),__dirname=path.dirname(fileURLToPath(import.meta.url)),PORT=Number(process.env.PORT||4000);
const PROFILE_PICTURE_ROOT=path.resolve(process.cwd(),process.env.PROFILE_PICTURE_DIR||"uploads/profile-pictures");
fs.mkdirSync(PROFILE_PICTURE_ROOT,{recursive:true});app.disable("x-powered-by");app.use(cors({origin:process.env.FRONTEND_ORIGIN?process.env.FRONTEND_ORIGIN.split(","):true}));app.use(express.json({limit:"2mb"}));
app.use("/api/profile-media", express.static(PROFILE_PICTURE_ROOT, { maxAge: "7d", fallthrough: false }));const ar=f=>(req,res,next)=>Promise.resolve(f(req,res,next)).catch(next);
app.get("/api/health",ar(async(_q,res)=>{await db.query("SELECT 1");res.json({ok:true,service:"pranasakha-api",database:"postgresql"});}));app.post("/api/signup",ar(async(req,res)=>{const user=req.body?.oauth_signup_token?await completeSocialSignup(req.body):await signup({...req.body,role:"doctor"});res.json({ok:true,user});}));app.post("/api/login",ar(async(req,res)=>res.json({ok:true,user:await login(req.body.email,req.body.password)})));
app.get("/api/auth/:provider/start",ar(async(req,res)=>{
  const provider=String(req.params.provider||"").toLowerCase();
  const intent=req.query.intent==="signup"?"signup":"signin";
  res.redirect(buildOAuthUrl(provider,intent));
}));
app.get("/api/auth/:provider/callback",ar(async(req,res)=>{
  const provider=String(req.params.provider||"").toLowerCase();
  try {
    if(req.query.error) throw new Error(req.query.error_description||req.query.error);
    const result=await oauthCallback(provider,req.query.code,req.query.state);
    const socialProfile = Buffer.from(JSON.stringify({
      provider: result.user.auth_provider || provider,
      name: result.user.full_name || "",
      email: result.user.email || "",
      picture: /^https?:\/\//i.test(String(result.user.profile_picture || "")) ? result.user.profile_picture : "",
      mobile: result.user.mobile || "",
      providerProfile: result.user.provider_profile || {},
    })).toString("base64url");
    const frontendPath=result.intent==="signup"?"/signup":"/signin";
    const frontendOrigin=String(process.env.FRONTEND_ORIGIN||"http://localhost:5173").split(",")[0].replace(/\/$/,"");
    const payload = new URLSearchParams({
      oauth_intent: result.intent || "signin",
      isNew: result.isNewUser ? "1" : "0",
      role: result.user.role || "",
      profile: socialProfile,
    });
    if (result.pendingSignupToken) payload.set("signup_token", result.pendingSignupToken);
    if (result.user.token) payload.set("token", result.user.token);
    // Use query parameters for the OAuth handoff. Unlike a nested URLSearchParams
    // inside the fragment, this survives browser/router parsing consistently.
    res.redirect(`${frontendOrigin}${frontendPath}?${payload.toString()}`);
  } catch(error) {
    let intent = "signin";
    try {
      const decoded = JSON.parse(Buffer.from(String(req.query.state || "").split(".")[1] || "", "base64url").toString("utf8"));
      intent = decoded.intent === "signup" ? "signup" : "signin";
    } catch { /* invalid state falls back to sign-in */ }
    const message = encodeURIComponent(error.message || "Social authentication failed.");
    const frontendOrigin = String(process.env.FRONTEND_ORIGIN||"http://localhost:5173").split(",")[0].replace(/\/$/,"");
    res.redirect(`${frontendOrigin}/${intent}#oauth_error=${message}`);
  }
}));
app.get("/api/passes/public/verify",ar(async(req,res)=>{const token=String(req.query?.token||"").trim();const checkpointType=String(req.query?.checkpoint_type||"gate").trim().toLowerCase();const result=await publicResolvePass({token,checkpointType,location:req.query?.location});res.json({ok:true,...result});}));
app.get("/api/public/passes/verify",ar(async(req,res)=>{const token=String(req.query?.token||"").trim();const checkpointType=String(req.query?.checkpoint_type||"gate").trim().toLowerCase();const result=await publicResolvePass({token,checkpointType,location:req.query?.location});res.json({ok:true,...result});}));
app.use("/api",authenticateRequest);
app.post("/api/users/provision",requireRoles("admin"),ar(async(req,res)=>res.status(201).json({ok:true,user:await signup(req.body)})));
app.get("/api/admin/accounts",requireRoles("admin"),ar(async(_req,res)=>{const r=await db.query(`SELECT u.id,u.email,u.role,u.active,u.created_at,p.full_name,p.department,p.institution FROM users u LEFT JOIN profiles p ON p.user_id=u.id ORDER BY u.created_at DESC`);res.json({ok:true,accounts:r.rows});}));
app.post("/api/admin/accounts/:id/status",requireRoles("admin"),ar(async(req,res)=>{const active=Boolean(req.body?.active);if(req.params.id===req.user.id&&!active)return res.status(400).json({ok:false,error:"You cannot deactivate your own Admin session."});const r=await db.query(`UPDATE users SET active=$1 WHERE id=$2 AND id<>$3 RETURNING id,email,role,active,created_at`,[active,req.params.id,req.user.id]);if(!r.rowCount)return res.status(404).json({ok:false,error:"Account not found or cannot be changed."});const p=await db.query("SELECT full_name,department,institution FROM profiles WHERE user_id=$1",[r.rows[0].id]);res.json({ok:true,account:{...r.rows[0],...(p.rows[0]||{})}});}));
async function adminSafeQuery(label, text, params = [], fallback = []) {
 try { return { rows: (await db.query(text, params)).rows, error: null }; }
 catch (error) { console.error(`Admin overview query failed [${label}]:`, error.message); return { rows: fallback, error: `${label}: ${error.message}` }; }
}
app.get("/api/admin/overview",requireRoles("admin"),ar(async(_req,res)=>{
 const results = await Promise.all([
  adminSafeQuery("accounts",`SELECT u.id,u.email,u.role,u.active,u.created_at,p.* FROM users u LEFT JOIN profiles p ON p.user_id=u.id ORDER BY u.created_at DESC`),
  adminSafeQuery("doctors",`SELECT d.*,u.email,p.full_name,p.department,p.institution FROM doctors d JOIN users u ON u.id=d.user_id LEFT JOIN profiles p ON p.user_id=u.id ORDER BY d.created_at DESC LIMIT 300`),
  adminSafeQuery("notifications",`SELECT n.id,n.user_id,n.type,n.title,n.message,n.action_url,n.read_at,n.email_status,n.created_at,p.full_name,u.email FROM notifications n JOIN users u ON u.id=n.user_id LEFT JOIN profiles p ON p.user_id=u.id ORDER BY n.created_at DESC LIMIT 200`),
  adminSafeQuery("reviews",`SELECT rt.id,rt.document_id,rt.doctor_user_id,rt.status,rt.created_by,rt.created_at,rt.resolved_at,rt.resolved_by,d.original_name,d.document_type,p.full_name AS doctor_name,u.email AS doctor_email,(SELECT COUNT(*) FROM review_messages rm WHERE rm.thread_id=rt.id) AS message_count FROM review_threads rt JOIN documents d ON d.id=rt.document_id JOIN users u ON u.id=rt.doctor_user_id LEFT JOIN profiles p ON p.user_id=u.id ORDER BY rt.created_at DESC LIMIT 200`),
  adminSafeQuery("messages",`SELECT rm.id,rm.thread_id,rm.author_user_id,rm.body,rm.created_at,au.email AS author_email,ap.full_name AS author_name,rt.doctor_user_id,dp.full_name AS doctor_name FROM review_messages rm JOIN users au ON au.id=rm.author_user_id LEFT JOIN profiles ap ON ap.user_id=au.id JOIN review_threads rt ON rt.id=rm.thread_id LEFT JOIN profiles dp ON dp.user_id=rt.doctor_user_id ORDER BY rm.created_at DESC LIMIT 300`),
  adminSafeQuery("documents",`SELECT d.id,d.user_id,d.document_type,d.original_name,d.storage_name,d.mime_type,d.size_bytes,d.verification_status,d.uploaded_at,d.verified_at,p.full_name,u.email FROM documents d JOIN users u ON u.id=d.user_id LEFT JOIN profiles p ON p.user_id=u.id ORDER BY d.uploaded_at DESC LIMIT 200`),
  adminSafeQuery("accommodation",`SELECT a.*,p.full_name,u.email FROM accommodation a JOIN users u ON u.id=a.user_id LEFT JOIN profiles p ON p.user_id=u.id ORDER BY a.created_at DESC LIMIT 200`),
  adminSafeQuery("darshan",`SELECT d.*,p.full_name,u.email FROM darshan d JOIN users u ON u.id=d.user_id LEFT JOIN profiles p ON p.user_id=u.id ORDER BY d.created_at DESC LIMIT 200`),
  adminSafeQuery("travel",`SELECT t.*,p.full_name,u.email FROM travel t JOIN users u ON u.id=t.user_id LEFT JOIN profiles p ON p.user_id=u.id ORDER BY t.created_at DESC LIMIT 200`),
  adminSafeQuery("roster",`SELECT r.*,p.full_name,u.email FROM roster r JOIN users u ON u.id=r.user_id LEFT JOIN profiles p ON p.user_id=u.id ORDER BY r.created_at DESC LIMIT 200`),
  adminSafeQuery("audit",`SELECT * FROM audit ORDER BY created_at DESC LIMIT 200`),
  adminSafeQuery("decisionHistory",`SELECT a.id,a.action,a.note,a.metadata,a.created_at,a.actor_user_id,COALESCE(ap.full_name,au.email,'Reviewer') AS actor_name,d.id AS doctor_id,d.user_id AS doctor_user_id,COALESCE(dp.full_name,du.email,'Doctor') AS doctor_name,du.email AS doctor_email FROM audit a JOIN doctors d ON a.subject_type='doctor_application' AND a.subject_id=d.id::text JOIN users du ON du.id=d.user_id LEFT JOIN profiles dp ON dp.user_id=d.user_id LEFT JOIN users au ON au.id=a.actor_user_id LEFT JOIN profiles ap ON ap.user_id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 300`),
 ]);
 const [accounts,doctors,notifications,reviews,messages,documents,accommodation,darshan,travel,roster,audit,decisionHistory]=results;
 const warnings=results.flatMap((x)=>x.error?[x.error]:[]);
 res.json({ok:true,accounts:accounts.rows,doctors:doctors.rows,notifications:notifications.rows,reviews:reviews.rows,messages:messages.rows,documents:documents.rows,accommodation:accommodation.rows,darshan:darshan.rows,travel:travel.rows,roster:roster.rows,audit:audit.rows,decisionHistory:decisionHistory.rows,warnings});
}));
app.post("/api/admin/notifications",requireRoles("admin"),ar(async(req,res)=>{
 const userId=String(req.body?.user_id||"").trim(); const title=String(req.body?.title||"").trim(); const message=String(req.body?.message||"").trim();
 if(!userId||!title||!message)return res.status(400).json({ok:false,error:"Recipient, title and message are required."});
 const user=await db.query("SELECT id FROM users WHERE id=$1",[userId]); if(!user.rowCount)return res.status(404).json({ok:false,error:"Recipient account not found."});
 const notification=await createNotification({user_id:userId,type:String(req.body?.type||"admin"),title,message,action_url:String(req.body?.action_url||"")});
 await db.recordAudit({subjectType:"notification",subjectId:notification.id,actorUserId:req.user.id,action:"admin_create",note:title});
 res.status(201).json({ok:true,notification});
}));
const ADMIN_DELETE_TABLES={
 users:"users", notifications:"notifications", review_messages:"review_messages", review_threads:"review_threads", documents:"documents", accommodation:"accommodation", darshan:"darshan", travel:"travel", roster:"roster"
};

app.patch("/api/admin/decision-history/:id",requireRoles("admin"),ar(async(req,res)=>{
 const id=req.params.id; const note=String(req.body?.note??"").trim();
 const r=await db.query(`UPDATE audit SET note=$1 WHERE id=$2 AND subject_type='doctor_application' RETURNING id,action,note,metadata,created_at,actor_user_id`,[note,id]);
 if(!r.rowCount)return res.status(404).json({ok:false,error:"Decision history record not found."});
 const info=await db.query(`SELECT a.id,a.action,a.note,a.metadata,a.created_at,a.actor_user_id,COALESCE(ap.full_name,au.email,'Reviewer') AS actor_name,d.id AS doctor_id,d.user_id AS doctor_user_id,COALESCE(dp.full_name,du.email,'Doctor') AS doctor_name,du.email AS doctor_email FROM audit a JOIN doctors d ON a.subject_type='doctor_application' AND a.subject_id=d.id::text JOIN users du ON du.id=d.user_id LEFT JOIN profiles dp ON dp.user_id=d.user_id LEFT JOIN users au ON au.id=a.actor_user_id LEFT JOIN profiles ap ON ap.user_id=a.actor_user_id WHERE a.id=$1`,[id]);
 res.json({ok:true,decision:info.rows[0]});
}));
app.delete("/api/admin/decision-history/:id",requireRoles("admin"),ar(async(req,res)=>{
 const id=req.params.id;
 await db.withTransaction(async(client)=>{
  const r=await client.query(`SELECT a.*,d.user_id AS doctor_user_id FROM audit a JOIN doctors d ON a.subject_type='doctor_application' AND a.subject_id=d.id::text WHERE a.id=$1 FOR UPDATE`,[id]);
  if(!r.rowCount){const e=new Error("Decision history record not found.");e.statusCode=404;throw e;}
  const row=r.rows[0];
  const title=row.action==='approved'?'Application approved':row.action==='info_requested'?'More information requested':row.action==='declined'?'Application update':'Application updated';
  // Prefer the explicit notification -> audit link. The fallback handles legacy rows.
  await client.query("DELETE FROM notifications WHERE source_audit_id=$1",[id]);
  await client.query(`DELETE FROM notifications
    WHERE id IN (
      SELECT id FROM notifications
      WHERE user_id=$1 AND type='application' AND title=$2
        AND created_at BETWEEN $3::timestamptz - INTERVAL '2 minutes'
                            AND $3::timestamptz + INTERVAL '2 minutes'
      ORDER BY ABS(EXTRACT(EPOCH FROM (created_at - $3::timestamptz)))
      LIMIT 1
    )`,[row.doctor_user_id,title,row.created_at]);
  await client.query("DELETE FROM audit WHERE id=$1",[id]);
  await client.query(`INSERT INTO audit(id,subject_type,subject_id,actor_user_id,action,note,metadata) VALUES(gen_random_uuid(),'admin_decision_history', $1,$2,'admin_delete','Admin deleted a doctor application decision history record',$3)`,[id,req.user.id,JSON.stringify({deleted_subject_type:'doctor_application',doctor_user_id:row.doctor_user_id,original_action:row.action})]);
 });
 res.json({ok:true,deleted:id,resource:"decision-history"});
}));

app.delete("/api/admin/:resource/:id",requireRoles("admin"),ar(async(req,res)=>{
 const resource=req.params.resource; const id=req.params.id; const table=ADMIN_DELETE_TABLES[resource];
 if(!table)return res.status(400).json({ok:false,error:"This resource cannot be deleted from Admin."});
 if(resource==="users" && id===req.user.id)return res.status(400).json({ok:false,error:"You cannot delete your own Admin account."});
 let deletedRecord=null;
 await db.withTransaction(async(client)=>{
  if(resource==="users"){
   await client.query("DELETE FROM review_threads WHERE created_by=$1 OR resolved_by=$1 OR doctor_user_id=$1",[id]);
   await client.query("DELETE FROM review_messages WHERE author_user_id=$1",[id]);
   await client.query("UPDATE doctors SET reviewed_by=NULL WHERE reviewed_by=$1",[id]);
   await client.query("UPDATE documents SET verified_by=NULL WHERE verified_by=$1",[id]);
   await client.query("UPDATE audit SET actor_user_id=NULL WHERE actor_user_id=$1",[id]);
  }
  if(resource==="documents"){
   const d=await client.query("SELECT storage_name FROM documents WHERE id=$1",[id]);
   if(!d.rowCount){const e=new Error("Document not found.");e.statusCode=404;throw e;}
   await client.query("DELETE FROM documents WHERE id=$1",[id]);
   if(d.rows[0].storage_name){try{await fs.promises.unlink(path.join(UPLOAD_ROOT,d.rows[0].storage_name));}catch(error){console.warn("Could not remove document file:",error.message);}}
   deletedRecord={id};
  } else if(resource==="notifications"){
   const notification=(await client.query("SELECT id,user_id,type,source_audit_id FROM notifications WHERE id=$1",[id])).rows[0];
   if(!notification){const e=new Error("Notification not found.");e.statusCode=404;throw e;}
   if(notification.source_audit_id){
     await client.query("DELETE FROM audit WHERE id=$1 AND subject_type='doctor_application'",[notification.source_audit_id]);
   }
   await client.query("DELETE FROM notifications WHERE id=$1",[id]);
   deletedRecord={id:notification.id,source_audit_id:notification.source_audit_id||null};
  } else if(resource==="audit"){
   const audit=(await client.query("SELECT id,subject_type,subject_id FROM audit WHERE id=$1",[id])).rows[0];
   if(!audit){const e=new Error("Audit record not found.");e.statusCode=404;throw e;}
   await client.query("DELETE FROM notifications WHERE source_audit_id=$1",[id]);
   await client.query("DELETE FROM audit WHERE id=$1",[id]);
   deletedRecord=audit;
  } else {
   const r=await client.query(`DELETE FROM ${table} WHERE id=$1 RETURNING id`,[id]);
   if(!r.rowCount){const e=new Error("Record not found.");e.statusCode=404;throw e;}
   deletedRecord=r.rows[0];
  }
  await client.query(`INSERT INTO audit(id,subject_type,subject_id,actor_user_id,action,note,metadata) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6)`,[resource,id,req.user.id,"admin_delete","Admin deleted a record",JSON.stringify({resource})]);
 });
 res.json({ok:true,deleted:id,resource,decision_history_updated:resource==="notifications"||resource==="audit"});
}));

// ---- Additive operational dashboard controls ----
app.post("/api/accommodation/:id/status",requireRoles("accommodation","admin"),ar(async(req,res)=>{
  const status=String(req.body?.status||"pending");
  const allowed=["pending","confirmed","closed"];
  if(!allowed.includes(status)) return res.status(400).json({ok:false,error:"Invalid accommodation status."});
  const block=String(req.body?.block??"").trim(), room=String(req.body?.room??"").trim();
  const r=await db.query("UPDATE accommodation SET status=$1,block=CASE WHEN $2<>'' THEN $2 ELSE block END,room=CASE WHEN $3<>'' THEN $3 ELSE room END WHERE id=$4 RETURNING *",[status,block,room,req.params.id]);
  if(!r.rowCount) return res.status(404).json({ok:false,error:"Accommodation request not found."});
  res.json({ok:true,record:r.rows[0]});
}));
app.post("/api/darshan/:id/status",requireRoles("mandir","admin"),ar(async(req,res)=>{
  const status=String(req.body?.status||"pending");
  if(!["pending","issued","declined"].includes(status)) return res.status(400).json({ok:false,error:"Invalid Darshan status."});
  const r=await db.query("UPDATE darshan SET status=$1 WHERE id=$2 RETURNING *",[status,req.params.id]);
  if(!r.rowCount) return res.status(404).json({ok:false,error:"Darshan request not found."});
  res.json({ok:true,record:r.rows[0]});
}));
app.post("/api/travel/:user_id/pickup-status",requireRoles("travel","admin"),ar(async(req,res)=>{
  const status=String(req.body?.status||"pending");
  if(!["pending","ready","collected"].includes(status)) return res.status(400).json({ok:false,error:"Invalid pickup status."});
  const r=await db.query("UPDATE travel SET pickup_status=$1 WHERE user_id=$2 RETURNING *",[status,req.params.user_id]);
  if(!r.rowCount) return res.status(404).json({ok:false,error:"Travel record not found."});
  res.json({ok:true,record:r.rows[0]});
}));
app.get("/api/it/accounts",requireRoles("it","admin"),ar(async(_req,res)=>{
  const r=await db.query(`SELECT u.id,u.email,u.role,u.active,u.created_at,p.full_name,p.department,p.institution FROM users u LEFT JOIN profiles p ON p.user_id=u.id ORDER BY COALESCE(p.full_name,u.email)`);
  res.json({ok:true,accounts:r.rows});
}));
app.post("/api/it/accounts/:id/status",requireRoles("it","admin"),ar(async(req,res)=>{
  const active=Boolean(req.body?.active);
  if(req.params.id===req.user.id&&!active) return res.status(400).json({ok:false,error:"You cannot suspend your own account."});
  const r=await db.query("UPDATE users SET active=$1 WHERE id=$2 RETURNING id,email,role,active,created_at",[active,req.params.id]);
  if(!r.rowCount) return res.status(404).json({ok:false,error:"Account not found."});
  const p=await db.query("SELECT full_name,department,institution FROM profiles WHERE user_id=$1",[req.params.id]);
  res.json({ok:true,account:{...r.rows[0],...(p.rows[0]||{})}});
}));
app.get("/api/it/audit",requireRoles("it","admin"),ar(async(_req,res)=>{
  const r=await db.query("SELECT * FROM audit ORDER BY created_at DESC LIMIT 150");
  res.json({ok:true,entries:r.rows});
}));
app.get("/api/me",ar(async(req,res)=>{const user=await getFullCurrentUser(req.user.id);res.json({ok:true,user:{...user,token:issueToken(user)}});}));

// ---- Lifetime QR pass / checkpoint API ----
app.get("/api/passes/me",ar(async(req,res)=>{ const pass=await getPassForUser(req.user.id); res.json({ok:true,pass}); }));
app.post("/api/passes/issue",requireRoles("director","admin"),ar(async(req,res)=>{ const pass=await issuePassForApprovedDoctor(req.body?.user_id,req.user.id); res.status(201).json({ok:true,pass}); }));
app.get("/api/passes",requireRoles("admin","director"),ar(async(_req,res)=>res.json({ok:true,passes:await listPasses()})));
app.post("/api/passes/:id/revoke",requireRoles("admin"),ar(async(req,res)=>res.json({ok:true,pass:await revokePass(req.params.id,req.user.id)})));app.post("/api/passes/:id/reissue",requireRoles("admin","director"),ar(async(req,res)=>res.status(201).json({ok:true,pass:await reissuePass(req.params.id,req.user.id)})));
app.post("/api/passes/:id/suspend",requireRoles("admin"),ar(async(req,res)=>res.json({ok:true,pass:await suspendPass(req.params.id,req.user.id)})));
app.post("/api/passes/resolve",requireRoles("admin","director","hod","accommodation","mandir","travel","it"),ar(async(req,res)=>res.json({ok:true,...await resolvePass({token:req.body?.token,checkpointType:req.body?.checkpoint_type,scannerUserId:req.user.id,location:req.body?.location})})));
app.get("/api/scans",ar(async(req,res)=>{ const target=req.query.user_id?String(req.query.user_id):req.user.id; assertSelfOrRole(req,target,["admin","director","hod"]); res.json({ok:true,scans:await getScanHistory(target)}); }));

app.put("/api/me/profile",ar(async(req,res)=>{const user=await updateMyProfile(req.user.id,req.body);res.json({ok:true,user:{...user,token:issueToken(user)}});}));

app.post("/api/me/profile-photo",uploadMiddleware.single("file"),ar(async(req,res)=>{
  if(!req.file)return res.status(400).json({ok:false,error:"Please upload a JPG, PNG or WEBP image."});
  if(!["image/jpeg","image/png","image/webp"].includes(req.file.mimetype))return res.status(400).json({ok:false,error:"Profile photo must be JPG, PNG or WEBP."});
  const ext=path.extname(req.file.filename).toLowerCase();
  const targetName=`${req.user.id}-${randomUUID()}${ext}`;
  const target=path.join(PROFILE_PICTURE_ROOT,targetName);
  await fs.promises.rename(req.file.path,target);
  const pictureUrl=`${req.protocol}://${req.get("host")}/api/profile-media/${encodeURIComponent(targetName)}`;
  const old=(await db.query("SELECT profile_picture FROM profiles WHERE user_id=$1",[req.user.id])).rows[0]?.profile_picture||"";
  await db.query("UPDATE profiles SET profile_picture=$1,updated_at=NOW() WHERE user_id=$2",[pictureUrl,req.user.id]);
  if(old.includes("/api/profile-media/")){
    const oldName=decodeURIComponent(old.split("/api/profile-media/").pop()||"");
    if(oldName&&!oldName.includes("/")&&!oldName.includes("\\")){try{await fs.promises.unlink(path.join(PROFILE_PICTURE_ROOT,oldName));}catch{}}
  }
  const user=await getFullCurrentUser(req.user.id);res.status(201).json({ok:true,profile_picture:pictureUrl,user:{...user,token:issueToken(user)}});
}));
async function assertDoctorVisibility(req,doctorUserId){if(req.user.id===doctorUserId||req.user.role==="director"||req.user.role==="admin")return;if(req.user.role==="hod"){const r=await db.query(`SELECT 1 FROM doctors d JOIN profiles dp ON dp.user_id=d.user_id JOIN profiles hp ON hp.user_id=$2 WHERE d.user_id=$1 AND d.status='approved' AND d.department_route=hp.department`,[doctorUserId,req.user.id]);if(r.rowCount)return;}throw new Error("You are not authorised to access this doctor's documents.");}
app.get("/api/doctors",requireRoles("director","admin"),ar(async(_q,res)=>res.json({ok:true,doctors:await listDoctorsWithProfile()})));
app.get("/api/doctors/me/:user_id",ar(async(req,res)=>{assertSelfOrRole(req,req.params.user_id,["admin"]);const d=await getDoctorByUserId(req.params.user_id);if(!d)return res.status(404).json({ok:false,error:"No application found."});res.json({ok:true,doctor:d});}));
app.get("/api/doctors/me/:user_id/review-history",ar(async(req,res)=>{assertSelfOrRole(req,req.params.user_id,["admin"]);res.json({ok:true,history:await listDoctorReviewHistory(req.params.user_id)});}));
app.post("/api/doctors/:id/status",requireRoles("director","admin"),ar(async(req,res)=>res.json({ok:true,doctor:await updateDoctorStatus({id:req.params.id,status:req.body.status,departmentRoute:req.body.department_route,actorUserId:req.user.id,note:req.body.note})})));
app.put("/api/doctors/me/:user_id/profile",ar(async(req,res)=>{assertSelfOrRole(req,req.params.user_id,["admin"]);res.json({ok:true,doctor:await updateDoctorProfile(req.params.user_id,req.body)});}));
app.get("/api/doctors/department/:dept",requireRoles("hod","admin"),ar(async(req,res)=>{if(req.user.role==="hod"){const p=(await db.query("SELECT department FROM profiles WHERE user_id=$1",[req.user.id])).rows[0];if(p?.department!==req.params.dept)return res.status(403).json({ok:false,error:"HoD access is limited to the assigned department."});}res.json({ok:true,doctors:await listDoctorsForDepartment(req.params.dept)});}));
app.post("/api/roster",requireRoles("hod","admin"),ar(async(req,res)=>{if(req.user.role==="hod"){const p=(await db.query("SELECT department FROM profiles WHERE user_id=$1",[req.user.id])).rows[0];if(p?.department!==req.body.department)return res.status(403).json({ok:false,error:"HoD access is limited to the assigned department."});}res.json({ok:true,entry:await publishRosterEntry(req.body)});}));
app.get("/api/roster/me/:user_id",ar(async(req,res)=>{assertSelfOrRole(req,req.params.user_id,["admin"]);res.json({ok:true,roster:await listRosterForUser(req.params.user_id)});}));app.get("/api/roster/department/:dept",requireRoles("hod","admin"),ar(async(req,res)=>{if(req.user.role==="hod"){const p=(await db.query("SELECT department FROM profiles WHERE user_id=$1",[req.user.id])).rows[0];if(p?.department!==req.params.dept)return res.status(403).json({ok:false,error:"HoD access is limited to the assigned department."});}res.json({ok:true,roster:await listRosterForDepartment(req.params.dept)});}));
app.post("/api/accommodation/request",ar(async(req,res)=>{assertSelfOrRole(req,req.body.user_id,["admin","accommodation"]);res.json({ok:true,record:await requestAccommodation(req.body)});}));app.get("/api/accommodation",requireRoles("accommodation","admin"),ar(async(_q,res)=>res.json({ok:true,requests:await listAccommodationRequests()})));app.post("/api/accommodation/:id/confirm",requireRoles("accommodation","admin"),ar(async(req,res)=>res.json({ok:true,record:await confirmAccommodation(req.params.id,req.body.block,req.body.room)})));app.get("/api/accommodation/me/:user_id",ar(async(req,res)=>{assertSelfOrRole(req,req.params.user_id,["admin"]);res.json({ok:true,record:await getAccommodationForUser(req.params.user_id)});}));
app.post("/api/darshan/request",ar(async(req,res)=>{assertSelfOrRole(req,req.body.user_id,["admin","mandir"]);res.json({ok:true,record:await requestDarshanPass(req.body)});}));app.get("/api/darshan",requireRoles("mandir","admin"),ar(async(_q,res)=>res.json({ok:true,requests:await listDarshanRequests()})));app.post("/api/darshan/:id/issue",requireRoles("mandir","admin"),ar(async(req,res)=>res.json({ok:true,record:await issueDarshanPass(req.params.id)})));app.get("/api/darshan/me/:user_id",ar(async(req,res)=>{assertSelfOrRole(req,req.params.user_id,["admin"]);res.json({ok:true,requests:await listDarshanForUser(req.params.user_id)});}));
app.get("/api/travel",requireRoles("travel","admin"),ar(async(_q,res)=>res.json({ok:true,records:await listTravelForApprovedDoctors()})));app.post("/api/travel/:user_id/generate-letter",requireRoles("travel","admin"),ar(async(req,res)=>res.json({ok:true,record:await generateVisaLetter(req.params.user_id)})));app.get("/api/travel/me/:user_id",ar(async(req,res)=>{assertSelfOrRole(req,req.params.user_id,["admin"]);res.json({ok:true,record:await getTravelForUser(req.params.user_id)});}));
app.get("/api/notifications",ar(async(req,res)=>res.json({ok:true,notifications:await listNotifications(req.user.id)})));app.post("/api/notifications/:id/read",ar(async(req,res)=>res.json({ok:true,notification:await markNotificationRead(req.params.id,req.user.id)})));
app.post("/api/uploads",uploadMiddleware.single("file"),ar(async(req,res)=>{if(!req.file)return res.status(400).json({ok:false,error:"Please upload a JPG, PNG, WEBP or PDF file."});const owner=req.body.user_id||req.user.id;assertSelfOrRole(req,owner,["director","hod","admin"]);const id=randomUUID();const document=await createDocumentRecord({id,user_id:owner,document_type:req.body.document_type||"other",original_name:req.file.originalname,storage_name:req.file.filename,storage_url:documentUploadUrl(id),mime_type:req.file.mimetype,size_bytes:req.file.size});res.status(201).json({ok:true,document});}));
app.get("/api/files/:id",ar(async(req,res)=>{const r=await db.query("SELECT * FROM documents WHERE id=$1",[req.params.id]);if(!r.rowCount)return res.status(404).json({ok:false,error:"File not found."});await assertDoctorVisibility(req,r.rows[0].user_id);const filePath=path.join(UPLOAD_ROOT,r.rows[0].storage_name);if(!fs.existsSync(filePath))return res.status(404).json({ok:false,error:"Stored file is missing."});res.type(r.rows[0].mime_type);res.sendFile(filePath);}));
app.get("/api/doctors/:user_id/documents",ar(async(req,res)=>{await assertDoctorVisibility(req,req.params.user_id);res.json({ok:true,documents:await listDoctorDocuments(req.params.user_id)});}));
app.get("/api/reviews",ar(async(req,res)=>res.json({ok:true,threads:await listReviewThreads({actorUserId:req.user.id,actorRole:req.user.role,documentId:req.query.document_id})})));app.get("/api/reviews/:id",ar(async(req,res)=>res.json({ok:true,thread:await getThreadWithMessages(req.params.id,req.user.id,req.user.role)})));app.post("/api/reviews",requireRoles("director","admin","hod"),ar(async(req,res)=>res.status(201).json({ok:true,thread:await createReviewThread({documentId:req.body.document_id,doctorUserId:req.body.doctor_user_id,reviewerUserId:req.user.id,reviewerRole:req.user.role,body:String(req.body.body||"").trim()})})));app.post("/api/reviews/:id/messages",ar(async(req,res)=>res.status(201).json({ok:true,message:await addReviewMessage({threadId:req.params.id,authorUserId:req.user.id,authorRole:req.user.role,body:String(req.body.body||"").trim()})})));app.post("/api/reviews/:id/resolve",requireRoles("director","admin","hod"),ar(async(req,res)=>res.json({ok:true,thread:await resolveReviewThread(req.params.id,req.user.id,req.user.role)})));
app.get("/api/mandir/summary",requireRoles("mandir","admin"),ar(async(_q,res)=>{const [totals,byDate]=await Promise.all([db.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status='pending')::int AS pending,COUNT(*) FILTER (WHERE status='issued')::int AS issued,COUNT(*) FILTER (WHERE status='declined')::int AS declined,COUNT(*) FILTER (WHERE created_at::date=CURRENT_DATE)::int AS today_count FROM darshan`),db.query(`SELECT requested_date,COUNT(*)::int AS count FROM darshan WHERE requested_date<>'' GROUP BY requested_date ORDER BY requested_date LIMIT 30`)]);res.json({ok:true,...totals.rows[0],by_date:byDate.rows});}));
app.get("/api/accommodation/summary",requireRoles("accommodation","admin"),ar(async(_q,res)=>{const [totals,blocks]=await Promise.all([db.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status='pending')::int AS pending,COUNT(*) FILTER (WHERE status='confirmed')::int AS confirmed,COUNT(*) FILTER (WHERE status='closed')::int AS closed,COUNT(*) FILTER (WHERE check_in=CURRENT_DATE::text)::int AS arrivals_today FROM accommodation`),db.query(`SELECT COALESCE(NULLIF(block,''),'Unassigned') AS block,COUNT(*)::int AS count,COUNT(*) FILTER (WHERE status='confirmed')::int AS confirmed FROM accommodation GROUP BY 1 ORDER BY count DESC LIMIT 20`)]);res.json({ok:true,...totals.rows[0],blocks:blocks.rows});}));
app.get("/api/travel/summary",requireRoles("travel","admin"),ar(async(_q,res)=>{const r=await db.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE COALESCE(t.letter_status,'not_generated')='not_generated')::int AS letter_pending,COUNT(*) FILTER (WHERE COALESCE(t.letter_status,'not_generated')='generated')::int AS letter_generated,COUNT(*) FILTER (WHERE COALESCE(t.pickup_status,'pending')='ready')::int AS pickup_ready,COUNT(*) FILTER (WHERE COALESCE(t.pickup_status,'pending')='collected')::int AS pickup_collected FROM doctors d LEFT JOIN travel t ON t.user_id=d.user_id WHERE d.status='approved'`);res.json({ok:true,...r.rows[0]});}));
app.get("/api/it/summary",requireRoles("it","admin"),ar(async(_q,res)=>{const [roles,recent]=await Promise.all([db.query(`SELECT role,COUNT(*)::int AS count,COUNT(*) FILTER (WHERE active)::int AS active FROM users GROUP BY role ORDER BY count DESC`),db.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE active)::int AS active,COUNT(*) FILTER (WHERE NOT active)::int AS suspended,COUNT(*) FILTER (WHERE created_at>=NOW()-INTERVAL '7 days')::int AS created_7d FROM users`)]);res.json({ok:true,role_counts:roles.rows, ...recent.rows[0]});}));
app.get("/api/users",requireRoles("it","admin"),ar(async(_q,res)=>res.json({ok:true,users:(await db.query(`SELECT u.id,u.email,u.role,u.active,u.created_at,p.full_name,p.department,p.institution FROM users u LEFT JOIN profiles p ON p.user_id=u.id ORDER BY u.created_at DESC`)).rows})));
app.use((err,_req,res,_next)=>{console.error(err);const status=err.statusCode||(err.name==="MulterError"?400:500);res.status(status).json({ok:false,error:err.message||"Internal server error."});});
if(process.env.SEED==="true")applyMigrations().then(seedDemoUsers).then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});else applyMigrations().then(()=>app.listen(PORT,()=>console.log(`PRANASAKHA API running at http://localhost:${PORT}`))).catch(e=>{console.error("Database migration failed. Run `npm run db:migrate` and check your PostgreSQL connection.",e);process.exit(1)});
export default app;
