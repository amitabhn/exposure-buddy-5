# WCAG 2.1 AA Contrast Sign-Off

Date: 2026-05-21
Audited by: claude-sonnet-4-6
Gate: Must receive designer + QA sign-off before sprint 1 begins (UX-DR17)

## Methodology

Contrast ratios computed using WCAG 2.1 relative luminance formula:
- Linearise each RGB channel: `c/12.92` if `c/255 ≤ 0.04045`, else `((c/255 + 0.055) / 1.055)^2.4`
- `L = 0.2126 × R_lin + 0.7152 × G_lin + 0.0722 × B_lin`
- `ratio = (L_lighter + 0.05) / (L_darker + 0.05)`

## Results

| Token pair | Hex values | Ratio | AA Normal (≥4.5:1) | AA Large (≥3:1) | Status |
|---|---|---|---|---|---|
| `content.primary` on `surface.primary` | #1A2E2A / #F5F7F6 | 13.29:1 | PASS | PASS | ✅ |
| `content.primary` on `surface.secondary` | #1A2E2A / #EBF0EE | 12.42:1 | PASS | PASS | ✅ |
| `content.primary` on `reflect.background` | #1A2E2A / #FDF7ED | 13.42:1 | PASS | PASS | ✅ |
| `content.secondary` on `surface.primary` | #4A6B62 / #F5F7F6 | 5.47:1 | PASS | PASS | ✅ |
| `content.secondary` on `surface.secondary` | #4A6B62 / #EBF0EE | 5.10:1 | PASS | PASS | ✅ |
| `accent.courage` on `surface.primary` | #2D6A5A / #F5F7F6 | 5.88:1 | PASS | PASS | ✅ |
| `accent.grounding` on `surface.primary` | #8B6F47 / #F5F7F6 | 4.37:1 | FAIL | PASS | ⚠️ see decision |
| `accent.progress` on `reflect.background` | #E8A84C / #FDF7ED | 1.94:1 | n/a | n/a | ✅ decorative-only |

## Decisions

### `accent.grounding` (#8B6F47) — 4.37:1

**Decision:** Retained with large-text constraint. Not replaced.

4.37:1 falls below the 4.5:1 threshold for normal text but passes the 3:1 threshold for large text (≥18px regular weight or ≥14px bold weight, per WCAG 2.1 Success Criterion 1.4.3).

`accent.grounding` is designated for grounding/somatic tool UI — button backgrounds, icon tints, and section headers — all of which will be rendered at ≥14px bold (typography.h3 or larger). It must not be used as a foreground colour on normal-size body text.

**Component guideline added to token comment in `packages/ui/src/tokens/theme.ts`:**
> `// 4.37:1; AA large text only (≥18px or ≥14px bold); never use for normal-size text`

### `accent.progress` (#E8A84C) — confirmed decorative-only

1.94:1 on `reflect.background` — fails all text AA thresholds. Confirmed decorative-only usage: pull-quote border, score highlight. No text on `reflect.background` uses `accent.progress` as foreground colour; all text on reflection surfaces uses `content.primary` (#1A2E2A, 13.42:1).

## Sign-off

Designer: **[pending — manual sign-off required before sprint 1 begins]**

QA: **[pending — manual sign-off required before sprint 1 begins]**
