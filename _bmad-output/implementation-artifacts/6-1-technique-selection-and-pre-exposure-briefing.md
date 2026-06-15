# Story 6.1: Technique Selection & Pre-Exposure Briefing

Status: ready-for-dev

## Story

As a user preparing to begin an exposure session,
I want to choose a calming technique and receive a brief orientation before I start,
So that I enter the exposure feeling prepared and grounded (FR-SESSION-04, FR-SESSION-05).

*Depends on: Story 5.3 merged to main ✅. Story 5.6 merged to main ✅ (home screen simplified; `pause.tsx` still present but superseded by `briefing.tsx` in this story's flow).*

## Acceptance Criteria

1. **DB — `technique` column added to `exposure_sessions`**

   Given the `exposure_sessions` table has no `technique` column
   When migration `0020_exposure_sessions_technique.sql` runs
   Then `ALTER TABLE public.exposure_sessions ADD COLUMN technique text CHECK (technique IN ('somatic', 'breathing', 'cognitive'))` executes successfully; the column is nullable — existing rows keep `NULL` and no backfill is required; `supabase/sync-rules.yaml`'s `exposure_sessions` SELECT gains `technique` in the column list; `packages/sync/src/schema.ts` `exposure_sessions` Table definition gains `technique: column.text`; a session completed without a `technique` value (technique = NULL) is treated gracefully everywhere downstream — no crash, no null-guard omission in debrief branch logic (debrief.tsx is NOT touched in this story; the NULL tolerance is a forward-compatibility note)

2. **Core — `TechniqueType` and `SESSION_LAST_TECHNIQUE` MMKV key**

   Given a new type is needed for technique values used across packages
   When `packages/core/src/types/technique.ts` is created
   Then it exports:
   ```typescript
   // ARC-001: zero imports from react-native, expo-*, or @supabase/*
   export type TechniqueType = 'somatic' | 'breathing' | 'cognitive'
   ```
   And `packages/core/src/index.ts` exports `TechniqueType`; `packages/core/src/constants/kvKeys.ts` gains:
   ```typescript
   // Last technique used per (userId, fearItemId); written on technique selection; read on mount to pre-select.
   SESSION_LAST_TECHNIQUE: (userId: string, fearItemId: string) => `session:last_technique:${userId}:${fearItemId}`,
   ```
   And `packages/supabase/src/auth/AuthProvider.tsx` gains two new helpers (following the existing `setSessionIntention`/`getSessionIntention` guard pattern exactly):
   - `getLastUsedTechnique(fearItemId: string): TechniqueType | null` — `const store = mmkvRef.current; const userId = authState.userId; if (!store || !userId) return null; return (store.getString(KV_KEYS.SESSION_LAST_TECHNIQUE(userId, fearItemId)) ?? null) as TechniqueType | null` (unguarded cast is safe: only `setLastUsedTechnique` writes this key)
   - `setLastUsedTechnique(fearItemId: string, technique: TechniqueType): void` — `const store = mmkvRef.current; const userId = authState.userId; if (!store || !userId) return; store.set(KV_KEYS.SESSION_LAST_TECHNIQUE(userId, fearItemId), technique)`
   Both are exposed via `useAuth()` (added to `AuthContextValue` interface, default context stubs, context provider value, `useAuth.ts` merged interface + passthrough)

3. **Screen — Technique selection (`apps/mobile/app/session/technique.tsx`)**

   Given a user navigates to `/session/technique` with params `fearItemId`, `sessionId`, `description`, `predictedSuds`
   When the screen mounts
   Then three technique option cards render in order: Somatic → Breathing → Cognitive; each card shows `t('session.technique.<type>Label')` as the card title and `t('session.technique.<type>Description')` as a one-sentence sub-label; the section heading reads `t('session.technique.title')` (canonical: "Choose a technique") — **no SUDS-based nudge is displayed** (ADR-TECHNIQUE-SUDS-FALLBACK `insufficient-data` state: SUDS has not been collected yet at technique selection time); the last-used technique for this `fearItemId` (from `getLastUsedTechnique(fearItemId)`) is pre-selected on mount if non-null; if no last-used technique exists, no card is pre-selected; the "Continue" CTA is disabled until a technique is selected; header: `Stack.Screen` with `headerShown: true`, `headerTitle: t('session.technique.title')`, `headerLeft: () => <BackButton />`; selected card gets a visual highlight (teal border + light teal fill; suggested: `borderColor: '#0d9488'`, `backgroundColor: '#f0fdfa'`)

   Given the user selects a technique and taps "Continue"
   When navigation executes
   Then `setLastUsedTechnique(fearItemId, selectedTechnique)` is called before navigation; `router.push(\`/session/intent?fearItemId=\${fearItemId}&sessionId=\${sessionId}&description=\${encodeURIComponent(description)}&predictedSuds=\${predictedSuds}&technique=\${selectedTechnique}\`)` is called; the `technique` URL param is one of `'somatic' | 'breathing' | 'cognitive'`

4. **Screen — `intent.tsx` updated (technique param + briefing navigation)**

   Given `/session/intent` now receives an additional `technique` URL param from `technique.tsx`
   When `intent.tsx` mounts
   Then `technique` is destructured from `useLocalSearchParams` alongside the existing four params (typed as `technique?: string`); the `exposure_sessions` INSERT enqueue payload gains `technique: technique ?? null` (placed after `pre_session_intention`); after all enqueues succeed, `router.push` navigates to `/session/briefing?sessionId=...&fearItemId=...&description=...&preSuds=...` (replacing the previous `/session/pause` destination — params are identical); no other logic in `intent.tsx` changes — SUDS gate, intention letter, `setSessionInProgress`, and error handling all survive unchanged

5. **Screen — Pre-exposure briefing (`apps/mobile/app/session/briefing.tsx`)**

   Given a user navigates to `/session/briefing` with params `sessionId`, `fearItemId`, `description`, `preSuds`
   When the screen renders
   Then: the screen is forward-only (registered with `gestureEnabled: false` in `_layout.tsx`); no skip affordance exists — "I'm ready" is the only exit; `Stack.Screen` sets `headerShown: false`; the layout renders:
   - A title: `t('session.briefing.title')` (canonical: "You're almost ready")
   - A session context paragraph: `t('session.briefing.sessionContext')`
   - **If** `getSessionIntention(sessionId)` returns a non-empty string: a label `t('session.briefing.letterIntro')` above the intention text; the intention text renders in `fontFamily: 'DMSerifDisplay_400Regular_Italic'` with a code comment: `// DmSerifSurface: 'pre-exposure-readback' — one of four permitted surfaces (UX-DR21)`
   - **If** `getSessionIntention(sessionId)` returns null/empty: the letter block is not rendered
   - A "I'm ready" CTA button: `t('session.briefing.readyButton')`; on press: `router.push(\`/session/active?sessionId=\${sessionId}&fearItemId=\${encodeURIComponent(fearItemId ?? '')}&description=\${encodeURIComponent(description ?? '')}&preSuds=\${preSuds}\`)` (same param shape as current `pause.tsx → active.tsx` navigation)

6. **Navigation wiring — `_layout.tsx` and `ladder.tsx`**

   Given new screens must be registered in the session stack
   When `apps/mobile/app/session/_layout.tsx` is updated
   Then two new entries are added (order: before `pause`):
   ```tsx
   <Stack.Screen name="technique" options={{ headerShown: false, gestureEnabled: false }} />
   <Stack.Screen name="briefing" options={{ headerShown: false, gestureEnabled: false }} />
   ```
   (`headerShown: false` in the layout allows `technique.tsx` itself to control its own header via its inline `Stack.Screen` override — same pattern as `intent.tsx`)

   Given `ladder.tsx` currently starts sessions by navigating to `/session/intent`
   When the user taps "Start session" on a pending item (line 227–229 of `ladder.tsx`)
   Then navigation pushes to `/session/technique?fearItemId=...&sessionId=...&description=...&predictedSuds=...` (all existing params preserved; destination changed from `intent` to `technique`); `pause.tsx` is NOT deleted — a single deprecation comment is prepended to `apps/mobile/app/session/pause.tsx`: `// SUPERSEDED — replaced by briefing.tsx in Story 6.1. No longer in the active session start flow.`

7. **i18n — EN and HI keys**

   Given all user-facing strings must be i18n-gated
   When `en.json` and `hi.json` are updated
   Then the following keys are added under the top-level `"session"` object (after the existing `"suds"` block) in `apps/mobile/src/i18n/locales/en.json`:
   ```json
   "technique": {
     "title": "Choose a technique",
     "somaticLabel": "Somatic",
     "somaticDescription": "Ground yourself in body sensations before you begin.",
     "breathingLabel": "Breathing",
     "breathingDescription": "Use a breathing pattern to steady your nervous system.",
     "cognitiveLabel": "Cognitive",
     "cognitiveDescription": "Use self-talk to prepare your mind for the challenge ahead.",
     "continue": "Continue"
   },
   "briefing": {
     "title": "You're almost ready",
     "sessionContext": "You'll face your challenge, notice what comes up, and log how you feel. Take it one moment at a time.",
     "letterIntro": "Before you begin, here's what you wrote to yourself:",
     "readyButton": "I'm ready"
   }
   ```
   Identical keys (English placeholder — PLACEHOLDER per established Hindi translation pattern in this codebase) are added to `apps/mobile/src/i18n/locales/hi.json`; `pnpm turbo lint` passes — no `i18next/no-literal-string` violations in the new screens (all DB string literals in `intent.tsx` already carry the existing suppression comments and are untouched)

8. **Tests**

   Given new and modified screens require test coverage
   When `pnpm turbo test` runs
   Then all suites are green and the following coverage exists:
   - **`apps/mobile/app/session/technique.test.tsx`** (new — 6 cases): (a) renders 3 technique cards; (b) "Continue" button is disabled with no selection; (c) selecting a card enables "Continue"; (d) pre-selects the last-used technique when `getLastUsedTechnique` returns `'breathing'`; (e) tapping "Continue" calls `setLastUsedTechnique` with the selected value; (f) tapping "Continue" pushes a URL containing `/session/intent` with `technique=` param
   - **`apps/mobile/app/session/briefing.test.tsx`** (new — 4 cases): (a) renders session context copy; (b) renders intention letter block when `getSessionIntention` returns a non-empty string; (c) does NOT render letter block when `getSessionIntention` returns null; (d) tapping "I'm ready" calls `router.push` with a URL containing `/session/active`
   - **`apps/mobile/app/session/intent.test.tsx`** (updated): add `technique: 'somatic'` to `useLocalSearchParams.mockReturnValue` in `beforeEach`; add assertion that `mockEnqueue` is called with `'exposure_sessions'`, `'INSERT'`, `expect.objectContaining({ technique: 'somatic' })`; update the navigate-to-pause test to assert `mockRouterPush` is called with a string containing `'/session/briefing'` (not `'/session/pause'`); all 9 existing tests remain green

---

## Tasks / Subtasks

### T1 — DB migration and sync schema (AC: 1)

- [ ] T1.1: Create `supabase/migrations/0020_exposure_sessions_technique.sql`:
  ```sql
  -- Technique selected before each ERP session (Story 6.1 — FR-SESSION-04)
  ALTER TABLE public.exposure_sessions
    ADD COLUMN technique text
    CHECK (technique IN ('somatic', 'breathing', 'cognitive'));
  ```
- [ ] T1.2: Update `supabase/sync-rules.yaml` — append `technique` after `created_at` (the last column on line 18), giving: `started_at, ended_at, expires_at, created_at, technique`
- [ ] T1.3: Update `packages/sync/src/schema.ts` — add `technique: column.text` to the `exposure_sessions` Table definition (after `expires_at: column.real`)

### T2 — Core: TechniqueType + MMKV key + AuthProvider helpers (AC: 2)

- [ ] T2.1: Create `packages/core/src/types/technique.ts` with `TechniqueType` union (ARC-001 comment at top)
- [ ] T2.2: Export `TechniqueType` from `packages/core/src/index.ts` (add after `HomeDisplayState` export)
- [ ] T2.3: Add `SESSION_LAST_TECHNIQUE` to `packages/core/src/constants/kvKeys.ts` (after `SESSION_DEBRIEF_PENDING`)
- [ ] T2.4: Import `TechniqueType` from `@exposure-buddy/core` in `packages/supabase/src/auth/AuthProvider.tsx`; add `getLastUsedTechnique` and `setLastUsedTechnique` function definitions (after the existing `setSessionIntention`/`getSessionIntention` functions — follow their guard pattern exactly)
- [ ] T2.5: Add both helpers to `AuthContextValue` interface + default `AuthContext` stubs + Context Provider value object in `AuthProvider.tsx`
- [ ] T2.6: Add both helpers to merged interface + passthroughs in `packages/supabase/src/auth/useAuth.ts`

### T3 — `technique.tsx` screen (AC: 3, 6)

- [ ] T3.1: Create `apps/mobile/app/session/technique.tsx`:
  - `useLocalSearchParams<{ fearItemId: string; sessionId: string; description: string; predictedSuds: string }>()`
  - `const { getLastUsedTechnique, setLastUsedTechnique } = useAuth()`
  - Local state: `const [selected, setSelected] = useState<TechniqueType | null>(() => getLastUsedTechnique(fearItemId))`
  - Three technique cards as `TouchableOpacity` with `accessibilityRole="radio"` and `accessibilityState={{ selected: selected === type }}`
  - Continue `TouchableOpacity` with `disabled={selected === null}`; on press: `setLastUsedTechnique(fearItemId, selected)` then navigate
  - Generate `sessionId` is NOT needed here — it arrives as a URL param from `ladder.tsx`
- [ ] T3.2: Register in `session/_layout.tsx`: add `<Stack.Screen name="technique" options={{ headerShown: false, gestureEnabled: false }} />`

### T4 — `briefing.tsx` screen (AC: 5, 6)

- [ ] T4.1: Create `apps/mobile/app/session/briefing.tsx`:
  - `useLocalSearchParams<{ sessionId: string; fearItemId: string; description: string; preSuds: string }>()`
  - `const { getSessionIntention } = useAuth()`
  - `const intentionText = getSessionIntention(sessionId)` (called once; no useEffect needed — value does not change while this screen is mounted)
  - DmSerif intention block: `fontFamily: 'DMSerifDisplay_400Regular_Italic'` with comment naming `'pre-exposure-readback'` surface (UX-DR21)
  - "I'm ready" navigates to `/session/active` with the same four params as the current `pause.tsx → active.tsx` call
- [ ] T4.2: Register in `session/_layout.tsx`: add `<Stack.Screen name="briefing" options={{ headerShown: false, gestureEnabled: false }} />`

### T5 — Update `intent.tsx`, `ladder.tsx`, and `pause.tsx` (AC: 4, 6)

- [ ] T5.1: Edit `apps/mobile/app/session/intent.tsx`:
  - Line 45: add `technique` to `useLocalSearchParams` type: `technique?: string`
  - Line 91 (after `pre_session_intention` in INSERT payload): add `technique: technique ?? null`
  - Line 128: change `\`/session/pause?...\`` to `\`/session/briefing?...\`` (identical params: `sessionId`, `fearItemId`, `description`, `preSuds`)
- [ ] T5.2: Edit `apps/mobile/app/ladder.tsx` line 229: change `/session/intent?` to `/session/technique?` (all other params unchanged)
- [ ] T5.3: Prepend deprecation comment to `apps/mobile/app/session/pause.tsx`:
  ```typescript
  // SUPERSEDED — replaced by briefing.tsx in Story 6.1. No longer in the active session start flow.
  ```

### T6 — i18n keys (AC: 7)

- [ ] T6.1: Add `"technique"` and `"briefing"` blocks to `apps/mobile/src/i18n/locales/en.json` under `"session"` (after the `"suds"` block)
- [ ] T6.2: Add identical English-placeholder keys to `apps/mobile/src/i18n/locales/hi.json` (same pattern as existing hi.json `"session"` keys which are English placeholders)

### T7 — Tests (AC: 8)

- [ ] T7.1: Create `apps/mobile/app/session/technique.test.tsx` (6 cases) — follow `intent.test.tsx` mock setup exactly: `jest.mock('expo-router', ...)`, `jest.mock('react-i18next', ...)`, `jest.mock('@exposure-buddy/supabase', ...)`, `jest.mock('../../src/sync/adapter', ...)`; add `jest.mock('../../src/components/navigation/BackButton', () => ({ BackButton: () => null }))`; for `getLastUsedTechnique` return `null` (default) or `'breathing'` (pre-selection case); `const TechniqueScreen = require('./technique').default`
- [ ] T7.2: Create `apps/mobile/app/session/briefing.test.tsx` (4 cases) — mock `getSessionIntention` to return `null` and a string; verify DmSerif block conditional render; verify navigation URL contains `/session/active`; `const BriefingScreen = require('./briefing').default`
- [ ] T7.3: Update `apps/mobile/app/session/intent.test.tsx` (3 targeted changes): (a) add `technique: 'somatic'` to `useLocalSearchParams.mockReturnValue` in `beforeEach`; (b) update the enqueue assertion to `expect.objectContaining({ technique: 'somatic' })`; (c) update the navigation assertion from `/session/pause` to `/session/briefing` and update the `it(...)` description from "navigates to /session/pause on Continue" to "navigates to /session/briefing on Continue"; all 9 existing tests remain green

### T8 — CI verification (AC: all)

- [ ] T8.1: `pnpm turbo typecheck` — zero errors
- [ ] T8.2: `pnpm turbo lint` — zero errors; no `i18next/no-literal-string` violations in new files
- [ ] T8.3: `pnpm turbo test` — all suites green; grep `apps/ packages/` for `/session/pause` — the only remaining non-comment references should be in `_layout.tsx` registration (the screen still exists) and `pause.tsx` itself; intent.test.tsx must have zero references to `/session/pause` in push assertions
- [ ] T8.4: ARC-011 boundary check: `packages/core/src/types/technique.ts` has zero RN/Expo/Supabase imports

---

## Dev Notes

### Session flow — before and after

**Before Story 6.1:**
```
ladder.tsx: "Start session"
  → /session/intent  (SUDS + optional letter → enqueues exposure_sessions INSERT)
    → /session/pause  (breathing moment)
      → /session/active
```

**After Story 6.1:**
```
ladder.tsx: "Start session"
  → /session/technique  (pick somatic / breathing / cognitive; last-used pre-selected)
    → /session/intent  (SUDS + optional letter → enqueues exposure_sessions INSERT with technique)
      → /session/briefing  (context paragraph + DmSerif intention readback)
        → /session/active
```

`pause.tsx` remains in the repo with a deprecation comment. `session/_layout.tsx` keeps its `pause` registration (the screen file still exists). Story 6.2 will wire the home screen state 3 CTA → `/session/technique`; Story 6.1 only wires from `ladder.tsx`.

### Current state of every file being modified (file:line)

**`apps/mobile/app/session/intent.tsx:44-50`** — `useLocalSearchParams` currently types `fearItemId, sessionId, description, predictedSuds`. Add `technique?: string` to the generic object.

**`apps/mobile/app/session/intent.tsx:83-94`** — `exposure_sessions` INSERT payload currently has 7 fields. Add `technique: technique ?? null` after `pre_session_intention: trimmedIntention || null` (line 91). The `eslint-disable-next-line i18next/no-literal-string` comment pattern is NOT needed for `technique` because it is a variable reference, not a literal string.

**`apps/mobile/app/session/intent.tsx:127-129`** — `router.push('/session/pause?sessionId=...')` is at line 129. Change `pause` to `briefing`. Params `sessionId`, `fearItemId`, `description`, `preSuds` are identical — no param changes.

**`apps/mobile/app/session/_layout.tsx:4-11`** — Currently registers `pause`, `active`, `grounding`. Add `technique` and `briefing` before `pause`. Both get `gestureEnabled: false`.

**`apps/mobile/app/ladder.tsx:227-229`** — `router.push('/session/intent?fearItemId=...')`. Change `intent` to `technique`. All four URL params (`fearItemId`, `sessionId`, `description`, `predictedSuds`) are preserved unchanged.

**`supabase/sync-rules.yaml:16-19`** — The `exposure_sessions` SELECT currently selects `id, user_id, fear_item_id, session_type, status, pre_session_intention, post_session_reflection, started_at, ended_at, expires_at, created_at`. Append `technique` after `created_at` (end of the column list, line 18), giving: `started_at, ended_at, expires_at, created_at, technique`.

**`packages/sync/src/schema.ts:27-38`** — `exposure_sessions` Table. After `expires_at: column.real`, add `technique: column.text`. (Note: `column.real` was chosen for `expires_at` to avoid 32-bit integer overflow on BigInt epoch-ms — `technique` is a plain text column, `column.text` is correct.)

**`packages/core/src/constants/kvKeys.ts:1-23`** — Full file is 28 lines. Add `SESSION_LAST_TECHNIQUE` after `SESSION_DEBRIEF_PENDING` (line 18).

**`packages/core/src/index.ts:24`** — Currently exports `resolveHomeScreenState` and `HomeDisplayState` as the last lines. Add `export type { TechniqueType } from './types/technique'` after line 24.

### Invariants that MUST survive unchanged

- **`intent.tsx` auth guard (line 68):** `if (!isAuthenticated || !userId || state.preSuds === null || state.isSubmitting) return` — not touched
- **`intent.tsx` `setSessionIntention` (lines 76-79):** intention letter → MMKV before enqueue — not touched
- **`intent.tsx` `setSessionInProgress` (lines 115-122):** `SessionRecoveryData` blob → MMKV — not touched; `SessionRecoveryData` does NOT gain a `technique` field (technique is not needed for recovery — the recovery modal in `(app)/_layout.tsx` resumes directly to `/session/active`, bypassing technique + briefing, which is correct behavior)
- **`ladder.tsx` recovery guard (lines 221-224):** if `sessionRecoveryData !== null`, redirect to home rather than starting a duplicate session — not touched
- **`(app)/_layout.tsx` recovery modal:** resumes to `/session/active` directly — not touched by this story

### AuthProvider helper implementation pattern

Match exactly the guard and store access pattern of `getSessionIntention` / `setSessionIntention` in `AuthProvider.tsx`. Key point: both helpers close over `authState.userId` — they are arrow-function closures inside the component body, same as all other MMKV helpers. They use the same `store` ref (the `mmkv` MMKV instance). Do not access MMKV directly from `technique.tsx`; always go through `useAuth()`.

### ADR-TECHNIQUE-SUDS-FALLBACK — `insufficient-data` state

The technique screen in Story 6.1 always shows equal-weight cards ("Choose a technique" heading, no nudge text) because SUDS is collected after technique selection (in `intent.tsx`). This is explicitly the `insufficient-data` state from the ADR. Do NOT implement the SUDS-based nudge (`recommended` card state) in this story — it is deferred and the ADR is still at Draft/proposed status.

### DmSerifSurface constraint (UX-DR21)

`DMSerifDisplay_400Regular_Italic` is permitted ONLY on four surfaces: `'score-reveal'`, `'prediction-reality-reveal'`, `'progress-readback'`, `'pre-exposure-readback'`. `briefing.tsx` uses `'pre-exposure-readback'`. A comment in `briefing.tsx` must explicitly name this surface. Adding DM Serif Display italic to any component NOT on this list requires a PRD change. This enforcement is advisory (comment + convention) — there is no runtime type guard, but the constraint is enforced in code review.

### Test mock setup — exact patterns from this codebase

For all three test files (`technique.test.tsx`, `briefing.test.tsx`, `intent.test.tsx` update), follow `intent.test.tsx` exactly:

```typescript
// Pattern: jest.mock first, then require after
jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))
const mockUseAuth = jest.fn()
// ...beforeEach: mockUseAuth.mockReturnValue({ ...defaults })
const Screen = require('./screen-name').default
```

For `technique.test.tsx`, the `useAuth()` mock must return `getLastUsedTechnique: mockGetLastUsedTechnique` and `setLastUsedTechnique: mockSetLastUsedTechnique`. `mockGetLastUsedTechnique` returns `null` by default (no pre-selection), or `'breathing'` in the pre-selection test case.

For `briefing.test.tsx`, the `useAuth()` mock must return `getSessionIntention: mockGetSessionIntention`. Return `null` for the no-letter case and `'I expect to feel anxious but I can handle it.'` for the letter-present case.

Do NOT mock `../../src/sync/adapter` in `briefing.test.tsx` — `briefing.tsx` makes no enqueue calls.

### Out of scope — do not implement in this story

1. **SUDS-based technique nudge** (`recommended` card state) — deferred per ADR-TECHNIQUE-SUDS-FALLBACK
2. **`TechniqueCard` as a `packages/ui` shared component** — implement inline in `technique.tsx`; extract later if multiple screens need it
3. **Home screen state 3 "Start today's challenge" CTA wiring** — Story 6.2 owns this
4. **PowerSync connector activation** — still no-op stub; the `technique` column appears in the enqueue payload and sync-rules, ready for when Story 6.2 wires the real connector
5. **Delete `pause.tsx`** — leave it with a deprecation comment only
6. **`debrief.tsx` technique branching** — debrief.tsx is not touched; `technique = NULL` tolerance is a migration-level guarantee (NULLABLE column), not a code change
7. **`situation_text_snapshot` column on `exposure_sessions`** — referenced in Epic 8 Story 8.5; not in scope here

### Anti-patterns to avoid

- **Do not generate a new `sessionId` in `technique.tsx`.** It arrives as a URL param from `ladder.tsx` (same as the current `intent.tsx` flow). `generateUUID()` is called once in `ladder.tsx`.
- **Do not store `technique` in `SessionRecoveryData`.** The recovery flow skips technique + briefing and lands directly on `active.tsx`. The `SessionRecoveryData` type is unchanged.
- **Do not add `technique` to `KV_KEYS.SESSION_IN_PROGRESS`.** The blob shape (`sessionId`, `fearItemId`, `preSuds`, `description`) is not extended.
- **Do not move `pause.tsx` to a deprecated directory.** Leave it in `apps/mobile/app/session/` with a comment.
- **Do not add back-gesture to `briefing.tsx`.** The briefing screen is mandatory and non-skippable per the spec — no `gestureEnabled: true` override.

### Git intelligence

Recent commits show the session flow patterns:
- `e637230` (Story 5.6): simplified `intent.tsx → pause.tsx` flow, removed debrief MMKV plumbing
- `f097f73` (Story 5.3): established the `pause.tsx` screen as a forward-only gate
- `82c9369` (Story 5.2): established `intent.tsx` with SUDS + intention letter; set the `exposure_sessions` INSERT pattern that this story extends

### References

- `_bmad-output/planning-artifacts/epics.md:1272–1296` — Story 6.1 ACs
- `_bmad-output/planning-artifacts/adrs/ADR-TECHNIQUE-SUDS-FALLBACK.md` — `insufficient-data` state contract
- `_bmad-output/planning-artifacts/adrs/ADR-HOME-STATE-RESOLVE.md` — updated 8-state machine (context only; no home screen changes in this story)
- `apps/mobile/app/session/intent.tsx` — full file; T5.1 modifies lines 45, 91, 128
- `apps/mobile/app/session/_layout.tsx` — full file; T3.2 + T4.2 add 2 entries
- `apps/mobile/app/session/pause.tsx` — T5.3 prepends comment only
- `apps/mobile/app/ladder.tsx:227–229` — T5.2 changes destination only
- `supabase/migrations/0016_exposure_sessions.sql` — table definition context for T1.1
- `supabase/sync-rules.yaml` — full file; T1.2
- `packages/sync/src/schema.ts` — full file; T1.3
- `packages/core/src/constants/kvKeys.ts` — full file; T2.3
- `packages/core/src/index.ts` — full file; T2.2
- `apps/mobile/app/session/intent.test.tsx` — full file; T7.3

---

## Dev Agent Record

### Agent Model Used

_to be filled by dev agent_

### Debug Log References

_to be filled by dev agent_

### Completion Notes List

_to be filled by dev agent_

### File List

**New files:**
- `supabase/migrations/0020_exposure_sessions_technique.sql`
- `packages/core/src/types/technique.ts`
- `apps/mobile/app/session/technique.tsx`
- `apps/mobile/app/session/technique.test.tsx`
- `apps/mobile/app/session/briefing.tsx`
- `apps/mobile/app/session/briefing.test.tsx`

**Modified files:**
- `packages/core/src/constants/kvKeys.ts` — `SESSION_LAST_TECHNIQUE` key
- `packages/core/src/index.ts` — `TechniqueType` export
- `packages/supabase/src/auth/AuthProvider.tsx` — `getLastUsedTechnique` + `setLastUsedTechnique`
- `packages/supabase/src/auth/useAuth.ts` — expose new helpers
- `supabase/sync-rules.yaml` — `technique` column
- `packages/sync/src/schema.ts` — `technique: column.text`
- `apps/mobile/app/session/_layout.tsx` — register `technique` + `briefing`
- `apps/mobile/app/session/intent.tsx` — `technique` param + briefing navigation
- `apps/mobile/app/session/intent.test.tsx` — technique mock + enqueue + nav assertions
- `apps/mobile/app/session/pause.tsx` — deprecation comment only
- `apps/mobile/app/ladder.tsx` — "Start session" destination
- `apps/mobile/src/i18n/locales/en.json` — technique + briefing keys
- `apps/mobile/src/i18n/locales/hi.json` — technique + briefing keys (English placeholders)

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2026-06-15 | Story drafted; status `ready-for-dev` | Claude Sonnet 4.6 (bmad-create-story) |
