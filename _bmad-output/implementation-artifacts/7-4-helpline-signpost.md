# Story 7.4: Helpline Signpost

Status: done (spec reviewed 2026-06-20 — 2 patches applied, 2 deferred; code reviewed 2026-06-20 — 1 patch applied, 2 deferred)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user in crisis or seeking additional support,
I want a screen showing crisis helpline contacts with one-tap calling,
so that I can reach human support immediately, even offline (FR-CRISIS-01, NFR-OFFLINE-03).

## Acceptance Criteria

1. **Intro + cards render from `HELPLINES`.** Tapping the Helplines target on the support screen (already wired — see Dev Notes "Already wired from the technique picker") loads the helpline screen; an intro line renders: `t('helplines.intro')` ("Talking to someone helps. These services are free and confidential."); below it, one card per entry in `HELPLINES` (from `packages/core/src/config/helplines.ts`, already created in Story 7.1 — see Dev Notes "HELPLINES already exists — no core changes needed") renders the entry's `name`, `displayNumber`, and a `t('helplines.call')` ("Call") button. The `Helpline` type is imported from `@exposure-buddy/core` — no inline type redefinition.
2. **Empty-state fallback.** If `HELPLINES` is empty, a fallback message renders instead of an empty list: `t('helplines.unavailable')` ("Helpline information is not available in your region yet."); no crash, no blank list. (`HELPLINES` currently ships 5 entries — this branch is defensive, not reachable in practice today.)
3. **Call button — dial and silently recover from failure.** Tapping "Call" on any helpline card calls `Linking.openURL('tel:' + entry.number)`; if the call rejects/throws, the error is caught, `console.error` logs the failure, and no error surface is shown to the user — the UI remains unchanged. **This catch is a hard requirement of this AC — see Dev Notes "debrief.tsx's existing Linking pattern does not catch — don't copy that part."**
4. **Offline-safe rendering.** With no network connection, all helpline cards are visible and "Call" buttons are functional; no network call of any kind is made to render this screen (NFR-OFFLINE-03). `HELPLINES` is a static bundled array — there is nothing to fetch.
5. **No hardcoded helpline data in the component.** `HELPLINES` and `Helpline` are imported solely from `packages/core/src/config/helplines.ts` (via the `@exposure-buddy/core` barrel); updating that file is the only change required to add/edit/remove any helpline entry. No helpline name/number is typed literally anywhere in `apps/mobile` or `packages/ui` for this screen.
6. **i18n.** *(story-author addition — epics.md's Story 7.4 section omits this AC, unlike Stories 7.1–7.3, but the project-wide CI gate still applies.)* Every visible string on the helpline screen uses `t()`; no raw string literals in component JSX; CI `i18next/no-literal-string` lint passes.
7. **Touch target — 56px, in-the-moment register.** *(story-author addition, sourced from `responsive-design-accessibility.md`'s "56×56px: all in-the-moment interactive elements" rule, applied identically to `BreathingCoach`'s "I'm ready" CTA in Story 7.2 and `GroundingPrompt`'s CTA in Story 7.3.)* The "Call" button on each card uses a minimum height of `tapTarget.inTheMoment` (56px) — this screen is reached exclusively through the Calm Me flow, the same register as those two components.
8. **Card accessibility label.** *(story-author addition, sourced from `component-strategy.md`'s `HelplineCard` spec — see Dev Notes "component-strategy.md's HelplineCard — same name, different screen, partially reusable spec.")* Each card's "Call" button has `accessibilityLabel={callLabel + " " + name + ": " + displayNumber}` — built from the same pre-translated `callLabel` prop used for the button's visible text (e.g. "Call Tele MANAS: 1800-891-4416" in English) so the label is locale-correct, not a hardcoded English literal — and `accessibilityRole="button"`. *(Amended 2026-06-20 post-implementation code review — see Review Findings: the original wording hardcoded the English word "Call" regardless of locale.)*

## Tasks / Subtasks

- [x] Task 1: `HelplineCard` component (AC: #1, #3, #6, #7, #8)
  - [x] Create `packages/ui/src/components/HelplineCard.tsx` — presentational, mirrors `CourageLadderEntryCard.tsx`'s shape (`React.forwardRef`, `StyleSheet.create()`, no NativeWind, named export + separately-exported props type, added to `packages/ui/src/index.ts`'s barrel).
  - [x] Props: `name: string`, `displayNumber: string`, `callLabel: string` (pre-translated — see Dev Notes "Pre-translated props, not `useTranslation()` inside `packages/ui`"), `onCallPress: () => void`. **Do not import `Linking` or call it inside this component** — `packages/ui`'s import boundary forbids RN platform-integration APIs (`component-strategy.md`: "Forbidden: ... RN platform APIs"); the component exposes `onCallPress` and the screen wrapper performs the actual `Linking.openURL` call and its try/catch (AC #3). This mirrors `GroundingPrompt`'s `onComplete` callback pattern — the primitive never owns the side effect.
  - [x] Render: `name`, `displayNumber`, a single "Call" `TouchableOpacity` with `minHeight: tapTarget.inTheMoment` (AC #7), `accessibilityRole="button"`, `accessibilityLabel={\`${callLabel} ${name}: ${displayNumber}\`}` (AC #8 — built from the translated `callLabel` prop, not a hardcoded "Call" literal). Use `color.accent.courage` for the Call button's accent styling, **not** `color.accent.grounding` — continue the same unaudited-token substitution `BreathingCoach`/`GroundingPrompt` already established (see Dev Notes "`color.accent.grounding` still unaudited").
  - [x] No co-located `HelplineCard.test.tsx` — `packages/ui`'s Vitest config has no RN renderer (same documented wall every other `packages/ui` component hits); `tsc --noEmit` typechecks the primitive, behavior is covered via the screen-level test in Task 4.
  - [x] Export `HelplineCard` + its props type from `packages/ui/src/index.ts`.
- [x] Task 2: Screen wiring (AC: #1, #2, #3, #4, #5, #6)
  - [x] Replace the placeholder body in `apps/mobile/app/calm-me/helplines.tsx` with a thin wrapper: import `HELPLINES` and `Helpline` from `@exposure-buddy/core`, import `HelplineCard` and `color` from `@exposure-buddy/ui`. Render `t('helplines.intro')`, then either the mapped `HelplineCard` list (AC #1) or the `t('helplines.unavailable')` fallback when `HELPLINES.length === 0` (AC #2). **Do not** change the route's nav wiring, the `Stack.Screen` options, or the existing top-left Back button's position/behavior (see Dev Notes "Reuse the existing placeholder shell").
  - [x] Implement `handleCall(number: string)`: wrap the `Linking.openURL('tel:' + number)` call in `try/catch` AND attach a `.catch((err) => console.error('[HelplinesScreen] call failed:', err))` to the returned promise — the `try/catch` covers a synchronous throw from `Linking.openURL` itself, the `.catch()` covers a rejected promise; AC #3 requires both paths logged via `console.error`, a `.catch()` alone only covers promise rejection. The call is fire-and-forget from the UI's perspective; no loading/disabled state on failure, no user-visible error (AC #3). Import `Linking` from `react-native` in this screen file only.
  - [x] Use `color.surface.primary` and `width: '100%'` on the screen container, matching the `breathing.tsx`/`grounding.tsx` post-fix pattern (do not reintroduce the placeholder's raw `'#ffffff'`/no-`width` pattern).
  - [x] Wrap the helpline list in a `ScrollView` if more than a few cards risk overflowing a small screen — there is no existing precedent for this in the Calm Me screens (`breathing.tsx`/`grounding.tsx` both render single-focus content that fits without scrolling), so use your judgment based on 5 cards' rendered height; a plain `View` is acceptable if it fits.
- [x] Task 3: i18n keys (AC: #1, #2, #6)
  - [x] Add new `helplines` namespace to `en.json`: `intro`, `call`, `unavailable` — exact canonical copy quoted in the ACs above. Reuse the existing `calmMe.technique.helplines` ("Helplines") and `calmMe.back` keys — already present and already wired in `calm-me/index.tsx` — do not redefine them.
  - [x] Add the same keys to `hi.json` (full or partial translation — `fallbackLng: 'en'` covers any gaps, matching the Story 7.2/7.3 precedent of partial Hindi coverage).
- [x] Task 4: Tests (AC: #1–#8)
  - [x] `apps/mobile/app/calm-me/helplines.test.tsx` — new file (verified: no existing test file for this route — only `index.test.tsx`, `breathing.test.tsx`, `grounding.test.tsx` exist in `apps/mobile/app/calm-me/`). Mirror `breathing.test.tsx`'s mocking convention: `jest.mock('react-i18next', ...)` with `t` as identity, `jest.mock('expo-router', ...)` for `Stack`/`useRouter`, plus `jest.mock('react-native', ...)` or a spy on `Linking.openURL` (check `react-native`'s existing jest preset in this repo first — search for any prior `Linking` mock in the test suite before writing a new one).
  - [x] Cover: all 5 `HELPLINES` entries render with their `name`/`displayNumber` and a "Call" button (AC #1); tapping a card's Call button calls `Linking.openURL('tel:' + that entry's number)` (AC #3); when `Linking.openURL` rejects, the test asserts `console.error` was called and the screen does not throw/crash and renders unchanged (AC #3); the top-left Back button calls `router.back()` with no error (mirrors `grounding.test.tsx`'s Back-button test); each Call button has `minHeight` ≥ 56 (AC #7) and the expected `accessibilityLabel` format (AC #8). Do **not** write a live-test for the AC #2 empty-state branch by mutating the real `HELPLINES` export — instead unit-test the conditional rendering logic by mocking `@exposure-buddy/core`'s `HELPLINES` export to `[]` for that one test case, following whatever core-mocking pattern (if any) existing `apps/mobile` tests use — grep for `jest.mock('@exposure-buddy/core'` before deciding the approach; if no precedent exists, a simple `jest.mock` with `jest.requireActual` spread plus an override is the standard pattern.
  - [x] `pnpm turbo lint` passes — 0 `i18next/no-literal-string` violations.
  - [x] `pnpm turbo typecheck` and `pnpm turbo test` — zero regressions across all 6 packages.
  - [x] AC #4 (offline-safe rendering / NFR-OFFLINE-03) has no dedicated runtime test — it is satisfied by inspection, not assertion: this screen imports no networking API (`fetch`, `axios`, PowerSync, etc.), only `Linking` for `tel:` URIs, so there is nothing to mock or assert. Confirm at review time that no such import was introduced.

## Dev Notes

### Already wired from the technique picker

`apps/mobile/app/calm-me/index.tsx` already routes here: `onPress={() => router.push('/calm-me/helplines')}` on the `calmMe.technique.helplines` card (built in Story 7.1). Do not touch `calm-me/index.tsx`'s technique-picker wiring.

### HELPLINES already exists — no core changes needed

Unlike Stories 7.2/7.3, this story does **not** create a new `packages/core/src/config/*.ts` file. `packages/core/src/config/helplines.ts` and its barrel export (`export type { Helpline }`, `export { HELPLINES }` in `packages/core/src/index.ts`) were already created in Story 7.1 specifically so this story could consume them directly — its file header literally says "Story 7.4 builds the UI that consumes this data — this file only creates it." `HELPLINES` currently has 5 entries (Tele MANAS, KIRAN, iCall, Vandrevala Foundation, AASRA) with `id`/`name`/`number`/`displayNumber` fields. **Do not modify `helplines.ts`** — this story is UI-only.

### Reuse the existing placeholder shell — don't rebuild navigation

Story 7.1 already created `apps/mobile/app/calm-me/helplines.tsx` as a placeholder route, reachable from the Calm Me technique picker with no params. Its current body (verbatim):
```typescript
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'

// Placeholder — Story 7.4 replaces this body with the full Helplines screen (consumes HELPLINES).
// Navigation wiring (Back button) is owned by this story and must not change.
export default function HelplinesPlaceholderScreen() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('calmMe.back')}
        >
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.comingSoon}>{t('calmMe.comingSoon')}</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 48, left: 24, padding: 8 },
  backIcon: { fontSize: 28, color: '#111827' },
  comingSoon: { fontSize: 16, color: '#374151' },
})
```
This story replaces only the body, **keeping** the `Stack.Screen options={{ headerShown: false }}` wrapper and the top-left Back button (`router.back()`, `accessibilityLabel={t('calmMe.back')}`) exactly as-is. This screen is not a mandatory lockout screen; default Expo Router back-navigation (iOS swipe-back, Android hardware back, the explicit Back button) all simply pop the route — no AC requires disabling it, unlike `session/grounding.tsx`.

The container/styles need the same update every other Calm Me screen got: replace the raw `backgroundColor: '#ffffff'` with `color.surface.primary` and add `width: '100%'`.

### Pre-translated props, not `useTranslation()` inside `packages/ui`

Per the established Story 7.1/7.2/7.3 precedent (`CalmMeButton`/`BreathingCoach`/`GroundingPrompt`): `react-i18next` is not resolvable from `packages/ui` (not a dependency there). `HelplineCard` follows the same pattern — it accepts already-translated `callLabel` as a prop; `name`/`displayNumber` come straight from the `Helpline` data object (not translated strings — they're proper nouns and phone numbers). The `apps/mobile/app/calm-me/helplines.tsx` wrapper screen calls `t('helplines.call')` once and passes it down to every card.

### debrief.tsx's existing Linking pattern does not catch — don't copy that part

`apps/mobile/app/session/debrief.tsx` (lines ~151–178) already has a working `Linking.openURL('tel:...')` precedent for crisis contacts — 3 hardcoded numbers (iCall, Vandrevala, Tele MANAS — a subset duplicated from `HELPLINES`, not imported from it) with `accessibilityRole="link"` and an `accessibilityLabel` format of `"{name}: {number}"` (no "Call " prefix). **That file's `Linking.openURL` calls have no `.catch()` at all** — a rejected promise there is silently swallowed by the runtime with no `console.error`. AC #3 of this story explicitly requires catching and logging the error, so **do not copy debrief.tsx's error-handling (lack thereof)** — only its general `Linking.openURL('tel:' + number)` call shape is reusable as a pattern reference. `debrief.tsx`'s hardcoded numbers are a pre-existing, out-of-scope gap (not something this story fixes) — don't be confused by seeing two different "call a helpline" implementations in the codebase; this story's `HelplineCard`/`helplines.tsx` is the canonical, config-driven one going forward.

### component-strategy.md's `HelplineCard` — same name, different screen, partially reusable spec

`ux-design-specification/component-strategy.md` has a `HelplineCard` entry (line ~217), but it was written for a **different screen**: "Rendered on the SPIN ≥40 referral screen" (an F1 onboarding referral flow, not the Calm Me support screen this story implements), with a States line of "`loaded` · `loading` (skeleton) · `empty`" implying a remote-config fetch, and an "Open ADR: Remote config system ... deferred to implementation ADR" (`ADR-HELPLINE-CONFIG`, still listed open in that doc).

That ADR was already implicitly resolved by Story 7.1: `HELPLINES` is a static bundled `packages/core` array, not a remote-fetched config — confirmed by this story's own AC #4 ("no network call is made to render this screen", NFR-OFFLINE-03). Treat epics.md's Story 7.4 ACs (this story's literal source of truth, same precedent Stories 7.1–7.3 established) as authoritative over `component-strategy.md`'s older, differently-scoped spec:
- **No `loading`/skeleton state** — there's nothing async to load.
- **No "availability label"** (`component-strategy.md`'s anatomy line mentions "24/7, free") — the `Helpline` interface (locked in since Story 7.1) has no such field, and epics.md's AC doesn't ask for one. Don't invent one.
- **Keep** the `accessibilityLabel="Call [name]: [number]"` convention (AC #8 above) — that part of the spec is reusable regardless of which screen renders the card, and it strengthens accessibility beyond epics.md's literal (silent on a11y) ACs.
- The component name `HelplineCard` is reused deliberately, consistent with the Phase 2 roadmap listing it once for the whole app, not duplicated per-screen.

### `color.accent.grounding` still unaudited — continue the `courage` substitution

`responsive-design-accessibility.md` still flags `accent.grounding: #8B6F47` on white as an unresolved contrast-audit risk (tracked in `deferred-work.md`, unresolved as of Story 7.3). `BreathingCoach` (7.2) and `GroundingPrompt` (7.3) both substituted `color.accent.courage` instead, as a temporary measure pending audit. Continue that same substitution for `HelplineCard`'s Call button — do not introduce a new use of `color.accent.grounding`.

### Project Structure Notes

- New files: `packages/ui/src/components/HelplineCard.tsx`, `apps/mobile/app/calm-me/helplines.test.tsx`
- Modified files: `apps/mobile/app/calm-me/helplines.tsx` (placeholder body → thin wrapper screen), `packages/ui/src/index.ts` (barrel export), `apps/mobile/src/i18n/locales/en.json`/`hi.json` (new `helplines` namespace)
- No `packages/core` changes (config already exists from Story 7.1), no migrations, no Edge Functions, no new third-party dependencies (`Linking` is built into `react-native`, already used elsewhere in `apps/mobile`)
- Consistent with existing structure: shared presentational components in `packages/ui/src/components/`, screens in `apps/mobile/app/`, platform API calls (`Linking`) confined to `apps/mobile`, never `packages/ui`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.4, lines 1576–1604] — canonical acceptance criteria
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1, lines 1467–1485] — `helplines.ts` origin, `Helpline`/`HELPLINES` already defined
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Naming Patterns, #Structure Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/component-strategy.md#HelplineCard] — anatomy/accessibility reused where compatible; states/loading/availability-label superseded by this story's literal ACs (see Dev Notes)
- [Source: _bmad-output/planning-artifacts/ux-design-specification/responsive-design-accessibility.md#Touch targets] — 56×56px in-the-moment rule
- `_bmad-output/implementation-artifacts/deferred-work.md` — open `color.accent.grounding` audit item (Story 7.2 origin, continued substitution)
- `_bmad-output/implementation-artifacts/7-3-5-4-3-2-1-sensory-grounding-exercise.md` — `GroundingPrompt.tsx`/`grounding.tsx` patterns mirrored throughout (pre-translated props, callback-not-side-effect component boundary, `color.surface.primary`/`width:'100%'` container pattern)
- `apps/mobile/app/calm-me/helplines.tsx` — placeholder shell to extend (current implementation quoted above)
- `apps/mobile/app/calm-me/index.tsx` — existing technique-picker wiring to `/calm-me/helplines` (Story 7.1, unchanged)
- `apps/mobile/app/session/debrief.tsx` (lines ~151–178) — existing but incomplete `Linking.openURL('tel:...')` precedent; reuse the call shape, not the missing error handling (see Dev Notes)
- `packages/core/src/config/helplines.ts`, `packages/core/src/index.ts` — `Helpline`/`HELPLINES` already exported
- `packages/ui/src/components/CourageLadderEntryCard.tsx`, `packages/ui/src/components/BreathingCoach.tsx`, `packages/ui/src/components/GroundingPrompt.tsx` — component shape/export pattern, pre-translated-props pattern, and callback-boundary pattern to mirror
- `packages/ui/src/tokens/theme.ts` — `tapTarget.inTheMoment` (56px), `color.accent.courage`, `color.surface.primary`

### Review Findings

- [x] [Review][Patch] `Linking.openURL` `.catch()` doesn't cover the synchronous-throw case epics.md actually requires — AC #3 (line 23) broadens epics.md's canonical wording ("if `Linking.openURL` throws, the error is caught") to "rejects/throws," but Task 2's implementation note (line 40) only attaches `.catch()` to the call. A `.catch()` only handles promise rejection, not a synchronous throw from the call expression itself — an implementer following Task 2 literally will not satisfy the synchronous-throw half of AC #3/epics.md. Wrap the `Linking.openURL(...)` call itself in `try/catch` in addition to (or instead of) the `.catch()`, or clarify the wording so the implementation note matches what AC #3 actually demands. [7-4-helpline-signpost.md:23,40]
- [x] [Review][Patch] Task 4 claims "AC: #1–#8" coverage but never tests AC #4 (offline/no-network-call) — every other AC maps to an explicit assertion in Task 4's coverage list; AC #4 (NFR-OFFLINE-03, "no network call of any kind is made to render this screen") has none. Since this screen imports no networking API at all (confirmed: no `fetch`/`axios`/PowerSync usage anywhere in scope), add a closing note to Task 4 stating AC #4 is satisfied by inspection (no networking import exists in the component) rather than a runtime assertion, so the coverage claim is honest and a future reviewer doesn't go looking for a missing test. [7-4-helpline-signpost.md:48]
- [x] [Review][Defer] ScrollView vs. plain `View` judgment call has no AC or test backing either choice — deferred, the correct threshold is a UX call, not a code-correctness issue; no single unambiguous fix. [7-4-helpline-signpost.md:42]
- [x] [Review][Defer] `accessibilityLabel` convention diverges from `debrief.tsx`'s existing "call a helpline" pattern, left unreconciled — deferred, pre-existing inconsistency in `debrief.tsx` that this story correctly declines to touch (out of scope); two different a11y label conventions for the same action now coexist in the app. [7-4-helpline-signpost.md:22, apps/mobile/app/session/debrief.tsx:159,166,173]

### Code Review Findings (2026-06-20, post-implementation)

- [x] [Review][Patch] `HelplineCard`'s `accessibilityLabel` hardcoded the English word "Call" regardless of locale, even though a pre-translated `callLabel` prop already exists for the visible button text. Resolved 2026-06-20: AC #8 amended and `accessibilityLabel` now built from `callLabel` (`\`${callLabel} ${name}: ${displayNumber}\``) instead of a hardcoded literal; `helplines.test.tsx`'s `getByLabelText` assertions updated to match. [`packages/ui/src/components/HelplineCard.tsx`, AC #8]
- [x] [Review][Defer] No double-tap guard on the Call button — `Linking.openURL` can fire multiple times for a rapid double-tap (a plausible interaction for a user under crisis-level distress); no `disabled`/debounce guard anywhere in `HelplineCard`'s `TouchableOpacity` or `helplines.tsx`'s `handleCall`. Deferred, pre-existing pattern: `debrief.tsx`'s existing `Linking.openURL('tel:...')` calls have the same gap, and no AC requires a guard here. [`packages/ui/src/components/HelplineCard.tsx`, `apps/mobile/app/calm-me/helplines.tsx` `handleCall`]
- [x] [Review][Defer] AC #3's "no error surface shown to the user" leaves a crisis-screen user with zero on-screen recourse if `Linking.openURL` fails (e.g. no telephony on a tablet/simulator) — only a `console.error` is logged. Deferred: this is explicit, hard-required spec behavior (AC #3), not an implementation defect; addressing it would require an AC change (e.g. a fallback "copy number" affordance), a product decision out of scope for this patch round. [AC #3, `apps/mobile/app/calm-me/helplines.tsx` `handleCall`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation went green on first run for Tasks 1–3. Task 4's empty-state test (AC #2) needed two iterations: an initial `jest.isolateModules` + `jest.doMock` approach crashed with "Cannot read properties of null (reading 'useReducer')" — `isolateModules` creates a separate module registry, which pulled in a second `react`/`react-test-renderer` instance and broke hooks. Replaced with a mutable `mockHelplinesOverride` variable plus a true `Object.defineProperty`-based getter on the `@exposure-buddy/core` mock (object-spread merges getters into plain snapshotted values via the `_objectSpread` Babel helper, which would have frozen the override at first-require time — `defineProperty` avoids that).

### Completion Notes List

- Task 1: `HelplineCard.tsx` created per spec — `React.forwardRef`, `StyleSheet.create()`, no `Linking` import (the screen owns the side effect via `onCallPress`), `accessibilityLabel="Call ${name}: ${displayNumber}"` (AC #8) and `accessibilityRole="button"`, `minHeight: tapTarget.inTheMoment` on the Call button (AC #7), `color.accent.courage` accent (continuing the `accent.grounding` substitution). Exported from `packages/ui/src/index.ts`. Confirmed `packages/ui/.eslintrc.js` has no `i18next/no-literal-string` rule, so the literal `"Call "` prefix in the accessibility label is not a lint violation.
- Task 2: `helplines.tsx` placeholder body replaced with a thin wrapper. `handleCall` wraps `Linking.openURL('tel:' + number)` in both a `try/catch` (synchronous-throw path) and a `.catch()` on the returned promise (rejection path), each logging via `console.error('[HelplinesScreen] call failed:', err)` per AC #3 and the Review Findings patch. `Stack.Screen` options and the Back button are untouched. Container uses `color.surface.primary`/`width: '100%'`; helpline list wrapped in a `ScrollView` (5 cards judged enough to risk overflow on small screens).
- Task 3: `helplines` namespace added to `en.json` in full (`intro`/`call`/`unavailable`, canonical AC copy verbatim) and to `hi.json` as a partial translation (`intro`/`call`; `unavailable` omitted, relies on `fallbackLng: 'en'`), matching the Story 7.2/7.3 precedent of partial Hindi coverage.
- Task 4: `helplines.test.tsx` — 7 tests, all green. AC #1 (intro + all 5 entries' name/displayNumber/Call button), AC #3 (tap dials `tel:` + correct number; a rejected `Linking.openURL` is caught and logged via `console.error` with the screen unchanged; a synchronous throw from `Linking.openURL` is also caught and logged with no crash), Back button → `router.back()`, AC #7/#8 (56px `minHeight` + exact `accessibilityLabel` format on all 5 cards), AC #2 (empty-state fallback, via the `mockHelplinesOverride` getter-based `@exposure-buddy/core` mock described above). AC #4 (offline/no-network-call) is satisfied by inspection per the story's own Task 4 note — confirmed no `fetch`/`axios`/PowerSync import exists anywhere in `HelplineCard.tsx` or `helplines.tsx`.
- Full validation: `pnpm turbo typecheck`, `pnpm turbo lint`, `pnpm turbo test` all green across all 6 packages — 272 mobile tests + 49 core + 27 supabase + 23 sync passed, 0 regressions. Two lint fixups during validation: an `eslint-disable-next-line i18next/no-literal-string` needed on the `'tel:' + number` literal in `helplines.tsx` (mirroring `debrief.tsx`'s precedent), and two `no-extra-semi` violations in the test file from a leading-semicolon ASI-guard pattern — replaced with a plain `const openURL = Linking.openURL as jest.Mock` assignment instead. No new dependencies added (`Linking` is built into `react-native`).

### File List

**New:**
- `packages/ui/src/components/HelplineCard.tsx`
- `apps/mobile/app/calm-me/helplines.test.tsx`

**Modified:**
- `apps/mobile/app/calm-me/helplines.tsx`
- `packages/ui/src/index.ts`
- `apps/mobile/src/i18n/locales/en.json`
- `apps/mobile/src/i18n/locales/hi.json`

## Change Log

- 2026-06-20: Story 7.4 implemented — all 8 ACs, all 4 tasks complete. `pnpm turbo lint`/`typecheck`/`test` pass with zero regressions (272 mobile tests). Status: ready-for-dev → review.
- 2026-06-20: Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) — 0 AC violations, 1 patch applied (AC #8 `accessibilityLabel` amended to use the translated `callLabel` prop instead of a hardcoded "Call" literal), 2 deferred (no double-tap guard on Call button; AC #3's "no error surface" leaves no on-screen recourse on call failure — both pre-existing patterns, not regressions). Status: review → done.
