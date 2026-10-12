---
title: 'Story 19.8: No Sign-In Flash on Cold Start for a Signed-In User'
type: 'bugfix'
created: '2026-10-12'
status: 'draft'
route: 'dispatch'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** On a cold start, a user who already has a stored session sees the sign-in screen for about 3 s before the session restores and the app redirects to home. Taps in that window land on sign-in controls (found in Story 19.1 device verification). A cold JS start while offline also shows sign-in even with a minutes-old token (found in 19.7 device verification, recorded in `deferred-work.md`), so the cause may be shared.

**Approach:** Find, on a device, which path flips `isLoading` to false (or renders sign-in) before the stored session is confirmed, then make the auth gate hold on a neutral loading state until the restore has produced a definite answer: signed in, or signed out. A stored session must never be shown as signed out because a refresh is slow or the network is down. A session that is genuinely invalid (refresh token rejected) still ends on sign-in, with no change to that outcome.

## Boundaries & Constraints

**Always:** Keep ARC-004: never redirect while `isLoading`. Keep `mmkvReadyRef` guarding the listener. Keep the 18.7 onboarding-decision spinner behaviour in `app/(app)/_layout.tsx`. Cold start stays inside the performance budget (Story 9.7: ~1320 ms measured); the common path (valid, unexpired token) must not get slower. The hold on the loading state must be bounded, so a hung refresh cannot trap the user on a spinner forever.

**Never:** No change to what is stored in MMKV or SecureStore, and no new persisted auth fields. No weakening of sign-out: a rejected refresh token, a `SIGNED_OUT` event and an explicit sign-out all still show sign-in. No reading of onboarding or other per-user state for a user whose session is unconfirmed beyond what `AuthProvider` already does. No schema, RLS or sync change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid stored session, online | Cold start, unexpired access token | Splash, then home; sign-in never rendered | n/a |
| Expired access token, online, slow refresh | Cold start, refresh takes ~3 s | Neutral loading view for the duration; then home; sign-in never rendered | n/a |
| Stored session, offline | Cold start, no network, any token age | Home from the stored session; sign-in never rendered | Refresh retried by supabase-js when the network returns |
| Refresh token rejected | Cold start, server returns an invalid-refresh-token error | Sign-in after the rejection, and stored auth state cleared | Existing `SIGNED_OUT` path |
| No stored session | Fresh install or signed out | Sign-in with no extra delay | n/a |
| Refresh hangs | Network up but request never returns | After the bound (see Open Questions), decide per the chosen policy; never an unbounded spinner | n/a |
| MMKV init failed | `mmkv === null` (degraded mode) | Unchanged: sign-in, as today | n/a |
| Taps during restore | User taps where sign-in controls would be | Nothing sign-in-related is on screen to receive the tap | n/a |

</frozen-after-approval>

## Code Map

- `packages/supabase/src/auth/AuthProvider.tsx` -- bootstrap effect calls `setSession()` for the stored session and keeps `isLoading` true until `onAuthStateChange` fires; its `.catch` sets `isLoading` false with `authState` still the signed-out default, which makes the gate redirect to sign-in. `setSession()` normally resolves with `{ error }` rather than rejecting, so the `.catch` may not be the path that matters; the listener's null-session branch is the other candidate.
- `packages/supabase/src/auth/session.ts` -- `getAuthState(mmkv)` reads the stored session synchronously; `setAuthState`/`clearAuthState`/`signOut`.
- `apps/mobile/app/(app)/_layout.tsx` -- the auth gate effect (`!isLoading && !isAuthenticated` -> `router.replace('/(auth)/sign-in')`); renders `Tabs` while `isLoading`, with only the 18.7 `isDecisionPending` spinner as a neutral view.
- `apps/mobile/app/_layout.tsx` -- tri-state `mmkv` (`undefined` pending, `null` degraded, ready) and splash hide on fonts; `PowerSyncConnectionManager` reads `isLoading` as well.
- `apps/mobile/app/(auth)/sign-in.tsx` -- what the user sees during the flash.
- `packages/supabase/src/client.ts` -- supabase-js client config (`autoRefreshToken`, fetch timeout 30 s).
- `apps/mobile/app/(app)/_layout.test.tsx`, `packages/supabase` auth tests -- where regression tests go.
- `deferred-work.md` -- 19.7 entry "Cold JS start while offline shows the sign-in screen even with a fresh token".

## Tasks & Acceptance

**Execution:**
- [ ] Reproduce on an Android device against hosted (see `project_android_device_testing_recipe`): cold start with (a) a fresh token, (b) an expired access token (wait out the 1 h expiry or edit the stored expiry in a dev build), (c) airplane mode. Add temporary timestamped logs (removed before commit) at: the bootstrap effect, the `.catch`, every `onAuthStateChange` event and session, every `setIsLoading(false)`, and the gate effect redirect. Record in Implementation Notes which event or branch flips `isLoading` false before the session is confirmed, and how long it takes. Exit condition: if the sign-in screen cannot be reproduced in any of (a)-(c), record the evidence and stop; do not guess a fix.
- [ ] `packages/supabase/src/auth/AuthProvider.tsx` -- fix at the cause found above. Candidate shapes, to be chosen after the repro (none is assumed): (1) treat a `setSession` `{ error }` that is a network/retryable error as "unconfirmed, keep loading or restore from the stored session", not as signed out; (2) when a stored session exists, seed `authState` from `getAuthState(mmkv)` so the gate sees a signed-in user while the refresh runs, and let the listener correct it (SIGNED_OUT clears it); (3) hold `isLoading` true until a definite answer, with a bounded timeout that falls back to the stored session when offline.
- [ ] `apps/mobile/app/(app)/_layout.tsx` -- if the cause is a render path rather than the provider, render the same neutral spinner used for `isDecisionPending` while the restore is unresolved, so no tab or sign-in controls are tappable.
- [ ] Tests: AuthProvider unit tests for stored session + slow refresh (isLoading stays true, sign-in never selected), stored session + network error (stays signed in), stored session + invalid refresh token (signed out, state cleared), no stored session (isLoading false at once); an `(app)/_layout` test that the gate does not call `router.replace('/(auth)/sign-in')` while the restore is unresolved.
- [ ] Device-verify on Android against hosted: cases (a)-(c) above plus the invalid-refresh-token case (revoke the session server-side). Record results in Implementation Notes. iOS and TalkBack are noted as unchecked if not run.
- [ ] Update `deferred-work.md`: resolve or re-point the 19.7 "cold JS start while offline" entry.

**Acceptance Criteria:**
- Given a stored valid session and a slow token refresh, when the app cold starts, then sign-in is never rendered and the user lands on home (or the 18.7 onboarding decision) once the restore completes.
- Given a stored session and no network, when the app cold starts, then the user reaches home from the stored session and sign-in is never rendered.
- Given a stored session whose refresh token the server rejects, when the app cold starts, then the user ends on sign-in and stored auth state is cleared.
- Given no stored session, when the app cold starts, then sign-in appears with no added delay.
- Given any cold start, when the restore is unresolved, then no sign-in or tab control is on screen to receive a tap.
- Given a hung refresh, when the bound elapses, then the app leaves the loading state (it does not spin forever).
- Cold start time with a valid unexpired token is not measurably slower than before (compare against the 9.7 figure).

## Decisions and Open Questions

1. **Offline with an expired access token and a stored session:** show home from the stored session (offline-first, consistent with the PowerSync local replica) or keep the user on the loading view until the network returns? **Decided (2026-10-12): home from the stored session**; sync and uploads already tolerate being offline, and the loading view would block an offline-first app.
2. **Bound on the loading state:** how long to wait for a refresh before falling back **Decided (2026-10-12): 5 s, then fall back to the stored session rather than to sign-in**.
3. **Root cause is unconfirmed.** The code reading above gives two candidates (the `.catch` in the bootstrap effect, and the listener's null-session branch); the repro task decides, and the approach is revised if it shows a third.

## Implementation Notes

(empty until the repro is done)

## Spec Change Log

(empty)

## Verification

**Commands:**
- `pnpm turbo typecheck lint test` -- expected: all green
