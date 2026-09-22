# Story 15.2: Hide Dev Sign-In Shortcut When Pointed at Hosted Supabase

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a security-conscious team,
I want the "DEV: Sign in as test user" shortcut to never render when the app is configured against the hosted Supabase project,
so that the dev-only affordance is never shown to external beta testers, even though the credential it used has already been rotated (Story 15.1).

## Context

Split 2026-09-22 from the original combined "Story 15.1" — the code half, now that Story 15.1's credential rotation has already closed the more serious (bundle-extraction) exposure. This story is no longer time-critical from a security standpoint; it's ordinary code cleanup to stop the UI from advertising a dev-only affordance to testers. Full epic rationale: `_bmad-output/planning-artifacts/epics.md` → "Epic 15: Auth Safety Hardening for Hosted-Backend Builds".

The dev/test sign-in shortcut on the sign-in screen (Story 10.1 Task 5) is gated only on `__DEV__ || EXPO_PUBLIC_APP_VARIANT === 'preview'` — it has no awareness of which backend is configured. Both the EAS `preview` build profile and local `.env.local` now point `EXPO_PUBLIC_SUPABASE_URL` at the hosted Supabase project (`https://jhbtzsvlgglyfbrgmpsb.supabase.co`) instead of a local/ephemeral instance, so the shortcut currently renders against hosted in both the distributed preview APK and any local dev build.

**Scope boundary (do not exceed):** this story only changes whether the button renders. It does NOT remove the shortcut itself (still valuable against a genuinely local/ephemeral Supabase instance), touch the hardcoded credential string (already rotated on the hosted side by Story 15.1 — the client string stays `DevTest123!` so local dev keeps working), or audit for other `__DEV__`-gated affordances elsewhere in the app.

## Acceptance Criteria

1. A new local helper, `isLocalSupabaseUrl(url: string | undefined): boolean`, is added in `apps/mobile/app/(auth)/sign-in.tsx`. It returns `true` only for known local/loopback Supabase hosts — `127.0.0.1` (local dev) and `10.0.2.2` (Android emulator, per the `e2e` build profile's `EXPO_PUBLIC_SUPABASE_URL` in `eas.json`) — and `false` for everything else, including any `*.supabase.co` hostname or an unset/empty URL. **Fail closed**: an unset/undefined URL must return `false` (button hidden), not `true`.
2. The shortcut's render condition changes from `(__DEV__ || variant === 'preview') ? <Button/> : null` to `(__DEV__ || variant === 'preview') && isLocalSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL) ? <Button/> : null`. The existing `__DEV__`/variant gate is preserved unchanged; the new hosted-URL check is an additional, unconditional AND — never bypassable by either existing condition alone.
3. No change is made to the button's `onPress` handler or the hardcoded `test1@test.com` / `DevTest123!` string literals — only the render condition changes. (The hosted account's actual password was already rotated by Story 15.1; this string staying in the client code is expected and fine — it's dead against hosted now, and still needed for local dev.)
4. `apps/mobile/app/(auth)/sign-in.test.tsx` gets new tests asserting:
   - (a) button absent when `EXPO_PUBLIC_SUPABASE_URL` is mocked as a hosted URL (`https://jhbtzsvlgglyfbrgmpsb.supabase.co` or any other `*.supabase.co` value), regardless of `EXPO_PUBLIC_APP_VARIANT`
   - (b) button present when `EXPO_PUBLIC_SUPABASE_URL` is mocked as `http://127.0.0.1:54321` (regression guard for today's already-working local-dev case)
   - (c) button absent when `EXPO_PUBLIC_SUPABASE_URL` is unset/undefined (fail-closed case)
5. `pnpm turbo typecheck lint test` passes clean with no regressions to `sign-in.test.tsx`'s existing coverage.
6. Dev-story completion notes must flag that a NEW preview build should be cut and redistributed to already-invited beta testers once this story ships, so the UI itself stops showing a dev-only affordance to external testers — not urgent from a security angle (Story 15.1 already rotated the credential), but should still happen for cleanliness.

## Tasks / Subtasks

- [ ] Task 1 — Add the local-URL helper (AC: #1)
  - [ ] Add `isLocalSupabaseUrl(url: string | undefined): boolean` to `sign-in.tsx`, checking for `127.0.0.1` / `10.0.2.2` substrings/hostnames, returning `false` for anything else including unset
- [ ] Task 2 — Gate the shortcut (AC: #2, #3)
  - [ ] Update the button's render condition to AND in `isLocalSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL)`
  - [ ] Verify no other code inside the button block changes
- [ ] Task 3 — Tests (AC: #4, #5)
  - [ ] Add the three new test cases (hosted-hidden, local-shown, unset-hidden)
  - [ ] Run `pnpm turbo typecheck lint test`, confirm zero regressions
- [ ] Task 4 — Completion notes (AC: #6)
  - [ ] Explicitly note in Dev Agent Record → Completion Notes that a fresh preview build + tester redistribution is a nice-to-have follow-up (not urgent — credential already rotated)

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

- `http://127.0.0.1:54321` — local Supabase CLI (`supabase start`)
- `http://10.0.2.2:54321` — Android emulator's loopback alias to the host machine, used in `apps/mobile/eas.json`'s `e2e` build profile
- Everything else — including the hosted project `https://jhbtzsvlgglyfbrgmpsb.supabase.co` and any future hosted/staging project — must be treated as non-local

Implement as a simple substring/hostname check (e.g. `url.includes('127.0.0.1') || url.includes('10.0.2.2')`), not a full URL allowlist — no other local host patterns exist in this codebase today. Keep it inline in `sign-in.tsx` (not extracted to `packages/core`) — it has exactly one call site and no other consumer; extracting it would be premature abstraction.

### Testing standard

Follow `sign-in.test.tsx`'s existing test structure and mocking conventions exactly (it does not currently mock `process.env.EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_APP_VARIANT` at all — this story is the first to need that; set them via `process.env.X = '...'` in each test, per Jest's standard env-var mutation pattern, and restore in `afterEach` if any existing test in this file already establishes that pattern for other env vars — check first before introducing a new cleanup mechanism). Note: `__DEV__` defaults to `true` under the RN Jest preset, so tests for the hosted-hidden and unset-hidden cases rely entirely on the new `isLocalSupabaseUrl` check to hide the button, not on `__DEV__`.

### Explicitly out of scope (do not implement)

- Removing the shortcut entirely
- Any change to the hardcoded credential string (already rotated on the hosted side by Story 15.1)
- Auditing other `__DEV__`-gated code paths in the app
- Any change to `createSupabaseClient()` or the sign-in submission logic

### Project Structure Notes

- Single file touched: `apps/mobile/app/(auth)/sign-in.tsx` (plus its test file). No new files, no `packages/*` changes, no monorepo boundary implications.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` § "Epic 15: Auth Safety Hardening for Hosted-Backend Builds" / "Story 15.2"]
- [Source: `apps/mobile/app/(auth)/sign-in.tsx`]
- [Source: `apps/mobile/eas.json` — `e2e` profile's `EXPO_PUBLIC_SUPABASE_URL: http://10.0.2.2:54321`]
- [Source: `_bmad-output/implementation-artifacts/15-1-rotate-hosted-dev-test-account-credential.md` — the already-completed credential rotation this story's `onPress` handler now points at]

## Dev Agent Record

### Agent Model Used

_(to be filled in by dev-story)_

### Debug Log References

### Completion Notes List

### File List
