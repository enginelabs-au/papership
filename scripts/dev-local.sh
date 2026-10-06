#!/usr/bin/env bash
# Run the Papership API without Docker when Compose is unavailable.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export ENGINE_JWT_ISSUER="${ENGINE_JWT_ISSUER:-http://127.0.0.1:8000/auth/v1}"
export ENGINE_JWT_AUDIENCE="${ENGINE_JWT_AUDIENCE:-authenticated}"
export SUPABASE_JWT_SECRET="${SUPABASE_JWT_SECRET:-test-only-not-for-production-jwt-secret-0001}"
export ENGINE_TEST_HOOKS="${ENGINE_TEST_HOOKS:-1}"
export ENGINE_BILLING_CHARGES_ENABLED="${ENGINE_BILLING_CHARGES_ENABLED:-0}"
export ENGINE_USAGE_EMIT="${ENGINE_USAGE_EMIT:-0}"
export ENGINE_STORE_PATH="${ENGINE_STORE_PATH:-/tmp/papership-api-store.sqlite}"
export ENGINE_API_BASE_URL="${ENGINE_API_BASE_URL:-http://127.0.0.1:8000}"
export HERMES_API_BASE_URL="${HERMES_API_BASE_URL:-http://127.0.0.1:8642}"
export HERMES_VERSION_PIN="${HERMES_VERSION_PIN:-v0.21.1}"
export GITHUB_APP_OWNER="${GITHUB_APP_OWNER:-enginelabs-au}"
export GITHUB_APP_REPO="${GITHUB_APP_REPO:-papership}"
export ENGINE_API_CORS_ORIGINS="${ENGINE_API_CORS_ORIGINS:-http://127.0.0.1:4173,http://localhost:4173,http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:1420,http://localhost:1420,http://tauri.localhost,https://tauri.localhost,tauri://localhost,https://papership.com.au}"
PATHS_FILE="${HOME}/.config/papership/github-app.paths"
if [ ! -f "$PATHS_FILE" ]; then
  PATHS_FILE="${HOME}/.config/orgos/github-app.paths"
fi
if [ -f "$PATHS_FILE" ]; then
  set -a
  # IDs and key *path* only. Does not load client secrets.
  # shellcheck disable=SC1090
  . "$PATHS_FILE"
  set +a
fi
# OAuth client IDs, redirect URLs, and optional client secrets. Do not print this file.
CONNECTORS_FILE="${HOME}/.config/papership/connectors.env"
if [ -f "$CONNECTORS_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$CONNECTORS_FILE"
  set +a
fi
cd services/api
exec uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log --loop asyncio --http h11
