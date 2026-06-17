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
pnpm --filter exposure-buddy-mobile add react-native-worklets@~0.8.3
cd apps/mobile/ios && pod install
```

### App crashes on launch: `Could not resolve @journeyapps/react-native-quick-sqlite`

`@powersync/react-native` requires `@journeyapps/react-native-quick-sqlite` as a peer dependency for its SQLite backend. The fix is already applied — it is declared as a direct dependency in `apps/mobile/package.json`. If you see this error, reinstall and rebuild:

```bash
pnpm --filter exposure-buddy-mobile add "@journeyapps/react-native-quick-sqlite@^2.5.1"
cd apps/mobile/ios && pod install
pnpm exec expo run:ios
```

---

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

When testing the OTP flow locally, Supabase CLI routes emails to **Inbucket** (not a real email server):

```
http://localhost:54324
```

Open that URL in a browser to see OTP codes. No email is sent.
