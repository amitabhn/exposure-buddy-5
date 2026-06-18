# Story 7.2: Breathing Coach

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who has opened the Calm Me support screen,
I want a structured breathing exercise that guides me through the first two cycles then lets me breathe along passively,
so that I can calm my nervous system with minimal cognitive load (FR-CALM-02, UX-DR-18).

## Acceptance Criteria

1. **Config file.** `packages/core/src/config/breathingCoach.ts` is created, exporting:
   ```typescript
   export const BREATHING_GUIDED_CYCLES = 2
   export const BREATHING_TIMER_SECONDS = 300 // total session duration from first inhale, guided + passive
   export const BREATHING_PATTERN = { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 } as const
   // Post-MVP: technique selection (4-7-8, diaphragmatic) and user-configurable timer/cycles
   ```
   No magic numbers appear inline in the component — every duration/cycle-count value is imported from this file. Zero RN/Expo/`@supabase/*` imports (ARC-011).
2. **Independently testable phase logic.** A `useBreathingPhase` hook (or equivalent) drives phase transitions from `BREATHING_PATTERN` constants without depending on animation state. Unit test contract (literal, from epics.md): `GIVEN phase index n WHEN elapsed ticks reach BREATHING_PATTERN[n].duration THEN phase advances to n+1`. The animation is a consequence of phase state, not a test criterion — phase-advance logic must be testable with zero rendering/animation involved.
3. **Guided phase starts immediately.** Tapping the Breathing target on the Calm Me support screen (already wired — see Dev Notes) loads the breathing coach screen; the guided phase begins immediately; a session timer starts counting down from `BREATHING_TIMER_SECONDS` (300s), displayed as MM:SS; guided cycle 1 of `BREATHING_GUIDED_CYCLES` starts.
4. **Guided phase cadence.** While guided, the circular animated indicator and text prompts cycle: `t('breathing.inhale')` ("Breathe in...") for 4s → `t('breathing.holdIn')` ("Hold...") for 4s → `t('breathing.exhale')` ("Breathe out...") for 4s → `t('breathing.holdOut')` ("Hold...") for 4s. One cycle = 16s.
5. **Auto-transition to passive.** Once `BREATHING_GUIDED_CYCLES` guided cycles complete, the screen automatically transitions to the passive phase: all text prompts disappear; the animated ring keeps looping with the same 4-4-4-4 timing; a `t('breathing.passiveReady')` ("I'm ready") CTA becomes visible — tappable at any point during the passive phase to end the session early.
6. **Timer-driven graceful end.** If the session timer reaches zero during the passive phase, the session ends gracefully: a `t('breathing.sessionComplete')` ("Session complete") message appears for 1–2s, then the user returns to the Calm Me support screen. No abrupt cut.
7. **Early exit.** Tapping `t('breathing.passiveReady')` before the timer expires ends the session immediately and returns the user to the Calm Me support screen; the remaining timer value is discarded (no completion message).
8. **Dismiss during guided phase.** Tapping the back/dismiss affordance during the guided phase returns the user to the support screen; no error or warning is shown; the session is treated as incomplete.
9. **i18n** *(story-author addition — epics.md's Story 7.2 section omits an explicit i18n AC, unlike sibling Stories 7.1/7.3/7.4, which is very likely an oversight in the epic doc rather than an intentional exception; the project enforces this via CI on every screen regardless)*. Every visible string on the breathing coach screen uses `t()`; no raw string literals in component JSX; CI `i18next/no-literal-string` lint passes.

## Tasks / Subtasks

- [ ] Task 1: Core config file (AC: #1)
  - [ ] Create `packages/core/src/config/breathingCoach.ts` with the three exports above
  - [ ] Export from `packages/core/src/index.ts`
  - [ ] No RN/Expo/`@supabase/*` imports (ARC-011 boundary check)
- [ ] Task 2: Pure phase-advance logic (AC: #2)
  - [ ] Create `packages/core/src/calm-me/breathing-phase.ts` — pure function, zero React/timers/animation. Recommended shape: `advancePhase(phaseIndex: number, elapsedMsInPhase: number, pattern: typeof BREATHING_PATTERN): { phaseIndex: number; cycleCompleted: boolean }`, looping `phaseIndex` mod 4 (inhale→holdIn→exhale→holdOut→inhale...) and reporting `cycleCompleted: true` exactly when it wraps back to `inhale` (0)
  - [ ] Co-located `packages/core/src/calm-me/breathing-phase.test.ts` (Vitest) — assert the AC #2 contract (see Dev Notes "AC #2's literal wording doesn't match BREATHING_PATTERN's actual shape" for the `.duration` discrepancy): given phase index `n`, when elapsed ticks reach the n-th phase's configured duration (mapping inhale=0, holdIn=1, exhale=2, holdOut=3), phase advances to `n+1`; also assert the mod-4 loop back to inhale and the resulting `cycleCompleted` flag
  - [ ] Export from `packages/core/src/index.ts`
- [ ] Task 3: `useBreathingPhase` hook (AC: #2, #3, #4, #5)
  - [ ] Create `apps/mobile/src/hooks/useBreathingPhase.ts` — owns three pieces of state, driven by `setInterval`/timestamp deltas, calling into `breathing-phase.ts` for the phase-advance decision:
    1. **Phase** (0–3, loops forever) — drives ring + text, via `breathing-phase.ts`
    2. **Cycle count** (increments once per `cycleCompleted`) — compared against `BREATHING_GUIDED_CYCLES` to derive `isGuided`
    3. **Session countdown** (independent 1s ticker from `BREATHING_TIMER_SECONDS` down to 0) — see Dev Notes "Three independent timers, not one"
  - [ ] Clear all intervals on unmount (see Dev Notes "Async/timer cleanup")
  - [ ] Co-located `apps/mobile/src/hooks/useBreathingPhase.test.ts` using `jest.useFakeTimers()` + `jest.advanceTimersByTime()` (see Dev Notes "Fake-timer testing precedent")
- [ ] Task 4: `BreathingCoach` presentational component + screen wiring (AC: #3–#8)
  - [ ] Create `packages/ui/src/components/BreathingCoach.tsx` — presentational, navigation-agnostic (see Dev Notes "Component Strategy names `BreathingCoach` — build it in packages/ui"). Props include phase/cycle/countdown display state plus a `reduced: boolean` and an `onReadyPress: () => void` callback — it must NOT call `useAnimation()` itself (cross-package import direction violation, see Dev Notes)
  - [ ] Render the circular animated ring inside `BreathingCoach` using `react-native-reanimated` (already a dependency — see Dev Notes "Animation library")
  - [ ] Guided phase: ring + cycling text prompts (`breathing.inhale`/`holdIn`/`exhale`/`holdOut`), wrapped for screen-reader announcement (see Dev Notes "Live region — breathing animation accessibility requirement")
  - [ ] Passive phase: ring continues identically, text hidden, `breathing.passiveReady` CTA shown (56×56px — `tapTarget.inTheMoment` from `@exposure-buddy/ui`)
  - [ ] `reduced === true` fallback: static ring (no animation) + numeric per-phase text countdown, per the documented contract (see Dev Notes "Reduced motion")
  - [ ] Export `BreathingCoach` + its props type from `packages/ui/src/index.ts`
  - [ ] Replace the placeholder body in `apps/mobile/app/calm-me/breathing.tsx` with a thin wrapper: call `useBreathingPhase()` and `useAnimation()`, render `<BreathingCoach ... />` — **do not** change the route's nav wiring, the `Stack.Screen` options, or the existing top-left Back button's position/behavior (see Dev Notes "Reuse the existing placeholder shell")
  - [ ] MM:SS countdown display from the session timer (no existing formatter in this codebase — implement fresh, see Dev Notes)
  - [ ] Timer-zero path: show `breathing.sessionComplete` for 1–2s (`setTimeout`), then `router.back()`
  - [ ] "I'm ready" tap: `router.back()` immediately, no completion message
- [ ] Task 5: i18n keys (AC: #4, #5, #6, #9)
  - [ ] Add new `breathing` namespace to `en.json`: `inhale`, `holdIn`, `exhale`, `holdOut`, `passiveReady`, `sessionComplete`
  - [ ] Add the same keys to `hi.json` (full or partial translation — `fallbackLng: 'en'` covers any gaps, matching the Story 7.1 precedent)
  - [ ] Reuse the existing `calmMe.technique.breathing` label ("Breathing") for the technique-picker entry — do not redefine it
- [ ] Task 6: Tests
  - [ ] `breathing-phase.test.ts` (packages/core, Vitest) — AC #2 contract
  - [ ] `useBreathingPhase.test.ts` (apps/mobile, Jest, fake timers)
  - [ ] `apps/mobile/app/calm-me/breathing.test.tsx` (replaces/extends the existing placeholder test if any) covering: guided phase auto-starts with MM:SS visible; text cycles inhale→holdIn→exhale→holdOut in order across 16s; after 2 cycles (32s) auto-transitions to passive (text hidden, "I'm ready" visible); tapping "I'm ready" during passive navigates back immediately with no completion message; timer reaching 0 shows "Session complete" then navigates back after the 1–2s delay; Back button during guided phase navigates back with no error/crash; `reduced: true` (mock `useAnimation`, per `useFocusOnMount.test.tsx`'s mocking pattern) renders the static-ring + numeric-countdown fallback instead of the animated tween
  - [ ] `pnpm turbo lint` passes — 0 `i18next/no-literal-string` violations
  - [ ] `pnpm turbo typecheck` and `pnpm turbo test` — zero regressions across all 6 packages

## Dev Notes

### Reuse the existing placeholder shell — don't rebuild navigation

Story 7.1 already created `apps/mobile/app/calm-me/breathing.tsx` as a placeholder route, reachable from the Calm Me technique picker (`calm-me/index.tsx`) with no params. Its current body:
```typescript
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'

export default function BreathingPlaceholderScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}
          accessibilityRole="button" accessibilityLabel={t('calmMe.back')}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.comingSoon}>{t('calmMe.comingSoon')}</Text>
      </View>
    </>
  )
}
```
This story replaces only the body (the `comingSoon` text and whatever else is added), **keeping** the `Stack.Screen options={{ headerShown: false }}` wrapper and the top-left Back button (`router.back()`, `accessibilityLabel={t('calmMe.back')}`) exactly as-is — that Back button already satisfies AC #8's dismiss requirement verbatim (returns to the Calm Me screen, no error, no special handling needed). Do not touch `calm-me/index.tsx`'s technique-picker wiring; it already routes here.

This screen is **not** a mandatory lockout screen (unlike Story 7.5's grounding screen, which sets `gestureEnabled: false`/intercepts the hardware back button). Leave default Expo Router back-navigation behavior in place — iOS swipe-back, Android hardware back, and the explicit Back button should all simply pop the route, consistent with AC #8's "no error or warning ... treated as incomplete."

Story 7.5's grounding screen will later reuse this same Breathing technique by **navigating** to `/calm-me/breathing` — its own AC only requires that ("this screen reuses the same technique components built in Stories 7.2–7.4 — it is not a duplicate implementation"), not a shared-component import. This story does extract a `packages/ui` `BreathingCoach` component anyway (see "Component Strategy doc names `BreathingCoach`" below) — that's recommended for consistency with the established Story 7.1 pattern, not because Story 7.5's reuse strictly requires it.

### Three independent timers, not one — don't conflate them

This story needs three distinct counters, and conflating them is the most likely implementation mistake:

1. **Phase index (0–3)** — loops forever through inhale→holdIn→exhale→holdOut→inhale..., driven by `BREATHING_PATTERN`'s 4 four-second durations. Drives the ring animation and (in guided mode only) the text prompt. Runs identically in guided AND passive phases — passive only hides the text, the ring/cadence keeps going.
2. **Cycle count** — increments by 1 each time the phase index wraps back to `inhale` (0). Compared against `BREATHING_GUIDED_CYCLES` (2) to decide guided vs. passive. This is a *separate* counter from the phase index — 2 guided cycles = 8 phase advances (4 phases × 2 cycles), not 2 phase advances.
3. **Session countdown (300s → 0, MM:SS)** — a plain 1-second ticker, started at mount, completely independent of phase/cycle state. It is the sole driver of AC #6's graceful end. It does not pause or reset when guided→passive transitions.

`packages/core/src/calm-me/breathing-phase.ts` (Task 2) should own only counter #1 (and report when #2 should increment via `cycleCompleted`); the `useBreathingPhase` hook (Task 3) owns turning that into wall-clock ticks plus counter #3.

### AC #2's literal wording doesn't match `BREATHING_PATTERN`'s actual shape

epics.md's literal unit-test contract reads `BREATHING_PATTERN[n].duration`, implying an array of objects with a `.duration` field. But AC #1's literal config export (also quoted verbatim from epics.md) is `{ inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 }` — a plain object of numbers, not an array of `{duration}` objects. This is an internal inconsistency in epics.md itself, not a typo to "fix" in the exported constant — AC #1's object shape is what Story 7.1's sibling configs (`calmMeConfig.ts`, `helplines.ts`) establish as the pattern and must be kept as-is. Inside `breathing-phase.ts`, build a local ordered lookup (e.g. `const PHASE_ORDER = ['inhale', 'holdIn', 'exhale', 'holdOut'] as const`) to index `BREATHING_PATTERN[PHASE_ORDER[n]]` by numeric phase index — this satisfies the AC #2 test's "phase index n" framing without changing `BREATHING_PATTERN`'s exported shape.

### Component Strategy doc names `BreathingCoach` — build it in packages/ui

`ux-design-specification/component-strategy.md`'s "Phase 2 — Loop completion" component list explicitly names `BreathingCoach` alongside `GroundingPrompt` and `HelplineCard` (the Stories 7.3/7.4 equivalents), in the same list that included `CalmMeButton` (Phase 1 — already built as a `packages/ui` component in Story 7.1). Build `BreathingCoach` as a `packages/ui/src/components/` presentational component mirroring `CalmMeButton.tsx`'s/`CourageLadderEntryCard.tsx`'s shape (`React.forwardRef`, `StyleSheet.create()`, no NativeWind, named export + separately-exported props type, added to `packages/ui/src/index.ts`'s barrel) rather than inlining the ring/text/CTA UI directly in the route file. This is a stronger, more consistent reading than epics.md's Story 7.5 AC alone (which only says "navigates to Story 7.2 breathing coach" — satisfiable by route navigation alone) — extracting the component costs nothing extra and matches the established Story 7.1 pattern.

**Cross-package import direction constraint:** `packages/ui`'s ESLint config (`packages/ui/.eslintrc.js`) blocks `expo-*` imports everywhere, and `apps/mobile/src/contexts/AnimationContext.tsx` isn't even reachable from `packages/ui` regardless (apps depend on packages, never the reverse). `BreathingCoach` therefore **cannot** call `useAnimation()` itself — the `apps/mobile/app/calm-me/breathing.tsx` wrapper screen calls `useAnimation()` and passes `reduced` down as a prop, the same way it will pass the `useBreathingPhase()` state down. `BreathingCoach.test.tsx` is expected to hit the same RN-Flow-parse Vitest wall as `CalmMeButton.test.tsx` did in Story 7.1 (`packages/ui`'s Vitest config has no RN renderer) — that's a pre-existing, already-documented project constraint, not a new gap to solve here; `tsc --noEmit` typechecks the primitive, and behavior is covered via the screen-level `breathing.test.tsx`.

### Live region — breathing animation accessibility requirement

`ux-design-specification/core-user-experience.md` states explicitly: "The breathing animation needs a live region announcing timing cues." This is a real, sourced requirement that epics.md's Story 7.2 ACs omit. The cycling phase prompts (`breathing.inhale`/`holdIn`/`exhale`/`holdOut`) update on a timer, not via user interaction, so neither VoiceOver nor TalkBack will announce them by default. Two RN mechanisms exist and behave differently per platform — don't rely on only one:
- `accessibilityLiveRegion="polite"` on the phase-prompt `Text` node — **Android only**; RN does not support this prop on iOS
- `AccessibilityInfo.announceForAccessibility(message)` — works on **both** platforms; call it on every phase change with the new prompt text (e.g. inside the same effect that advances the phase)

No precedent for either exists yet in this codebase (verified by grep) — use `AccessibilityInfo.announceForAccessibility()` as the primary, cross-platform mechanism (call it once per phase transition with the new prompt's translated text), optionally layering `accessibilityLiveRegion="polite"` on top for Android. Note: `responsive-design-accessibility.md`'s formal "Accessibility Testing Gate" 5-flow hard-block list names `CalmMeButton`/`GroundingPrompt`/mode-transition screens specifically, not `BreathingCoach` by name — so this isn't a literal launch-gate blocker — but it's an explicit, sourced requirement from `core-user-experience.md` and the project's general WCAG 2.1 AA commitment, not optional polish to skip.

### Reduced motion — exact documented fallback is "static ring + text countdown"

`apps/mobile/src/contexts/AnimationContext.tsx` exports `ReducedMotionProvider` (mounted in `apps/mobile/app/_layout.tsx`, already wrapping the whole app) and `useAnimation()` returning `{ reduced: boolean }`, backed by `AccessibilityInfo.isReduceMotionEnabled()` with a live `reduceMotionChanged` listener. (Note: this lives at `apps/mobile/src/contexts/AnimationContext.tsx`, not `packages/ui/src/contexts/AnimationContext.tsx` as `responsive-design-accessibility.md` describes — a path deviation, same category as the Epic 3 `keywordDetector.ts` precedent; use the real location.) `apps/mobile/src/hooks/useFocusOnMount.ts` is the existing consumption pattern: `const { reduced } = useAnimation()`, then branch on it. As established above, `BreathingCoach` receives this as a `reduced` prop — it does not call the hook itself.

`ux-design-specification/visual-design-foundation.md` states the exact fallback contract: **"Breathing animation: falls back to static ring + text countdown when reduced."** This is more specific than the generic global rule ("all animation durations collapse to 0") — when `reduced` is true: (1) the ring renders in a static, non-animating state (no `withTiming`/`withRepeat` tween), and (2) render a numeric per-phase countdown as text (e.g. "4… 3… 2… 1…", not just the static phase label) so the timing cue that the animation would otherwise carry is still conveyed. This must **not** collapse the 4-second phase *durations* themselves, which are the clinical content of the exercise (`BREATHING_PATTERN` timing), not decorative motion — only the ring's visual tween and the text-vs-numeric-countdown choice change.

### packages/core internal structure — new `calm-me/` folder

`packages/core/src/` is organized as one folder per protocol group, each pure and co-located-tested (`erp/` = session state machine + SUDS + debrief, `crisis/`, `checkin/`, `progress/`, etc. — see `implementation-patterns-consistency-rules.md#Structure Patterns`). There is no existing folder for Epic 7 / Calm Me domain logic. Create `packages/core/src/calm-me/` for `breathing-phase.ts`, following the same pure-function, zero-React pattern as `packages/core/src/erp/session-state-machine.ts` (a plain `transition(currentState, event)` reducer with no timers, no singleton, no React) — this is what makes AC #2's literal unit test possible without mocking animation or timers.

### File-naming convention conflict — intentional, not an oversight

`implementation-patterns-consistency-rules.md#Naming Patterns` specifies non-component files as kebab-case (e.g. `session-state-machine.ts`), but the epics.md AC hard-codes the literal path `breathingCoach.ts` (camelCase). Follow the epics.md literal filename as written for that one file — this mirrors the accepted Story 7.1 precedent (`calmMeConfig.ts`/`helplines.ts`) and the earlier Epic 3 precedent (`keywordDetector.ts` vs. the architect's `detector.ts`). The *new* `breathing-phase.ts` file introduced by this story (not literally named in epics.md) should follow the normal kebab-case convention, same as `session-state-machine.ts`.

### Animation library — react-native-reanimated, already present but unused

`react-native-reanimated` `~4.1.7` is already a dependency of `apps/mobile`, and its Babel plugin is already configured (`apps/mobile/babel.config.js`: `plugins: ['react-native-reanimated/plugin']`). Verified: it is not consumed anywhere in the current codebase — this story is the first real usage. Use it for the looping ring (e.g. `useSharedValue` + `withRepeat(withTiming(...))` keyed to phase changes). Do not add a different animation library or fall back to the bare RN `Animated` API — Reanimated is the intended, already-configured choice.

### Haptics gap — do not add `expo-haptics` this story

`packages/ui/src/tokens/theme.ts` defines `haptic.breathingRhythm: 'light'`, explicitly commented "repeating during breathing exercise" — clearly intended for this story. However, **`expo-haptics` is not an installed dependency anywhere in the monorepo** (absent from both `apps/mobile/package.json` and `packages/ui/package.json`). Per the Story 7.1 precedent (which avoided adding `@expo/vector-icons` for the identical reason — "avoided adding a new dependency without approval"), implement the breathing coach **without** haptic feedback this story. The design token already exists for future wiring once the dependency is approved/added; do not invent a workaround (e.g. a different haptics API) to use it now. Document this as an intentional, known gap in Completion Notes — not an oversight.

### Design tokens — follow the CalmMeButton precedent, not the placeholder precedent

Two conflicting precedents exist in this codebase: the Story 7.1 placeholder routes (`breathing.tsx` as it stands today, `calm-me/index.tsx`) use raw hex colors and pixel values; `packages/ui/src/components/CalmMeButton.tsx` (also Story 7.1, but the more deliberately-styled component) imports `color` from `../tokens/theme` and uses semantic tokens. Follow the `CalmMeButton.tsx` precedent for this story's new UI: import `color`, `tapTarget`, `spacing` (and `motion`/`haptic` if/when applicable) from `@exposure-buddy/ui`. Relevant tokens:
- `color.accent.grounding` (`#8B6F47`) — grounding/somatic visual accents; **AA-compliant for large text only (≥18px or ≥14px bold) — never use for normal body-size text** (per `theme.ts` comment and the accessibility audit in `responsive-design-accessibility.md`)
- `tapTarget.inTheMoment` (56×56px) — use for the "I'm ready" CTA; this is an in-the-moment grounding interaction per the touch-target contract in `responsive-design-accessibility.md`
- `spacing` — layout values instead of ad-hoc numbers

### No existing MM:SS timer-display utility

Grep confirms no `setInterval`-driven countdown or MM:SS formatter exists anywhere in `apps/mobile` today — this story introduces the first one. Implement a small local helper (e.g. `formatMMSS(seconds: number): string` using `Math.floor(seconds / 60)` and `seconds % 60`, zero-padded) rather than searching for a nonexistent shared utility.

### Async/timer cleanup

Per `implementation-patterns-consistency-rules.md#Async useEffect Patterns`: any `setInterval`/`setTimeout` driving phase/cycle/session-timer state in `useBreathingPhase` or the screen's `setTimeout` for the "Session complete" message must be cleared in the effect's cleanup (`return () => clearInterval(id)` / `clearTimeout(id)`) to avoid stale updates if the user backs out mid-cycle. Include every value read inside each effect in its dependency array (`react-hooks/exhaustive-deps` is `error`-level in `apps/mobile/.eslintrc.js`).

### Fake-timer testing precedent

`apps/mobile/app/ladder.test.tsx` and `apps/mobile/app/(app)/index.test.tsx` already use `jest.useFakeTimers()` + `jest.advanceTimersByTime(ms)` for timer-driven UI. Follow this pattern for `useBreathingPhase.test.ts` and `breathing.test.tsx` — real waits would make the 300s session-timer path impractically slow and flaky.

### Project Structure Notes

- New files: `packages/core/src/config/breathingCoach.ts`, `packages/core/src/calm-me/breathing-phase.ts` (+ co-located `.test.ts`), `packages/ui/src/components/BreathingCoach.tsx`, `apps/mobile/src/hooks/useBreathingPhase.ts` (+ co-located `.test.ts`)
- Modified files: `apps/mobile/app/calm-me/breathing.tsx` (placeholder body → thin wrapper screen; its existing test file, if any, is replaced/extended), `packages/core/src/index.ts` (barrel export), `packages/ui/src/index.ts` (barrel export), `apps/mobile/src/i18n/locales/en.json`/`hi.json` (new `breathing` namespace)
- No new packages, no migrations, no Edge Functions, no new third-party dependencies (Reanimated and the i18n/animation infrastructure all already exist)
- Consistent with existing structure: pure domain logic in `packages/core/src/<protocol-group>/`, shared presentational components in `packages/ui/src/components/`, app-level hooks in `apps/mobile/src/hooks/`, screens in `apps/mobile/app/`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.2, lines 1493–1540] — canonical acceptance criteria
- [Source: _bmad-output/planning-artifacts/epics.md#ARC-011] — packages/core import boundary CI gate
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md#Naming Patterns, #Structure Patterns, #Async useEffect Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification/component-strategy.md] — `BreathingCoach` named in the Phase 2 component list
- [Source: _bmad-output/planning-artifacts/ux-design-specification/core-user-experience.md] — "breathing animation needs a live region announcing timing cues"
- [Source: _bmad-output/planning-artifacts/ux-design-specification/visual-design-foundation.md] — exact reduced-motion fallback contract ("static ring + text countdown")
- [Source: _bmad-output/planning-artifacts/ux-design-specification/responsive-design-accessibility.md] — `reduceMotion` global contract (A11Y-003), touch-target contract, `color.accent.grounding` contrast note
- `_bmad-output/implementation-artifacts/7-1-calm-me-shell-courage-affirmation-and-action-decision-routing.md` — placeholder route creation, technique-picker wiring, `CalmMeButton.tsx` token-usage precedent, file-naming conflict precedent
- `apps/mobile/app/calm-me/breathing.tsx` — placeholder shell to extend (current implementation quoted above)
- `packages/core/src/erp/session-state-machine.ts` — pure-reducer pattern to mirror for `breathing-phase.ts`
- `packages/ui/src/components/CalmMeButton.tsx`, `packages/ui/src/components/CourageLadderEntryCard.tsx` — component shape/export pattern to mirror for `BreathingCoach`
- `packages/ui/.eslintrc.js` — confirms `expo-*`/cross-app imports are blocked in `packages/ui` (why `reduced` must be a prop, not a hook call, inside `BreathingCoach`)
- `apps/mobile/src/contexts/AnimationContext.tsx` — `useAnimation()`/`ReducedMotionProvider`, already mounted in `_layout.tsx`
- `apps/mobile/src/hooks/useFocusOnMount.ts` — existing `useAnimation()` consumption pattern
- `packages/ui/src/tokens/theme.ts` — `haptic.breathingRhythm`, `color.accent.grounding`, `tapTarget.inTheMoment`, `motion.grounding`
- `apps/mobile/app/ladder.test.tsx` — `jest.useFakeTimers()`/`advanceTimersByTime()` pattern
- `apps/mobile/babel.config.js` — confirms `react-native-reanimated/plugin` already configured

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6)

### Debug Log References

### Completion Notes List

### File List
