# Story 7.3: 5-4-3-2-1 Sensory Grounding Exercise

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who has opened the Calm Me support screen,
I want a step-through sensory awareness exercise to anchor me in the present moment,
so that I can interrupt an anxiety spiral without needing to think about what to do next (FR-CALM-03, UX-DR-19).

## Acceptance Criteria

1. **Step 1 of 5.** Tapping the 5-4-3-2-1 target on the support screen (already wired — see Dev Notes "Already wired from the technique picker") loads the exercise screen; step 1 shows `t('grounding541.see')` ("Notice 5 things you can see around you"); a step counter shows "1 / 5"; a single `t('grounding541.gotIt')` ("Got it") CTA is visible. Pure tap-through — no text input, no validation logic; the user advances solely by tapping the CTA.
2. **Steps 2–4 advance on "Got it".** Tapping "Got it" advances one step at a time, in order: step 1 → step 2 shows `t('grounding541.hear')` ("Notice 4 sounds you can hear"); step 2 → step 3 shows `t('grounding541.touch')` ("Notice 3 things you can touch or feel"); step 3 → step 4 shows `t('grounding541.smell')` ("Notice 2 things you can smell"); step 4 → step 5 shows `t('grounding541.taste')` ("Notice 1 thing you can taste" — see AC #3 for step 5's distinct CTA). Step counter updates on each advance. (Resolved 2026-06-19 code review: previous wording only named 3 of the 4 "Got it" transitions, leaving the step 4 → 5 destination to be inferred from AC #3.)
3. **Step 5 — distinct CTA.** Step 5 shows `t('grounding541.taste')` ("Notice 1 thing you can taste"); counter shows "5 / 5"; CTA reads `t('grounding541.doneFinal')` ("I'm done") — distinct from "Got it" on steps 1–4, so completion intent is unambiguous.
4. **Completion view.** Tapping "I'm done" on step 5 renders: `t('grounding541.complete')` ("Well done. You just brought yourself back to the present."); two CTAs — `t('grounding541.done')` ("Done") returns to the Calm Me support screen; `t('grounding541.again')` ("Go again") resets to step 1, counter back to "1 / 5". "Go again" is a pure internal reset of the component's own step state — it does not navigate or notify the parent screen (see Dev Notes "GroundingPrompt owns its own step state").
5. **Screen-level dismiss.** Tapping the back/dismiss affordance at any step before completion returns the user to the support screen; no error or warning shown. This is the existing top-left Back button already on the placeholder shell (see Dev Notes "Reuse the existing placeholder shell") — distinct from AC #9's in-component forward-only step navigation; do not conflate the two.
6. **i18n.** Every visible string on the exercise screen uses `t()`; no raw string literals in component JSX; CI `i18next/no-literal-string` lint passes.
7. **Accessibility — live region per step, and on completion.** *(story-author addition, sourced from `responsive-design-accessibility.md`'s Accessibility Testing Gate — `GroundingPrompt` is named explicitly as one of the 5 hard-block launch-gate flows, and from `component-strategy.md`'s `GroundingPrompt` spec — both omitted from epics.md's literal ACs.)* On mount and on every step change, call `AccessibilityInfo.announceForAccessibility()` announcing the step counter before the prompt text, in the form `"Step {n} of 5. {promptText}"` (e.g. "Step 1 of 5. Notice 5 things you can see around you.") — this resolves the two source docs' partial, non-conflicting ordering claims into one literal format (see Dev Notes "Live-region ordering — synthesizing two source docs"). On entering the completion view (AC #4), also call `AccessibilityInfo.announceForAccessibility()` with `completeMessage` — the completion view is part of the same hard-block accessibility flow as the 5 steps and must be announced too (added 2026-06-19 code review: the original wording only covered steps 1–5, leaving the completion view's announcement unspecified). Tap-to-advance must remain screen-reader operable (standard `accessibilityRole="button"` + `accessibilityLabel` on the CTA).
8. **Reduced motion — no decorative animation.** *(story-author addition, sourced from `component-strategy.md`: "Reduced motion mandatory — no decorative animation.")* The step-to-step content transition (see AC #10) collapses to instant (0ms, no cross-fade) when `reduced: true`; the step content and live-region announcement (AC #7) are otherwise unaffected — reduced motion only removes the decorative transition, not the per-step announcement.
9. **Forward-only — no previous-step navigation.** *(story-author addition, sourced from `component-strategy.md`: "Back-navigation: deliberately omitted — therapeutic decision (forward-only grounding), documented to prevent future regression.")* There is no UI affordance to return to an earlier step once advanced; the only ways to leave a step are forward (the "Got it"/"I'm done" CTA) or out entirely (AC #5's screen-level dismiss). Do not add a "previous step" control.
10. **Step transition animation — `groundingTokens.motion`.** *(story-author addition, sourced from `component-strategy.md`: "Mode register: `grounding` (motion.grounding 400ms ease-in-out).")* When `reduced: false`, the step content (prompt text) cross-fades using `groundingTokens.motion` (400ms ease-in-out) on each step change, including the "Go again" reset (completion view → step 1) — the reset is treated as just another step transition for animation purposes, not a special-cased instant snap (resolved 2026-06-19 code review). When `reduced: true`, per AC #8, no transition.
11. **Touch target — 56px, not 44pt.** *(story-author addition — resolves a literal conflict in `component-strategy.md`; see Dev Notes "Touch target conflict resolved: 56px wins.")* The "Got it"/"I'm done" CTA uses a minimum height of `groundingTokens.tapTarget` (56px), consistent with the project-wide in-the-moment touch-target rule and the `BreathingCoach` CTA precedent from Story 7.2 — not the narrower 44×44pt figure in `component-strategy.md`'s `GroundingPrompt` anatomy note, which conflicts with the global rule and is superseded here.

## Tasks / Subtasks

- [x] Task 1: Core config file (AC: #1–#3)
  - [x] Create `packages/core/src/config/grounding-exercise.ts` (kebab-case — epics.md does not hardcode a literal filename for this story, unlike `breathingCoach.ts`/`calmMeConfig.ts` in Stories 7.1/7.2; see Dev Notes "File naming — kebab-case this time"). Export an ordered array of the 5 steps (i18n key + step number) and a total-step constant, e.g.:
    ```typescript
    export const GROUNDING_STEPS = [
      { step: 1, promptKey: 'grounding541.see' },
      { step: 2, promptKey: 'grounding541.hear' },
      { step: 3, promptKey: 'grounding541.touch' },
      { step: 4, promptKey: 'grounding541.smell' },
      { step: 5, promptKey: 'grounding541.taste' },
    ] as const
    export const GROUNDING_TOTAL_STEPS = GROUNDING_STEPS.length
    ```
    No magic numbers/strings duplicated inline in the component — mirrors the zero-magic-number pattern every prior Calm Me config (`calmMeConfig.ts`, `helplines.ts`, `breathingCoach.ts`) establishes. Zero RN/Expo/`@supabase/*` imports (ARC-011).
  - [x] Export from `packages/core/src/index.ts` under a new `// 5-4-3-2-1 grounding exercise (Story 7.3)` comment, following the existing `// Calm Me support screen (Story 7.1)` / `// Breathing coach (Story 7.2)` comment convention.
  - [x] No dedicated test file for this config — consistent with `calmMeConfig.ts`/`helplines.ts` (data-only files, no co-located test in this codebase); `tsc --noEmit` + the ARC-011 CI boundary check are sufficient.
- [x] Task 2: `GroundingPrompt` component (AC: #1–#4, #6–#11)
  - [x] Create `packages/ui/src/components/GroundingPrompt.tsx` — presentational, mirrors `CalmMeButton.tsx`/`BreathingCoach.tsx`'s shape (`React.forwardRef`, `StyleSheet.create()`, no NativeWind, named export + separately-exported props type, added to `packages/ui/src/index.ts`'s barrel). Unlike `BreathingCoach`, this component **owns its own step state internally** (`useState` for current step index 0–4 and a `complete` boolean) — see Dev Notes "GroundingPrompt owns its own step state."
  - [x] Props: ordered, pre-translated step content (`steps: { promptText: string }[]`, 5 items — see Dev Notes "Pre-translated props, not `useTranslation()` inside `packages/ui`"), `gotItLabel`, `doneFinalLabel`, `completeMessage`, `doneLabel`, `againLabel` (all pre-translated strings), `reduced: boolean`, `onComplete: () => void` (fires only on the completion view's "Done" tap — not on "Go again", which is a pure internal reset, and not on intermediate step advances).
  - [x] Render: step counter (`"{n} / {total}"`, exact format with spaces around the slash per epics.md), prompt text, single CTA — `gotItLabel` on steps 1–4, `doneFinalLabel` on step 5 (AC #1–#3). On step 5's CTA tap, transition internal state to `complete` instead of advancing past the array bounds. The CTA is disabled (or the tap handler debounced) while a step transition is in flight, so rapid double-tapping cannot advance two steps at once (added 2026-06-19 code review).
  - [x] Completion view (AC #4): `completeMessage`, then two CTAs — "Done" calls `onComplete()`; "Go again" resets internal step index to 0 and `complete` to `false`, no callback. Same double-tap guard as above applies to "Done" so `onComplete()`/`router.back()` cannot fire twice (added 2026-06-19 code review).
  - [x] Live region (AC #7): `AccessibilityInfo.announceForAccessibility()` in a `useEffect` keyed on the current step index, firing on mount and every step change (mirrors `BreathingCoach`'s `useEffect(() => { AccessibilityInfo.announceForAccessibility(...) }, [phaseIndex])` pattern) — format `"Step {n} of {total}. {promptText}"`. A second announcement fires with `completeMessage` when `complete` becomes `true` (AC #7, added 2026-06-19 code review).
  - [x] Step transition animation (AC #8, #10): cross-fade the prompt text's opacity via `react-native-reanimated` (`useSharedValue` + `withTiming`) keyed on step index (including the "Go again" reset — AC #10), duration from `groundingTokens.motion.duration` / easing from `groundingTokens.motion.easing` when `reduced === false`; when `reduced === true`, set opacity directly with no `withTiming` call (instant, no decorative animation) — `react-native-reanimated` is already a `packages/ui` peerDependency since Story 7.2, no new dependency needed. Cancel any in-flight animation on unmount (e.g. via `cancelAnimation` in a cleanup `useEffect`) so a screen-level Back tap mid-transition (AC #5) cannot trigger a state update after unmount (added 2026-06-19 code review).
  - [x] Tokens (AC #11): import `groundingTokens` from `../tokens/theme` (this is its first real consumer in the codebase — see Dev Notes "groundingTokens — first real consumer") for `motion` and `tapTarget`; CTA `minHeight: groundingTokens.tapTarget` (56px) with `hitSlop`, matching the `BreathingCoach` "I'm ready" CTA precedent. Use `color.accent.courage` for CTA/accent styling, **not** `color.accent.grounding` — see Dev Notes "`color.accent.grounding` still unaudited — continue the `courage` substitution."
  - [x] No "previous step" control anywhere in the component (AC #9).
  - [x] Export `GroundingPrompt` + its props type from `packages/ui/src/index.ts`.
  - [x] No co-located `GroundingPrompt.test.tsx` — `packages/ui`'s Vitest config has no RN renderer (the same documented wall `CalmMeButton.tsx`/`BreathingCoach.tsx` hit); `tsc --noEmit` typechecks the primitive, behavior is covered via the screen-level test in Task 4.
- [x] Task 3: Screen wiring (AC: #5, #6)
  - [x] Replace the placeholder body in `apps/mobile/app/calm-me/grounding.tsx` with a thin wrapper: call `useAnimation()` for `reduced`, build the translated `steps` array from `GROUNDING_STEPS` (mapping each `promptKey` through `t()`), translate the CTA/completion labels, render `<GroundingPrompt ... onComplete={() => router.back()} />` — **do not** change the route's nav wiring, the `Stack.Screen` options, or the existing top-left Back button's position/behavior (see Dev Notes "Reuse the existing placeholder shell").
  - [x] Use `color.surface.primary` (from `@exposure-buddy/ui`) and `width: '100%'` on the screen container, matching `breathing.tsx`'s post-fix pattern (its original raw `'#ffffff'` background was a bug fixed post-merge — see Story 7.2 Change Log 2026-06-19 "vertical grey strip" entry) — do not reintroduce the raw-hex/no-width-100% pattern still present in today's placeholder.
- [x] Task 4: i18n keys (AC: #1–#4, #6)
  - [x] Add new `grounding541` namespace to `en.json`: `see`, `hear`, `touch`, `smell`, `taste`, `gotIt`, `doneFinal`, `complete`, `done`, `again` — exact canonical copy quoted in the ACs above.
  - [x] Add the same keys to `hi.json` (full or partial translation — `fallbackLng: 'en'` covers any gaps, matching the Story 7.2 precedent).
  - [x] Reuse the existing `calmMe.technique.grounding` label ("5-4-3-2-1") for the technique-picker entry — already present in `en.json`/`hi.json` and already wired in `calm-me/index.tsx`; do not redefine it.
- [x] Task 5: Tests
  - [x] `apps/mobile/app/calm-me/grounding.test.tsx` — **no existing test file for the grounding route today (verified — `index.test.tsx` and `breathing.test.tsx` exist in this directory, but no `grounding.test.tsx`); this is a new file, not an extension.** Assert against translated English string content (consistent with `breathing.test.tsx`'s convention), not i18n key names or ad-hoc testIDs. Cover: step 1 renders with "1 / 5" and the "see" prompt and "Got it" CTA; tapping "Got it" four times advances through hear → touch → smell → taste in order, counter updating each time; step 5 shows "5 / 5" and "I'm done" (not "Got it"); tapping "I'm done" renders the completion message and both "Done"/"Go again" CTAs; "Done" triggers `router.back()`; "Go again" resets to step 1 ("1 / 5", "see" prompt) without navigating; the top-left Back button at any pre-completion step calls `router.back()` with no error, including while a step transition is in flight (no crash/warning on unmount mid-animation — added 2026-06-19 code review); `AccessibilityInfo.announceForAccessibility` is called on mount and on each step advance with the `"Step {n} of 5. ..."` format (AC #7), and again with the completion message on reaching the completion view (added 2026-06-19 code review); with `reduced: true` (mock `useAnimation`, per `useFocusOnMount.test.tsx`'s mocking pattern), stepping still functions correctly (no animation-duration assertion required — see Dev Notes "Testing the reduced-motion transition").
  - [x] `pnpm turbo lint` passes — 0 `i18next/no-literal-string` violations.
  - [x] `pnpm turbo typecheck` and `pnpm turbo test` — zero regressions across all 6 packages.

---

### Review Findings

- [x] [Review][Patch] Go-again reset animation was unspecified — resolved: the "Go again" reset (completion view → step 1) uses the same `groundingTokens.motion` cross-fade as a normal forward step advance (no special-cased instant snap). [AC #4, AC #10, Task 2] — applied (AC #10 and Task 2's animation bullet now state this explicitly)
- [x] [Review][Patch] AC #2's "Got it" transition enumeration was ambiguous — it said "Tapping 'Got it' on steps 1–4 advances in order" but only listed 3 destinations (hear, touch, smell); the 4th transition (step 4 → step 5/taste) was only inferable from AC #3. [AC #2] — applied (AC #2 reworded to name all 4 source→destination transitions explicitly)
- [x] [Review][Patch] Live-region accessibility coverage gap — AC #7 only required the per-step announcement format for steps 1–5; nothing required the completion view's message (`completeMessage`) to be announced via `AccessibilityInfo.announceForAccessibility()`. [AC #7, Task 2 "Live region", Task 5] — applied (AC #7, Task 2's Live region bullet, and Task 5's test bullet now require the completion-view announcement)
- [x] [Review][Patch] No double-tap guard specified on the CTA — rapid double-tapping "Got it"/"I'm done" could advance two steps at once, and double-tapping the completion view's "Done" CTA could fire `onComplete()`/`router.back()` twice. [Task 2, Task 3] — applied (Task 2's render and completion-view bullets now require disabling/debouncing the CTA during a transition)
- [x] [Review][Patch] No cleanup specified for the Reanimated cross-fade animation on unmount — if the screen-level Back button (AC #5) is tapped while a `withTiming` cross-fade is in flight, nothing guarded against a state update firing after unmount. [Task 2, Task 5] — applied (Task 2's animation bullet now requires `cancelAnimation` cleanup on unmount; Task 5 adds a corresponding test case)
- [x] [Review][Patch] Task 5's claim "no existing test file for this route today (verified — only `index.test.tsx` exists in this directory)" was inaccurate — `breathing.test.tsx` also exists in `apps/mobile/app/calm-me/`. [Task 5] — applied (reworded to scope the claim correctly)
- [x] [Review][Defer] No AC/task addresses app-lifecycle interruption (state lost if the app backgrounds or is killed mid-exercise) [AC #1–#4] — deferred, matches the same unstated gap in `BreathingCoach` (Story 7.2), not unique to this story
- [x] [Review][Defer] CTA/prompt text overflow for longer translations (Hindi) against the fixed 56px touch target, and unbounded prompt text length on small screens, have no general handling guidance anywhere in the codebase [AC #11, Task 2] — deferred, pre-existing gap across all Calm Me components (`BreathingCoach`, `CalmMeButton`), not introduced uniquely by this story
- [x] [Review][Defer] `sprint-status.yaml`'s per-story freeform `last_updated` comment keeps accumulating with no structure or cleanup mechanism [`_bmad-output/implementation-artifacts/sprint-status.yaml`] — deferred, pre-existing pattern across the whole file, not introduced by this change

### Code Review Findings (2026-06-19, post-implementation)

_Code review of the implementation diff (Blind Hunter + Edge Case Hunter + Acceptance Auditor), run against the merged commit._

- [x] [Review][Patch] "Done" double-tap guard (`transitioningRef`) never resets after firing — `handleDone` sets it `true` but neither `stepIndex` nor `complete` change as a result, so the only reset effect (keyed on `[stepIndex, complete]`) never re-runs; the completion "Done" button is permanently inert after one tap unless `onComplete` happens to unmount the component. [`packages/ui/src/components/GroundingPrompt.tsx` `handleDone`] — applied (added a `transitionTick` counter that increments on every handler call and drives the unlock effect, independent of whether `stepIndex`/`complete` change)
- [x] [Review][Patch] Live-region and animation `useEffect`s read `steps`, `completeMessage`, and `total` (derived from `steps`) but omit them from their dependency arrays (`[stepIndex, complete]` / `[stepIndex, complete, reduced]`) — a stale-closure risk, compounded by `grounding.tsx` rebuilding the `steps` array with a new identity on every render instead of memoizing it. [`packages/ui/src/components/GroundingPrompt.tsx` live-region & animation effects; `apps/mobile/app/calm-me/grounding.tsx` `steps` construction] — applied (live-region effect deps now include `steps`, `total`, `completeMessage`; `grounding.tsx` memoizes `steps` via `useMemo(..., [t])` so the effect doesn't re-run every parent render)
- [x] [Review][Patch] No test exercises the double-tap guard, despite it being named three times in the story as an explicit "(added 2026-06-19 code review)" requirement (Task 2's render bullet, Task 2's completion-view bullet, Task 5's test bullet) — the bug above (Done's guard never unlocking) would have been caught by such a test. [`apps/mobile/app/calm-me/grounding.test.tsx`] — applied (3 new tests: synchronous double-tap on "Got it" advances once, synchronous double-tap on completion "Done" fires `onComplete`/`router.back()` once, and a regression test proving the guard releases after a transition so a later separate "Done" press still navigates)
- [x] [Review][Defer] `hi.json` ships only 6 of the 10 `grounding541` keys — `touch`, `smell`, `taste`, and notably `complete` (the exercise's payoff line, "Well done. You just brought yourself back to the present.") fall back to English. Spec (Task 4) explicitly permits partial translation via `fallbackLng: 'en'`, matching the Story 7.2 `breathing` namespace precedent — pre-existing pattern across the app's i18n, not unique to this story. [`apps/mobile/src/i18n/locales/hi.json`] — deferred, pre-existing pattern
- [x] [Review][Defer] `GROUNDING_EASING` is hardcoded to `Easing.inOut(Easing.ease)` rather than reading `groundingTokens.motion.easing` — a documented workaround (Completion Notes) for a TS typing conflict between the token's literal `'easeInOut'` type and the general `motion` union. If the design-system token's easing value changes, this component won't follow it; fixing properly requires a token-typing change, out of scope for this patch round. [`packages/ui/src/components/GroundingPrompt.tsx`] — deferred, requires token-typing change
- [x] [Review][Defer] On initial mount (not a "step change"), the cross-fade effect still animates opacity 0→1 for step 1's content — AC #10 only explicitly requires the cross-fade "on each step change"; whether mount itself should count is ambiguous. Low severity (a brief entrance fade, not a functional defect), and is consistent with the story's own precedent of not special-casing transitions (the "Go again" reset is deliberately treated as "just another transition," per AC #10). [`packages/ui/src/components/GroundingPrompt.tsx` cross-fade effect] — deferred, ambiguous/low severity

## Dev Notes

### Already wired from the technique picker

`apps/mobile/app/calm-me/index.tsx` already routes here: `onPress={() => router.push('/calm-me/grounding')}` on the `calmMe.technique.grounding` card (built in Story 7.1). Do not touch `calm-me/index.tsx`'s technique-picker wiring.

### Two grounding routes — don't confuse them

There are **two separate, unrelated "grounding" routes** in this codebase:
- `apps/mobile/app/calm-me/grounding.tsx` — **this story.** The Calm Me technique-picker target (optional, reachable from any screen via the Calm Me FAB).
- `apps/mobile/app/session/grounding.tsx` — **Story 5.2, already shipped, complete.** The *mandatory* Stop-Exposure grounding screen mid-session. It has its own test file (`session/grounding.test.tsx`) and its own abandonment/enqueue logic unrelated to this story. Its header comment states explicitly: "This screen ships as COMPLETE at MVP... Epic 7 Story 7.5 adds the full technique picker as a SEPARATE enhancement; this screen is NOT replaced — it is SUPPLEMENTED." **Do not modify `session/grounding.tsx` in this story** — that enhancement is Story 7.5's scope, not 7.3's.

There is also an unrelated `TechniqueType` (`'somatic' | 'breathing' | 'cognitive'`) in `packages/core/src/types/technique.ts`, consumed by `apps/mobile/app/session/technique.tsx` — a pre-exposure technique-selection screen from Story 6.1, conceptually unrelated to the Calm Me "breathing / grounding / helplines" technique picker. Don't conflate the two "technique" concepts or assume `TechniqueType` needs a `'grounding'` member added.

### Reuse the existing placeholder shell — don't rebuild navigation

Story 7.1 already created `apps/mobile/app/calm-me/grounding.tsx` as a placeholder route, reachable from the Calm Me technique picker with no params. Its current body (verbatim):
```typescript
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'

// Placeholder — Story 7.3 replaces this body with the full 5-4-3-2-1 sensory grounding exercise.
// Navigation wiring (Back button) is owned by this story and must not change.
export default function GroundingPlaceholderScreen() {
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
Note the `{/* eslint-disable-next-line i18next/no-literal-string */}` comment above the back-icon `Text` — replicate it for any new literal glyph, or `pnpm turbo lint` fails Task 5's lint gate.

This story replaces only the body, **keeping** the `Stack.Screen options={{ headerShown: false }}` wrapper and the top-left Back button (`router.back()`, `accessibilityLabel={t('calmMe.back')}`) exactly as-is — that Back button already satisfies AC #5's dismiss requirement verbatim. This screen is **not** a mandatory lockout screen (unlike `session/grounding.tsx`); leave default Expo Router back-navigation behavior in place (iOS swipe-back, Android hardware back, the explicit Back button all simply pop the route).

The container/styles do need one update from the placeholder above: replace the raw `backgroundColor: '#ffffff'` with `color.surface.primary` and add `width: '100%'` — see Task 3.

### Story 7.5 will later reuse this technique by navigating, not importing

Story 7.5's grounding screen (the mandatory `session/grounding.tsx` enhancement) will add a technique picker whose 5-4-3-2-1 entry "navigates to Story 7.3 exercise" (epics.md's literal wording) — i.e. it routes to `/calm-me/grounding`, the same way Story 7.1's Calm Me picker does. Its AC only requires navigation reuse ("this screen reuses the same technique components built in Stories 7.2–7.4 — it is not a duplicate implementation"), not a shared-component import — the same pattern Story 7.2 established for `BreathingCoach`. Extracting `GroundingPrompt` into `packages/ui` (Task 2) is still the right call for consistency with that established pattern, not because 7.5 strictly requires the import.

### GroundingPrompt owns its own step state

Unlike `BreathingCoach` (which is fully controlled — all phase/timer state lives in `apps/mobile`'s `useBreathingPhase` hook because of cross-cutting timer/race-condition concerns), `GroundingPrompt`'s step progression is a simple bounded counter (0–4 plus a `complete` flag) with no timers, no async, no race conditions. `component-strategy.md`'s `GroundingPrompt` spec describes "States: `step-1` through `step-5` · complete" and "Interaction: Tap to advance" as properties of the component itself, not of a parent-owned hook. Per CLAUDE.md's anti-overengineering guidance, **do not** create a `packages/core` pure-reducer module or an `apps/mobile` hook for this — that pattern was warranted for `BreathingCoach`'s genuinely concurrent timer logic, not for a simple forward-only tap counter. Keep the state local to `GroundingPrompt.tsx` via `useState`.

The only callback exposed to the parent screen is `onComplete` — fired exclusively by the completion view's "Done" tap. "Go again" is a pure internal reset (no callback); intermediate step advances ("Got it") are also pure internal state changes (no callback).

### Pre-translated props, not `useTranslation()` inside `packages/ui`

Per the established Story 7.2 precedent (`BreathingCoach`'s Completion Notes): `react-i18next` is not resolvable from `packages/ui` (not a dependency there; no other `packages/ui` component imports it). `GroundingPrompt` follows the same pattern as `CalmMeButton`/`BreathingCoach` — it accepts already-translated strings as props (`steps[].promptText`, `gotItLabel`, `doneFinalLabel`, `completeMessage`, `doneLabel`, `againLabel`), and the `apps/mobile/app/calm-me/grounding.tsx` wrapper screen calls `t()` and passes the results down, the same way it passes `reduced`.

### Touch target conflict resolved: 56px wins

`component-strategy.md`'s `GroundingPrompt` Accessibility line states "Tap target minimum 44×44pt" — but this conflicts with two other sources: `core-user-experience.md` ("Minimum tap target 56×56px for all in-the-moment interactive elements") and `responsive-design-accessibility.md`'s Touch Targets section ("56×56px: all in-the-moment interactive elements"). `GroundingPrompt` is explicitly an in-the-moment Calm Me component (same register as `BreathingCoach`, which used `tapTarget.inTheMoment` = 56px for its CTA in Story 7.2). Treat the narrower "44×44pt" line in `component-strategy.md`'s `GroundingPrompt` entry as superseded by the project-wide in-the-moment rule — use `groundingTokens.tapTarget` (56px minimum), consistent with `BreathingCoach`'s precedent. This mirrors the kind of cross-doc conflict Story 7.2's code review resolved explicitly rather than silently picking one side.

### Live-region ordering — synthesizing two source docs

Two source docs each give a *partial* ordering requirement, neither of which is a full literal spec on its own:
- `component-strategy.md`'s `GroundingPrompt` Accessibility line: "Each step announced via `aria-live`. Sense label read before prompt."
- `responsive-design-accessibility.md`'s Accessibility Testing Gate, flow #2 (one of 5 hard-block launch-gate flows): "`GroundingPrompt`: each step announced correctly; 'step X of 5' read before prompt text; tap-to-advance confirmed by screen reader."

epics.md's canonical per-step copy (AC #1–#3) is a single sentence per step that already names the sense (e.g. "Notice 5 things you can see around you") — there is no separate short "sense label" string anywhere in epics.md's literal ACs, and epics.md's copy is the established canonical source of truth for this story (consistent with how Stories 7.1/7.2 treated epics.md copy as authoritative, not to be second-guessed by adjacent design docs). Rather than inventing a new, undocumented short-label string not present in epics.md, this story treats the "sense" as already embodied in the single prompt sentence and resolves the synthesis as: announce the step counter, then the prompt sentence — `"Step {n} of {total}. {promptText}"` (AC #7). This satisfies the literal, testable hard-block criterion ("'step X of 5' read before prompt text") from the Accessibility Testing Gate without contradicting epics.md's copy.

### `groundingTokens` — first real consumer

`packages/ui/src/tokens/theme.ts` exports `groundingTokens = { motion: motion.grounding, tapTarget: tapTarget.inTheMoment }` (already barrel-exported from `packages/ui/src/index.ts`), with a comment noting it's "isolated so the ESLint rule can target `groundingTokens` specifically" (the `no-grounding-token-in-context` rule in `packages/ui/.eslintrc.js`, which blocks importing it inside any `*Context.tsx`/`*Provider.tsx` file — not relevant here since `GroundingPrompt.tsx` is neither). Verified by grep: nothing in the codebase imports `groundingTokens` yet — this story is its first real consumer. Use `groundingTokens.motion` and `groundingTokens.tapTarget` rather than reaching into `motion.grounding`/`tapTarget.inTheMoment` directly, since this bundle is the intended single import for grounding-register components.

### `color.accent.grounding` still unaudited — continue the `courage` substitution

`responsive-design-accessibility.md` still states: "Known risk: `accent.grounding: #8B6F47` on white — verify or replace before sprint 1... No component enters sprint 1 without written sign-off on this audit." This audit has not happened (confirmed: still an open item in `deferred-work.md` — "`color.accent.grounding` needs a formal designer+QA contrast audit... Get the audit done, or formally retire the token"). Story 7.2 (`BreathingCoach`) substituted `color.accent.courage` instead of the unaudited `accent.grounding`, explicitly **as a temporary substitution pending audit, not a permanent choice** (per Winston, party-mode review: "routing around the sign-off gate by default risks the gate never being honored"). This story — the actual grounding/somatic component the token was named for — is the most natural place that gap would get revisited, but the audit still has not happened by the time this story is written. Continue the same `color.accent.courage` substitution for consistency and risk-avoidance; do not introduce a new use of `color.accent.grounding` in this story. If the audit lands before this story is implemented, revisit.

### File naming — kebab-case this time

`implementation-patterns-consistency-rules.md#Naming Patterns` specifies non-component files as kebab-case (e.g. `session-state-machine.ts`). Stories 7.1/7.2's `calmMeConfig.ts`/`helplines.ts`/`breathingCoach.ts` are camelCase only because epics.md hardcoded those literal filenames in their ACs — that exception does not apply here. epics.md's Story 7.3 section does not hardcode any config filename, so the new file follows the standard kebab-case convention: `grounding-exercise.ts` (not `groundingExercise.ts`).

### Testing the reduced-motion transition

Unlike `BreathingCoach`'s reduced-motion fallback (a visibly different static-ring + numeric-countdown UI, directly assertable in RTL), `GroundingPrompt`'s reduced-motion difference is purely the *transition timing* between otherwise-identical step content — there's no distinct steady-state UI to assert on. Don't over-specify the test here: assert that stepping still functions correctly end-to-end with `reduced: true` (no crash, correct content at each step), rather than attempting to assert internal Reanimated timing values.

### Project Structure Notes

- New files: `packages/core/src/config/grounding-exercise.ts`, `packages/ui/src/components/GroundingPrompt.tsx`, `apps/mobile/app/calm-me/grounding.test.tsx`
- Modified files: `apps/mobile/app/calm-me/grounding.tsx` (placeholder body → thin wrapper screen), `packages/core/src/index.ts` (barrel export), `packages/ui/src/index.ts` (barrel export), `apps/mobile/src/i18n/locales/en.json`/`hi.json` (new `grounding541` namespace)
- No new packages, no migrations, no Edge Functions, no new third-party dependencies (Reanimated already a `packages/ui` peerDependency since Story 7.2)
- Consistent with existing structure: data-only domain config in `packages/core/src/config/`, shared presentational components in `packages/ui/src/components/`, screens in `apps/mobile/app/`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.3, lines 1542–1573] — canonical acceptance criteria
- [Source: _bmad-output/planning-artifacts/epics.md#ARC-011] — packages/core import boundary CI gate
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Naming Patterns, #Structure Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/component-strategy.md#GroundingPrompt] — anatomy, states, mode register, interaction, accessibility, touch-target note
- [Source: _bmad-output/planning-artifacts/ux-design-specification/responsive-design-accessibility.md#Touch targets, #Accessibility Testing Gate, #Colour contrast audit] — 56px in-the-moment rule, GroundingPrompt named in the 5-flow hard-block gate, `accent.grounding` unresolved audit risk
- [Source: _bmad-output/planning-artifacts/ux-design-specification/visual-design-foundation.md] — `accent.grounding` token table entry, `groundingTokens` static-export note
- `_bmad-output/implementation-artifacts/deferred-work.md` — open `color.accent.grounding` audit item (Story 7.2 origin)
- `_bmad-output/implementation-artifacts/7-2-breathing-coach.md` — `BreathingCoach.tsx`/`breathing.tsx` patterns mirrored throughout (pre-translated props, live-region `useEffect`, reduced-motion prop-injection, `tapTarget.inTheMoment` CTA precedent, `color.surface.primary`/`width:'100%'` post-fix container pattern)
- `apps/mobile/app/calm-me/grounding.tsx` — placeholder shell to extend (current implementation quoted above)
- `apps/mobile/app/calm-me/index.tsx` — existing technique-picker wiring to `/calm-me/grounding` (Story 7.1, unchanged)
- `apps/mobile/app/session/grounding.tsx` — the unrelated, already-complete Story 5.2 mandatory grounding screen — not in scope for this story (Story 7.5 enhances it)
- `packages/ui/src/components/BreathingCoach.tsx`, `packages/ui/src/components/CalmMeButton.tsx` — component shape/export pattern and pre-translated-props pattern to mirror
- `packages/ui/src/tokens/theme.ts` — `groundingTokens` (motion + tapTarget bundle, first real consumer), `color.accent.courage`/`color.accent.grounding`
- `packages/ui/.eslintrc.js` — `no-grounding-token-in-context` rule (not triggered by this component, but explains why `groundingTokens` is a separate export)
- `apps/mobile/src/contexts/AnimationContext.tsx` — `useAnimation()`/`ReducedMotionProvider`, already mounted in `_layout.tsx`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation went green on first run for all 5 tasks; no failing-test/fix cycles required beyond the initial typecheck error described below.

### Completion Notes List

- Task 1: `packages/core/src/config/grounding-exercise.ts` created verbatim per the story's snippet; barrel-exported from `packages/core/src/index.ts` under the `// 5-4-3-2-1 grounding exercise (Story 7.3)` comment. `tsc --noEmit` green, zero RN/Expo/`@supabase/*` imports (ARC-011).
- Task 2: `GroundingPrompt.tsx` implements step/complete state via `useState`, a `useRef` double-tap guard (cleared in a `useEffect` keyed on `[stepIndex, complete]` once the content has actually changed — this also doubles as the "transition in flight" unlock), the AC #7 live-region `useEffect` (step announcement, with a `complete`-branch announcing `completeMessage` instead), and the AC #8/#10 cross-fade `useEffect` (`opacity` reset to 0 then `withTiming(1, …)` keyed on `[stepIndex, complete, reduced]`, `cancelAnimation` on cleanup; reduced motion sets `opacity.value = 1` directly with no `withTiming` call). One fixup during implementation: `groundingTokens.motion.easing` is typed as the literal `'easeInOut'` (not the general `motion` union), so an initial switch-statement easing mapper failed `tsc` with "Type '\"easeOut\"' is not comparable to type '\"easeInOut\"'" — replaced with a single `const GROUNDING_EASING = Easing.inOut(Easing.ease)`, since this component only ever consumes the grounding register.
- Task 3: `grounding.tsx` placeholder body replaced with a thin wrapper exactly as specified — `Stack.Screen` options and the Back button are untouched; only the container `backgroundColor`/`width` changed per the `breathing.tsx` post-fix pattern.
- Task 4: `grounding541` namespace added to `en.json` in full (10 keys, canonical AC copy verbatim) and to `hi.json` as a partial translation (6 of 10 keys — `touch`/`smell`/`taste`/`complete` rely on `fallbackLng: 'en'`), matching the Story 7.2 `breathing` namespace precedent of partial Hindi coverage.
- Task 5: `grounding.test.tsx` follows `breathing.test.tsx`'s actual mocking convention (`useTranslation` mocked to the identity function `t = (key) => key`) rather than the story text's literal phrasing "assert against translated English string content" — under that mock, the strings rendered and asserted on are the i18n keys themselves (e.g. `'grounding541.see'`), exactly as `breathing.test.tsx` already does for `'breathing.inhale'` etc. Flagging this explicitly since the story text and the established codebase convention it points to are in tension; followed the convention. 11 tests, all green on first run: AC #1 (step 1 content), AC #2 (4-tap advance sequence with counter), AC #3 (step 5 CTA label swap), AC #4 (completion view, "Done" → `router.back()`, "Go again" reset), AC #5 (Back button, including a mid-transition unmount with no throw), AC #7 (live-region call count/content through to the completion announcement), AC #11 (56px `minHeight` + `hitSlop` on the CTA), AC #8/#10 (reduced-motion end-to-end stepping, no animation-timing assertions per Dev Notes "Testing the reduced-motion transition").
- Full validation: `pnpm turbo typecheck`, `pnpm turbo lint`, `pnpm turbo test` all green across all 6 packages — 262 mobile tests + 49 core + 27 supabase + 23 sync passed, 0 regressions. No new dependencies added (Reanimated already a `packages/ui` peerDependency since Story 7.2).

### File List

**New:**
- `packages/core/src/config/grounding-exercise.ts`
- `packages/ui/src/components/GroundingPrompt.tsx`
- `apps/mobile/app/calm-me/grounding.test.tsx`

**Modified:**
- `apps/mobile/app/calm-me/grounding.tsx`
- `packages/core/src/index.ts`
- `packages/ui/src/index.ts`
- `apps/mobile/src/i18n/locales/en.json`
- `apps/mobile/src/i18n/locales/hi.json`

## Change Log

- 2026-06-19: Story 7.3 implemented — all 11 ACs, all 5 tasks complete. `pnpm turbo lint`/`typecheck`/`test` pass with zero regressions (262 mobile tests). Status: ready-for-dev → review.
- 2026-06-19: Code review complete — 3 patches applied (double-tap guard fix on "Done", `useEffect` dependency-array/memoization fix, 3 new double-tap regression tests), 3 items deferred, 12 dismissed. `pnpm turbo typecheck`/`lint`/`test` green (265 mobile tests). Status: review → done.
