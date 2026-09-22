import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { NavBar } from "@/components/site/NavBar";
import { SocialAuthButtons, SocialAuthDivider } from "@/components/auth/SocialAuthButtons";
import { apiGetMe, apiLogin } from "@/lib/api";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";

const ROLE_PATHS={doctor:"/dashboard/doctor",director:"/dashboard/directorate",hod:"/dashboard/hod",accommodation:"/dashboard/accommodation",mandir:"/dashboard/mandir",travel:"/dashboard/travel",it:"/dashboard/it",admin:"/dashboard/admin"};

export const Route=createFileRoute("/signin")({head:()=>({meta:[{title:"Sign In — PRANASAKHA"},{name:"description",content:"Securely access your PRANASAKHA Seva workspace."}]}),component:SignIn});

function SignIn(){
  const router=useRouter();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false); const [oauthLoading,setOauthLoading]=useState(true);
  useEffect(()=>{
    async function finishOAuth(){
      const query=new URLSearchParams(window.location.search);
      const rawHash=window.location.hash.slice(1);
      const hashParams=rawHash.startsWith("oauth=") ? new URLSearchParams(rawHash.slice(6)) : new URLSearchParams();
      const errorMessage=query.get("oauth_error") || (rawHash.startsWith("oauth_error=") ? decodeURIComponent(rawHash.slice("oauth_error=".length)) : "");
      if(errorMessage){
        setError(errorMessage);
        window.history.replaceState({},"",window.location.pathname);
        setOauthLoading(false);
        return;
      }
      const params=query.has("token") || query.has("oauth_intent") || query.has("profile") ? query : hashParams;
      if(!params.has("token")){ setOauthLoading(false); return; }
      try{
        const token=params.get("token");
        const isNew=params.get("isNew")==="1";
        if(!token)throw new Error("Social sign-in completed without a session token.");
        // The server has already authenticated the provider; preserve the project JWT/session shape.
        const segments=token.split(".");
        if(segments.length!==3) throw new Error("The social authentication session is invalid. Please sign in again.");
        const body=JSON.parse(atob(segments[1].replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(segments[1].length/4)*4,"=")));
        const stored={id:body.sub,email:body.email,role:body.role,token};
        setCurrentUser(stored);
        const fresh=await apiGetMe();
        const merged={...stored,...fresh,token};
        setCurrentUser(merged);
        window.history.replaceState({},"",window.location.pathname);
        await router.navigate({to:isNew?"/profile":(ROLE_PATHS[merged.role]||"/profile")});
      }catch(err){
        setError(err.message||"Social sign-in failed. Please try again.");
        window.history.replaceState({},"",window.location.pathname);
      }finally{setOauthLoading(false);}
    }
    finishOAuth();
  },[router]);
  async function handleSubmit(e){e.preventDefault();setError("");setLoading(true);try{const user=await apiLogin(email,password);setCurrentUser(user);router.navigate({to:ROLE_PATHS[user.role]||"/profile"});}catch(err){setError(err.message||"Sign in failed. Please try again.");}finally{setLoading(false);}}
  return <div className="auth-page flex min-h-[100svh] flex-col bg-surface text-surface"><NavBar/>
    <main className="flex min-h-[calc(100svh-72px)] flex-1 items-start px-4 pb-6 pt-24 sm:items-center sm:px-6 sm:py-10 lg:py-8"><section className="mx-auto w-full max-w-5xl">
      <div className="grid overflow-hidden rounded-[2rem] border border-border bg-background/90 shadow-[0_24px_80px_rgba(30,58,138,0.08)] lg:grid-cols-[1.05fr_.95fr]">
        <div className="relative hidden overflow-hidden bg-primary p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14"><img src="/images/sssihms.jpg" alt="Sri Sathya Sai Institute of Higher Medical Sciences" className="absolute inset-0 h-full w-full object-cover" /><div className="relative z-10"><span className="inline-flex rounded-full bg-white/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">PRANASAKHA</span><h1 className="mt-7 text-4xl font-extrabold leading-tight">Welcome back to your Seva workspace.</h1><p className="mt-4 max-w-md text-base leading-7 text-white/75">Use your existing account or continue securely with Google or Microsoft.</p></div><div className="relative z-10 mt-10 grid gap-3 text-sm text-white/80"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Protected role-based access</span><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> One profile across every dashboard</span></div></div>
        <div className="p-6 sm:p-9 lg:p-11"><div className="mx-auto max-w-md"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Sign in</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Continue to PRANASAKHA</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Your profile, notifications, approvals and Seva activities stay connected.</p></div>
          <SocialAuthButtons intent="signin"/><SocialAuthDivider/>
          <form className="space-y-5" onSubmit={handleSubmit}><div><label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground">Email address</label><input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"/></div><div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="block text-sm font-semibold text-foreground">Password</label><a href="#" className="text-xs font-semibold text-primary hover:underline">Forgot password?</a></div><input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"/></div>
            {error?<p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>:null}
            <button disabled={loading||oauthLoading} className="m3-btn-filled w-full !min-h-12 !justify-center !rounded-2xl !text-sm">{loading?"Signing in…":"Sign in"}<ArrowRight className="h-4 w-4"/></button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">New to PRANASAKHA? <a href="/signup" className="font-bold text-primary hover:underline">Create an account</a></p>
        </div></div>
      </div>
    </section></main></div>;
}
