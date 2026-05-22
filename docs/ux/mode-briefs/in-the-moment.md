# Mode Brief: In the Moment

## Director's Statement

Stripped. Immediate. Zero overhead — the app recedes to a tool in the hand.

## Token Surface

| Property | Token | Value |
|----------|-------|-------|
| Background colour | `surface.primary` | `#F5F7F6` (unchanged from Preparation) |
| Motion duration | `motion.grounding.duration` | `400ms` (collapses to `0ms` when `reduced: true`) |
| Motion easing | `motion.grounding.easing` | `easeInOut` |
| Touch target | `tapTarget.inTheMoment` | `56×56px` (UX-DR19) |

## Haptic Language

| Haptic constant | Trigger |
|----------------|---------|
| `haptic.breathingRhythm` | Breathing exercise inhale/exhale beat |
| `haptic.techniqueCompletion` | Technique marked complete |

## Key Behaviours

- **Zero network dependency** — any In-the-moment screen that blocks on a network call is a blocking PR issue.
- `CrisisCard` has **no mount animation** — it must appear immediately.
- `SudsScale` requires reduced motion support; collapse all durations to 0ms when `useAnimation().reduced` is `true`.
- 2-second access SLA from anywhere in the app: tapping CalmMeButton must reach an In-the-moment surface within 2 seconds.
- All animation durations must come from `motion.grounding` tokens — no hardcoded values. All collapse to `0ms` when `reduced: true`.
- `DM Serif Display` is **not** permitted in In-the-moment surfaces; use Inter only.
- `spacing[10]` (extra breathing room) is **not** applied in In-the-moment; reserve for Reflection.
- `groundingTokens` must **not** be imported in any Context or Provider file — this rule is automatically enforced by ESLint in `packages/ui/.eslintrc.js`.

## PM Sign-off

- [ ] Signed off by: ___________________ Date: ___________
