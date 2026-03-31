# 🗝️ KeyStone — Personal Knowledge Vault

A private, database-backed knowledge management system. Think of it as a self-hosted, encrypted Evernote — for notes (Markdown), bookmarks (URLs), and secrets (AES-256).

## Features

- 📁 **Hierarchical folders** — nested notebooks, just like Evernote
- 📝 **Markdown notes** — full rendered preview
- 🔗 **Link bookmarks** — save and categorize URLs
- 🔐 **Encrypted secrets** — AES-256-GCM, decrypted only on click
- 🏷️ **Tags** — colour-coded, multi-entry
- ⚡ **Lazy loading** — entry content is only fetched when you click an entry
- 🔑 **API-key auth** — single-user, zero user management overhead
- 🐳 **Docker-ready** — spin up everything with one command

---

## Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/venkateshmareddy/keyStone.git
cd keyStone

# 2. Create and configure your environment
cp .env.example .env
# Open .env and set API_KEY and ENCRYPTION_KEY (see below)

# 3. Start everything
docker compose up --build
```

Open **http://localhost:3000** in your browser and enter your `API_KEY`.

---

## Environment Variables

| Variable            | Description                                                                 | Required |
|---------------------|-----------------------------------------------------------------------------|----------|
| `API_KEY`           | Your secret access key. Set a long random string.                          | ✅        |
| `ENCRYPTION_KEY`    | 64-char hex string (32 bytes) used for AES-256 secret encryption.          | ✅        |
| `POSTGRES_PASSWORD` | PostgreSQL password.                                                        | ✅        |
| `POSTGRES_DB`       | Database name. Default: `keystone`                                         |          |
| `POSTGRES_USER`     | Database user. Default: `keystone`                                         |          |
| `ALLOWED_ORIGINS`   | Comma-separated CORS origins. Default: `http://localhost:3000`             |          |

**Generate values:**
```bash
# API_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY (must be exactly 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Local Development (without Docker)

```bash
# Setup dependencies
bash scripts/setup.sh

# Start PostgreSQL only
docker compose up db

# Terminal 2 — run migrations (+ optional seed data)
cd src/server && node scripts/migrate.js --seed

# Terminal 3 — API server (hot reload)
cd src/server && npm run dev

# Terminal 4 — frontend dev server (with API proxy)
cd src/client && npm run dev
```

Frontend: http://localhost:3000  
API:      http://localhost:3001

---

## Repository Structure

```
keyStone/
├── src/
│   ├── server/                  # Node.js / Express API
│   │   ├── index.js             # App entry point
│   │   ├── config/database.js   # PostgreSQL connection pool
│   │   ├── middleware/auth.js   # API-key authentication
│   │   ├── routes/
│   │   │   ├── auth.js          # Key validation
│   │   │   ├── folders.js       # Folder CRUD + tree
│   │   │   ├── entries.js       # Entry CRUD + retrieve-on-click
│   │   │   └── tags.js          # Tag CRUD
│   │   ├── services/
│   │   │   └── encryption.js    # AES-256-GCM encrypt/decrypt
│   │   ├── scripts/migrate.js   # Migration runner
│   │   ├── Dockerfile
│   │   └── package.json
│   └── client/                  # React + Vite frontend
│       ├── src/
│       │   ├── App.jsx
│       │   ├── components/
│       │   │   ├── Sidebar.jsx       # Folder tree navigation
│       │   │   ├── EntryList.jsx     # Lazy entry list
│       │   │   ├── EntryViewer.jsx   # Full entry view
│       │   │   ├── EntryEditor.jsx   # Create / edit form
│       │   │   └── LoginScreen.jsx   # API key login
│       │   ├── services/api.js       # Fetch wrapper
│       │   └── styles/index.css
│       ├── Dockerfile
│       ├── nginx.conf
│       └── package.json
├── db/
│   └── migrations/
│       ├── 001_initial_schema.sql   # Tables, indexes, triggers
│       └── 002_seed_data.sql        # Demo data (optional)
├── docs/
│   └── API.md                       # Full API reference
├── scripts/
│   └── setup.sh                     # One-time local setup
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Database Schema

```
folders          entries          tags            entry_tags
────────         ────────         ────────        ──────────
id (PK)          id (PK)          id (PK)         entry_id (FK)
name             title            name            tag_id   (FK)
parent_id (FK→)  type (enum)      color
icon             content          created_at
sort_order       url
created_at       encrypted_content
updated_at       folder_id (FK→folders)
                 is_pinned
                 sort_order
                 created_at
                 updated_at
```

---

## Security

- **Auth**: Every API request requires `Authorization: Bearer <API_KEY>` (compared with `crypto.timingSafeEqual`).
- **Secrets**: Encrypted with **AES-256-GCM** before storage. The raw key never leaves the server. Decryption happens server-side only when you click a secret entry, and the plaintext is sent only over your secured connection.
- **Rate limiting**: 500 requests / 15 min per IP on all `/api/*` routes.
- **Helmet**: Standard HTTP security headers on all responses.

---

## API

See [docs/API.md](docs/API.md) for the full API reference.

Key patterns:
- `GET /api/folders/tree` — returns the full folder hierarchy (no entry content)
- `GET /api/entries/folder/:id` — lazy-loads entry *titles* for a folder
- `GET /api/entries/:id` — **"retrieve on click"** — full content + decrypted secret
