# Keystone

Personal knowledge base (Evernote-style): notebooks, markdown notes, encrypted secrets, command snippets, file attachments, PostgreSQL full-text search, and JWT auth (Auth.js / NextAuth).

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn-style Radix UI, Zustand, TanStack Query  
- **Backend:** Next.js Route Handlers, Prisma, PostgreSQL  
- **Auth:** Email + password, bcrypt, JWT sessions (`AUTH_SECRET`)

## Prerequisites

- Node 20+  
- PostgreSQL 16+ (local Docker or [Aiven](https://aiven.io/postgresql))

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` — Postgres connection string  
   - `AUTH_SECRET` — `openssl rand -base64 32`  
   - `AUTH_URL` — e.g. `http://localhost:3000` for dev  
   - `SECRETS_ENCRYPTION_KEY` — **32 bytes in base64** (required for **Secret** notes):

     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```

3. **Database**

   **Option A — Docker (local Postgres)**

   ```bash
   docker compose up -d
   ```

   **Option B — Aiven**

   Paste the service connection string into `DATABASE_URL`.

4. **Schema**

   ```bash
   npx prisma migrate dev --name init
   ```

   For a quick prototype without migration history:

   ```bash
   npm run db:push
   ```

5. **Seed (optional)**

   ```bash
   npm run db:seed
   ```

   Default demo user: `demo@keystone.local` / `demo-demo` (override with `SEED_EMAIL` / `SEED_PASSWORD`).

6. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), sign up or sign in, then use `/dashboard`.

## Project layout

- `app/` — routes, API handlers (`app/api/**`)  
- `components/` — UI, dashboard panels  
- `lib/` — Prisma client, crypto, validation, search helpers  
- `prisma/` — schema, seed  
- `stores/` — Zustand (sidebar, selection, search)  
- `hooks/` — debounce  
- `types/` — shared TS types  

## Features

| Feature | Description |
|--------|-------------|
| Notebooks | Create / rename / delete categories; left sidebar |
| Notes | Markdown editor + preview; auto-save with status |
| Secrets | URL, username, password, notes — **AES-256-GCM** at rest |
| Commands | Same editor, tuned for snippets |
| Files | File-type notes + upload to `public/uploads` |
| Tags | Comma-separated; upserted via `/api/tags` |
| Search | Postgres `to_tsvector` / `websearch_to_tsquery`, optional category filter |
| Shortcuts | ⌘/Ctrl+N new note, ⌘/Ctrl+K focus search |
| Auth | Rate-limited failed logins (in-memory; use Redis in multi-instance prod) |

## Production notes

- Use a managed Postgres (e.g. Aiven) and run `prisma migrate deploy` in CI/CD.  
- Set strong `AUTH_SECRET` and rotate `SECRETS_ENCRYPTION_KEY` only with a **data re-encryption** plan (changing the key invalidates existing ciphertext).  
- For multiple app instances, replace in-memory rate limiting with a shared store (e.g. Redis).  
- Serve uploads from object storage (S3-compatible) if you outgrow local disk.  

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / run |
| `npm run db:push` | Push schema (no migration files) |
| `npm run db:migrate` | Create/apply dev migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Prisma Studio |

## License

Private / your usage — adjust as needed.
