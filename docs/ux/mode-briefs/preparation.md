# Mode Brief: Preparation

## Director's Statement

Warm, containing, quiet forward momentum — a dojo, not a spa.

## Token Surface

| Property | Token | Value |
|----------|-------|-------|
| Background colour | `surface.primary` | `#F5F7F6` |
| Motion duration | `motion.preparing.duration` | `200ms` |
| Motion easing | `motion.preparing.easing` | `easeOut` |
| Touch target | `tapTarget.standard` | `44×44pt` iOS / `48dp` Android |

## Haptic Language

| Haptic constant | Trigger |
|----------------|---------|
| `haptic.dragConfirmation` | Fear ladder item drag-and-drop reorder |
| `haptic.commitmentTap` | "Let's do this" — session start confirmation |

## Key Behaviours

- Animations are present and meaningful; forward-momentum transitions signal progress, not decoration.
- Motion pace is slightly urgent (200ms `easeOut`) — do not slow it to a spa rhythm.
- `DM Serif Display` is **not** permitted in Preparation surfaces; use Inter only.
- `spacing[10]` (extra breathing room) is **not** applied in Preparation; reserve for Reflection.
- All animated components must read durations from `motion.preparing` tokens — no hardcoded values.
- All animation durations collapse to `0ms` when `useAnimation().reduced` is `true` — applies to all animated Preparation components.

## PM Sign-off

- [ ] Signed off by: ___________________ Date: ___________
