import fs from "fs";
import path from "path";
import multer from "multer";
import { randomUUID } from "crypto";
export const UPLOAD_ROOT=path.resolve(process.cwd(),process.env.UPLOAD_DIR||"uploads");
fs.mkdirSync(UPLOAD_ROOT,{recursive:true});
const allowed=new Set(["image/jpeg","image/png","image/webp","application/pdf"]);
const storage=multer.diskStorage({destination:(_r,_f,cb)=>cb(null,UPLOAD_ROOT),filename:(_r,file,cb)=>{const ext=path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g,"");cb(null,`${randomUUID()}${ext}`)}});
export const uploadMiddleware=multer({storage,limits:{fileSize:Number(process.env.MAX_UPLOAD_BYTES||10*1024*1024)},fileFilter:(_r,file,cb)=>cb(null,allowed.has(file.mimetype))});
export function documentUploadUrl(id){return `/api/files/${encodeURIComponent(id)}`;}
