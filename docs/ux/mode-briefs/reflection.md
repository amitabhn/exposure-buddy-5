# Mode Brief: Reflection

## Director's Statement

Unhurried. Retrospective. Slightly slower — the app witnesses.

## Token Surface

| Property | Token | Value |
|----------|-------|-------|
| Background colour | `reflect.background` | `#FDF7ED` |
| Motion duration | `motion.reflecting.duration` | `600ms` |
| Motion easing | `motion.reflecting.easing` | `easeOut` |
| Touch target | `tapTarget.standard` | `44×44pt` |

## Haptic Language

None specified for Reflection surfaces — haptic feedback is intentionally absent to preserve the witnessing, retrospective tone.

## Key Behaviours

- `DM Serif Display italic` is permitted on **4 designated surfaces only** (UX-DR21): `score-reveal`, `prediction-reality-reveal`, `progress-readback`, `pre-exposure-readback`. Use Inter on all other Reflection screens.
- `spacing[10]` breathing room is available in this register — apply generously to create visual pause.
- `accent.progress` (`#E8A84C`) is used for **decorative purposes only** — never as an interactive affordance or text colour. Fails WCAG AA contrast (1.94:1); no text content is permitted against this colour.
- `SudsArcChart` uses `motion.reflecting` tokens for its draw animation.
- `SudsScale` in Reflection mode uses `motion.reflecting` tokens for its transitions; apply the same reduced motion collapse as other Reflection animations.
- All animation durations (including `SudsArcChart` draw and `SudsScale` transitions) collapse to `0ms` when `useAnimation().reduced` is `true`.
- All animation durations must come from `motion.reflecting` tokens — no hardcoded values.

## PM Sign-off

- [ ] Signed off by: ___________________ Date: ___________
