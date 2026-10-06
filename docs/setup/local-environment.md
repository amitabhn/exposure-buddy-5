# Local Development Environment

Everything you need before touching a story file.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x LTS | `nvm use 20` |
| pnpm | 9.x | `npm i -g pnpm@9` |
| Supabase CLI | latest | `brew install supabase/tap/supabase` |
| Expo CLI | via project | `pnpm exec expo --version` |
| Deno | 1.x (Epic 3+) | `brew install deno` |
| Xcode (for iOS) | Swift 6.0-capable, targeting iOS 16.4+ | Required since Story 16.3 (Expo SDK 57) — the `Expo` CocoaPod itself requires this; check `node_modules/expo/Expo.podspec`'s `s.platforms`/`s.swift_version` on every SDK bump |

---

## First-time setup

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Start local Supabase stack (requires Docker)
supabase start

# 3. Verify Supabase is running
supabase status
# You need: API URL, anon key, service_role key, Studio URL
```

Copy the local values into `apps/mobile/.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
```

### PowerSync setup (optional — needed for real sync)

Without this, the app runs fine local-first (writes/reads work on-device), but nothing syncs to another device or to Supabase — `fetchCredentials()` just no-ops when the URL is unset. To get real sync:

1. Get the PowerSync instance URL. If you don't have it, ask whoever owns the PowerSync Cloud project (`powersync/cli.yaml` has the `instance_id`) — it follows the pattern `https://<instance-id>.powersync.journeyapps.com`.
2. Add it to `apps/mobile/.env.local` alongside the Supabase vars above:
   ```
   EXPO_PUBLIC_POWERSYNC_URL=https://<instance-id>.powersync.journeyapps.com
   ```
3. Restart Metro (`--clear` if it doesn't pick up the new var) and sign in — PowerSync connects automatically once a Supabase session exists.

For provisioning a new PowerSync instance or editing sync rules, see `powersync/` (CLI config: `service.yaml`, `sync-config.yaml`, `cli.yaml`) and `_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md`'s PowerSync entry for the hosting decision record. Load the `powersync` Claude Code skill before any sync-config change — see `CLAUDE.md`.

---

## Per-session startup

Before starting work on any story, confirm these are running:

```bash
supabase status          # should show all services healthy
pnpm turbo build         # verify workspace builds clean
pnpm turbo typecheck     # all three targets must pass
pnpm turbo lint          # clean
pnpm turbo test          # all tests green
```

If any of those fail before you've written a line, stop and fix the environment — not the story.

---

## Runtime map — what runs where

| Package | Test runner | Notes |
|---------|-------------|-------|
| `packages/core` | Vitest (Node) | Pure TypeScript — no React, no RN |
| `packages/supabase` | Vitest (Node) | RLS tests need local Supabase running (`supabase start`) |
| `packages/ui` | Vitest | `passWithNoTests: true` — typecheck validates primitives |
| `apps/mobile` | Jest (jsdom) | React Native components; mock RN modules as needed |
| Edge Functions | Deno (Epic 3+) | See Deno section below |

**Do not assume Jest and Vitest share the same globals** — they don't.

---

## Known gotchas

### `__DEV__` is undefined in Vitest / Jest

`__DEV__` is a React Native runtime global. It does not exist in a Node/Vitest environment.

**`packages/core`** — `vitest.config.ts` already has:
```typescript
define: { __DEV__: false }
```
Do not remove this line. Do not add `"dom"` to `packages/core/tsconfig.json` to work around missing globals — use `globals.d.ts` instead (see `packages/core/src/globals.d.ts`).

**`apps/mobile` Jest** — `__DEV__` is provided by the `react-native` Jest preset. If you create a new Jest config that doesn't extend the preset, add it manually.

### `en.json` key collisions

`apps/mobile/src/i18n/locales/en.json` is edited by every auth/settings story. Before adding a new top-level key, grep for it first:

```bash
grep -n '"nav"' apps/mobile/src/i18n/locales/en.json
```

Story 2.4 introduced a duplicate `nav` key by accident — the second definition silently overwrote the first.

### Supabase RLS tests skip without local Supabase

`packages/supabase/__tests__/rls/*.test.ts` use `describe.skipIf(skipIfNoSupabase)`. If local Supabase is not running, the tests pass with skips — not failures. Run `supabase start` before running RLS tests or you'll get a false-green CI signal locally.

### Turbo cache and env vars

`turbo.json` includes `.env*` in cache inputs. If you change a `.env.local` value, run `turbo build --force` to bypass the stale cache.

### `pod install` fails with `Cannot find module 'react-native-worklets/package.json'`

pnpm's strict isolation means `react-native-worklets` (a peer dep of `react-native-reanimated`) is not hoisted to where CocoaPods' node resolution can find it. The fix is already applied — `react-native-worklets` is declared as a direct dependency in `apps/mobile/package.json`. If you see this error after a `pnpm install` that removes it, re-add it:

```bash
pnpm --filter exposure-buddy-mobile add react-native-worklets@~0.10.1
cd apps/mobile/ios && pod install
```

### App crashes on launch: `Could not resolve @journeyapps/react-native-quick-sqlite`

Historical gotcha, fixed in Story 16.4 (Epic 16). `@journeyapps/react-native-quick-sqlite` (PowerSync's old default SQLite driver) never registers its JS bridge under the New Architecture, so it crashed on every launch on Expo SDK 57 / RN 0.86.3. The fix: `@powersync/react-native` was bumped to `2.3.0`, whose built-in default driver is OP-SQLite (`@op-engineering/op-sqlite`) with real New Architecture support — `@journeyapps/react-native-quick-sqlite` is no longer a dependency anywhere in this repo. If you still see this exact error, you're likely on a stale `node_modules`/branch predating this fix; reinstall and rebuild:

```bash
pnpm install
cd apps/mobile/ios && pod install
pnpm exec expo run:ios
```

If instead you see a *different* native-module-registration error mentioning `@op-engineering/op-sqlite` (e.g. "op-sqlite" not found), first confirm it's declared as a direct dependency of `apps/mobile/package.json` — RN autolinking only sees direct deps, not transitive ones, so it must live there even though nothing in app code imports it.

### `supabase start` fails with "dial unix /var/run/docker.sock: ... no such file or directory"

Docker's daemon isn't running. If you don't have Docker Desktop installed, `colima` (a lightweight Docker daemon alternative) works fine for this — `colima start` sets up a working `docker` context in a few seconds, then `supabase start` runs normally. Note this only gets local Supabase running; it does not by itself provide a reachable PowerSync sync endpoint (`EXPO_PUBLIC_POWERSYNC_URL`) — see Story 9.1's Completion Notes for that separate, still-open gap.

---

### PowerSync never downloads in the Expo dev client (Android) — verify sync on a release build

On the Android development client served by Metro, `PowerSyncDatabase.connect()` gets as far as `fetchCredentials` (which returns the right endpoint and a valid token) and then stays at `connecting: true` forever, with no `downloadError` and nothing in the logs. Uploads still work (they go through the Supabase client), but nothing is ever downloaded, so anything that depends on the local replica — the Story 18.7 reinstall fallback, a freshly signed-in device showing server data — looks broken. The same account on the EAS `preview` APK downloads within seconds, and the PowerSync service accepts the same token and streams the data (checked with a direct `POST /sync/stream`). Found during Story 19.1/19.9 verification (2026-10-06); the cause inside the dev client is not diagnosed. Verify anything download-dependent on a `preview` or production build, not the dev client. Also: `uiautomator dump` can hang while the app shows a spinner, so wrap it in `timeout`.

## Epic 3+ — Edge Functions (Deno)

Edge Functions run under **Deno**, not Node. The import system, standard library, and globals differ.

### Deno setup

```bash
# Install Deno
brew install deno

# Verify Supabase CLI can serve functions locally
supabase functions serve --env-file supabase/.env.local
```

### Key differences from Node

| | Node / Vitest | Deno Edge Functions |
|---|---|---|
| Module imports | `require()` / ESM with npm packages | ESM only; npm packages via `npm:` specifier or `jsr:` |
| Standard library | `node:fs`, `node:path` | `https://deno.land/std/` or `jsr:@std/` |
| Globals | `process.env` | `Deno.env.get('KEY')` |
| Type checking | `tsc` | Built into Deno (`deno check`) |
| Test runner | Jest / Vitest | `deno test` |

### Environment variables in Edge Functions

Edge Functions read env vars via `Deno.env.get()`. For local dev, pass them via:

```bash
supabase functions serve my-function --env-file supabase/.env.local
```

`EXPO_PUBLIC_` prefix is for the mobile app only — Edge Functions use plain names (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`).

### Invoking a local Edge Function

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/my-function' \
  --header 'Authorization: Bearer <anon key>' \
  --header 'Content-Type: application/json' \
  --data '{"key":"value"}'
```

### pgTAP (SQL assertion testing — Stories 3.2, 3.3)

pgTAP tests live in `packages/supabase/tests/` and run via:

```bash
supabase test db
```

Local Supabase must be running. pgTAP is a PostgreSQL extension already enabled in the local stack via `supabase/config.toml`. Write assertions as SQL functions — see the [pgTAP docs](https://pgtap.org/documentation.html) for the assertion API.

---

## Turbo pipeline reference

```
build       → compiles dist/ for packages/core, packages/supabase, packages/ui
typecheck   → tsc --noEmit for all three targets + apps/mobile
lint        → eslint for all packages and apps
test        → vitest (packages) + jest (apps/mobile)
```

All commands from the workspace root:

```bash
pnpm turbo build
pnpm turbo typecheck
pnpm turbo lint
pnpm turbo test

# Single package
pnpm turbo test --filter=exposure-buddy-mobile
pnpm turbo typecheck --filter=@exposure-buddy/core
```

---

## OTP email in local dev

When testing the OTP flow locally, Supabase CLI routes emails to **Mailpit** (not a real email server).
Despite the `[inbucket]` section name in `supabase/config.toml`, the running service is Mailpit
(confirmed for CLI v2.107.0):

```
http://localhost:54324
```

Open that URL in a browser to see OTP codes. The `onboarding.yaml` Maestro flow retrieves OTP codes
programmatically via Mailpit's REST API (`GET /api/v1/messages`) — see `apps/mobile/.maestro/setup/fetchOtp.js`.

---

## Running the Maestro E2E smoke suite locally

Story 9.5 adds a Maestro smoke suite covering the 5 critical user paths. To run it locally:

### Prerequisites

| Tool | Install |
|------|---------|
| Maestro CLI | `curl -Ls "https://get.maestro.mobile.dev" \| bash` |
| Android emulator | Via Android Studio or `sdkmanager` |
| EAS CLI | `npm install -g eas-cli` |

### Steps

```bash
# 1. Start local Supabase (Docker must be running)
supabase start

# 2. Build the e2e dev-client APK (targets http://10.0.2.2:54321 — Android emulator host alias)
cd apps/mobile
eas build --profile e2e --platform android --local --output /tmp/exposure-buddy-e2e.apk

# 3. Install the APK on a running emulator
adb install /tmp/exposure-buddy-e2e.apk

# 4. Export Supabase secrets for the seeding scripts
eval "$(supabase status -o env)"
export SUPABASE_SERVICE_ROLE_KEY MAILPIT_URL

# 5. Run a single flow to test it
~/.maestro/bin/maestro test apps/mobile/.maestro/onboarding.yaml \
  --env SUPABASE_URL=http://10.0.2.2:54321 \
  --env MAILPIT_URL=$MAILPIT_URL \
  --env SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
  --env APP_PACKAGE=com.exposurebuddy.app

# 6. Run the full suite (explicit order — each flow is independently self-contained)
~/.maestro/bin/maestro test \
  apps/mobile/.maestro/onboarding.yaml \
  apps/mobile/.maestro/ladder-build.yaml \
  apps/mobile/.maestro/exposure-loop.yaml \
  apps/mobile/.maestro/debrief.yaml \
  apps/mobile/.maestro/backgrounded-recovery.yaml \
  --output /tmp/maestro-artifacts \
  --env SUPABASE_URL=http://10.0.2.2:54321 \
  --env MAILPIT_URL=$MAILPIT_URL \
  --env SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
  --env APP_PACKAGE=com.exposurebuddy.app
```

### Notes

- The `e2e` EAS profile in `apps/mobile/eas.json` hard-codes `EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54321`
  (the Android emulator's alias for the host machine's `localhost`). Do **not** run these flows against
  the real hosted Supabase project.
- Each flow is independently runnable against a `supabase db reset` state.
- `onboarding.yaml` uses real OTP signup and retrieves the code from Mailpit — it does **not** use the
  DEV bypass. All other flows use the DEV bypass (`test1@test.com` / `DevTest123!`).
- `exposure-loop.yaml` and `debrief.yaml` seed ladder items via PostgREST. This relies on a reachable
  PowerSync sync stream — see `apps/mobile/.maestro/setup/seedPendingLadderItem.js` for the open
  question documented in Task 1.5.
- Story 9.5 requires the suite to pass **at least twice in a row** before being marked done (Task 9.3).
