import jwt from "jsonwebtoken";import{db}from"./db.js";
const secret=process.env.JWT_SECRET||"dev-only-change-me";
function bearer(req){const h=req.headers.authorization||"";return h.startsWith("Bearer ")?h.slice(7):"";}
export async function authenticateRequest(req,res,next){try{
const publicPaths=new Set(["/passes/public/verify","/public/passes/verify"]);
const apiPath=String(req.path||"").replace(/^\/api/,"") || "/";
if(req.method==="GET" && publicPaths.has(apiPath)) return next();
const token=bearer(req);if(!token)return res.status(401).json({ok:false,error:"Authentication required."});const p=jwt.verify(token,secret);const r=await db.query("SELECT id,email,role,active FROM users WHERE id=$1",[p.sub]);if(!r.rowCount||!r.rows[0].active)return res.status(401).json({ok:false,error:"Session is invalid or inactive."});req.user=r.rows[0];next();}catch{res.status(401).json({ok:false,error:"Invalid or expired session."});}}
export function requireRoles(...roles){return(req,res,next)=>roles.includes(req.user?.role)?next():res.status(403).json({ok:false,error:"You are not authorised for this action."});}
export function assertSelfOrRole(req,userId,roles=[]){if(req.user.id!==userId&&!roles.includes(req.user.role))throw new Error("You can only access your own records.");}
