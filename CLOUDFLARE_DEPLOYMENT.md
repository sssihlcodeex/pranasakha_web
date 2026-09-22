# PRANASAKHA Cloudflare Deployment

Target architecture:

Internet -> Cloudflare
- `pranasakha.codeex.space` -> Cloudflare Pages -> Vite frontend
- `api.pranasakha.codeex.space` -> Cloudflare Tunnel -> Windows `localhost:4000` -> Node.js -> PostgreSQL `localhost:5432`

PostgreSQL is intentionally bound to Windows localhost only. Do not publish port 5432 through Cloudflare, a router, or the public Internet.

## Cloudflare Pages environment variable

Set this variable for the production build:

```text
VITE_API_BASE_URL=https://api.pranasakha.codeex.space/api
```

## Windows backend `.env`

Copy `.env.production.example` to `.env` on the Windows server and fill in the secrets. Important production values are:

```text
NODE_ENV=production
PORT=4000
FRONTEND_ORIGIN=https://pranasakha.codeex.space
PUBLIC_API_ORIGIN=https://api.pranasakha.codeex.space
PUBLIC_WEB_ORIGIN=https://pranasakha.codeex.space
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pranasakha
GOOGLE_REDIRECT_URI=https://api.pranasakha.codeex.space/api/auth/google/callback
MS_REDIRECT_URI=https://api.pranasakha.codeex.space/api/auth/microsoft/callback
```

## Before production

1. Generate a new random `JWT_SECRET`.
2. Do not commit `.env` or OAuth client secrets.
3. Because any old OAuth/JWT secrets that were previously stored outside the repository should be treated as private, rotate them if they have been exposed.
4. Configure Cloudflare Tunnel to forward only `api.pranasakha.codeex.space` to `http://localhost:4000`.
5. Keep PostgreSQL on `127.0.0.1:5432`.
