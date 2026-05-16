# ADR-CALMME-KEYBOARD — CalmMeButton Keyboard-Obscured Behaviour on Android

**Status:** Draft — for review  
**Owner:** Mobile engineer  
**Required before:** CalmMeButton implementation sprint

---

## Context

`CalmMeButton` is a persistent floating action button providing zero-navigation access to Calm Me from any screen. It is specified with `zIndex: 9999` in the JS layer.

**Platform constraint:** On Android, the software keyboard renders in the native layer (`WindowManager.LayoutParams`), not the React Native JS layer. A React Native component with `zIndex: 9999` cannot appear above the Android software keyboard. This means `CalmMeButton` may be obscured or unreachable on any screen where a text input is focused and the keyboard is open.

Affected screens include:
- `LetterToSelfEditor` (pre-exposure prediction letter — keyboard always open during writing)
- `GroundingPrompt` last step (no text input, but relevant for sequencing)
- Any future text-input screen in F3 or F4

---

## Platform Behaviour

| Platform | Behaviour |
|----------|-----------|
| iOS | `zIndex: 9999` in JS layer renders above keyboard if using `KeyboardAvoidingView` with `behavior="padding"`. CalmMeButton remains visible above keyboard. |
| Android | Software keyboard renders in native layer. `zIndex: 9999` JS-layer components render below keyboard regardless of z-index value. |

---

## Options

### Option A — Keyboard dismisses on CalmMeButton tap (recommended)

When `CalmMeButton` is tapped while keyboard is open:
1. Dismiss keyboard (`Keyboard.dismiss()`) before opening CalmMe overlay
2. Overlay renders above the now-hidden keyboard

**Pros:** Simple, no native module required, predictable behaviour  
**Cons:** User's draft text in `LetterToSelfEditor` may feel disrupted; keyboard dismiss is a jarring transition during a high-anxiety moment

**Mitigation:** `LetterToSelfEditor` saves content to component state on every keystroke — keyboard dismiss does not lose content. On overlay close, keyboard re-focuses the input.

### Option B — CalmMeButton renders above keyboard via native module

Use a portal-based solution (`@gorhom/portal` or `react-native-portalize`) that renders `CalmMeButton` at the native window level above the keyboard.

**Pros:** CalmMeButton always visible without keyboard dismiss  
**Cons:** Adds a native module dependency; `@gorhom/portal` compatibility with NativeWind v5 preview.3 is unverified; increases Phase 0 spike scope

### Option C — icon-only compact variant floats in keyboard-safe zone

When keyboard is open, `CalmMeButton` collapses to `icon-only` variant and repositions to above the keyboard using `KeyboardAvoidingView` offset calculation.

**Pros:** Always visible, no native module  
**Cons:** Complex layout calculation; repositioning animation adds implementation risk; compact icon loses "Calm Me" label at the exact moment the user needs it most

---

## Recommendation

Option A for MVP. The keyboard dismiss is one frame before the overlay renders — the user's intent (get to Calm Me) is fulfilled immediately, and the content is preserved. Document the `LetterToSelfEditor` content-preservation guarantee in that component's implementation notes.

Option B can replace Option A post-MVP if user research shows keyboard-triggered Calm Me interactions are common and the dismiss feels disruptive.

---

## Implementation Notes

- `Keyboard.dismiss()` must be called synchronously before `open()` on `useCalmMeStore`
- `LetterToSelfEditor` must persist draft content to component state on every keystroke, not on blur
- On `CalmMeOverlay` close: call `inputRef.current?.focus()` to restore keyboard if the underlying screen had an active input
- Android `adjustResize` / `adjustPan` window soft input mode must be set consistently across the app — confirm in `AndroidManifest.xml` and Expo config before implementation

---

## Decision

[ ] Option A — keyboard dismiss on tap (recommended)  
[ ] Option B — native portal above keyboard  
[ ] Option C — keyboard-safe repositioning  

**Decided by:** _______________  
**Date:** _______________
