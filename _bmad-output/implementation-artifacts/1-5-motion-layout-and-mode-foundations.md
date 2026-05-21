# Story 1.5: Motion, Layout & Mode Foundations

Status: ready-for-dev

## Story

As a developer,
I want `AnimationContext`, `ReducedMotionProvider`, `SafeAreaProvider`, the three mode briefs, and the CalmMeButton rendering strategy ADR in place at the app root,
so that every subsequent screen inherits correct motion behaviour, safe area handling, and CalmMe overlay can be positioned without architectural ambiguity (UX-DR2, UX-DR5, UX-DR8, UX-DR15, UX-DR23).

## Acceptance Criteria

1. **AnimationContext live `reduceMotionChanged` listener (UX-DR15)**
   **Given** `ReducedMotionProvider` is mounted at `apps/mobile/app/_layout.tsx`
   **When** the OS `reduceMotion` accessibility setting changes while the app is foregrounded
   **Then** `AccessibilityInfo.addEventListener('reduceMotionChanged', ...)` fires; the context value updates within one render cycle; a Jest unit test at `apps/mobile/src/contexts/AnimationContext.test.tsx` mocks the event and asserts the context update

2. **AnimationContext default is fail-safe (UX-DR15)**
   **Given** `AnimationContext` default state before the provider has confirmed
   **When** any animated component renders (i.e. before `AccessibilityInfo.isReduceMotionEnabled()` resolves)
   **Then** it renders with `reduced: true` — fail-safe, not fail-open

3. **All durations from tokens, collapse to 0ms when reduced (UX-DR15)**
   **Given** all animated components consume `AnimationContext`
   **When** `reduceMotion` is `true`
   **Then** all animation durations collapse to 0ms; no component references a hardcoded duration value — all durations come from `motion` preset tokens from `packages/ui/src/tokens/theme.ts`

4. **SafeAreaProvider at root (UX-DR23)**
   **Given** `SafeAreaProvider` is added to `apps/mobile/app/_layout.tsx`
   **When** the app launches on iOS 16+ or Android 10+
   **Then** safe area insets apply correctly; `useSafeAreaInsets()` is available to all child screens without additional setup

5. **Three mode briefs authored (UX-DR5)**
   **Given** the three mode briefs are authored
   **When** sprint 1 begins
   **Then** all three briefs exist at `docs/ux/mode-briefs/preparation.md`, `docs/ux/mode-briefs/in-the-moment.md`, and `docs/ux/mode-briefs/reflection.md` with PM sign-off field and token surface reference; sprint 1 UI stories are blocked until sign-off is confirmed

6. **ADR-CALMME-RENDER.md authored and decided (UX-DR8)**
   **Given** the CalmMeButton rendering strategy ADR is authored at `_bmad-output/planning-artifacts/adrs/ADR-CALMME-RENDER.md`
   **Then** the ADR records the decided choice (informed by Story 1.2's `@gorhom/bottom-sheet` evaluation); the decision and its JS-layer limitation are explicitly documented; the ADR is signed off before the in-the-moment sprint begins

## Tasks / Subtasks

- [ ] Task 1 — Set up Jest for `apps/mobile` (AC: 1)
  - [ ] Add `jest-expo@~54.0.0` and `@testing-library/react-native` as devDependencies in `apps/mobile/package.json`
  - [ ] Add `@types/jest` as devDependency
  - [ ] Add `"test": "jest"` script to `apps/mobile/package.json`
  - [ ] Add `"jest": { "preset": "jest-expo" }` config to `apps/mobile/package.json`
  - [ ] Verify `pnpm --filter exposure-buddy-mobile test` runs (zero tests pass is fine at this point)

- [ ] Task 2 — Author `AnimationContext` + `ReducedMotionProvider` (AC: 1, 2, 3)
  - [ ] Create `apps/mobile/src/contexts/AnimationContext.tsx` with `AnimationContext`, `ReducedMotionProvider` export, and `useAnimation` hook (see Dev Notes — Implementation)
  - [ ] Default context value is `{ reduced: true }` (fail-safe)
  - [ ] `ReducedMotionProvider` reads `AccessibilityInfo.isReduceMotionEnabled()` at mount
  - [ ] `ReducedMotionProvider` subscribes to `AccessibilityInfo.addEventListener('reduceMotionChanged', handler)` with cleanup on unmount
  - [ ] Write Jest test at `apps/mobile/src/contexts/AnimationContext.test.tsx` (see Dev Notes — Test)

- [ ] Task 3 — Wire providers into `_layout.tsx` (AC: 1, 4)
  - [ ] Add `SafeAreaProvider` from `react-native-safe-area-context` (already installed v5.6.2)
  - [ ] Add `ReducedMotionProvider` from `../src/contexts/AnimationContext`
  - [ ] Nesting order: `SafeAreaProvider` → `ReducedMotionProvider` → `ThemeProvider` → `Stack` + `PortalHost`
  - [ ] All three providers must be inside the font-loading guard (after null-return) — consistent with existing pattern
  - [ ] Preserve existing: `initErrorHandler()`, `SplashScreen.preventAutoHideAsync()`, `useFonts`, `splashHidden` ref, `useEffect`, `PortalHost`

- [ ] Task 4 — Author three mode briefs (AC: 5)
  - [ ] Create `docs/ux/mode-briefs/` directory
  - [ ] Write `docs/ux/mode-briefs/preparation.md` (see Dev Notes — Mode Briefs)
  - [ ] Write `docs/ux/mode-briefs/in-the-moment.md`
  - [ ] Write `docs/ux/mode-briefs/reflection.md`
  - [ ] Each brief includes: director's statement, token surface table (bg colour, motion duration, touch target), haptic language, key behaviours, PM sign-off field

- [ ] Task 5 — Author ADR-CALMME-RENDER.md (AC: 6)
  - [ ] Write `_bmad-output/planning-artifacts/adrs/ADR-CALMME-RENDER.md`
  - [ ] Record the decided choice: `@rn-primitives/portal` (JS-layer only) via `<PortalHost>` already in `_layout.tsx`
  - [ ] Reference Story 1.2 evaluation that informed the decision
  - [ ] Document the JS-layer limitation explicitly (does not float above native system UI)
  - [ ] Record sign-off fields

- [ ] Task 6 — Build validation (all ACs)
  - [ ] Run `pnpm turbo build` — verify exit 0
  - [ ] Run `pnpm turbo typecheck` — verify exit 0
  - [ ] Run `pnpm --filter exposure-buddy-mobile test` — verify Jest test passes

## Dev Notes

### Critical Context: What Exists From Previous Stories

**Story 1.4 (tokens — done):**
- `packages/ui/src/tokens/theme.ts` is the canonical token file. All `motion` presets live there: `motion.preparing { duration: 200, easing: 'easeOut' }`, `motion.grounding { duration: 400, easing: 'easeInOut' }`, `motion.reflecting { duration: 600, easing: 'easeOut' }`. **Do not hardcode any duration value in this story or any future story.** Consume from `motion` tokens only.
- `groundingTokens` already has `motion: motion.grounding` — import via `@exposure-buddy/ui`.

**Story 1.2 (UI library evaluation — done):**
- `@rn-primitives/portal` is ADOPTED. `<PortalHost />` is already in `apps/mobile/app/_layout.tsx`.
- `@gorhom/bottom-sheet` is REJECTED for MVP. This directly decides `ADR-CALMME-RENDER.md`.
- **Do not install `@gorhom/bottom-sheet`, `@gorhom/portal`, or `react-native-reanimated` in this story.** `react-native-reanimated` is not needed — this story only sets up context infrastructure, no animated components.

**Story 1.3 (NativeWind FALLBACK — done):**
- NativeWind v5 is rejected. No `className` props anywhere. Use `StyleSheet.create()` with token values.

**`react-native-safe-area-context@~5.6.2` is already installed** in `apps/mobile/package.json`. Do not reinstall. Simply import `SafeAreaProvider` from it.

### Implementation: AnimationContext

Create `apps/mobile/src/contexts/AnimationContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

type AnimationContextValue = {
  reduced: boolean
}

// Fail-safe: true until ReducedMotionProvider confirms otherwise (UX-DR15)
const AnimationContext = createContext<AnimationContextValue>({ reduced: true })

export function ReducedMotionProvider({ children }: { children: React.ReactNode }) {
  // Start reduced: true — fail-safe, not fail-open (UX-DR15)
  const [reduced, setReduced] = useState(true)

  useEffect(() => {
    // Read current preference at mount
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {})

    // Subscribe to live changes — NOT boot-only (UX-DR15, A11Y-003)
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    )

    return () => subscription.remove()
  }, [])

  return (
    <AnimationContext.Provider value={{ reduced }}>
      {children}
    </AnimationContext.Provider>
  )
}

export function useAnimation(): AnimationContextValue {
  return useContext(AnimationContext)
}
```

**Why `useState(true)` (fail-safe):** Before `isReduceMotionEnabled()` resolves (async), the context emits `reduced: true`. Any animated component that reads the context before the promise resolves will reduce its motion. This is the correct clinical behaviour — no unwanted animation on dysregulated screens.

**Why `.catch(() => {})` on `isReduceMotionEnabled()`:** On some Android versions, the API may reject. Silently swallow — the state stays `true` (safe default).

**Subscription cleanup:** `subscription.remove()` in the useEffect cleanup prevents memory leaks on unmount. This is required — the subscription fires on OS-level accessibility changes and must be removed when the component unmounts.

### Implementation: `_layout.tsx` Update

The updated provider nesting after Task 3:

```typescript
// After the null-return guard:
return (
  <SafeAreaProvider>
    <ReducedMotionProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        <PortalHost />
      </ThemeProvider>
    </ReducedMotionProvider>
  </SafeAreaProvider>
)
```

Add to imports:
```typescript
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ReducedMotionProvider } from '../src/contexts/AnimationContext'
```

**Preserve exactly:**
- `initErrorHandler()` at module scope (MUST remain first)
- `SplashScreen.preventAutoHideAsync().catch(() => {})` at module scope
- `useFonts` hook
- `splashHidden` ref and `useEffect` for `SplashScreen.hideAsync()`
- `null` return guard while fonts load
- `<PortalHost />` inside the tree

**Nesting rationale:** `SafeAreaProvider` outermost — it is stateless and must wrap everything. `ReducedMotionProvider` wraps the nav tree so all screens inherit the context. `ThemeProvider` is navigation-specific.

### Implementation: Jest Setup

In `apps/mobile/package.json`, add to `devDependencies`:
```json
"@testing-library/react-native": "^13.0.0",
"@types/jest": "^29.0.0",
"jest-expo": "~54.0.0"
```

Add script: `"test": "jest"`

Add at top-level of `package.json`:
```json
"jest": {
  "preset": "jest-expo"
}
```

**`jest-expo@~54.0.0`:** Must match Expo SDK 54. The `~` allows patch bumps only. Do not use `^`.

**pnpm onlyBuiltDependencies caveat:** If `pnpm install` fails with a lifecycle script error on `jest-expo`, add `"jest-expo"` to `onlyBuiltDependencies` in `pnpm-workspace.yaml` (same pattern as `@sentry/cli` and `esbuild` from Story 1.1).

### Implementation: Jest Test

Create `apps/mobile/src/contexts/AnimationContext.test.tsx`:

```typescript
import React from 'react'
import { renderHook, act } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'
import { ReducedMotionProvider, useAnimation } from './AnimationContext'

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native')
  return {
    ...RN,
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
  }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ReducedMotionProvider>{children}</ReducedMotionProvider>
)

describe('AnimationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false)
    ;(AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({ remove: jest.fn() })
  })

  it('default value is reduced: true (fail-safe before provider confirms)', () => {
    // Context default — no provider
    const { result } = renderHook(() => useAnimation())
    expect(result.current.reduced).toBe(true)
  })

  it('updates within one render cycle when reduceMotionChanged fires', () => {
    let changeHandler: (isEnabled: boolean) => void = () => {}
    ;(AccessibilityInfo.addEventListener as jest.Mock).mockImplementation(
      (_event: string, handler: (isEnabled: boolean) => void) => {
        changeHandler = handler
        return { remove: jest.fn() }
      },
    )

    const { result } = renderHook(() => useAnimation(), { wrapper })

    act(() => {
      changeHandler(true)
    })

    expect(result.current.reduced).toBe(true)
  })
})
```

**Why `jest.requireActual('react-native')`:** This preserves all other RN modules while replacing only `AccessibilityInfo`. Without this, the entire RN module is replaced and other imports (like `View`, `StyleSheet`) disappear.

### Implementation: ADR-CALMME-RENDER.md

Write `_bmad-output/planning-artifacts/adrs/ADR-CALMME-RENDER.md`. Key content:

- **Context:** CalmMeButton must render above all JS-layer UI on all screens. Story 1.2 evaluated `@gorhom/bottom-sheet` and `@rn-primitives/portal` as CalmMe overlay mechanisms.
- **Decision:** `@rn-primitives/portal` via `<PortalHost>` already mounted in `_layout.tsx` (implemented in Story 1.2).
- **Rationale:** `@gorhom/bottom-sheet` REJECTED in Story 1.2 (no MVP component needs a sheet drawer; adds `react-native-reanimated` + `react-native-gesture-handler` native module complexity with no MVP gain). `@rn-primitives/portal` already adopted for `packages/ui`; `<PortalHost>` already in root layout.
- **Limitation (must be documented):** This is JS-layer only. `@rn-primitives/portal` does NOT render above native system UI (Android OS keyboard, image picker, share sheet). This is accepted for MVP (no Epic 2–7 screen requires CalmMe above native UI modals).
- **Related:** `ADR-CALMME-KEYBOARD.md` handles the Android keyboard obscuration edge case separately.
- **Sign-off fields:** must have `Decided by:` and `Date:` fields.

### Implementation: Mode Briefs

Mode briefs live at `docs/ux/mode-briefs/`. Create the directory and three files.

Each brief follows this structure:
1. **Director's statement** — one sentence of tone/mood
2. **Token surface** — table: background colour, motion duration + easing, touch target size
3. **Haptic language** — which haptic constants apply and when
4. **Key behaviours** — 3–5 bullet points of clinical UX rules
5. **PM sign-off** — `[ ] Signed off by: ___ Date: ___`

**Preparation brief** (`docs/ux/mode-briefs/preparation.md`):
- Statement: "Warm, containing, quiet forward momentum — a dojo, not a spa."
- Background: `surface.primary` (#F5F7F6)
- Motion: `motion.preparing` — 200ms, `easeOut` (forward-leaning, slight urgency)
- Touch target: `tapTarget.standard` — 44×44pt
- Haptics: `haptic.dragConfirmation` (fear ladder drag), `haptic.commitmentTap` ("Let's do this")
- Behaviours: Animations present and meaningful; forward-momentum transitions; no overly calming pace; `DM Serif Display` not used; `spacing[10]` not used

**In-the-moment brief** (`docs/ux/mode-briefs/in-the-moment.md`):
- Statement: "Stripped. Immediate. Zero overhead — the app recedes to a tool in the hand."
- Background: `surface.primary` (#F5F7F6, unchanged from preparation)
- Motion: `motion.grounding` — 400ms, `easeInOut` (anchoring stillness); collapses to 0ms when `reduced: true`
- Touch target: `tapTarget.inTheMoment` — 56×56px (UX-DR19)
- Haptics: `haptic.breathingRhythm` (breathing exercise), `haptic.techniqueCompletion` (technique done)
- Behaviours: **Zero network dependency** — blocking PR issue if violated; `CrisisCard` has NO mount animation; `SudsScale` reduced motion mandatory; 2-second access SLA from anywhere; all animations collapse to 0ms when `reduced: true`; `groundingTokens` must not be imported in any Context/Provider file

**Reflection brief** (`docs/ux/mode-briefs/reflection.md`):
- Statement: "Unhurried. Retrospective. Slightly slower — the app witnesses."
- Background: `reflect.background` (#FDF7ED)
- Motion: `motion.reflecting` — 600ms, `easeOut` (unhurried, retrospective)
- Touch target: `tapTarget.standard` — 44×44pt
- Haptics: none specified for reflection surfaces
- Behaviours: `DM Serif Display italic` permitted on 4 designated surfaces only (UX-DR21); `spacing[10]` breathing room available in this register; `accent.progress` (#E8A84C) decorative-only; `SudsArcChart` uses `motion.reflecting`

### Package Boundary Rules for This Story

- `apps/mobile/src/contexts/AnimationContext.tsx` imports from `react-native` (`AccessibilityInfo`) — this is correct. `packages/ui` cannot import `react-native`, so `AnimationContext` MUST live in `apps/mobile`, not `packages/ui`.
- Do NOT move `AnimationContext` to `packages/ui`. The `packages/ui/.eslintrc.js` bans `react-native` imports in that package.
- `SafeAreaProvider` import from `react-native-safe-area-context` — this is a direct dep of `apps/mobile`.

### CI Gates — Must All Pass

1. **`pnpm turbo build`** exits 0
2. **`pnpm turbo typecheck`** exits 0
3. **`pnpm --filter exposure-buddy-mobile test`** — Jest test for AnimationContext passes (Note: `turbo test` will run this automatically if it picks up the new test script)
4. **ARC-011 core-boundary-gate:** No changes to `packages/core` — gate unaffected
5. **ADR-DARK-MODE gate:** No changes to `apps/mobile/app.config.ts` — gate unaffected

### Testing Requirements

- **Jest is not currently set up for `apps/mobile`** — Task 1 must be completed before Task 2's test can run.
- `packages/core` and `packages/ui` use Vitest — do NOT add Vitest to `apps/mobile`. Use Jest (`jest-expo`) for React Native component/context tests.
- The `AnimationContext` test is the ONLY new automated test in this story. Mode briefs and the ADR are documentation; no automated tests required.
- **Manual verification checklist:**
  1. `useSafeAreaInsets()` in any screen component returns non-zero values on a device with a notch (e.g. iPhone 14 — top inset ~44pt)
  2. Toggle OS reduce motion → `useAnimation().reduced` changes live (no app restart required)
  3. `useAnimation().reduced` is `true` immediately on first render (before `isReduceMotionEnabled()` resolves)
  4. `pnpm turbo build` exits 0
  5. `pnpm turbo typecheck` exits 0
  6. Jest test passes

### Previous Story Learnings Applicable Here

**From Story 1.4:**
- Use direct `pnpm install` (not `expo install`) when installing packages — `expo install` subprocess fails in this workspace pnpm v11 config. If `expo install` is attempted, it will silently fail. Use `pnpm add --filter exposure-buddy-mobile <package>`.
- If pnpm blocks install with a lifecycle script error, add to `onlyBuiltDependencies` in `pnpm-workspace.yaml`.
- `initErrorHandler()` MUST be the first module-scope call in `_layout.tsx`. Do not move it.
- `PortalHost` and `PortalHost` must be preserved in the JSX tree.

**From Story 1.2:**
- `@rn-primitives/portal` is adopted. `<PortalHost>` is the portal mount point — required for CalmMeButton overlay in later stories.
- `@gorhom/bottom-sheet` is REJECTED — do not install it.
- `react-native-reanimated` is NOT in `apps/mobile/package.json` — do not add it in this story (no animated components are being built).

**From Story 1.1:**
- `app.config.ts` (not `app.json`) is the source of truth for Expo config — do not modify it.
- `pnpm-workspace.yaml` `onlyBuiltDependencies` pattern: if a new package fails lifecycle scripts, add it there.

### Project Structure Notes

**New files:**
```
apps/mobile/src/contexts/AnimationContext.tsx     ← new: context + provider + hook
apps/mobile/src/contexts/AnimationContext.test.tsx ← new: Jest unit test
docs/ux/mode-briefs/                               ← new directory
docs/ux/mode-briefs/preparation.md                ← new: preparation mode brief
docs/ux/mode-briefs/in-the-moment.md              ← new: in-the-moment mode brief
docs/ux/mode-briefs/reflection.md                 ← new: reflection mode brief
_bmad-output/planning-artifacts/adrs/ADR-CALMME-RENDER.md ← new: CalmMe rendering ADR
```

**Modified files:**
```
apps/mobile/app/_layout.tsx          ← add SafeAreaProvider + ReducedMotionProvider
apps/mobile/package.json             ← add jest-expo, @testing-library/react-native, @types/jest; add test script + jest config
pnpm-lock.yaml                       ← auto-updated
```

**What is NOT in scope:**
- No `react-native-reanimated` installation (needed for animated components in later stories, not this one)
- No `Animated` API usage — AnimationContext is infrastructure only
- No primitive or composed UI components in `packages/ui/src/primitives/` or `packages/ui/src/composed/`
- No changes to `packages/core`, `packages/supabase`, `packages/sync`
- No changes to `apps/mobile/app.config.ts` (dark mode gate must remain clean)
- No changes to `apps/mobile/app/(app)/` or `apps/mobile/app/(auth)/` route files
- `docs/ux/mode-briefs/` stores mode briefs; `docs/design/modes/` is mentioned in UX spec contingency but the canonical path per epic AC is `docs/ux/mode-briefs/`

### References

- [Source: planning-artifacts/epics.md — Story 1.5, lines 489–520] — acceptance criteria, user story statement, UX-DR2/5/8/15/23
- [Source: planning-artifacts/ux-design-specification/responsive-design-accessibility.md — Reduced Motion, lines 78–98] — AnimationContext boot + live listener requirement, post-transition focus, fail-safe default
- [Source: planning-artifacts/ux-design-specification/responsive-design-accessibility.md — AC mapping, lines 161–171] — A11Y-003, A11Y-004
- [Source: planning-artifacts/ux-design-specification/design-system-foundation.md — Phase 1, line 112] — mode briefs pre-sprint-1 gate, PM-owned
- [Source: planning-artifacts/ux-design-specification/component-strategy.md — CalmMeButton, lines 84–100] — UX-DR8, overlay requirement, portal decision
- [Source: planning-artifacts/adrs/ADR-CALMME-KEYBOARD.md] — Android keyboard obscuration edge case (separate from this story)
- [Source: planning-artifacts/epics.md — UX-DR definitions, lines 139/142/145/152/160] — UX-DR2, UX-DR5, UX-DR8, UX-DR15, UX-DR23 verbatim
- [Source: implementation-artifacts/1-2-ui-library-evaluation-rn-primitives-and-bottom-sheet.md — Completion Notes] — @gorhom/bottom-sheet REJECT, @rn-primitives/portal ADOPT, PortalHost already in _layout.tsx
- [Source: implementation-artifacts/1-4-token-system-and-typography-architecture.md — Token File] — motion presets, groundingTokens, token values
- [Source: planning-artifacts/architecture/project-structure-boundaries.md — Package Import Boundaries] — packages/ui cannot import react-native; AnimationContext must be in apps/mobile
- [Source: apps/mobile/app/_layout.tsx] — current state of root layout; all existing code must be preserved

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-21 | Story created by create-story workflow | claude-sonnet-4-6 |
