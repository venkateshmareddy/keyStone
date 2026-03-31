#!/usr/bin/env bash
# KeyStone — one-time local setup script
# Usage: bash scripts/setup.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo ""
echo "🗝️  KeyStone — Setup"
echo "───────────────────────────────────"

# 1. Create .env from example if it doesn't exist
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✓ Created .env from .env.example"
  echo ""
  echo "  ⚠️  Open .env and set your API_KEY and ENCRYPTION_KEY before proceeding."
  echo "  Generate values with:"
  echo '    node -e "console.log(require('"'"'crypto'"'"').randomBytes(32).toString('"'"'hex'"'"'))"'
  echo ""
else
  echo "✓ .env already exists"
fi

# 2. Install server dependencies
echo "→ Installing server dependencies…"
npm install --prefix src/server

# 3. Install client dependencies
echo "→ Installing client dependencies…"
npm install --prefix src/client

echo ""
echo "✓ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env and set your API_KEY and ENCRYPTION_KEY"
echo "  2. Start everything with Docker Compose:"
echo "       docker compose up --build"
echo "  OR run locally:"
echo "       # terminal 1: start PostgreSQL"
echo "       docker compose up db"
echo "       # terminal 2: run migrations"
echo "       cd src/server && node scripts/migrate.js --seed"
echo "       # terminal 3: start API"
echo "       cd src/server && npm run dev"
echo "       # terminal 4: start frontend"
echo "       cd src/client && npm run dev"
echo ""
echo "  Open: http://localhost:3000"
