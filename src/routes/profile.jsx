import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Check, ChevronDown, Home, LayoutDashboard, LogOut, Save, ShieldCheck, X, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { NavBar } from "@/components/site/NavBar";
import { Footer } from "@/components/site/Footer";
import { apiFileUrl, apiGetDoctorDocuments, apiGetMe, apiUpdateMyProfile, apiUploadDocument, apiUploadProfilePhoto } from "@/lib/api";
import { getAuthToken, getCurrentUser, ROLE_HOME, setCurrentUser } from "@/lib/auth";
import { CATEGORY_SPECIALTIES, CATEGORY_CLINICAL_SCOPE, COUNTRY_CODES, GENDERS, INSTITUTIONS, INSTITUTION_ADDRESSES, LANGUAGES, NATIONALITIES, DARSHAN_OPTIONS } from "@/components/signup/types";

export const Route=createFileRoute("/profile")({head:()=>({meta:[{title:"My Profile — PRANASAKHA"},{name:"description",content:"Manage your PRANASAKHA profile, Seva preferences and account details."}]}),component:ProfilePage});
function splitList(v){return Array.isArray(v)?v:(String(v||"").split(",").map(x=>x.trim()).filter(Boolean));}
function toDateValue(v){return String(v||"").slice(0,10);}
function normaliseUser(u){return {category:u.service_category||"doctors",fullName:u.full_name||"",dob:toDateValue(u.dob),gender:u.gender||"",nationality:u.nationality||"",passportNumber:u.passport_number||"",passportCountry:u.passport_country||"",passportExpiry:toDateValue(u.passport_expiry),email:u.email||"",countryCode:u.country_code||"+91",mobile:u.mobile||"",address:u.address||"",hasNmc:u.has_nmc||"",councilNumber:u.council_number||"",councilAuthority:u.council_authority||"",specialty:u.specialty||"",specialtyOther:"",subSpecialty:u.sub_specialty||"",yearsExperience:u.years_experience||"",affiliation:u.affiliation||"",languages:splitList(u.languages),saiCenterAffiliated:u.sai_center_affiliated||"",saiCenterName:u.sai_center_name||"",normsAccepted:Boolean(u.norms_accepted),institutions:splitList(u.institutions).length?splitList(u.institutions):INSTITUTIONS,clinicalScope:splitList(u.clinical_scope),preferredFrom:toDateValue(u.preferred_from),preferredTo:toDateValue(u.preferred_to),family:splitList(u.family),dietary:u.dietary||"",accessibility:u.accessibility||"",airport:u.airport||"",flightNumber:u.flight_number||"",airline:u.airline||"",darshan:u.darshan||"None",consentData:Boolean(u.consent_data),consentDeclaration:Boolean(u.consent_declaration),consentSeva:Boolean(u.consent_seva),profile_picture:u.profile_picture||""};}
function Field({label,value,onChange,type="text",disabled=false,required=false}){return <label className="grid gap-1.5"><span className="text-xs font-bold text-muted-foreground">{label}{required?<span className="text-secondary"> *</span>:null}</span><input type={type} value={value??""} onChange={e=>onChange(e.target.value)} disabled={disabled} className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted"/></label>}
function Select({label,value,onChange,options}){return <label className="grid gap-1.5"><span className="text-xs font-bold text-muted-foreground">{label}</span><span className="relative"><select value={value||""} onChange={e=>onChange(e.target.value)} className="w-full appearance-none rounded-2xl border border-input bg-background px-4 py-3 pr-10 text-sm text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"><option value="">Select…</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/></span></label>}
function ToggleChips({options,value,onToggle}){return <div className="flex flex-wrap gap-2">{options.map(option=><button type="button" key={option} onClick={()=>onToggle(option)} className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${value.includes(option)?"border-primary bg-primary-container text-on-primary-container":"border-border bg-background text-muted-foreground hover:bg-muted"}`}>{option}</button>)}</div>}

function CropPhotoModal({ src, onCancel, onConfirm }) {
 const [zoom,setZoom]=useState(1);
 const [busy,setBusy]=useState(false);
 async function confirm(){
   setBusy(true);
   try{
     const img=new Image();
     img.crossOrigin="anonymous";
     img.onload=()=>{
       const size=Math.min(img.naturalWidth,img.naturalHeight)/zoom;
       const sx=(img.naturalWidth-size)/2;
       const sy=(img.naturalHeight-size)/2;
       const canvas=document.createElement("canvas");
       canvas.width=512;canvas.height=512;
       const ctx=canvas.getContext("2d");
       ctx.imageSmoothingEnabled=true;
       ctx.imageSmoothingQuality="high";
       ctx.drawImage(img,sx,sy,size,size,0,0,512,512);
       canvas.toBlob((blob)=>{
         if(blob) onConfirm(new File([blob],"profile-picture.jpg",{type:"image/jpeg"}));
         else onCancel();
       },"image/jpeg",0.92);
     };
     img.onerror=()=>onCancel();
     img.src=src;
   }catch{onCancel();}
 }
 return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
   <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-border bg-background shadow-2xl">
     <div className="flex items-center justify-between border-b border-border px-5 py-4">
       <div><h2 className="text-lg font-extrabold text-foreground">Adjust profile picture</h2><p className="text-xs text-muted-foreground">Square crop • drag not required • zoom to fit</p></div>
       <button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted" aria-label="Close"><X className="h-4 w-4"/></button>
     </div>
     <div className="p-5">
       <div className="mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-full border-4 border-primary/20 bg-muted shadow-inner">
         <img src={src} alt="Crop preview" className="h-full w-full object-cover" style={{transform:`scale(${zoom})`,transformOrigin:"center"}}/>
       </div>
       <div className="mt-5 flex items-center gap-3"><ZoomIn className="h-4 w-4 text-muted-foreground"/><input aria-label="Zoom" type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={e=>setZoom(Number(e.target.value))} className="w-full"/></div>
       <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="m3-btn-outlined !rounded-2xl !py-3">Cancel</button><button type="button" onClick={confirm} disabled={busy} className="m3-btn-filled !rounded-2xl !py-3">{busy?"Preparing…":"Use this photo"}</button></div>
     </div>
   </div>
 </div>;
}

function ProfilePage(){
 const router=useRouter(); const existing=getCurrentUser(); const [user,setUser]=useState(existing); const [data,setData]=useState(()=>normaliseUser(existing||{})); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [photoBusy,setPhotoBusy]=useState(false); const [documents,setDocuments]=useState([]); const [documentBusy,setDocumentBusy]=useState(false); const [cropSrc,setCropSrc]=useState("");
 useEffect(()=>{if(!existing){router.navigate({to:"/signin"});return;} Promise.all([apiGetMe(), apiGetDoctorDocuments(existing.id).catch(()=>[])]) .then(([fresh,docs])=>{setUser(fresh);setData(normaliseUser(fresh));setDocuments(docs);const synced={...existing,...fresh,token:fresh.token||existing.token};setCurrentUser(synced);window.dispatchEvent(new Event("pranasakha-auth-changed"));}).catch(err=>toast.error(err.message||"Could not load profile.")).finally(()=>setLoading(false));},[]);
 const set=(key,value)=>setData(prev=>({...prev,[key]:value})); const toggle=(key,value)=>set(key,data[key].includes(value)?data[key].filter(x=>x!==value):[...data[key],value]);
 const specialties=useMemo(()=>CATEGORY_SPECIALTIES[data.category]||CATEGORY_SPECIALTIES.doctors,[data.category]); const scopes=useMemo(()=>CATEGORY_CLINICAL_SCOPE[data.category]||CATEGORY_CLINICAL_SCOPE.doctors,[data.category]);

 async function openDocument(doc){try{const response=await fetch(apiFileUrl(doc.storage_url),{headers:{Authorization:`Bearer ${getAuthToken()}`}});if(!response.ok)throw new Error("Could not open this document.");const blob=await response.blob();const url=URL.createObjectURL(blob);window.open(url,"_blank","noopener,noreferrer");setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(err){toast.error(err.message||"Could not open document.");}}
 async function save(){setSaving(true);try{const payload={full_name:data.fullName,dob:data.dob,gender:data.gender,nationality:data.nationality,passport_number:data.passportNumber,passport_country:data.passportCountry,passport_expiry:data.passportExpiry,country_code:data.countryCode,mobile:data.mobile,address:data.address,has_nmc:data.hasNmc,council_number:data.councilNumber,council_authority:data.councilAuthority,specialty:data.specialty,sub_specialty:data.subSpecialty,years_experience:data.yearsExperience,affiliation:data.affiliation,languages:data.languages,sai_center_affiliated:data.saiCenterAffiliated,sai_center_name:data.saiCenterName,norms_accepted:data.normsAccepted,service_category:data.category,institutions:data.institutions,clinical_scope:data.clinicalScope,preferred_from:data.preferredFrom,preferred_to:data.preferredTo,family:data.family,dietary:data.dietary,accessibility:data.accessibility,airport:data.airport,flight_number:data.flightNumber,airline:data.airline,darshan:data.darshan,consent_data:data.consentData,consent_declaration:data.consentDeclaration,consent_seva:data.consentSeva}; const fresh=await apiUpdateMyProfile(payload); const next={...user,...fresh,token:fresh.token||user.token}; setUser(next);setCurrentUser(next);window.dispatchEvent(new Event("pranasakha-auth-changed"));setData(normaliseUser(fresh));toast.success("Profile saved successfully.");}catch(err){toast.error(err.message||"Could not save profile.");}finally{setSaving(false);}}
 async function uploadCroppedPhoto(file){
  setPhotoBusy(true);
  try{const result=await apiUploadProfilePhoto(file);const next={...user,...result.user,token:result.user?.token||user.token,profile_picture:result.profile_picture};setUser(next);setCurrentUser(next);window.dispatchEvent(new Event("pranasakha-auth-changed"));setData(normaliseUser(next));toast.success("Profile photo updated.");}
  catch(err){toast.error(err.message||"Could not update photo.");}
  finally{setPhotoBusy(false);setCropSrc("");}
 }
 async function photo(e){const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){toast.error("Profile photo must be 5 MB or smaller.");e.target.value="";return;}
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)){toast.error("Please choose a JPG, PNG or WEBP image.");e.target.value="";return;}
  const reader=new FileReader();reader.onload=()=>setCropSrc(String(reader.result||""));reader.readAsDataURL(file);e.target.value="";
 }

 if(loading)return <div className="min-h-screen bg-surface"><NavBar/><main className="mx-auto max-w-5xl px-5 pb-16 pt-28"><div className="animate-pulse space-y-6"><div className="h-40 rounded-[2rem] bg-muted"/><div className="h-96 rounded-[2rem] bg-muted"/></div></main></div>;
 const initials=String(data.fullName||user?.email||"U").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"U";
 const completionFields=[data.fullName,data.dob,data.gender,data.nationality,data.passportNumber,data.passportCountry,data.passportExpiry,data.email,data.mobile,data.address,data.hasNmc,data.councilNumber,data.councilAuthority,data.specialty||data.subSpecialty,data.yearsExperience,data.affiliation,data.languages?.length,data.institutions?.length,data.clinicalScope?.length,data.preferredFrom,data.preferredTo,data.family?.length,data.dietary,data.accessibility,data.airport,data.flightNumber,data.airline,data.darshan,data.consentData,data.consentDeclaration,data.consentSeva];
 const profileCompletion=Math.min(100,Math.round(completionFields.filter(Boolean).length/completionFields.length*100));
 const dashboardPath=ROLE_HOME[user?.role]||"/dashboard/doctor";
 return (<><div className="min-h-screen bg-surface text-surface"><NavBar/><main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:px-8">
   <div className="overflow-hidden rounded-[2rem] border border-border bg-background shadow-[0_24px_80px_rgba(30,58,138,.07)]">
     <div className="h-28 bg-gradient-to-r from-primary via-primary/85 to-secondary">
       <div className="flex h-full items-start justify-end p-4 sm:p-5">
         <div className="rounded-2xl bg-background/95 px-3.5 py-2 text-right shadow-sm backdrop-blur">
           <p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Profile complete</p>
           <p className="mt-0.5 text-lg font-extrabold text-foreground">{profileCompletion}%</p>
         </div>
       </div>
     </div>
     <div className="px-5 pb-6 sm:px-8">
       <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
         <div className="flex items-end gap-4">
           <label className="group relative grid h-28 w-28 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-4 border-background bg-primary-container text-2xl font-extrabold text-on-primary-container shadow-lg">
             <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={photo}/>{data.profile_picture?<img src={data.profile_picture} alt="Profile" className="h-full w-full object-cover"/>:<span>{initials}</span>}
             <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/55 py-2 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100"><Camera className="mr-1 h-3.5 w-3.5"/>{photoBusy?"Uploading…":"Change photo"}</span>
           </label>
           <div className="pb-1">
             <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">My profile</p>
             <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{data.fullName||"Complete your profile"}</h1>
             <p className="mt-1 text-sm text-muted-foreground">{user?.email} · {String(user?.role||"").toUpperCase()}</p>
           </div>
         </div>
         <div className="flex flex-wrap gap-2">
           <button type="button" onClick={()=>router.navigate({to:"/"})} className="m3-btn-outlined !rounded-2xl !px-4 !py-3"><Home className="h-4 w-4"/> Home</button>
           <button type="button" onClick={()=>router.navigate({to:dashboardPath})} className="m3-btn-outlined !rounded-2xl !px-4 !py-3"><LayoutDashboard className="h-4 w-4"/> Dashboard</button>
           <button type="button" onClick={save} disabled={saving} className="m3-btn-filled !rounded-2xl !px-5 !py-3"><Save className="h-4 w-4"/>{saving?"Saving…":"Save changes"}</button>
         </div>
       </div>
     </div>
   </div>
   <div className="mt-6 grid gap-5"><section className="rounded-[2rem] border border-border bg-background p-5 sm:p-7"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-container text-primary"><ShieldCheck className="h-5 w-5"/></div><div><h2 className="text-lg font-extrabold text-foreground">Identity & contact</h2><p className="text-sm text-muted-foreground">These details mirror the identity section of registration.</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Full legal name" value={data.fullName} onChange={v=>set("fullName",v)} required/><Field label="Email address" value={data.email} onChange={()=>{}} disabled/><Field label="Date of birth" value={data.dob} onChange={v=>set("dob",v)} type="date" required/><Select label="Gender" value={data.gender} onChange={v=>set("gender",v)} options={GENDERS}/><Select label="Nationality" value={data.nationality} onChange={v=>set("nationality",v)} options={NATIONALITIES}/><Field label="Passport number" value={data.passportNumber} onChange={v=>set("passportNumber",v)} required/><Select label="Passport / issuing country" value={data.passportCountry} onChange={v=>set("passportCountry",v)} options={NATIONALITIES}/><Field label="Passport expiry" value={data.passportExpiry} onChange={v=>set("passportExpiry",v)} type="date"/><div className="sm:col-span-2"><div className="grid gap-1.5"><span className="text-xs font-bold text-muted-foreground">Mobile number</span><div className="grid grid-cols-[100px_minmax(0,1fr)] gap-2"><select value={data.countryCode} onChange={e=>set("countryCode",e.target.value)} className="rounded-2xl border border-input bg-background px-3 py-3 text-sm outline-none"><option value="">Code</option>{COUNTRY_CODES.map(c=><option key={c} value={c}>{c}</option>)}</select><input value={data.mobile} onChange={e=>set("mobile",e.target.value)} className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"/></div></div></div><label className="sm:col-span-2 grid gap-1.5"><span className="text-xs font-bold text-muted-foreground">Home country address</span><textarea value={data.address} onChange={e=>set("address",e.target.value)} rows={3} className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"/></label></div></section>
   <section className="rounded-[2rem] border border-border bg-background p-5 sm:p-7"><h2 className="text-lg font-extrabold text-foreground">Professional credentials</h2><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><p className="mb-2 text-xs font-bold text-muted-foreground">Service category</p><ToggleChips options={Object.keys(CATEGORY_SPECIALTIES).map(k=>k)} value={[data.category]} onToggle={v=>set("category",v)}/></div><div className="sm:col-span-2"><p className="mb-2 text-xs font-bold text-muted-foreground">Do you have any state (Medical Council) registration Number? <span className="font-normal normal-case">(Optional)</span></p><ToggleChips options={["yes","no"]} value={[data.hasNmc]} onToggle={v=>set("hasNmc",v)}/></div><Field label="State (Medical Council) registration number (Optional)" value={data.councilNumber} onChange={v=>set("councilNumber",v)}/><Field label="Issuing authority (Optional)" value={data.councilAuthority} onChange={v=>set("councilAuthority",v)}/><Select label="Primary specialty / role" value={data.specialty} onChange={v=>set("specialty",v)} options={specialties}/><Field label="Sub-specialty" value={data.subSpecialty} onChange={v=>set("subSpecialty",v)}/><Field label="Years of experience" value={data.yearsExperience} onChange={v=>set("yearsExperience",v)}/><Field label="Professional affiliation" value={data.affiliation} onChange={v=>set("affiliation",v)}/><div className="sm:col-span-2"><p className="mb-2 text-xs font-bold text-muted-foreground">Languages</p><ToggleChips options={LANGUAGES} value={data.languages} onToggle={v=>toggle("languages",v)}/></div></div></section>
   <section className="rounded-[2rem] border border-border bg-background p-5 sm:p-7"><h2 className="text-lg font-extrabold text-foreground">Service preferences</h2><div className="mt-6 grid gap-5"><div><p className="mb-2 text-xs font-bold text-muted-foreground">Preferred institutions</p><div className="grid gap-3">{INSTITUTIONS.map(inst=><button type="button" key={inst} onClick={()=>toggle("institutions",inst)} className={`rounded-2xl border p-4 text-left transition ${data.institutions.includes(inst)?"border-primary bg-primary-container/40":"border-border bg-background hover:bg-muted"}`}><div className="flex items-start justify-between gap-3"><span className="text-sm font-extrabold text-foreground">{inst}</span><span className="text-xs font-bold text-primary">{data.institutions.includes(inst)?"Selected":"Select"}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{INSTITUTION_ADDRESSES[inst]}</p></button>)}</div></div><div><p className="mb-2 text-xs font-bold text-muted-foreground">Clinical scope</p><ToggleChips options={scopes} value={data.clinicalScope} onToggle={v=>toggle("clinicalScope",v)}/></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Preferred from" value={data.preferredFrom} onChange={v=>set("preferredFrom",v)} type="date"/><Field label="Preferred to" value={data.preferredTo} onChange={v=>set("preferredTo",v)} type="date"/></div></div></section>
   <section className="rounded-[2rem] border border-border bg-background p-5 sm:p-7"><h2 className="text-lg font-extrabold text-foreground">Logistics & accommodation</h2><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Family members (names / relationships) (Optional)" value={data.family.join(", ")} onChange={v=>set("family",splitList(v))}/><Field label="Dietary requirements (Optional)" value={data.dietary} onChange={v=>set("dietary",v)}/><Field label="Accessibility / mobility needs (Optional)" value={data.accessibility} onChange={v=>set("accessibility",v)}/><Select label="Arrival airport (Optional)" value={data.airport} onChange={v=>set("airport",v)} options={["BLR — Bengaluru","BLR"]}/><Field label="Flight number (Optional)" value={data.flightNumber} onChange={v=>set("flightNumber",v)}/><Field label="Airline name (Optional)" value={data.airline} onChange={v=>set("airline",v)}/><div className="sm:col-span-2"><p className="mb-2 text-xs font-bold text-muted-foreground">Kulwant Hall Darshan seating request (Optional)</p><ToggleChips options={DARSHAN_OPTIONS} value={[data.darshan]} onToggle={v=>set("darshan",v)}/></div></div></section>
   <section className="rounded-[2rem] border border-border bg-background p-5 sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-extrabold text-foreground">Documents</h2><p className="text-sm text-muted-foreground">Qualification and registration files are stored with your existing secure document workflow. The acceptable format is PDF.</p></div><label className="m3-btn-outlined !rounded-2xl !px-4 !py-2.5 cursor-pointer"><input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={documentBusy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setDocumentBusy(true);try{const doc=await apiUploadDocument(file,{userId:user.id,documentType:"other"});setDocuments(prev=>[doc,...prev]);toast.success("Document uploaded.");}catch(err){toast.error(err.message||"Could not upload document.");}finally{setDocumentBusy(false);e.target.value="";}}}/>{documentBusy?"Uploading…":"Add document"}</label></div><div className="mt-5 grid gap-2">{documents.length?documents.slice(0,8).map(doc=><a key={doc.id} href="#" onClick={event=>{event.preventDefault();openDocument(doc);}} className="flex items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3 text-sm hover:bg-muted"><span className="min-w-0"><strong className="block truncate text-foreground">{doc.original_name}</strong><span className="text-xs text-muted-foreground">{doc.document_type} · {doc.verification_status}</span></span><span className="text-xs font-bold text-primary">Open</span></a>):<p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">No documents uploaded yet.</p>}</div></section>
   <section className="rounded-[2rem] border border-border bg-background p-5 sm:p-7"><h2 className="text-lg font-extrabold text-foreground">Consent & privacy</h2><div className="mt-5 grid gap-3">{[["consentData","I consent to the processing of my personal data in line with the DPDP Act 2023 and GDPR."],["consentDeclaration","I declare that I am under no active disciplinary action by any council or board."],["consentSeva","I acknowledge and accept the Seva terms of Sri Sathya Sai Medical Institutions."]].map(([key,label])=><label key={key} className="flex items-start gap-3 rounded-2xl border border-border/70 p-4"><input type="checkbox" checked={data[key]} onChange={e=>set(key,e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-secondary)]"/><span className="text-sm leading-6 text-foreground">{label}</span></label>)}</div></section>
   <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-2xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="px-2 text-xs text-muted-foreground">Changes are saved to your existing PRANASAKHA account.</p><button type="button" onClick={save} disabled={saving} className="m3-btn-filled !rounded-2xl !px-6 !py-3"><Save className="h-4 w-4"/>{saving?"Saving…":"Save profile"}</button></div>
 </div></main><Footer/></div>{cropSrc?<CropPhotoModal src={cropSrc} onCancel={()=>setCropSrc("")} onConfirm={uploadCroppedPhoto}/>:null}</>);
}
