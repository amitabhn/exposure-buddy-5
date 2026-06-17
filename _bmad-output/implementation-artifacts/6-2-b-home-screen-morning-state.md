# Story 6.2-B: Home Screen Morning State (State 3)

**Status:** review

## Story

As a user who has completed onboarding and has no active exposure thread,
I want a home screen that surfaces today's challenge clearly,
So that I know exactly what to do next without hunting through the app (FR-HOME-01, FR-HOME-03, UX-DR-14).

*Splits from: original Story 6.2 (rejected 2026-06-16, party-mode roundtable). Depends on: Story 6.2-A merged ✅ (PR #39).*
*Enables: Story 6.2-C (ladder item delete, parallel-safe) and Story 6.3 (home screen progressing state, State 4).*

---

## Acceptance Criteria

### AC 1 — `resolveHomeScreenState` implements the MVP priority ladder

**Given** `packages/core/src/erp/home-screen-state.ts` currently exports the Story 5.6 stub `resolveHomeScreenState(): 'default'`
**When** this story is implemented
**Then**:
- The function signature becomes `resolveHomeScreenState(ctx: HomeScreenContext): HomeScreenState`, both types matching `ADR-HOME-STATE-RESOLVE.md` exactly (`HomeScreenContext` shape: `hasAccount`, `hasLadder`, `activeThread: { exists, openCount, openDurationHours, userDeclaredIncomplete } | null`, `gapDays`, `ladderComplete`, `nowMs`)
- `HomeScreenState` is the full ADR union (`'first-use' | 'empty-ladder' | 'morning' | 'progressing' | 'avoidance' | 'mid-exposure' | 'return-after-gap' | 'completed'`) for type-contract stability, even though this story's implementation never returns `'avoidance'`, `'mid-exposure'`, or `'return-after-gap'` (see scope note below)
- The implemented priority order (first match wins) is:
  1. `first-use` — `!ctx.hasAccount`
  2. `completed` — `ctx.ladderComplete`
  3. `empty-ladder` — `ctx.hasAccount && !ctx.hasLadder`
  4. `progressing` — `ctx.activeThread?.exists === true`
  5. `morning` — unconditional final `else` (not a re-guarded branch)
- This 5-branch chain is exhaustive over the 4 boolean inputs it reads (`hasAccount`, `ladderComplete`, `hasLadder`, `activeThread?.exists`): by the time branch 5 is reached, branches 1–4 have already excluded `!hasAccount`, `ladderComplete`, `hasAccount && !hasLadder`, and `activeThread?.exists`, so the only remaining combination is `hasAccount && hasLadder && !ladderComplete && !activeThread?.exists` — exactly `morning`. Implement as an `if`/`else if`/`else` chain (or `switch` with a final `default`), not five independently-guarded branches that could theoretically all fail to match
- **State 5 (`avoidance`) is deferred post-MVP.** The function does NOT evaluate `openCount`, `openDurationHours`, or `userDeclaredIncomplete` — any active thread resolves to `progressing` regardless of those fields. A code comment reads `// State 5 (avoidance detection) deferred post-MVP` (this exact comment is referenced by Story 6.3's epics text as "the existing state 5 comment" — it must originate here)
- **State 9 (`return-after-gap`) is deferred post-MVP.** The function does NOT evaluate `ctx.gapDays` and does NOT reference `suds_baselines` (table does not exist). A code comment reads `// State 9 (re-engagement re-baseline) deferred post-MVP — falls through to state 3` (verbatim from epics.md Epic 5 description)
- `mid-exposure` is never returned (ADR: resolved by the in-the-moment session screen, not the home screen) — a code comment documents this exclusion per the ADR's "Consequences" section
- `nowMs` is accepted but unused by this story's logic (kept for ADR type-contract stability; will be needed if/when `return-after-gap` is implemented)

### AC 2 — `resolveHomeScreenState` test coverage

**Given** the ADR specifies minimum test cases, adjusted for the state 5/9 omission above
**When** tests are written
**Then** `packages/core/src/erp/home-screen-state.test.ts` covers at minimum:
1. `!hasAccount` → `first-use`
2. `ladderComplete = true` (with `hasLadder = true`, `activeThread` set, `gapDays = 15`) → `completed` (proves `completed` outranks everything else, including the omitted gap-check; this is a synthetic test of priority ordering — it does not assert that "all items completed AND an active thread" is a reachable real-world combination, only that *if* the resolver is ever called with it, `completed` wins)
3. `hasAccount && !hasLadder && !ladderComplete` → `empty-ladder`
4. `activeThread = { exists: true, openCount: 0, openDurationHours: 0, userDeclaredIncomplete: false }` → `progressing`
5. `activeThread = { exists: true, openCount: 99, openDurationHours: 999, userDeclaredIncomplete: true }` → `progressing`, NOT `avoidance` (explicit regression test proving state 5 is correctly omitted — this is the most important test in the suite, guards against someone "helpfully" wiring up avoidance logic against the ADR's table without re-reading the MVP scope note)
6. `hasLadder = true && activeThread = null` → `morning`
7. `hasLadder = true && activeThread = null && gapDays = 15` → `morning`, NOT `return-after-gap` (regression test proving state 9 is correctly omitted)

### AC 3 — `resolveLowestPendingItem` tiebreaker matches the SQL ordering

**Given** `useFearLadderItems`'s query (`apps/mobile/src/hooks/useFearLadderItems.ts`) already returns rows `ORDER BY position ASC, id ASC` from PowerSync
**When** `resolveLowestPendingItem` (`packages/core/src/selectors/fearLadder.ts`) sorts pending items
**Then** the sort comparator is `(a, b) => a.position - b.position || a.id.localeCompare(b.id)` — matching the DB-layer tiebreaker so client-side resolution is deterministic and defensive regardless of input order (selectors in `packages/core` are pure functions and must not assume their caller already sorted correctly); a test case covers two pending items with identical `position` resolving by ascending `id`

### AC 4 — Home screen builds `HomeScreenContext` from real PowerSync data and renders per state

**Given** `apps/mobile/app/(app)/index.tsx` currently hardcodes `resolveLowestPendingItem([])` and `ladderItemCount={0}` (Story 5.6 stub), and `useFearLadderItems` (live since 6.2-A) returns real `{ items, isLoading }`
**When** this story is implemented
**Then**:
- A new hook `useActiveExposureSession(userId)` is added at `apps/mobile/src/hooks/useActiveExposureSession.ts`, mirroring `useFearLadderItems`'s structure exactly: `useQuery` from `@exposure-buddy/sync` against `SELECT id, fear_item_id, started_at FROM exposure_sessions WHERE status = 'started' ORDER BY started_at DESC LIMIT 1`, returning `{ activeSession: { id, fearItemId, startedAt } | null; isLoading: boolean }`. The query is intentionally NOT scoped by `fear_item_id` — AC text in epics.md (Story 6.2 original) defines "no `exposure_sessions` row with `status = 'started'` exists for this user" as a global check, not per-item
- `apps/mobile/app/(app)/index.tsx` calls both `useFearLadderItems(authState.userId)` and `useActiveExposureSession(authState.userId)`; while either `isLoading` is true, the screen renders a loading state (no flash of the wrong state — this is exactly why 6.2-A's `useFearLadderItems` distinguishes `isLoading` from `items.length === 0`)
- Once both queries resolve, the screen builds `HomeScreenContext`: `hasAccount: true` (hardcoded — `(app)/_layout.tsx`'s route guard already redirects unauthenticated users to `/(auth)/sign-in` before this screen can mount, so `first-use` is defensively unreachable here, not actively detected), `hasLadder: items.length > 0`, `ladderComplete: items.length > 0 && items.every(i => i.status === 'completed')`, `activeThread: activeSession ? { exists: true, openCount: 0, openDurationHours: 0, userDeclaredIncomplete: false } : null` (the three unused fields are zeroed/false placeholders — they are never read per AC 1, but populated for type correctness), `gapDays: 0` (unused per AC 1), `nowMs: Date.now()`
- `resolveHomeScreenState(ctx)` is called and the result drives rendering:
  - `'morning'` → existing card UI (real `lowestPendingItem` via `resolveLowestPendingItem(items)`, real `ladderItemCount={items.length}`) — this replaces today's hardcoded stub
  - `'completed'` → a one-sentence stub, no CTA, using `t('home.state10.message')` (state 10 — per epics.md AC: "the home screen renders a ladder-complete stub (state 10 placeholder — one sentence, no CTA)")
  - `'empty-ladder'` → reuses the existing `t('ladder.emptyState')` copy as the message and `t('ladder.addItem')` ("Add situation") as the CTA button label, navigating to `/ladder` on press (no new i18n key needed — this state is reachable today because onboarding allows a 0-item ladder, commit a78dc1d; reusing both the existing message AND the existing button label keeps the home-screen empty state visually/textually consistent with the ladder screen's own empty state)
  - `'progressing'` → a minimal one-line placeholder using `t('home.state4.placeholder')` with a CTA navigating to `/ladder`. **This is intentionally minimal** — Story 6.3 owns the polished state 4 card (context copy, dedicated CTA back into the active session) and will replace this key/placeholder; do not over-build it here
  - `'first-use'` → renders the same as `'empty-ladder'` (unreachable in production — `index.tsx` always passes `hasAccount: true` because it defers entirely to `(app)/_layout.tsx`'s existing route guard, which this story does not re-implement)
  - `'avoidance'`, `'mid-exposure'`, `'return-after-gap'` → never produced by `resolveHomeScreenState` in this story (AC 1), but `HomeScreenState` is still an 8-member type, so the render switch must include a `default` case (rendering the same as `'empty-ladder'`) for TypeScript exhaustiveness and defensive robustness against a future change to the resolver. No dedicated test is required for this branch beyond a typecheck pass — it documents an impossible-today state, it does not exercise new behavior
- The `firstHomeVisitSeen` greeting logic, the accessibility-focus effect, and the "Calm Me" button are unchanged — they are orthogonal to which state card renders

### AC 5 — `CourageLadderEntryCard` clamps `predictedSuds`

**Given** `predictedSuds` is currently rendered as raw interpolation (`{lowestPendingItem.predictedSuds}/10`) with no defensive bound
**When** `packages/ui/src/components/CourageLadderEntryCard.tsx` renders the SUDS label
**Then** the displayed value is `Math.min(10, Math.max(0, Math.round(lowestPendingItem.predictedSuds)))` before interpolation. The DB `CHECK` constraint and onboarding calibration are still the primary guarantee that `predictedSuds` stays in `[0, 10]` — this clamp does not replace that. It is defense-in-depth at the render boundary, consistent with the existing `4-4-CR-D1` precedent elsewhere in this codebase, not a reaction to a known live bug

### AC 6 — All new/changed strings are i18n-gated

**Given** project convention requires every user-facing string to use `t()` (CI lint enforced)
**When** this story adds `home.state10.message` and `home.state4.placeholder`
**Then** both keys are added to `apps/mobile/src/i18n/locales/en.json` AND `apps/mobile/src/i18n/locales/hi.json` (Hindi translation not yet localized — duplicate the English copy in `hi.json`, matching the existing convention for every other key in that file); no raw string literals appear in any changed component; CI i18n lint passes

---

## Tasks / Subtasks

### T1 — `resolveHomeScreenState`: full MVP state machine (AC: 1, 2)

- [x] Replace the `() => 'default'` stub in `packages/core/src/erp/home-screen-state.ts` with `HomeScreenContext`/`HomeScreenState` types matching `ADR-HOME-STATE-RESOLVE.md`
- [x] Implement the 5-branch priority ladder from AC 1 (first-use → completed → empty-ladder → progressing → morning)
- [x] Add the two deferral comments verbatim (state 5, state 9) — Story 6.3 depends on the state-5 comment already existing
- [x] Update `packages/core/src/index.ts`: rename the exported type from `HomeDisplayState` to `HomeScreenState` (repo-wide grep during story creation confirmed `HomeDisplayState` has zero consumers outside `packages/core/src/erp/home-screen-state.ts` and its own test file — no other call sites to update)
- [x] Write all 7 test cases from AC 2 in `packages/core/src/erp/home-screen-state.test.ts`

### T2 — `resolveLowestPendingItem`: tiebreaker (AC: 3)

- [x] Add `|| a.id.localeCompare(b.id)` to the sort comparator in `packages/core/src/selectors/fearLadder.ts`
- [x] Add the duplicate-position test case to `packages/core/src/__tests__/selectors/fearLadder.test.ts`

### T3 — `useActiveExposureSession` hook (AC: 4)

- [x] Create `apps/mobile/src/hooks/useActiveExposureSession.ts`, mirroring `useFearLadderItems.ts`'s structure (import `useQuery` from `@exposure-buddy/sync`, define the row type, `useMemo` the mapped result, return `{ activeSession, isLoading }`)
- [x] Add a Jest test at `apps/mobile/src/hooks/useActiveExposureSession.test.ts` mirroring `useFearLadderItems.test.ts`'s mock pattern (mock `@exposure-buddy/sync`'s `useQuery`)

### T4 — Wire `index.tsx` to the real state machine (AC: 4, 5, 6)

- [x] Update `apps/mobile/app/(app)/index.tsx`: call `useFearLadderItems` and `useActiveExposureSession`, build `HomeScreenContext`, call `resolveHomeScreenState`, branch render per AC 4
- [x] Add a loading-state render path (both hooks' `isLoading`)
- [x] Keep existing greeting / accessibility-focus / Calm Me button logic unchanged

### T5 — `CourageLadderEntryCard` SUDS clamp (AC: 5)

- [x] Apply the clamp from AC 5 in `packages/ui/src/components/CourageLadderEntryCard.tsx`
- [x] `packages/ui` has no RN-renderable test files (Vitest `passWithNoTests: true` — see project memory); the clamp is exercised indirectly via the `apps/mobile` Jest tests in T6, not a new `packages/ui` test

### T6 — i18n keys (AC: 6)

- [x] Add `home.state10.message` and `home.state4.placeholder` to `apps/mobile/src/i18n/locales/en.json` and `hi.json` (English copy duplicated in both, matching existing convention)

### T7 — Tests (AC: all)

- [x] Update `apps/mobile/app/(app)/index.test.tsx`: the existing mocks for `@exposure-buddy/core` (`resolveLowestPendingItem`) and a new mock for `useActiveExposureSession` need real per-test return values now that the screen branches on resolved state — existing tests asserting the morning-state card and Calm Me button must keep passing under a `'morning'`-context mock; add new tests for `'completed'`, `'empty-ladder'`, and `'progressing'` render branches and for the loading-state render path. The file's existing `beforeEach` already calls `jest.clearAllMocks()`, so the new `resolveHomeScreenState` mock's return value does NOT persist across tests — set it explicitly per-test (or per-`describe` block via its own `beforeEach`), do not rely on a single module-level default
- [x] All `packages/core` and `apps/mobile` test additions described in T1–T4 above

### T8 — CI verification (AC: all)

- [x] `pnpm turbo typecheck` — 0 errors across all packages/apps
- [x] `pnpm turbo lint` — 0 errors, including i18n-literal-string lint and ARC-011 boundary check on `packages/core`
- [x] `pnpm turbo test` — all Vitest (packages) and Jest (apps/mobile) suites green

---

### Review Findings

*Pre-implementation spec review (Blind Hunter + Edge Case Hunter, no-spec mode — the diff reviewed was this story file itself) — 2026-06-17.*

- [x] [Review][Patch] AC 1's 5-branch ladder is exhaustive over (hasAccount, ladderComplete, hasLadder, activeThread.exists) but this isn't stated explicitly; `index.tsx`'s render switch also needs an explicit default/fallback for the 3 type-level-possible-but-never-returned states (`avoidance`, `mid-exposure`, `return-after-gap`) for TypeScript exhaustiveness [AC 1, AC 4]
- [x] [Review][Patch] Dev Notes "Scope decision" section is internally inconsistent about provenance: it says the state-9 comment is "verbatim from epics.md" AND that the state-5 comment "must originate here" — these are different claims (one is a quote, one is original text) that need to be distinguished [Dev Notes § Scope decision]
- [x] [Review][Patch] AC 2 test case 2 (`ladderComplete=true` with `activeThread` set) needs a one-line note clarifying it's a synthetic test proving priority ordering, not an assertion that this state combination is reachable in the real domain [AC 2, test case 2]
- [x] [Review][Patch] AC 3's justification for the tiebreaker ("DEFERRABLE constraint causes transiently duplicate positions" visible to client reads) is technically inaccurate — PowerSync/SQLite clients only observe committed rows, never mid-transaction state. The tiebreaker is still correct and worth keeping, but for defensive/deterministic-ordering reasons, not the stated one [AC 3]
- [x] [Review][Patch] AC 4's `hasAccount: true` hardcoding is described as "defensive" when it's actually the opposite — it removes the check and trusts `(app)/_layout.tsx`'s guard entirely. Reword to describe it accurately (deferring to an existing, already-relied-upon contract) [AC 4]
- [x] [Review][Patch] T1's "update the one other consumer if any" is hedged language for a fact already known — repo-wide grep (run during story creation) confirms `HomeDisplayState` has zero consumers outside `home-screen-state.ts` and its own test file. State this directly instead of hedging [T1]
- [x] [Review][Patch] T7 should note explicitly that the existing `index.test.tsx` `beforeEach` already calls `jest.clearAllMocks()`, so the new `resolveHomeScreenState` mock's return value must be set per-test/per-`describe` block, not assumed to persist across tests [T7]
- [x] [Review][Patch] AC 5's clamp should explicitly state it's defense-in-depth consistent with the existing `4-4-CR-D1` precedent elsewhere in the codebase, not a reaction to a known live bug — the DB constraint is still trusted as the primary guarantee [AC 5]
- [x] [Review][Patch] AC 4's `empty-ladder` render reuses `t('ladder.emptyState')` for the message but doesn't specify a button label — should also reuse `t('ladder.addItem')` ("Add situation") as the CTA button label for consistency with the ladder screen's own empty state [AC 4]
- [x] [Review][Defer] A user can have active `'started'` sessions on two *different* fear items simultaneously (the `uq_active_thread` constraint only prevents duplicates on the *same* item); `useActiveExposureSession`'s `LIMIT 1 ORDER BY started_at DESC` silently picks the most recent and the other stays invisible to `HomeScreenContext`. Zero behavioral impact on this story (the `progressing` placeholder CTA navigates generically to `/ladder`, not to a specific session), but Story 6.3 will need to resolve which active session to resume — deferred, pre-existing system gap, not introduced by this story [AC 4, `useActiveExposureSession`]
- [x] [Review][Defer] `HomeScreenContext.activeThread`'s `openCount`/`openDurationHours`/`userDeclaredIncomplete` fields are permanently zeroed placeholders in this story's context-building code, required only to satisfy the ADR's type contract since `avoidance` isn't implemented yet. This is a structural tension in the ADR's type design (could be made optional instead) that this story can't fix without touching a cross-story contract — deferred, pre-existing ADR design tradeoff [AC 4, ADR-HOME-STATE-RESOLVE.md]

---

## Dev Notes

### Scope decision: why `avoidance` and `return-after-gap` are omitted, not partially implemented

The ADR (`ADR-HOME-STATE-RESOLVE.md`) defines a provisional full 10-state table (8 active states post-Story-5.6) including `avoidance` (openCount/duration/userDeclaredIncomplete heuristics) and `return-after-gap` (10-day gap re-baseline). Neither heuristic has any data source in the codebase yet:
- `openCount` / `openDurationHours` / `userDeclaredIncomplete` — no mechanism exists anywhere to track "app opens with an active thread" or "user declared a thread incomplete." Building one is out of scope for this story.
- `suds_baselines` (needed for `return-after-gap`) — table does not exist; Story 6.4 that would create it is **deferred post-MVP** (see `epics.md` Story 6.4 status banner).

These two comments have different provenance — be precise about which is which:
- The **state-9 comment is quoted verbatim from `epics.md`'s Epic 5 description (line 307)**, which spells out the exact required text: `// State 9 (re-engagement re-baseline) deferred post-MVP — falls through to state 3`. Copy it exactly.
- The **state-5 comment is newly authored by this story.** `epics.md`'s Story 6.3 text (line 1350) only says `avoidance` is "explicitly deferred post-MVP" and refers to "the existing state 5 comment" without giving exact wording — it expects this story to have already left *some* comment there, not a specific string. This story originates that text (`// State 5 (avoidance detection) deferred post-MVP`, matching the state-9 comment's style); Story 6.3 depends on a comment existing at that line, not on these exact words.

Implementing partial/fake heuristics for either state (e.g., always `false`) would be worse than omitting the branch entirely — it would silently diverge from the ADR's documented contract instead of leaving an honest, search-able marker for the post-MVP follow-up. This isn't a discretionary call: `epics.md` line 307 explicitly mandates omission with a specific comment for state 9, and explicitly forbids referencing `suds_baselines` (the table doesn't exist).

### Files this story touches — current state going in

| File | Current state | This story |
|---|---|---|
| `packages/core/src/erp/home-screen-state.ts` | `() => 'default'` stub (Story 5.6) | Full 5-branch resolver |
| `packages/core/src/erp/home-screen-state.test.ts` | 1 test (`returns default unconditionally`) | 7 tests per AC 2 |
| `packages/core/src/selectors/fearLadder.ts` | `resolveLowestPendingItem` sorts by `position` only | Adds `id` tiebreaker |
| `packages/core/src/index.ts` | exports `HomeDisplayState` | exports `HomeScreenState` (clean rename — no other consumers) |
| `apps/mobile/app/(app)/index.tsx` | Hardcodes `resolveLowestPendingItem([])`, `ladderItemCount={0}`, single unconditional layout | Real data, state-branched rendering |
| `apps/mobile/app/(app)/index.test.tsx` | Mocks `resolveLowestPendingItem` to always return `null`, no state branching | Mocks both hooks + resolver per test case |
| `packages/ui/src/components/CourageLadderEntryCard.tsx` | Raw `{predictedSuds}/10` interpolation | Clamped, rounded |
| `apps/mobile/src/hooks/useActiveExposureSession.ts` | Does not exist | New, mirrors `useFearLadderItems.ts` |
| `apps/mobile/src/i18n/locales/en.json`, `hi.json` | No `home.state4.*` / `home.state10.*` keys | Two new keys each |

### `useFearLadderItems` — the pattern to mirror exactly

```typescript
// apps/mobile/src/hooks/useFearLadderItems.ts (live since 6.2-A)
export function useFearLadderItems(
  _userId: string | null,
): { items: FearLadderItem[]; isLoading: boolean } {
  const { data, isLoading } = useQuery<FearLadderRow>(QUERY)
  const items = useMemo(() => /* map + filter */, [data])
  return { items, isLoading }
}
```

`useActiveExposureSession` should follow this exact shape — same `useQuery` import source (`@exposure-buddy/sync`, never `@powersync/react-native` directly — that import is ESLint-banned in `apps/mobile` per ARC-005), same `isLoading` semantics (true until first SQLite resolve, distinct from "loaded, no active session").

### PowerSync gotchas carried forward from 6.2-A (still apply)

- Import `useQuery` from `@exposure-buddy/sync`, never `@powersync/react-native` directly (ARC-005 ESLint rule)
- `useQuery` is a top-level hook, not a method on a `db` instance
- Do not call hooks conditionally after an early return — 6.2-A hit this exact P0 bug (module-scope placeholder db pattern); this story's hooks should be called unconditionally at the top of `index.tsx` same as the existing `useEffect`s already are
- `isLoading` and "empty result" are different things — never conflate them when deciding what to render

### Schema reference (no migrations in this story — both done in 6.2-A)

`exposure_sessions` (post migration 0022): `id, user_id, fear_item_id, status ('started'|'completed'|'abandoned'), started_at, completed_at, notes, created_at, updated_at`, plus partial unique index `uq_active_thread ON (user_id, fear_item_id) WHERE status = 'started'`.

`fear_ladder_items` (post migration 0021): `id, user_id, description, predicted_suds, peak_suds (nullable), position, status ('pending'|'completed'), created_at, updated_at`, plus `uq_user_position UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED`.

### Test mock pattern — `apps/mobile/app/(app)/index.test.tsx`

The existing test file mocks `@exposure-buddy/core` to return `resolveLowestPendingItem: jest.fn(() => null)` unconditionally, and the screen has no branching today so every existing test implicitly runs against a single layout. After this story, the screen branches on `resolveHomeScreenState`'s result, so:
- Mock `@exposure-buddy/core` to also export `resolveHomeScreenState: jest.fn()` (mockable per-test) alongside the existing `resolveLowestPendingItem` mock
- Mock the new `useActiveExposureSession` hook (likely via `jest.mock('../../src/hooks/useActiveExposureSession')`, matching how the file presumably already mocks or will mock `useFearLadderItems`)
- All 11 existing tests in this file assert behavior that only applies to the `'morning'` branch (greeting, card, Calm Me button) — set `resolveHomeScreenState` to return `'morning'` in `beforeEach` so those tests keep passing unmodified, then add new `describe` blocks per other state

### References

- `_bmad-output/planning-artifacts/adrs/ADR-HOME-STATE-RESOLVE.md` — full state machine contract, priority table, ADR-mandated test cases (this story implements a deliberately reduced subset — see Scope Decision above)
- `_bmad-output/planning-artifacts/epics.md` lines 298–1342 (Story 6.2 / Epic 6 intro) and lines 1344–1370 (Story 6.3) — canonical MVP acceptance criteria and the state-5/state-9 omission instructions
- `_bmad-output/implementation-artifacts/6-2-a-powersync-foundation.md` — predecessor story; "Out of Scope" section (items 1–6) is this story's starting brief; Dev Agent Record documents the PowerSync hook patterns and 7 post-review patches to be aware of
- `_bmad-output/implementation-artifacts/5-6-remove-home-states-7-and-8.md` — why states 7/8 were removed and why `resolveHomeScreenState` was left as a trivial stub at the time
- `_bmad-output/implementation-artifacts/deferred-work.md` — `BACKLOG-EPIC6-D1` (soft recency acknowledgement on State 3, deferred) and `BACKLOG-EPIC9-D1` (launch-time auto-route to debrief, deferred) — do not implement either in this story

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6)

### Debug Log References

None — no blocking issues encountered. `pnpm turbo typecheck`, `pnpm turbo lint`, and `pnpm turbo test` all passed clean on first full run after implementation.

### Completion Notes List

- T1: `resolveHomeScreenState` implemented as an `if`/`else if` chain exactly matching AC 1's 5-branch priority ladder. Both deferral comments (state 5, state 9) added verbatim. `HomeScreenContext`/`HomeScreenState` match the ADR's type shapes exactly. All 7 AC 2 test cases added and passing.
- T1: Confirmed via repo-wide grep that `HomeDisplayState` had zero consumers outside `home-screen-state.ts`/its test file before renaming the `packages/core/src/index.ts` export to `HomeScreenState` (also added `HomeScreenContext` to the export surface since `apps/mobile` needs it for typing `index.tsx`'s context object).
- T2: Tiebreaker added to `resolveLowestPendingItem`'s sort comparator; new test case covers two items with identical `position` resolving by ascending `id`.
- T3: `useActiveExposureSession` mirrors `useFearLadderItems`'s shape exactly (same `useQuery` import source, same `isLoading` semantics). 4 new Jest tests added, all passing.
- T4: `index.tsx` now calls both hooks unconditionally at the top (no conditional-hooks bug per the 6.2-A gotcha), builds `HomeScreenContext`, and branches render on `resolveHomeScreenState`'s result. Loading state (either hook) renders an `ActivityIndicator` with `accessibilityLabel={t('common.loading')}`, matching the existing pattern in `ladder.tsx`. The `'empty-ladder'`/`'first-use'`/default (type-level-only states) branches share one render path per AC 4.
- T5: SUDS clamp applied as a one-line defensive change at the render boundary; no new `packages/ui` test added per the task's explicit instruction (Vitest `passWithNoTests: true`, no RN-renderable test files in that package).
- T6: Two new i18n keys added to both `en.json` and `hi.json` (English copy duplicated in `hi.json` per existing convention — Hindi not yet localized for this file).
- T7: `index.test.tsx` rewritten with per-test-mockable `resolveHomeScreenState`, `useFearLadderItems`, and `useActiveExposureSession` mocks. All 11 original tests pass unmodified under a `'morning'`-context default in `beforeEach`. Added 6 new tests across loading/`completed`/`empty-ladder`/`progressing` branches — 17 tests total, all passing.
- T8: `pnpm turbo typecheck`, `pnpm turbo lint`, and `pnpm turbo test` all green across all 6 packages/apps (193 mobile Jest tests, 41 core Vitest tests, plus supabase/sync/ui suites — no regressions).

### File List

- `packages/core/src/erp/home-screen-state.ts` (modified)
- `packages/core/src/erp/home-screen-state.test.ts` (modified)
- `packages/core/src/selectors/fearLadder.ts` (modified)
- `packages/core/src/__tests__/selectors/fearLadder.test.ts` (modified)
- `packages/core/src/index.ts` (modified)
- `apps/mobile/src/hooks/useActiveExposureSession.ts` (new)
- `apps/mobile/src/hooks/useActiveExposureSession.test.ts` (new)
- `apps/mobile/app/(app)/index.tsx` (modified)
- `apps/mobile/app/(app)/index.test.tsx` (modified)
- `packages/ui/src/components/CourageLadderEntryCard.tsx` (modified)
- `apps/mobile/src/i18n/locales/en.json` (modified)
- `apps/mobile/src/i18n/locales/hi.json` (modified)

### Change Log

- 2026-06-17 — Implemented Story 6.2-B: full `resolveHomeScreenState` MVP state machine, `resolveLowestPendingItem` tiebreaker, `useActiveExposureSession` hook, `index.tsx` wired to real PowerSync data with per-state rendering, `CourageLadderEntryCard` SUDS clamp, new i18n keys. Status moved to "review".
