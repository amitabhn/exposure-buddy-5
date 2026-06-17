# Story 7.1: Calm Me Shell, Courage Affirmation & Action Decision Routing

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user experiencing distress at any point in the app,
I want a persistent Calm Me button that immediately surfaces a calming support screen,
so that I can access grounding tools without navigating away or losing my session context (FR-CALM-01, UX-DR-17).

## Acceptance Criteria

1. **Global FAB.** `CalmMeButton` is mounted in `apps/mobile/app/_layout.tsx` outside the `<Stack />`, so it is always visible and tappable on every screen, persisting across all route transitions. `CalmMeButton` itself lives in `packages/ui/src/components/CalmMeButton.tsx`, is navigation-agnostic (accepts an `onPress` prop only — no router import inside `packages/ui`), and the root layout wires `onPress` to `router.push('/calm-me')`.
2. **No double-stacking.** When the Calm Me screen (`/calm-me`) is the active route, the root layout hides or disables the FAB so a second Calm Me screen cannot be pushed on top of an open one.
3. **`calmMeConfig.ts` created.** `packages/core/src/config/calmMeConfig.ts` exports `CALM_ME_AFFIRMATIONS: string[]` with one entry (`'calmMe.affirmation.1'`, canonical "Your nervous system is doing exactly what it's supposed to do") and a comment noting post-MVP rotation only requires adding entries. The support screen renders `t(CALM_ME_AFFIRMATIONS[0])`.
4. **Exit affordance.** The Calm Me screen always shows an Exit icon (✕) top-right; tapping it returns the user to the screen they came from with no state change, in both session and non-session contexts.
5. **Non-session layout.** When opened outside an active exposure session, the screen shows: (1) courage affirmation, (2) technique picker with three targets — Breathing, 5-4-3-2-1, Helplines (stubbed targets at this stage; Stories 7.2–7.4 implement their destinations) — and (3) **no** action footer.
6. **In-session layout.** When opened while an exposure is in progress (see Dev Notes — "Determining in-session context" for the concrete signal), the screen additionally shows an action footer with `t('calmMe.keepGoing')` ("I can keep going") and `t('calmMe.needToStop')` ("I need to stop").
7. **Keep Going.** Tapping `t('calmMe.keepGoing')` closes the screen with a brief fade (≤300ms) back to the active exposure screen; no state-machine transition fires; no copy/toast beyond the fade.
8. **Need to Stop.** Tapping `t('calmMe.needToStop')` shows an inline confirm with `t('calmMe.debriefNow')` ("Debrief now?") and two options — Yes and Not now (see Dev Notes — "Need to Stop routing" for the exact navigation and data contract both branches must satisfy).
9. **`helplines.ts` created.** `packages/core/src/config/helplines.ts` exports the `Helpline` interface and `HELPLINES: Helpline[]` array exactly as specified in Dev Notes — pure data/types, zero RN/Linking imports (ARC-001). Story 7.4 is the only story that wires this to UI; this story only creates the file.
10. **i18n.** Every visible string on the Calm Me screen uses `t()`; no raw string literals in JSX; CI i18next lint passes.
11. **No duplicate entry points.** The three pre-existing local "Calm Me" buttons that are now redundant with the global FAB are removed, and their tests updated accordingly (see Dev Notes — "Existing Calm Me entry points to remove").

## Tasks / Subtasks

- [ ] Task 1: Core config files (AC: #3, #9)
  - [ ] Create `packages/core/src/config/calmMeConfig.ts` (`CALM_ME_AFFIRMATIONS`)
  - [ ] Create `packages/core/src/config/helplines.ts` (`Helpline` type + `HELPLINES`)
  - [ ] Export both from `packages/core/src/index.ts`
  - [ ] No RN/Expo/`@supabase/*` imports in either file (ARC-001 boundary check)
- [ ] Task 2: `CalmMeButton` primitive (AC: #1)
  - [ ] Create `packages/ui/src/components/CalmMeButton.tsx` — `React.forwardRef`-wrapped `TouchableOpacity`, `onPress: () => void` prop only, no navigation import
  - [ ] Export `CalmMeButton` + `CalmMeButtonProps` from `packages/ui/src/index.ts`
- [ ] Task 3: Build the Calm Me screen (AC: #4, #5, #6, #7, #8, #10)
  - [ ] Replace the stub `apps/mobile/app/calm-me.tsx` with the real screen: affirmation, technique picker (3 stub targets), Exit icon, conditional action footer, "Debrief now?" inline confirm
  - [ ] Implement in-session detection per Dev Notes ("Determining in-session context")
  - [ ] Implement Keep Going (fade dismiss) and Need to Stop (confirm → Yes/Not now) per Dev Notes ("Need to Stop routing")
  - [ ] Add all new i18n keys to both `en.json` and `hi.json`
- [ ] Task 4: Wire the FAB into the root layout (AC: #1, #2)
  - [ ] Mount `CalmMeButton` in `apps/mobile/app/_layout.tsx` outside `<Stack />`
  - [ ] Hide/disable it when the active route is `/calm-me` (use `usePathname()`)
- [ ] Task 5: Remove redundant local entry points (AC: #11)
  - [ ] Remove the local Calm Me button from `apps/mobile/app/session/active.tsx` (`session.active.calmMe`) and its two assertions in `active.test.tsx`
  - [ ] Remove the local Calm Me button from `apps/mobile/app/session/abandoned.tsx`
  - [ ] Remove the local Calm Me button from `apps/mobile/app/(app)/index.tsx` and its two assertions in `index.test.tsx`
  - [ ] Leave `ladder.tsx`'s crisis-banner CTA untouched (different trigger — crisis-keyword detection, not a generic always-on button)
- [ ] Task 6: Tests
  - [ ] `CalmMeButton.test.tsx` in `packages/ui` (renders, calls `onPress`)
  - [ ] `calm-me.test.tsx` covering: non-session layout (no footer), in-session layout (footer present), Keep Going dismiss, Need to Stop → Yes routes to debrief with correct params + enqueues abandonment, Need to Stop → Not now routes home, Exit returns with no state change
  - [ ] Update `_layout.test.tsx` (or equivalent) for FAB presence/hide-on-`/calm-me` if such a test file exists — check first
  - [ ] Run `pnpm turbo lint` to confirm no `i18next/no-literal-string` violations

## Dev Notes

### Determining in-session context — there is no `SessionStateMachine` singleton

`packages/core/src/erp/session-state-machine.ts` exports only a pure `transition(currentState, event)` reducer — there is no app-wide "current session phase" object, and nothing tracks it globally. The only root-accessible signal is `useAuth().sessionRecoveryData` (from `@exposure-buddy/supabase`), which is non-null from the moment `session/intent.tsx` calls `setSessionInProgress()` until `clearSessionInProgress()` is called in `session/active.tsx` (on completion) or `session/grounding.tsx` (on confirmed stop) — i.e. it spans `pre_session`, `active`, **and** `grounding`, it does not distinguish `active` from `grounding`.

**Use this combined signal for "in-session" (AC #6):** `sessionRecoveryData !== null && pathname === '/session/active'` (via `usePathname()` from `expo-router`). This correctly shows the action footer only when Calm Me is opened from the actual active-exposure screen, and falls back to the non-session layout everywhere else (including if the FAB is somehow tapped from the grounding screen itself, which already has its own resume/stop affordances and shouldn't show a second one). Do not attempt to build a new global session-phase store for this story — out of scope.

### Need to Stop routing — exact contract

Tapping "Not now" → `router.replace('/')` (matches the pattern in `session/abandoned.tsx` and `session/debrief.tsx`).

Tapping "Yes" must, in order, mirror the existing `session/grounding.tsx` `handleConfirmStop` pattern (it is the closest existing precedent for an early/abandoned exit) before navigating to `/session/debrief`:
1. `getAdapter().enqueue('exposure_sessions', 'UPDATE', { id: sessionId, status: 'abandoned', ended_at: <now ISO> })`
2. If `fearItemId` is non-null: `getAdapter().enqueue('fear_ladder_items', 'UPDATE', { id: fearItemId, status: 'pending', updated_at: <now ISO>, updatedAt: Date.now() })`
3. `clearSessionInProgress()`
4. `router.push('/session/debrief?sessionId=...&fearItemId=...&preSuds=...&debriefSuds=...&peakSuds=...&completedAtMs=...')`

**Known gap — no fresh SUDS reading is available.** `session/debrief.tsx` requires `debriefSuds` and `peakSuds` URL params (it computes which of 3 narrative branches to show, and whether to display crisis contacts, from `debriefSudsInt >= 8 || peakSudsInt >= 8`). Calm Me's AC does not describe collecting a new SUDS reading before navigating, and the root-level Calm Me screen has no access to `active.tsx`'s local `maxSudsLogged` component state (separate route, separate component tree) — `sessionRecoveryData` only carries `preSuds` (the value logged at session start). **Resolution for this story:** pass `preSuds` as both `debriefSuds` and `peakSuds` when building the debrief URL from this flow. This is a conservative approximation — it correctly routes to debrief Branch B/C (no false "improvement" claim) and still surfaces crisis contacts if the pre-session SUDS was already ≥8. Do not build new cross-screen SUDS plumbing to close this gap — it's out of scope for 7.1. Note it in the story's Completion Notes as a known approximation for product follow-up.

You will need `sessionId` and `fearItemId` from `sessionRecoveryData` (it carries both) when constructing this URL from the Calm Me screen, since `/calm-me` itself receives no route params.

### `helplines.ts` — exact contents

```typescript
export interface Helpline {
  id: string;
  name: string;
  number: string;      // dialable, for tel: URI
  displayNumber: string; // formatted for display
}
export const HELPLINES: Helpline[] = [
  { id: 'telemanas',  name: 'Tele MANAS',            number: '18008914416', displayNumber: '1800-891-4416' },
  { id: 'kiran',      name: 'KIRAN',                 number: '18005990019', displayNumber: '1800-599-0019' },
  { id: 'icall',      name: 'iCall',                 number: '9152987821',  displayNumber: '9152987821'    },
  { id: 'vandrevala', name: 'Vandrevala Foundation',  number: '9999666555',  displayNumber: '9999-666-555'  },
  { id: 'aasra',      name: 'AASRA',                 number: '02227546669', displayNumber: '+91-22-27546669' },
];
```
This story creates the file only — Story 7.4 builds the UI that consumes it. The technique-picker target for "Helplines" in this story just navigates to a stub/placeholder route (Story 7.4 builds the real screen).

### File-naming convention conflict — intentional, not an oversight

`implementation-patterns-consistency-rules.md` specifies non-component files as kebab-case (e.g. `session-state-machine.ts`), but the epics.md AC hard-codes the literal paths `calmMeConfig.ts` and `helplines.ts` (camelCase for the former). Follow the epics.md literal filenames as written — this mirrors the accepted Epic 3 precedent (`keywordDetector.ts` vs. the architect's `detector.ts`, see project memory). No CI check lints filename casing; only the `packages/core` RN-import boundary is CI-enforced. Do not rename to kebab-case.

### Existing Calm Me entry points to remove

Four local "Calm Me" buttons already exist in the codebase, each added by earlier stories as placeholders pending Epic 7, all pushing to `/calm-me` with no params:

| File | Label | Action |
|---|---|---|
| `apps/mobile/app/session/active.tsx` (~line 182) | `session.active.calmMe` | **Remove** — superseded by global FAB |
| `apps/mobile/app/session/abandoned.tsx` | `home.calmMe.cta` | **Remove** — superseded by global FAB |
| `apps/mobile/app/(app)/index.tsx` (~line 120) | `home.calmMe.cta` | **Remove** — superseded by global FAB |
| `apps/mobile/app/ladder.tsx` (~line 204) | `ladder.crisis.cta` | **Keep unchanged** — conditional on crisis-keyword detection (Epic 3), not a generic always-on entry point; distinct purpose from the FAB |

Removing the three buttons breaks existing assertions — update, don't just delete the tests:
- `apps/mobile/app/session/active.test.tsx` lines ~109, ~112-115 (`getByLabelText('session.active.calmMe')` presence + navigation assertions)
- `apps/mobile/app/(app)/index.test.tsx` lines ~114, ~117-120 (`getByRole('button', { name: 'home.calmMe.cta' })` presence + navigation assertions)
- `apps/mobile/app/session/abandoned.tsx` has no test file (confirmed) — no test updates needed for that removal

The now-orphaned i18n keys `session.active.calmMe` and `home.calmMe.cta` (in both `en.json`/`hi.json`) can be removed once no longer referenced — confirm nothing else uses them first.

### Root layout integration point

`apps/mobile/app/_layout.tsx` already registers `<Stack.Screen name="calm-me" options={{ headerShown: false }} />` inside the `<Stack>` (this was scaffolded ahead of time). The FAB itself must be mounted as a **sibling** to `<Stack>`, not inside it — same structural pattern as `<PortalHost />` is mounted today (after `</ThemeProvider>`... actually `<PortalHost />` is inside `<ThemeProvider>` but outside `<Stack>` — follow that same nesting level). Use `usePathname()` from `expo-router` to detect `/calm-me` is active and conditionally render `null` instead of the button.

### Component pattern to follow (`packages/ui`)

Match `CourageLadderEntryCard.tsx`'s shape exactly: `React.forwardRef<React.ElementRef<typeof TouchableOpacity>, Props>`, named export + a separately-exported `Props` interface, `StyleSheet.create()` for styles (NativeWind was rejected in Story 1.3 — see project memory), added to `packages/ui/src/index.ts`'s barrel export alongside the other components.

### i18n keys to add

New `calmMe` namespace in both `en.json` and `hi.json` (mirror the nesting style already used for `session.grounding`, `session.active`, etc.):
- `calmMe.affirmation.1` — "Your nervous system is doing exactly what it's supposed to do"
- `calmMe.keepGoing` — "I can keep going"
- `calmMe.needToStop` — "I need to stop"
- `calmMe.debriefNow` — "Debrief now?"
- `calmMe.yes` / `calmMe.notNow` (exact key names not given in epics.md — choose consistent names; canonical copy "Yes" / "Not now")
- Technique picker labels (Breathing, 5-4-3-2-1, Helplines) — these are new keys this story owns; Stories 7.2-7.4 reuse them, don't redefine

Note: `calmMe.keepGoing` and `calmMe.needToStop` have copy identical to the pre-existing `session.grounding.resume` / `session.grounding.confirmStop` keys. Do not reuse those keys — the epics.md AC explicitly names the new `calmMe.*` keys, and the two screens are conceptually distinct flows even though current copy coincides.

### Project Structure Notes

- New files: `packages/core/src/config/calmMeConfig.ts`, `packages/core/src/config/helplines.ts`, `packages/ui/src/components/CalmMeButton.tsx`
- Modified files: `apps/mobile/app/calm-me.tsx` (stub → real), `apps/mobile/app/_layout.tsx` (mount FAB), `apps/mobile/app/session/active.tsx`, `apps/mobile/app/session/abandoned.tsx`, `apps/mobile/app/(app)/index.tsx` (remove redundant buttons), `packages/core/src/index.ts`, `packages/ui/src/index.ts` (barrel exports), both `en.json`/`hi.json`
- No new packages, no migrations, no Edge Functions
- Consistent with existing structure: mobile screens in `apps/mobile/app/`, shared domain config in `packages/core/src/config/`, shared UI primitives in `packages/ui/src/components/`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1, lines 1420-1490] — canonical acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md#ADR-001] — packages/core boundary (zero RN/Expo/@supabase imports)
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Naming Patterns] — file naming conventions (see conflict note above)
- `apps/mobile/app/session/grounding.tsx` — pattern for abandonment enqueue + MMKV clear before navigation
- `apps/mobile/app/(app)/_layout.tsx` — `handleRecoveryResume`/`handleRecoveryEnd` — closest existing precedent for a root-level component reading `sessionRecoveryData` and performing session-ending writes
- `packages/ui/src/components/CourageLadderEntryCard.tsx` — component shape/export pattern to mirror
- `packages/core/src/erp/session-state-machine.ts` — confirms no singleton state exists; states are `idle | pre_session | active | grounding | completed | abandoned`
- `packages/core/src/types/session-recovery-data.ts` — `SessionRecoveryData` shape (`sessionId`, `fearItemId`, `preSuds`, `description`)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
