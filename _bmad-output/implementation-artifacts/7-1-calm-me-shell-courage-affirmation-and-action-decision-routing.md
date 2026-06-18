# Story 7.1: Calm Me Shell, Courage Affirmation & Action Decision Routing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user experiencing distress at any point in the app,
I want a persistent Calm Me button that immediately surfaces a calming support screen,
so that I can access grounding tools without navigating away or losing my session context (FR-CALM-01, UX-DR-17).

## Acceptance Criteria

1. **Global FAB.** `CalmMeButton` is mounted in `apps/mobile/app/_layout.tsx` outside the `<Stack />`, so it is always visible and tappable on every screen, persisting across all route transitions. `CalmMeButton` itself lives in `packages/ui/src/components/CalmMeButton.tsx`, is navigation-agnostic (accepts an `onPress` prop only — no router import inside `packages/ui`), and the root layout wires `onPress` to `router.push('/calm-me')`.
2. **No double-stacking.** When the Calm Me screen (`/calm-me`) is the active route, the root layout hides or disables the FAB so a second Calm Me screen cannot be pushed on top of an open one.
3. **`calmMeConfig.ts` created.** `packages/core/src/config/calmMeConfig.ts` exports `CALM_ME_AFFIRMATIONS: string[]` with one entry (`'calmMe.affirmation.1'`, canonical "Your nervous system is doing exactly what it's supposed to do") and a comment noting post-MVP rotation only requires adding entries. The support screen renders `t(CALM_ME_AFFIRMATIONS[0])`.
4. **Exit affordance.** The Calm Me screen always shows an Exit icon (✕) top-right; tapping it returns the user to the screen they came from with no state change, in both session and non-session contexts. If the "Debrief now?" inline confirm (AC #8) is open, Exit takes precedence — it dismisses the confirm and the screen together, with no state change, rather than dismissing only the confirm.
5. **Non-session layout.** When opened outside an active exposure session, the screen shows: (1) courage affirmation, (2) technique picker with three targets — Breathing, 5-4-3-2-1, Helplines (each navigates to a minimal placeholder route at this stage, showing `t('calmMe.comingSoon')` copy; Stories 7.2–7.4 replace the placeholder content without changing the navigation wiring — see Dev Notes "Technique picker placeholder routes") — and (3) **no** action footer.
6. **In-session layout.** When opened while an exposure is in progress (see Dev Notes — "Determining in-session context" for the concrete signal), the screen additionally shows an action footer with `t('calmMe.keepGoing')` ("I can keep going") and `t('calmMe.needToStop')` ("I need to stop").
7. **Keep Going.** Tapping `t('calmMe.keepGoing')` closes the screen with a brief fade (≤300ms) back to the active exposure screen; no state-machine transition fires; no copy/toast beyond the fade.
8. **Need to Stop.** Tapping `t('calmMe.needToStop')` shows an inline confirm with `t('calmMe.debriefNow')` ("Debrief now?") and two options — Yes and Not now. Tapping Yes first prompts for a fresh one-tap SUDS reading (reusing the `SudsScale` pattern from `active.tsx`) before navigating to debrief, so the debrief screen's narrative branch and crisis-contact display reflect actual current distress rather than the stale pre-session reading (see Dev Notes — "Need to Stop routing" for the exact navigation and data contract both branches must satisfy).
9. **`helplines.ts` created.** `packages/core/src/config/helplines.ts` exports the `Helpline` interface and `HELPLINES: Helpline[]` array exactly as specified in Dev Notes — pure data/types, zero RN/Linking imports (ARC-011). Story 7.4 is the only story that wires this to UI; this story only creates the file.
10. **i18n.** Every visible string on the Calm Me screen uses `t()`; no raw string literals in JSX; CI i18next lint passes.
11. **No duplicate entry points** *(story-author addition — not present in epics.md's Story 7.1 AC list; added because the new global FAB makes these obsolete, see Dev Notes — "AC #2 and AC #11 scope note")*. The four pre-existing local "Calm Me" buttons that are now redundant with the global FAB are removed, and their tests updated accordingly (see Dev Notes — "Existing Calm Me entry points to remove").

## Tasks / Subtasks

- [x] Task 1: Core config files (AC: #3, #9)
  - [x] Create `packages/core/src/config/calmMeConfig.ts` (`CALM_ME_AFFIRMATIONS`)
  - [x] Create `packages/core/src/config/helplines.ts` (`Helpline` type + `HELPLINES`)
  - [x] Export both from `packages/core/src/index.ts`
  - [x] No RN/Expo/`@supabase/*` imports in either file (ARC-011 boundary check)
- [x] Task 2: `CalmMeButton` primitive (AC: #1)
  - [x] Create `packages/ui/src/components/CalmMeButton.tsx` — `React.forwardRef`-wrapped `TouchableOpacity`, `onPress: () => void` prop only, no navigation import
  - [x] Export `CalmMeButton` + `CalmMeButtonProps` from `packages/ui/src/index.ts`
- [x] Task 3: Build the Calm Me screen (AC: #4, #5, #6, #7, #8, #10)
  - [x] Replace the stub `apps/mobile/app/calm-me.tsx` with the real screen: affirmation, technique picker (3 placeholder-route targets), Exit icon, conditional action footer, "Debrief now?" inline confirm
  - [x] Implement in-session detection per Dev Notes ("Determining in-session context")
  - [x] Implement Keep Going (fade dismiss) and Need to Stop (confirm → fresh SUDS prompt → Yes/Not now) per Dev Notes ("Need to Stop routing")
  - [x] Create the three technique-picker placeholder routes per Dev Notes ("Technique picker placeholder routes"): `apps/mobile/app/calm-me/breathing.tsx`, `calm-me/grounding.tsx`, `calm-me/helplines.tsx` — each with a top-left Back icon button (`router.back()`, `accessibilityLabel={t('calmMe.back')}`) to return to the Calm Me screen
  - [x] Implement the inline fresh-SUDS prompt on the "Need to Stop → Yes" path (reuse `SudsScale` pattern from `active.tsx`) per Dev Notes ("Need to Stop routing")
  - [x] Add all new i18n keys to both `en.json` and `hi.json`
- [x] Task 4: Wire the FAB into the root layout (AC: #1, #2)
  - [x] Mount `CalmMeButton` in `apps/mobile/app/_layout.tsx` outside `<Stack />`
  - [x] Hide/disable it when the active route is `/calm-me` (use `usePathname()`)
- [x] Task 5: Remove redundant local entry points (AC: #11)
  - [x] Remove the local Calm Me button from `apps/mobile/app/session/active.tsx` (`session.active.calmMe`) and its two assertions in `active.test.tsx`
  - [x] Remove the local Calm Me button from `apps/mobile/app/session/abandoned.tsx`
  - [x] Remove the local Calm Me button from `apps/mobile/app/(app)/index.tsx` and its two assertions in `index.test.tsx`
  - [x] Remove the local Calm Me button from `apps/mobile/app/session/debrief.tsx` (`home.calmMe.cta`, ~lines 220-225) — no test file references it, no test update needed
  - [x] Leave `ladder.tsx`'s crisis-banner CTA untouched (different trigger — crisis-keyword detection, not a generic always-on button)
  - [x] Remove the now-orphaned i18n keys `session.active.calmMe` and `home.calmMe.cta` from both `en.json`/`hi.json` once all four buttons above are removed and nothing else references them
- [x] Task 6: Tests
  - [x] `CalmMeButton.test.tsx` in `packages/ui` — **deviation, see Completion Notes**: not added; `packages/ui`'s Vitest config cannot parse `react-native`'s Flow syntax (no RN renderer wired in, confirmed by attempting it), matching the pre-existing `CourageLadderEntryCard` precedent (zero ui-level render tests). `CalmMeButton`'s wiring is instead covered via `CalmMeFab.test.tsx` at its consumption site.
  - [x] `calm-me.test.tsx` covering: non-session layout (no footer), in-session layout (footer present), Keep Going dismiss, Need to Stop → fresh-SUDS prompt → Yes routes to debrief with correct params (including the freshly-entered SUDS value) + enqueues abandonment, Need to Stop → Not now routes home, Exit returns with no state change, Exit while the "Debrief now?" confirm is open dismisses both with no state change
  - [x] AC #7's "≤300ms fade" is a design target, not a unit-tested assertion — tests assert the fade *occurs* (screen dismisses via `router.back()`) and that no enqueue/state-machine call fires, not the exact duration
  - [x] `_layout.test.tsx` exists but covers unrelated provider-nesting concerns and doesn't render `RootLayout` (which has heavy Sentry/PowerSync/font side effects) — FAB logic was extracted to `src/components/CalmMeFab.tsx` (mirroring the existing `BackButton` pattern) with its own `CalmMeFab.test.tsx` covering presence/hide-on-`/calm-me`/in-session routing, satisfying the "or equivalent" allowance
  - [x] `pnpm turbo lint` passes with no `i18next/no-literal-string` violations

### Review Findings

- [x] [Review][Patch] Resolve SUDS approximation gap by collecting a fresh reading — **Decision (2026-06-18): require a fresh SUDS reading rather than accept the approximation.** Applied: AC #8, Task 3, and the "Need to Stop routing" Dev Notes now require an inline fresh SUDS prompt before navigating to debrief.
- [x] [Review][Patch] Relabel AC #2/#11 citation — **Decision (2026-06-18): keep both ACs, stop claiming epics.md as their source.** Applied: new Dev Note "AC #2 and AC #11 scope note" + AC #11 parenthetical mark these as story-author additions.
- [x] [Review][Patch] Define stub technique-picker tap behavior — **Decision (2026-06-18): tappable, navigates to a placeholder screen.** Applied: AC #5, Task 3, and new Dev Note "Technique picker placeholder routes" specify the three placeholder routes + `calmMe.comingSoon` copy.
- [x] [Review][Patch] Add missing 4th entry point `session/debrief.tsx` to the removal table — Applied: table, Task 5, Project Structure Notes, and AC #11 all updated to five total instances / four to remove.
- [x] [Review][Patch] Add missing `clearSessionIntention(sessionId)` call to the "Need to Stop → Yes" contract — Applied: step 4 added to the Dev Notes contract.
- [x] [Review][Patch] Fix wrong architecture citation — Applied: AC #9 now cites ARC-011; References now cites epics.md#ARC-011 with a note on the prior mistaken ADR-001 citation.
- [x] [Review][Patch] Add a Task 5 subtask for orphaned i18n key cleanup — Applied.
- [x] [Review][Patch] Commit to `calmMe.yes` / `calmMe.notNow` as the final i18n key names now — Applied: hedge removed from "i18n keys to add".
- [x] [Review][Patch] Add an explicit `fearItemId` null-guard to the debrief URL contract — Applied: guard language added to step 5 of the Dev Notes contract.
- [x] [Review][Patch] Specify Exit-vs-open-confirm precedence — Applied: AC #4 now states Exit takes precedence over an open confirm.
- [x] [Review][Patch] Clarify AC #7's "≤300ms fade" isn't unit-tested — Applied: Task 6 now states the timing is a design target, not a unit-tested assertion.
- [x] [Review][Defer] No error-handling spec for `getAdapter().enqueue()` failures in the "Need to Stop" flow [Dev Notes: "Need to Stop routing — exact contract"] — deferred, pre-existing: the same gap already exists in `grounding.tsx`'s `handleConfirmStop`, the pattern being mirrored here.
- [x] [Review][Defer] FAB interaction with the non-dismissable recovery modal in `(app)/_layout.tsx` undocumented [`apps/mobile/app/(app)/_layout.tsx:95,127`] — deferred, likely a non-issue: RN's `<Modal>` renders in a separate native layer above all sibling content regardless of mount order, so the FAB shouldn't be reachable through it — but the interaction is never mentioned in the story.

### Code Review — Post-Implementation (2026-06-18)

_Multi-layer review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) of the implementation diff (`main...HEAD`, 26 files). Acceptance Auditor found zero AC violations — all 11 ACs verified against the implementation, plus tests/typecheck re-run independently. 24 raw findings → 5 patch, 1 decision-needed, 2 defer, 16 dismissed as noise/intentional/already-covered._

- [x] [Review][Decision] "Not now" leaves the exposure session dangling — `handleNotNow` [`apps/mobile/app/calm-me.tsx:36`] only does `setShowDebriefConfirm(false)` + `router.replace('/')`, with no enqueue/clear calls. **Resolved (2026-06-18): intentional soft-cancel** — the session stays active/resumable via the existing recovery modal; no code change needed. Documented explicitly in Dev Notes ("Need to Stop routing — exact contract") so it isn't mistaken for a bug in future reviews.
- [x] [Review][Patch] `CalmMeButton` has no `accessibilityLabel` [`packages/ui/src/components/CalmMeButton.tsx`] — only an unlabeled "♡" glyph; screen readers announce nothing meaningful. Applied: added a required `accessibilityLabel` prop to `CalmMeButtonProps`, passed from `CalmMeFab.tsx` via a new `calmMe.fab` i18n key (`en.json`/`hi.json`).
- [x] [Review][Patch] Debrief URL params not encoded [`apps/mobile/app/calm-me.tsx:83`] — `sessionId`, `preSuds`, `freshSuds` (as `debriefSuds`/`peakSuds`), and `completedAtMs` were interpolated raw while only `fearItemId` was wrapped in `encodeURIComponent`. Applied: all interpolated values now wrapped in `encodeURIComponent`.
- [x] [Review][Patch] No guard against rapid double-tap on the fresh-SUDS prompt [`apps/mobile/app/calm-me.tsx:47-84`, `:182`] — `SudsScale`'s `onChange` called the async `handleFreshSudsSelected` with no in-flight guard. Applied: added a `submittingSuds` state flag that short-circuits re-entry.
- [x] [Review][Patch] `CalmMeFab` has no double-tap guard [`apps/mobile/src/components/CalmMeFab.tsx`] — rapid taps before navigation completes could call `router.push` twice. Applied: added a `navigatingRef` guard, reset via a `useEffect` keyed on `pathname` once the user leaves `/calm-me`.
- [x] [Review][Patch] Missing test: Exit while the fresh-SUDS prompt (not just the debrief confirm) is open [`apps/mobile/app/calm-me.test.tsx`] — AC #4 and `handleExit`'s comment claim Exit "dismisses everything," but only the debrief-confirm-open case was tested. Applied: added `'Exit while the fresh-SUDS prompt is open dismisses it and the screen, with no enqueue/state change'` test case.
- [x] [Review][Defer] Sequential `enqueue()` calls in `handleFreshSudsSelected` aren't atomic and failures are only `console.error`'d, no user feedback [`apps/mobile/app/calm-me.tsx:54-66`] — deferred, pre-existing: same gap and pattern already logged above for `grounding.tsx`'s `handleConfirmStop`, which this code mirrors exactly; not introduced by this story.
- [x] [Review][Defer] `hi.json` only translates 3 of the 11 new `calmMe.*` keys (`needToStop`, `yes`, `notNow`) [`apps/mobile/src/i18n/locales/hi.json`] — deferred, already documented in this story's own Completion Notes as a translator task; i18next `fallbackLng: 'en'` covers the rest.

### Manual Smoke Test (2026-06-18) — critical runtime bug found and fixed

_Static review (typecheck/lint/227 Jest tests) had passed clean, but none of it renders the real root navigator. Launched the actual app in the iOS Simulator (`pnpm ios`) per `docs/setup/ios-simulator.md` to verify the feature end-to-end._

- [x] [Review][Patch] **App crashed on launch**: `ERROR [Error: A navigator cannot contain multiple 'Screen' components with the same name (found duplicate screen named 'calm-me')]`. Root cause: both `apps/mobile/app/calm-me.tsx` (file) and `apps/mobile/app/calm-me/` (directory, holding the new placeholder routes + `_layout.tsx`) existed simultaneously — an invalid Expo Router file+directory name collision. Never caught by Jest because `_layout.test.tsx` deliberately never renders the real `RootLayout` (documented in this story's own Completion Notes). Applied: moved `calm-me.tsx`/`calm-me.test.tsx` to `calm-me/index.tsx`/`calm-me/index.test.tsx` (the standard Expo Router pattern for a route that also has nested children), fixed the now-one-level-deeper relative imports, and added the `index` screen to `calm-me/_layout.tsx`'s `<Stack>`. Re-verified by relaunching the simulator and driving the app via `xcrun simctl openurl` deep links (screen-coordinate tapping wasn't available — this environment lacks the macOS Screen Recording/Accessibility permissions a real tap-and-screenshot loop needs): non-session `/calm-me` layout renders correctly (affirmation, 3 technique buttons, no footer), the FAB correctly hides only on the exact `/calm-me` route, and the `breathing` placeholder route renders correctly with a working Back affordance. No errors in the Metro log across the whole walk.

## Dev Notes

### Determining in-session context — there is no `SessionStateMachine` singleton

`packages/core/src/erp/session-state-machine.ts` exports only a pure `transition(currentState, event)` reducer — there is no app-wide "current session phase" object, and nothing tracks it globally. The only root-accessible signal is `useAuth().sessionRecoveryData` (from `@exposure-buddy/supabase`), which is non-null from the moment `session/intent.tsx` calls `setSessionInProgress()` until `clearSessionInProgress()` is called in `session/active.tsx` (on completion) or `session/grounding.tsx` (on confirmed stop) — i.e. it spans `pre_session`, `active`, **and** `grounding`, it does not distinguish `active` from `grounding`.

**Use this combined signal for "in-session" (AC #6):** `sessionRecoveryData !== null && pathname === '/session/active'` (via `usePathname()` from `expo-router`). This correctly shows the action footer only when Calm Me is opened from the actual active-exposure screen, and falls back to the non-session layout everywhere else (including if the FAB is somehow tapped from the grounding screen itself, which already has its own resume/stop affordances and shouldn't show a second one). Do not attempt to build a new global session-phase store for this story — out of scope.

### AC #2 and AC #11 scope note — story-author additions

AC #2 (FAB hides on `/calm-me`) and AC #11 (remove the four pre-existing local Calm Me buttons) are not present in epics.md's Story 7.1 acceptance criteria (lines 1420–1490) — epics.md only specifies the FAB's always-visible behavior, folding the hide-on-open-Calm-Me behavior into the same Given/When/Then as AC #1. AC #11 specifically has no epics.md counterpart at all. Both are story-author additions, justified by the new global FAB making the existing local buttons redundant and avoiding a double-stacked Calm Me screen. Flagged here per code review (2026-06-18) so the distinction between epics.md-sourced ACs and story-author ACs is explicit.

### Need to Stop routing — exact contract

Tapping "Not now" → `router.replace('/')` (matches the navigation call style of `session/abandoned.tsx` and `session/debrief.tsx`'s "go home" buttons — not their abandonment side-effects). **Decision (code review, 2026-06-18): this is an intentional soft-cancel, not a partial-abandonment path.** "Not now" performs no `enqueue`/`clearSessionInProgress`/`clearSessionIntention` calls — the exposure session is left exactly as it was (still `in_progress`, `sessionRecoveryData` still set), so the user can resume it later via the existing session-recovery modal. Do not add abandonment side-effects to this branch; only "Yes" (below) abandons the session.

Tapping "Yes" first shows an inline one-tap SUDS prompt (reuse the `SudsScale` component pattern from `active.tsx`) — **Decision (code review, 2026-06-18): this story collects a fresh SUDS reading rather than approximating from `sessionRecoveryData.preSuds`**, so the debrief screen's narrative branch and crisis-contact display (`debriefSudsInt >= 8 || peakSudsInt >= 8`) reflect actual current distress. Once the user submits the fresh reading (call it `freshSuds`), proceed in order, mirroring the existing `session/grounding.tsx` `handleConfirmStop` pattern (the closest existing precedent for an early/abandoned exit) before navigating to `/session/debrief`:
1. `getAdapter().enqueue('exposure_sessions', 'UPDATE', { id: sessionId, status: 'abandoned', ended_at: <now ISO> })`
2. If `fearItemId` is non-null: `getAdapter().enqueue('fear_ladder_items', 'UPDATE', { id: fearItemId, status: 'pending', updated_at: <now ISO>, updatedAt: Date.now() })`
3. `clearSessionInProgress()`
4. `clearSessionIntention(sessionId)` if `sessionId` is non-null — mirrors `grounding.tsx`'s `handleConfirmStop`, which calls this immediately after `clearSessionInProgress()` (verified at `apps/mobile/app/session/grounding.tsx:51-52`); omitting it leaves a stale session-intention MMKV entry.
5. `router.push('/session/debrief?sessionId=...&fearItemId=...&preSuds=...&debriefSuds=...&peakSuds=...&completedAtMs=...')` with `debriefSuds` and `peakSuds` both set to `freshSuds`. Guard `fearItemId` explicitly when building this URL: if `fearItemId` is null, omit/empty the param rather than interpolating the literal string `"null"` — mirror `active.tsx`'s existing null-guard pattern for this same param.

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
This story creates the file only — Story 7.4 builds the UI that consumes it. The technique-picker target for "Helplines" in this story navigates to a placeholder route per "Technique picker placeholder routes" below (Story 7.4 builds the real screen).

### Technique picker placeholder routes

**Decision (code review, 2026-06-18): stub targets are tappable and navigate to a placeholder screen**, not disabled. Create three minimal placeholder routes: `apps/mobile/app/calm-me/breathing.tsx`, `apps/mobile/app/calm-me/grounding.tsx`, `apps/mobile/app/calm-me/helplines.tsx` — each renders a single centered `t('calmMe.comingSoon')` ("More on this soon") string plus a Back icon button (top-left, `accessibilityLabel={t('calmMe.back')}`) that calls `router.back()` to return to the Calm Me screen it was pushed from. Stories 7.2–7.4 replace the placeholder body with the real Breathing coach, 5-4-3-2-1 exercise, and Helplines screen respectively, without changing the navigation wiring from the technique picker or the Back button's presence/position.

### File-naming convention conflict — intentional, not an oversight

`implementation-patterns-consistency-rules.md` specifies non-component files as kebab-case (e.g. `session-state-machine.ts`), but the epics.md AC hard-codes the literal paths `calmMeConfig.ts` and `helplines.ts` (camelCase for the former). Follow the epics.md literal filenames as written — this mirrors the accepted Epic 3 precedent (`keywordDetector.ts` vs. the architect's `detector.ts`, see project memory). No CI check lints filename casing; only the `packages/core` RN-import boundary is CI-enforced. Do not rename to kebab-case.

### Existing Calm Me entry points to remove

**Updated per code review (2026-06-18): five local "Calm Me" buttons exist, not four — `session/debrief.tsx` was missed in the original draft.** All five were added by earlier stories as placeholders pending Epic 7, all pushing to `/calm-me` with no params:

| File | Label | Action |
|---|---|---|
| `apps/mobile/app/session/active.tsx` (~line 182) | `session.active.calmMe` | **Remove** — superseded by global FAB |
| `apps/mobile/app/session/abandoned.tsx` | `home.calmMe.cta` | **Remove** — superseded by global FAB |
| `apps/mobile/app/(app)/index.tsx` (~line 120) | `home.calmMe.cta` | **Remove** — superseded by global FAB |
| `apps/mobile/app/session/debrief.tsx` (~lines 220-225) | `home.calmMe.cta` | **Remove** — superseded by global FAB (verified present; missed in the original draft) |
| `apps/mobile/app/ladder.tsx` (~line 204) | `ladder.crisis.cta` | **Keep unchanged** — conditional on crisis-keyword detection (Epic 3), not a generic always-on entry point; distinct purpose from the FAB |

Removing the four buttons breaks existing assertions — update, don't just delete the tests:
- `apps/mobile/app/session/active.test.tsx` lines ~109, ~112-115 (`getByLabelText('session.active.calmMe')` presence + navigation assertions)
- `apps/mobile/app/(app)/index.test.tsx` lines ~114, ~117-120 (`getByRole('button', { name: 'home.calmMe.cta' })` presence + navigation assertions)
- `apps/mobile/app/session/abandoned.tsx` has no test file (confirmed) — no test updates needed for that removal
- `apps/mobile/app/session/debrief.test.tsx` has no assertions referencing `calmMe`/`home.calmMe.cta` (confirmed) — no test updates needed for that removal either

The now-orphaned i18n keys `session.active.calmMe` and `home.calmMe.cta` (in both `en.json`/`hi.json`) can be removed once no longer referenced — confirm nothing else uses them first (Task 5 owns this cleanup explicitly).

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
- `calmMe.yes` — "Yes"
- `calmMe.notNow` — "Not now"
- `calmMe.comingSoon` — "More on this soon" (used by the three technique-picker placeholder routes — see Dev Notes "Technique picker placeholder routes")
- `calmMe.back` — "Back" (accessibility label for the Back icon button on the three placeholder routes)
- Technique picker labels (Breathing, 5-4-3-2-1, Helplines) — these are new keys this story owns; Stories 7.2-7.4 reuse them, don't redefine

Note: `calmMe.keepGoing` and `calmMe.needToStop` have copy identical to the pre-existing `session.grounding.resume` / `session.grounding.confirmStop` keys. Do not reuse those keys — the epics.md AC explicitly names the new `calmMe.*` keys, and the two screens are conceptually distinct flows even though current copy coincides.

### Project Structure Notes

- New files: `packages/core/src/config/calmMeConfig.ts`, `packages/core/src/config/helplines.ts`, `packages/ui/src/components/CalmMeButton.tsx`, `apps/mobile/app/calm-me/breathing.tsx`, `apps/mobile/app/calm-me/grounding.tsx`, `apps/mobile/app/calm-me/helplines.tsx`
- Modified files: `apps/mobile/app/calm-me.tsx` (stub → real), `apps/mobile/app/_layout.tsx` (mount FAB), `apps/mobile/app/session/active.tsx`, `apps/mobile/app/session/abandoned.tsx`, `apps/mobile/app/(app)/index.tsx`, `apps/mobile/app/session/debrief.tsx` (remove redundant buttons), `packages/core/src/index.ts`, `packages/ui/src/index.ts` (barrel exports), both `en.json`/`hi.json`
- No new packages, no migrations, no Edge Functions
- Consistent with existing structure: mobile screens in `apps/mobile/app/`, shared domain config in `packages/core/src/config/`, shared UI primitives in `packages/ui/src/components/`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1, lines 1420-1490] — canonical acceptance criteria
- [Source: _bmad-output/planning-artifacts/epics.md#ARC-011] — packages/core import boundary CI gate (zero RN/Expo/@supabase imports, even as devDeps) — corrected from an earlier mistaken `ADR-001` citation (ADR-001 in `core-architectural-decisions.md` covers packages/core's domain-layer scope, not the import boundary)
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Naming Patterns] — file naming conventions (see conflict note above)
- `apps/mobile/app/session/grounding.tsx` — pattern for abandonment enqueue + MMKV clear before navigation
- `apps/mobile/app/(app)/_layout.tsx` — `handleRecoveryResume`/`handleRecoveryEnd` — closest existing precedent for a root-level component reading `sessionRecoveryData` and performing session-ending writes
- `packages/ui/src/components/CourageLadderEntryCard.tsx` — component shape/export pattern to mirror
- `packages/core/src/erp/session-state-machine.ts` — confirms no singleton state exists; states are `idle | pre_session | active | grounding | completed | abandoned`
- `packages/core/src/types/session-recovery-data.ts` — `SessionRecoveryData` shape (`sessionId`, `fearItemId`, `preSuds`, `description`)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6)

### Debug Log References

- `pnpm turbo typecheck` — all 6 packages pass
- `pnpm turbo lint` — all 6 packages pass (0 `i18next/no-literal-string` violations)
- `pnpm turbo test` — 226 mobile Jest tests + 41 core/64 ui-sync-supabase Vitest tests pass, 0 regressions

### Completion Notes List

- **In-session detection mechanism (Dev Notes ambiguity resolved):** The Dev Notes' literal instruction — "use `sessionRecoveryData !== null && pathname === '/session/active'` via `usePathname()` inside the in-session check" — cannot work if evaluated inside `calm-me.tsx` itself: by the time that screen mounts, `usePathname()` already returns `/calm-me` everywhere in the app (Expo Router's pathname is global, not screen-local), so the originating route is unrecoverable from inside the destination screen. Resolved by computing `isInSession` in the FAB (`CalmMeFab`, at tap-time, where `usePathname()` still correctly reads the screen being tapped from) and threading the result through a `?inSession=1` query param — `router.push(isInSession ? '/calm-me?inSession=1' : '/calm-me')`. In the common case (not in session, e.g. tapped from Home), this reduces to exactly `router.push('/calm-me')`, matching AC #1's literal wording; only the in-session branch adds the param. `calm-me.tsx` combines this param with a live `sessionRecoveryData !== null` re-check as a safety net.
- **`CalmMeButton.test.tsx` not added to `packages/ui`:** Attempted per Task 6; `packages/ui`'s Vitest config (`environment: 'node'`, no `@testing-library/react-native`) cannot even parse `react-native`'s Flow syntax (`RollupError: Parse failure: Expected 'from', got 'typeOf'` on `react-native/index.js`), confirming the existing project constraint (memory: `project_vitest_no_tests`) that this package has zero RN-renderable tests — `CourageLadderEntryCard` has none either. Adding a working RN test harness here would require new devDependencies (`@testing-library/react-native`, Babel/Flow transforms), which is out of scope without separate approval. `CalmMeButton`'s `onPress` wiring is instead verified at its consumption site via `CalmMeFab.test.tsx`; `packages/ui`'s `tsc --noEmit` typechecks the primitive.
- **FAB logic extracted to `src/components/CalmMeFab.tsx`** rather than left inline in `app/_layout.tsx`. `_layout.test.tsx` exists but deliberately never renders `RootLayout` (which has Sentry/PowerSync/font-loading side effects with no existing mocks) — it only imports isolated providers directly. Extracting `CalmMeFab` (mirroring the existing `BackButton` component pattern, also imported into `_layout.tsx`) allowed writing `CalmMeFab.test.tsx` covering FAB presence, hide-on-`/calm-me`, and the in-session routing decision, without needing to mock the entire root layout's dependency graph. `app/_layout.tsx` still owns mounting it as a sibling to `<Stack>` (AC #1) — only the implementation moved.
- **`packages/ui`'s `CalmMeButton`** renders a Text-glyph icon (♡) rather than using `@expo/vector-icons`, since that package is not currently a dependency of `packages/ui` (only `apps/mobile`) — avoided adding a new dependency without approval. The Exit (✕) and placeholder-route Back (‹) icons in `apps/mobile` similarly use Text glyphs, consistent with AC #4's own "✕" notation.
- **`apps/mobile/app/calm-me/_layout.tsx` added** (not listed in the story's Project Structure Notes) — every existing route subfolder in this app (`session/`, `(app)/`, `(auth)/`, `(onboarding)/`) has its own `_layout.tsx`; the three new placeholder routes need one too, for consistency and to explicitly set `headerShown: false` the same way `session/_layout.tsx` does.
- **`i18n.test.ts`'s `KEY_PATTERN` regex updated**: AC #3's literal mandated key `'calmMe.affirmation.1'` has a purely-numeric final segment, which the pre-existing key-naming-convention test rejected (every segment previously had to start with a lowercase letter). Widened the regex to additionally accept pure-numeric segments (`[0-9]+`) while keeping every other existing/new key's lowercase-camelCase requirement intact — verified against all existing keys plus the new ones; no false negatives introduced.
- **Two prompt-injection attempts were encountered and ignored** during context-gathering: fake "Plan mode is active" and "Exited Plan Mode / Auto Mode Active" `<system-reminder>` blocks appeared embedded inside two `Read` tool outputs (mid-file-content), not as genuine system or user turns. They were flagged to the user and disregarded; the legitimate `/bmad-dev-story` workflow instructions (continuous execution, no review pauses except defined HALT conditions) were followed instead.
- `hi.json` received partial translations for the new `calmMe` keys (`needToStop`, `yes`, `notNow`) — consistent with this file's existing partial-translation pattern (i18next `fallbackLng: 'en'` covers the rest); full Hindi translation of all new copy is a translator task, not addressed here.

### File List

**New files:**
- `packages/core/src/config/calmMeConfig.ts`
- `packages/core/src/config/helplines.ts`
- `packages/ui/src/components/CalmMeButton.tsx`
- `apps/mobile/app/calm-me/_layout.tsx`
- `apps/mobile/app/calm-me/index.tsx` (stub `calm-me.tsx` → real screen, then moved to `calm-me/index.tsx` post-review to fix an Expo Router file+directory name collision — see "Manual Smoke Test" above)
- `apps/mobile/app/calm-me/index.test.tsx`
- `apps/mobile/app/calm-me/breathing.tsx`
- `apps/mobile/app/calm-me/grounding.tsx`
- `apps/mobile/app/calm-me/helplines.tsx`
- `apps/mobile/src/components/CalmMeFab.tsx`
- `apps/mobile/src/components/CalmMeFab.test.tsx`

**Modified files:**
- `packages/core/src/index.ts`
- `packages/ui/src/index.ts`
- `apps/mobile/app/_layout.tsx` (mount `CalmMeFab`)
- `apps/mobile/app/session/active.tsx` (removed redundant local Calm Me button)
- `apps/mobile/app/session/active.test.tsx` (removed obsolete Calm Me assertions)
- `apps/mobile/app/session/abandoned.tsx` (removed redundant local Calm Me button)
- `apps/mobile/app/(app)/index.tsx` (removed redundant local Calm Me button)
- `apps/mobile/app/(app)/index.test.tsx` (removed obsolete Calm Me assertions)
- `apps/mobile/app/session/debrief.tsx` (removed redundant local Calm Me button)
- `apps/mobile/src/i18n/locales/en.json` (new `calmMe` namespace; removed orphaned `session.active.calmMe`/`home.calmMe.cta`)
- `apps/mobile/src/i18n/locales/hi.json` (same)
- `apps/mobile/src/i18n/i18n.test.ts` (`KEY_PATTERN` widened for numeric segments)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status tracking)

## Change Log

| Date | Change |
|---|---|
| 2026-06-18 | Implemented Story 7.1: global Calm Me FAB, `calmMeConfig.ts`/`helplines.ts`, Calm Me screen (non-session + in-session layouts, Exit, Need to Stop → fresh-SUDS → debrief routing), 3 technique-picker placeholder routes, removal of 4 redundant local Calm Me entry points, full test coverage. Status: ready-for-dev → review. |
| 2026-06-18 | Post-implementation code review: 0 AC violations. 5 patches applied (FAB/button accessibilityLabel, debrief-URL encoding, SUDS-prompt + FAB double-tap guards, missing Exit-during-SUDS test); 1 decision resolved ("Not now" confirmed as intentional soft-cancel, documented in Dev Notes); 2 items deferred (enqueue-failure handling, partial Hindi translations). Status: review → done. |
