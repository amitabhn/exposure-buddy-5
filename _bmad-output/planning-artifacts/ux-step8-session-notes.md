# UX Step 8 — Visual Foundation: Session Notes

**Status:** In progress — Advanced Elicitation Failure Mode Analysis (method 1) completed. Awaiting user accept/reject before continuing.

**Resume at:** Advanced Elicitation 1–5/r/a/x menu — user was reviewing Failure Mode Analysis findings and needs to accept (y) or reject (n) before re-entering the menu.

---

## Selected Direction

**Option B — Deep Trust**

Forest teal courage accent, amber progress, warm brown grounding, sage surfaces, warm amber reflection background. Inter (body) + DM Serif Display (narrative moments, 4 surfaces only).

---

## Visual Foundation Content (Current Enhanced State)

### Color System — Deep Trust

**Colour rationales (Sally):**
- Surface primary `#F5F7F6`: Neutral entry — doesn't shout "app", says "room"
- Surface secondary `#EBF0EE`: Preparation register ground — containing, slightly warmer than surface
- Content primary `#1A2E2A`: Deep forest — clinical authority without the coldness of navy or black
- Content secondary `#4A6B62`: Supporting text — same family as courage accent, reading as "part of the same voice"
- Accent courage `#2D6A5A`: Forest teal — growth is gradual and rooted, not electric
- Accent progress `#E8A84C`: Amber — a quiet glow, not a celebration; warm, not garish
- Accent grounding `#8B6F47`: Warm brown — somatic work should feel like the earth, not the screen
- Reflection background `#FDF7ED`: Warm amber wash — the environment shifts when the mode shifts; users feel it before they register it

**Contrast fix (Failure Mode C6):** `#E8A84C` on `#FDF7ED` = 2.1:1 — fails WCAG AA for text. Amber accent on reflection background is decorative only (pull-quote border, score number highlight). All text on reflection background uses `#1A2E2A`.

**Dark mode decision required (Failure Mode C5/A4) — UNRESOLVED:**
The spec is currently silent on dark mode. NativeWind v5 activates `dark:` classes automatically when OS is in dark mode. Without dark token variants, all surfaces break. Two options:
- **Option 1:** Explicitly opt out of dark mode at app root (`colorScheme="light"` lock) until dark tokens are designed — simplest, safe for MVP
- **Option 2:** Define dark token variants now
**This is a sprint-0 decision. Cooper must choose before spec is finalised.**

**Mode register token architecture (Winston):**
```
groundingTokens  // static export — no async provider dependency (2-second SLA)
preparingTokens  // context-resolved via ThemeContext
reflectingTokens // context-resolved via ThemeContext
```
Default context value: `preparing` (not null) — safe fallback on null initialisation.

ESLint rule required: grounding token imports must not appear inside any Context or Provider file.

**Token/Tailwind bridge (Winston):**
Define colours once in `tailwind.config.ts`, re-export into `packages/ui/src/tokens/theme.ts` for typed TypeScript access. `tailwind.config.ts` is the upstream source.

**NativeWind v5 CSS var spike (Amelia):** Pre-sprint-1 gate. Test: each semantic token resolves to a non-undefined hex value on Android Hermes. If CSS vars unstable → JS-object ThemeProvider pattern as fallback.

---

### Typography System

**Typefaces:** Inter (body) + DM Serif Display italic (narrative moments — 4 surfaces only)

**DM Serif Display scope (enforced):**
1. Score reveal screen (dedicated screen)
2. Prediction vs. reality quote (dedicated screen)
3. Week 4/8 progress readback headline (dedicated screen)
4. Pre-exposure writing field read-back (user-authored text rendered back)

DM Serif Display appears on **dedicated screens only** — never mid-flow on an existing screen. This eliminates the jarring handoff risk and the dyslexia risk (users are reading, not acting, on these screens).

Lint/comment enforcement in font token export:
```ts
// narrativeFont: use ONLY at: score-reveal, prediction-reveal, week-4-readback, pre-exposure-write
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

**Font loading (Amelia + Winston):**
- Both fonts gated behind `SplashScreen.preventAutoHideAsync()` — covers Inter AND DM Serif Display
- Explicit error branch: `fontsLoaded, fontError = useFonts(...)` — if `fontError` → fallback font tree, not crash
- Fallback chain as tokens (not ad-hoc): `Inter → System (SF Pro / Roboto)`, `DM Serif Display → system serif`

**14px minimum enforcement:** PR checklist — "No primary copy uses `text-body-sm` or smaller."

---

### Spacing & Layout Foundation

**Base unit: 4px**

| Token | Value | Notes |
|-------|-------|-------|
| `space-0` | 0px | For explicit zero spacing |
| `space-px` | 1px | Dividers, border widths |
| `space-1` | 4px | Icon+label gap, tag internal padding |
| `space-2` | 8px | Standard intra-component spacing |
| `space-3` | 12px | Dense component padding |
| `space-4` | 16px | Standard component padding, screen horizontal margin |
| `space-5` | 20px | Between components within a section |
| `space-6` | 24px | Section spacing, card-to-card gap |
| `space-7` | 28px | Mid-range spacing (no magic number hardcoding) |
| `space-8` | 32px | Screen section separators |
| `space-10` | 40px | **Reflection register only** — deliberate breathing room |

`space-10` annotated in `theme.ts`: `// reflection register only — do not use in preparing or grounding surfaces`

**`tailwind.config.js` border radius extensions required:**
```js
theme: { extend: { borderRadius: { card: '14px', button: '12px' } } }
```

**Layout principles:**
- Single column throughout — clinical rationale: SUDS scale and ladder items are full-width clinical instruments, not UI preferences
- Screen horizontal padding: `space-4` (16px) **inside** safe area insets (not outside)
- `SafeAreaProvider` at root in `_layout.tsx` — **sprint-0 prerequisite** (before any screen work)
- `useSafeAreaInsets` called inside `SafeAreaProvider` — failure here is a day-1 crash

---

### Accessibility

**Contrast:**
- All text/background pairs meet WCAG AA minimum
- `#E8A84C` on `#FDF7ED`: decorative only (see colour system fix above)
- Verify on physical budget Android — `#FDF7ED` vs `#F5F7F6` near-identical on low-gamut displays; if mode shift invisible, consider 1px border-bottom or slight delta increase

**Touch targets per register:**

| Register | Minimum touch target |
|----------|---------------------|
| In-the-moment | 56×56px (semantic token: `tapTarget.inTheMoment`) |
| Standard (preparation, reflection) | 44×44pt iOS / 48dp Android |
| Navigation bar | 44×44pt iOS / 48dp Android |

**SUDS delta:** `↑`/`↓` glyph is the primary directional signal; colour is reinforcement. Glyph must be present — colour alone is not sufficient.

**`prefers-reduced-motion` implementation:**
- `AccessibilityInfo.isReduceMotionEnabled()` — async, requires listener
- `ReducedMotionProvider` context at `_layout.tsx` root — **sprint-0 task** before any animated component
- Animation components default to `reduced: true` until provider confirms otherwise (fail-safe, not fail-open)
- Motion tokens: `duration-normal: 200ms`, `duration-reduced: 0ms`

**No info by colour alone:**
- Rank badge: colour + number ✓
- SUDS delta: colour + `↑`/`↓` glyph ✓ (glyph now specified)
- Other instances: verify at component level

---

## Pending Decision

**Dark mode:** Cooper must choose Option 1 (opt out, `colorScheme="light"` lock at app root) or Option 2 (define dark token variants now) before the spec is written to the document. This is the only remaining unresolved item.

---

## Open Failure Mode Analysis Findings (Awaiting Accept/Reject)

The Failure Mode Analysis surfaced 22 failure modes across 5 components. All are captured above in the enhanced content. The user needs to confirm (y) or reject (n) these changes before the 1–5/r/a/x menu re-presents.

Key new items from Failure Mode Analysis not previously in the spec:
1. Dark mode decision (C5/A4) — sprint-0, unresolved
2. Amber contrast fix on reflection background (C6)
3. `space-7`, `space-0`, `space-px` added to spacing scale
4. `space-10` annotated as reflection-register only
5. SUDS delta glyph `↑`/`↓` specified as primary signal
6. Animation default: `reduced: true` until provider confirms
7. `text-display` capped at 24px for width < 360px
8. DM Serif Display scope: dedicated screens only, never mid-flow

---

## What to Do at Resume

1. Present the Failure Mode Analysis findings summary to Cooper
2. Ask: accept (y) / reject (n) / partial
3. If y: incorporate into content (already in enhanced state above)
4. Re-present Advanced Elicitation 1–5/r/a/x menu
5. On [x]: proceed to write full Step 8 content to `ux-design-specification.md`, update frontmatter (`stepsCompleted: [1..8]`, remove `stepInProgress` and `stepInProgressNotes`)
