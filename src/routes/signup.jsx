import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { z } from "zod";
import { NavBar } from "@/components/site/NavBar";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Stepper } from "@/components/signup/Stepper";
import { Step1Identity } from "@/components/signup/Step1Identity";
import { Step2Credentials } from "@/components/signup/Step2Credentials";
import { Step3Preferences } from "@/components/signup/Step3Preferences";
import { Step4Logistics } from "@/components/signup/Step4Logistics";
import { Step5Review } from "@/components/signup/Step5Review";
import {
  emptyDataFor,
  STEPS,
  UPLOADS,
  CATEGORIES,
} from "@/components/signup/types";
import { apiGetMe, apiSignup, apiUpdateMyProfile, apiUploadDocument } from "@/lib/api";
import { getCurrentUser, setCurrentUser } from "@/lib/auth";
function getStoredToken() { return getCurrentUser()?.token || ""; }
const searchSchema = z.object({
  category: z.string().optional(),
});
export const Route = createFileRoute("/signup")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign Up — PRANASAKHA Volunteer Registration" },
      {
        name: "description",
        content:
          "Register as a volunteer with Sri Sathya Sai Medical Institutions: identity, credentials, service preferences and logistics in guided steps.",
      },
      { property: "og:title", content: "Volunteer Registration — PRANASAKHA" },
      {
        property: "og:description",
        content:
          "A guided onboarding flow for volunteers offering Seva at Sri Sathya Sai hospitals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignUpPage,
});
function isValidCategory(v) {
  return !!v && CATEGORIES.some((c) => c.slug === v);
}
function validate(step, data) {
  const e = {};
  const req = (key, message = "Required") => {
    if (!String(data[key] ?? "").trim()) e[key] = message;
  };
  if (step === 0) {
    [
      "fullName",
      "dob",
      "gender",
      "nationality",
      "passportNumber",
      "passportCountry",
      "passportExpiry",
      "email",
      "mobile",
      "address",
    ].forEach((k) => req(k));
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      e["email"] = "Enter a valid email";
  }
  if (step === 1) {
    // State/medical-council registration details are optional.
    req("specialty");
    if (data.specialty === "Other") req("specialtyOther");
    req("yearsExperience");
    req("affiliation");
    UPLOADS.filter((u) => u.required).forEach((u) => {
      if (!data.files[u.key]) e[`file_${u.key}`] = "Upload required";
    });
    if (data.languages.length === 0)
      e["languages"] = "Select at least one language";
  }
  if (step === 2) {
    if (data.clinicalScope.length === 0)
      e["clinicalScope"] = "Select at least one";
    if (
      data.clinicalScope.includes("Other") &&
      !data.clinicalScopeOther.trim()
    ) {
      e["clinicalScopeOther"] = "Please specify";
    }
  }
  if (step === 3) {
    // Logistics are intentionally optional.
  }
  return e;
}
function CategoryScreen({ onSelect, onBack, socialAccount, socialLoading }) {
  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-label-large text-on-surface-variant hover:text-on-surface"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-headline-medium text-on-surface">
        Choose Your Category
      </h1>
      <p className="mt-3 max-w-2xl text-body-large text-on-surface-variant">
        First choose the category that best matches your Seva role. You can then complete the full registration form. Google or Microsoft will prefill the identity details they securely provide.
      </p>
      {socialAccount ? (
        <section className="mt-7 max-w-2xl rounded-3xl border border-primary/20 bg-primary-container/30 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-background bg-background text-sm font-extrabold text-primary">
              {socialAccount.picture ? <img src={socialAccount.picture} alt="Account" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : String(socialAccount.name || "U").split(/\s+/).filter(Boolean).slice(0,2).map((x)=>x[0]).join("").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Details fetched from {socialAccount.provider === "google" ? "Google" : "Microsoft"}</p>
              <p className="mt-1 truncate text-title-medium text-on-surface">{socialAccount.name || "Account"}</p>
              <p className="truncate text-sm text-on-surface-variant">{socialAccount.email}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">Your verified provider details are kept securely in this signup session and will be saved to PRANASAKHA only after you submit the completed registration.</p>
        </section>
      ) : (
        <div className="mt-7 max-w-2xl rounded-3xl border border-border bg-background/80 p-4 sm:p-5">
          <SocialAuthButtons intent="signup" />
        </div>
      )}
      {socialLoading ? <div className="mt-4 max-w-2xl rounded-2xl border border-border bg-background px-4 py-3 text-sm text-on-surface-variant">Connecting your Google/Microsoft account…</div> : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onSelect(cat.slug)}
            className="m3-card-outlined p-6 text-left transition-colors hover:border-primary hover:bg-primary-container/10"
          >
            <h3 className="text-title-medium text-on-surface">{cat.label}</h3>
            <p className="mt-2 text-body-large text-on-surface-variant">
              {cat.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
function SignUpPage() {
  const router = useRouter();
  const search = Route.useSearch();
  const initialCategory = isValidCategory(search.category)
    ? search.category
    : null;
  const [phase, setPhase] = useState(initialCategory ? "form" : "category");
  const [category, setCategory] = useState(initialCategory);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState(emptyDataFor(initialCategory ?? "doctors"));
  const [errors, setErrors] = useState({});
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [socialAccount, setSocialAccount] = useState(null);
  const [socialLoading, setSocialLoading] = useState(false);
  useEffect(() => {
    function decodeProfile(encodedProfile) {
      if (!encodedProfile) return {};
      try {
        const normalized = encodedProfile.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encodedProfile.length / 4) * 4, "=");
        return JSON.parse(atob(normalized));
      } catch {
        return {};
      }
    }

    function applySocialIdentity(identity) {
      const providerCategoryData = emptyDataFor("doctors");
      providerCategoryData.fullName = identity.name || "";
      providerCategoryData.email = identity.email || "";
      providerCategoryData.mobile = identity.mobile || "";
      providerCategoryData.profile_picture = identity.picture || "";
      providerCategoryData.countryCode = "+91";
      setSocialAccount(identity);
      setCategory(null);
      setPhase("category");
      setStep(0);
      setData(providerCategoryData);
    }

    function finishSocialSignup() {
      if (typeof window === "undefined") return;
      setSocialLoading(true);
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash.replace(/^#/, "");
        const hashParams = hash.startsWith("oauth=") ? new URLSearchParams(hash.slice(6)) : new URLSearchParams();

        const errorMessage = searchParams.get("oauth_error") || (hash.startsWith("oauth_error=") ? decodeURIComponent(hash.slice("oauth_error=".length)) : "");
        if (errorMessage) {
          window.history.replaceState({}, "", window.location.pathname);
          sessionStorage.removeItem("pranasakha_social_signup");
          toast.error(errorMessage || "Google/Microsoft signup could not be completed.");
          return;
        }

        // Support the query-string handoff used by the current backend and the
        // previous fragment handoff so existing sessions keep working.
        const hasFreshHandoff = searchParams.has("signup_token") || searchParams.has("profile") || hashParams.has("signup_token") || hashParams.has("profile");
        const source = hasFreshHandoff ? (searchParams.has("signup_token") || searchParams.has("profile") ? searchParams : hashParams) : new URLSearchParams();
        let signupToken = source.get("signup_token") || "";
        let providerProfile = decodeProfile(source.get("profile"));
        const saved = (() => {
          try { return JSON.parse(sessionStorage.getItem("pranasakha_social_signup") || "null"); } catch { return null; }
        })();

        function tokenIsUsable(token) {
          try {
            const parts = String(token || "").split(".");
            if (parts.length !== 3) return false;
            const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parts[1].length / 4) * 4, "=")));
            return Number(payload.exp || 0) > Math.floor(Date.now() / 1000) + 30;
          } catch {
            return false;
          }
        }

        if (!signupToken && saved?.signupToken && tokenIsUsable(saved.signupToken)) signupToken = saved.signupToken;
        if (!Object.keys(providerProfile).length && saved?.providerProfile && tokenIsUsable(saved.signupToken)) providerProfile = saved.providerProfile;
        if (!signupToken && saved?.signupToken) {
          sessionStorage.removeItem("pranasakha_social_signup");
        }

        if (!signupToken) {
          // Normal email signup has no social session; show the regular category screen.
          setSocialLoading(false);
          return;
        }

        const provider = providerProfile.provider || saved?.identity?.provider || "social";
        const identity = {
          provider,
          name: providerProfile.name || saved?.identity?.name || "",
          email: providerProfile.email || saved?.identity?.email || "",
          picture: providerProfile.picture || saved?.identity?.picture || "",
          mobile: providerProfile.mobile || saved?.identity?.mobile || "",
          providerProfile: providerProfile.providerProfile || saved?.identity?.providerProfile || {},
          signupToken,
        };

        // The provider token/profile is kept only in browser session storage
        // until the user submits the completed form. No PRANASAKHA user is
        // created by this step.
        sessionStorage.setItem("pranasakha_social_signup", JSON.stringify({ signupToken, providerProfile, identity }));
        applySocialIdentity(identity);
        window.history.replaceState({}, "", window.location.pathname);
        toast.success(`${provider === "google" ? "Google" : provider === "microsoft" ? "Microsoft" : "Social"} account connected. Choose your category to continue.`);
      } catch (err) {
        toast.error(err.message || "Could not load your social account details. Please try again.");
      } finally {
        setSocialLoading(false);
      }
    }
    finishSocialSignup();
  }, []);

  const set = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const goTo = (target) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
    setErrors({});
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => {
    const found = validate(step, data);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error("Please complete the required fields on this step.");
      return;
    }
    goTo(Math.min(step + 1, STEPS.length - 1));
  };
  function handleBack() {
    if (step === 0) {
      setPhase("category");
      setErrors({});
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    goTo(step - 1);
  }
  const allConsents =
    data.consentData && data.consentDeclaration && data.consentSeva;
  const passwordsValid = password.length >= 8 && password === confirmPassword;
  const canSubmit = allConsents && (socialAccount ? true : passwordsValid);
  async function handleSubmit() {
    if (!canSubmit) {
      if (!socialAccount && !passwordsValid)
        toast.error("Enter a password (min 8 characters) and confirm it.");
      return;
    }
    setSubmitting(true);
    try {
      const resolvedSpecialty =
        data.specialty === "Other" ? data.specialtyOther : data.specialty;
      const profileInput = {
        ...data,
        email: data.email,
        password,
        role: "doctor",
        full_name: data.fullName,
        dob: data.dob,
        gender: data.gender,
        nationality: data.nationality,
        passportNumber: data.passportNumber,
        passportCountry: data.passportCountry,
        passportExpiry: data.passportExpiry,
        countryCode: data.countryCode,
        mobile: data.mobile,
        address: data.address,
        hasNmc: data.hasNmc,
        councilNumber: data.councilNumber,
        councilAuthority: data.councilAuthority,
        specialty: resolvedSpecialty || "General",
        subSpecialty: data.subSpecialty,
        years_experience: data.yearsExperience || "",
        preferred_institutions: data.institutions.join(", "),
        institutions: data.institutions,
        clinicalScope: data.clinicalScope.map((s) => (s === "Other" ? data.clinicalScopeOther : s)),
        clinical_scope: data.clinicalScope.map((s) => (s === "Other" ? data.clinicalScopeOther : s)),
        preferredFrom: data.preferredFrom,
        preferredTo: data.preferredTo,
        languages: data.languages,
        saiCenterAffiliated: data.saiCenterAffiliated,
        saiCenterName: data.saiCenterName,
        family: data.family,
        dietary: data.dietary,
        accessibility: data.accessibility,
        airport: data.airport,
        flightNumber: data.flightNumber,
        airline: data.airline,
        darshan: data.darshan,
        profile_picture: socialAccount?.picture || data.profile_picture || "",
      };
      const user = socialAccount ? await apiSignup({ ...profileInput, oauth_signup_token: socialAccount.signupToken }) : await apiSignup(profileInput);
      const storedUser = { ...user, token: user.token };
      if (socialAccount && typeof window !== "undefined") sessionStorage.removeItem("pranasakha_social_signup");
      setCurrentUser(storedUser);
      window.dispatchEvent(new Event("pranasakha-auth-changed"));
      const files = Object.entries(data.files || {}).filter(([, file]) => file instanceof File);
      for (const [documentType, file] of files) {
        try { await apiUploadDocument(file, { userId: user.id, documentType }); } catch (uploadError) { toast.warning(`${file.name} could not be uploaded. You can add it from your dashboard.`); }
      }
      toast.success("Account created. Welcome to PRANASAKHA.");
      router.navigate({ to: "/dashboard/doctor" });
    } catch (err) {
      toast.error(err.message || "Signup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }
  // --- PHASE 1: CATEGORY ---
  if (phase === "category" || !category) {
    return (
      <div className="flex min-h-[100svh] flex-col bg-surface">
        <header className="fixed top-0 left-0 right-0 z-50">
          <NavBar />
        </header>
        <main className="flex min-h-[calc(100svh-72px)] flex-1 items-start px-4 pb-8 pt-24 sm:px-6 sm:pt-28 lg:px-8">
          <CategoryScreen
            socialAccount={socialAccount}
            socialLoading={socialLoading}
            onBack={() => setPhase("category")}
            onSelect={(c) => {
              setCategory(c);
              if (socialAccount) {
                setData((current) => ({ ...current, ...emptyDataFor(c), fullName: current.fullName, email: current.email, mobile: current.mobile, dob: current.dob, gender: current.gender, nationality: current.nationality, passportNumber: current.passportNumber, passportCountry: current.passportCountry, passportExpiry: current.passportExpiry, countryCode: current.countryCode, address: current.address, profile_picture: current.profile_picture }));
              } else {
                setData(emptyDataFor(c));
              }
              setPhase("form");
            }}
          />
        </main>
      </div>
    );
  }
  // --- PHASE 2: FORM ---
  return (
    <div className="flex min-h-[100svh] flex-col bg-surface">
      <header className="fixed top-0 left-0 right-0 z-50">
        <NavBar />
      </header>
      <main className="mx-auto flex min-h-[calc(100svh-72px)] w-full max-w-4xl flex-1 flex-col px-4 pb-8 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        <h1 className="text-headline-medium text-on-surface">
          {category[0].toUpperCase() + category.slice(1)} Registration
        </h1>
        <p className="mt-2 text-body-large text-on-surface-variant">
          Five short steps. Your details go to the Directorate for verification.
        </p>
        {socialAccount ? (
          <section className="mt-6 rounded-3xl border border-primary/20 bg-primary-container/30 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-background bg-background grid place-items-center text-sm font-extrabold text-primary">
                  {socialAccount.picture ? <img src={socialAccount.picture} alt="Account" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : String(socialAccount.name || "U").split(/\s+/).filter(Boolean).slice(0,2).map((x)=>x[0]).join("").toUpperCase()}
                </div>
                <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Details fetched from {socialAccount.provider === "google" ? "Google" : "Microsoft"}</p><p className="mt-1 truncate text-title-medium text-on-surface">{socialAccount.name || "Account"}</p><p className="truncate text-sm text-on-surface-variant">{socialAccount.email}</p></div>
              </div>
              <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-background px-3 py-2 text-xs font-bold text-primary">Identity connected</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">The available name, email, profile photo and existing PRANASAKHA details have been placed into the form below. Review or complete the remaining fields before submitting.</p>
          </section>
        ) : null}
        {socialLoading ? <div className="mt-6 rounded-2xl border border-border bg-background p-4 text-sm text-on-surface-variant">Loading your Google/Microsoft account details…</div> : null}

        <div className="mt-8">
          <Stepper current={step} onJump={goTo} />
        </div>

        <div className="relative mt-8 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {step === 0 && (
                <Step1Identity data={data} set={set} errors={errors} />
              )}
              {step === 1 && (
                <Step2Credentials data={data} set={set} errors={errors} />
              )}
              {step === 2 && (
                <Step3Preferences data={data} set={set} errors={errors} />
              )}
              {step === 3 && (
                <Step4Logistics data={data} set={set} errors={errors} />
              )}
              {step === 4 && (
                <div className="space-y-8">
                  <Step5Review data={data} set={set} onEdit={goTo} />

                  <div className="rounded-3xl border border-border bg-background/80 p-6">
                    <h3 className="text-title-medium text-on-surface">
                      Secure your account
                    </h3>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Create a password or link an existing account to sign in
                      later.
                    </p>

                    <p className="mt-5 rounded-2xl bg-primary-container/45 px-4 py-3 text-sm text-on-primary-container">For social sign-up, use Google or Microsoft at the start of registration. Your verified identity details are held securely until you submit this completed registration.</p>
                    {!socialAccount ? (<><div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-4 text-muted-foreground">
                          Or set a password
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="password"
                          className="mb-2 block text-sm font-medium text-foreground"
                        >
                          Password
                        </label>
                        <input
                          id="password"
                          type="password"
                          minLength={8}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-3xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                          placeholder="Min 8 characters"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="confirmPassword"
                          className="mb-2 block text-sm font-medium text-foreground"
                        >
                          Confirm password
                        </label>
                        <input
                          id="confirmPassword"
                          type="password"
                          minLength={8}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full rounded-3xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                          placeholder="Re-enter password"
                        />
                      </div>
                    </div>
                    {password && confirmPassword && !passwordsValid && (
                      <p className="mt-3 text-sm text-red-600">
                        Passwords must match and be at least 8 characters.
                      </p>
                    )}
                    </>) : <div className="rounded-2xl border border-primary/20 bg-primary-container/35 px-4 py-3 text-sm text-on-primary-container">Your {socialAccount.provider === "google" ? "Google" : "Microsoft"} account will be used to sign in. No additional password is required.</div>}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="m3-btn-outlined !rounded-full"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="m3-btn-filled !rounded-full"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="m3-fab bg-secondary text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
