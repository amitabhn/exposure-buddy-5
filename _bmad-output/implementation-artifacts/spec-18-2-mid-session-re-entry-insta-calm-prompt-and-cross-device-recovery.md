---
title: 'Mid-Session Re-Entry — Insta Calm Prompt & Cross-Device Recovery'
type: 'feature'
created: '2026-09-30'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Session-recovery detection reads only device-local MMKV state, so a reinstall, device switch, or cleared storage silently strands an in-progress `exposure_sessions` row the backend still considers `started`. Separately, on legitimate resume, Insta Calm is only passively available via a floating action button — a user returning at peak distress may not notice it.

**Approach:** Add a PowerSync-replica fallback query for the user's most recent `status = 'started'` session when no local recovery record exists at launch, feeding it into the existing `sessionRecoveryData` state so the current recovery modal picks it up unchanged. A `started` session older than **24 hours** is never offered for Resume — this staleness rule applies uniformly to *both* the new cross-device fallback query and the existing same-device local-storage recovery path (today's local path has no age limit at all; this story adds one, closing the inconsistency a device-only fix would otherwise leave). In every case staleness only suppresses the Resume offer — the server-side row is left alone, never mutated. On resume, Insta Calm is actively surfaced via a dismissible **in-place banner** on `/session/active` (not an auto-redirect), reusing existing `calmMe.*` copy for its action label. Existing neutral `session.recovery.*` copy is retained as-is — no new copy strings.

## Boundaries & Constraints

**Always:**
- The PowerSync fallback query runs only when `!isLoading && isAuthenticated && sessionRecoveryData === null` (per AuthProvider state), and must never be added as a dependency of the existing auth/onboarding redirect gate (`apps/mobile/app/(app)/_layout.tsx:58-64`) — that gate keeps firing on its current inputs only.
- The fallback query's `WHERE` clause excludes any `started_at` older than 24 hours from now — this is the staleness threshold, applied at the query level, not as a post-filter.
- The local-storage recovery path (`AuthProvider.tsx`'s MMKV read) applies the same 24-hour cutoff against the stored record's start time. A stale local record is treated as absent: it does not populate `sessionRecoveryData` (so no modal), the stale MMKV key is cleared (mirrors the existing corrupt-JSON handling at the same read site), and — because `sessionRecoveryData` ends up `null` — the cross-device fallback query then runs, in case a different, fresher session exists server-side.
- `SessionRecoveryData` (`packages/core/src/types/session-recovery-data.ts`) gains a `startedAt` field so the local path has a timestamp to check against; `setSessionInProgress` and its caller (`session/intent.tsx:113`) are updated to populate it when a session starts.
- The fallback query goes through `@exposure-buddy/sync`'s `useQuery` (ARC-005 boundary) — never import `@powersync/react-native` directly from `apps/mobile`.
- A fallback hit feeds into the same `sessionRecoveryData`/`setSessionInProgress` surface AuthProvider already exposes — no second, parallel "is there a recovery" source of truth in `_layout.tsx`.
- The Insta Calm active-offer is a dismissible banner rendered on `/session/active` (both for local and fallback-derived resumes) — it must not auto-navigate away from that screen.
- Reuse existing i18n keys only (`session.recovery.*`, `calmMe.*`). No new user-facing strings.

**Never:**
- Do not introduce the "You're back. That took courage." copy or any new re-entry copy — that stays gated on backlog item 3.2 (clinical review).
- Do not add a `user_id` filter to the fallback query unless first confirming PowerSync sync rules don't already scope the replica per-user (existing `useActiveExposureSession.ts` has none).
- Do not touch `expires_at` handling or its server trigger — it is set only on session *completion* (6h window) and is unrelated to staleness of a `started` session; staleness here must key off `started_at`.
- Do not fix the pre-existing `hi.json` gap (`session.recovery.endFailed`/`tryEnding` missing) — unrelated to this story.
- Do not mutate a stale `started` session's status or enqueue any change for it — it is simply excluded from the fallback query, nothing more.
- Do not auto-redirect off `/session/active` for the Insta Calm offer — it is an in-place banner only.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Local recovery present, fresh | MMKV `sessionInProgress` set, `startedAt` < 24h old | Existing behavior — recovery modal shows Resume; no fallback query runs | N/A |
| Local recovery present, stale | MMKV `sessionInProgress` set, `startedAt` ≥ 24h old | Local hydration treats it as absent (`sessionRecoveryData` stays `null`, stale MMKV key cleared) — the fallback query then runs same as the no-local-record case, in case a *different*, fresher session exists server-side | N/A |
| Reinstall, server has `started` session, fresh | No local record; PowerSync replica has one `started` row < 24h old | Fallback populates `sessionRecoveryData`; existing recovery modal shows Resume | If PowerSync not yet synced down, no row found — no modal (same as today) |
| Reinstall, server has `started` session, stale | No local record; `started` row ≥ 24h old | Excluded by the query's `WHERE` clause — no Resume offer, row untouched server-side | N/A |
| No `started` session anywhere | No local record; PowerSync query returns empty | No modal, normal home render | N/A |
| Resume (local or fallback) | User taps Resume | Lands on `/session/active`; dismissible Insta Calm banner rendered in place | N/A |

</frozen-after-approval>

## Code Map

- `packages/supabase/src/auth/AuthProvider.tsx:216-221` -- primary local-MMKV recovery read; add the 24h staleness check here against the new `startedAt` field, clearing the MMKV key (mirroring the existing corrupt-JSON handling at the same site) and leaving `sessionRecoveryDataLocal` `null` when stale; `:319-325` `setSessionInProgress` -- extend signature to accept/store `startedAt`; reuse this same setter to feed fallback hits into the same state; `:327-333` `clearSessionInProgress` -- unchanged
- `apps/mobile/app/session/intent.tsx:113` -- caller of `setSessionInProgress`; pass the session's start time through
- `packages/supabase/src/auth/useAuth.ts:31-32` -- exports `sessionRecoveryData`/setters to consumers; fallback hook lives in `apps/mobile` and calls these, not a new context
- `apps/mobile/app/(app)/_layout.tsx:58-64` -- redirect gate, must stay independent; `:119-127` `handleRecoveryResume` -- navigation to `/session/active`, unchanged (banner approach needs no new resume-navigation params); `:169-172` `showRecoveryModal` gate; `:197-249` modal JSX -- no changes, reuses existing i18n
- `apps/mobile/src/hooks/useActiveExposureSession.ts` -- exact query-pattern precedent (`useQuery` from `@exposure-buddy/sync`, `status = 'started' ORDER BY started_at DESC LIMIT 1`) to copy for the new fallback hook; extend the `WHERE` clause with the 24h staleness cutoff on `started_at`
- `packages/sync/src/schema.ts:46-58` -- `exposure_sessions` columns; `started_at` is the staleness field (do not use `expires_at`)
- `packages/core/src/types/session-recovery-data.ts:4-9` -- `SessionRecoveryData` shape has no timestamp field today; add `startedAt: string` (ISO, matching `exposure_sessions.started_at`'s shape) so both the local path and the fallback path can carry/check it uniformly. Stays a pure type change — ARC-011 boundary unaffected
- `apps/mobile/src/components/CalmMeFab.tsx:36-43` -- existing `?inSession=1` convention when `pathname === '/session/active'`; reuse `calmMe.fabLabel`/`fab` i18n strings as the new banner's action label
- `apps/mobile/app/session/active.tsx` -- resume destination; add the dismissible Insta Calm banner here, rendered whenever this screen is reached via a recovery resume (local or fallback)
- `apps/mobile/app/(app)/_layout.test.tsx:39,78+,177+` -- existing recovery-modal test scaffolding (`mockSessionRecoveryData`) to extend with a new fallback-hook `describe` block
- `apps/mobile/docs/performance-budget.md:28-41` -- cold-start budget (≤2s P0, Profile B/returning-user never measured); re-measurement for this story's AC is a manual device exercise, no automated perf test exists

## Tasks & Acceptance

**Execution:**
- [ ] `packages/core/src/types/session-recovery-data.ts` -- add `startedAt` to `SessionRecoveryData`
- [ ] `packages/supabase/src/auth/AuthProvider.tsx` -- `setSessionInProgress` accepts/stores `startedAt`; the local MMKV read applies the 24h staleness check against it, clearing the key and leaving state `null` when stale
- [ ] `apps/mobile/app/session/intent.tsx` -- pass the session's start time into `setSessionInProgress`
- [ ] `apps/mobile/src/hooks/useActiveSessionRecoveryFallback.ts` -- new hook: `useQuery`-based fallback query for the most recent `started` session with `started_at` within the last 24 hours, following `useActiveExposureSession.ts`'s pattern -- closes the reinstall/device-switch recovery gap
- [ ] `apps/mobile/app/(app)/_layout.tsx` -- wire the fallback hook in behind the `!isLoading && isAuthenticated && sessionRecoveryData === null` condition (true both when no local record exists and when the local record was just cleared for staleness), call `setSessionInProgress` on a hit (the query already excludes stale rows)
- [ ] `apps/mobile/app/session/active.tsx` -- add a dismissible Insta Calm banner, shown whenever this screen is reached via a recovery resume, reusing `calmMe.*` copy for its action label
- [ ] `apps/mobile/app/(app)/_layout.test.tsx` -- new `describe` block covering: fallback fires only when local state is null, a stale (>24h) session is excluded by the query, a fresh session populates recovery state without delaying the redirect gate
- [ ] `packages/supabase/__tests__/auth/` -- new coverage for `AuthProvider`'s local-hydration staleness check: a fresh MMKV record hydrates normally, a stale (>24h) one is treated as absent and its MMKV key is cleared
- [ ] `apps/mobile/docs/performance-budget.md` -- re-measure and record Profile B (or note if still blocked) to confirm no cold-start regression

**Acceptance Criteria:**
- Given a local recovery record with `startedAt` more than 24 hours old, when AuthProvider hydrates on sign-in, then it is treated as absent (no modal, MMKV key cleared), and the cross-device fallback query subsequently runs
- Given no local recovery record (absent, or just cleared for staleness) and a `started` session with `started_at` within the last 24 hours on the PowerSync replica, when the app launches and finishes loading, then the existing recovery modal offers Resume for it
- Given a `started` session with `started_at` more than 24 hours old, when the fallback query runs, then it is excluded from the result and not offered for Resume, and its row is left unmodified
- Given the fallback hook is active, when the auth/onboarding redirect gate's effect runs, then it fires on its existing schedule, unaffected by the fallback query's timing
- Given a user resumes a session (local or fallback-derived), when they land on `/session/active`, then a dismissible Insta Calm banner is shown in place, using only existing `calmMe.*`/`session.recovery.*` copy, with no auto-redirect off the screen

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `pnpm --filter @exposure-buddy/mobile test -- (app)/_layout.test.tsx` -- expected: new fallback-hook tests pass alongside existing recovery-modal tests
- `pnpm --filter @exposure-buddy/mobile test -- session/active.test.tsx` -- expected: new active-offer behavior covered, existing tests unaffected
- `pnpm turbo typecheck` -- expected: no boundary violations (ARC-005/ARC-011), no type errors from `SessionRecoveryData` changes
- `pnpm turbo lint` -- expected: i18n lint passes (no new literal strings)

**Manual checks (if no CLI):**
- On-device: force-quit mid-exposure, reinstall (or clear app storage), sign back in, confirm the recovery modal appears for a fresh `started` session and does not for an artificially stale one (adjust `started_at` via Supabase Studio to test)
- Re-run Story 9.7's cold-start measurement (`adb shell am start -W`) for Profile B and record the result in `performance-budget.md`
