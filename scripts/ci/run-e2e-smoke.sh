#!/usr/bin/env bash
# Story 9.5 — Orchestrates the Maestro E2E smoke suite.
# Prerequisites (already established by the CI job before calling this script):
#   - Android emulator booted and visible via `adb devices`
#   - Docker available (for supabase start)
#   - pnpm workspace deps installed (pnpm install --frozen-lockfile)
#   - EAS CLI installed (npm install -g eas-cli)
#   - Maestro CLI installed (curl -Ls "https://get.maestro.mobile.dev" | bash)
#
# Environment variables (all env-overridable; CI sets them from `supabase start` output):
#   SUPABASE_URL          — defaults to http://127.0.0.1:54321
#   SUPABASE_SERVICE_ROLE_KEY — required for Admin API calls (seedAuthUser.js, seedPendingLadderItem.js)
#   MAILPIT_URL           — defaults to http://127.0.0.1:54324 (sourced from supabase status -o env)
#   APK_OUTPUT_PATH       — where eas build --local writes the APK
#   ARTIFACT_DIR          — where Maestro writes screenshots/recordings on failure
#   APP_PACKAGE           — Android package name; defaults to com.exposurebuddy.app
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
APK_OUTPUT_PATH="${APK_OUTPUT_PATH:-/tmp/exposure-buddy-e2e.apk}"
ARTIFACT_DIR="${ARTIFACT_DIR:-/tmp/maestro-artifacts}"
APP_PACKAGE="${APP_PACKAGE:-com.exposurebuddy.app}"

mkdir -p "$ARTIFACT_DIR"

echo "==> [1/5] Starting local Supabase..."
supabase start

echo "==> [2/5] Reading Supabase service-role key and Mailpit URL from supabase status..."
# supabase status -o env exports KEY=VALUE pairs but may also emit "Stopped services: [...]"
# notices to stdout. Filter to lines matching KEY=VALUE to avoid eval errors.
eval "$(supabase status -o env 2>/dev/null | grep -E '^[A-Z_][A-Z0-9_]*=')"
# supabase status -o env uses un-prefixed names (SERVICE_ROLE_KEY, API_URL) in some CLI
# versions. Map to the SUPABASE_* names the rest of the script expects.
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SERVICE_ROLE_KEY:-}}"
SUPABASE_URL="${SUPABASE_URL:-${API_URL:-http://127.0.0.1:54321}}"
# MAILPIT_URL is also exported by recent Supabase CLI versions.
# If MAILPIT_URL is not exported, fall back to the default port from supabase/config.toml.
MAILPIT_URL="${MAILPIT_URL:-http://127.0.0.1:54324}"
export SUPABASE_SERVICE_ROLE_KEY SUPABASE_URL MAILPIT_URL

echo "    Supabase URL:      $SUPABASE_URL"
echo "    Mailpit URL:       $MAILPIT_URL"
echo "    Service role key:  ${SUPABASE_SERVICE_ROLE_KEY:0:16}... (truncated for log safety)"

echo "==> [3/5] Building dev-client APK (expo prebuild + Gradle)..."
# eas build --local requires EAS authentication even for local runs. Use expo prebuild +
# Gradle directly instead, setting the e2e env vars that eas.json would normally supply.
# EXPO_PUBLIC_SUPABASE_URL uses 10.0.2.2 — the Android emulator's alias for host localhost.
(
  cd "$REPO_ROOT/apps/mobile"
  APP_VARIANT="development" \
  EXPO_PUBLIC_APP_VARIANT="development" \
  EXPO_PUBLIC_SUPABASE_URL="http://10.0.2.2:54321" \
  EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  pnpm exec expo prebuild --platform android --clean
  cd "$REPO_ROOT/apps/mobile/android"
  APP_VARIANT="development" \
  EXPO_PUBLIC_APP_VARIANT="development" \
  EXPO_PUBLIC_SUPABASE_URL="http://10.0.2.2:54321" \
  EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  ./gradlew assembleDebug
  cp app/build/outputs/apk/debug/app-debug.apk "$APK_OUTPUT_PATH"
)
if [[ ! -f "$APK_OUTPUT_PATH" ]]; then
  echo "ERROR: APK not found at $APK_OUTPUT_PATH — build step failed to produce output"
  exit 1
fi
echo "    APK: $APK_OUTPUT_PATH ($(du -sh "$APK_OUTPUT_PATH" | cut -f1))"

echo "==> [4/5] Installing APK on running emulator..."
adb install -r "$APK_OUTPUT_PATH"

echo "==> [5/5] Running Maestro smoke suite (5 flows, explicit order)..."
# Explicit file list — Maestro's directory-scan order is non-deterministic by design.
# Each flow is independently self-contained (runnable on a reset state per AC2), so
# this order is for readability only; correctness does not depend on it.
export SUPABASE_URL MAILPIT_URL SUPABASE_SERVICE_ROLE_KEY APP_PACKAGE
~/.maestro/bin/maestro test \
  apps/mobile/.maestro/onboarding.yaml \
  apps/mobile/.maestro/ladder-build.yaml \
  apps/mobile/.maestro/exposure-loop.yaml \
  apps/mobile/.maestro/debrief.yaml \
  apps/mobile/.maestro/backgrounded-recovery.yaml \
  --output "$ARTIFACT_DIR" \
  --env SUPABASE_URL="$SUPABASE_URL" \
  --env MAILPIT_URL="$MAILPIT_URL" \
  --env SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  --env APP_PACKAGE="$APP_PACKAGE"

echo "==> Maestro smoke suite complete. Artifacts at: $ARTIFACT_DIR"
