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

**Approach:** Find, on a device, which path flips `isLoading` to false (or renders sign-in) before the stored session is confirmed, then make the auth gate hold on a neutral state until the restore has produced a definite answer: signed in, or signed out. The neutral state is the native splash screen, held until auth resolves (or the bound elapses), not an in-app spinner. A stored session must never be shown as signed out because a refresh is slow or the network is down. A session that is genuinely invalid (refresh token rejected) still ends on sign-in, with no change to that outcome.

## Boundaries & Constraints

**Always:** Keep ARC-004: never redirect while `isLoading`. Keep `mmkvReadyRef` guarding the listener. Keep the 18.7 onboarding-decision spinner behaviour in `app/(app)/_layout.tsx`. Cold start stays inside the performance budget (Story 9.7: ~1320 ms measured); the common path (valid, unexpired token) must not get slower. The hold on the loading state must be bounded, so a hung refresh cannot trap the user on the splash forever. The bound is 5 s, **starts at `AuthProvider` mount (not when `mmkv` becomes ready, so a hung MMKV init is bounded too)**, and is cancelled by the first definite answer (session or sign-out event).

**Fast path (common case):** if the stored access token's JWT `exp` is still in the future by a margin (60 s), `isLoading` is released at once from the stored session, with no wait on the network. Auth-js's `setSession` makes a `/user` round trip even for an unexpired token, so without this the splash would be gated on the network and the cold-start budget would be missed. The confirming `setSession` still runs in the background; its failure follows the error rules below. Only expired-token and offline starts wait on the splash hold.

**Error classification (single rule, used everywhere):** a refresh/`setSession` error counts as *rejected* (sign out, clear stored auth state) only when it is an auth-api error with status 400/401 for an invalid, not-found, already-used or revoked refresh token. Every other error is *unconfirmed* and never signs the user out: network failure, timeout, 5xx, 429, and non-JSON/captive-portal responses.

**Never:** No change to what is stored in MMKV or SecureStore, and no new persisted auth fields. No weakening of sign-out: a rejected refresh token, a `SIGNED_OUT` event and an explicit sign-out all still show sign-in. No schema or RLS change.

**Stored-but-unconfirmed carve-out:** a user who has a stored session but whose refresh has not succeeded (offline, or after the 5 s fallback) MAY be treated as signed in for local reads: onboarding state, session recovery and other MMKV/local-replica state, exactly as `AuthProvider` reads them today for a confirmed user. They MUST NOT cause network work that needs a valid token: PowerSync stays disconnected and no upload runs until a refresh succeeds and the listener delivers a confirmed session. `AuthProvider` exposes this as `isSessionConfirmed` (false for a stored-but-unconfirmed session, true once the listener delivers a session); `PowerSyncConnectionManager` and the upload path gate on it. The fallback never writes to MMKV (no `setAuthState`). A user whose session is rejected after the fallback is signed out and shown sign-in as in the matrix; local data visible in the interim (at most the 5 s bound) is accepted, since it is already on the user's own device.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid stored session, online | Cold start, access token unexpired by more than 60 s | Fast path: splash released immediately from the stored session, home; sign-in never rendered; background `setSession` confirms | A rejected refresh later follows the late-rejection row |
| Expired access token, online, slow refresh | Cold start, refresh takes ~3 s | Neutral loading view for the duration; then home; sign-in never rendered | n/a |
| Stored session, offline | Cold start, no network, any token age | Home from the stored session **as soon as `setSession` returns the unconfirmed (network) error, not after the 5 s bound**; sign-in never rendered; PowerSync disconnected | Not assumed to be retried by supabase-js (a failed `setSession` may not persist the session in the client). The provider retries through the client (`refreshSession()` or restarting auto-refresh, never replaying the stored token pair) when the app returns to the foreground or the network comes back, and connects PowerSync only after a confirmed session |
| Refresh token rejected | Cold start, expired access token, server returns a rejected-class error (see Error classification) | Sign-in after the rejection, and stored auth state cleared | Existing `SIGNED_OUT` path |
| No stored session | Fresh install or signed out | Sign-in with no extra delay | n/a |
| Refresh hangs | Network up but request never returns | After the 5 s bound, fall back to the stored session (not sign-in); never an unbounded splash | n/a |
| Late rejection after fallback | Fallback to stored session already happened, then the server rejects the refresh token | `SIGNED_OUT` still wins: stored auth state cleared and the user is sent to sign-in, even mid-use. Accepted as intended | Existing `SIGNED_OUT` path |
| Server error on refresh | Refresh returns 5xx, 429 or a non-JSON response | Treated as unconfirmed, like offline: stored session, never sign-in | n/a |
| MMKV init hangs | `mmkv` stays `undefined` | The 5 s bound (started at mount) ends the hold; sign-in as for a missing session, never an unbounded splash | n/a |
| MMKV init failed | `mmkv === null` (degraded mode) | Unchanged: sign-in, as today | n/a |
| Taps during restore | User taps where sign-in controls would be | The native splash is on screen; no sign-in or tab control is rendered or tappable | n/a |

</frozen-after-approval>

## Code Map

- `packages/supabase/src/auth/AuthProvider.tsx` -- bootstrap effect calls `setSession()` for the stored session and keeps `isLoading` true until `onAuthStateChange` fires; its `.catch` sets `isLoading` false with `authState` still the signed-out default, which makes the gate redirect to sign-in. `setSession()` normally resolves with `{ error }` rather than rejecting, so the `.catch` may not be the path that matters. **Lead hypothesis:** the listener ignores events until `mmkvReadyRef` flips, so a supabase-js `INITIAL_SESSION` event with `session: null` that arrives after the flip (the client's own storage empty or not yet read) takes the null-session branch: `clearAuthState`, `isLoading` false, sign-in, and the stored session wiped. Other candidates: the `.catch`, and any `isLoading` flip not yet found.
- `packages/supabase/src/auth/session.ts` -- `getAuthState(mmkv)` reads the stored session synchronously; `setAuthState`/`clearAuthState`/`signOut`.
- `apps/mobile/app/(app)/_layout.tsx` -- the auth gate effect (`!isLoading && !isAuthenticated` -> `router.replace('/(auth)/sign-in')`); renders `Tabs` while `isLoading`, with only the 18.7 `isDecisionPending` spinner as a neutral view.
- `apps/mobile/app/_layout.tsx` -- tri-state `mmkv` (`undefined` pending, `null` degraded, ready) and splash hide on fonts; `PowerSyncConnectionManager` reads `isLoading` as well. The splash hide moves here: hide only when fonts are ready AND auth is not loading.
- `apps/mobile/app/(auth)/sign-in.tsx` -- what the user sees during the flash.
- `packages/supabase/src/client.ts` -- supabase-js client config (`autoRefreshToken`, fetch timeout 30 s).
- `apps/mobile/app/(app)/_layout.test.tsx`, `packages/supabase` auth tests -- where regression tests go.
- `deferred-work.md` -- 19.7 entry "Cold JS start while offline shows the sign-in screen even with a fresh token".

## Tasks & Acceptance

**Execution:**
- [ ] Reproduce on an Android device against hosted (see `project_android_device_testing_recipe`): cold start with (a) a fresh token, (b) an expired access token, (c) airplane mode. For (b): auth-js 2.117.2 `_setSession` decodes the access token's own JWT `exp` and ignores the stored `expires_at`, so editing the stored expiry does nothing. Use a genuinely expired access token paired with a valid refresh token (e.g. a token captured earlier, or temporarily set the hosted JWT expiry to its minimum and wait it out). Note also that for an unexpired token `setSession` makes a `/user` round trip (`_getUser`); record its latency. Add temporary timestamped logs (removed before commit) at: the bootstrap effect, the `.catch`, every `onAuthStateChange` event and session, every `setIsLoading(false)`, and the gate effect redirect. Log the event name and the `session` value of every event (test the `INITIAL_SESSION`-null hypothesis first). Before fixing anything, record in Implementation Notes: the installed supabase-js version; what `setSession` does offline with an expired token (resolves or rejects, which events it emits, whether the session is persisted in the client, whether `autoRefreshToken` retries); which event or branch flips `isLoading` false before the session is confirmed, and how long it takes. Exit condition: if the sign-in screen cannot be reproduced in any of (a)-(c), record the evidence and stop; do not guess a fix.
- [ ] `packages/supabase/src/auth/AuthProvider.tsx` -- fix at the cause found above. Candidate shapes, to be chosen after the repro (none is assumed): (1) treat a `setSession` `{ error }` that is a network/retryable error as "unconfirmed, keep loading or restore from the stored session", not as signed out; (2) when a stored session exists, seed `authState` from `getAuthState(mmkv)` so the gate sees a signed-in user while the refresh runs, and let the listener correct it (SIGNED_OUT clears it); (3) hold `isLoading` true until a definite answer, with a bounded timeout that falls back to the stored session when offline.
- [ ] `packages/supabase/src/auth/AuthProvider.tsx` -- offline / fallback path: when the stored session is used without a confirmed refresh, expose it for local reads only, keep PowerSync disconnected, and retry the refresh on app foreground and on network return (trigger chosen in the repro: AppState, NetInfo, or both; reuse any existing AppState wiring). The retry goes through the client (`refreshSession()` or restarting auto-refresh), never a replayed `setSession` with the stored token pair, so it cannot race `autoRefreshToken` into refresh-token reuse detection and a false `SIGNED_OUT`. A confirmed session from the listener then sets `isSessionConfirmed` and enables PowerSync. The 5 s bound timer lives here, starts at mount, and is cancelled by the first definite event. Implement the fast path and the error classification rule from Boundaries here.
- [ ] `packages/supabase` + `apps/mobile` `PowerSyncConnectionManager` -- gate connect and uploads on `isSessionConfirmed` (new context field), so a stored-but-unconfirmed session never connects PowerSync with an expired token. Test: unconfirmed session leaves the connector disconnected; a confirmed session connects.
- [ ] `apps/mobile/app/_layout.tsx` -- splash-hold: keep the native splash up until fonts are ready AND `isLoading` is false (the 5 s bound guarantees `isLoading` ends). No in-app spinner is added for this.
- [ ] `apps/mobile/app/(app)/_layout.tsx` -- no change to what renders while `isLoading`: the splash covers it, and returning `null` would unmount the navigator, so a cold start from a reminder notification tap (Story 8.2) would `router.push` into an unmounted tree. Only verify the gate effect never redirects while `isLoading`. Keep the 18.7 `isDecisionPending` spinner unchanged.
- [ ] Tests: AuthProvider unit tests for stored session + slow refresh (isLoading stays true, sign-in never selected), stored session + network error (stays signed in for local reads, PowerSync not connected), stored session + invalid refresh token (signed out, state cleared), late `SIGNED_OUT` after the 5 s fallback (signed out wins), no stored session (isLoading false at once); an `(app)/_layout` test that the gate does not call `router.replace('/(auth)/sign-in')` while the restore is unresolved; a root-layout test that the splash is not hidden while `isLoading`. **Mock fidelity:** mocks of `setSession` and `onAuthStateChange` must reproduce the behavior recorded in Implementation Notes from the device repro (resolve vs reject, events emitted), not assumed behavior; cite the note in the test comment.
- [ ] Device-verify on Android against hosted: cases (a)-(c) above plus the invalid-refresh-token case (revoke the session server-side). Record results in Implementation Notes. iOS and TalkBack are noted as unchecked if not run.
- [ ] Update `deferred-work.md`: resolve or re-point the 19.7 "cold JS start while offline" entry, and add an entry for the deferred offline "will sync" indicator (Decision 5).

**Acceptance Criteria:**
- Given a stored valid session and a slow token refresh, when the app cold starts, then sign-in is never rendered and the user lands on home (or the 18.7 onboarding decision) once the restore completes.
- Given a stored session and no network, when the app cold starts, then the user reaches home from the stored session as soon as the unconfirmed error returns (not after the 5 s bound) and sign-in is never rendered.
- Given a refresh that returns 5xx, 429 or a non-JSON response, when the app cold starts, then it is treated as unconfirmed (stored session), never as sign-out.
- Given `mmkv` never resolves, when 5 s from mount elapse, then the splash hides and the app does not hang.
- Given a stored session used without a confirmed refresh, when the provider retries, then it goes through the client and never replays the stored token pair.
- Given a stored session whose refresh token the server rejects, when the app cold starts, then the user ends on sign-in and stored auth state is cleared.
- Given no stored session, when the app cold starts, then sign-in appears with no added delay.
- Given any cold start, when the restore is unresolved, then the splash is still showing and no sign-in or tab control is on screen to receive a tap.
- Given a hung refresh, when the 5 s bound elapses, then the app falls back to the stored session (not to sign-in) and the splash hides; it does not wait forever.
- Given the fallback has happened and the server then rejects the refresh token, when `SIGNED_OUT` arrives, then stored auth state is cleared and the user is sent to sign-in.
- Given a stored session used without a confirmed refresh, when the app runs, then PowerSync is not connected and no upload runs until a refresh succeeds.
- Cold start time with a valid token unexpired by more than 60 s is not measurably slower than before (compare against the 9.7 figure): the splash is released without waiting on the `/user` round trip.

## Decisions and Open Questions

1. **Offline with an expired access token and a stored session:** show home from the stored session (offline-first, consistent with the PowerSync local replica) or keep the user on the loading view until the network returns? **Decided (2026-10-12): home from the stored session**; sync and uploads already tolerate being offline, and the loading view would block an offline-first app.
2. **Bound on the loading state:** how long to wait for a refresh before falling back **Decided (2026-10-12): 5 s, then fall back to the stored session rather than to sign-in**.
3. **Root cause is unconfirmed.** Lead hypothesis: an `INITIAL_SESSION` null event after `mmkvReadyRef` flips. Other candidates: the `.catch` in the bootstrap effect and any flip not yet found; the repro task decides, and the approach is revised if it shows another.
4. **Neutral state while restoring: native splash held** (decided 2026-10-12), not an in-app spinner. A spinner reads as "something is wrong" to an anxious user; the splash is already on screen at cold start and costs nothing on the common path.
5. **No offline indicator in this story.** An offline user on the stored session is not syncing; whether to show an "offline, will sync" cue is a UX call recorded in `deferred-work.md`, not built here.

## Implementation Notes

(empty until the repro is done)

## Spec Change Log

- 2026-10-12 (party review, human-approved): added INITIAL_SESSION-null lead hypothesis and supabase-js behavior record to the repro; replaced the "retried by supabase-js" matrix claim with a provider-owned retry and PowerSync-stays-disconnected rule; added the stored-but-unconfirmed carve-out to Never; switched the neutral state to a held splash; reworded the hung-refresh AC to name the fallback and added the late-`SIGNED_OUT` row and AC; tests must mirror observed supabase-js behavior.

- 2026-10-12 (party review pass 2, human-approved all 8 asks): repro recipe fixed (auth-js reads JWT `exp`, not stored `expires_at`); `isSessionConfirmed` plus a PowerSync/upload gating task added; 5 s bound now starts at mount; single error-classification rule (only 400/401 refresh-token errors sign out); provider retry goes through the client, not a replayed `setSession`; offline resolves on the error, not the timer; fast path for tokens unexpired by more than 60 s (chosen over relaxing the perf AC, because auth-js `setSession` does a `/user` round trip even for an unexpired token); `(app)/_layout` "render null" task dropped (notification deep-link risk). Ask 7 was an open choice; the fast path was taken on John's recommendation, so renegotiate if the trade-off (a revoked session may show home briefly) is unwanted.

## Verification

**Commands:**
- `pnpm turbo typecheck lint test` -- expected: all green
