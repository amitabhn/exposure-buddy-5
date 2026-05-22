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

- `DM Serif Display italic` is permitted on **4 designated surfaces only** (UX-DR21); use Inter elsewhere in Reflection screens.
- `spacing[10]` breathing room is available in this register — apply generously to create visual pause.
- `accent.progress` (`#E8A84C`) is used for **decorative purposes only** — never as an interactive affordance.
- `SudsArcChart` uses `motion.reflecting` tokens for its draw animation.
- All animation durations must come from `motion.reflecting` tokens — no hardcoded values.

## PM Sign-off

- [ ] Signed off by: ___________________ Date: ___________
