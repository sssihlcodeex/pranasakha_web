import { oauthUrl } from "@/lib/api";

function GoogleMark(){return <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full text-[15px] font-extrabold">G</span>}
function MicrosoftMark(){return <span aria-hidden="true" className="grid h-5 w-5 grid-cols-2 grid-rows-2 overflow-hidden rounded-[2px]"><i className="bg-[#f35325]"/><i className="bg-[#81bc06]"/><i className="bg-[#05a6f0]"/><i className="bg-[#ffba08]"/></span>}

export function SocialAuthButtons({ intent="signin" }){
  const action=intent==="signup"?"Sign up":"Sign in";
  return <div className="grid gap-3 sm:grid-cols-2">
    <button type="button" onClick={()=>window.location.assign(oauthUrl("google",intent))} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-px hover:bg-muted">
      <GoogleMark/> {action} with Google
    </button>
    <button type="button" onClick={()=>window.location.assign(oauthUrl("microsoft",intent))} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-px hover:bg-muted">
      <MicrosoftMark/> {action} with Microsoft
    </button>
  </div>;
}

export function SocialAuthDivider(){return <div className="relative my-6"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"/></div><div className="relative flex justify-center"><span className="bg-background px-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">or continue with email</span></div></div>}
