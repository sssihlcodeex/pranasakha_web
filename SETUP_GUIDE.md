# PRANASAKHA — Complete Google + Microsoft OAuth, Profile, PostgreSQL Migration & Deployment Guide

This is the single setup guide for the upgraded PRANASAKHA project.

It covers the full process from getting Google and Microsoft credentials, configuring the backend, migrating PostgreSQL, running locally, deploying to production, and verifying the complete authentication/profile flow.

---

# 1. What the upgraded authentication flow does

The browser starts OAuth through the PRANASAKHA backend:

- Google start: `/api/auth/google/start`
- Google callback: `/api/auth/google/callback`
- Microsoft start: `/api/auth/microsoft/start`
- Microsoft callback: `/api/auth/microsoft/callback`

The provider returns an authorization code to the backend. The backend exchanges that code for provider identity data, creates or updates the PRANASHA/PRANASAKHA account and profile, and then creates the normal PRANASAKHA JWT session.

The Google/Microsoft client secrets therefore stay on the backend and must never be placed in React/Vite source code or `VITE_*` variables.

The resulting user profile is available throughout the application, including the dashboard profile/avatar and `/profile`.

---

# 2. Before you start

You should have:

- The upgraded PRANASAKHA source code
- Node.js installed
- npm installed
- PostgreSQL available locally or on the deployment server
- Access to Google Cloud Console
- Access to Microsoft Entra admin center
- The backend and frontend ports/domains used by your deployment

The current project setup uses:

```text
Frontend development URL:
http://localhost:5173

Backend development URL:
http://localhost:4000
```

If your backend uses a different port, replace `4000` everywhere in this guide with your real backend port.

---

# 3. The two OAuth callback URLs

These are the most important URLs to register with the identity providers.

## Local development

Google:

```text
http://localhost:4000/api/auth/google/callback
```

Microsoft:

```text
http://localhost:4000/api/auth/microsoft/callback
```

## Production example

Assume your public API is:

```text
https://api.example.org
```

Then use:

Google:

```text
https://api.example.org/api/auth/google/callback
```

Microsoft:

```text
https://api.example.org/api/auth/microsoft/callback
```

The registered redirect URI and the URI sent by the application must match exactly. Check the protocol, hostname, port, path, and trailing slash behavior.

---

# 4. GOOGLE — GET THE CLIENT ID AND CLIENT SECRET

## 4.1 Open Google Cloud Console

Open:

https://console.cloud.google.com/

Sign in with the Google account that will manage the PRANASAKHA OAuth application.

Official Google OAuth documentation:

https://developers.google.com/identity/protocols/oauth2/web-server

---

## 4.2 Create a Google Cloud project

At the top of Google Cloud Console:

**Project selector → New Project**

Use a name such as:

```text
PRANASAKHA
```

Click **Create**.

You can also select an existing project if the PRANASAKHA application already has a dedicated Google Cloud project.

---

## 4.3 Open the OAuth / Google Auth configuration

In the Google Cloud Console, use the current OAuth configuration area. Depending on the console layout, this may appear as:

**Google Auth Platform**

or under:

**APIs & Services → OAuth consent screen**

Google periodically changes the navigation labels, but the same OAuth application configuration is used.

---

## 4.4 Configure the application branding

Set the application information.

Suggested values:

```text
App name:
PRANASAKHA
```

Choose your support email.

Provide the developer/contact email required by the Google configuration.

Upload your PRANASAKHA logo if desired.

For production, configure the authorized domains required by Google for the domain from which the application is served.

For local development, keep localhost settings appropriate for testing.

---

## 4.5 Choose the audience

Google may ask whether the application is internal or external.

For PRANASAKHA, if users are not restricted to a single Google Workspace organization, choose:

```text
External
```

For a strictly internal Google Workspace deployment, an internal application may be appropriate instead.

---

## 4.6 Use the required identity scopes

The PRANASAKHA authentication flow only needs the standard identity scopes:

```text
openid
email
profile
```

Do not request extra Google API permissions unless another PRANASAKHA feature genuinely requires them.

These scopes provide the identity information needed for account creation and profile synchronization.

Official OpenID Connect reference:

https://developers.google.com/identity/openid-connect/reference

---

## 4.7 Create the OAuth Client

Go to:

**Google Cloud Console → APIs & Services → Credentials**

or the equivalent **Google Auth Platform → Clients** area.

Choose:

**Create credentials → OAuth client ID**

Select:

```text
Application type:
Web application
```

Suggested name:

```text
PRANASAKHA Web
```

Google documents the Web application client type for server-backed web OAuth flows.

---

## 4.8 Add Authorized JavaScript origins

For local development, if the PRANASAKHA frontend is:

```text
http://localhost:5173
```

add:

```text
http://localhost:5173
```

If your local browser accesses the application using another hostname or development origin, register the actual origin used by the browser where required.

This is different from the redirect URI.

---

## 4.9 Add the Authorized redirect URI

This is the most important Google configuration field.

For the current local setup:

```text
http://localhost:4000/api/auth/google/callback
```

For production, use your real HTTPS API URL, for example:

```text
https://api.example.org/api/auth/google/callback
```

Do not put the frontend URL here.

Do not use:

```text
http://localhost:5173/api/auth/google/callback
```

unless your backend actually handles OAuth at port 5173.

Google requires the redirect URI used by the application to match the registered value exactly.

Official documentation:

https://developers.google.com/identity/openid-connect/openid-connect

---

## 4.10 Create the client

Click **Create**.

Google will provide:

```text
Client ID
Client Secret
```

A client ID commonly resembles:

```text
123456789012-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

Copy both values securely.

---

## 4.11 Put Google credentials into `.env`

Backend `.env`:

```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
```

Production example:

```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://api.example.org/api/auth/google/callback
```

Never commit the Google client secret to Git.

Never place it in:

```text
VITE_GOOGLE_CLIENT_SECRET
```

or any frontend-exposed variable.

---

# 5. MICROSOFT — GET THE CLIENT ID AND CLIENT SECRET

Microsoft OAuth is configured through Microsoft Entra ID / the Microsoft identity platform.

Open:

https://entra.microsoft.com/

Official documentation:

https://learn.microsoft.com/en-us/entra/identity-platform/

---

## 5.1 Open App registrations

In the Microsoft Entra admin center, go to:

**Identity → Applications → App registrations**

Then click:

**New registration**

The exact left-navigation labels can change as the Entra portal evolves, but the **App registrations** page is the target.

---

## 5.2 Enter the application name

Use:

```text
PRANASAKHA Web
```

or:

```text
PRANASAKHA
```

---

## 5.3 Choose Supported account types

Microsoft presents several account-type choices.

For a single-organization deployment, choose the organization-only option.

For a PRANASAKHA deployment that should accept both organizational Microsoft accounts and personal Microsoft accounts, choose the broader option equivalent to:

```text
Accounts in any organizational directory and personal Microsoft accounts
```

This matches the project's default:

```env
MS_TENANT_ID=common
```

For a strictly single-tenant deployment, use the organization's tenant ID instead of `common`.

Microsoft application registration documentation:

https://learn.microsoft.com/en-us/graph/auth-register-app-v2

---

## 5.4 Register the application

Click:

**Register**

After registration, Microsoft opens the application's Overview page.

---

## 5.5 Copy the Application (client) ID

On the Overview page find:

```text
Application (client) ID
```

Copy it.

It typically looks like:

```text
12345678-abcd-1234-abcd-123456789abc
```

This becomes:

```env
MS_CLIENT_ID=12345678-abcd-1234-abcd-123456789abc
```

Also note the:

```text
Directory (tenant) ID
```

For a multi-account application using `common`, you normally keep:

```env
MS_TENANT_ID=common
```

For a strictly single-tenant configuration, replace `common` with the tenant ID.

---

## 5.6 Configure the Web redirect URI

Open:

**Manage → Authentication**

Choose:

**Add a platform → Web**

Add the exact callback.

Local:

```text
http://localhost:4000/api/auth/microsoft/callback
```

Production example:

```text
https://api.example.org/api/auth/microsoft/callback
```

Click **Configure** or **Save**.

Microsoft requires the application redirect URI to correspond to the configured Web platform.

Official redirect URI documentation:

https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri

---

## 5.7 Create the Microsoft client secret

Open:

**Manage → Certificates & secrets**

Then:

**Client secrets → New client secret**

Description:

```text
PRANASAKHA Production
```

Choose a suitable expiration according to your organization's security policy.

Click **Add**.

Microsoft shows the new secret value.

---

## 5.8 VERY IMPORTANT — copy the Secret VALUE

Microsoft shows values similar to:

```text
Secret ID
Value
```

You need:

```text
Value
```

Do NOT put the Secret ID into `MS_CLIENT_SECRET`.

The secret Value is only shown at creation time. Save it securely immediately.

Your `.env` should use:

```env
MS_CLIENT_SECRET=THE_SECRET_VALUE
```

Official registration documentation:

https://learn.microsoft.com/en-us/graph/auth-register-app-v2

---

## 5.9 Microsoft environment variables

Local development:

```env
MS_CLIENT_ID=YOUR_MICROSOFT_APPLICATION_CLIENT_ID
MS_CLIENT_SECRET=YOUR_MICROSOFT_CLIENT_SECRET_VALUE
MS_TENANT_ID=common
MS_REDIRECT_URI=http://localhost:4000/api/auth/microsoft/callback
```

Production:

```env
MS_CLIENT_ID=YOUR_MICROSOFT_APPLICATION_CLIENT_ID
MS_CLIENT_SECRET=YOUR_MICROSOFT_CLIENT_SECRET_VALUE
MS_TENANT_ID=common
MS_REDIRECT_URI=https://api.example.org/api/auth/microsoft/callback
```

For a single-tenant application:

```env
MS_TENANT_ID=YOUR_TENANT_ID
```

---

# 6. COMPLETE BACKEND `.env`

Start from the project's `.env.example` file.

For local development, use a configuration similar to:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pranasakha
DATABASE_SSL=false
DB_POOL_MAX=15
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=8h
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
UPLOAD_DIR=uploads
MAX_UPLOAD_BYTES=10485760

PUBLIC_API_ORIGIN=http://localhost:4000

GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

MS_CLIENT_ID=YOUR_MICROSOFT_CLIENT_ID
MS_CLIENT_SECRET=YOUR_MICROSOFT_CLIENT_SECRET_VALUE
MS_TENANT_ID=common
MS_REDIRECT_URI=http://localhost:4000/api/auth/microsoft/callback
```

Replace all placeholders with real values.

Generate a strong random `JWT_SECRET` for production.

Do not commit `.env` to Git.

---

# 7. If your backend is not on port 4000

Find the backend port in the project's environment/configuration.

For example, if the backend is:

```text
http://localhost:8000
```

then the callbacks are:

Google:

```text
http://localhost:8000/api/auth/google/callback
```

Microsoft:

```text
http://localhost:8000/api/auth/microsoft/callback
```

The value in `.env` and the value registered in Google/Microsoft must use the same backend port.

---

# 8. If you test from a LAN IP

Suppose your backend is reachable as:

```text
http://localhost:4000
```

then a development callback would be:

Google:

```text
http://localhost:4000/api/auth/google/callback
```

Microsoft:

```text
http://localhost:4000/api/auth/microsoft/callback
```

Register the exact URI in the provider console if your provider/development setup allows that host.

For production, prefer a real HTTPS domain rather than an IP address.

---

# 9. PostgreSQL — LOCAL SETUP

The project includes Docker Compose PostgreSQL support.

From the project root:

```bash
npm install
npm run db:up
```

The bundled local database is configured around:

```text
Database: pranasakha
User: postgres
Password: postgres
Port: 5432
```

These default credentials are for local development only.

Do not use the default `postgres/postgres` combination for production.

---

# 10. Check PostgreSQL is running

Use:

```bash
npm run db:logs
```

or:

```bash
docker ps
```

Confirm the PostgreSQL container is running and healthy.

---

# 11. Run the database migrations

The project's migration runner applies SQL files under:

```text
server/migrations/
```

Run:

```bash
npm run db:migrate
```

Do not manually run only the newest migration on a brand-new database.

The migration runner should apply migrations in filename order.

The migration tracking table is:

```text
_migrations
```

Already-applied migrations are skipped.

---

# 12. Important migration for Google/Microsoft profile support

The upgraded project includes:

```text
server/migrations/005_social_auth_profile_fields.sql
```

The migration adds compatibility for social-only accounts and provider identity/profile information, including:

- Nullable `users.password_hash` for social-only accounts
- `users.auth_provider`
- `users.provider_subject`
- A provider-subject unique index
- Additional profile/service/consent fields used by the updated profile flow

On an existing database, run the complete migration runner rather than executing `005` by itself:

```bash
npm run db:migrate
```

---

# 13. EXISTING PRODUCTION DATABASE — SAFE MIGRATION PROCEDURE

Always back up before schema changes.

## 13.1 Create a backup

Example:

```bash
pg_dump "$DATABASE_URL" > pranasakha-backup-before-auth-migration.sql
```

Custom-format backup:

```bash
pg_dump -Fc "$DATABASE_URL" -f pranasakha-backup-before-auth-migration.dump
```

Store the backup somewhere safe and verify that the backup exists before continuing.

---

## 13.2 Deploy the new source code

Copy the upgraded application to the server.

Keep the production `.env` outside source control.

Do not overwrite the production database configuration with local development values.

---

## 13.3 Confirm database configuration

Example check:

```bash
node -e "import('dotenv/config').then(()=>console.log(process.env.DATABASE_URL ? 'DATABASE_URL configured' : 'DATABASE_URL missing'))"
```

---

## 13.4 Run the migration

```bash
npm run db:migrate
```

You should see migrations being applied or already skipped because they have previously run.

---

# 14. Seed data

The project contains existing seed helpers.

Use them carefully and only after reviewing what they modify.

Local examples:

```bash
npm run seed:server
```

or:

```bash
npm run seed:extra
```

For schema changes only:

```bash
npm run db:migrate
```

Do not run destructive or test seed operations blindly against production.

---

# 15. Start PRANASAKHA locally

## Terminal 1 — backend

```bash
npm run server
```

Expected backend origin:

```text
http://localhost:4000
```

## Terminal 2 — frontend

```bash
npm run dev
```

Expected frontend origin:

```text
http://localhost:5173
```

Open:

```text
http://localhost:5173
```

The landing page should appear first.

---

# 16. COMPLETE AUTHENTICATION TEST FLOW

## 16.1 Email signup

1. Open the landing page.
2. Open Sign Up.
3. Fill the registration details.
4. Submit the signup form.
5. Confirm the backend saves the details.
6. Confirm the user is signed in and redirected to the appropriate dashboard.
7. Open the profile.
8. Confirm the same information is displayed.
9. Edit the profile.
10. Save.
11. Reload and verify the changes persist.

---

## 16.2 Google signup/sign-in

1. Open the landing page.
2. Open Sign In or Sign Up.
3. Click **Continue with Google**.
4. Authenticate with a Google account.
5. Google redirects to:

```text
/api/auth/google/callback
```

6. The backend creates or finds the PRANASAKHA account.
7. Provider name/email/photo are saved or updated.
8. PRANASAKHA creates the normal JWT session.
9. The user reaches the correct dashboard.
10. The profile/avatar should show the provider photo when available.
11. Open `/profile` and complete remaining PRANASAKHA-specific fields.
12. Save and reload the profile to confirm persistence.

---

## 16.3 Microsoft signup/sign-in

1. Open Sign In or Sign Up.
2. Click **Continue with Microsoft**.
3. Authenticate.
4. Microsoft redirects to:

```text
/api/auth/microsoft/callback
```

5. The backend creates or finds the PRANASAKHA account.
6. Microsoft identity/name/photo information is associated with the account.
7. The normal PRANASAKHA JWT session is issued.
8. The correct dashboard opens.
9. The profile/avatar appears.
10. Complete any PRANASAKHA-specific profile information on `/profile`.

---

# 17. PROFILE BEHAVIOR

The intended profile flow is:

```text
Google/Microsoft
      ↓
Provider identity
      ↓
Name + email + profile information
      ↓
PRANASAKHA account
      ↓
Profile completion
      ↓
Dashboard
```

The provider should supply the information already known to the identity provider.

PRANASAKHA-specific information remains editable from `/profile`.

A returning user should map back to the same account instead of creating a duplicate account for the same provider identity.

---

# 18. PRODUCTION DEPLOYMENT

A clean production setup can use:

```text
Frontend:
https://app.example.org

API:
https://api.example.org
```

The API hostname is the one used for OAuth callback registration.

---

# 19. Production `.env`

Example:

```env
NODE_ENV=production
DATABASE_URL=postgresql://APP_USER:STRONG_PASSWORD@DB_HOST:5432/pranasakha
DATABASE_SSL=true
DB_POOL_MAX=15
JWT_SECRET=GENERATE_A_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=8h
PORT=4000
FRONTEND_ORIGIN=https://app.example.org
PUBLIC_API_ORIGIN=https://api.example.org
UPLOAD_DIR=/var/lib/pranasakha/uploads
MAX_UPLOAD_BYTES=10485760

GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://api.example.org/api/auth/google/callback

MS_CLIENT_ID=YOUR_MICROSOFT_CLIENT_ID
MS_CLIENT_SECRET=YOUR_MICROSOFT_CLIENT_SECRET_VALUE
MS_TENANT_ID=common
MS_REDIRECT_URI=https://api.example.org/api/auth/microsoft/callback
```

Generate and use a long random JWT secret.

---

# 20. Google production redirect registration

Register this exact URI in the Google OAuth client:

```text
https://api.example.org/api/auth/google/callback
```

Do not use the frontend hostname here unless the frontend itself is handling the OAuth callback.

The PRANASAKHA architecture routes OAuth through the backend.

---

# 21. Microsoft production redirect registration

Register this exact URI under the Microsoft Web platform:

```text
https://api.example.org/api/auth/microsoft/callback
```

---

# 22. HTTPS and reverse proxy

Use HTTPS in production.

A typical Nginx API proxy looks like:

```nginx
server {
    listen 443 ssl http2;
    server_name api.example.org;

    # ssl_certificate ...;
    # ssl_certificate_key ...;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Use your organization's certificate/TLS policy for the real server.

The backend must receive the original host/protocol information correctly when constructing public OAuth URLs.

---

# 23. Persistent profile/document uploads

The project uses `UPLOAD_DIR` for uploaded files.

For production, use persistent storage, for example:

```env
UPLOAD_DIR=/var/lib/pranasakha/uploads
```

Make sure the backend process has permission to write there.

Back up uploaded profile photos/documents if they are business-critical.

If the deployment is containerized, mount the upload directory as persistent storage rather than storing it only inside an ephemeral container layer.

---

# 24. Process management

Run the Node backend using your organization's approved process manager, such as systemd or another service manager.

The application server command is:

```bash
npm run server
```

Keep application logs and restart policy configured so an API process failure does not permanently take the authentication service offline.

---

# 25. Security checklist

## OAuth

- Use HTTPS in production.
- Register exact redirect URLs.
- Keep Google and Microsoft client secrets on the backend only.
- Never expose secrets through `VITE_*` variables.
- Do not accept arbitrary redirect URLs from the browser.
- Keep the provider state/nonce protections enabled.
- Validate provider identity data server-side.

## Microsoft

For production confidential-client authentication, validate Microsoft ID-token signature and claims such as issuer, audience, time validity, and nonce according to Microsoft identity-platform guidance.

Official guidance:

https://learn.microsoft.com/en-us/entra/identity-platform/id-tokens

## JWT

- Replace the example JWT secret.
- Keep the JWT secret private.
- Rotate secrets according to your security policy.

## Database

- Do not use `postgres/postgres` in production.
- Restrict PostgreSQL network access.
- Use TLS for remote/managed PostgreSQL where appropriate.
- Back up the database before migrations.
- Keep database credentials out of Git.

---

# 26. Common Google problems

## Error: `redirect_uri_mismatch`

The registered Google redirect URI does not exactly match `GOOGLE_REDIRECT_URI`.

Check:

```text
http vs https
localhost vs domain/IP
port number
/api/auth/google/callback
trailing slash
```

Google's redirect matching is exact.

---

## Google says the app is unverified or in testing

For development, configure the OAuth consent/application testing settings and add development/test users where the Google console requires them.

For production use, complete any Google verification and publishing requirements that apply to the requested scopes and application type.

---

# 27. Common Microsoft problems

## Redirect URI error

Open:

**Microsoft Entra → App registrations → your app → Authentication**

Confirm the Web redirect URI is exactly:

```text
http://localhost:4000/api/auth/microsoft/callback
```

or the exact production equivalent.

---

## `invalid_client`

Check:

```text
MS_CLIENT_ID
MS_CLIENT_SECRET
MS_TENANT_ID
```

Most importantly, make sure `MS_CLIENT_SECRET` contains the **secret Value**, not the Secret ID.

---

## Microsoft login is successful but no PRANASAKHA account appears

Check:

1. PostgreSQL is reachable.
2. `npm run db:migrate` completed.
3. The OAuth callback reaches the backend.
4. The backend logs show provider-account creation/update.
5. The same provider subject is being reused for later sign-ins.

---

# 28. Profile photo troubleshooting

If the profile photo does not appear:

Check:

- `UPLOAD_DIR`
- Upload directory permissions
- Backend/static-file routing used by the deployment
- Database profile photo path/URL
- Reverse-proxy behavior
- Whether the identity provider supplied a photo URL or only basic identity claims

A missing provider photo should not prevent the account itself from being created.

---

# 29. Database migration troubleshooting

If:

```bash
npm run db:migrate
```

fails:

1. Confirm `DATABASE_URL`.
2. Confirm PostgreSQL is running.
3. Confirm the database exists.
4. Confirm the database user has the required migration permissions.
5. Read the first failing SQL statement.
6. Check migration order.
7. Do not randomly delete migration records.
8. Restore from the pre-migration backup only after identifying the cause and deciding that a rollback is actually necessary.

---

# 30. Useful project commands

```bash
# Install dependencies
npm install

# Start local PostgreSQL
npm run db:up

# View PostgreSQL logs
npm run db:logs

# Run schema migrations
npm run db:migrate

# Start backend
npm run server

# Start frontend
npm run dev

# Build frontend
npm run build

# Lint
npm run lint

# Stop local PostgreSQL
npm run db:down
```

---

# 31. FINAL GOOGLE CHECKLIST

Before testing Google, confirm:

```text
[ ] Google Cloud project exists
[ ] OAuth/Google Auth configuration completed
[ ] App name/support information configured
[ ] Correct audience selected
[ ] openid/email/profile scopes available
[ ] Web OAuth client created
[ ] Frontend origin registered if required
[ ] Redirect URI registered
[ ] Client ID copied
[ ] Client Secret copied
[ ] `.env` updated
[ ] Backend restarted after `.env` change
```

Local callback:

```text
http://localhost:4000/api/auth/google/callback
```

---

# 32. FINAL MICROSOFT CHECKLIST

Before testing Microsoft, confirm:

```text
[ ] Microsoft Entra app registration created
[ ] Correct supported account type selected
[ ] Application (client) ID copied
[ ] Tenant ID determined
[ ] Web platform configured
[ ] Redirect URI registered
[ ] Client secret created
[ ] Secret VALUE copied
[ ] `.env` updated
[ ] Backend restarted after `.env` change
```

Local callback:

```text
http://localhost:4000/api/auth/microsoft/callback
```

---

# 33. FINAL DATABASE CHECKLIST

Before testing social login against the database:

```text
[ ] PostgreSQL running
[ ] DATABASE_URL correct
[ ] npm install completed
[ ] npm run db:migrate completed
[ ] `_migrations` table present
[ ] Existing migrations applied
[ ] social auth/profile migration applied
[ ] Upload directory exists
[ ] Backend can connect to PostgreSQL
```

---

# 34. FINAL END-TO-END CHECKLIST

The complete desired flow is:

```text
Landing Page
    ↓
Sign In / Sign Up
    ↓
Email OR Google OR Microsoft
    ↓
Backend authentication
    ↓
Create/find PRANASAKHA user
    ↓
Save provider identity + name/email/profile data
    ↓
Create normal PRANASAKHA session
    ↓
Correct role dashboard
    ↓
Profile picture visible
    ↓
/profile
    ↓
Complete / edit remaining details
    ↓
Save to backend
    ↓
Changes persist everywhere
```

Test every role-specific dashboard after authentication to ensure the existing application functionality remains intact.

---

# 35. Official documentation

Google OAuth 2.0 for Web Server Applications:

https://developers.google.com/identity/protocols/oauth2/web-server

Google OpenID Connect:

https://developers.google.com/identity/openid-connect/openid-connect

Google OpenID Connect reference:

https://developers.google.com/identity/openid-connect/reference

Microsoft identity platform:

https://learn.microsoft.com/en-us/entra/identity-platform/

Microsoft app registration:

https://learn.microsoft.com/en-us/graph/auth-register-app-v2

Microsoft redirect URI configuration:

https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri

Microsoft authorization code flow:

https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow

Microsoft ID tokens:

https://learn.microsoft.com/en-us/entra/identity-platform/id-tokens

---

# 36. RECOMMENDED PRODUCTION ORDER

Use this sequence for a new deployment:

```text
1. Provision PostgreSQL
2. Establish database backup/restore procedure
3. Deploy application files
4. Create production `.env`
5. Create/register Google OAuth client
6. Create/register Microsoft Entra application
7. Add exact production callback URLs
8. Add OAuth client IDs/secrets to the backend `.env`
9. Run `npm install`
10. Run `npm run db:migrate`
11. Configure persistent `UPLOAD_DIR`
12. Build the frontend with `npm run build`
13. Start the backend
14. Serve the frontend
15. Configure HTTPS/reverse proxy
16. Test email signup/sign-in
17. Test Google sign-in/sign-up
18. Test Microsoft sign-in/sign-up
19. Test profile photo and profile editing
20. Test role dashboards
21. Confirm logs/monitoring
22. Confirm database and upload backups
```

---

# 37. IMPORTANT SECRET-HANDLING RULE

Never paste real values for these into documentation, source control, screenshots, or chat messages:

```text
GOOGLE_CLIENT_SECRET
MS_CLIENT_SECRET
JWT_SECRET
DATABASE_URL password
```

Store them securely in the backend deployment environment or an approved secrets manager.

Client IDs and redirect URIs are configuration values; secrets are private credentials.

---

# 38. Quick reference — values you ultimately need

Google:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
```

Microsoft:

```env
MS_CLIENT_ID=...
MS_CLIENT_SECRET=...
MS_TENANT_ID=common
MS_REDIRECT_URI=...
```

Database:

```env
DATABASE_URL=...
DATABASE_SSL=...
```

Application:

```env
JWT_SECRET=...
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
PUBLIC_API_ORIGIN=http://localhost:4000
UPLOAD_DIR=uploads
```

---

# 39. The simplest local setup

If you are setting up PRANASAKHA locally for the first time, the shortest sequence is:

```bash
npm install
npm run db:up
npm run db:migrate
npm run server
```

In another terminal:

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

Configure these two provider callbacks:

```text
Google:
http://localhost:4000/api/auth/google/callback

Microsoft:
http://localhost:4000/api/auth/microsoft/callback
```

Put the resulting provider credentials into the backend `.env`, restart the backend, and test the Google and Microsoft buttons from the Sign In/Sign Up screens.

## OAuth TLS / enterprise certificate troubleshooting

If Google or Microsoft login reaches the provider but the server returns an error such as `unable to verify the first certificate`, the computer or network may be using an enterprise HTTPS inspection certificate. The application keeps normal TLS certificate verification enabled; it does not use `NODE_TLS_REJECT_UNAUTHORIZED=0`.

### Windows / local development

Use a recent Node.js release. Node.js documents `--use-system-ca` for adding the operating-system trust store to the normal bundled CA set, and recent Node releases also expose the system CA certificates to applications. The PRANASAKHA OAuth client also reads the Windows Current User and Local Machine Root stores directly when needed, so you normally do **not** need to disable TLS verification. citeturn911022search0turn911022search1

If the enterprise root is installed in Windows, restart the backend after the certificate is installed and try Google/Microsoft sign-in again.

### Custom CA file

If your organization's root certificate is supplied as a PEM file, put the path in `.env`:

```env
OAUTH_CA_FILE=C:\certs\company-root.pem
```

Or on Linux/macOS:

```env
OAUTH_CA_FILE=/etc/ssl/private/company-root.pem
```

Restart the backend after changing the variable because the CA bundle is loaded at startup. `NODE_EXTRA_CA_CERTS` is another standard Node.js mechanism for adding PEM roots, and it is also read only when Node starts. citeturn911022search0

### What not to do

Do not set:

```text
NODE_TLS_REJECT_UNAUTHORIZED=0
```

and do not change OAuth HTTPS requests to `rejectUnauthorized: false`. That would disable certificate verification and is not an appropriate fix for production authentication.

### Verify your Node version

```bash
node -v
```

For current Node releases, the supported system trust-store flag is:

```bash
node --use-system-ca server/index.js
```

On Windows PowerShell:

```powershell
$env:NODE_OPTIONS="--use-system-ca"
node server/index.js
```

The project-side CA handling means the normal `npm run server` / `node server/index.js` path can continue to be used when the enterprise root is present in the Windows certificate stores.

## Latest authentication/profile migration

The current project includes `server/migrations/006_provider_profile_details.sql`. Run the normal migration command after upgrading the application:

```bash
npm run db:migrate
```

This adds `users.provider_profile` (JSONB) for the non-secret provider profile claims returned by Google or Microsoft. Access tokens and client secrets are never stored in this column. Existing migrations remain unchanged and the migration runner applies `006` only once.

After migration, restart the backend so the latest authentication/profile code is loaded.
