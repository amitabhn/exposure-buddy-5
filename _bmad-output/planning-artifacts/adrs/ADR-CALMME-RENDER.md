# ADR-CALMME-RENDER: CalmMeButton Rendering Strategy

## Status

Decided — during Story 1.2 evaluation (2026-05-22)

## Context

`CalmMeButton` must render above all JS-layer UI on every screen so that users can access In-the-moment support at any point in the session. This requires an overlay/portal mechanism.

Story 1.2 evaluated two candidates for the CalmMe overlay:

1. **`@gorhom/bottom-sheet`** — a sheet drawer backed by `react-native-reanimated` and `react-native-gesture-handler`
2. **`@rn-primitives/portal`** — a lightweight JS-layer portal implementation; `<PortalHost>` already mounted in `apps/mobile/app/_layout.tsx`

The decision in this ADR is informed directly by the Story 1.2 evaluation outcome (see Story 1.2 Completion Notes in `_bmad-output/implementation-artifacts/1-2-ui-library-evaluation-rn-primitives-and-bottom-sheet.md`).

## Decision

**`@rn-primitives/portal` via `<PortalHost>` already mounted in `_layout.tsx`.**

`CalmMeButton` will use `@rn-primitives/portal` to render its overlay above all other JS-layer UI.

## Rationale

### `@gorhom/bottom-sheet` — REJECTED

- Rejected in Story 1.2: no MVP component requires a sheet drawer.
- Would add `react-native-reanimated` + `react-native-gesture-handler` as native module dependencies — significant native build complexity with no MVP gain.
- `react-native-reanimated` requires Babel plugin configuration and native linking; deferring this to when it is genuinely needed.

### `@rn-primitives/portal` — ADOPTED

- Already adopted in Story 1.2 for the `packages/ui` primitive layer.
- `<PortalHost>` is already mounted at the root of `apps/mobile/app/_layout.tsx` (inside `ThemeProvider`), so no additional setup is required.
- Lightweight: pure JS, no native modules.
- Consistent with the package boundary rules: `@rn-primitives` primitives are the approved component substrate for this project.

## Limitation (Must Be Documented)

**`@rn-primitives/portal` is JS-layer only.**

It does **not** render above native system UI:
- Android OS soft keyboard
- System image picker
- System share sheet
- Any native modal spawned outside React's component tree

This limitation is **accepted for MVP**. No Epic 2–7 screen requires `CalmMeButton` to be visible above native system UI modals.

The keyboard-obscuration edge case on Android is handled separately. See: `ADR-CALMME-KEYBOARD.md`.

## Consequences

- `CalmMeButton` overlay implementation in future stories must use `@rn-primitives/portal`.
- Do **not** install `@gorhom/bottom-sheet`, `@gorhom/portal`, or `react-native-reanimated` to satisfy the CalmMe overlay requirement.
- If a future story requires CalmMe above the Android keyboard, consult `ADR-CALMME-KEYBOARD.md` first.
- This ADR must be signed off before the In-the-moment sprint begins (Epic 7 / CalmMe implementation stories).

## Related ADRs

- `ADR-CALMME-KEYBOARD.md` — Android keyboard obscuration edge case

## Sign-off

- Decided by: ___________________ Date: ___________
- Signed off (pre In-the-moment sprint): ___________________ Date: ___________
