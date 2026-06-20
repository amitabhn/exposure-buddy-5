# Story 8.1: Push Token Registration & Shared Push Helper

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who wants to receive session reminders,
I want the app to register my device for push notifications and store my token securely,
so that the server can dispatch notifications to me.

This is a technical prerequisite story — no FR is directly implemented here. It enables FR-NOTIF-01 (re-engagement notifications, Story 8.4), FR-NOTIF-02 (tone constraint, enforced at the payload layer this story creates), FR-NOTIF-03 (user notification controls — this story's "Enable reminders" card), and FR-NOTIF-04 (deferred post-MVP, no code dependency).

## Acceptance Criteria

1. **Given** the `device_push_tokens` table does not yet exist, **when** this story is implemented, **then** a migration creates it: `id uuid PK`, `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `token text NOT NULL`, `platform text NOT NULL CHECK (platform IN ('ios','android'))`, `registered_at timestamptz NOT NULL DEFAULT now()`, `last_seen_at timestamptz NOT NULL DEFAULT now()`, plus `CREATE UNIQUE INDEX uq_push_token ON device_push_tokens (token)`.
2. **Given** the RLS policy for `device_push_tokens`, **when** applied, **then** authenticated users may INSERT and SELECT their own rows only; no client-side UPDATE or DELETE is permitted; `service_role` is used by Edge Functions for token pruning (Stories 8.3/8.4 — not this story).
3. **Given** a user grants push permission and a token is obtained via `Notifications.getExpoPushTokenAsync()`, **when** the token is registered, **then** the app calls `supabase.from('device_push_tokens').upsert({ token, platform, user_id, last_seen_at: new Date().toISOString() }, { onConflict: 'token' })`; `last_seen_at` and `user_id` are updated on conflict; no duplicate rows are created.
4. **Given** the app is foregrounded after a token was previously registered, **when** `Notifications.getExpoPushTokenAsync()` returns a token, **then** the upsert is re-executed to refresh `last_seen_at`; this is idempotent — no UI element changes state and no user-facing toast or notification fires as a result.
5. **Given** the shared push helper `supabase/functions/_shared/expoPush.ts`, **when** implemented, **then** it exports the `PushResult` type and `sendPushNotification(token, title, body)` function (signature below); the chunking helper (`chunk<T>(arr: T[], size: number): T[][]`, ≤100 per Expo's batch limit) is implemented and unit-tested standalone in this story — the multi-token end-to-end send path is exercised by Stories 8.3/8.4, not here; `DeviceNotRegistered` ticket errors return `{ ok: false, signal: 'PruneToken' }`; `InvalidCredentials` ticket errors return `{ ok: false, signal: 'Unknown' }` (a project-wide credential misconfiguration is not a single-token problem — mapping it to `PruneToken` would cause a caller to mass-delete tokens during a credential outage instead of surfacing the error; see Dev Notes); network errors return `{ ok: false, signal: 'RetryLater' }`.
6. **Given** a `PruneToken` signal is returned by `sendPushNotification`, **when** the calling Edge Function handles the result, **then** it deletes the token row using `service_role`; no further notification attempt is made for that token in the same cron run. (No caller exists yet in this story — Stories 8.3/8.4 are the first consumers. This AC documents the contract `sendPushNotification`'s caller must honor.)
7. **Given** the "Enable reminders" card in the Settings screen, **when** it renders, **then** it shows the current permission state (enabled / disabled / not-yet-requested); tapping it calls `Notifications.requestPermissionsAsync()` if not yet granted, or opens the OS settings deep-link if previously denied; the card label updates to reflect the current state after the user returns to the app. If `Notifications.getPermissionsAsync()` throws or returns a status outside the three known values, treat it as `not-yet-requested` and log the unexpected value — do not crash the Settings screen.

## Tasks / Subtasks

- [x] Task 1: Database migration (AC: 1, 2)
  - [x] 1.1 Create `supabase/migrations/0028_device_push_tokens.sql` following the `0013_fear_ladder_items.sql` template: `CREATE TABLE IF NOT EXISTS public.device_push_tokens`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `device_push_tokens_select_own` policy (`USING auth.uid() = user_id`), `device_push_tokens_insert_own` policy (`WITH CHECK auth.uid() = user_id`), no UPDATE/DELETE policy (with an inline comment explaining client UPDATE/DELETE is blocked by RLS — pruning is `service_role`-only and bypasses RLS), `CREATE UNIQUE INDEX uq_push_token`, `CREATE INDEX idx_device_push_tokens_user_id ON public.device_push_tokens (user_id)` (matches the `0016_exposure_sessions.sql` precedent of indexing the column the RLS `SELECT` policy filters on), `COMMENT ON TABLE`.
  - [x] 1.2 In the same migration file, add the standard PostgREST grant line matching the project convention established in `0024_grant_table_permissions.sql`: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO anon, authenticated, service_role;` — RLS policies (not withheld grants) are what block UPDATE/DELETE for authenticated users; `service_role` bypasses RLS entirely in Supabase, so its DELETE grant is what pruning (Stories 8.3/8.4) will use.
  - [x] 1.3 Run `supabase db reset` locally to apply, then regenerate types: `supabase gen types typescript --local > packages/supabase/src/database.types.ts`.
- [x] Task 2: packages/supabase — push token registration service (AC: 3, 4)
  - [x] 2.1 Create `packages/supabase/src/functions/push-tokens.ts` exporting `registerPushToken(params: { token: string; platform: 'ios' | 'android'; userId: string }): Promise<void>` that calls `createSupabaseClient().from('device_push_tokens').upsert({ token: params.token, platform: params.platform, user_id: params.userId, last_seen_at: new Date().toISOString() }, { onConflict: 'token' })`; throw the raw Supabase error on failure (`if (error) throw error`) — this matches the existing convention in `packages/supabase/src/functions/call-edge-fn.ts:9`; there is no existing error-mapper in `packages/supabase` to reuse (no `errors/` directory exists in the package), so do not invent a reference to one.
  - [x] 2.2 Export `registerPushToken` from `packages/supabase/src/index.ts`.
  - [x] 2.3 This is a direct table upsert, not an Edge Function call — the "Edge Functions only from packages/supabase" rule does not apply here. Apply the same convention this codebase already uses elsewhere (e.g. `consent-record.ts`): `apps/mobile` calls the `packages/supabase` wrapper, never `supabase.from(...)` inline in a screen or hook body beyond the wrapper itself.
- [x] Task 3: apps/mobile — push token registration hook (AC: 3, 4)
  - [x] 3.1 Add `expo-notifications` to `apps/mobile/package.json` (check latest version compatible with Expo SDK 54 — see Latest Tech Information below) and add `'expo-notifications'` to the `plugins` array in `apps/mobile/app.config.ts`.
  - [x] 3.2 Create `apps/mobile/src/hooks/usePushRegistration.ts`: on permission-granted + foreground, calls `Notifications.getExpoPushTokenAsync({ projectId })` (read `projectId` from `Constants.expoConfig?.extra?.eas?.projectId`, mirroring the existing `extra.eas.projectId` already in `app.config.ts`), detects platform via `Platform.OS` (`react-native`'s `Platform`, not previously used elsewhere in this codebase — this is a new pattern), and calls `registerPushToken` from `@exposure-buddy/supabase`.
  - [x] 3.3 Wire the foreground re-registration trigger (AC 4) using the same `AppState.addEventListener('change', ...)` pattern already established in `apps/mobile/app/(app)/_layout.tsx:42-49` for session refresh — add a second listener (or extend the existing one) that re-runs token registration when `state === 'active'` and a token was previously registered this session. Use the async-`useEffect` three-guard shape (loading guard, `cancelled` flag, complete dep array) from `implementation-patterns-consistency-rules.md`.
  - [x] 3.4 Only attempt registration if `Notifications.getPermissionsAsync()` reports `granted` — do not request permission from this hook; permission requesting is owned exclusively by the Settings card (Task 4).
- [x] Task 4: Shared Edge Function push helper (AC: 5, 6)
  - [x] 4.1 Create `supabase/functions/_shared/expoPush.ts`:
    ```typescript
    export type PushResult =
      | { ok: true }
      | { ok: false; signal: 'PruneToken' | 'RetryLater' | 'Unknown' }

    export async function sendPushNotification(
      token: string,
      title: string,
      body: string,
    ): Promise<PushResult>
    ```
    Internally this should support batching — design the function so a future caller (Story 8.4) can pass many tokens and have them chunked into groups of ≤100 per Expo's documented batch limit (`https://exp.host/--/api/v2/push/send` accepts an array body). For this story, implement and test the single-token path; structure the chunking logic as a small internal helper (e.g. `chunk<T>(arr: T[], size: number): T[][]`) so 8.3/8.4 reuse it rather than re-deriving it.
  - [x] 4.2 Map Expo ticket `DeviceNotRegistered` to `{ ok: false, signal: 'PruneToken' }`; map `InvalidCredentials` to `{ ok: false, signal: 'Unknown' }` — it signals a project-wide FCM/APNs credential misconfiguration, not a dead token, and must never trigger pruning (see Dev Notes "InvalidCredentials is not a token problem"); network/fetch failures (timeout, non-2xx, malformed response) to `{ ok: false, signal: 'RetryLater' }`; anything else not covered above to `{ ok: false, signal: 'Unknown' }`.
  - [x] 4.3 No `Deno.test` pattern exists yet in `supabase/functions/` — this story introduces it. Create `supabase/functions/_shared/expoPush.test.ts` using `Deno.test()`, mocking `fetch` to cover: success, `DeviceNotRegistered` → `PruneToken`, `InvalidCredentials` → `Unknown`, network error → `RetryLater`, and the chunking helper with >100 inputs.
- [x] Task 5: Settings screen — "Enable reminders" card (AC: 7)
  - [x] 5.1 Add a new section to `apps/mobile/app/(app)/settings/index.tsx` following the existing `sectionTitle` + `row` pattern (see `styles.sectionTitle` / `styles.row` at lines 102–115) — do not introduce a new card component; this screen uses flat row/section composition, not a card-list pattern.
  - [x] 5.2 Permission state derivation: call `Notifications.getPermissionsAsync()` on mount (and on foreground via the `AppState` pattern) to compute one of three states — `not-yet-requested` (`status === 'undetermined'`), `enabled` (`status === 'granted'`), `disabled` (`status === 'denied'`). Render distinct row label text per state via `t('settings.reminders.<state>')`.
  - [x] 5.3 Tap handler: if `not-yet-requested`, call `Notifications.requestPermissionsAsync()`; if `granted` after the call, trigger `usePushRegistration`'s registration path immediately (do not wait for the next foreground event). If `disabled` (previously denied — iOS/Android will not re-prompt), call `Linking.openSettings()` to deep-link to OS settings.
  - [x] 5.4 After returning from `Linking.openSettings()`, the existing `AppState` `'active'` trigger re-evaluates permission state — no separate handler needed, reuse Task 3.3's listener.
  - [x] 5.5 Add new i18n keys under `settings.reminders.*` in `apps/mobile/src/i18n/locales/en.json` and `hi.json` (the project enforces no hardcoded UI strings via the `i18next/no-literal-string` ESLint rule in `apps/mobile/.eslintrc.js`): `title`, `notYetRequested`, `enabled`, `disabled`.
- [x] Task 6: Tests
  - [x] 6.1 `packages/supabase/__tests__/` — test for `registerPushToken` (upsert call shape, conflict target, error mapping).
  - [x] 6.2 `supabase/functions/_shared/expoPush.test.ts` — see 4.3.
  - [x] 6.3 `apps/mobile` — co-located test for the Settings screen covering all three permission-state renders and the tap handler branching (request vs. deep-link). Co-located test for `usePushRegistration` covering the foreground re-registration guard logic (concurrency guard, cancelled flag — per the async useEffect pattern).
  - [x] 6.4 Run `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test` before marking complete.

## Dev Notes

### Critical scope boundary

This story builds **registration infrastructure only**. No Edge Function in this story calls `sendPushNotification` — that's Stories 8.3 (deferred) and 8.4. AC 6 documents a contract the *next* story's Edge Function must follow; it is not implemented as a caller here. Do not build a `notify-*` Edge Function in this story.

### PRD permission-timing constraint — do not violate

PRD (line ~362, Permissions Required section): *"permission request is triggered after the user completes their first full ERP session, not at app launch or account creation; if denied, in-app nudges serve as the fallback and no further OS-level permission prompts are shown."*

This story's AC 7 only specifies a **manual** trigger (user taps the Settings card). No AC in this story requests an automatic post-first-session prompt — that trigger point is not specified anywhere in Epic 8's stories as currently written. **Do not add an automatic permission prompt** anywhere in this story (e.g., do not call `requestPermissionsAsync()` from the ERP debrief screen or session-completion flow) — that would violate "no further OS-level permission prompts are shown" if it fires more than once, and there is no AC defining the exact trigger point or copy. If this gap matters before MVP ships, it needs a product decision (correct-course), not an inferred implementation in this story. Build only the Settings-card-triggered path.

### Edge Function security checklist — does NOT apply here in full

`expoPush.ts` is a shared helper module, not an HTTP-serving `index.ts` Edge Function — it has no `Deno.serve()`, no CORS, no JWT extraction. The Edge Function Security Pre-Flight Checklist (method guards, Bearer token extraction, etc.) is for the *callers* of this helper (Stories 8.3/8.4's `index.ts` files), not this story. Do not add `Deno.serve()` scaffolding to `expoPush.ts`.

### Notification payload rule (ADR-008)

*"All push notification payloads must be content-neutral — app name, badge count, or generic call-to-action only. No therapy-context, session state, or clinical content in the payload."* `sendPushNotification(token, title, body)` is a generic transport function and does not enforce this itself — the constraint binds the *callers* (8.3/8.4) who choose `title`/`body` text. No action needed in this story beyond being aware the function will be used this way.

### InvalidCredentials is not a token problem (spec review decision)

ADR-008's notification design wasn't explicit about this, and the original draft of AC 5 mapped `InvalidCredentials` to `PruneToken` alongside `DeviceNotRegistered`. This was caught in spec review and corrected: `InvalidCredentials` indicates a project-wide FCM/APNs credential misconfiguration, not a single dead token. If a future caller (8.3/8.4) treated it as `PruneToken`, a single bad credential rotation would cause that cron run to mass-delete every token it touches instead of surfacing the error — turning a recoverable ops incident into users silently losing notifications until they reopen the app and re-register. `InvalidCredentials` now maps to `{ ok: false, signal: 'Unknown' }` (AC 5, Task 4.2) — callers should log/alert on `Unknown`, not delete. Do not remap this back to `PruneToken`.

### ADR-008 table naming — known drift, tracked not blocking

ADR-008's "Push Notification Idempotency" rule (`core-architectural-decisions.md` line 106) refers to tables named `notifications_sent` and `device_tokens`; this story builds `device_push_tokens` with hard-DELETE pruning instead of a status-update column, and no idempotency-log table. This is intentional, not an oversight: idempotency (dedup of repeated sends) is a concern for the *sender* (Stories 8.3/8.4), not for token registration. Building an idempotency-log schema now would mean guessing at its shape before either consumer is scoped. ADR-008 has been updated to reference `device_push_tokens` (see architecture doc); the idempotency-log table design is explicitly deferred to Story 8.3 — that story must either design `notifications_sent` (or equivalent) or document why it isn't needed.

### Migration convention — read before writing SQL

This repo's grant model is **not** "withhold grants to enforce RLS" — it's "grant full CRUD to `anon, authenticated, service_role`, then let RLS policies do the restricting" (see `0024_grant_table_permissions.sql`'s header comment). The *absence* of an UPDATE/DELETE **policy** is what blocks authenticated users, not a missing GRANT. Match this exactly — do not write a narrower GRANT statement than the established convention, and do not skip the GRANT line (every prior migration that skipped it broke `supabase db reset` until 0024 backfilled it).

Next migration number is **0028** (last is `0027_fear_ladder_items_delete_audit.sql`).

### Edge Function `_shared/` pattern

`supabase/functions/_shared/` currently has `auth.ts`, `cors.ts`, `types.ts` — all Deno-native, zero monorepo imports (Edge Functions cannot import from `packages/*`). `expoPush.ts` joins this directory under the same constraint: no `@exposure-buddy/*` imports, Deno-style remote imports only (`https://esm.sh/...` if any external dep is needed — `fetch` is global in Deno, no SDK needed for the Expo Push API, it's a plain HTTPS POST to `https://exp.host/--/api/v2/push/send`).

No `Deno.test` pattern exists anywhere in the repo yet — this is new ground, not a deviation. Use `Deno.test('description', async () => {...})` and `Deno.test.step` if needed for batching sub-cases; assert via `https://deno.land/std/assert/mod.ts` (check the Deno std version other Deno code in this repo pins, or use the version current as of SDK 54 — see Latest Tech Information).

### Settings screen — no card component, no notifications.tsx route

The architecture's directory listing (`project-structure-boundaries.md`) shows a planned `apps/mobile/app/(app)/settings/notifications.tsx` route, but it **does not exist** in the repo and AC 7 places the "Enable reminders" card directly in `settings/index.tsx` (the only settings screen that currently exists). Follow the AC and the real codebase, not the aspirational tree diagram — add the card as a new section in `index.tsx`. Do not create `notifications.tsx`.

`settings/index.tsx` is a flat `View` with `sectionTitle`/`row` `StyleSheet` patterns (no card component anywhere in the codebase to reuse) — see the full current file for the exact composition to extend (`apps/mobile/app/(app)/settings/index.tsx:41-87` for JSX, `:89-131` for styles).

### Platform detection — new pattern

No `Platform.OS` usage exists anywhere in `apps/mobile/src` or `apps/mobile/app` today. This story introduces it (`import { Platform } from 'react-native'`). Straightforward, but flagging since "is there a pattern to follow" has no prior answer in this codebase — there isn't one yet.

### AppState foreground pattern — reuse, don't duplicate

`apps/mobile/app/(app)/_layout.tsx:42-49` already has an `AppState.addEventListener('change', ...)` effect for session-token refresh (ADR-008 §5b). Task 3.3 and Task 5.4 both need a foreground trigger — prefer **extending this existing listener** (adding the push-registration and permission-recheck calls inside the same `state === 'active'` branch) over registering a second independent `AppState` listener, to avoid two listeners doing similar bookkeeping in the same file. If hook composition makes a single shared listener awkward, a second listener is acceptable but must still follow the identical `addEventListener`/`sub.remove()` cleanup shape.

### EAS / projectId — already available, no new config

`apps/mobile/app.config.ts` already defines `extra.eas.projectId` (`1d801bb9-44e2-4693-8fb6-6ce7eca54f8e`) for EAS Build. `Notifications.getExpoPushTokenAsync({ projectId })` reads this same value via `Constants.expoConfig?.extra?.eas?.projectId` (the `expo-constants` package is already a dependency) — no new config needed, just read what's there.

`google-services.json` is already present at `apps/mobile/google-services.json` (Android FCM credentials configured). No equivalent iOS APNs key setup is visible in this story's scope — if `getExpoPushTokenAsync` fails on iOS in EAS builds due to missing APNs credentials, that's an EAS/infra configuration task outside this story's file changes (flag it in Completion Notes if hit, don't attempt to provision APNs keys as part of this story).

### Transform layer — new entity checklist

`device_push_tokens` is a new DB entity. Per the "New entity transform checklist" (`implementation-patterns-consistency-rules.md`), a full bidirectional mapper + round-trip test is normally required (`packages/supabase/src/mappers/`, `packages/core/src/types/`). **This story's data flow doesn't need one**: writes are a one-shot upsert with no read-back/display anywhere in the app (no screen lists or shows push tokens), so there's no camelCase domain type consumed by UI. Keep `registerPushToken`'s params as a plain inline object type in `push-tokens.ts` rather than building out the full mapper/domain-type/test quartet for a write-only, UI-invisible table — this is a deliberate scope-down, not an oversight. If a future story needs to *read* `device_push_tokens` (e.g., an admin view), build the mapper then.

### Settings screen state-management note

Per `implementation-patterns-consistency-rules.md` State Management Patterns: this is a single-screen flow with a small number of independent flags (permission state, loading) — `useState` is correct here, not `useReducer` (the reducer threshold is multi-step flows with values that must stay consistent together, which doesn't apply to a single permission-state enum + loading flag).

## Project Structure Notes

- New file: `supabase/migrations/0028_device_push_tokens.sql`
- New file: `supabase/functions/_shared/expoPush.ts` + `expoPush.test.ts`
- New file: `packages/supabase/src/functions/push-tokens.ts`
- Modified: `packages/supabase/src/index.ts` (export `registerPushToken`)
- New file: `apps/mobile/src/hooks/usePushRegistration.ts` (+ co-located test)
- Modified: `apps/mobile/app/(app)/settings/index.tsx` (+ existing `index.test.tsx`)
- Modified: `apps/mobile/app/(app)/_layout.tsx` (extend or add `AppState` listener)
- Modified: `apps/mobile/app.config.ts` (add `expo-notifications` plugin)
- Modified: `apps/mobile/package.json` (add `expo-notifications` dependency)
- Modified: `apps/mobile/src/i18n/locales/en.json`, `hi.json` (add `settings.reminders.*` keys)
- Regenerated: `packages/supabase/src/database.types.ts` (via `supabase gen types`)
- **Deviation from architecture tree diagram:** `apps/mobile/app/(app)/settings/notifications.tsx` shown in `project-structure-boundaries.md` does not exist and is not created by this story — AC 7 places the card in the existing `settings/index.tsx` instead. See Dev Notes.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.1, lines 1649-1706]
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#ADR-008 — Supabase API Layer, Notification Payload Rule, Push Notification Idempotency]
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Edge Function Security Pre-Flight Checklist, Async useEffect Patterns, State Management Patterns, New entity transform checklist]
- [Source: _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md#Complete Project Directory Structure — Notifications delivery layer note]
- [Source: _bmad-output/planning-artifacts/prd.md — Permissions Required section (push notification permission timing), FR-NOTIF-01/02/03]
- [Source: supabase/migrations/0013_fear_ladder_items.sql — RLS migration template]
- [Source: supabase/migrations/0024_grant_table_permissions.sql — grant model]
- [Source: supabase/functions/_shared/auth.ts, cors.ts — existing _shared/ conventions]
- [Source: apps/mobile/app/(app)/_layout.tsx:42-49 — AppState foreground pattern]
- [Source: apps/mobile/app/(app)/settings/index.tsx — Settings screen structure]
- [Source: apps/mobile/app.config.ts — existing plugins array, extra.eas.projectId]
- [Source: packages/core/src/constants/kvKeys.ts — confirmed no new KV_KEYS entries needed for this story (Story 8.2 adds reminder-time keys)]

## Latest Tech Information

- **Expo SDK 54 / React Native 0.81 (ADR-RN-VERSION, pinned)** — verify `expo-notifications` version against the SDK 54 compatibility table before adding to `package.json` (run `npx expo install expo-notifications` from `apps/mobile/` so Expo's CLI resolves the SDK-54-compatible version automatically rather than hand-picking a version).
- **Expo Push API endpoint:** `https://exp.host/--/api/v2/push/send` — accepts a JSON array body of message objects (`{ to, title, body, ... }`), max 100 per request (the AC's "chunks of ≤100" requirement). Response is a `data` array of per-message "tickets"; ticket `status: 'error'` with `details.error` of `DeviceNotRegistered` is the standard "token is dead, prune it" signal. `InvalidCredentials` indicates FCM/APNs credential misconfiguration on the Expo project — also treated as PruneToken per this story's AC, though in practice it's a project-config error rather than a single-token problem (note this in code comments if implementing, since the AC's mapping conflates two different failure causes under one signal).
- **`getExpoPushTokenAsync` requires `projectId`** as of SDK 49+ (the bare `experienceId` path is long deprecated) — confirmed this repo already has `extra.eas.projectId` set up for this.
- **Android:** requires `google-services.json` (present) for FCM; **iOS:** requires an APNs key uploaded to the Expo project (`eas credentials`) — not a code change, infra-only, out of this story's file scope per Dev Notes above.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `supabase db reset` applied migration `0028_device_push_tokens.sql` cleanly on first attempt; `supabase gen types typescript --local` initially captured a stray "Connecting to db 5432" CLI banner line into `database.types.ts` (redirected stdout without `2>/dev/null`), which broke `tsc` with `TS1434` — fixed by regenerating with stderr suppressed.
- Deno was not installed in the dev environment; installed via `brew install deno` (v2.8.3) to actually run the new `expoPush.test.ts` Deno test suite rather than leaving it unverified.
- `pnpm turbo lint` initially failed on 11 `i18next/no-literal-string` violations in `settings/index.tsx` and `usePushRegistration.ts` — these are internal state-machine string literals (`'granted'`, `'ios'`, etc.), not user-facing text. Resolved with `eslint-disable-next-line i18next/no-literal-string` comments, matching the existing convention used in `apps/mobile/app/(app)/_layout.tsx` for the same class of literal.
- `Linking.openSettings` mock in the Settings screen test initially used `mockImplementation(() => {})`, which failed `tsc` because the real signature returns `Promise<void>`; switched to `mockResolvedValue()`.
- Several Settings screen tests produced a React "not wrapped in act(...)" warning because `refreshReminderState`'s promise resolved after the synchronous `render()` call returned; added `await act(async () => {})` after each render to flush the mount-effect microtask deterministically.

### Completion Notes List

- Task 1: Added `supabase/migrations/0028_device_push_tokens.sql` (table, RLS select/insert-own policies, unique index on `token`, secondary index on `user_id`, standard PostgREST grant line, table comment). Verified via `supabase db reset` (clean apply) and regenerated `packages/supabase/src/database.types.ts`.
- Task 2: Added `registerPushToken` in `packages/supabase/src/functions/push-tokens.ts` (raw upsert, `onConflict: 'token'`, throws raw Supabase error on failure per the `call-edge-fn.ts` convention) and exported it from the package's `functions/index.ts` and top-level `index.ts`. Unit tested with a mocked `createSupabaseClient`.
- Task 3: Added `expo-notifications@~0.32.17` (via `npx expo install`, SDK-54-resolved) and the `expo-notifications` Expo config plugin. Built `usePushRegistration` hook: checks `getPermissionsAsync()` before ever calling `getExpoPushTokenAsync`/`registerPushToken` (never requests permission itself), tracks "registered this session" via a ref to gate the AC4 foreground re-registration trigger, owns its own `AppState` listener (the Dev Notes' explicitly-permitted "second listener" option, kept the hook self-contained and independently testable), and exposes `registerNow()` so the Settings card (Task 5) can trigger immediate registration after a fresh grant. Wired into `apps/mobile/app/(app)/_layout.tsx` via `usePushRegistration(userId)`.
- Task 4: Added `supabase/functions/_shared/expoPush.ts` — `sendPushNotification` (single-token, generic `fetch` to the Expo push endpoint) and an exported `chunk<T>` helper for future multi-token batching (Stories 8.3/8.4). Ticket mapping: `DeviceNotRegistered` → `PruneToken`; `InvalidCredentials` → `Unknown` (per the story's spec-review correction — never `PruneToken`, to avoid mass-deleting tokens during a credential outage); any other error ticket → `Unknown`; network/fetch throw, non-2xx, or malformed JSON → `RetryLater`. Verified with 10 Deno tests (mocked `fetch`) covering every branch plus the chunking helper's boundary behavior.
- Task 5: Added the "Enable reminders" section to `settings/index.tsx` using the existing `sectionTitle`/`row` pattern (no new card component). Permission state derivation handles all three known statuses plus the AC7 edge case (unexpected status value or a throwing `getPermissionsAsync()` — both fall back to `not-yet-requested` with a `console.warn`, no crash). Tap handler branches: `not-yet-requested` → `requestPermissionsAsync()`, then `registerNow()` immediately if granted; `disabled` → `Linking.openSettings()`; `enabled` → no-op. A second `AppState` listener in the screen re-evaluates permission state on foreground, which also covers the post-`openSettings()` return path (Task 5.4) without a separate handler. Added `settings.reminders.{title,notYetRequested,enabled,disabled}` to `en.json` and `hi.json`.
- Task 6: Added co-located tests for all new code: `packages/supabase/__tests__/push-tokens.test.ts` (2 tests), `supabase/functions/_shared/expoPush.test.ts` (10 Deno tests), `apps/mobile/src/hooks/usePushRegistration.test.ts` (7 tests), and extended `apps/mobile/app/(app)/settings/index.test.tsx` (+9 tests for the reminders card). Full validation run: `pnpm turbo typecheck` (10/10 tasks pass), `pnpm turbo lint` (clean after the literal-string fixes above), `pnpm turbo test` (293 mobile + 29 supabase + 23 sync + 53 core tests pass), plus `deno test --allow-net supabase/functions/_shared/expoPush.test.ts` (10/10 pass, run separately since Deno Edge Functions are outside the turbo/pnpm graph).
- Scope note: per the story's explicit boundary, no Edge Function in this story calls `sendPushNotification` — AC6's `PruneToken`-handling contract is documented but has no caller yet (Stories 8.3/8.4). No automatic post-first-session permission prompt was added anywhere (PRD constraint) — only the manual Settings-card trigger from AC7.
- Flag for follow-up (not a defect in this story): per Dev Notes, iOS APNs credential provisioning (`eas credentials`) is infra-only and out of this story's file scope — not attempted here.

### File List

- `supabase/migrations/0028_device_push_tokens.sql` (new)
- `packages/supabase/src/database.types.ts` (regenerated)
- `packages/supabase/src/functions/push-tokens.ts` (new)
- `packages/supabase/src/functions/index.ts` (modified — export `registerPushToken`)
- `packages/supabase/src/index.ts` (modified — export `registerPushToken`)
- `packages/supabase/__tests__/push-tokens.test.ts` (new)
- `supabase/functions/_shared/expoPush.ts` (new)
- `supabase/functions/_shared/expoPush.test.ts` (new)
- `deno.lock` (new — first Deno test in the repo)
- `apps/mobile/src/hooks/usePushRegistration.ts` (new)
- `apps/mobile/src/hooks/usePushRegistration.test.ts` (new)
- `apps/mobile/app/(app)/_layout.tsx` (modified — wires `usePushRegistration(userId)`)
- `apps/mobile/app/(app)/settings/index.tsx` (modified — "Enable reminders" card)
- `apps/mobile/app/(app)/settings/index.test.tsx` (modified — reminders card tests + act-warning fixes for pre-existing tests)
- `apps/mobile/app.config.ts` (modified — `expo-notifications` plugin)
- `apps/mobile/package.json` (modified — `expo-notifications` dependency)
- `apps/mobile/src/i18n/locales/en.json` (modified — `settings.reminders.*` keys)
- `apps/mobile/src/i18n/locales/hi.json` (modified — `settings.reminders.*` keys)
- `pnpm-lock.yaml` (modified — `expo-notifications` and transitive deps)

## Change Log

- 2026-06-20: Story implemented — `device_push_tokens` migration, `registerPushToken` upsert service, `usePushRegistration` mobile hook with foreground re-registration, shared `expoPush.ts` Edge Function helper (chunking + ticket-error mapping), and the Settings "Enable reminders" card. All tasks complete, full regression suite green (`pnpm turbo typecheck/lint/test` + `deno test`). Status → review.
