---
title: 'Skip Onboarding for Existing Users After Reinstall'
type: 'bugfix'
created: '2026-09-30'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: '458d7c3298ffc588cb149d3291c354ef90ae0ca6'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `isOnboardingComplete` (`packages/supabase/src/auth/session.ts:121-131`, hydrated in `OnboardingProvider.tsx:62-93`) lives only in on-device MMKV. A reinstall wipes it, so `(app)/_layout.tsx`'s auth/onboarding redirect gate (lines 76-82) cannot tell a reinstalled existing account from a brand-new signup and sends a returning user back through onboarding.

**Approach:** Add a PowerSync-replica fallback query for existence of any `fear_ladder_items` row for the signed-in user (mirroring Story 18.2's `useActiveSessionRecoveryFallback` local-first-with-fallback hook). A hit calls the existing `markOnboardingComplete()` so the gate's own `isOnboardingComplete` condition resolves the same way it already does for any other user.

**Decision (revised 2026-10-02 on-device, human-authorised; supersedes the 2026-09-30 "optimistic redirect + self-correct"):** The onboarding redirect is **held until the existence decision is real**. Redirecting to onboarding unmounts `(app)/_layout.tsx` (sibling route group), tearing the fallback query down before it can ever self-correct, and after a reinstall the replica is empty until PowerSync's first sync completes (the reactive watched query additionally lags the sync-complete signal). The hook therefore exposes `isDecided`: true on a hit, or once `hasSynced` is true AND an authoritative one-shot local read has answered, or after a 10s timeout (offline — never trap the user). The layout shows a neutral spinner while pending and redirects to onboarding only when decided with no data.

## Boundaries & Constraints

**Always:**
- New hook `useOnboardingExistenceFallback(enabled: boolean)` in `apps/mobile/src/hooks/`, called unconditionally (rules of hooks); `enabled` gates the query via a bound `WHERE`-clause parameter exactly like `useActiveSessionRecoveryFallback.ts`, never a conditional hook call.
- `enabled = !isLoading && isAuthenticated && !isOnboardingComplete && !isStorageDegraded` — mirrors 18.2's `sessionRecoveryData === null` gating style; must not be added as a dependency of anything that changes the existing redirect effect's own firing schedule.
- A hit (`hasExistingAccountData === true`) calls `markOnboardingComplete()` from `useAuth()` — reuse this exact setter, no parallel persistence path.
- No `user_id` filter in the SQL — follow `useActiveExposureSession.ts`/`useActiveSessionRecoveryFallback.ts` precedent (PowerSync sync-rule scoping already restricts the replica per-user).
- No new i18n strings — this is a silent background routing decision with no new UI.

**Never:**
- Do not touch `user_onboarding_metadata` — writing at the assessment step, before the 3-item minimum on the ladder screen, it only proves onboarding was *started*, not completed; `fear_ladder_items` existence is the correct signal (matches the epic's own bar: "at least one courage-ladder item").
- Do not add a staleness/time cutoff to this query — unlike 18.2's session recovery, there is no time dimension to "does this account have ladder data."
- Do not import `@powersync/react-native` directly from `apps/mobile` — go through `@exposure-buddy/sync`'s `useQuery` (ARC-005).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reinstall, existing account | No local onboarding flag; PowerSync replica has ≥1 `fear_ladder_items` row | `markOnboardingComplete()` fires; gate stops redirecting to onboarding | N/A |
| Genuine new signup | No local flag; replica has 0 rows (correctly, nothing to sync) | No fallback hit; normal onboarding flow proceeds untouched | N/A |
| Already onboarded (common case) | Local flag already true | Fallback hook's `enabled` is false; query never runs | N/A |

</frozen-after-approval>

## Code Map

- `packages/supabase/src/auth/session.ts:121-131` -- `getOnboardingComplete`/`setOnboardingComplete`, MMKV via `KV_KEYS.ONBOARDING_COMPLETE(userId)`. Unchanged.
- `packages/supabase/src/auth/OnboardingProvider.tsx:95-103` -- `markOnboardingComplete()`, idempotent, degrades gracefully with no `mmkv`/`userId`. Call this from the new fallback effect; do not add a parallel setter.
- `apps/mobile/src/hooks/useActiveSessionRecoveryFallback.ts` (all 70 lines) -- exact pattern to copy: `useQuery` from `@exposure-buddy/sync`, `enabled` bound as `? = 1`, `useMemo` to shape the row.
- `apps/mobile/src/hooks/useOnboardingExistenceFallback.ts` (new) -- `SELECT id FROM fear_ladder_items WHERE ? = 1 LIMIT 1`; no staleness cutoff, no `user_id` filter.
- `packages/sync/src/schema.ts:34-44` -- `fear_ladder_items` columns, confirms no `user_id` filter needed (sync-rule scoped).
- `apps/mobile/app/(app)/_layout.tsx:56-82` -- call the new hook unconditionally near the existing `useActiveSessionRecoveryFallback` call (lines 57-65); add a new effect (mirroring lines 66-70's `setSessionInProgress` effect) that calls `markOnboardingComplete()` and `router.replace('/(app)')` on a hit (per the resolved Decision above). The redirect effect at lines 76-82 itself needs no structural change — it already re-runs whenever `isOnboardingComplete` changes.
- `apps/mobile/app/(app)/_layout.test.tsx:1-90` -- mock structure to extend: add `markOnboardingComplete` to the `useAuth` mock, add a new `describe('AppLayout — Story 18.7 onboarding-skip fallback')` block modeled on the existing Story 18.2 fallback-hook tests.

## Tasks & Acceptance

**Execution:**
- [x] `apps/mobile/src/hooks/useOnboardingExistenceFallback.ts` -- new hook, existence-only query, no staleness/user_id filter -- closes the reinstall-detection gap
- [x] `apps/mobile/app/(app)/_layout.tsx` -- wire the hook in behind `!isLoading && isAuthenticated && !isOnboardingComplete && !isStorageDegraded`; on a hit call `markOnboardingComplete()` and `router.replace('/(app)')`
- [x] `apps/mobile/app/(app)/_layout.test.tsx` -- mock the new hook; cases: hit calls `markOnboardingComplete`, zero rows leaves onboarding flow untouched, hook not enabled when already onboarded
- [x] `apps/mobile/src/hooks/useOnboardingExistenceFallback.test.ts` -- unit-test the I/O matrix's three rows directly against the hook (mocked `useQuery`)

**Acceptance Criteria:**
- Given a reinstalled device signed back into an account with ≥1 `fear_ladder_items` row, when the app launches and the fallback query resolves, then the user is not left on the onboarding flow
- Given a brand-new account with zero ladder items, when the app launches, then onboarding proceeds exactly as today, with no fallback-triggered side effect
- Given `pnpm turbo typecheck lint test`, then all pass, including the new hook test and extended `_layout.test.tsx`

## Implementation Notes

Implemented exactly per the frozen Intent/Boundaries — no deviations. `useOnboardingExistenceFallback` mirrors `useActiveSessionRecoveryFallback.ts` (`SELECT id FROM fear_ladder_items WHERE ? = 1 LIMIT 1`, no `user_id` filter, no staleness cutoff). Wired into `(app)/_layout.tsx` as a separate effect from the existing redirect gate: on a hit it calls `markOnboardingComplete()` (reused from `useAuth()`, no parallel persistence path) then `router.replace('/(app)')` per the resolved optimistic-redirect-and-self-correct decision. `pnpm turbo typecheck lint test` all green (511/511 mobile tests, including the 8 new `useOnboardingExistenceFallback.test.ts` cases and the 6 new `_layout.test.tsx` Story 18.7 cases). Manual on-device reinstall verification not performed — no device/simulator access in this environment (matches 18.4/18.6 precedent of unit-tests-only sign-off).

**Post-review revision (2026-10-02):** see Spec Change Log — redirect now held behind `isDecided`; hook adds `useStatus` + one-shot `db.getAll` after first sync + 10s `SYNC_WAIT_TIMEOUT_MS`; layout renders a spinner while pending. Verified on iOS simulator (clean reinstall, existing account): lands on home. Mobile tests 521+ green. The 'async self-correct' test was replaced by held-redirect tests (hold while pending; slow-sync hit never routes to onboarding; held redirect fires once decided empty).

**Review fix (post-implementation, superseded in part by the revision above):** the pre-existing onboarding-redirect effect and the new fallback effect could both fire in the same commit reading the same still-stale `isOnboardingComplete === false` (before `markOnboardingComplete()`'s state update flushes), letting the pre-existing effect's `router.replace('/(onboarding)/welcome')` win and strand the user — the opposite of this story's AC. Fixed by hoisting the shared gating expression into one `isAwaitingOnboardingDecision` const (also de-duplicating it between the hook call and the new effect) and adding `&& !hasExistingAccountData` to the pre-existing redirect branch's condition, so it never fires once the fallback has confirmed existing account data in the same render. Added test coverage: the reinstall-hit test now asserts on `router.replace`'s *last* call (not just "called at some point") and that `/(onboarding)/welcome` was never called; a new test exercises the async self-correct path (fallback resolves after the redirect gate already sent the user to onboarding, then rerenders to confirm it corrects back to `/(app)`). `_layout.test.tsx` now has 22/22 passing (was 21); typecheck/lint scoped to `exposure-buddy-mobile` re-verified clean.

## Spec Change Log

- 2026-10-02 -- **Frozen Decision revised (human-authorised).** Trigger: on-device reinstall on iOS simulator never skipped onboarding. Diagnosis via Metro logging: (1) the optimistic redirect unmounts the hook's host layout, so a late hit can never correct; (2) `hasSynced` flips true while the reactive `useQuery` still reports zero rows, so trusting the watched query alone misdecides "new account". Amended: hold the redirect behind `isDecided` (hit | first-sync + authoritative local read | 10s timeout) with a spinner meanwhile; added `useStatus` re-export to `@exposure-buddy/sync`. Known-bad state avoided: routing a returning user to onboarding because the replica was momentarily empty. KEEP: existence signal = `fear_ladder_items`, reuse `markOnboardingComplete()`, no `user_id` filter, ARC-005 boundary.

## Review Triage Log

- [verification-gap] Fallback effect's `router.replace('/(app)')` (lines 87-92) can be immediately overridden in the same commit by the pre-existing onboarding-redirect effect (lines 98-104), which still reads stale `isOnboardingComplete === false` and fires `router.replace('/(onboarding)/welcome')` last; the "reinstall, existing account" test only asserts `/(app)` was called at some point, not that it won — **high, routed patch.** Confirmed: `markOnboardingComplete()`'s `setIsOnboardingCompleteLocal(true)` doesn't flush until the next render, so both effects act on the same stale value within one commit.
- [blind-hunter] Same race, filed independently, plus: the exact test scenario that would expose it (mocking a hit before first render) still passes — **high, routed patch.** Same evidence as above.
- [blind-hunter] No test exercises the async self-correct path itself (fallback flipping `hasExistingAccountData` to `true` *after* the redirect gate already fired) — only the degenerate all-at-once case is covered — **medium, routed patch.** Real gap: this is the literal scenario the frozen Decision describes, currently untested.
- [blind-hunter] `!isLoading && isAuthenticated && !isOnboardingComplete && !isStorageDegraded` is duplicated verbatim between the hook call and the effect guard — **low, routed patch.** Direct, trivial fix (hoist to one local `const`).
- [blind-hunter] New hook's `isLoading` return is unused by `_layout.tsx` ("dead on arrival") — **false.** Matches Story 18.2's `useActiveSessionRecoveryFallback`'s identical established pattern (its `isLoading` is equally unused by the same caller) — not a defect introduced by this diff.
- [blind-hunter] Edge-case matrix missing a storage-degraded row; claims a reinstalled existing-account user who also hits degraded storage is "silently left in onboarding" — **false.** Read `(app)/_layout.tsx`'s pre-existing gate: its onboarding-redirect branch already requires `!isStorageDegraded`, so a degraded-storage user is never routed to onboarding regardless of account data — pre-existing carve-out, unchanged and uncaused by this story.
- [blind-hunter] No unmount guard on the new effect (`markOnboardingComplete`/`router.replace` could fire post-unmount) — **low, rejected.** Matches the identical, already-accepted gap in the pre-existing gate effect and the Story 18.2 fallback effect in the same file; a real fix adds new guard machinery (more than a direct correction) for a path unlikely to be hit in everyday use.
- [blind-hunter] No logging/observability for the accepted "brief flash" tradeoff becoming a silent permanent failure — **low, rejected.** Once the race (finding 1) is patched, the "permanent failure" premise this claim depends on no longer exists; no other effect in this file logs analogous transient corrections, so adding bespoke observability here is more than a direct correction.
- [blind-hunter] Frozen Intent's self-correction guarantee isn't honored by the shipped code, so this should go back through human-owned intent renegotiation rather than being patched — **false.** The frozen Decision's stated goal (self-correct back to home once the fallback confirms existing account data) is fully specified and achievable by a direct code fix (see finding 1's patch) — this is an implementation bug in service of an unambiguous intent, not an incomplete intent requiring a human decision.
- [edge-case-hunter] Same race, filed independently (third confirmation) — **high, routed patch.** Same evidence as above.
- [edge-case-hunter] `markOnboardingComplete()`'s silent no-op on `!store`/`!userId` is unchecked before `router.replace('/(app)')` fires — **false.** Traced both preconditions against the effect's own gating: `isStorageDegraded` is set from the identical `mmkv === null` check shared across `AuthProvider`/`OnboardingProvider` (`AuthProvider.tsx:153-158`), so `!isStorageDegraded` already guarantees `OnboardingProvider`'s `store` is non-null; `isAuthenticated` already guarantees `userId` is present. Both failure preconditions are excluded by the effect's own guard — not a state the program can currently reach.

## Verification

**Commands:**
- `pnpm turbo typecheck` -- expect: 0 errors, no ARC-005/ARC-011 boundary violations
- `pnpm turbo lint` -- expect: 0 errors
- `pnpm turbo test` -- expect: all suites green, including new/extended tests

**Manual checks (if no CLI):**
- On-device: sign in on a fresh install with an account that already has ladder items; confirm the user lands on home, not onboarding (Maestro e2e explicitly out of scope per sprint-status, matching 18.4's precedent — unit tests only)
