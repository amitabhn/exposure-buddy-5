# NativeWind v5 Fallback ADR

Date: 2026-05-21
Status: Accepted — triggered by failed NativeWind v5 spike (see docs/spikes/nativewind-v5.md)
Supersedes: NativeWind section of planning-artifacts/adrs/ADR-RN-VERSION.md

## Decision

StyleSheet-based components with explicit a11y props replace NativeWind v5 in `packages/ui`.

`nativewind`, `react-native-css`, and `tailwindcss` are removed from the monorepo. `packages/ui` components use `React Native StyleSheet.create()` exclusively for styling.

## Rationale

Two blocking failures were found during the SPIKE-001 validation spike (2026-05-21):

**1. LightningCSS double-pass incompatibility (AC-1)**

`react-native-css@3.0.7` (NativeWind v5's CSS engine) uses a double-LightningCSS-pass architecture that fails with Tailwind v4.3.0 CSS output:

- `@import "tailwindcss"` triggers LightningCSS 1.32.0 deserialization errors during the second pass
- Tailwind v4's `@supports` with inline comments and `@theme default {}` at-rules are not round-trippable through LightningCSS 1.32.0 serialization
- LightningCSS 1.32.0 is the current latest version — no upgrade path exists
- The only workaround is hand-crafting CSS utility classes instead of using Tailwind's generated utilities, which defeats NativeWind's value proposition

**2. Expo Go runtime failure (AC-1/2/3 blocked)**

NativeWind's custom Metro transformer causes a `getDevServer is not a function (it is Object)` runtime error in Expo Go 54.0.6, preventing the app from loading. This was confirmed by isolation testing (the error disappears when the NativeWind transform is removed). A Dev Client build (EAS or local native) is required to use NativeWind v5-preview — this is significant development overhead not factored into the sprint estimates.

## Consequences

1. `packages/ui` components use `React Native StyleSheet.create()` API exclusively
2. `apps/mobile` does not use a custom Metro transformer — standard `expo/metro-config` only
3. Story 1.4 (Token System and Typography Architecture) must use StyleSheet-based design tokens, not Tailwind utility classes. The token system should define a typed JS/TS constants file (`packages/ui/src/tokens.ts`) exporting spacing, colours, typography, and radius values for use with StyleSheet.
4. Stories in Epics 2–7 that reference NativeWind or `className` must be re-baselined before sprint entry
5. The `tailwind.config.js` in `apps/mobile/` is retained as a plain comment stub (no JSDoc type reference, no working config); `tailwindcss` is not installed and no Tailwind configuration is active
6. `nativewind-env.d.ts` was removed during FALLBACK cleanup (Task 6b); no `className` prop support is needed on RN components

## Downstream Stories Requiring Re-baseline Before Sprint Entry

All stories below that include UI components built in `packages/ui` must have their Dev Notes updated to reference StyleSheet patterns before the story enters a sprint. Stories that are infrastructure-only (data layer, edge functions, CI) are unaffected.

**Immediate re-baseline required (Epic 1 — in current sprint):**

| Story key | Reason |
|---|---|
| `1-4-token-system-and-typography-architecture` | Must define StyleSheet tokens, not Tailwind config |
| `1-5-motion-layout-and-mode-foundations` | Animation approach: Reanimated only, no NativeWind animation utils |
| `1-6-developer-infrastructure-i18n-scaffold-and-accessibility-gates` | A11y gates use raw RN props, not NativeWind class helpers |

**Re-baseline before sprint entry (Epics 2–9 — UI stories only):**

| Story key | Reason |
|---|---|
| `2-1-otp-authentication-registration-and-login` | UI components |
| `2-2-account-creation-safety-checkboxes` | UI components |
| `2-3-preview-challenges-unauthenticated-access` | UI components |
| `2-4-account-deletion-and-session-sign-out` | UI components |
| `4-1-onboarding-flow-shell-and-navigation` | UI components |
| `4-2-fear-ladder-introduction-and-suds-calibration` | UI components |
| `4-3-initial-fear-ladder-setup` | UI components |
| `4-4-onboarding-completion-and-home-screen-entry` | UI components |
| `5-1-full-courage-ladder-screen` | UI components |
| `5-2-erp-session-start-and-suds-entry` | UI components |
| `5-3-erp-session-completion-debrief-and-home-state` | UI components |
| `6-1-technique-selection-and-pre-exposure-briefing` | UI components |
| `6-2-home-screen-morning-state-state-3` | UI components |
| `6-3-home-screen-progressing-state-state-4` | UI components |
| `6-4-re-engagement-after-gap-state-9` | UI components |
| `7-1-calm-me-shell-courage-affirmation-and-action-decision-routing` | UI components |
| `7-2-breathing-coach` | UI components |
| `7-3-5-4-3-2-1-sensory-grounding-exercise` | UI components |
| `7-4-helpline-signpost` | UI components |
| `7-5-grounding-screen-full-technique-picker` | UI components |
| `8-5-achievements-tab-suds-trend-session-history-and-arc` | UI components |
| `9-3-accessibility-audit-and-p0-p1-remediation` | Depends on a11y approach |
| `9-6-error-state-and-empty-state-ux-audit` | UI components |

**Not affected (data/infra stories):**

`1-7` (data/infra — no UI components), `3-1` through `3-5`, `4-x` data parts, `5-4`, `5-5`, `8-1` through `8-4`, `9-1`, `9-2`, `9-4`, `9-5`, `9-7`, `9-8`

## StyleSheet Fallback Pattern for packages/ui

Components in `packages/ui/src/` should follow this pattern:

```typescript
import { View, Text, StyleSheet } from 'react-native'
import { tokens } from './tokens'  // defined in Story 1.4

export function ExampleCard({ label }: { label: string }) {
  return (
    <View
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: tokens.spacing[4],
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.primary,
  },
  label: {
    fontSize: tokens.fontSize.lg,
    color: tokens.color.onPrimary,
  },
})
```

All a11y props (`accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, `accessibilityLiveRegion`) must be set explicitly on every interactive and meaningful element — there is no NativeWind class helper to provide them.
