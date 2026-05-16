# Design System Foundation

> **Architecture constraint:** This section operates within ADR-001 (closed). NativeWind `5.0.0-preview.3`, Turborepo + pnpm, and the `packages/ui` boundary are resolved decisions — not open questions. No content here reopens those ADRs.

## Design System Choice

**NativeWind `5.0.0-preview.3` (Tailwind CSS v4) via `packages/ui`**

The design system is built on the styling architecture already resolved in the system architecture document. `packages/ui` is the shared component and token package. All design tokens, primitives, and composed clinical components live here. The two-layer design language is expressed through NativeWind v5 class conventions shared across platforms — with platform-specific interaction patterns handled at the component level.

| Layer | Location | Purpose |
|-------|----------|---------|
| Shared design language | `packages/ui/src/tokens/theme.ts` | Colour, typography, spacing, motion, haptics — typed TS constants mirroring CSS custom properties |
| Mobile primitives | `packages/ui/src/primitives/` — NativeWind v5 styled | Button, Text, Input, Card — gesture-first, accessible |
| Mobile composed | `packages/ui/src/composed/` | SudsScale, ProgressChart, CrisisCard — clinical UI compositions with mode-conditional behaviour |
| Web components | `apps/web` — Phase 2 placeholder | Web design system deferred; `apps/web` contains no active stack at MVP |

> **Phase 2 web transition:** When `apps/web` activates, `packages/ui/src/tokens/theme.ts` is the starting point for web token expression via Tailwind CSS v4. Do not backport mobile clinical component behaviour to web without a dedicated UX session.

**NativeWind v5 / Tailwind CSS v4 note:** NativeWind v5 uses a CSS-first configuration model — CSS custom properties rather than the `tailwind.config.js` JS object approach of v3. Token definitions, theme extensions, and class references must use the v5 API. Version pinned to exact: `nativewind@5.0.0-preview.3`. Review required at each preview bump before upgrading.

---

## Rationale for Selection

**Architecture-resolved, not design-system-chosen.** NativeWind v5 is a closed ADR decision. The design system's role is to document how to use it well — not whether to use it.

**Two-layer architecture expressed through NativeWind v5.** The shared design language (colour, typography, spacing, motion) is expressed as Tailwind class strings that work identically on mobile via NativeWind v5 and will work on web via Tailwind CSS v4 at Phase 2. Platform-specific layers handle where that abstraction breaks down.

**`packages/ui` import boundary (from architecture).** This package may import from `packages/core` (types only). Forbidden: `packages/sync`, `packages/supabase`, RN platform APIs. Enforced by `packages/ui/.eslintrc.js` in CI.

**Raw Tailwind bypass prohibited in composed components.** All colour and spacing values in `packages/ui/src/composed/` must reference design tokens — not raw Tailwind utility values (`bg-blue-500`, `p-4`). Raw utility values applied without token indirection violate the mode register system and produce clinical surfaces that look correct but feel wrong. This constraint is written into the spec now; a lint rule enforces it when the package is built.

**StyleSheet as escape hatch, not primary.** NativeWind v5 class resolution is the canonical styling path. `StyleSheet` is used for: animated components (Reanimated requires StyleSheet or worklet values), imperative style calculations, and edge cases where NativeWind v5 pre-release behaviour produces unexpected results on a specific platform. StyleSheet usage outside these cases is flagged in code review.

**rn-primitives + @gorhom/bottom-sheet evaluated in Phase 0.** Before building scratch components, evaluate `react-native-reusables` (rn-primitives, NativeWind-native, accessible) and `@gorhom/bottom-sheet` (Gesture Handler-based, Expo-compatible). Written decision memo required. Time-boxed to 1 day.

---

## Token Architecture

**Single source: `packages/ui/src/tokens/theme.ts`**

Tokens are typed TypeScript constants that serve two consumers: NativeWind v5 theme extensions (CSS custom properties → utility classes) and imperative TypeScript (animations, haptic timing, StyleSheet fallbacks).

```typescript
// packages/ui/src/tokens/theme.ts (illustrative structure)
export const color = {
  surface: { primary: 'var(--color-surface-primary)', ... },
  content: { primary: 'var(--color-content-primary)', ... },
  mode: {
    preparing: { background: 'var(--color-preparing-bg)', ... },
    grounding: { background: 'var(--color-grounding-bg)', ... },
    reflecting: { background: 'var(--color-reflecting-bg)', ... },
  },
} as const

export const motion = {
  preparing:  { duration: 200, easing: 'ease-out' },    // forward-leaning, slight urgency
  grounding:  { duration: 400, easing: 'ease-in-out' }, // anchoring stillness
  reflecting: { duration: 600, easing: 'ease-out' },    // unhurried, retrospective
} as const

export const haptic = {
  breathingRhythm:      'light',    // repeating during breathing exercise
  dragConfirmation:     'medium',   // fear ladder item placement
  commitmentTap:        'heavy',    // "Let's do this" — distinct, weighted
  techniqueCompletion:  'success',  // custom pattern on completion
} as const

export const spacing = { ... } as const
export const typography = { ... } as const
```

Motion preset values are locked to the clinical requirements: `motion.grounding` at 400ms ease-in-out reflects the anchoring quality of an in-the-moment intervention. These values are not aesthetic choices — they encode the mode register and must not be overridden at the component level without a design review.

Haptic constants are semantic labels mapping to `expo-haptics` impact levels. Tested on physical device — simulators do not support haptics.

---

## Composed Component Behavioural Contracts

Mode-conditional behaviour is specified here, not left to per-component engineering judgment.

| Component | In-the-moment register | Reflection register | Preparation register |
|-----------|----------------------|--------------------|--------------------|
| `CrisisCard` | **No mount animation.** Motion is contraindicated during dysregulation. Instant render only. | Gentle fade-in (`motion.reflecting`) | Not used in this register |
| `SudsScale` | **Reduced motion mandatory.** Haptic feedback on value change (`haptic.dragConfirmation`). No decorative animation. | Standard interaction, `motion.reflecting` | Standard interaction, `motion.preparing` |
| `ProgressChart` | Not used in this register | Full animation (`motion.reflecting`) | Summary view, `motion.preparing` |

**In-the-moment zero-network guarantee (design layer):** Composed components used in the in-the-moment register must not contain conditional rendering based on network state — no loading skeletons, no optimistic UI patterns, no connectivity-dependent branches. This is a design-layer guarantee, not solely an architecture-layer guarantee. Violation of this constraint in a PR is a blocking issue, not a comment.

**In-the-moment render budget:** The 2-second access requirement from anywhere in the app is a performance contract. Design system implications: in-the-moment components carry no lazy-loaded assets, no deferred fonts, no first-render network calls. Animation frame budget for the in-the-moment layer: 16ms/frame (60fps) on a 2GB RAM Android 10 device. If NativeWind v5 pre-release introduces jank on this surface, StyleSheet is the approved escape hatch — flag in code review with the performance reason.

---

## Implementation Approach

**Phase 0 — Pre-work (before any component in `packages/ui` is built)**

1. **NativeWind v5 validation:** Verify `nativewind@5.0.0-preview.3` on target devices (2GB RAM Android 10+, iOS 16+). Check: dark mode through native modals, CSS custom property resolution on Android, hot reload with Expo Router v4. Document results. Hard blocker → ADR revision, not a design system workaround.

2. **Library evaluation (1 day, time-boxed, written decision memo required):**
   - `react-native-reusables` / `rn-primitives` — adopt / reject / partial adopt with specific components
   - `@gorhom/bottom-sheet` — adopt / reject (fear ladder panel, detail sheets)
   - `react-native-gesture-handler` — confirm Expo SDK 54 compatibility

3. **`packages/ui/src/tokens/theme.ts` authored** — complete token set before any component work.

**Phase 1 — Mode design briefs (pre-sprint-1 gate, PM-owned)**

One-page director's brief per mode, written before any component is built. This is a writing task, not a design task — no designer required. Owned by the PM or founding team. Sprint 1 does not begin until all three briefs exist. The gate is enforced at sprint planning, not left to engineering judgment.

- **Preparation:** Warm, containing, quiet forward momentum. Dojo, not spa.
- **In-the-moment:** Stripped. Immediate. Zero overhead. The app recedes to a tool in the hand.
- **Reflection:** Unhurried. Retrospective. Slightly slower. The app witnesses.

Haptic language per mode specified here. Implementation via `expo-haptics`. Physical device testing required.

**Phase 2 — `packages/ui` components (clinical priority order)**

1. In-the-moment grounding tools — **prototype-gate** (see below)
2. Daily check-in primitives
3. Fear ladder / hierarchy components
4. Avoidance-moment screen — **prototype-gate** (see below)

**Prototype gates:** The in-the-moment and avoidance-moment screens cannot enter an implementation sprint without a tested prototype. The prototype does not require professional tooling — a Figma prototype, a React Native sketch, or even a paper walkthrough with a user who has social anxiety qualifies. The PM owns the gate decision: the PM signs off that the prototype has been tested and the interaction has been felt before code begins. This is not a bureaucratic step — it exists because these surfaces cannot be assembled from components correctly without first being experienced.

**Accessibility requirements belong in ticket acceptance criteria**, not only in PR checklists. Every ticket that produces an in-the-moment or composed component includes these as written AC:
- `accessibilityRole`, `accessibilityLabel`, `accessibilityState`, `accessibilityHint` set explicitly
- Minimum 44×44pt touch target
- VoiceOver/TalkBack reading order tested on physical device
- Haptic pattern specified and implemented
- Tested with audio off

The PR checklist is a secondary reminder, not the primary enforcement mechanism.

**Phase 3 — Web design system (Phase 2 project)**

`apps/web` activates at Phase 2. Web design system choice (shadcn/ui or otherwise) is a Phase 2 decision. `packages/ui/src/tokens/theme.ts` is the starting point for web token expression at that point.

---

## Failure Prevention

| Risk | Trigger | Prevention |
|------|---------|------------|
| NativeWind v5 pre-release regression | Preview bump | Pin to exact version; run Phase 0 validation before any upgrade; ADR revision if hard blocker |
| Raw Tailwind values bypass token system | Developer reaches for `bg-blue-500` in composed components | Written constraint in spec; lint rule at build time |
| Mode registers converge | No mode briefs before component work | Mode briefs are pre-sprint-1 gate; PM-owned; enforced at sprint planning |
| CrisisCard animated in in-the-moment | Animation added without mode-conditional check | Behavioural contracts table in this doc; PR checklist item: "mode register verified" |
| In-the-moment network dependency introduced | Loading state added to grounding component | Zero-network annotation is a blocking PR issue; no conditional network renders in in-the-moment components |
| Prototype gate bypassed | Timeline pressure | PM owns the gate; it is a sprint planning gate, not a code review gate — cannot be waived post-implementation |
| Haptic spec never shipped | Not in sprint | Haptic constants in `theme.ts` make it visible in the token file; AC on every in-the-moment component ticket |
| rn-primitives evaluation skipped | Sprint starts before Phase 0 | Named deliverable with 1-day time-box and required written memo |

---

## Contingency Paths

| Scenario | Trigger | Path |
|----------|---------|------|
| NativeWind v5 hard blocker on target device | Phase 0 validation fails | ADR revision required; StyleSheet + typed constants from `theme.ts` as fallback; architecture team sign-off before proceeding |
| rn-primitives partial coverage | Missing gesture / sheet patterns | Hybrid: rn-primitives for accessibility primitives; @gorhom/bottom-sheet for panels; from-scratch only for bespoke interactions |
| Haptic spec deprioritised | Not scoped into sprint | Haptic constants in `theme.ts` make it visible; component PR checklist enforces it as a merge gate |
| Designer joins post-MVP | Onboarding to undocumented system | `theme.ts` commented with the why behind each token value; mode briefs stored at `docs/design/modes/`; Phase 0 decision memos at `docs/design/adr/` |
| In-the-moment jank on 2GB RAM Android | NativeWind v5 frame budget exceeded | StyleSheet escape hatch approved for this surface; flag in code review with performance measurement |

---
