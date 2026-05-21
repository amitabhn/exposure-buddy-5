# Firebase Project Setup (ARC-002)

The `google-services.json` placeholder at `apps/mobile/google-services.json` must be replaced with the real file before triggering an EAS build.

## Why Now

- The Android package name (`com.exposurebuddy.app`) is permanent — locked before any EAS build
- Firebase Cloud Messaging sender ID must be registered before Epic 8 notification work
- `google-services.json` contains non-secret project config (project ID, sender ID) — safe to commit

## API Key Restriction — REQUIRED ACTION

`google-services.json` contains an Android API key (`current_key`). This key was **already rotated once** (git history) — restrict it immediately to prevent repeat exposure.

**Steps:**
1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) for the `exposure-buddy` project
2. Find the Android API key (name: "Android key (auto created by Firebase)")
3. Under **Application restrictions** → select **Android apps**
4. Add package: `com.exposurebuddy.app` with the SHA-1 certificate fingerprint from your keystore
5. Save — the key will now be rejected by Google if used from any other app or context

**Verification:** Attempt to use the key from a non-Android context (e.g., a plain HTTP request) — it must return a `403 keyInvalid` error.

## Steps

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a project named **exposure-buddy**
3. Add an Android app with package name: `com.exposurebuddy.app`
4. Download `google-services.json`
5. Replace `apps/mobile/google-services.json` with the downloaded file
6. Commit: `git add apps/mobile/google-services.json && git commit -m "Add real Firebase google-services.json"`

## Notification Channel Taxonomy (Epic 8)

- `crisis-alerts` — highest priority
- `reminders` — daily session reminders
- `check-ins` — check-in nudges

## EAS Secrets Setup

After linking your EAS project (`eas init`):

```bash
eas secret:create --scope project --name SUPABASE_URL --value <your-supabase-url>
eas secret:create --scope project --name SUPABASE_ANON_KEY --value <your-anon-key>
eas secret:create --scope project --name SENTRY_DSN --value <your-sentry-dsn>
```

Update `extra.eas.projectId` in `apps/mobile/app.config.ts` with the EAS project ID.

## Sentry Source Map Upload (Backlog)

Source map uploads are disabled (`uploadSourceMaps: false` in `app.config.ts`) because `@sentry/cli` post-install scripts don't run on EAS build servers with pnpm's script restrictions. Crash capturing (AC-7) works independently via SENTRY_DSN.

To enable in a future story:
1. Create a Sentry internal integration auth token (Settings → Developer Settings → Internal Integrations → scopes: `project:releases`, `org:read`)
2. Add EAS secrets: `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
3. Investigate EAS + pnpm `onlyBuiltDependencies` to ensure `@sentry/cli` binary builds correctly
4. Set `uploadSourceMaps: true` in `apps/mobile/app.config.ts`

## Dev Client Requirement

`development` EAS profile uses `developmentClient: true`.
**Expo Go will NOT work.** Use Expo Dev Client for all local development.
MMKV (Story 1.7) is incompatible with Expo Go.
