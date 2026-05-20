# ADR-DARK-MODE-NATIVEWIND — Dark Mode Deferral & NativeWind Configuration

**Status:** Draft — decisions required before Phase 0 spike closes  
**Owner:** Engineering lead  
**Required before:** Phase 0 NativeWind v5 spike sign-off

---

## Context

The UX spec defers dark mode to post-MVP, locking `colorScheme="light"` at the app root. However, the deferral does not currently specify:

1. Whether NativeWind v5's `dark:` class parsing is disabled
2. What happens when third-party components respond to the system `prefers-color-scheme` media query independently
3. What the CI regression test strategy is to prevent dark mode from leaking in

Without explicit configuration, components using NativeWind `dark:` utility classes by accident, or third-party libraries with their own dark theme support, will render incorrectly in system dark mode environments — producing a partially-dark, partially-light app that looks broken.

---

## Decisions

### 1. Disable NativeWind dark mode handling

In `tailwind.config.js` (or `tailwind.config.ts`), set:

```js
module.exports = {
  darkMode: false,  // disable dark mode — deferred to post-MVP
  // ...
};
```

This prevents NativeWind from generating `dark:` variant classes at all. Any accidentally-written `dark:` utility in the codebase will produce a build warning or be silently ignored, not silently activate.

**Status:** [ ] Applied in Phase 0 spike

### 2. Lock `colorScheme` at app root

In `apps/mobile/app/_layout.tsx`:

```tsx
<ThemeProvider value={DefaultTheme}>
  {/* colorScheme="light" locked — dark mode deferred post-MVP */}
```

Or via Expo config in `app.json`:

```json
{
  "expo": {
    "userInterfaceStyle": "light"
  }
}
```

Setting `userInterfaceStyle: "light"` in Expo config prevents the OS from sending dark mode signals to the app entirely on both iOS and Android — the most robust approach.

**Status:** [ ] Applied in Phase 0 spike  
**Recommended:** `userInterfaceStyle: "light"` in Expo config (OS-level lock)

### 3. Third-party component audit

Before any third-party UI library is added to the project, verify it supports light-mode-only operation. Known risks:

| Library | Dark mode behaviour | Mitigation |
|---------|---------------------|------------|
| `react-native-reusables` | Responds to system color scheme by default | Set `ThemeProvider` to force light |
| `@gorhom/bottom-sheet` | Supports `backgroundStyle` prop — use explicit light tokens | Use explicit token props |
| `react-native-paper` (if used) | Full dark theme support — responds to system scheme | Wrap in `PaperProvider theme={MD3LightTheme}` |

**Action:** Each third-party library onboarded must have a documented light-mode-only configuration noted in its integration PR.

**Status:** [ ] Audit checklist created

### 4. CI regression test

Add a CI check that asserts `colorScheme === 'light'` at app root and that no `dark:` NativeWind classes are present in component source files:

```bash
# In CI — fail if any dark: class usage found in packages/ui
grep -r "dark:" packages/ui/src/ && echo "dark: classes found — dark mode is deferred" && exit 1 || exit 0
```

This is a simple grep, not a runtime test. It prevents accidental `dark:` class introduction during development.

**Status:** [ ] Added to CI pipeline

---

## When Dark Mode Ships (Post-MVP)

When dark mode is undeferred, this ADR should be revisited:

1. Remove `darkMode: false` from `tailwind.config`
2. Remove `userInterfaceStyle: "light"` from Expo config (or update to `"automatic"`)
3. Design dark token variants in `packages/ui/src/tokens/theme.ts`
4. Re-audit all colour contrast ratios against dark backgrounds (full WCAG 2.1 AA re-audit required)
5. Re-audit third-party libraries for dark mode compatibility

---

## Consequences

- `userInterfaceStyle: "light"` in Expo config is the strongest lock — it prevents the OS from sending dark mode signals at all, protecting against third-party library dark mode responses regardless of their internal configuration
- CI grep check is a low-cost early warning system — catches accidental `dark:` class usage before it reaches a PR review
- When dark mode ships, the re-audit scope is fully defined here — no surprise work
