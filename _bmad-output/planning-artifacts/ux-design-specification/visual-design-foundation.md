# Visual Design Foundation

## Color System

**Direction: Deep Trust**

| Token | Hex | Role | Rationale |
|-------|-----|------|-----------|
| `surface.primary` | `#F5F7F6` | Main backgrounds | Doesn't shout "app" — says "room" |
| `surface.secondary` | `#EBF0EE` | Cards, sheets, preparation register | Containing; slightly warmer than surface |
| `content.primary` | `#1A2E2A` | Body text | Deep forest — clinical authority without naval coldness |
| `content.secondary` | `#4A6B62` | Supporting text | Same family as courage accent — reads as part of the same voice |
| `accent.courage` | `#2D6A5A` | CTAs, primary actions | Forest teal — growth is gradual and rooted, not electric |
| `accent.progress` | `#E8A84C` | Achievement moments (decorative only on reflection bg) | Quiet glow, not celebration; warm, not garish |
| `accent.grounding` | `#8B6F47` | Grounding/somatic tools | Somatic work should feel like the earth, not the screen |
| `reflect.background` | `#FDF7ED` | Reflection mode surfaces | Environment shifts when mode shifts; users feel it before they register it |

**Contrast fix:** `#E8A84C` on `#FDF7ED` = 2.1:1 — fails WCAG AA for text. Amber accent on reflection background is **decorative only** (pull-quote border-left, score number highlight). All text on reflection background uses `content.primary` (`#1A2E2A`).

**Dark mode — MVP opt-out:** `colorScheme="light"` locked at app root until dark token variants are designed. Prevents NativeWind v5 `dark:` classes activating against undefined dark token variants. Dark mode is a named post-MVP capability.

**Mode register token architecture:**

```ts
// packages/ui/src/tokens/theme.ts
export const groundingTokens = { ... }  // static export — no async provider dependency (2s SLA)
export const preparingTokens = { ... }  // context-resolved via ThemeContext
export const reflectingTokens = { ... } // context-resolved via ThemeContext
```

Default context value: `preparing` (not null) — safe fallback on uninitialised context. ESLint enforcement: grounding token imports must not appear inside any Context or Provider file.

**Token/Tailwind bridge:** Colours defined once in `tailwind.config.ts`, re-exported into `theme.ts` for typed TypeScript access. `tailwind.config.ts` is the upstream source of truth.

**Pre-sprint-1 spike:** Verify each semantic token resolves to a non-undefined hex value on Android Hermes (NativeWind v5 preview.3 CSS custom property stability). If CSS vars unstable → JS-object ThemeProvider fallback.

---

## Typography System

**Typefaces:** Inter (body) + DM Serif Display italic (narrative moments — 4 surfaces only, dedicated screens only)

**DM Serif Display scope — strictly enforced:**
1. Score reveal screen
2. Prediction vs. reality quote screen
3. Week 4/8 progress readback screen
4. Pre-exposure writing field read-back

Appears on **dedicated screens only** — never mid-flow on an existing screen. Eliminates jarring handoff and dyslexia risk (users are reading, not acting, on these screens).

Token comment enforcement:
```ts
narrativeFont: 'DM Serif Display'
// Use ONLY at: score-reveal · prediction-reveal · week-4-readback · pre-exposure-write
```

**Type scale:**

| Token | Size | Weight | Leading | Font | Usage |
|-------|------|--------|---------|------|-------|
| `text-display` | 28px (24px at width < 360px) | 700 | 1.15 | DM Serif Display | Score reveals, progress readback headlines |
| `text-h1` | 22px | 700 | 1.20 | Inter | Screen titles |
| `text-h2` | 17px | 600 | 1.30 | Inter | Card headings, section titles |
| `text-h3` | 14px | 600 | 1.35 | Inter | Sub-section titles |
| `text-body` | 14px | 400 | 1.55 | Inter | Standard body text |
| `text-body-sm` | 12px | 400 | 1.55 | Inter | Supporting metadata only — never primary copy |
| `text-caption` | 11px | 500 | 1.40 | Inter | Labels, metadata, timestamps |
| `text-micro` | 10px | 600 | 1.30 | Inter | Tags, badges, nav labels |
| `text-narrative` | 15px | 400 italic | 1.60 | DM Serif Display | Pull quotes, companion voice |

**Font loading:** Both Inter and DM Serif Display gated behind `SplashScreen.preventAutoHideAsync()`. Explicit error branch: if `fontError` → fallback font tree, not crash. Fallback chain (tokens, not ad-hoc): Inter → System (SF Pro / Roboto) · DM Serif Display → system serif.

**PR gate:** No primary copy uses `text-body-sm` or smaller.

---

## Spacing & Layout Foundation

**Base unit: 4px**

| Token | Value | Notes |
|-------|-------|-------|
| `space-0` | 0px | Explicit zero |
| `space-px` | 1px | Dividers, border widths |
| `space-1` | 4px | Icon+label gap, tag padding |
| `space-2` | 8px | Standard intra-component |
| `space-3` | 12px | Dense component padding |
| `space-4` | 16px | Standard padding, screen horizontal margin |
| `space-5` | 20px | Between components within a section |
| `space-6` | 24px | Section spacing, card-to-card gap |
| `space-7` | 28px | Mid-range spacing |
| `space-8` | 32px | Screen section separators |
| `space-10` | 40px | **Reflection register only** — breathing room |

`space-10` annotated in `theme.ts`: `// reflection register only — do not use in preparing or grounding surfaces`

**`tailwind.config.ts` extensions required before sprint 1:**
```ts
theme: { extend: { borderRadius: { card: '14px', button: '12px' } } }
```

**Layout principles:**
- **Single column throughout** — SUDS scale and ladder items are full-width clinical instruments; multi-column is a clinical contraindication, not a visual preference
- Screen horizontal padding: `space-4` (16px) **inside** safe area insets
- `SafeAreaProvider` at root in `_layout.tsx` — **sprint-0 prerequisite** (absence is a day-1 crash)
- Maximum content width: 375px baseline; no artificial max-width constraint

**Border radii:** Cards: 14px (`rounded-card`) · Buttons: 12px (`rounded-button`) · Tag pills: 20px · Rank badges: 6px · Input fields: 10px · Quick-access panel: 20px top corners only

---

## Accessibility

**Contrast:** All text/background pairs meet WCAG AA. Amber accent is decorative only on reflection background. Verify mode shift visibility on physical budget Android — `#FDF7ED` vs `#F5F7F6` are near-identical on low-gamut displays; if mode transition is invisible, add 1px divider line at mode boundary.

**Touch targets by register:**

| Register | Minimum |
|----------|---------|
| In-the-moment | 56×56px — semantic token: `tapTarget.inTheMoment: 56` |
| Preparation, Reflection | 44×44pt iOS / 48dp Android |
| Navigation bar | 44×44pt iOS / 48dp Android |

**SUDS delta:** `↑`/`↓` glyph is the primary directional signal; colour is reinforcement. Glyph is required — colour alone is not sufficient.

**`prefers-reduced-motion`:**
- `ReducedMotionProvider` context at `_layout.tsx` root — **sprint-0 task** before any animated component
- Implementation: `AccessibilityInfo.isReduceMotionEnabled()` with listener
- Motion tokens: `duration.normal: 200ms` · `duration.reduced: 0ms`
- Animation default: `reduced: true` until provider confirms otherwise — fail-safe, not fail-open
- Breathing animation: falls back to static ring + text countdown when reduced

**Colour independence:** Rank badge: colour + number. SUDS delta: colour + `↑`/`↓` glyph. No information conveyed by colour alone.

---
