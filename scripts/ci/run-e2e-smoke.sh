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
eval "$(supabase status -o env)"
# supabase status -o env exports: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
# POSTGRES_URL, etc. MAILPIT_URL is also exported by recent Supabase CLI versions.
# If MAILPIT_URL is not exported, fall back to the default port from supabase/config.toml.
MAILPIT_URL="${MAILPIT_URL:-http://127.0.0.1:54324}"
export SUPABASE_SERVICE_ROLE_KEY
export MAILPIT_URL

echo "    Supabase URL:      $SUPABASE_URL"
echo "    Mailpit URL:       $MAILPIT_URL"
echo "    Service role key:  ${SUPABASE_SERVICE_ROLE_KEY:0:16}... (truncated for log safety)"

echo "==> [3/5] Building dev-client APK (eas build --local, e2e profile)..."
# The e2e profile in apps/mobile/eas.json extends 'development' and points at
# http://10.0.2.2:54321 (the Android emulator's alias for the host machine's localhost).
# Fall back to expo prebuild + Gradle if eas build --local is not available on this runner
# (Task 1.2 pre-authorized fallback).
(
  cd apps/mobile
  eas build --profile e2e --platform android --local --non-interactive \
    --output "$APK_OUTPUT_PATH" || {
    echo "::warning::eas build --local failed — falling back to expo prebuild + Gradle"
    cd "$REPO_ROOT"
    pnpm exec expo prebuild --platform android --clean
    cd "$REPO_ROOT/apps/mobile/android"
    ./gradlew assembleDebug
    cp app/build/outputs/apk/debug/app-debug.apk "$APK_OUTPUT_PATH"
  }
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
