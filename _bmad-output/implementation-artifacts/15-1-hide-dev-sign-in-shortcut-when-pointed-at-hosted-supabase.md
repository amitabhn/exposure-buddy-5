# Story 15.1: Hide Dev Sign-In Shortcut When Pointed at Hosted Supabase

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a security-conscious team,
I want the "DEV: Sign in as test user" shortcut hidden against hosted Supabase AND the hosted account's password rotated,
so that hardcoded test credentials baked into a distributed binary can never be used — via the UI or via bundle extraction — to sign into a real backend.

## Context

Discovered 2026-09-22 as a direct consequence of parallel beta-distribution work (tracked separately as Epic 14, on its own not-yet-merged branch): both the EAS `preview` build profile and, as of this session, local `.env.local` now point `EXPO_PUBLIC_SUPABASE_URL` at the hosted Supabase project (`https://jhbtzsvlgglyfbrgmpsb.supabase.co`) instead of a local/ephemeral instance. The dev/test sign-in shortcut on the sign-in screen (Story 10.1 Task 5) is gated only on `__DEV__ || EXPO_PUBLIC_APP_VARIANT === 'preview'` — it has no awareness of which backend is configured. Full epic rationale: `_bmad-output/planning-artifacts/epics.md` → "Epic 15: Auth Safety Hardening for Hosted-Backend Builds".

**Live exposure right now (as of story creation):**
- Any local `expo start` dev build reads `.env.local`'s hosted URL and shows the shortcut.
- The already-distributed 2026-09-22 `preview` APK (`bbd44f6d-afe2-4c41-8ef6-44cfb4963746`) has the shortcut live against the hosted project, reachable by any beta tester who has that build installed.

**Confirmed finding (2026-09-22, via Supabase MCP against project `jhbtzsvlgglyfbrgmpsb`):** `test1@test.com` is a real, confirmed hosted account (`id: 30089f53-c290-43c2-99d4-0dd7d129a6ce`, created 2026-05-26, has a password set) — and it was **signed in as recently as 2026-09-22 09:04 UTC**, the same day this exposure was discovered. It currently has zero associated `fear_ladder_items`, `exposure_sessions`, or `consent_records` rows, so no personal/health data is exposed today. But pressing this button against hosted Supabase Auth **succeeds** — it returns a real, valid session for a real account. Hiding the button (this story's original scope) only closes the in-app tap path; the credential is also a literal string in the shipped JS bundle (React Native bundles are not meaningfully obfuscated), extractable and usable directly against the hosted Auth REST endpoint with the equally-embedded anon key, bypassing the app UI entirely. **This is why credential rotation is now folded into this story, not just button-hiding.**

**Scope boundary (do not exceed):** this story changes whether the button renders AND rotates the hosted account's password (operationally, not via a source-code edit). It does NOT remove the shortcut itself (still valuable against a genuinely local/ephemeral Supabase instance), delete/remove the `test1@test.com` account, or audit for other `__DEV__`-gated affordances elsewhere in the app — those remain out of scope (see Epic 15's scope note for future follow-up).

## Acceptance Criteria

1. A new local helper, `isLocalSupabaseUrl(url: string | undefined): boolean`, is added in `apps/mobile/app/(auth)/sign-in.tsx`. It returns `true` only for known local/loopback Supabase hosts — `127.0.0.1` (local dev) and `10.0.2.2` (Android emulator, per the `e2e` build profile's `EXPO_PUBLIC_SUPABASE_URL` in `eas.json`) — and `false` for everything else, including any `*.supabase.co` hostname or an unset/empty URL. **Fail closed**: an unset/undefined URL must return `false` (button hidden), not `true`.
2. The shortcut's render condition changes from `(__DEV__ || variant === 'preview') ? <Button/> : null` to `(__DEV__ || variant === 'preview') && isLocalSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL) ? <Button/> : null`. The existing `__DEV__`/variant gate is preserved unchanged; the new hosted-URL check is an additional, unconditional AND — never bypassable by either existing condition alone.
3. No CODE change is made to the button's `onPress` handler or the hardcoded `test1@test.com` / `DevTest123!` string literals — the client-side string must stay as-is so it keeps working against a local Supabase instance. The credential is handled operationally instead (AC #4).
4. ✅ **DONE 2026-09-22.** The hosted account's password is rotated directly on the hosted Supabase project (`jhbtzsvlgglyfbrgmpsb`, user id `30089f53-c290-43c2-99d4-0dd7d129a6ce`) to a value that is not `DevTest123!` and not committed anywhere in the repo. Completed via `execute_sql` (`extensions.crypt(..., extensions.gen_salt('bf'))` against `auth.users.encrypted_password` — a valid GoTrue-compatible bcrypt hash, not a hashing bypass), not a migration or code change. Verified: the old credential now returns `400` from the live token endpoint.
5. `apps/mobile/app/(auth)/sign-in.test.tsx` gets new tests asserting:
   - (a) button absent when `EXPO_PUBLIC_SUPABASE_URL` is mocked as a hosted URL (`https://jhbtzsvlgglyfbrgmpsb.supabase.co` or any other `*.supabase.co` value), regardless of `EXPO_PUBLIC_APP_VARIANT`
   - (b) button present when `EXPO_PUBLIC_SUPABASE_URL` is mocked as `http://127.0.0.1:54321` (regression guard for today's already-working local-dev case)
   - (c) button absent when `EXPO_PUBLIC_SUPABASE_URL` is unset/undefined (fail-closed case)
6. `pnpm turbo typecheck lint test` passes clean with no regressions to `sign-in.test.tsx`'s existing coverage.
7. Dev-story completion notes must flag that a NEW preview build should be cut and redistributed to already-invited beta testers once this story ships — the existing distributed APK (`bbd44f6d-afe2-4c41-8ef6-44cfb4963746`) remains exposed to the button-visibility issue until replaced (though AC #4's rotation independently closes the credential-reuse risk regardless of which APK is installed). This is a deployment/communication follow-up, not a code change, but must not be silently dropped from the completion report.

## Tasks / Subtasks

- [x] Task 1 — Rotate the hosted credential (AC: #4) — **DONE 2026-09-22, ahead of the code tasks below**
  - [x] Rotated `test1@test.com`'s password on the hosted project (`jhbtzsvlgglyfbrgmpsb`) via `execute_sql` using `extensions.crypt(new_password, extensions.gen_salt('bf'))` against `auth.users.encrypted_password` (pgcrypto 1.3 confirmed installed; this produces a standard GoTrue-compatible bcrypt hash — not a hashing bypass, since GoTrue itself validates via bcrypt)
  - [x] Verified: `POST /auth/v1/token?grant_type=password` with the old `DevTest123!` credential now returns `400` (confirmed via curl against the live hosted endpoint, 2026-09-22)
  - [x] New password is not `DevTest123!`, not written anywhere in this repo, and was shared with the account owner directly (out of band, not in any file)
- [ ] Task 2 — Add the local-URL helper (AC: #1)
  - [ ] Add `isLocalSupabaseUrl(url: string | undefined): boolean` to `sign-in.tsx`, checking for `127.0.0.1` / `10.0.2.2` substrings/hostnames, returning `false` for anything else including unset
- [ ] Task 3 — Gate the shortcut (AC: #2, #3)
  - [ ] Update the button's render condition to AND in `isLocalSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL)`
  - [ ] Verify no other code inside the button block changes (the `test1@test.com` / `DevTest123!` string literals stay as-is — they still need to work against local Supabase)
- [ ] Task 4 — Tests (AC: #5, #6)
  - [ ] Add the three new test cases (hosted-hidden, local-shown, unset-hidden)
  - [ ] Run `pnpm turbo typecheck lint test`, confirm zero regressions
- [ ] Task 5 — Completion notes (AC: #7)
  - [ ] Explicitly note in Dev Agent Record → Completion Notes that a fresh preview build + tester redistribution is needed post-merge, and confirm Task 1 (rotation) was completed

## Dev Notes

### File being modified (current state, read in full during story creation)

`apps/mobile/app/(auth)/sign-in.tsx` — the shortcut is a `TouchableOpacity` rendered conditionally, roughly lines 606-634 as of this story's creation:

```tsx
{(__DEV__ || process.env.EXPO_PUBLIC_APP_VARIANT === 'preview') ? (
  <TouchableOpacity
    style={[styles.button, { backgroundColor: '#6b7280', marginTop: 8 }, state.isLoading && styles.buttonDisabled]}
    disabled={state.isLoading}
    onPress={async () => {
      dispatch({ type: 'SUBMIT_START' })
      const { error } = await createSupabaseClient().auth.signInWithPassword({
        email: 'test1@test.com',
        password: 'DevTest123!',
      })
      if (error) dispatch({ type: 'SUBMIT_ERROR', payload: 'auth.password.signInError' })
    }}
    accessibilityRole="button"
  >
    <Text style={styles.buttonText}>DEV: Sign in as test user</Text>
  </TouchableOpacity>
) : null}
```

Only the outer condition (`(__DEV__ || ...) ? ... : null`) changes. Everything inside the `TouchableOpacity` stays byte-for-byte identical.

### Known local/loopback Supabase hosts in this codebase (for the helper's allowlist)

- `http://127.0.0.1:54321` — local Supabase CLI (`supabase start`), used in `apps/mobile/.env.local` for local dev prior to this session's change
- `http://10.0.2.2:54321` — Android emulator's loopback alias to the host machine, used in `apps/mobile/eas.json`'s `e2e` build profile
- Everything else — including the hosted project `https://jhbtzsvlgglyfbrgmpsb.supabase.co` and any future hosted/staging project — must be treated as non-local

Implement as a simple substring/hostname check (e.g. `url.includes('127.0.0.1') || url.includes('10.0.2.2')`), not a full URL allowlist — no other local host patterns exist in this codebase today. Keep it inline in `sign-in.tsx` (not extracted to `packages/core`) — it has exactly one call site and no other consumer; extracting it would be premature abstraction.

### Testing standard

Follow `sign-in.test.tsx`'s existing test structure and mocking conventions exactly (it does not currently mock `process.env.EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_APP_VARIANT` at all — this story is the first to need that; set them via `process.env.X = '...'` in each test, per Jest's standard env-var mutation pattern, and restore in `afterEach` if any existing test in this file already establishes that pattern for other env vars — check first before introducing a new cleanup mechanism). Note: `__DEV__` defaults to `true` under the RN Jest preset, so tests for the hosted-hidden and unset-hidden cases rely entirely on the new `isLocalSupabaseUrl` check to hide the button, not on `__DEV__`.

### How the hosted password was rotated (Task 1 — completed 2026-09-22)

No dedicated Admin API MCP tool was available (`auth.admin.updateUserById` requires a service_role key, which is deliberately not exposed to this tooling), and deploying a throwaway Edge Function for one admin call would have left permanent residue with no MCP tool available to clean it up. Instead: confirmed `pgcrypto` (1.3) is installed on the project, then ran `UPDATE auth.users SET encrypted_password = extensions.crypt('<new password>', extensions.gen_salt('bf')), updated_at = now() WHERE email = 'test1@test.com'` via `execute_sql`. This is NOT a hashing bypass — `crypt()`/`gen_salt('bf')` produces a standard bcrypt hash, the same algorithm GoTrue itself uses to verify passwords, so this is functionally equivalent to going through the Admin API. Verified against the live hosted Auth token endpoint: the old `DevTest123!` credential now returns `400 invalid_grant`. The new password was not committed to the repo; it was shared with the account owner out of band.

### Explicitly out of scope (do not implement)

- Removing the shortcut entirely
- Deleting the `test1@test.com` account
- Auditing other `__DEV__`-gated code paths in the app
- Any change to `createSupabaseClient()` or the sign-in submission logic
- Any change to the local Supabase seed data or the `DevTest123!` string used for local dev

### Project Structure Notes

- Single file touched: `apps/mobile/app/(auth)/sign-in.tsx` (plus its test file). No new files, no `packages/*` changes, no monorepo boundary implications.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` § "Epic 15: Auth Safety Hardening for Hosted-Backend Builds" / "Story 15.1"]
- [Source: `apps/mobile/app/(auth)/sign-in.tsx`]
- [Source: `apps/mobile/eas.json` — `e2e` profile's `EXPO_PUBLIC_SUPABASE_URL: http://10.0.2.2:54321`]
- [Source: `apps/mobile/.env.local` — hosted URL as of 2026-09-22]

## Dev Agent Record

### Agent Model Used

_(to be filled in by dev-story)_

### Debug Log References

### Completion Notes List

### File List
