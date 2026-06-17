# Story 6.3: Home Screen Progressing State (State 4)

Status: ready-for-dev

## Story

As a user who has an active exposure thread in progress,
I want the home screen to acknowledge my ongoing session and invite me to continue,
so that I can re-enter the session without confusion (FR-HOME-02, UX-DR-14).

*State 5 (avoidance detection) and State 9 (re-engagement re-baseline) are deferred post-MVP — both deferral comments already exist in `resolveHomeScreenState` (added in Story 6.2-B). This story does NOT touch `packages/core/src/erp/home-screen-state.ts` — the state machine already returns `'progressing'` correctly. Scope here is the `apps/mobile/app/(app)/index.tsx` UI for the `'progressing'` branch only, which today is a placeholder stub.*

## Acceptance Criteria

1. **Given** at least one `exposure_sessions` row with `status = 'started'` exists for this user, **when** the home screen mounts, **then** state 4 renders — a context card shows the fear item description; supporting copy reads `t('home.state4.context')` (canonical English: "You have an exposure in progress"); the CTA navigates back into the active session screen (`/session/active`).
2. **Given** the session has an `expires_at` timestamp, **when** state 4 renders, **then** `expires_at` is NOT displayed to the user in any form — no raw epoch or human-readable timestamp appears on the home screen for an active session.
3. **Given** state 5 (avoidance) is deferred, **when** the home screen evaluates which state to show, **then** the state machine does NOT evaluate avoidance heuristics — `// State 5 (avoidance detection) deferred post-MVP` already exists in `resolveHomeScreenState`; verify it is untouched, do not duplicate or move it.
4. **Given** all user-facing strings are i18n-gated, **when** the state 4 screen renders, **then** every visible string uses `t()`; no raw string literals appear in the component; CI lint (`i18next/no-literal-string`) passes.

[Source: `_bmad-output/planning-artifacts/epics.md` lines 1344–1370]

## Tasks / Subtasks

- [ ] **T1 — Replace the `'progressing'` placeholder branch in `index.tsx`** (AC: 1, 2, 4)
  - [ ] Destructure `sessionRecoveryData` from `useAuth()` (already imported in `index.tsx`) — this is the canonical, already-proven data source for "resume an in-progress session," identical to the pattern in `(app)/_layout.tsx`'s `handleRecoveryResume` (see Dev Notes — Data source decision).
  - [ ] Render a context card (reuse the existing `placeholderCard`/`placeholder` `StyleSheet` entries — do not create a new shared UI component for this) showing two pieces of text: the supporting copy `t('home.state4.context')` and the fear item description (`sessionRecoveryData.description` when available).
  - [ ] On press, navigate with `router.push` to `/session/active?sessionId=...&fearItemId=...&description=...&preSuds=...`, building the URL with the exact same null-safety pattern as `(app)/_layout.tsx:handleRecoveryResume` (`fearItemId != null ? encodeURIComponent(fearItemId) : ''`). Add `// eslint-disable-line i18next/no-literal-string` on the template-literal line (existing convention for route strings throughout `apps/mobile/app/session/*.tsx`).
  - [ ] Handle the cross-device fallback: if `sessionRecoveryData` is `null` but `activeSession` (from `useActiveExposureSession`, already wired) is non-null — this happens when a session was started on a different device, so this device's MMKV never received the recovery blob — render the context card using only the supporting copy (no description text) and navigate using `activeSession.id` / `activeSession.fearItemId` with `description=''` and `preSuds=0`. Do not crash or render nothing in this case; `'progressing'` state must always be actionable.
  - [ ] Confirm no code path renders `expires_at` (it is not even fetched by `useActiveExposureSession` or `sessionRecoveryData` today — keep it that way; do not add an expiry fetch as part of this story).
- [ ] **T2 — i18n keys** (AC: 1, 4)
  - [ ] Add `home.state4.context` = "You have an exposure in progress" to `apps/mobile/src/i18n/locales/en.json` and `hi.json` (English copy duplicated in `hi.json`, matching the existing convention noted in Story 6.2-B's Dev Agent Record — Hindi not yet localized for this file).
  - [ ] Remove the now-unused `home.state4.placeholder` key from both locale files — it was a Story 6.2-B stub key ("You have an exposure in progress. Tap to view your ladder.") and has no remaining usages once T1 lands. Grep both locale files' usages before deleting to confirm.
- [ ] **T3 — Tests** (AC: all)
  - [ ] Update `apps/mobile/app/(app)/index.test.tsx`'s `describe("'progressing' state")` block (currently lines 181–196): replace the two existing tests (`renders the state4 placeholder`, `placeholder CTA navigates to /ladder`) — they assert the old stub behavior and will fail once T1 lands.
  - [ ] New test: context card renders `t('home.state4.context')` and the fear item description when `sessionRecoveryData` is populated.
  - [ ] New test: tapping the card calls `mockPush` with a `/session/active?...` URL containing `sessionId`, `fearItemId`, `description`, `preSuds` from `sessionRecoveryData`.
  - [ ] New test: cross-device fallback — `sessionRecoveryData: null`, `activeSession` populated — card still renders and CTA still navigates to `/session/active` (using `activeSession`'s fields).
  - [ ] Update the existing `HomeScreenContext construction (real resolveHomeScreenState)` test at line 230 (`'an active session maps to activeThread.exists -> progressing state'`) — it currently asserts `getByText('home.state4.placeholder')`; this assertion must change to the new copy key.
  - [ ] Add `sessionRecoveryData: null` to `defaultAuthValue` in the test file's `beforeEach` (it is not currently part of the mocked `useAuth()` shape) so existing non-progressing tests are unaffected, and override per-test in the new progressing tests.
- [ ] **T4 — CI verification** (AC: all)
  - [ ] `pnpm turbo typecheck`, `pnpm turbo lint`, `pnpm turbo test` all green.

## Dev Notes

### Scope is narrower than it first appears — read this before touching `home-screen-state.ts`

`resolveHomeScreenState` (in `packages/core/src/erp/home-screen-state.ts`) already implements the `'progressing'` branch correctly — it was built in Story 6.2-B alongside the rest of the MVP state machine:

```typescript
// packages/core/src/erp/home-screen-state.ts (current, unchanged by this story)
if (ctx.activeThread?.exists === true) return 'progressing'
// State 9 (re-engagement re-baseline) deferred post-MVP — falls through to state 3
```

The `// State 5 (avoidance detection) deferred post-MVP` comment is one line above this. AC 3 just asks you to verify it's there, not write it. **Do not modify `home-screen-state.ts` or its test file in this story** — there is no AC requiring a state-machine change, and 6.2-B's 7 ADR-mandated test cases already cover it. The only thing left undone from the epics.md Story 6.3 text is the **rendering** of state 4 in `apps/mobile/app/(app)/index.tsx`, which 6.2-B intentionally left as a placeholder stub:

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
| `apps/mobile/src/i18n/locales/en.json` | Has `home.state4.placeholder` | Replace with `home.state4.context`; same in `hi.json` |
| `apps/mobile/src/i18n/locales/hi.json` | Has `home.state4.placeholder` | Replace with `home.state4.context` |

**Not touched:** `packages/core/src/erp/home-screen-state.ts` (already correct), `apps/mobile/src/hooks/useActiveExposureSession.ts` (no new query needed), `apps/mobile/app/session/active.tsx` (consumed as-is), `apps/mobile/app/(app)/_layout.tsx` (pattern referenced, not modified), any Supabase migration (no schema change — `expires_at` already exists from Story 6.2-C, AC 2 is a negative/verification requirement, not a new feature).

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

### Debug Log References

### Completion Notes List

### File List
