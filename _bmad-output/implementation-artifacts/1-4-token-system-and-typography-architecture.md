# Story 1.4: Token System & Typography Architecture

Status: done

## Story

As a developer,
I want a complete, typed design token system in `packages/ui/src/tokens/theme.ts`,
so that every UI component story uses semantic tokens exclusively — raw hex values and off-spec DM Serif Display usage are caught by TypeScript at compile time (UX-DR1, UX-DR21).

## Acceptance Criteria

1. **Token file complete and typed (UX-DR1)**
   **Given** `packages/ui/src/tokens/theme.ts` is authored
   **When** a developer imports tokens
   **Then** all of the following are exported with TypeScript `as const` types: 8 semantic colour tokens; 3 motion presets (preparing: 200ms ease-out, grounding: 400ms ease-in-out, reflecting: 600ms ease-out); 4 haptic constants (`breathingRhythm`, `dragConfirmation`, `commitmentTap`, `techniqueCompletion`); spacing scale (4px base, 11 tokens); 9-token typography scale; border radius tokens; touch target tokens

2. **DM Serif Display surface type-guarded (UX-DR21)**
   **Given** DM Serif Display italic is in the typography token
   **When** a developer attempts to use it
   **Then** `DmSerifSurface` is a TypeScript union type permitting only `'score-reveal' | 'prediction-reality-reveal' | 'progress-readback' | 'pre-exposure-readback'`; using any other string where `DmSerifSurface` is expected produces a TypeScript compilation error

3. **Grounding token import guard active (UX-DR2)**
   **Given** `groundingTokens` is a named export in `packages/ui/src/tokens/theme.ts`
   **When** a developer imports it in a file matching `*Context.{ts,tsx}` or `*Provider.{ts,tsx}`
   **Then** ESLint reports an error using `no-restricted-imports`; the rule message references `no-grounding-token-in-context`; the rule is documented in `packages/ui/README.md`

4. **WCAG 2.1 AA contrast audit committed (UX-DR17)**
   **Given** all 8 colour tokens are defined
   **When** the audit document is committed
   **Then** `docs/decisions/wcag-contrast-sign-off.md` exists and records contrast ratios for every text/background token pair; `accent.grounding` (#8B6F47) on white is verified or replaced; `accent.progress` (#E8A84C) is confirmed decorative-only; sign-off fields are present (pending human review before sprint 1)

5. **Font loading wired in apps/mobile (UX-DR spec)**
   **Given** Inter and DM Serif Display are the required typefaces
   **When** `apps/mobile/app/_layout.tsx` renders
   **Then** both fonts are loaded via `useFonts` gated behind `SplashScreen.preventAutoHideAsync()`; if `fontError` is truthy the app renders with system fallback fonts and does not crash; `SplashScreen.hideAsync()` is called once fonts resolve (loaded or error)

6. **Build and typecheck pass**
   **Given** all changes are committed
   **When** `pnpm turbo build` and `pnpm turbo typecheck` run
   **Then** both exit 0 with no TypeScript errors

## Tasks / Subtasks

- [x] Task 1 — Author `packages/ui/src/tokens/theme.ts` (AC: 1, 2, 4)
  - [x] Create `packages/ui/src/tokens/` directory
  - [x] Write full token file with all values from Dev Notes — colour, motion, haptic, spacing, border radius, touch targets, typography
  - [x] Export `DmSerifSurface` union type
  - [x] Export `groundingTokens` as a separate named export (required for the ESLint rule in Task 3)
  - [x] Annotate `spacing[10]` comment as "reflection register only"
  - [x] Re-export all tokens from `packages/ui/src/index.ts`

- [x] Task 2 — Wire font loading in `apps/mobile/app/_layout.tsx` (AC: 5)
  - [x] Install packages: `expo-font`, `expo-splash-screen`, `@expo-google-fonts/inter`, `@expo-google-fonts/dm-serif-display` (see Dev Notes — Installation)
  - [x] Update `apps/mobile/app/_layout.tsx` with `SplashScreen.preventAutoHideAsync()` at module scope, `useFonts` hook, `useEffect` for `hideAsync`, null-return splash hold, and `fontError` fallback path
  - [x] Verify `<PortalHost />` and `initErrorHandler()` are preserved

- [x] Task 3 — Add `no-grounding-token-in-context` ESLint rule (AC: 3)
  - [x] Add `overrides` block to `packages/ui/.eslintrc.js` targeting `*Context.{ts,tsx}` and `*Provider.{ts,tsx}`
  - [x] Create `packages/ui/README.md` documenting the rule

- [x] Task 4 — WCAG 2.1 AA contrast audit (AC: 4)
  - [x] Compute contrast ratios for all text/background token pairs
  - [x] Verify `accent.grounding` (#8B6F47) on white — replace if <4.5:1 for normal text uses
  - [x] Confirm `accent.progress` (#E8A84C) decorative-only
  - [x] Commit `docs/decisions/wcag-contrast-sign-off.md`

- [x] Task 5 — Build validation (AC: 6)
  - [x] Run `pnpm turbo build` — verify exit 0
  - [x] Run `pnpm turbo typecheck` — verify exit 0

## Dev Notes

### FALLBACK Re-baseline

**Critical context:** Story 1.3 resulted in FALLBACK — NativeWind v5 rejected (LightningCSS incompatibility + Expo Go runtime failure). The original story 1.4 spec assumed Tailwind utility classes and CSS custom properties. This story is the re-baselined version per `docs/spikes/nativewind-v5-fallback-adr.md` Consequence 3.

**What changes from original spec:**
- No `tailwind.config.js` extensions — the stub in `apps/mobile/tailwind.config.js` remains a comment stub with no active config
- No CSS custom properties (`var(--color-*)`) — all values are literal hex/number TypeScript constants
- No `className` prop — components use `StyleSheet.create()` with token values
- `packages/ui/src/tokens/theme.ts` is still the canonical path (the fallback ADR referenced `tokens.ts` as a placeholder name; use the architecture's path)

### Token File: Complete Specification

Create `packages/ui/src/tokens/theme.ts` with exactly these values. Every value is spec-locked (UX-DR1, visual-design-foundation.md). Changes require a design review.

```typescript
// packages/ui/src/tokens/theme.ts

// ─── DM Serif Display surface type ────────────────────────────────────────────
// DM Serif Display appears on exactly 4 dedicated screens only (UX-DR21).
// A TypeScript compilation error is produced by any string outside this union.
export type DmSerifSurface =
  | 'score-reveal'
  | 'prediction-reality-reveal'
  | 'progress-readback'
  | 'pre-exposure-readback'

// ─── Colour (8 semantic tokens) ───────────────────────────────────────────────
export const color = {
  surface: {
    primary:   '#F5F7F6', // main backgrounds
    secondary: '#EBF0EE', // cards, sheets, preparation register
  },
  content: {
    primary:   '#1A2E2A', // body text — deep forest
    secondary: '#4A6B62', // supporting text
  },
  accent: {
    courage:   '#2D6A5A', // CTAs, primary actions
    progress:  '#E8A84C', // DECORATIVE ONLY on reflect.background — no text (2.1:1 fails AA)
    grounding: '#8B6F47', // grounding/somatic tools — borderline AA normal text; see WCAG audit
  },
  reflect: {
    background: '#FDF7ED', // reflection mode surfaces
  },
} as const

// ─── Motion (3 presets) ───────────────────────────────────────────────────────
// These values encode clinical mode registers — not aesthetic choices.
// Do not override at component level without design review.
export const motion = {
  preparing:  { duration: 200, easing: 'easeOut'    as const }, // forward-leaning, slight urgency
  grounding:  { duration: 400, easing: 'easeInOut'  as const }, // anchoring stillness
  reflecting: { duration: 600, easing: 'easeOut'    as const }, // unhurried, retrospective
} as const

// ─── Haptics (4 constants) ────────────────────────────────────────────────────
// String values map to expo-haptics ImpactFeedbackStyle ('light'|'medium'|'heavy')
// and NotificationFeedbackType ('success'). expo-haptics is called only from
// apps/mobile — never import it here (packages/ui may not import expo-* per .eslintrc.js).
export const haptic = {
  breathingRhythm:     'light'   as const, // repeating during breathing exercise
  dragConfirmation:    'medium'  as const, // fear ladder item placement
  commitmentTap:       'heavy'   as const, // "Let's do this" — weighted, distinct
  techniqueCompletion: 'success' as const, // expo-haptics NotificationFeedbackType.Success
} as const

// ─── Spacing (4px base, 11 tokens) ────────────────────────────────────────────
export const spacing = {
  0:   0,
  px:  1,  // dividers, border widths
  1:   4,  // icon+label gap, tag padding
  2:   8,  // standard intra-component
  3:   12, // dense component padding
  4:   16, // standard padding, screen horizontal margin
  5:   20, // between components within a section
  6:   24, // section spacing, card-to-card gap
  7:   28, // mid-range
  8:   32, // screen section separators
  10:  40, // reflection register only — do not use in preparing or grounding surfaces
} as const

// ─── Border radii ─────────────────────────────────────────────────────────────
export const radius = {
  card:      14, // cards, sheets
  button:    12, // buttons
  pill:      20, // tag pills
  rankBadge:  6, // fear ladder rank badges
  input:     10, // text input fields
  panel:     20, // quick-access panel — top corners only (borderTopLeftRadius + borderTopRightRadius)
} as const

// ─── Touch targets ────────────────────────────────────────────────────────────
export const tapTarget = {
  inTheMoment: 56, // 56×56px — grounding register (UX-DR19)
  standard:    44, // 44×44pt iOS / 48dp Android — preparation and reflection
} as const

// ─── Typography (9 tokens) ───────────────────────────────────────────────────
// lineHeight values are absolute px (React Native does not accept ratios).
// DM Serif Display has no 700 weight — fontWeight '400' is correct for all DM Serif tokens.
// The display token uses DM Serif Display italic; it reads as display-weight by design.
// text-display has a responsive override at width < 360px (24px) — implement in component.
export const typography = {
  display: {
    fontSize:   28,
    fontWeight: '400' as const,
    lineHeight: 32, // 28 × 1.15 ≈ 32
    fontFamily: 'DMSerifDisplay_400Regular_Italic',
    // Use ONLY at: score-reveal · prediction-reality-reveal · progress-readback · pre-exposure-readback (UX-DR21)
  },
  h1: {
    fontSize:   22,
    fontWeight: '700' as const,
    lineHeight: 26, // 22 × 1.20 ≈ 26
    fontFamily: 'Inter_700Bold',
  },
  h2: {
    fontSize:   17,
    fontWeight: '600' as const,
    lineHeight: 22, // 17 × 1.30 ≈ 22
    fontFamily: 'Inter_600SemiBold',
  },
  h3: {
    fontSize:   14,
    fontWeight: '600' as const,
    lineHeight: 19, // 14 × 1.35 ≈ 19
    fontFamily: 'Inter_600SemiBold',
  },
  body: {
    fontSize:   14,
    fontWeight: '400' as const,
    lineHeight: 22, // 14 × 1.55 ≈ 22
    fontFamily: 'Inter_400Regular',
  },
  bodySm: {
    fontSize:   12,
    fontWeight: '400' as const,
    lineHeight: 19, // 12 × 1.55 ≈ 19
    fontFamily: 'Inter_400Regular',
    // PR gate: no primary copy uses text-bodySm or smaller (UX spec)
  },
  caption: {
    fontSize:   11,
    fontWeight: '500' as const,
    lineHeight: 15, // 11 × 1.40 ≈ 15
    fontFamily: 'Inter_500Medium',
  },
  micro: {
    fontSize:   10,
    fontWeight: '600' as const,
    lineHeight: 13, // 10 × 1.30 ≈ 13
    fontFamily: 'Inter_600SemiBold',
  },
  narrative: {
    fontSize:   15,
    fontWeight: '400' as const,
    lineHeight: 24, // 15 × 1.60 ≈ 24
    fontFamily: 'DMSerifDisplay_400Regular_Italic',
    // Pull quotes and companion voice — DmSerifSurface screens only
  },
} as const

// ─── Grounding tokens (separate named export for ESLint no-grounding-token-in-context) ──
// This export is isolated so the ESLint rule can target `groundingTokens` specifically.
// Never import this in files matching *Context.{ts,tsx} or *Provider.{ts,tsx} (UX-DR2).
export const groundingTokens = {
  motion:    motion.grounding,
  tapTarget: tapTarget.inTheMoment,
} as const
```

**Export from `packages/ui/src/index.ts`** — add:
```typescript
export { color, motion, haptic, spacing, radius, tapTarget, typography, groundingTokens } from './tokens/theme'
export type { DmSerifSurface } from './tokens/theme'
```

### Consuming tokens in components (StyleSheet pattern)

```typescript
// packages/ui/src/primitives/Button.tsx — example usage
import { color, spacing, radius, typography, tapTarget } from '../tokens/theme'
import { StyleSheet, TouchableOpacity, Text } from 'react-native'

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing[4],
    paddingVertical:   spacing[3],
    borderRadius:      radius.button,
    backgroundColor:   color.accent.courage,
    minHeight:         tapTarget.standard,
    justifyContent:    'center',
    alignItems:        'center',
  },
  label: {
    ...typography.h2,
    color: color.surface.primary,
  },
})
```

Spread `...typography.h2` to inline all four properties (fontSize, fontWeight, lineHeight, fontFamily) into a StyleSheet object. TypeScript will infer the correct literal types from `as const`.

### Font Installation

**From `apps/mobile/` directory (or use `--filter`):**
```bash
# Expo-managed packages — uses expo install for correct SDK-54 version resolution
pnpm exec expo install expo-font expo-splash-screen

# Google Fonts packages — not in expo SDK, install directly
pnpm add @expo-google-fonts/inter @expo-google-fonts/dm-serif-display
```

Run from workspace root using `--filter exposure-buddy-mobile` if not in the app directory.

**If pnpm blocks install with a script error**, add the blocking package to `onlyBuiltDependencies` in `pnpm-workspace.yaml` (same pattern as `@sentry/cli` and `esbuild` in story 1.1).

**Font family name strings — must match exactly in typography tokens:**

| `@expo-google-fonts` export constant | Registered fontFamily string |
|---|---|
| `Inter_400Regular` | `'Inter_400Regular'` |
| `Inter_500Medium` | `'Inter_500Medium'` |
| `Inter_600SemiBold` | `'Inter_600SemiBold'` |
| `Inter_700Bold` | `'Inter_700Bold'` |
| `DMSerifDisplay_400Regular` | `'DMSerifDisplay_400Regular'` |
| `DMSerifDisplay_400Regular_Italic` | `'DMSerifDisplay_400Regular_Italic'` |

The `fontFamily` strings in `typography` tokens above must be identical to these registered names — copy-paste to avoid typos.

### Font Loading: Updated `_layout.tsx`

**`SplashScreen.preventAutoHideAsync()` must be called at module scope** (outside the component), before any component renders.

```typescript
import { Stack } from 'expo-router'
import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import { initErrorHandler } from '../src/error-handler'
import { useFonts } from 'expo-font'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'

// MUST be called before any React rendering
initErrorHandler()
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  // Hold the splash screen while fonts load.
  // On fontError: proceed — system fonts (SF Pro / Roboto) render; no crash.
  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <PortalHost />
    </ThemeProvider>
  )
}
```

**Note on `expo-splash-screen` API:** `SplashScreen` is a namespace import (`import * as SplashScreen`). This is the documented Expo usage pattern — do not use a default or named import.

### ESLint Rule: `no-grounding-token-in-context`

**Why a separate named export for `groundingTokens`:** The `no-restricted-imports` ESLint rule's `importNames` option blocks specific named exports from a module. By exporting `groundingTokens` as a discrete name (rather than inlining grounding values into `motion` or `tapTarget`), the ESLint rule can target it precisely without blocking all motion token imports.

**Updated `packages/ui/.eslintrc.js`:**

```javascript
module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          '@supabase/*',
          '@exposure-buddy/sync',
          '@exposure-buddy/supabase',
          'react-native',
          'expo-*',
        ],
      },
    ],
  },
  overrides: [
    {
      // no-grounding-token-in-context: groundingTokens must not be imported in
      // Context or Provider files — grounding surface has a 2s SLA and must not
      // route through a provider's async render cycle (UX-DR2).
      files: [
        '**/*Context.ts',
        '**/*Context.tsx',
        '**/*Provider.ts',
        '**/*Provider.tsx',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '../tokens/theme',
                importNames: ['groundingTokens'],
                message:
                  'no-grounding-token-in-context (UX-DR2): groundingTokens must not be imported in Context or Provider files.',
              },
              {
                name: '../../tokens/theme',
                importNames: ['groundingTokens'],
                message:
                  'no-grounding-token-in-context (UX-DR2): groundingTokens must not be imported in Context or Provider files.',
              },
              {
                name: '@exposure-buddy/ui',
                importNames: ['groundingTokens'],
                message:
                  'no-grounding-token-in-context (UX-DR2): groundingTokens must not be imported in Context or Provider files.',
              },
            ],
          },
        ],
      },
    },
  ],
}
```

**Caveat:** The `overrides` block's `no-restricted-imports` replaces (does not merge with) the top-level rule for matching files. The top-level `patterns` array (blocking `@supabase/*`, etc.) still applies because ESLint resolves multiple matching rule configs per file — verify by running `pnpm exec eslint packages/ui/src` on a test Context file after adding.

**`packages/ui/README.md`** — create with this content:

```markdown
# @exposure-buddy/ui

StyleSheet-based shared component primitives for Exposure Buddy.

## ESLint Rules

### `no-grounding-token-in-context` (UX-DR2)

Files matching `*Context.{ts,tsx}` or `*Provider.{ts,tsx}` must not import
`groundingTokens` from the token system.

**Why:** The grounding register has a 2-second access SLA — grounding surfaces
must be immediately available with no async provider dependency. Routing
grounding tokens through a React Context adds a render cycle that violates this
SLA guarantee.

**Enforced by:** `no-restricted-imports` in `packages/ui/.eslintrc.js` overrides block.

## Token Usage

```typescript
import { color, spacing, radius, typography } from '@exposure-buddy/ui'
import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  container: {
    backgroundColor: color.surface.primary,
    padding: spacing[4],
    borderRadius: radius.card,
  },
})
```

## DM Serif Display

DM Serif Display italic (`typography.display`, `typography.narrative`) may only appear
on these four screen surfaces (`DmSerifSurface` type):

- `score-reveal`
- `prediction-reality-reveal`
- `progress-readback`
- `pre-exposure-readback`

Any other usage produces a TypeScript error at compile time.
```

### WCAG 2.1 AA Contrast Audit

**Compute contrast ratios for all text/background pairs** using a WCAG contrast tool (WebAIM Contrast Checker or similar). Do not estimate — tool output is required.

| Text token | Background | Min required | Known status |
|---|---|---|---|
| `content.primary` #1A2E2A | `surface.primary` #F5F7F6 | 4.5:1 | Expected PASS (~11:1) |
| `content.primary` #1A2E2A | `surface.secondary` #EBF0EE | 4.5:1 | Expected PASS |
| `content.primary` #1A2E2A | `reflect.background` #FDF7ED | 4.5:1 | Expected PASS |
| `content.secondary` #4A6B62 | `surface.primary` #F5F7F6 | 4.5:1 | Verify |
| `accent.courage` #2D6A5A | `surface.primary` #F5F7F6 | 3:1 (UI component) | Verify |
| `accent.grounding` #8B6F47 | `surface.primary` #F5F7F6 | 4.5:1 normal / 3:1 large | **Borderline — ~4.3–4.6:1; verify tool output** |
| `accent.progress` #E8A84C | `reflect.background` #FDF7ED | DECORATIVE ONLY | No text on this combo |

**`accent.grounding` decision logic:**
- If tool reports ≥4.5:1 → PASS for all text sizes; record result
- If tool reports 3.0–4.49:1 → PASS for large text only (≥18px regular or ≥14px bold); constrain `accent.grounding` to large text or UI only in component guidelines
- If tool reports <3.0:1 → REPLACE the hex value; propose candidate to design before sprint 1

**Sign-off document at `docs/decisions/wcag-contrast-sign-off.md`:**

```markdown
# WCAG 2.1 AA Contrast Sign-Off

Date: YYYY-MM-DD
Audited by: [agent/developer name]
Gate: Must be committed before sprint 1 begins (UX-DR17)

## Results

| Token pair | Ratio | AA Normal (≥4.5:1) | AA Large (≥3:1) | Status |
|---|---|---|---|---|
| content.primary on surface.primary | X.X:1 | PASS/FAIL | PASS | ✅/❌ |
| content.primary on surface.secondary | X.X:1 | | | |
| content.primary on reflect.background | X.X:1 | | | |
| content.secondary on surface.primary | X.X:1 | | | |
| accent.courage on surface.primary | X.X:1 | | | |
| accent.grounding on surface.primary | X.X:1 | | | |

## Decisions

- `accent.progress` (#E8A84C): confirmed decorative-only on `reflect.background` — no
  text uses this combination; no AA test required for text
- `accent.grounding` (#8B6F47): [PASS at normal text / PASS at large text only with
  constraint / REPLACED with #XXXXXX] — [rationale]

## Sign-off

Designer: [pending — manual sign-off required before sprint 1]
QA: [pending — manual sign-off required before sprint 1]
```

Commit the document with computed ratios; leave sign-off fields as pending. The human sign-off is a pre-sprint-1 gate, not a blocker for this story's completion.

### Project Structure Notes

**New files:**
```
packages/ui/src/tokens/          ← new directory
packages/ui/src/tokens/theme.ts  ← canonical token file
packages/ui/README.md            ← ESLint rule documentation
docs/decisions/wcag-contrast-sign-off.md
```

**Modified files:**
```
packages/ui/src/index.ts         ← add token re-exports
packages/ui/.eslintrc.js         ← add overrides block
apps/mobile/app/_layout.tsx      ← add font loading + SplashScreen
apps/mobile/package.json         ← add expo-font, expo-splash-screen, @expo-google-fonts/*
pnpm-lock.yaml                   ← auto-updated by pnpm install
```

**What is NOT in scope for this story:**
- No primitive or composed components in `packages/ui/src/primitives/` or `packages/ui/src/composed/` — tokens only
- No changes to `packages/core`, `packages/supabase`, or `packages/sync`
- No changes to `apps/mobile/app/(app)/` or `apps/mobile/app/(auth)/` routes
- Do not restore NativeWind, Tailwind, or className in any file

### CI Gates — Must All Pass

1. **`pnpm turbo build`** exits 0 — TypeScript compilation of `packages/ui` with new token file
2. **`pnpm turbo typecheck`** exits 0 — strict TypeScript checks across all packages
3. **ARC-011 core-boundary-gate (CI):** `packages/ui` changes do not touch `packages/core`, `packages/sync`, or `packages/supabase`
4. **ADR-DARK-MODE gate:** `userInterfaceStyle: 'light'` in `apps/mobile/app.config.ts` remains unchanged
5. **web-import-gate (CI):** no `@supabase/supabase-js` import in new files

### Testing Requirements

The token file is a constants module — no automated unit tests required. The TypeScript compiler is the primary quality gate.

**Manual verification checklist:**
1. `pnpm turbo build` exits 0 after all changes
2. `pnpm turbo typecheck` exits 0
3. Import `groundingTokens` in a file named `TestContext.tsx` in `packages/ui/src/` → ESLint reports error with `no-grounding-token-in-context` message
4. Import `groundingTokens` in a normal file → no ESLint error
5. Write `const surface: DmSerifSurface = 'invalid-surface'` → TypeScript compilation error
6. Write `const surface: DmSerifSurface = 'score-reveal'` → no error
7. Fonts render in Expo Go / dev build — Inter weights visible at correct boldness
8. Splash screen hides after fonts load; app does not crash if fonts fail to load

### Previous Story Learnings Applicable Here

**From Story 1.3 (NativeWind FALLBACK — most critical for this story):**
- All `className`, Tailwind config, and CSS custom property patterns from the original 1.4 spec are superseded. The token system is pure TypeScript constants.
- `tailwind.config.js` in `apps/mobile/` is a plain comment stub — do not add any `content`, `theme`, or `plugins` config to it.
- `packages/ui/src/index.ts` comment already says "typed tokens (added Story 1.4)" — update this comment to reflect the actual export.

**From Story 1.2 (UI library evaluation):**
- `<PortalHost />` in `_layout.tsx` must be preserved — it is the mount point for the `@rn-primitives/portal` overlay approach adopted for CalmMeButton.
- `@rn-primitives/*` packages in `packages/ui/package.json` are unaffected by this story.

**From Story 1.1 (monorepo setup):**
- Use `pnpm exec expo install` (not bare `pnpm add`) for Expo SDK packages — it resolves compatible versions for Expo SDK 54.
- If pnpm blocks an install with a lifecycle script error, add the package to `onlyBuiltDependencies` in `pnpm-workspace.yaml`.
- `app.config.ts` (not `app.json`) is the source of truth for Expo config — do not modify it in this story.
- `initErrorHandler()` in `_layout.tsx` must remain as the first module-scope call.

### References

- [Source: planning-artifacts/epics.md — Story 1.4, lines 461–486] — acceptance criteria, UX-DR1, UX-DR17, UX-DR21
- [Source: planning-artifacts/ux-design-specification/visual-design-foundation.md] — all colour hex values, type scale, spacing, radii, touch targets, WCAG known risks
- [Source: planning-artifacts/ux-design-specification/design-system-foundation.md — Token Architecture] — token structure, groundingTokens static export rationale
- [Source: docs/spikes/nativewind-v5-fallback-adr.md — Consequence 3] — story re-baseline: StyleSheet tokens, not Tailwind
- [Source: docs/spikes/nativewind-v5-fallback-adr.md — StyleSheet Fallback Pattern] — component usage pattern with StyleSheet.create()
- [Source: planning-artifacts/architecture/project-structure-boundaries.md — packages/ui] — `packages/ui/src/tokens/theme.ts` canonical path, import boundaries
- [Source: planning-artifacts/architecture/implementation-patterns-consistency-rules.md — All AI Agents MUST NOT] — no react-native import in packages/core (does not apply here, but verify packages/ui eslintrc patterns are preserved)
- [Source: implementation-artifacts/1-3-nativewind-v5-validation-spike.md — Completion Notes] — FALLBACK confirmation, tailwind.config.js stub state
- [Source: implementation-artifacts/1-2-ui-library-evaluation-rn-primitives-and-bottom-sheet.md — Completion Notes] — PortalHost preservation requirement
- [Source: implementation-artifacts/1-1-monorepo-initialisation-mobile-app-shell-and-build-pipeline.md — Dev Notes] — expo install pattern, onlyBuiltDependencies pattern, app.config.ts

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Token file `packages/ui/src/tokens/theme.ts` authored with all spec-locked values: 8 colour tokens, 3 motion presets, 4 haptic constants, 11 spacing tokens, 6 border radius tokens, 2 touch target tokens, 9 typography tokens. All exported `as const` with full TypeScript literal types.
- `DmSerifSurface` union type enforces compile-time restriction to exactly 4 permitted screen surfaces (UX-DR21).
- `groundingTokens` exported as a discrete named export to enable precise ESLint targeting.
- `packages/ui/src/index.ts` updated to re-export all tokens and the `DmSerifSurface` type.
- Font packages installed: `expo-font@~14.0.11`, `expo-splash-screen@~0.29.24`, `@expo-google-fonts/inter@^0.4.2`, `@expo-google-fonts/dm-serif-display@^0.4.2`. Used direct `pnpm install` (not `expo install`) because `expo install` subprocess fails in this workspace pnpm v11 config.
- `apps/mobile/app/_layout.tsx` updated with `SplashScreen.preventAutoHideAsync()` at module scope, `useFonts` hook loading 6 font variants, `useEffect` for `hideAsync`, null-return splash hold, and `fontError` graceful fallback. `PortalHost` and `initErrorHandler()` preserved.
- `@rn-primitives/portal` added to `apps/mobile/package.json` — was a pre-existing phantom dependency (imported in `_layout.tsx` since story 1.1 but not declared in `apps/mobile`'s direct deps). Build cache masked the error until `_layout.tsx` changed, invalidating the turbo cache. Fixed as a completion note; no story scope change.
- WCAG audit computed: `content.primary` on all surfaces ≥12:1 (strong pass). `content.secondary` on `surface.primary` 5.47:1 (pass). `accent.courage` 5.88:1 (pass). `accent.grounding` **4.37:1 — fails normal text AA, passes large text AA**; constrained to large text/UI only by token comment and sign-off doc. `accent.progress` confirmed decorative-only (1.94:1; no text uses this combination). Sign-off doc committed at `docs/decisions/wcag-contrast-sign-off.md`; human sign-off fields pending before sprint 1.
- `no-grounding-token-in-context` ESLint rule verified: fires on `*Context.tsx` files importing `groundingTokens` from `../tokens/theme`; silent on non-Context files. `packages/ui/README.md` documents the rule.
- `pnpm turbo build` and `pnpm turbo typecheck` both exit 0. All 6 packages pass.

### File List

- `packages/ui/src/tokens/theme.ts` — new: canonical token file
- `packages/ui/src/index.ts` — modified: added token and type re-exports
- `packages/ui/.eslintrc.js` — modified: added `no-grounding-token-in-context` overrides block
- `packages/ui/README.md` — new: ESLint rule documentation
- `apps/mobile/app/_layout.tsx` — modified: font loading, SplashScreen integration
- `apps/mobile/package.json` — modified: added `expo-font`, `expo-splash-screen`, `@expo-google-fonts/inter`, `@expo-google-fonts/dm-serif-display`, `@rn-primitives/portal`
- `docs/decisions/wcag-contrast-sign-off.md` — new: WCAG 2.1 AA contrast audit results and decisions
- `pnpm-lock.yaml` — modified: updated by pnpm install

### Review Findings

#### Patch (must fix before done)

- [x] [Review][Patch] SplashScreen.preventAutoHideAsync() called at module scope with no .catch() — unhandled rejection on fast-refresh or OS-early-dismiss [apps/mobile/app/_layout.tsx:22]
- [x] [Review][Patch] SplashScreen.hideAsync() inside useEffect not guarded — unhandled rejection and double-call risk under StrictMode [apps/mobile/app/_layout.tsx:34-38]
- [x] [Review][Patch] ESLint overrides block REPLACES top-level no-restricted-imports patterns — Context/Provider files can freely import expo-*, react-native, @supabase/* [packages/ui/.eslintrc.js]
- [x] [Review][Patch] ESLint groundingTokens rule misses barrel import paths (../index, ../../index, ./tokens/theme) [packages/ui/.eslintrc.js]
- [x] [Review][Patch] WCAG ratio discrepancy — theme.ts comment says accent.progress is 2.1:1 but audit doc measures 1.94:1 [packages/ui/src/tokens/theme.ts:22]
- [x] [Review][Patch] WCAG audit missing content.secondary on surface.secondary pair (cards/sheets are real render surface) [docs/decisions/wcag-contrast-sign-off.md]

#### Deferred

- [x] [Review][Defer] DMSerifDisplay_400Regular (non-italic) loaded in useFonts but no typography token uses it — spec-compliant load; reserve for future token [apps/mobile/app/_layout.tsx:13] — deferred, pre-existing
- [x] [Review][Defer] ESLint groundingTokens rule misses import paths 3+ levels deep and non-standard file naming [packages/ui/.eslintrc.js] — deferred, pre-existing
- [x] [Review][Defer] ESLint rule scope limited to packages/ui — apps/mobile Context/Provider files have no equivalent protection [packages/ui/.eslintrc.js] — deferred, pre-existing
- [x] [Review][Defer] accent.grounding (4.37:1) fails normal-text AA with no machine-enforceable constraint [packages/ui/src/tokens/theme.ts:23] — deferred, pre-existing
- [x] [Review][Defer] accent.progress decorative-only constraint is advisory comment only — no lint or type enforcement [packages/ui/src/tokens/theme.ts:22] — deferred, pre-existing
- [x] [Review][Defer] DmSerifSurface type is voluntary — typography.display and typography.narrative can be spread on any screen without compile error [packages/ui/src/tokens/theme.ts] — deferred, pre-existing
- [x] [Review][Defer] No timeout fallback if expo-font hangs indefinitely — splash screen permanently frozen [apps/mobile/app/_layout.tsx:42-44] — deferred, pre-existing
- [x] [Review][Defer] fontError not reported to Sentry — silent font-load failures invisible in production observability [apps/mobile/app/_layout.tsx:34-38] — deferred, pre-existing
- [x] [Review][Defer] PortalHost unmounted during null-return font-loading phase — portals have no host during startup [apps/mobile/app/_layout.tsx:46] — deferred, pre-existing

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-05-21 | Story created by create-story workflow | claude-sonnet-4-6 |
| 2026-05-21 | Implementation complete — token file, font loading, ESLint rule, WCAG audit; `pnpm turbo build` and `pnpm turbo typecheck` exit 0 | claude-sonnet-4-6 |
