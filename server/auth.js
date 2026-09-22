import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  randomUUID,
  randomBytes,
  createPublicKey,
  verify as verifySignature,
} from "crypto";
import { db } from "./db.js";
import http from "http";
import https from "https";
import tls from "node:tls";
import fsSync from "node:fs";
import { execFileSync } from "node:child_process";
import { createDoctorApplication, getDoctorByUserId } from "./doctors.js";

const secret = process.env.JWT_SECRET || "dev-only-change-me";
const expires = process.env.JWT_EXPIRES_IN || "8h";
const frontendOrigin = String(process.env.FRONTEND_ORIGIN || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
let googleJwksCache = { keys: [], expiresAt: 0 };

// Corporate/enterprise networks can intercept outbound HTTPS with a locally
// trusted root CA. Node normally uses its bundled CA store, which can reject
// that certificate. Keep TLS verification enabled and extend the trusted CA
// set with the OS trust store when possible. On Node versions that do not yet
// expose tls.getCACertificates("system"), Windows uses the public root
// certificates from the Windows Root stores as a compatibility fallback.
function pemFromBase64(base64) {
  const clean = String(base64 || "").replace(/\s+/g, "");
  if (!clean) return "";
  return `-----BEGIN CERTIFICATE-----\n${clean.match(/.{1,64}/g)?.join("\n")}\n-----END CERTIFICATE-----`;
}

function loadWindowsRootCertificates() {
  if (process.platform !== "win32") return [];
  try {
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "$stores = @('Cert:\CurrentUser\Root','Cert:\LocalMachine\Root')",
      "foreach ($store in $stores) {",
      "  Get-ChildItem $store -ErrorAction SilentlyContinue | ForEach-Object {",
      "    try { [Convert]::ToBase64String($_.RawData) } catch {}",
      "  }",
      "}",
    ].join(";");
    const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.split(/\r?\n/).map(pemFromBase64).filter(Boolean);
  } catch (error) {
    console.warn(`[OAuth TLS] Could not read Windows Root certificate stores: ${error.message}`);
    return [];
  }
}

function buildOAuthCaBundle() {
  const customPath = String(process.env.OAUTH_CA_FILE || "").trim();
  const custom = customPath && fsSync.existsSync(customPath) ? fsSync.readFileSync(customPath, "utf8") : "";
  if (customPath && !custom) console.warn(`[OAuth TLS] OAUTH_CA_FILE was set but could not be read: ${customPath}`);

  let system = [];
  if (typeof tls.getCACertificates === "function") {
    try { system = tls.getCACertificates("system"); } catch {}
  }
  if (!system.length) system = loadWindowsRootCertificates();

  const bundled = Array.isArray(tls.rootCertificates) ? tls.rootCertificates : [];
  const merged = [...new Set([...bundled, ...system, ...(custom ? [custom] : [])])];
  return merged.length ? merged : undefined;
}

const OAUTH_CA_BUNDLE = buildOAuthCaBundle();
const OAUTH_HTTPS_AGENT = OAUTH_CA_BUNDLE ? new https.Agent({ ca: OAUTH_CA_BUNDLE, keepAlive: true }) : undefined;

export function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, secret, {
    expiresIn: expires,
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function profilePayload(input = {}, identity = {}) {
  return {
    full_name: input.full_name ?? identity.name ?? "",
    department: input.department ?? "",
    institution: input.institution ?? "",
    dob: input.dob ?? "",
    gender: input.gender ?? "",
    nationality: input.nationality ?? "",
    passport_number: input.passportNumber ?? input.passport_number ?? "",
    passport_country: input.passportCountry ?? input.passport_country ?? "",
    passport_expiry: input.passportExpiry ?? input.passport_expiry ?? "",
    country_code: input.countryCode ?? input.country_code ?? "+91",
    mobile: input.mobile ?? "",
    address: input.address ?? "",
    has_nmc: input.hasNmc ?? input.has_nmc ?? "",
    council_number: input.councilNumber ?? input.council_number ?? "",
    council_authority: input.councilAuthority ?? input.council_authority ?? "",
    sub_specialty: input.subSpecialty ?? input.sub_specialty ?? "",
    affiliation: input.affiliation ?? "",
    languages: Array.isArray(input.languages) ? input.languages.join(", ") : input.languages ?? "",
    sai_center_affiliated: input.saiCenterAffiliated ?? input.sai_center_affiliated ?? "",
    sai_center_name: input.saiCenterName ?? input.sai_center_name ?? "",
    institutions: Array.isArray(input.institutions) ? input.institutions.join(", ") : input.institutions ?? input.preferred_institutions ?? "",
    clinical_scope: Array.isArray(input.clinicalScope) ? input.clinicalScope.join(", ") : input.clinical_scope ?? "",
    preferred_from: input.preferredFrom ?? input.preferred_from ?? "",
    preferred_to: input.preferredTo ?? input.preferred_to ?? "",
    family: Array.isArray(input.family) ? input.family.join(", ") : input.family ?? "",
    dietary: input.dietary ?? "",
    accessibility: input.accessibility ?? "",
    airport: input.airport ?? "",
    flight_number: input.flightNumber ?? input.flight_number ?? "",
    airline: input.airline ?? "",
    darshan: input.darshan ?? "None",
    profile_picture: input.profile_picture ?? identity.picture ?? "",
    service_category: input.category ?? input.service_category ?? "doctors",
    norms_accepted: input.normsAccepted ?? input.norms_accepted ?? false,
    consent_data: input.consentData ?? input.consent_data ?? false,
    consent_declaration: input.consentDeclaration ?? input.consent_declaration ?? false,
    consent_seva: input.consentSeva ?? input.consent_seva ?? false,
  };
}

async function insertUserWithProfile({ id, email, passwordHash, role, profile, authProvider = "password", providerSubject = null, providerProfile = null }) {
  await db.withTransaction(async (c) => {
    await c.query(
      "INSERT INTO users(id,email,password_hash,role,active,auth_provider,provider_subject,provider_profile) VALUES($1,$2,$3,$4,TRUE,$5,$6,$7)",
      [id, email, passwordHash, role, authProvider, providerSubject, JSON.stringify(providerProfile || {})],
    );
    const keys = Object.keys(profile);
    const vals = Object.values(profile);
    await c.query(
      `INSERT INTO profiles(user_id,${keys.join(",")}) VALUES($1,${keys.map((_, i) => `$${i + 2}`).join(",")})`,
      [id, ...vals],
    );
  });
}

export async function signup(input) {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email is required.");
  if ((await db.query("SELECT 1 FROM users WHERE lower(email)=$1", [email])).rowCount)
    throw new Error("An account with this email already exists.");
  if (!input.password || input.password.length < 8)
    throw new Error("Password must be at least 8 characters.");

  const roles = new Set(["doctor", "director", "hod", "accommodation", "mandir", "travel", "it", "admin"]);
  const role = input.role || "doctor";
  if (!roles.has(role)) throw new Error("Invalid account role.");

  const id = randomUUID();
  const password = await bcrypt.hash(input.password, 12);
  const profile = profilePayload(input);
  const allowedCategories = new Set(["doctors", "nurses", "physiotherapists", "technicians", "assistants", "others"]);
  if (!allowedCategories.has(profile.service_category)) throw new Error("Please choose a valid Seva category.");
  await insertUserWithProfile({ id, email, passwordHash: password, role, profile });

  if (role === "doctor") {
    await createDoctorApplication({
      user_id: id,
      specialty: input.specialty || "",
      years_experience: input.years_experience || "",
      preferred_institutions: profile.institutions,
      clinical_scope: profile.clinical_scope,
    });
  }

  const user = {
    id,
    email,
    role,
    ...profile,
  };
  return { ...user, token: issueToken(user) };
}

export async function login(emailInput, password) {
  const email = normalizeEmail(emailInput);
  const r = await db.query("SELECT * FROM users WHERE lower(email)=$1", [email]);
  if (!r.rowCount) throw new Error("This account does not exist. Please sign up first.");
  const u = r.rows[0];
  if (!u.active) throw new Error("This account has been deactivated. Contact your Admin.");
  if (!u.password_hash) {
    throw new Error(`This account uses ${u.auth_provider || "social"} sign-in. Continue with ${u.auth_provider === "google" ? "Google" : "Microsoft"}.`);
  }
  if (!(await bcrypt.compare(password, u.password_hash))) throw new Error("Incorrect password.");
  const p = (await db.query("SELECT * FROM profiles WHERE user_id=$1", [u.id])).rows[0];
  const user = { id: u.id, email: u.email, role: u.role, ...p };
  return { ...user, token: issueToken(user) };
}

function formBody(values) {
  return new URLSearchParams(
    Object.entries(values).filter(([, value]) => value !== undefined && value !== null),
  ).toString();
}

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    let target;
    try { target = new URL(url); } catch {
      reject(new Error(`OAuth provider URL is invalid: ${url}`));
      return;
    }
    const transport = target.protocol === "https:" ? https : http;
    const request = transport.request(target, {
      method: options.method || "GET",
      headers: options.headers || {},
      ...(target.protocol === "https:" && OAUTH_HTTPS_AGENT ? { agent: OAUTH_HTTPS_AGENT } : {}),
    }, (response) => {
      const chunks = [];
      response.setEncoding("utf8");
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = chunks.join("");
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch { /* provider returned non-json */ }
        const status = Number(response.statusCode || 0);
        if (status < 200 || status >= 300) {
          reject(new Error(data.error_description || data.error || `OAuth provider request failed (${status}).`));
          return;
        }
        resolve(data);
      });
    });
    request.setTimeout(15000, () => request.destroy(new Error("OAuth provider request timed out.")));
    request.on("error", (error) => {
      reject(new Error(`OAuth provider connection failed: ${error.message}`));
    });
    if (options.body) request.write(options.body);
    request.end();
  });
}

function envRequired(name, message) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(message || `${name} is not configured.`);
  return value;
}

export function getOAuthRedirectUri(provider) {
  const fallbackBase = String(process.env.PUBLIC_API_ORIGIN || "http://localhost:4000").replace(/\/$/, "");
  return provider === "google"
    ? (process.env.GOOGLE_REDIRECT_URI || `${fallbackBase}/api/auth/google/callback`)
    : (process.env.MS_REDIRECT_URI || `${fallbackBase}/api/auth/microsoft/callback`);
}

export function buildOAuthUrl(provider, intent = "signin") {
  if (!["google", "microsoft"].includes(provider)) throw new Error("Unsupported OAuth provider.");
  const nonce = randomBytes(24).toString("hex");
  const state = jwt.sign({ provider, intent, nonce }, secret, { expiresIn: "10m" });

  if (provider === "google") {
    const clientId = envRequired("GOOGLE_CLIENT_ID", "Google sign-in is not configured on this server yet.");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getOAuthRedirectUri("google"),
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
      state,
      nonce,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  const clientId = envRequired("MS_CLIENT_ID", "Microsoft sign-in is not configured on this server yet.");
  const tenant = String(process.env.MS_TENANT_ID || "common").trim();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOAuthRedirectUri("microsoft"),
    response_type: "code",
    response_mode: "query",
    scope: "openid profile email User.Read",
    prompt: "select_account",
    state,
    nonce,
  });
  return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize?${params}`;
}

function b64urlDecode(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(normalized, "base64");
}

function decodeJwt(token) {
  const [encodedHeader, encodedPayload, encodedSignature] = String(token || "").split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw new Error("Invalid identity token.");
  const header = JSON.parse(b64urlDecode(encodedHeader).toString("utf8"));
  const payload = JSON.parse(b64urlDecode(encodedPayload).toString("utf8"));
  return { header, payload, signingInput: `${encodedHeader}.${encodedPayload}`, signature: b64urlDecode(encodedSignature) };
}

async function verifyMicrosoftIdToken(idToken, nonce) {
  const { header, payload, signingInput, signature } = decodeJwt(idToken);
  const tenant = String(payload.tid || "").trim();
  if (!tenant || !header.kid) throw new Error("Microsoft identity token is missing required claims.");
  const discovery = await fetchJson(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/v2.0/.well-known/openid-configuration`);
  const jwks = await fetchJson(discovery.jwks_uri);
  const jwk = Array.isArray(jwks.keys) ? jwks.keys.find((key) => key.kid === header.kid) : null;
  if (!jwk) throw new Error("Microsoft signing key not found.");
  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const ok = verifySignature("RSA-SHA256", Buffer.from(signingInput), publicKey, signature);
  if (!ok) throw new Error("Microsoft identity token signature is invalid.");
  const now = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://login.microsoftonline.com/${tenant}/v2.0`;
  if (payload.iss !== expectedIssuer) throw new Error("Microsoft identity token issuer is invalid.");
  if (payload.aud !== process.env.MS_CLIENT_ID) throw new Error("Microsoft identity token audience is invalid.");
  if (!payload.exp || payload.exp <= now) throw new Error("Microsoft identity token has expired.");
  if (payload.nonce !== nonce) throw new Error("Microsoft identity token nonce is invalid.");
  return payload;
}

async function getProviderIdentity(provider, code, stateData) {
  if (provider === "google") {
    const clientId = envRequired("GOOGLE_CLIENT_ID", "Google sign-in is not configured on this server yet.");
    const clientSecret = envRequired("GOOGLE_CLIENT_SECRET", "Google sign-in is not configured on this server yet.");
    const tokens = await fetchJson("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getOAuthRedirectUri("google"),
        grant_type: "authorization_code",
      }),
    });
    if (!tokens.id_token) throw new Error("Google did not return an identity token.");
    const decoded = decodeJwt(tokens.id_token);
    if (decoded.header.alg !== "RS256" || !decoded.header.kid) throw new Error("Google identity token uses an unsupported signing method.");
    if (Date.now() >= googleJwksCache.expiresAt) {
      const jwks = await fetchJson("https://www.googleapis.com/oauth2/v3/certs");
      googleJwksCache = { keys: Array.isArray(jwks.keys) ? jwks.keys : [], expiresAt: Date.now() + 60 * 60 * 1000 };
    }
    const jwk = googleJwksCache.keys.find((key) => key.kid === decoded.header.kid);
    if (!jwk) throw new Error("Google signing key not found.");
    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    if (!verifySignature("RSA-SHA256", Buffer.from(decoded.signingInput), publicKey, decoded.signature)) {
      throw new Error("Google identity token signature is invalid.");
    }
    const payload = decoded.payload;
    if (payload.aud !== clientId) throw new Error("Google identity token audience is invalid.");
    if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") throw new Error("Google identity token issuer is invalid.");
    if (stateData.nonce && payload.nonce && payload.nonce !== stateData.nonce) throw new Error("Google identity token nonce is invalid.");
    if (!payload.exp || Number(payload.exp) <= Math.floor(Date.now() / 1000)) throw new Error("Google identity token has expired.");
    if (!payload.sub || !payload.email || payload.email_verified !== true) throw new Error("Google account email could not be verified.");
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.given_name || "",
      picture: payload.picture || "",
      mobile: "",
      providerProfile: { ...payload },
    };
  }

  const clientId = envRequired("MS_CLIENT_ID", "Microsoft sign-in is not configured on this server yet.");
  const clientSecret = envRequired("MS_CLIENT_SECRET", "Microsoft sign-in is not configured on this server yet.");
  const tenant = String(process.env.MS_TENANT_ID || "common").trim();
  const tokens = await fetchJson(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getOAuthRedirectUri("microsoft"),
      grant_type: "authorization_code",
      scope: "openid profile email User.Read",
    }),
  });
  const claims = await verifyMicrosoftIdToken(tokens.id_token, stateData.nonce);
  let picture = claims.picture || "";
  try {
    const graphPhoto = await new Promise((resolve, reject) => {
      const request = https.request("https://graph.microsoft.com/v1.0/me/photo/$value", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        ...(OAUTH_HTTPS_AGENT ? { agent: OAUTH_HTTPS_AGENT } : {}),
      }, (response) => {
        if (response.statusCode !== 200) { response.resume(); resolve(""); return; }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const type = response.headers["content-type"] || "image/jpeg";
          resolve(`data:${type};base64,${Buffer.concat(chunks).toString("base64")}`);
        });
      });
      request.setTimeout(10000, () => request.destroy(new Error("photo timeout")));
      request.on("error", reject);
      request.end();
    });
    if (graphPhoto) picture = graphPhoto;
  } catch {
    // Photo is optional. Name/email authentication is still valid.
  }
  let graphProfile = {};
  try {
    graphProfile = await fetchJson("https://graph.microsoft.com/v1.0/me?$select=id,displayName,givenName,surname,mail,userPrincipalName,mobilePhone,preferredLanguage,jobTitle,officeLocation,businessPhones", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  } catch {
    // The verified ID token remains sufficient when Graph profile enrichment is unavailable.
  }
  const email = normalizeEmail(graphProfile.mail || graphProfile.userPrincipalName || claims.email || claims.preferred_username || "");
  if (!claims.sub || !email) throw new Error("Microsoft account email could not be read.");
  return {
    sub: claims.sub,
    email,
    name: graphProfile.displayName || claims.name || "",
    picture,
    mobile: graphProfile.mobilePhone || "",
    providerProfile: { claims, graph: graphProfile },
  };
}

export async function oauthCallback(provider, code, state) {
  let stateData;
  try { stateData = jwt.verify(state, secret); } catch { throw new Error("OAuth session expired or is invalid. Please start again."); }
  if (stateData.provider !== provider) throw new Error("OAuth provider mismatch.");

  const identity = await getProviderIdentity(provider, code, stateData);
  const email = normalizeEmail(identity.email);
  const existingByProvider = await db.query(
    "SELECT u.*,p.* FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.auth_provider=$1 AND u.provider_subject=$2",
    [provider, identity.sub],
  );
  const existingByEmail = await db.query(
    "SELECT u.*,p.* FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE lower(u.email)=$1",
    [email],
  );

  // Signup OAuth must NEVER create or update a PRANASAKHA account here.
  // It only returns a short-lived, signed identity package that the signup form
  // submits after the user completes every required field.
  if (stateData.intent === "signup") {
    if (existingByProvider.rowCount || existingByEmail.rowCount) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }
    const pendingToken = jwt.sign({
      purpose: "oauth_signup",
      provider,
      provider_subject: identity.sub,
      provider_profile: identity.providerProfile || {},
      email,
      name: identity.name || "",
      picture: identity.picture || "",
      mobile: identity.mobile || "",
    }, secret, { expiresIn: "2h" });
    return {
      user: {
        auth_provider: provider,
        email,
        full_name: identity.name || "",
        profile_picture: identity.picture || "",
        mobile: identity.mobile || "",
        provider_profile: identity.providerProfile || {},
      },
      isNewUser: true,
      intent: "signup",
      pendingSignupToken: pendingToken,
    };
  }

  if (!existingByProvider.rowCount && !existingByEmail.rowCount) {
    throw new Error("This account does not exist. Please sign up first.");
  }

  let userId;
  if (existingByProvider.rowCount) {
    const row = existingByProvider.rows[0];
    if (!row.active) throw new Error("This account has been deactivated. Contact your Admin.");
    userId = row.id;
    await db.query(
      "UPDATE profiles SET full_name=CASE WHEN NULLIF(full_name,'') IS NULL THEN $1 ELSE full_name END, profile_picture=CASE WHEN NULLIF(profile_picture,'') IS NULL THEN $2 ELSE profile_picture END, mobile=CASE WHEN NULLIF(mobile,'') IS NULL THEN $3 ELSE mobile END, updated_at=NOW() WHERE user_id=$4",
      [identity.name || "", identity.picture || "", identity.mobile || "", userId],
    );
    await db.query("UPDATE users SET provider_profile=$1 WHERE id=$2", [JSON.stringify(identity.providerProfile || {}), userId]);
  } else {
    const row = existingByEmail.rows[0];
    if (!row.active) throw new Error("This account has been deactivated. Contact your Admin.");
    userId = row.id;
    await db.query(
      "UPDATE users SET auth_provider=$1,provider_subject=$2,provider_profile=$3 WHERE id=$4",
      [provider, identity.sub, JSON.stringify(identity.providerProfile || {}), userId],
    );
    await db.query(
      "UPDATE profiles SET full_name=CASE WHEN NULLIF(full_name,'') IS NULL THEN $1 ELSE full_name END, profile_picture=CASE WHEN NULLIF(profile_picture,'') IS NULL THEN $2 ELSE profile_picture END, mobile=CASE WHEN NULLIF(mobile,'') IS NULL THEN $3 ELSE mobile END, updated_at=NOW() WHERE user_id=$4",
      [identity.name || "", identity.picture || "", identity.mobile || "", userId],
    );
  }

  const p = (await db.query("SELECT * FROM profiles WHERE user_id=$1", [userId])).rows[0] || {};
  const u = (await db.query("SELECT id,email,role,active,auth_provider,provider_subject,provider_profile FROM users WHERE id=$1", [userId])).rows[0];
  const user = { ...u, ...p };
  return { user: { ...user, token: issueToken(user) }, isNewUser: false, intent: "signin" };
}

export async function completeSocialSignup(input = {}) {
  const rawToken = String(input.oauth_signup_token || "").trim();
  if (!rawToken) throw new Error("Your social signup session is missing or expired. Please start signup again.");
  let pending;
  try { pending = jwt.verify(rawToken, secret); } catch { throw new Error("Your social signup session has expired. Please connect Google or Microsoft again."); }
  if (pending.purpose !== "oauth_signup") throw new Error("Invalid social signup session.");
  const provider = String(pending.provider || "").toLowerCase();
  if (!['google','microsoft'].includes(provider)) throw new Error("Unsupported social signup provider.");

  const email = normalizeEmail(input.email);
  if (!email || email !== normalizeEmail(pending.email)) throw new Error("The signup email does not match the verified social account.");
  if (!pending.provider_subject) throw new Error("The social account identity is incomplete. Please start signup again.");

  const existingByProvider = await db.query(
    "SELECT 1 FROM users WHERE auth_provider=$1 AND provider_subject=$2",
    [provider, pending.provider_subject],
  );
  const existingByEmail = await db.query("SELECT 1 FROM users WHERE lower(email)=$1", [email]);
  if (existingByProvider.rowCount || existingByEmail.rowCount) {
    throw new Error("An account with this email already exists. Please sign in instead.");
  }

  const userId = randomUUID();
  const profile = profilePayload(input, {
    name: pending.name || "",
    picture: pending.picture || "",
  });
  profile.full_name = String(input.full_name || pending.name || "").trim();
  profile.profile_picture = input.profile_picture || pending.picture || "";
  profile.mobile = input.mobile ?? pending.mobile ?? "";
  const allowedCategories = new Set(["doctors", "nurses", "physiotherapists", "technicians", "assistants", "others"]);
  profile.service_category = String(input.category || input.service_category || "doctors");
  if (!allowedCategories.has(profile.service_category)) throw new Error("Please choose a valid Seva category.");

  await insertUserWithProfile({
    id: userId,
    email,
    passwordHash: null,
    role: String(input.role || "doctor"),
    authProvider: provider,
    providerSubject: pending.provider_subject,
    providerProfile: pending.provider_profile || {},
    profile,
  });

  if (String(input.role || "doctor") === "doctor") {
    await createDoctorApplication({
      user_id: userId,
      specialty: input.specialty || "",
      years_experience: input.years_experience || "",
      preferred_institutions: profile.institutions,
      clinical_scope: profile.clinical_scope,
    });
  }

  const user = { id: userId, email, role: String(input.role || "doctor"), auth_provider: provider, provider_subject: pending.provider_subject, ...profile };
  return { ...user, token: issueToken(user) };
}

export async function updateMyProfile(userId, input = {}) {
  const fields = [
    "full_name","department","institution","dob","gender","nationality","passport_number","passport_country","passport_expiry",
    "country_code","mobile","address","has_nmc","council_number","council_authority","sub_specialty","affiliation","languages",
    "sai_center_affiliated","sai_center_name","institutions","clinical_scope","preferred_from","preferred_to","family","dietary",
    "accessibility","airport","flight_number","airline","darshan","service_category","norms_accepted","consent_data","consent_declaration","consent_seva",
  ];

  return db.withTransaction(async (client) => {
    const owner = await client.query("SELECT role FROM users WHERE id=$1", [userId]);
    if (!owner.rowCount) throw new Error("Your account could not be found. Please sign in again.");
    if (!((await client.query("SELECT 1 FROM profiles WHERE user_id=$1", [userId])).rowCount)) {
      throw new Error("Your profile could not be found. Please sign in again.");
    }

    const values = [];
    const sets = [];
    for (const f of fields) {
      if (input[f] !== undefined || input[toCamelCase(f)] !== undefined) {
        const raw = input[f] !== undefined ? input[f] : input[toCamelCase(f)];
        values.push(Array.isArray(raw) ? raw.join(", ") : raw);
        sets.push(`${f}=$${values.length}`);
      }
    }
    if (sets.length) {
      values.push(userId);
      await client.query(`UPDATE profiles SET ${sets.join(",")},updated_at=NOW() WHERE user_id=$${values.length}`, values);
    }

    if (owner.rows[0].role === "doctor") {
      const doctor = await client.query("SELECT id FROM doctors WHERE user_id=$1", [userId]);
      if (doctor.rowCount) {
        const doctorFields = {
          specialty: input.specialty,
          years_experience: input.years_experience ?? input.yearsExperience,
          preferred_institutions: input.preferred_institutions ?? input.institutions,
          clinical_scope: input.clinical_scope ?? input.clinicalScope,
        };
        const dVals = [];
        const dSets = [];
        for (const [f, value] of Object.entries(doctorFields)) {
          if (value !== undefined) {
            dVals.push(Array.isArray(value) ? value.join(", ") : value);
            dSets.push(`${f}=$${dVals.length}`);
          }
        }
        if (dSets.length) {
          dVals.push(doctor.rows[0].id);
          await client.query(`UPDATE doctors SET ${dSets.join(",")},profile_updated_at=NOW() WHERE id=$${dVals.length}`, dVals);
        }
      }
    }

    const result = await client.query(
      "SELECT u.id,u.email,u.role,u.active,u.auth_provider,u.provider_subject,u.provider_profile,p.*,d.specialty,d.years_experience,d.preferred_institutions AS doctor_preferred_institutions,d.clinical_scope AS doctor_clinical_scope FROM users u LEFT JOIN profiles p ON p.user_id=u.id LEFT JOIN doctors d ON d.user_id=u.id WHERE u.id=$1",
      [userId],
    );
    const user = result.rows[0];
    return { ...user, token: issueToken(user) };
  });
}

function toCamelCase(value) {
  return String(value).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export async function getFullCurrentUser(userId) {
  const r = await db.query("SELECT u.id,u.email,u.role,u.active,u.auth_provider,u.provider_subject,u.provider_profile,p.*,d.specialty,d.years_experience,d.preferred_institutions AS doctor_preferred_institutions,d.clinical_scope AS doctor_clinical_scope FROM users u LEFT JOIN profiles p ON p.user_id=u.id LEFT JOIN doctors d ON d.user_id=u.id WHERE u.id=$1", [userId]);
  if (!r.rowCount) return null;
  return r.rows[0];
}

export async function seedDemoUsers(){const rows=[{email:"doctor@pranasakha.test",role:"doctor",full_name:"Dr. Demo Doctor",specialty:"Cardiology",years_experience:"6",preferred_institutions:["SSSIHMS, Prasanthigram"],clinical_scope:["OPD","OT / Surgery"]},{email:"director@pranasakha.test",role:"director",full_name:"Demo Director"},{email:"hod@pranasakha.test",role:"hod",full_name:"Demo HoD",department:"Cardiology"},{email:"accommodation@pranasakha.test",role:"accommodation",full_name:"Demo Accommodation"},{email:"mandir@pranasakha.test",role:"mandir",full_name:"Demo Mandir Committee"},{email:"travel@pranasakha.test",role:"travel",full_name:"Demo Travel Desk"},{email:"it@pranasakha.test",role:"it",full_name:"Demo IT"},{email:"admin@pranasakha.test",role:"admin",full_name:"Demo Admin"}];for(const a of rows){try{await signup({...a,password:"Demo@1234"});console.log(`Created: ${a.email}`);}catch(e){console.log(`Skipped: ${a.email} (${e.message})`);}}}
