import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Home, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { apiPublicVerifyPass } from "@/lib/api";

const CHECKPOINTS = [
  { id: "gate", label: "Gate", note: "Identity & active visit" },
  { id: "canteen", label: "Canteen", note: "Meal entitlement" },
  { id: "mandir", label: "Mandir", note: "Darshan status" },
  { id: "camp", label: "Camp", note: "Service participation" },
];

export const Route = createFileRoute("/verify/$token")({
  head: () => ({ meta: [{ title: "Verify Seva Pass — PRANASAKHA" }, { name: "description", content: "Verify a PRANASAKHA lifetime Seva pass." }] }),
  component: VerifyPass,
});

function VerifyPass() {
  const { token } = useParams({ from: "/verify/$token" });
  const [checkpoint, setCheckpoint] = useState("gate");
  const [state, setState] = useState({ loading: true, error: "", result: null });

  async function verify(selected = checkpoint) {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const result = await apiPublicVerifyPass(token, selected);
      setState({ loading: false, error: "", result });
    } catch (err) {
      setState({ loading: false, error: err.message || "Unable to verify this pass.", result: null });
    }
  }

  useEffect(() => { verify("gate"); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const data = state.result?.data;
  const granted = state.result?.result === "granted";
  const denied = state.result && !granted;
  const revoked = state.result?.reason?.toLowerCase().includes("revoked");

  return (
    <div className="min-h-[100svh] bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3 font-extrabold tracking-tight text-slate-950">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white"><ShieldCheck size={18} /></span>
            PRANASAKHA
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Home size={14} /> Home</Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
          <div className="bg-gradient-to-r from-primary via-primary/90 to-secondary px-5 py-6 text-white sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">PRANASAKHA • SECURE VERIFICATION</p><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Lifetime Seva Pass</h1><p className="mt-1 max-w-xl text-sm leading-6 text-white/80">This page verifies the pass using its opaque token. Personal information is fetched securely from the PRANASAKHA server.</p></div>
              <ShieldCheck className="mt-1 shrink-0" size={28} />
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Checkpoint</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CHECKPOINTS.map((item) => <button key={item.id} onClick={() => { setCheckpoint(item.id); verify(item.id); }} className={`rounded-xl border px-3 py-2 text-left transition ${checkpoint === item.id ? "border-primary bg-primary/5 ring-2 ring-primary/10" : "border-slate-200 bg-white hover:border-slate-300"}`}><span className="block text-sm font-bold text-slate-900">{item.label}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{item.note}</span></button>)}
              </div>
            </div>

            {state.loading ? (
              <div className="flex min-h-72 flex-col items-center justify-center text-center"><div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary" /><h2 className="text-lg font-extrabold">Verifying pass…</h2><p className="mt-1 text-sm text-slate-500">Checking status with PRANASAKHA.</p></div>
            ) : state.error ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600"><AlertCircle /></div><h2 className="mt-3 text-lg font-extrabold text-red-900">Verification unavailable</h2><p className="mt-2 text-sm text-red-700">{state.error}</p><button onClick={() => verify(checkpoint)} className="mt-4 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white">Try again</button></div>
            ) : (
              <div className="mt-5">
                <div className={`rounded-2xl border p-4 ${granted ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                  <div className="flex items-center gap-3">{granted ? <CheckCircle2 className="text-emerald-600" size={25} /> : <XCircle className="text-red-600" size={25} />}<div><h2 className={`text-lg font-extrabold ${granted ? "text-emerald-900" : "text-red-900"}`}>{granted ? "PASS VERIFIED" : revoked ? "PASS REVOKED" : state.result?.reason || "PASS NOT VERIFIED"}</h2><p className={`text-xs ${granted ? "text-emerald-700" : "text-red-700"}`}>{revoked ? "This QR is permanently invalid. Do not grant access." : state.result?.checkpoint?.name || "Checkpoint"}</p></div></div>
                </div>

                {revoked ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><div className="font-bold">Access denied</div><div className="mt-1 text-xs leading-5 text-red-700">This pass was revoked by an authorised administrator. A replacement pass, when issued, will have a different QR token.</div></div> : null}

                {data ? <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr]">
                  <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm sm:mx-0">{data.photo ? <img src={data.photo} alt="Verified profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <UserRound className="text-slate-400" size={42} />}</div>
                  <div className="space-y-3">
                    <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Name</p><p className="text-2xl font-extrabold tracking-tight text-slate-950">{data.name || "—"}</p></div>
                    {Object.entries(data).filter(([k]) => !["photo", "name"].includes(k)).map(([key, value]) => <div key={key} className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3"><span className="text-xs font-semibold capitalize text-slate-500">{key.replaceAll("_", " ")}</span><strong className="text-right text-sm text-slate-800">{String(value || "—")}</strong></div>)}
                  </div>
                </div> : <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center"><Clock3 className="mx-auto text-slate-400" /><p className="mt-2 text-sm font-semibold text-slate-700">No checkpoint details are available.</p></div>}
              </div>
            )}

            <div className="mt-6 border-t border-slate-200 pt-4 text-center text-[11px] leading-5 text-slate-500">Pass verification is server-controlled. The QR itself contains only an opaque token and can be suspended or revoked without reissuing the printed pass.</div>
          </div>
        </section>
      </main>
    </div>
  );
}
