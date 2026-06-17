# Story 6.3: Home Screen Progressing State (State 4)

Status: review

## Story

As a user who has an active exposure thread in progress,
I want the home screen to acknowledge my ongoing session and invite me to continue,
so that I can re-enter the session without confusion (FR-HOME-02, UX-DR-14).

*State 5 (avoidance detection) and State 9 (re-engagement re-baseline) are deferred post-MVP — both deferral comments already exist in `resolveHomeScreenState` (added in Story 6.2-B). This story does NOT touch `packages/core/src/erp/home-screen-state.ts` — the state machine already returns `'progressing'` correctly. Scope here is the `apps/mobile/app/(app)/index.tsx` UI for the `'progressing'` branch only, which today is a placeholder stub.*

## Acceptance Criteria

1. **Given** at least one `exposure_sessions` row with `status = 'started'` exists for this user **and** `sessionRecoveryData` is populated (same-device case), **when** the home screen mounts, **then** state 4 renders — a context card shows the supporting copy `t('home.state4.context')` (canonical English: "You have an exposure in progress") and the fear item description; the CTA reads `t('home.state4.cta')` and navigates back into the active session screen (`/session/active`).
2. **Given** `activeSession` exists (PowerSync) but `sessionRecoveryData` is `null` (cross-device case — the session was started on a different device and this device's MMKV never received the recovery blob), **when** the home screen mounts, **then** state 4 still renders — the context card shows only the supporting copy `t('home.state4.context')` (no fear item description, regardless of whether `sessionRecoveryData.description` would otherwise be an empty string); the CTA still reads `t('home.state4.cta')` and navigates into `/session/active` using `activeSession.id`/`activeSession.fearItemId` with `description=''` and `preSuds=0`. If `activeSession.fearItemId` is also `null` (the ladder item was deleted after the session started, per Story 6.2-C's `ON DELETE SET NULL`), pass `fearItemId=''` in the URL — the existing null-safety pattern (`fearItemId != null ? encodeURIComponent(fearItemId) : ''`) already covers this.
3. **Given** the session has an `expires_at` timestamp, **when** state 4 renders, **then** `expires_at` is NOT displayed to the user in any form — no raw epoch or human-readable timestamp appears on the home screen for an active session.
4. **Given** state 5 (avoidance) is deferred, **when** the home screen evaluates which state to show, **then** the state machine does NOT evaluate avoidance heuristics — `// State 5 (avoidance detection) deferred post-MVP` already exists in `resolveHomeScreenState`; verify it is untouched, do not duplicate or move it.
5. **Given** all user-facing strings are i18n-gated, **when** the state 4 screen renders, **then** every visible string uses `t()`; no raw string literals appear in the component; CI lint (`i18next/no-literal-string`) passes.

[Source: `_bmad-output/planning-artifacts/epics.md` lines 1344–1370]

## Tasks / Subtasks

- [x] **T1 — Replace the `'progressing'` placeholder branch in `index.tsx`** (AC: 1, 2, 3, 5)
  - [x] Destructure `sessionRecoveryData` from `useAuth()` (already imported in `index.tsx`) — this is the canonical, already-proven data source for "resume an in-progress session," identical to the pattern in `(app)/_layout.tsx`'s `handleRecoveryResume` (see Dev Notes — Data source decision).
  - [x] Render a context card (reuse the existing `placeholderCard`/`placeholder` `StyleSheet` entries — do not create a new shared UI component for this) showing two pieces of text: the supporting copy `t('home.state4.context')` and the fear item description (`sessionRecoveryData.description` when truthy — treat an empty string `''` the same as `null`/missing, i.e. render supporting-copy-only, identical to the cross-device fallback rendering). Add an `accessibilityLabel={t('home.state4.cta')}` on the card's `TouchableOpacity`, matching the existing pattern already used by the sibling `'empty-ladder'` branch in this file (`accessibilityLabel={t('ladder.addItem')}`).
  - [x] Render the CTA text using `t('home.state4.cta')` (canonical English: "Continue") — this label was previously unspecified; it is required by AC 1/AC 2 and AC 5's i18n gate.
  - [x] On press, navigate with `router.push` to `/session/active?sessionId=...&fearItemId=...&description=...&preSuds=...`, building the URL with the exact same null-safety pattern as `(app)/_layout.tsx:handleRecoveryResume` (`fearItemId != null ? encodeURIComponent(fearItemId) : ''`). Add `// eslint-disable-line i18next/no-literal-string` on the template-literal line (existing convention for route strings throughout `apps/mobile/app/session/*.tsx`).
  - [x] Handle the cross-device fallback (AC 2): if `sessionRecoveryData` is `null` but `activeSession` (from `useActiveExposureSession`, already wired) is non-null — this happens when a session was started on a different device, so this device's MMKV never received the recovery blob — render the context card using only the supporting copy (no description text) and navigate using `activeSession.id` / `activeSession.fearItemId` with `description=''` and `preSuds=0`. `activeSession.fearItemId` can itself be `null` (ladder item deleted post-session-start via Story 6.2-C's `ON DELETE SET NULL` on `exposure_sessions.fear_item_id`) — apply the same null-safety pattern used for the primary path (`fearItemId != null ? encodeURIComponent(fearItemId) : ''`) so this never crashes or stringifies to `'undefined'`. Do not crash or render nothing in this case; `'progressing'` state must always be actionable.
  - [x] Confirm no code path renders `expires_at` (it is not even fetched by `useActiveExposureSession` or `sessionRecoveryData` today — keep it that way; do not add an expiry fetch as part of this story).
- [x] **T2 — i18n keys** (AC: 1, 2, 5)
  - [x] Add `home.state4.context` = "You have an exposure in progress" to `apps/mobile/src/i18n/locales/en.json` and `hi.json` (English copy duplicated in `hi.json`, matching the existing convention noted in Story 6.2-B's Dev Agent Record — Hindi not yet localized for this file).
  - [x] Add `home.state4.cta` = "Continue" to both locale files (same English-duplicated-in-`hi.json` convention) — the CTA button copy, required by AC 1/AC 2, previously unspecified.
  - [x] Remove the now-unused `home.state4.placeholder` key from both locale files — it was a Story 6.2-B stub key ("You have an exposure in progress. Tap to view your ladder.") and has no remaining usages once T1 lands. Grep both locale files' usages before deleting to confirm.
- [x] **T3 — Tests** (AC: all)
  - [x] Update `apps/mobile/app/(app)/index.test.tsx`'s `describe("'progressing' state")` block (currently lines 181–196): replace the two existing tests (`renders the state4 placeholder`, `placeholder CTA navigates to /ladder`) — they assert the old stub behavior and will fail once T1 lands.
  - [x] New test: context card renders `t('home.state4.context')` and the fear item description when `sessionRecoveryData` is populated.
  - [x] New test: tapping the card calls `mockPush` with a `/session/active?...` URL containing `sessionId`, `fearItemId`, `description`, `preSuds` from `sessionRecoveryData`.
  - [x] New test: cross-device fallback — `sessionRecoveryData: null`, `activeSession` populated — card still renders and CTA still navigates to `/session/active` (using `activeSession`'s fields).
  - [x] New test (AC 1/AC 2): when `sessionRecoveryData.description === ''` (populated session, empty description), the card renders supporting-copy-only — same assertion as the cross-device fallback test, different input source.
  - [x] New test (AC 3): `expires_at` is never queried or rendered anywhere in the `'progressing'` state — assert no element/text derived from an `expires_at` value appears, covering both the primary and cross-device fallback paths.
  - [x] Update the existing `HomeScreenContext construction (real resolveHomeScreenState)` test at line 230 (`'an active session maps to activeThread.exists -> progressing state'`) — it currently asserts `getByText('home.state4.placeholder')`; this assertion must change to the new copy key.
  - [x] Add `sessionRecoveryData: null` to `defaultAuthValue` in the test file's `beforeEach` (it is not currently part of the mocked `useAuth()` shape) so existing non-progressing tests are unaffected, and override per-test in the new progressing tests.
- [x] **T4 — CI verification** (AC: all)
  - [x] `pnpm turbo typecheck`, `pnpm turbo lint`, `pnpm turbo test` all green.

---

### Review Findings

- [x] [Review][Patch] AC1 is contradicted by T1's cross-device fallback — AC1 states the context card unconditionally "shows the fear item description," but the documented fallback explicitly renders without it. Add an explicit AC (or amend AC1) covering the fallback's actual behavior when `sessionRecoveryData` is null and only `activeSession` is available [6-3 AC 1, T1 cross-device fallback bullet] — applied (new AC 2 added; original AC 1 amended)
- [x] [Review][Patch] `activeSession.fearItemId` can be `NULL` — `fear_ladder_items` uses `ON DELETE SET NULL` on `exposure_sessions.fear_item_id` (migration 0016), and this gap is now live since Story 6.2-C (ladder item delete) shipped (see `deferred-work.md` line 28: "activates once ladder-item deletion is implemented"). The T1 cross-device fallback bullet and `ActiveExposureSession.fearItemId: string` (non-nullable type) don't account for this. Spec must specify fallback behavior when `activeSession.fearItemId` is null [6-3 T1 cross-device fallback bullet; `apps/mobile/src/hooks/useActiveExposureSession.ts`] — applied (AC 2 and T1 fallback bullet now specify null-safety handling)
- [x] [Review][Patch] Multiple simultaneous active sessions across different fear items is unaddressed — `deferred-work.md` explicitly names Story 6.3 as needing to resolve which active session to resume "when it builds the polished state-4 card," but this spec never mentions it. `useActiveExposureSession`'s `LIMIT 1` silently picks the most recent and the rest stay invisible. Spec must state the scope decision (keep `LIMIT 1` as-is / explicitly re-defer) [`deferred-work.md` "Multiple simultaneous active threads..." entry; `apps/mobile/src/hooks/useActiveExposureSession.ts`] — applied (new Dev Notes subsection "Scope decision: multiple simultaneous active sessions are NOT resolved by this story")
- [x] [Review][Patch] AC2 (`expires_at` never displayed) has no corresponding T3 test — every other AC traces to a T3 test; add an explicit test asserting `expires_at` is never rendered for state 4 [6-3 AC 2, T3] — applied (new T3 test bullet, AC renumbered to AC 3)
- [x] [Review][Patch] CTA button copy/i18n key is never specified despite AC4's blanket "every visible string uses `t()`" requirement — add the missing key (e.g. `home.state4.cta`) to T2 [6-3 AC 4, T2] — applied (`home.state4.cta` added to T1/T2, AC renumbered to AC 5)
- [x] [Review][Patch] No `accessibilityLabel` specified for the new context card/CTA — the sibling `'empty-ladder'` branch in the same file already sets `accessibilityLabel={t('ladder.addItem')}` on its `TouchableOpacity`; T1 should require the same pattern for parity [6-3 T1; `apps/mobile/app/(app)/index.tsx`] — applied
- [x] [Review][Patch] Behavior for `sessionRecoveryData.description === ''` (populated session, empty description string) is unspecified and untested — clarify whether this renders supporting-copy-only (same as the no-description fallback) and add a T3 test for it [6-3 T1, T3] — applied
- [x] [Review][Defer] `preSuds` has no 0–10 range validation anywhere in the session flow (`intent.tsx` → URL → `active.tsx`'s `parseInt`) [6-3 Dev Notes — Data source decision] — deferred, pre-existing gap not introduced by this story, already tracked as 6-1-CR-D3 in `deferred-work.md`
- [x] [Review][Defer] No validation that `sessionId` exists in `exposure_sessions` before `active.tsx` enqueues writes against it (orphaned/corrupted session ID) [6-3 T1; `apps/mobile/app/session/active.tsx`] — deferred, pre-existing pattern across the entire session flow, not introduced or worsened by this story
- [x] [Review][Defer] The cross-device fallback's `preSuds=0` default builds directly on top of the already-tracked 6-1-CR-D3 gap (unguarded `preSuds` forwarding) rather than mitigating it [6-3 Dev Notes — "Why the cross-device fallback still matters"] — deferred, Epic 9 candidate per `deferred-work.md`, no new fix required within this story's scope

---

## Dev Notes

### Scope is narrower than it first appears — read this before touching `home-screen-state.ts`

`resolveHomeScreenState` (in `packages/core/src/erp/home-screen-state.ts`) already implements the `'progressing'` branch correctly — it was built in Story 6.2-B alongside the rest of the MVP state machine:

```typescript
// packages/core/src/erp/home-screen-state.ts (current, unchanged by this story)
if (ctx.activeThread?.exists === true) return 'progressing'
// State 9 (re-engagement re-baseline) deferred post-MVP — falls through to state 3
```

The `// State 5 (avoidance detection) deferred post-MVP` comment is one line above this. AC 4 just asks you to verify it's there, not write it. **Do not modify `home-screen-state.ts` or its test file in this story** — there is no AC requiring a state-machine change, and 6.2-B's 7 ADR-mandated test cases already cover it. The only thing left undone from the epics.md Story 6.3 text is the **rendering** of state 4 in `apps/mobile/app/(app)/index.tsx`, which 6.2-B intentionally left as a placeholder stub:

```typescript
// apps/mobile/app/(app)/index.tsx — current state, lines 75–82 — THIS is what you're replacing
) : homeState === 'progressing' ? (
  <TouchableOpacity
    style={styles.placeholderCard}
    onPress={() => router.push('/ladder')}
    accessibilityRole="button"
  >
    <Text style={styles.placeholder}>{t('home.state4.placeholder')}</Text>
  </TouchableOpacity>
) : (
```

### Scope decision: multiple simultaneous active sessions are NOT resolved by this story

`deferred-work.md` flags that a user can have `status = 'started'` sessions on two *different* fear items at once (`uq_active_thread` only enforces uniqueness per `(user_id, fear_item_id)` pair), and explicitly names this story as the one that "will need to resolve which active session to actually resume when it builds the polished state-4 card." This story makes the explicit decision **not** to resolve it: `useActiveExposureSession`'s existing `SELECT ... WHERE status = 'started' ORDER BY started_at DESC LIMIT 1` query is left unchanged, so state 4 continues to silently surface only the most recently started session. The other concurrent session(s), if any, stay invisible to the home screen — same behavior as Story 6.2-B. Resolving this (e.g. a session picker, or surfacing a count) is deferred to a future story; do not build that here.

### Data source decision: use `sessionRecoveryData` from `useAuth()`, not a new PowerSync join query

The natural-seeming approach — extend `useActiveExposureSession` with a SQL join against `fear_ladder_items` to fetch `description`, and query `suds_readings` for the session's first reading to get `preSuds` — is **unnecessary**. This data already exists, already flows through MMKV, and is already consumed by an existing, working code path: `sessionRecoveryData` from `useAuth()` (`@exposure-buddy/supabase`), which `index.tsx` already imports `useAuth` from.

```typescript
// packages/core/src/types/session-recovery-data.ts
export interface SessionRecoveryData {
  sessionId: string
  fearItemId: string | null
  preSuds: number
  description: string
}
```

This is set by `setSessionInProgress()` whenever a session starts (in the `session/intent.tsx` flow) and persists across app restarts via MMKV. It is the **exact same data source** the existing app-crash recovery modal in `apps/mobile/app/(app)/_layout.tsx` uses to resume into `/session/active`:

```typescript
// apps/mobile/app/(app)/_layout.tsx — handleRecoveryResume — mirror this URL-building pattern exactly
function handleRecoveryResume() {
  if (!sessionRecoveryData) return
  setRecoveryModalDismissed(true)
  const { sessionId, fearItemId, description, preSuds } = sessionRecoveryData
  router.push(
    // eslint-disable-next-line i18next/no-literal-string
    `/session/active?sessionId=${sessionId}&fearItemId=${fearItemId != null ? encodeURIComponent(fearItemId) : ''}&description=${encodeURIComponent(description)}&preSuds=${preSuds}`
  )
}
```

State 4's "Continue" CTA is functionally the same action (re-enter an in-progress session) through a different entry point (home screen tap vs. a recovery modal after app relaunch). Reuse the data shape and URL-building logic; do not re-derive `description`/`preSuds` from PowerSync.

**Why the cross-device fallback still matters:** `resolveHomeScreenState` resolves `'progressing'` from `activeSession` (a PowerSync query — syncs across devices), but `sessionRecoveryData` lives in local MMKV only (device-local). If a user starts a session on Device A and opens the app on Device B, Device B's `activeThread.exists` is `true` (PowerSync) but `sessionRecoveryData` is `null` (no local MMKV write happened on B). The state is still `'progressing'` and the screen must still render something actionable — see T1's fallback subtask. `active.tsx` already tolerates a missing `description` (`{description ? <Text>...</Text> : null}`) and a missing `preSuds` (`parseInt(preSuds ?? '0') || 0`), so the fallback CTA is safe to fire even with partial data.

### `/session/active` route param contract (unchanged — you are a caller, not a modifier)

```typescript
// apps/mobile/app/session/active.tsx:21-26
const { sessionId, fearItemId, description, preSuds } = useLocalSearchParams<{
  sessionId: string
  fearItemId: string
  description: string
  preSuds: string
}>()
```

Do not modify `active.tsx`. Every other entry point into this screen (`briefing.tsx`, `grounding.tsx`, the recovery modal) builds the same four-param URL — match that contract.

### Files this story touches

| File | Current state | This story |
|---|---|---|
| `apps/mobile/app/(app)/index.tsx` | `'progressing'` branch is a stub: static copy, CTA → `/ladder` | Real context card using `sessionRecoveryData`/`activeSession`, CTA → `/session/active` |
| `apps/mobile/app/(app)/index.test.tsx` | 2 tests assert stub behavior (lines 186–195), 1 test at line 230 asserts stub copy | Rewritten/added tests per T3 |
| `apps/mobile/src/i18n/locales/en.json` | Has `home.state4.placeholder` | Replace with `home.state4.context` + `home.state4.cta`; same in `hi.json` |
| `apps/mobile/src/i18n/locales/hi.json` | Has `home.state4.placeholder` | Replace with `home.state4.context` + `home.state4.cta` |

**Not touched:** `packages/core/src/erp/home-screen-state.ts` (already correct), `apps/mobile/src/hooks/useActiveExposureSession.ts` (no new query needed), `apps/mobile/app/session/active.tsx` (consumed as-is), `apps/mobile/app/(app)/_layout.tsx` (pattern referenced, not modified), any Supabase migration (no schema change — `expires_at` already exists from Story 6.2-C, AC 3 is a negative/verification requirement, not a new feature).

### PowerSync / hook gotchas carried forward from 6.2-A / 6.2-B (still apply)

- Import `useQuery` from `@exposure-buddy/sync`, never `@powersync/react-native` directly (ARC-005 ESLint rule) — moot for this story since no new query is added, but do not regress this if you touch `useActiveExposureSession.ts`.
- Do not call hooks conditionally — `useAuth()` is already called unconditionally at the top of `index.tsx`; just add `sessionRecoveryData` to the existing destructure.
- `isLoading` and "empty result" are different things — `sessionRecoveryData === null` is a normal, expected state (no active session, or cross-device gap), not a loading state.

### Test mock pattern — `apps/mobile/app/(app)/index.test.tsx`

`defaultAuthValue` (line 55) does not currently include `sessionRecoveryData`. Add `sessionRecoveryData: null` to it so all pre-existing tests (which don't care about this field) continue to pass unmodified, then override per-test in the new `'progressing'` describe block:

```typescript
const defaultAuthValue = {
  firstHomeVisitSeen: false,
  markFirstHomeVisitSeen: mockMarkFirstHomeVisitSeen,
  authState: { userId: 'user-123' },
  sessionRecoveryData: null,
}
```

The existing `'progressing'` describe block (lines 181–196) and the one assertion at line 240 (`'an active session maps to activeThread.exists -> progressing state'`) currently assert `getByText('home.state4.placeholder')` and `mockPush` → `/ladder`. These must change to assert the new copy/navigation — they are not new tests to add alongside, they are replacements.

### References

- `_bmad-output/planning-artifacts/epics.md` lines 1344–1370 — canonical Story 6.3 acceptance criteria
- `_bmad-output/planning-artifacts/adrs/ADR-HOME-STATE-RESOLVE.md` — full state machine contract (already implemented; reference only, no changes here)
- `_bmad-output/implementation-artifacts/6-2-b-home-screen-morning-state.md` — predecessor story; built `resolveHomeScreenState`, `useActiveExposureSession`, and the `'progressing'` placeholder this story replaces
- `_bmad-output/implementation-artifacts/deferred-work.md` item `6-1-CR-D3` — pre-existing known gap: `preSuds` forwarded unguarded through the session flow, defaults to `0` if missing. This story does not fix that gap; it inherits the same tolerant behavior by reusing `sessionRecoveryData`.
- `apps/mobile/app/(app)/_layout.tsx` — `handleRecoveryResume` is the pattern to mirror for the CTA's URL construction
- `apps/mobile/app/session/active.tsx` — the screen being navigated to; its `useLocalSearchParams` contract is the target shape

### Project Structure Notes

No new files. No new packages touched. No migration. Fully contained within `apps/mobile/app/(app)/index.tsx`, its test file, and the two locale JSON files — consistent with the existing project structure (mobile app screens in `apps/mobile/app/`, i18n in `apps/mobile/src/i18n/locales/`).

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code)

### Debug Log References

None — implementation proceeded without needing a debug log; `pnpm turbo typecheck`, `pnpm turbo lint`, `pnpm turbo test` all passed green on first full run after T1–T3.

### Completion Notes List

- Replaced the `'progressing'` placeholder branch in `apps/mobile/app/(app)/index.tsx` with a real context card. Navigation params are derived once near the top of the component (`progressingSessionId`/`progressingFearItemId`/`progressingDescription`/`progressingPreSuds`), preferring `sessionRecoveryData` (MMKV, device-local) and falling back to `activeSession` (PowerSync, cross-device) when `sessionRecoveryData` is `null` — per the Dev Notes "Data source decision."
- `fearItemId` null-safety (`!= null ? encodeURIComponent(...) : ''`) is applied uniformly regardless of which source (`sessionRecoveryData` or `activeSession`) supplied it, covering the Story 6.2-C `ON DELETE SET NULL` case from both paths even though `ActiveExposureSession.fearItemId`'s TS type is non-nullable — the hook itself was not modified, per "Files this story touches."
- The CTA visually reuses the existing `addItemText` style (already used by the sibling `'empty-ladder'` CTA) rather than `placeholder`, for visual parity as a tappable action; the supporting copy and description reuse `placeholder`. No new StyleSheet entries or shared UI components were added.
- `home-screen-state.ts` and `useActiveExposureSession.ts` were not touched, confirming the Dev Notes scope boundary.
- T3 added one test beyond the spec's explicit list: cross-device fallback with `activeSession.fearItemId: null`, directly verifying the null-safety pattern doesn't crash or stringify to `'undefined'` (Review Finding #2's concern).
- Full monorepo `pnpm turbo typecheck`, `pnpm turbo lint`, `pnpm turbo test` all green: mobile 213/213 tests (26/26 in `index.test.tsx`), core 41/41, supabase 27/27 (+50 skipped RLS), sync 23/23.

### File List

- `apps/mobile/app/(app)/index.tsx` — modified (T1)
- `apps/mobile/app/(app)/index.test.tsx` — modified (T3)
- `apps/mobile/src/i18n/locales/en.json` — modified (T2)
- `apps/mobile/src/i18n/locales/hi.json` — modified (T2)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (status tracking)

### Change Log

- 2026-06-17: Story 6.3 implemented end-to-end — replaced the `'progressing'` state placeholder in `index.tsx` with a real context card (supporting copy + fear item description, `home.state4.cta` CTA, `/session/active` navigation), covering both the primary `sessionRecoveryData` path and the cross-device `activeSession` fallback (including a `null` `fearItemId` sub-case). Added/replaced i18n keys `home.state4.context` and `home.state4.cta`, removed the unused `home.state4.placeholder` stub key. Rewrote the `'progressing'` test block (7 tests) and updated one pre-existing test asserting the old stub copy. All 4 tasks complete; status → review.
