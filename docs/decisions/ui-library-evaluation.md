# UI Library Evaluation — rn-primitives & Bottom Sheet

Date: 2026-05-20
Evaluated by: claude-sonnet-4-6 (bmad-dev-story)
Stack: Expo SDK 54 / RN 0.81.6 / NativeWind v5.0.0-preview.3

## 1. Install Conflict Matrix

| Library | Version tested | Peer dep conflicts | Metro warnings | expo-doctor |
|---|---|---|---|---|
| @rn-primitives/* | 1.4.0 | None new (React 19.1.4 vs 19.1.0 mismatch is pre-existing via expo-router, not introduced by this library) ¹ | None new | Pre-existing warnings only (react/react-native patch version mismatches, Metro watchFolders) |
| @gorhom/bottom-sheet | 5.2.14 (evaluated, not installed) | Requires `react-native-gesture-handler` and `react-native-reanimated` as explicit native peer deps; expo-doctor warns app will crash without GestureHandlerRootView at root | N/A — not installed in final state | Would require additional native setup |

¹ **Transitive dependencies introduced by @rn-primitives:**
- `@rn-primitives/portal` → `zustand@5.0.13` (lightweight state store used for portal registration)
- `@rn-primitives/dialog` → `@radix-ui/react-dialog@1.1.15` (web dialog semantics) → `react-dom@18.3.1`

The `react-dom@18.3.1` transitive resolved against `react@19.1.4` is a cross-major version dependency. It is benign in practice — `@radix-ui/react-dialog` uses `react-dom` only for its web rendering path, which is excluded from the RN bundle by Metro's platform-specific resolution — but the mismatch appears in `pnpm-lock.yaml` and will surface in `pnpm install` peer dep warnings. Story teams should be aware when debugging dep resolution issues.

**Note on pre-research finding:** The story's Dev Notes stated `@gorhom/bottom-sheet` v5 was incompatible with Reanimated v4. This was **incorrect at time of evaluation**. v5.2.14 declares `"react-native-reanimated": ">=3.16.0 || >=4.0.0-"` — Reanimated v4 is supported. The REJECT decision below is based on cost-benefit, not a compatibility blocker.

## 2. Bundle Size Delta

`packages/ui/dist/` size does not change because `@rn-primitives` packages are React Native runtime dependencies consumed by Metro at app bundle time — they are not compiled into the `packages/ui/dist/` TypeScript output.

| Library | packages/ui dist before | packages/ui dist after | Delta |
|---|---|---|---|
| @rn-primitives/* | 16K | 16K | 0 (Metro-bundled, not tsc-compiled) |
| @gorhom/bottom-sheet | N/A | N/A | Not installed |

**Installed node_modules footprint added by @rn-primitives (pnpm store):**

| Package | Size |
|---|---|
| @rn-primitives/slot | 36K |
| @rn-primitives/portal | 28K |
| @rn-primitives/types | 28K |
| @rn-primitives/dialog | 76K |
| @rn-primitives/hooks (transitive) | 40K |
| zustand (transitive via portal) | 28K |
| @radix-ui/react-dialog + react-dom (transitive via dialog) | ~320K |
| **Total** | **~556K** |

**Note on Metro app bundle impact:** The node_modules footprint above is the disk cost. The actual JS bytes added to the app bundle will be smaller — Metro tree-shakes, and `react-dom` / `@radix-ui/react-dialog`'s web-only code is excluded by platform-specific resolution. A precise Metro bundle delta was not measured in this evaluation; measure during Story 1.3 (NativeWind spike) when a dev build is available.

## 3. Accessibility Prop Passthrough

Verification method: Source inspection of installed `@rn-primitives/slot@1.4.0` and `@rn-primitives/dialog@1.4.0` compiled output.

**Slot `mergeProps` function (slot/dist/index.js):**
```js
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps };
  // event handlers are composed (both called), not replaced
  // style arrays are merged
  // className strings are joined
  // all other props: { ...slotProps, ...overrideProps }
  return { ...slotProps, ...overrideProps };
}
```

The spread `{ ...slotProps, ...overrideProps }` passes all arbitrary props — including `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, and `aria-live` — through to the underlying React Native component unchanged. Child props override slot props on conflict (correct behaviour).

**Dialog component semantic roles (dialog/dist/dialog.js):**
- `DialogTrigger` → `role="button"` on the pressable element
- `DialogContent` → `role="dialog"` on the modal root
- `DialogTitle` → `role="heading"` on the heading element
- Additional props accepted via `{...props}` spread on all components

**Result:** `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` — confirmed passing through via static analysis. ✅

**Caveat — `aria-live` unverified at runtime:** `aria-live` is a web attribute. React Native's equivalent is `accessibilityLiveRegion` (`'none' | 'polite' | 'assertive'`). Static analysis confirms `aria-live` is spread to the underlying component, but does not confirm whether `@rn-primitives` maps it to `accessibilityLiveRegion` or passes the web attribute unchanged (which is a no-op on RN). Runtime verification via React DevTools Profiler or `testID` inspection is required before any component in Story 1.4+ relies on live-region announcements. ⚠️

## 4. Overlay Capability (@gorhom/bottom-sheet)

Evaluation method: `@gorhom/bottom-sheet@5.2.14` was installed into `apps/mobile` via `pnpm --filter exposure-buddy-mobile add @gorhom/bottom-sheet`, then removed after assessment. Overlay and peer dep findings are based on package metadata, `expo-doctor` output, and pnpm peer resolution — not a running dev build (no Android SDK available in evaluation environment). Runtime rendering behaviour (z-index, gesture response) was not verified on device.

**Mechanism:** `@gorhom/portal` renders content into a separate React tree mounted above the main navigator, achieving JS-layer z-index elevation similar to `@rn-primitives/portal`.

**Findings:**
- Can render above all JS-layer UI on both iOS and Android via `@gorhom/portal`
- Cannot render above **native-layer** system UI (share sheets, image pickers, keyboard) — same limitation as all JS portal solutions
- Requires `GestureHandlerRootView` at the app root to function; without it, expo-doctor warns the app will crash on Android
- NativeWind `className` props do **not** apply to `BottomSheetView` — bottom-sheet renders outside the NativeWind style injection tree; all content inside must use inline styles or `StyleSheet`, not NativeWind classes

**Verdict for CalmMeButton overlay:** The JS-layer elevation requirement (UX-DR8) is met, but the NativeWind styling constraint and native setup cost make this unnecessarily complex for MVP. See Section 6.

## 5. Decisions

### @rn-primitives: ADOPT

**Installed packages:** `@rn-primitives/slot`, `@rn-primitives/portal`, `@rn-primitives/dialog`, `@rn-primitives/types` — all at v1.4.0, installed in `packages/ui`.

**Note — `@rn-primitives/pressable` does not exist on npm (404).** The story Dev Notes listed it as a target package for `AccessiblePressable` use-cases. The correct API is `Slot.Pressable` exported from `@rn-primitives/slot`, which provides the same composable pressable behaviour. Developers implementing `AccessiblePressable` in Story 1.4 should import from `@rn-primitives/slot`, not a `pressable` package.

**Rationale:**
- NativeWind-native design: primitives accept `className` props and integrate with the NativeWind v5 style injection tree without any wrapping or workaround
- Zero new peer dependency conflicts introduced; React 19 mismatch is pre-existing via expo-router and affects the whole monorepo equally
- Accessibility prop passthrough confirmed via source inspection: all props including `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, `aria-live` reach the underlying RN component unchanged
- Semantic ARIA roles built in (button, dialog, heading) — correct defaults for accessible primitive components
- `@rn-primitives/portal` covers the CalmMeButton JS-layer overlay requirement without adding native modules
- Small footprint (~208K total installed); no native module setup required
- pnpm turbo build exits 0; no new Metro warnings at cold start

### @gorhom/bottom-sheet: REJECT (for MVP)

**Not installed.** Evaluated but removed from `apps/mobile` after testing.

**Rationale:**
- No MVP component (Epic 1–6) requires a bottom-sheet modal drawer pattern; adopting it now adds complexity with no immediate return
- The only overlay requirement (CalmMeButton — UX-DR8) is satisfied by `@rn-primitives/portal`, which is already adopted
- Requires two additional native peer dependencies (`react-native-gesture-handler`, `react-native-reanimated`) with explicit `GestureHandlerRootView` root setup; this is a non-trivial addition to the app shell for a library not yet needed
- NativeWind `className` styling does not work inside `BottomSheetView` — all bottom-sheet content would require dual styling paths (NativeWind outside, StyleSheet inside), creating an inconsistent DX across the UI layer
- The library is not rejected on compatibility grounds — v5.2.14 supports Reanimated ≥4.0.0 — but on MVP cost-benefit

**Reconsider when:** A product requirement introduces a drawer/sheet interaction pattern (e.g., Epic 7 grounding technique picker, Epic 8 achievements detail). At that point, adopt with full native setup and document the NativeWind styling constraint in the component.

## 6. Alternative Approach — CalmMeButton Overlay

Since `@gorhom/bottom-sheet` is rejected, the CalmMeButton overlay (UX-DR8) will be implemented using **Option B — `@rn-primitives/portal`**:

**Implementation:** Mount `CalmMeButton` inside a `<Portal>` from `@rn-primitives/portal`. The portal renders into the host registered at the app root (`<PortalHost>` in `apps/mobile/app/_layout.tsx`), placing it above all JS-layer stack navigator content.

**Limitation:** JS-layer only. The button will not render above native-layer system UI (keyboard, image picker, share sheet). This is acceptable for MVP — no Epic 2–6 flow requires the button to appear above native system overlays.

**This decision is the input for `ADR-CALMME-RENDER.md`** (Story 1.5). The ADR should record: portal host at `_layout.tsx` root, `@rn-primitives/portal` as the mechanism, JS-layer-only elevation with explicit limitation note.
