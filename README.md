# PRANASAKHA — Volunteer Healthcare Coordination Platform

PRANASAKHA coordinates international healthcare volunteers across the Sri Sathya Sai medical institutions network. This version keeps the feature-module backend pattern while replacing Excel runtime storage with PostgreSQL and adding hardened authentication, file storage, notifications, document-review threads, and role-scoped dashboards.

## Architecture

```text
React / TanStack Router
        │
        │ Bearer JWT
        ▼
server/index.js
        │  thin Express routes
        ▼
Feature modules
 auth.js · doctors.js · accommodation.js · mandir.js · travel.js
 notifications.js · reviews.js
        │                 │
        ▼                 ▼
 server/db.js       server/storage/upload.js
        │                 │
        ▼                 ▼
 PostgreSQL          uploads/ (future S3/R2)
```

### Design rules

- One backend feature file per business domain.
- Express route handlers contain routing/authorization glue, not domain rules.
- Features access storage only through `server/db.js`.
- Files are received only through `server/storage/upload.js`.
- Notifications are centralized in `server/notifications.js` so any feature can create an in-app event and optionally trigger email.
- Review conversations are isolated in `server/reviews.js` and connect documents + notifications.
- Approval state is enforced server-side; the frontend never gets to decide whether a doctor is approved.

## Directory tree

```text
project/
├── README.md
├── .env.example
├── docker-compose.yml
├── package.json
├── bun.lock
├── vite.config.js
├── eslint.config.js
├── jsconfig.json
├── components.json
│
├── data/
│   └── database.xlsx                 # legacy prototype data; migration source only
│
├── public/
│   ├── brand/
│   ├── images/
│   ├── videos/
│   └── robots.txt
│
├── uploads/
│   └── .gitkeep                       # runtime private document storage
│
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── RoleDashboardShell.jsx
│   │   │   ├── RoleDashboardShell.css
│   │   │   ├── DashboardTopBar.jsx
│   │   │   ├── DashboardTopBar.css
│   │   │   ├── StatCard.jsx
│   │   │   ├── StatCard.css
│   │   │   ├── StatusBadge.jsx
│   │   │   └── StatusBadge.css
│   │   └── ui/                        # reusable UI primitives
│   │
│   ├── lib/
│   │   ├── api.js                    # central frontend API client
│   │   ├── auth.js                   # JWT/session helpers + role home map
│   │   └── ...
│   │
│   └── routes/
│       ├── signin.jsx
│       ├── signup.jsx
│       └── dashboard/
│           ├── _layout.jsx           # role routing guard
│           ├── doctor.jsx
│           ├── doctor.css
│           ├── directorate.jsx
│           ├── directorate.css
│           ├── hod.jsx
│           ├── hod.css
│           └── ...                   # existing operational dashboards
│
└── server/
    ├── index.js                      # Express composition + route definitions
    ├── db.js                         # PostgreSQL pool, transactions, compatibility read/write
    ├── migrate.js                    # SQL migration runner
    ├── migrateExcel.js               # one-time Excel → PostgreSQL importer
    ├── migrations/
    │   ├── 001_initial.sql            # base schema + indexes + relationships
    │   └── 002_uuid_compatibility.sql # repairs older local TEXT identifier columns
    ├── storage/
    │   └── upload.js                 # Multer, safe filenames and private storage path
    ├── access.js                     # JWT verification + role guards
    ├── auth.js                       # signup/login/password hashing/token issuance
    ├── doctors.js                    # applications, approvals, routing, roster handoff
    ├── accommodation.js              # accommodation workflow
    ├── mandir.js                     # Darshan workflow
    ├── travel.js                     # travel / visa workflow
    ├── notifications.js              # in-app notifications + optional email hook
    ├── reviews.js                    # document review threads
    └── seedExtraDoctors.js            # optional demo data
```

## Core doctor lifecycle

```text
Doctor signs up
      ↓
Application = pending
      ↓
Director / Joint Director sees application
      ↓
┌──────────────┬────────────────┬───────────────────────┐
│ Approve      │ Request info   │ Decline               │
│ + department │ → doctor       │ → doctor              │
└──────┬───────┴────────────────┴───────────────────────┘
       ↓
Approved + department_route
       ↓
Matching HoD sees doctor only
       ↓
HoD publishes duty
       ↓
Doctor sees duty on dashboard
```

The key business rule is enforced by PostgreSQL-backed backend queries: the HoD roster endpoint returns approved doctors whose `department_route` matches that HoD's department.

## Dashboard roles

### Doctor

The Doctor dashboard provides:

- application journey: submitted → Directorate review → approved/routed → roster
- editable registration profile
- credentials/supporting document upload
- document status visibility
- roster and duty schedule
- accommodation status
- Darshan status
- travel/visit information
- digital medical pass placeholder
- Directorate notes and notifications

### Director / Joint Director

The Directorate dashboard provides:

- searchable/filterable application queue
- total/pending/information-needed/approved statistics
- complete applicant profile drawer
- department routing
- approve + route
- request information
- decline
- review notes and audit history
- applicant document list
- document review-thread creation
- department pipeline analytics
- CSV export

### HoD

The HoD dashboard provides:

- department-scoped approved specialist list
- specialist search
- full specialist detail drawer
- roster creation
- roster coverage statistics
- live published roster
- CSV export

## Database

Excel is no longer the runtime datastore. PostgreSQL now supplies:

- foreign keys between users, profiles, doctor applications and operational records
- concurrent-safe transactions
- searchable/indexed status and department queries
- audit records
- notification records
- document metadata
- review threads and messages

`server/db.js` is the only database gateway. The old `read()` / `write()` helpers remain as compatibility utilities, but business features use parameterised SQL and transactions for concurrency safety.

### PostgreSQL tables

```text
users
profiles
 doctors
roster
accommodation
darshan
travel
audit
notifications
documents
review_threads
review_messages
```

### Local PostgreSQL

A Docker setup is included:

```bash
npm install
cp .env.example .env
# edit JWT_SECRET if this is not just a local demo
npm run db:up
npm run db:migrate
npm run server
```

PostgreSQL defaults in `docker-compose.yml`:

```text
database: pranasakha
user:     postgres
password: postgres
host:     localhost
port:     5432
```

## Excel migration

The original workbook remains under `data/database.xlsx` only as a migration source.

After PostgreSQL is running and migrations are applied:

```bash
node server/migrateExcel.js
```

The importer maps existing sheets into the new PostgreSQL tables. New tables such as `documents`, `review_threads`, and `notifications` start empty and are populated by the live system.

## Authentication and authorization

Public signup is restricted to **Doctor** accounts. A visitor cannot self-register as Director, HoD or Admin.

Privileged/internal accounts are created via:

```text
POST /api/users/provision
```

This endpoint requires an authenticated Admin JWT.

Login returns a signed JWT containing the user identity and role. `src/lib/api.js` automatically sends:

```text
Authorization: Bearer <token>
```

`server/access.js` verifies the token and loads the current user from PostgreSQL before protected routes execute.

This removes the previous pattern where a frontend-supplied user ID was treated as proof of identity.

## File storage

`server/storage/upload.js` is the single upload layer.

Current allowed types:

```text
PDF
JPG / JPEG
PNG
WEBP
```

Default maximum size: **10 MB**.

Files receive server-generated UUID filenames. The database stores metadata and a private API URL. Files are **not** exposed through public static hosting; `/api/files/:id` authenticates the caller before streaming the file.

The storage implementation is intentionally isolated so it can later be swapped with S3, Cloudflare R2 or another object store without changing feature modules.

## Notifications

`server/notifications.js` is the cross-cutting event layer.

Current events include:

```text
Doctor approved / info requested / declined
Roster duty published
Accommodation confirmed
Darshan pass issued
Travel support letter generated
Document review started
Review reply added
Review thread resolved
```

Every notification contains a recipient, message, timestamp and read state. Optional email delivery is triggered from this same layer when configured.

## Document review threads

The review subsystem connects uploaded documents to a conversation:

```text
Document
   │
   ▼
Review thread
   ├── reviewer message
   ├── doctor reply
   ├── reviewer reply
   └── open / resolved
```

Doctor, Director and HoD access is checked server-side. Review messages generate notifications so the next participant knows action is required.

## API map

```text
PUBLIC
POST /api/signup
POST /api/login
GET  /api/health

CURRENT USER
GET  /api/me

ADMIN PROVISIONING
POST /api/users/provision

DOCTORS
GET  /api/doctors
GET  /api/doctors/me/:user_id
POST /api/doctors/:id/status
PUT  /api/doctors/me/:user_id/profile
GET  /api/doctors/department/:dept

ROSTER
POST /api/roster
GET  /api/roster/me/:user_id
GET  /api/roster/department/:dept

ACCOMMODATION
POST /api/accommodation/request
GET  /api/accommodation
POST /api/accommodation/:id/confirm
GET  /api/accommodation/me/:user_id

DARSHAN
POST /api/darshan/request
GET  /api/darshan
POST /api/darshan/:id/issue
GET  /api/darshan/me/:user_id

TRAVEL
GET  /api/travel
POST /api/travel/:user_id/generate-letter
GET  /api/travel/me/:user_id

NOTIFICATIONS
GET  /api/notifications
POST /api/notifications/:id/read

FILES / DOCUMENTS
POST /api/uploads
GET  /api/files/:id
GET  /api/doctors/:user_id/documents

REVIEW THREADS
GET  /api/reviews
GET  /api/reviews/:id
POST /api/reviews
POST /api/reviews/:id/messages
POST /api/reviews/:id/resolve
```

## Frontend ↔ backend connections

```text
src/lib/api.js
  │
  ├── Sign in / signup
  ├── Doctor dashboard
  │    ├── application
  │    ├── profile
  │    ├── documents
  │    ├── roster
  │    └── visit essentials
  │
  ├── Directorate dashboard
  │    ├── application queue
  │    ├── applicant details
  │    ├── approval / routing
  │    └── document review
  │
  └── HoD dashboard
       ├── approved specialists
       └── roster publishing
```

The other existing operational dashboards continue using the same central API client and backend feature modules.

## Environment

Copy `.env.example` to `.env`:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pranasakha
DATABASE_SSL=false
DB_POOL_MAX=15
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=8h
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
UPLOAD_DIR=uploads
MAX_UPLOAD_BYTES=10485760

# Optional email integration
RESEND_API_KEY=
EMAIL_FROM=PRANASAKHA <noreply@example.org>
NOTIFICATION_EMAIL_LOOKUP_URL=
```

## Useful commands

```bash
npm run dev             # Vite/TanStack frontend
npm run server          # Express API
npm run build           # production frontend build
npm run lint            # ESLint
npm run db:up           # start PostgreSQL container
npm run db:down         # stop PostgreSQL container
npm run db:migrate      # apply SQL migrations
npm run seed:server     # create demo internal accounts
npm run seed:extra      # add extra demo doctors/HoDs
node server/migrateExcel.js  # migrate legacy workbook
```

## Demo accounts

`npm run seed:server` creates accounts using password `Demo@1234`:

```text
doctor@pranasakha.test
director@pranasakha.test
hod@pranasakha.test
accommodation@pranasakha.test
mandir@pranasakha.test
travel@pranasakha.test
it@pranasakha.test
admin@pranasakha.test
```

## Why this is a better production direction

The architecture now separates the concerns that become important when the project moves from a prototype to a hospital-reviewed system:

- PostgreSQL handles relationships and concurrent writes instead of a workbook.
- JWT middleware verifies identity before sensitive actions.
- Role checks are enforced on the server.
- Uploaded medical/professional documents are protected behind authenticated access.
- Notifications have one reusable event path.
- Approval decisions and review actions can be audited.
- Document conversations are preserved as threads instead of disappearing into ad-hoc notes.
- Feature modules remain small, so Accommodation, Mandir, Travel or future modules do not need to be rewritten around a giant controller.

## Next recommended modules

The architecture is ready for several high-value additions: hospital-level routing, shift-conflict detection, document verification states, refresh-token/session revocation, structured request validation, rate limiting, S3/R2 object storage, background email queues, full audit export, calendar integration, multilingual notification templates, and a dedicated hospital-IT administration area.

## Current verification status

All server-side JavaScript files were syntax-checked after the architectural rewrite. A complete dependency install/Vite build could not be completed in this environment because package installation timed out; the project therefore ships with the updated `package.json` and setup instructions so dependencies can be installed in a normal development environment.


## Dashboard experience

The Doctor, Directorate and HoD dashboards use a shared Material 3-inspired application shell:

- pinned left navigation with a clear active state and role/account context
- sticky top bar with global search, notifications and profile menu
- responsive mobile navigation and drawer-based detail views
- larger touch targets, consistent spacing, softer surfaces and restrained elevation
- Overview behaves as the executive view: it presents the full workspace; selecting another navigation tab isolates that section
- Director applications open in an authorised review drawer with complete applicant information, documents, decision controls and mandatory reasoning for declines / information requests
- Doctor profiles are deliberately privacy-aware: before approval the read-only dashboard shows only a safe overview; sensitive credentials become visible after approval while Edit profile remains available
- Doctor Edit profile uses the same grouped structure as the registration flow (Identity & Contact, Professional Credentials, Service Preferences, Visit & Logistics)
- HoD workspaces show only approved doctors routed to the HoD's department, with a dedicated specialist directory and roster publishing workflow

## Local database compatibility

Older local versions of PRANASAKHA may have stored UUID-looking identifiers as PostgreSQL `TEXT`. This causes errors such as:

```text
operator does not exist: text = uuid
```

Migration `002_uuid_compatibility.sql` converts the affected identifier columns to `UUID`. The API startup now runs the migration runner before listening on port 4000, so a correctly configured local database is repaired automatically on restart. You can also run it explicitly with:

```bash
npm run db:migrate
```

## File access

Uploaded credentials are stored privately under `uploads/` with generated filenames. They are not exposed using a public static directory. The browser receives an authenticated API URL and the server verifies the requesting user's relationship to the doctor before streaming the file.


## Google and Microsoft authentication

The app now supports server-side OAuth authorization-code sign-in/sign-up for Google and Microsoft. Register redirect URIs matching your environment and populate the OAuth variables in `.env`. Google uses `http://<API_HOST>/api/auth/google/callback`; Microsoft uses `http://<API_HOST>/api/auth/microsoft/callback`. Existing password accounts continue to use the same JWT/session path. Social accounts are created as volunteer doctor accounts with the provider name/email/photo prefilled and can be completed from `/profile`.

Required variables: `PUBLIC_API_ORIGIN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID`, `MS_REDIRECT_URI`.

## Lifetime QR identity

PRANASAKHA now issues approved healthcare volunteers an opaque, random lifetime QR token. The QR itself contains no profile or medical information. Checkpoint permissions are enforced by the backend through the pass-resolution API. See `PRANASAKHA_AUTH_DB_SETUP_GUIDE.md` for database/API setup and `mobile/README.md` for the Expo scanner/virtual-ID app.

## Cloudflare production deployment

For the Cloudflare Pages + Cloudflare Tunnel architecture, see `CLOUDFLARE_DEPLOYMENT.md`. Use `.env.production.example` as the Windows backend environment template and keep the real `.env` out of Git.
