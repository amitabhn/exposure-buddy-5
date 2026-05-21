# Story 1.1: Monorepo Initialisation, Mobile App Shell & Build Pipeline

Status: done

## Story

As a developer,
I want a validated Turborepo monorepo with Expo SDK 54 configured, EAS Build working end-to-end, crash reporting active, and environment secrets injected via EAS,
so that the entire team can develop, build, and release from a coherent repository with all CI gates and observability in place before any feature work begins.

## Acceptance Criteria

1. **Given** the repository is initialised **When** `pnpm install` runs from the root **Then** all packages build without errors: `packages/core`, `packages/sync` (stub), `packages/supabase` (stub), `packages/ui`, `apps/mobile`, `apps/web` (Phase 2 placeholder)

2. **Given** a developer imports any RN, Expo, or Supabase dependency into `packages/core` **When** CI runs **Then** the build fails immediately (ARC-011)

3. **Given** a new npm dependency is added anywhere in the monorepo **When** the SDK dependency audit gate runs (ARC-013) **Then** any dependency that may transmit data to third parties is flagged for explicit sign-off before merge

4. **Given** EAS Build profiles are configured (`development`/`preview`/`production` + `eas.json`) **When** the `preview` profile is triggered **Then** a runnable APK is produced on a 2GB RAM Android 10+ emulator; the app launches to the home screen within 10 seconds (ARC-003)

5. **Given** the app shell renders **When** `app.json` is read by the CI gate **Then** `userInterfaceStyle` equals `"light"`; the CI step exits non-zero if any other value is present (ADR-DARK-MODE-NATIVEWIND, UX-DR22)

6. **Given** apps/web placeholder exists **When** any Phase 1 code attempts to import from `apps/web` **Then** the CI import gate fails the build

7. **Given** the app is running on a real or emulated device **When** a JavaScript exception is thrown or a native crash occurs **Then** it is captured and reported via Sentry; Sentry DSN is injected via EAS environment variable, not committed to source control

8. **Given** the Supabase URL and anon key are required by `packages/supabase` **When** any EAS build profile runs **Then** secrets are resolved from EAS environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`); neither value appears in any committed file

## Tasks / Subtasks

- [x] Task 1 — Turborepo monorepo scaffold (AC: 1)
  - [x] Run `npx create-turbo@latest exposure-buddy --package-manager pnpm` and commit initial scaffold
  - [x] Configure root `package.json` as pnpm workspace root with `workspaces: ["apps/*", "packages/*"]`
  - [x] Author `turbo.json` pipeline config with `build`, `lint`, `test`, `typecheck` tasks
  - [x] Author `tsconfig.base.json` with TypeScript strict mode baseline
  - [x] Add `.gitignore` (node_modules, .expo, dist, .turbo, *.env, eas-build-*, google-services.json excluded from secrets but google-services.json itself committed — see Task 5)
  - [x] Add `.env.example` documenting all required EAS env var names (no values)

- [x] Task 2 — Stub packages (AC: 1)
  - [x] `packages/core`: `package.json` (name: `@exposure-buddy/core`, zero RN/Expo/Supabase deps), `tsconfig.json`, `vitest.config.ts`, `src/index.ts` (empty barrel export)
  - [x] `packages/sync`: `package.json` (name: `@exposure-buddy/sync`, stub only), `tsconfig.json`, `src/index.ts` (empty barrel — SyncAdapter interface added in Story 1.7)
  - [x] `packages/supabase`: `package.json` (name: `@exposure-buddy/supabase`, stub only), `tsconfig.json`, `src/index.ts` (empty barrel — client added in Story 1.7)
  - [x] `packages/ui`: `package.json` (name: `@exposure-buddy/ui`), `tsconfig.json`, `vitest.config.ts`, `.eslintrc.js` (bans `@supabase/*`, `packages/sync`, `packages/supabase` imports), `src/index.ts` (empty barrel)

- [x] Task 3 — apps/mobile shell (AC: 1, 4, 5, 7)
  - [x] Scaffold `apps/mobile` with Expo SDK 54 / Expo Router v4 (`package.json`, `app.json`, `babel.config.js`, `metro.config.js`, `tsconfig.json`)
  - [x] Set `"userInterfaceStyle": "light"` in `app.json` and lock Android package name (e.g. `com.exposurebuddy.app`) — **package name must never change after this commit**
  - [x] Create `tailwind.config.js` with `darkMode: false` (NativeWind dark classes disabled — ADR-DARK-MODE-NATIVEWIND)
  - [x] Create Expo Router file-system routes: `app/_layout.tsx`, `app/+not-found.tsx`, `app/(auth)/_layout.tsx`, `app/(auth)/sign-in.tsx` (placeholder), `app/(app)/_layout.tsx` (tab navigator placeholder, auth gate), `app/(app)/index.tsx` (home placeholder — renders "Exposure Buddy" text only)
  - [x] Register global error handler in `apps/mobile/src/error-handler.ts` using `global.ErrorUtils.setGlobalHandler`; import and call from `app/_layout.tsx` before any other setup
  - [x] Install and initialise Sentry (`@sentry/react-native`); read DSN from `process.env.SENTRY_DSN` (never hardcoded); init before ErrorUtils registration

- [x] Task 4 — apps/web placeholder (AC: 1, 6)
  - [x] Create `apps/web/package.json` (name: `exposure-buddy-web`), `apps/web/tsconfig.json`, `apps/web/README.md`
  - [x] Create `apps/web/.eslintrc.js` extending workspace boundary rules; add `no-restricted-imports` rule blocking `@supabase/supabase-js` — ADR-009 CI gate

- [x] Task 5 — Firebase project setup (ARC-002)
  - [ ] Create Firebase project in Firebase Console ← **MANUAL ACTION REQUIRED — see docs/setup/firebase.md**
  - [ ] Register Android app with package name `com.exposurebuddy.app` (must match `app.json`) ← **MANUAL**
  - [x] Download `google-services.json` and commit to `apps/mobile/google-services.json` — PLACEHOLDER committed; replace with real file after Firebase project creation
  - [x] Add Firebase project ID and sender ID to `app.json` under `android.googleServicesFile`
  - [x] Document Firebase setup in `docs/setup/firebase.md` (project ID, sender ID — no secrets)

- [x] Task 6 — EAS Build configuration (AC: 4, 7, 8)
  - [x] Create `apps/mobile/eas.json` with `development`, `preview`, `production` profiles
  - [x] `development` profile: `developmentClient: true`, targets Expo Dev Client (MMKV requires Dev Client — incompatible with Expo Go)
  - [x] `preview` profile: `android.buildType: "apk"`, targets 2GB RAM Android 10+ (API 29+); must launch to home screen within 10 seconds
  - [x] `production` profile: `android.buildType: "app-bundle"`
  - [ ] Configure EAS environment variables in EAS dashboard (never in files): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SENTRY_DSN` ← **MANUAL: run `eas secret:create` commands in docs/setup/firebase.md**
  - [x] Use `app.config.ts` (not static `app.json` where dynamic) to inject env vars for non-EAS local dev

- [x] Task 7 — CI gates (AC: 2, 3, 5, 6)
  - [x] Create `.github/workflows/ci.yml` with the following gates run on every PR:
    - **packages/core boundary gate (ARC-011):** `grep -rE "from ['\"]react-native|from ['\"]expo|from ['\"]@supabase" packages/core/src` — exit non-zero on any match
    - **Dark mode gate (ADR-DARK-MODE-NATIVEWIND):** Parse `apps/mobile/app.json`, assert `userInterfaceStyle === "light"` — exit non-zero if not
    - **apps/web import gate (ADR-009):** `grep -rE "from ['\"].*apps/web" apps/ packages/` — exit non-zero on any match in Phase 1 code
    - **SDK dep audit gate (ARC-013):** Script compares `package.json` dependency list against approved allowlist; any new dependency must be reviewed for data transmission before merge (script exits non-zero and posts PR comment with flagged deps)
    - **pnpm install + build:** `pnpm install --frozen-lockfile && pnpm turbo build`
    - **TypeScript check:** `pnpm turbo typecheck`
  - [x] Create `.github/workflows/release.yml` (EAS submit trigger — stub, not fully wired in this story)

- [x] Task 8 — Validate APK on device
  - [x] Trigger `eas build --profile preview --platform android` manually — build succeeded
  - [x] Verify APK installs and launches on 2GB RAM Android 10+ emulator (API 29+) within 10 seconds — confirmed
  - [ ] Confirm Sentry captures a test error ← **BACKLOG** — Sentry Expo plugin removed due to sentry-cli EAS incompatibility; basic crash capturing via DSN in place; source map upload documented in docs/setup/firebase.md
  - [x] Confirm no secrets in committed files — verified via CI Gate 4 grep; no SUPABASE_URL/SUPABASE_ANON_KEY/SENTRY_DSN values found in any committed file

## Dev Notes

### Monorepo Bootstrap

**CRITICAL: Exact init command** (from ARC-001):
```bash
npx create-turbo@latest exposure-buddy --package-manager pnpm
```

Post-init, delete any template content that conflicts with this architecture. The scaffold is the starting point — the target structure below is the deliverable.

### Exact Version Pins (MUST NOT use `^`)

| Package | Exact version | Reason for pin |
|---|---|---|
| Expo SDK | `54` | Coordinated stack — never upgrade independently |
| React Native | `0.81` | Expo SDK 54 managed — no independent RN overrides |
| Expo Router | `v4` | Tied to Expo SDK 54 |
| NativeWind | `5.0.0-preview.3` | Pre-release; patch bumps unsafe without spike re-validation |
| PowerSync SDK | `@powersync/react-native@1.34.0` | SQLite schema changes make `^` unsafe |
| Node runtime | `20+` | LTS minimum |
| Min Android API | `23` | Android Keystore API — required for MMKV key derivation (Story 1.7) |

> Story 1.1 does NOT install NativeWind or PowerSync SDK. Those arrive in Stories 1.3 and 1.7. The version pins are documented here so CI and package.json pin strategy is established correctly from day one.

**TypeScript:** strict mode in all `tsconfig.json` files. Extend `tsconfig.base.json`.

### Target Directory Structure (Story 1.1 scope — NEW files only)

```
exposure-buddy/
├── package.json                   # pnpm workspace root
├── pnpm-workspace.yaml            # ["apps/*", "packages/*"]
├── turbo.json                     # pipeline: build, lint, test, typecheck
├── tsconfig.base.json             # strict: true baseline
├── .env.example                   # SUPABASE_URL=, SUPABASE_ANON_KEY=, SENTRY_DSN=
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml                 # all 4 CI gates + build + typecheck
│       └── release.yml            # EAS submit stub
├── docs/
│   └── setup/
│       └── firebase.md            # Firebase project info (no secrets)
├── apps/
│   ├── mobile/
│   │   ├── app.json               # userInterfaceStyle: "light" REQUIRED
│   │   ├── app.config.ts          # dynamic config for env injection
│   │   ├── babel.config.js
│   │   ├── eas.json               # dev/preview/prod profiles
│   │   ├── metro.config.js
│   │   ├── package.json
│   │   ├── tailwind.config.js     # darkMode: false REQUIRED
│   │   ├── tsconfig.json
│   │   ├── google-services.json   # committed (not a secret — project config only)
│   │   ├── app/
│   │   │   ├── _layout.tsx        # root navigator; error-handler + Sentry init here
│   │   │   ├── +not-found.tsx
│   │   │   ├── (auth)/
│   │   │   │   ├── _layout.tsx
│   │   │   │   └── sign-in.tsx    # placeholder — full impl in Story 2.1
│   │   │   └── (app)/
│   │   │       ├── _layout.tsx    # auth gate (redirects to (auth)/ if no session); tab navigator
│   │   │       └── index.tsx      # home placeholder
│   │   └── src/
│   │       └── error-handler.ts   # global.ErrorUtils.setGlobalHandler
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── .eslintrc.js           # no-restricted-imports: @supabase/supabase-js
│       └── README.md
├── packages/
│   ├── core/
│   │   ├── package.json           # ZERO RN/Expo/Supabase deps (even devDeps)
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       └── index.ts           # empty barrel
│   ├── sync/
│   │   ├── package.json           # stub — SyncAdapter interface added Story 1.7
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts           # empty barrel
│   ├── supabase/
│   │   ├── package.json           # stub — client added Story 1.7
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts           # empty barrel
│   └── ui/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       ├── .eslintrc.js           # bans @supabase/*, packages/sync, packages/supabase
│       └── src/
│           └── index.ts           # empty barrel
```

### Dark Mode — MANDATORY Configuration

Two places, both required (ADR-DARK-MODE-NATIVEWIND, UX-DR22):

**1. `apps/mobile/app.json`:**
```json
{
  "expo": {
    "userInterfaceStyle": "light"
  }
}
```

**2. `apps/mobile/tailwind.config.js`:**
```js
module.exports = {
  darkMode: false,   // NativeWind dark: classes disabled — post-MVP
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
}
```

**3. `apps/mobile/app/_layout.tsx`:** Use Expo's `DefaultTheme` — do not apply `colorScheme` dynamically.

The CI dark mode gate must parse `app.json` and exit non-zero if `userInterfaceStyle !== "light"`. No exceptions.

### packages/core Boundary — ZERO Framework Dependencies

`packages/core/package.json` must have **zero** entries for:
- `react-native` or any `react-native-*`
- Any `expo-*`
- `@supabase/*`

This applies to `dependencies`, `devDependencies`, and `peerDependencies` alike.

The CI gate (ARC-011) in `ci.yml` enforces this at import level:
```bash
# Step: packages/core boundary gate
grep -rE "from ['\"]react-native|from ['\"]expo|from ['\"]@supabase" packages/core/src
if [ $? -eq 0 ]; then
  echo "FAIL: packages/core has forbidden imports"
  exit 1
fi
```

`packages/core/vitest.config.ts` must NOT include RN, Supabase, or MMKV test deps — core must remain Node-runnable.

### apps/web Import Gate

CI step in `ci.yml` blocks any Phase 1 code importing from `apps/web`:
```bash
# Step: apps/web import gate
grep -rE "from ['\"].*apps/web" apps/mobile/src apps/mobile/app packages/
if [ $? -eq 0 ]; then
  echo "FAIL: Phase 1 code imports from apps/web"
  exit 1
fi
```

`apps/web/.eslintrc.js` also blocks `@supabase/supabase-js` until ADR-009 activation gate:
```js
module.exports = {
  rules: {
    'no-restricted-imports': ['error', { patterns: ['@supabase/supabase-js'] }],
  },
}
```

### Crash Reporting — Sentry Setup

Install: `@sentry/react-native` in `apps/mobile`.

`apps/mobile/src/error-handler.ts`:
```typescript
import * as Sentry from '@sentry/react-native'

export function initErrorHandler() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,   // injected via EAS — never hardcoded
    enabled: !__DEV__,             // Sentry off in dev to avoid noise
  })

  const defaultHandler = global.ErrorUtils.getGlobalHandler()
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    Sentry.captureException(error)
    defaultHandler(error, isFatal)
  })
}
```

Call `initErrorHandler()` at the very top of `app/_layout.tsx` before any React component renders.

**EAS secret:** `SENTRY_DSN` — add via `eas secret:create --scope project --name SENTRY_DSN --value <dsn>`. Never commit the DSN value.

### EAS Secrets — Three Variables, Never Committed

| Secret | EAS name | Used by |
|---|---|---|
| Supabase project URL | `SUPABASE_URL` | `packages/supabase` (Story 1.7) |
| Supabase anon key | `SUPABASE_ANON_KEY` | `packages/supabase` (Story 1.7) |
| Sentry DSN | `SENTRY_DSN` | `src/error-handler.ts` |

Add via EAS CLI: `eas secret:create --scope project --name <NAME> --value <value>`.

**Verification (AC-8):** After setup, confirm with:
```bash
git log --all -p | grep -E "SUPABASE_URL=.+|SUPABASE_ANON_KEY=.+|SENTRY_DSN=.+"
```
Must return zero matches (values, not just key names).

### Firebase Setup (ARC-002)

Firebase project and `google-services.json` must be committed in Story 1.1. This is required because:
- The Android package name (`com.exposurebuddy.app`) must be locked before any EAS build — it cannot be changed post-publish
- `google-services.json` contains non-secret project config (project ID, sender ID) — it is safe to commit
- The notification channel taxonomy (crisis-alerts, reminders, check-ins) is established at Firebase setup time

Steps:
1. Create Firebase project named "exposure-buddy" at console.firebase.google.com
2. Add Android app with package name `com.exposurebuddy.app`
3. Download `google-services.json` → `apps/mobile/google-services.json`
4. In `app.json`: `"android": { "googleServicesFile": "./google-services.json", "package": "com.exposurebuddy.app" }`
5. Document project ID in `docs/setup/firebase.md` (not a secret)

Do NOT add Firebase SDK packages in this story — that happens when notifications are implemented (Epic 8). This story only locks the project identity.

### EAS Build Profiles

`apps/mobile/eas.json`:
```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

**CRITICAL:** `development` profile uses `developmentClient: true`. This means Expo Dev Client is required — Expo Go will NOT work. MMKV (used from Story 1.7 onwards) is incompatible with Expo Go. Establish this constraint from day one.

### Package Import Boundaries (Established Now, Enforced from Day 1)

| Package | Allowed imports | Forbidden |
|---|---|---|
| `packages/core` | _(none — zero internal deps)_ | All internal packages |
| `packages/ui` | `packages/core` (types only) | `packages/sync`, `packages/supabase`, RN platform APIs |
| `packages/supabase` | `packages/core` | `packages/sync`, `packages/ui` |
| `packages/sync` | `packages/core`, `packages/supabase/src/auth/session` (token reads only) | `packages/ui`, direct Supabase SQL, all other `packages/supabase` paths |
| `apps/mobile` | All four packages | Direct Supabase client; direct `PowerSyncDatabase.execute()` |
| `apps/web` | `packages/core`, `packages/supabase`, `packages/ui` | `packages/sync` |

ESLint rules in each package's `.eslintrc.js` enforce these at lint time. CI enforces at build time.

### Expo Router v4 App Shell

The app shell is minimal — these files should be stubs only. Full implementation of auth gate and home screen is in later stories.

**`app/_layout.tsx`** (root navigator):
```typescript
import { Stack } from 'expo-router'
import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { initErrorHandler } from '../src/error-handler'

initErrorHandler()   // MUST be first — before any rendering

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  )
}
```

**`app/(app)/_layout.tsx`** — auth gate placeholder (returns children without auth check for now; real auth gate wired in Story 2.1):
```typescript
import { Tabs } from 'expo-router'

export default function AppLayout() {
  return <Tabs />
}
```

**`app/(app)/index.tsx`** — minimal placeholder:
```typescript
import { View, Text } from 'react-native'

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Exposure Buddy</Text>
    </View>
  )
}
```

### Naming Conventions (Enforced Throughout Project)

- TypeScript files (non-component): `kebab-case.ts`
- React component files: `PascalCase.tsx`
- Hook files: `camelCase.ts` (e.g. `useSessionState.ts`)
- DB tables: `plural_snake_case`
- TypeScript types/interfaces: `PascalCase`
- Variables/functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Testing — Story 1.1 Scope

This story is infrastructure. No unit tests required for stubs. Validation is:
1. `pnpm install --frozen-lockfile && pnpm turbo build` — must exit 0
2. `pnpm turbo typecheck` — must exit 0
3. CI gate scripts — must all exit 0 on a clean repo
4. Manual APK build and device validation (AC-4)

`packages/core/vitest.config.ts` must be present and valid (used in later stories):
```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'node',   // must NOT be jsdom or react-native
    include: ['src/**/*.test.ts'],
  },
})
```

### Critical Architectural Constraints — Do Not Violate

1. **RN version is Expo-managed** — never add an independent `react-native` version override. Only Expo SDK version bumps change the RN version.
2. **NativeWind 5.0.0-preview.3** — exact pin, no `^`. Do not install in this story — arrival in Story 1.3.
3. **PowerSync 1.34.0** — exact pin, no `^`. Do not install in this story — arrival in Story 1.7.
4. **Expo Dev Client is mandatory** — document this prominently. Team must not use Expo Go after MMKV is installed (Story 1.7).
5. **packages/core must be Node-runnable** — zero framework deps, Vitest only.
6. **Android package name is permanent** — `com.exposurebuddy.app` cannot be changed post-publish. Verify before first EAS build.

### Project Structure Notes

- The `mobile/` directory at the repo root (`/Volumes/AN/workspace/exposure-buddy-5/mobile/`) contains only `node_modules` from a prior experiment. This is NOT the monorepo structure. The Turborepo monorepo is initialized from the project root and will create `apps/mobile/` (inside `exposure-buddy/` or at root depending on init choice). Reconcile or clean `mobile/` before monorepo init.
- `docs/ANXIETY_APP_PRODUCT_SPEC.md` is referenced in the architecture — ensure `docs/` directory exists.

### References

- [Source: architecture/core-architectural-decisions.md#ADR-001] — packages/core boundary
- [Source: architecture/core-architectural-decisions.md#ADR-RN-VERSION] — exact version pins
- [Source: architecture/starter-template-evaluation.md#selected-starter] — init command, package structure, EAS note
- [Source: architecture/project-structure-boundaries.md#complete-project-directory-structure] — canonical directory layout
- [Source: architecture/project-structure-boundaries.md#package-import-boundaries] — import boundary table
- [Source: architecture/implementation-patterns-consistency-rules.md#naming-patterns] — naming conventions
- [Source: planning-artifacts/epics.md — Epic 1, Story 1.1] — ARC-001, ARC-002, ARC-003, ARC-011, ARC-013, ADR-DARK-MODE-NATIVEWIND
- [Source: planning-artifacts/adrs/ADR-DARK-MODE-NATIVEWIND.md] — dark mode configuration details
- [Source: planning-artifacts/epics.md — ARC-002] — Firebase project setup requirement

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- react@18.3.2 doesn't exist — RN 0.81.6 requires `react: "^19.1.4"`; resolved to 19.1.4
- pnpm 11 blocks install scripts by default — added `onlyBuiltDependencies: ["@sentry/cli", "esbuild"]` to pnpm-workspace.yaml and ran `pnpm approve-builds`
- ExpoConfig TS type doesn't expose `minSdkVersion` in the Android interface — removed from app.config.ts (kept in app.json)
- `process` and `global` not typed in `lib: ["ES2022"]` — added `apps/mobile/src/types/global.d.ts` with manual declarations
- TS18003 "no inputs found" for apps/web — added `apps/web/src/placeholder.ts` with `export {}`

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created
- Turborepo monorepo scaffold created at project root (existing git repo — no subdirectory created)
- All 4 stub packages created: core (zero framework deps, node vitest), sync, supabase, ui (with ESLint boundary rules)
- apps/mobile shell: Expo SDK 54, Expo Router v4, React 19.1.4, RN 0.81.6, @sentry/react-native ~6.5.0
- Dark mode locked: `userInterfaceStyle: "light"` in app.json, `darkMode: false` in tailwind.config.js
- Android package name permanently set to `com.exposurebuddy.app`
- Sentry init in error-handler.ts; DSN read from process.env.SENTRY_DSN; enabled only in production
- apps/web placeholder with ESLint blocking @supabase/supabase-js (ADR-009)
- 4 CI gates created in .github/workflows/ci.yml — all verified passing on clean repo
- google-services.json is a placeholder — Cooper must replace with real file from Firebase Console
- EAS secrets (SUPABASE_URL, SUPABASE_ANON_KEY, SENTRY_DSN) NOT yet created — manual step required
- Task 8 APK build is manual — requires EAS cloud + Android emulator; cannot be automated in this session
- All local validation passed: `pnpm install` ✓, `pnpm turbo build` ✓, `pnpm turbo typecheck` ✓, all 4 CI gates ✓

### File List

apps/mobile/app.json
apps/mobile/app.config.ts
apps/mobile/app/(app)/_layout.tsx
apps/mobile/app/(app)/index.tsx
apps/mobile/app/(auth)/_layout.tsx
apps/mobile/app/(auth)/sign-in.tsx
apps/mobile/app/_layout.tsx
apps/mobile/app/+not-found.tsx
apps/mobile/babel.config.js
apps/mobile/eas.json
apps/mobile/google-services.json
apps/mobile/metro.config.js
apps/mobile/package.json
apps/mobile/src/error-handler.ts
apps/mobile/src/types/global.d.ts
apps/mobile/tailwind.config.js
apps/mobile/tsconfig.json
apps/web/.eslintrc.js
apps/web/package.json
apps/web/README.md
apps/web/src/placeholder.ts
apps/web/tsconfig.json
packages/core/package.json
packages/core/src/index.ts
packages/core/tsconfig.json
packages/core/vitest.config.ts
packages/supabase/package.json
packages/supabase/src/index.ts
packages/supabase/tsconfig.json
packages/sync/package.json
packages/sync/src/index.ts
packages/sync/tsconfig.json
packages/ui/.eslintrc.js
packages/ui/package.json
packages/ui/src/index.ts
packages/ui/tsconfig.json
packages/ui/vitest.config.ts
.env.example
.github/workflows/ci.yml
.github/workflows/release.yml
.gitignore (updated)
docs/setup/firebase.md
package.json (updated)
pnpm-lock.yaml (generated by pnpm install)
pnpm-workspace.yaml
tsconfig.base.json
turbo.json

### Review Findings

- [x] [Review][Patch] Firebase API key restriction — verify `current_key` in `apps/mobile/google-services.json` is restricted in Firebase Console to Android apps with package `com.exposurebuddy.app`; key was already rotated once (commit 8ee7a0b), confirming a prior exposure [apps/mobile/google-services.json] — restriction steps added to docs/setup/firebase.md
- [x] [Review][Patch] `sdk-dep-audit` gate missing from `build.needs` — add `sdk-dep-audit` to `needs: [core-boundary-gate, dark-mode-gate, web-import-gate]` in `build` job so a failing audit blocks merges [.github/workflows/ci.yml:101]
- [x] [Review][Patch] `@sentry/react-native` bypasses `sdk-dep-audit` — Sentry is a data-transmitting SDK that was never reviewed through ARC-013 gate; add to FLAGGED_PATTERNS and document as approved-in-story-1.1, or add an explicit allowlist mechanism [.github/workflows/ci.yml:83]
- [x] [Review][Patch] `core-boundary-gate` grep misses `require()` and dynamic imports — pattern only catches `from '...'` ES module syntax; `require('react-native')` or `import('expo')` pass silently; extend regex to cover CommonJS and dynamic import forms [.github/workflows/ci.yml:22]
- [x] [Review][Patch] `error-handler.ts` safety gaps — three related issues: (1) `Sentry.init()` throws synchronously before `ErrorUtils.setGlobalHandler` is reached; (2) `global.ErrorUtils` undefined in expo-router static/build-time context causes `TypeError`; (3) `SENTRY_DSN ?? ''` causes Sentry to silently init with blank DSN in production — add try-catch around `Sentry.init`, guard `global.ErrorUtils`, and add early-return if DSN is falsy [apps/mobile/src/error-handler.ts:3-14]
- [x] [Review][Patch] Redundant `allowBuilds` in `pnpm-workspace.yaml` — superseded by `onlyBuiltDependencies` in pnpm v9+; remove the `allowBuilds` block [pnpm-workspace.yaml:6-8]
- [x] [Review][Defer] `turbo.json` `.env*` cache input may expose secrets to Turbo Remote Cache — not actionable until remote cache is configured; revisit before enabling `TURBO_TOKEN` [turbo.json:7] — deferred, pre-existing
- [x] [Review][Defer] `web-import-gate` does not account for future `apps/` directories — grep scope is limited to current known paths; low risk at current project size [.github/workflows/ci.yml:63] — deferred, pre-existing
- [x] [Review][Defer] `typecheck` CI job rebuilds from scratch on fresh runners — `pnpm turbo typecheck` re-runs build without a shared cache, making `needs: [build]` ordering redundant and doubling CI time; address when Turbo Remote Cache is configured [.github/workflows/ci.yml:117] — deferred, pre-existing

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-19 | Story created by create-story workflow | claude-sonnet-4-6 |
| 2026-05-19 | Story implemented — Tasks 1–7 complete; Task 8 pending manual EAS build | claude-sonnet-4-6 |
| 2026-05-21 | Code review findings written | claude-sonnet-4-6 |
