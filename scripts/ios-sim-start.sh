#!/usr/bin/env bash
# Dev startup: checks local Supabase, then starts Metro + iOS simulator.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Check Supabase without aborting — auth/sync won't work without it but Metro still starts.
if ! supabase status --workdir "$ROOT" > /dev/null 2>&1; then
  echo "Warning: local Supabase is not running."
  echo "  Start it first: supabase start"
  echo "  Auth and sync features will not work until it is up."
  echo ""
fi

# Clear any stale Metro process on the default port so expo start is non-interactive.
# lsof may return multiple pids; pipe through xargs so each is killed individually.
if lsof -ti :8081 2>/dev/null | grep -q .; then
  echo "Stopping stale Metro process on port 8081..."
  lsof -ti :8081 2>/dev/null | xargs kill 2>/dev/null || true
  sleep 2
fi

exec pnpm --filter exposure-buddy-mobile exec expo start --ios
