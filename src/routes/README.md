# PRANASAKHA — प्राणसखा

A single web application connecting volunteer doctors to Sri Sathya Sai Medical
Institutions: onboarding, Directorate approval, department rosters, Ashram
logistics, Darshan passes, and travel coordination — all behind one login,
routed by role.

## Current status (as of this update)

| Layer | Status |
|---|---|
| Frontend pages (Home, Sign Up, Sign In, 8 dashboards) | ✅ Built, real Material 3 UI |
| Backend API (Express) | ✅ Working — signup, login, generic CRUD |
| Database (Excel, `data/database.xlsx`) | ✅ Working — one sheet per resource |
| Doctor → Directorate → HoD → Accommodation/Mandir/Travel pipeline | ✅ Wired end-to-end |
| Role-based routing (a role only sees its own page) | ✅ Enforced in `dashboard/_layout.tsx` |
| Buttons across all 8 dashboards | ✅ Wired to the backend (see "What's now live" below) |
| Real database (MySQL/Postgres) | ⏳ Not yet — still Excel, by design, for prototyping |
| Digital Sai Medical Pass QR generation | ⏳ Placeholder UI only, no real QR encoding yet |
| Email notifications (Section 11) | ⏳ In-app `notifications` table only, no real email sending yet |

## How the pieces fit together

```
Browser (TanStack Start, Vite)  --fetch-->  Express API (server/)  <-->  data/database.xlsx
      src/routes/dashboard/*.tsx                 server/index.ts            (one sheet per table)
      src/lib/api.ts  (fetch helpers)             server/auth.ts
      src/lib/auth.ts (who's logged in)           server/db.ts
```

**Nothing doctor-specific, roster-specific, etc. lives inside a `.tsx` file.**
Every dashboard page is just a *view* — it calls `apiList()` / `apiCreate()` /
`apiUpdate()` against `server/db.ts`, which is the single place that reads and
writes `data/database.xlsx`. That's what makes updates propagate automatically:
when a doctor signs up, one row is written to `applications`, and every page
that reads that sheet (Directorate, HoD, Travel) sees it the next time it
loads — no duplicate data entry, no hardcoded arrays to keep in sync.

### Data model (`data/database.xlsx`, one sheet per table)

| Sheet | Written by | Read by |
|---|---|---|
| `users` | Sign Up / Admin provisioning | Sign In, IT, Admin |
| `profiles` | Sign Up / Admin provisioning | Doctor, HoD (department lookup) |
| `applications` | Sign Up (auto), Directorate | Doctor, Directorate, HoD, Travel |
| `roster` | HoD | Doctor, HoD |
| `accommodation` | Doctor (request), Accommodation Office | Doctor, Accommodation Office |
| `darshan` | Doctor (request), Mandir Committee | Doctor, Mandir Committee |
| `travel` | Travel & Visa Desk | Travel & Visa Desk |
| `notifications` | Any action that should alert a doctor | Doctor (future: notification bell) |

Every row that belongs to a doctor carries their `user_id` — that's the only
link between sheets. No doctor's name/specialty/hospital is copied into more
than one sheet.

## What's now live, button by button

- **Sign Up** → creates the account (`users`+`profiles`) *and* the
  application record in one step, so the doctor instantly appears in the
  Directorate queue.
- **Sign In** → routes to the correct dashboard for the account's role, and
  the dashboard layout enforces that a signed-in user can only reach their
  own page (Admin can browse all).
- **Doctor dashboard** → "Request accommodation", "Request Darshan pass"
  write real rows; Application Status, Roster, Accommodation, and Darshan
  sections all read live data.
- **Directorate** → Approve / Request Info / Decline update the application
  and notify the doctor. Emergency broadcast sends a notification to every
  doctor.
- **HoD** → sees only approved doctors whose specialty matches their
  department; "Publish duty" writes a roster row the doctor sees immediately.
- **Accommodation Office** → "Confirm" allocates block/room and notifies the
  doctor.
- **Mandir Committee** → "Issue Pass" marks a Darshan request issued.
- **Travel & Visa Desk** → "Generate Letter" against approved doctors.
- **IT** → "Deactivate/Reactivate" toggles login access for any account.
- **Admin** → live cross-institution counters, and "Provision account"
  creates real staff logins (Director, HoD, etc.) via the same signup path.

## Running it

```bash
npm install

# one-time: create data/database.xlsx and seed 8 demo accounts
# (prints each email/password to the terminal — all passwords are Demo@1234)
npm run seed

# terminal 1 — backend API on :4000
npm run server

# terminal 2 — frontend on :3000 (or whatever Vite prints)
npm run dev
```

Open `data/database.xlsx` in Excel any time to see exactly what's stored —
it's a real, editable spreadsheet.

**Known limitation**: the Excel file is not safe for concurrent writes from
multiple people at once — treat it as single-user/dev-only. When you're
ready to move off it, the swap is: replace `server/db.ts` with a version that
talks to MySQL/Postgres using the same `db.read(sheet)` / `db.write(sheet, rows)`
interface — `server/auth.ts`, `server/index.ts`, and every frontend file stay
untouched, because none of them talk to Excel directly.

## Project structure

```
data/database.xlsx        the "database" — one sheet per table
server/db.ts               reads/writes the Excel file (the only file that touches it)
server/auth.ts              signup/login + password hashing
server/index.ts             Express app: /api/signup, /api/login, generic
                             GET/POST/PATCH /api/:resource for every other table
src/lib/api.ts               frontend fetch helpers (apiList/apiCreate/apiUpdate)
src/lib/auth.ts              getCurrentUser()/setCurrentUser(), role→dashboard map
src/routes/signup.tsx        5-step doctor onboarding form
src/routes/signin.tsx        universal sign-in, routes by role
src/routes/dashboard/_layout.tsx   enforces "one role, one page"
src/routes/dashboard/*.tsx   the 8 role dashboards (Doctor, Directorate, HoD,
                              Accommodation, Mandir, Travel, IT, Admin)
```

## Next up

- Move from Excel to Postgres/MySQL before more than one person uses it at once.
- Real QR generation + a companion scanner app for the Digital Sai Medical Pass.
- Real email delivery on top of the `notifications` table.
- Field-level AES-256 encryption for uploaded credentials/passport scans.
