# Story 12.2: Home Screen — UI/UX Enhancements

**Status:** done

## Story

As a returning user opening the app,
I want the home screen to feel warmer and show my ladder progress at a glance,
So that the app reads as a supportive companion rather than a generic form-driven utility (FR-UXENH-01).

*Source: Claude Design project "Exposure Buddy" (`Home - Redesign.dc.html`, compared against a recreation of the as-shipped screen at `Home - Current.dc.html`), imported via the `claude_design` MCP. First story in Epic 12 to leave placeholder state — see `epics.md` Epic 12 for the placeholder-to-done pattern later stories in this epic should follow.*

---

## Acceptance Criteria

See the full Given/When/Then acceptance criteria under Story 12.2 in `_bmad-output/planning-artifacts/epics.md` (Epic 12). Summary:

1. Every colour in the redesign maps exactly onto the 8 existing semantic tokens in `packages/ui/src/tokens/theme.ts` (Story 1.4) — the Home screen was never migrated onto them until this story. One exception: the completed-state card border (`#F1E4CC`) has no existing token and is kept as a documented raw hex.
2. Container background/padding move onto `color.surface.primary` / `spacing[5]`.
3. A new subGreeting line renders below the existing greeting (name personalization explicitly deferred — no `display_name` read hook exists yet, out of scope for a visual-polish story).
4. A new `LadderProgressBar` component (`packages/ui`) shows ladder completion ("N of M steps climbed" + a filled track) whenever `homeState !== 'empty-ladder'`, computed from the already-fetched `items` array.
5. `CourageLadderEntryCard` (the 'morning' state card) is restyled with a section label, a SUDS badge (dot + "Anxiety N/10"), and an explicit CTA — the SUDS clamp (Story 6.2-B AC5's defense-in-depth) stays inside the component, split as `sudsPrefix`/`sudsSuffix` props around the clamped number rather than moved to the caller.
6. Empty, completed, and progressing states get the redesign's dedicated card treatments and copy, replacing `ladder.emptyState`/`home.state10.*`/`home.state4.*` with `home.emptyState.*`/`home.completedState.*`/`home.progressingState.*`.
7. The global `CalmMeButton` (used app-wide via `CalmMeFab`) is restyled to the redesign's pill-with-label treatment — a deliberate cross-cutting change, called out explicitly since it affects every screen, not just Home.
8. All new/renamed strings are i18n-gated in both `en.json` and `hi.json`; removed keys are deleted, not left as orphans.
9. `apps/mobile/app/(app)/index.test.tsx`, `CalmMeButton.test.tsx`, and `CourageLadderEntryCard.test.tsx` (the latter two hosted in `apps/mobile/src/components/` per that directory's existing convention — `packages/ui` has no RN-renderable test infra) are updated for the new props/copy/behavior.

---

## Tasks / Subtasks

### T1 — Design tokens & container (AC: 1, 2)

- [x] Confirm the redesign's palette maps onto `packages/ui/src/tokens/theme.ts`'s 8 semantic tokens (no new tokens needed except the one documented exception)
- [x] Update `apps/mobile/app/(app)/index.tsx`'s `styles.container` to `color.surface.primary` background and `spacing[5]` horizontal padding

### T2 — Greeting + subGreeting (AC: 3)

- [x] Add `home.subGreetingWelcomeBack` / `home.subGreetingReadyToStart` keys to `en.json` and `hi.json`
- [x] Render the subGreeting line below the existing greeting, driven by the same `seenOnMount.current` check

### T3 — `LadderProgressBar` component (AC: 4)

- [x] Create `packages/ui/src/components/LadderProgressBar.tsx` (pre-translated `label`/`progressLabel` props, `completed`/`total` numbers, clamped fill percentage)
- [x] Export from `packages/ui/src/index.ts`
- [x] Wire into `index.tsx`: compute `completed`/`total` from `items`, add `home.yourLadderLabel` and `home.progressLabel` (interpolated) keys, render for every state except `'empty-ladder'`

### T4 — `CourageLadderEntryCard` redesign (AC: 5)

- [x] Restyle the card: section label, `typography.h2` description, SUDS badge (decorative dot in `color.accent.progress` + prefix/number/suffix text), CTA button — all within the existing single pressable
- [x] Remove the now-unused `ladderItemCount` prop; add `nextStepLabel`, `ctaLabel`, `sudsPrefix`, `sudsSuffix`, `fallbackLabel`
- [x] Keep the SUDS clamp computed inside the component from `lowestPendingItem.predictedSuds`, not pre-formatted by the caller
- [x] Update `apps/mobile/app/(app)/index.tsx`'s usage: `sudsPrefix`/`sudsSuffix` from new `home.nextStep.sudsPrefix`/`sudsSuffix` keys, `fallbackLabel` from the existing `home.courageCard.emptyLabel`/`noPendingLabel` ternary (unchanged logic, now feeding visible text instead of only an a11y label)

### T5 — Empty / completed / progressing state cards (AC: 6)

- [x] Empty state: new card + `home.emptyState.headline`/`subtext`/`cta` keys; preserve `accessibilityLiveRegion="polite"` on the headline (Story 9.3 audit fix)
- [x] Completed state: new card (`color.reflect.background` + `#F1E4CC` border) + `home.completedState.headline`/`subtext`/`cta` keys
- [x] Progressing state: new card (`color.accent.courage` fill) + `home.progressingState.label`/`cta` keys; grounding-aware recovery routing (Story 9.2) unchanged
- [x] Delete the superseded `home.state4.*`/`home.state10.*` keys from both locale files

### T6 — `CalmMeButton` redesign (AC: 7)

- [x] Restyle `packages/ui/src/components/CalmMeButton.tsx` to a 48px pill with a new required `label` prop rendered beside the existing icon
- [x] Add `calmMe.fabLabel` ("INSTA\nCALM") to both locale files
- [x] Update `apps/mobile/src/components/CalmMeFab.tsx` to pass `label={t('calmMe.fabLabel')}`

### T7 — Tests (AC: 9)

- [x] Extend `index.test.tsx`'s `@exposure-buddy/ui` jest mock to re-export real `color`/`radius`/`spacing`/`typography` via `jest.requireActual` (index.tsx's `StyleSheet.create()` dereferences these at module load) alongside lightweight `CourageLadderEntryCard`/`LadderProgressBar` stubs
- [x] Update all renamed-key assertions (`home.state4.cta`→`home.progressingState.cta`, `home.state4.context`→`home.progressingState.label`, `home.state10.message`→`home.completedState.headline`, `ladder.emptyState`/`ladder.addItem`→`home.emptyState.headline`/`home.emptyState.cta`)
- [x] Add progress-bar visibility tests (renders for morning/progressing/completed, absent for empty-ladder)
- [x] Update `CalmMeButton.test.tsx` (add required `label` prop to all 3 render calls) and `CourageLadderEntryCard.test.tsx` (new required props, updated clamp-text assertions without the colon, new fallback-label test)
- [x] `pnpm turbo typecheck lint test` green across all packages/apps (19/19 tasks)

### Review Findings

- [x] [Review][Patch] `progressingLabel` uses `color.surface.secondary` (a background/surface token) as a foreground text color on the green `progressingCard`, inconsistent with its sibling `progressingDescription` which correctly uses explicit white [apps/mobile/app/(app)/index.tsx — progressingLabel/progressingDescription styles] — fixed: changed to `'#ffffff'`, matching `progressingDescription`
- [x] [Review][Patch] `CalmMeButton`'s pill has a fixed `height: 48` (not `minHeight`) and its new two-line `label` Text has no `allowFontScaling={false}`/`maxFontSizeMultiplier`, unlike this codebase's existing convention for other small glyph/label text — will overflow the pill at large accessibility text sizes. This component is mounted globally on every screen [packages/ui/src/components/CalmMeButton.tsx:33-42] — fixed: `height` → `minHeight`, added `allowFontScaling={false}` to the label `Text`
- [x] [Review][Defer] `calmMe.fabLabel` ("INSTA\nCALM") is English-duplicated in `hi.json` rather than translated — deferred, pre-existing convention (matches the established "duplicate English pending Story 9.9 Hindi activation" pattern used throughout both locale files; this is the first instance of that pattern applied to a *visibly rendered* string rather than an accessibility-only one, worth flagging to whoever does the Story 9.9 pass) [apps/mobile/src/i18n/locales/hi.json:276]
- [x] [Review][Patch] Story 12.2's AC1 in epics.md cites "the precedent already established in `CalmMeButton.tsx`'s shadow colour" as raw hex — but this same diff converts that shadow color from `#000000` to the `color.content.primary` token, so the precedent it cites no longer exists in the code. Spec-hygiene only, not a code defect [_bmad-output/planning-artifacts/epics.md — Story 12.2 AC1] — fixed: reworded the AC1 sentence to describe the shadow-colour change accurately instead of citing it as a precedent

---

## Dev Notes

- **Architecture boundary respected:** `packages/ui` has no `react-i18next` dependency (ARC-011-adjacent convention, confirmed via `HelplineCard.tsx`'s existing `callLabel` prop comment). Every new/changed `packages/ui` component takes pre-translated string props; `apps/mobile` is the only layer that calls `t()`.
- **SUDS clamp placement was a deliberate design decision, not an oversight.** The natural refactor when moving to prop-driven text would be to pre-format `"Anxiety 6/10"` entirely in `index.tsx` and pass one string. That would relocate Story 6.2-B AC5's defense-in-depth clamp to the caller and silently drop its dedicated test coverage in `CourageLadderEntryCard.test.tsx` (which mocks `resolveLowestPendingItem` to `null` in `index.test.tsx`, so no equivalent coverage exists there). Splitting into `sudsPrefix`/`sudsSuffix` keeps the clamp — and its tests — inside the component.
- **`CalmMeButton`'s redesign is global**, not Home-scoped, because the component itself is mounted once in `app/_layout.tsx` and appears on every screen. This is flagged explicitly in the AC rather than done silently, since Epic 12's other stories (12.1/12.3/12.4) are scoped to specific screens and a reader might otherwise assume this component was out of bounds for a "Home screen" story.
- **Name personalization deferred:** the redesign mockup shows "Priya" in the greeting. `profiles.display_name` exists in the schema (added around Story 10.x) but has no read hook anywhere in the app today. Wiring one up is a small data-layer feature, not a visual-polish change — deferred rather than pulled into this story's scope.
- **Test-location convention:** `packages/ui` uses Vitest with `passWithNoTests: true` (no RN-renderable test files). Components that need real RN rendering (`CalmMeButton`, `CourageLadderEntryCard`) are tested from `apps/mobile/src/components/*.test.tsx` instead, per that directory's own header comment — this story follows the existing pattern rather than introducing a new one.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

None — no blocking issues. `pnpm turbo typecheck lint test` passed clean (19/19 tasks, 394 mobile Jest tests + full monorepo suite) on the first full run after implementation.

### Completion Notes List

- T1: Confirmed the redesign's entire palette (`#F5F7F6`, `#EBF0EE`, `#1A2E2A`, `#4A6B62`, `#2D6A5A`, `#E8A84C`, `#FDF7ED`) maps 1:1 onto `color.surface.primary/secondary`, `color.content.primary/secondary`, `color.accent.courage/progress`, `color.reflect.background` — no new tokens needed. Only `#F1E4CC` (completed-card border) has no token; kept as a documented raw hex.
- T2–T6: Implemented as described in the ACs; see `apps/mobile/app/(app)/index.tsx`, `packages/ui/src/components/{LadderProgressBar,CourageLadderEntryCard,CalmMeButton}.tsx`, `apps/mobile/src/components/CalmMeFab.tsx`, and both locale files for the full diff.
- T4: `ladderItemCount` prop removed from `CourageLadderEntryCardProps` — it only existed to pick between two fallback strings, a choice now made by the caller (mirroring the existing `accessibilityLabel` ternary already in `index.tsx`), so it had no remaining internal use.
- T7: The `@exposure-buddy/ui` jest mock in `index.test.tsx` originally exported only `CourageLadderEntryCard`. Since `index.tsx` now also imports `color`/`radius`/`spacing`/`typography` for its own `StyleSheet.create()`, the mock was extended with `jest.requireActual('@exposure-buddy/ui')` re-exports for the token objects — without this, `StyleSheet.create()` would throw on `undefined` token access at module load, before any test body runs.
- T7: All 52 tests across the 4 directly-affected suites pass (`index.test.tsx`, `CalmMeButton.test.tsx`, `CourageLadderEntryCard.test.tsx`, `CalmMeFab.test.tsx`); full mobile suite is 394/394; full monorepo `pnpm turbo typecheck lint test` is 19/19 tasks green.

### File List

- `packages/ui/src/components/LadderProgressBar.tsx` (new)
- `packages/ui/src/components/CourageLadderEntryCard.tsx` (modified)
- `packages/ui/src/components/CalmMeButton.tsx` (modified)
- `packages/ui/src/index.ts` (modified)
- `apps/mobile/app/(app)/index.tsx` (modified)
- `apps/mobile/app/(app)/index.test.tsx` (modified)
- `apps/mobile/src/components/CalmMeFab.tsx` (modified)
- `apps/mobile/src/components/CalmMeButton.test.tsx` (modified)
- `apps/mobile/src/components/CourageLadderEntryCard.test.tsx` (modified)
- `apps/mobile/src/i18n/locales/en.json` (modified)
- `apps/mobile/src/i18n/locales/hi.json` (modified)
- `_bmad-output/planning-artifacts/epics.md` (modified — Story 12.2 ACs, Epic 12 summary)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

### Change Log

- 2026-07-30 — Implemented Story 12.2: Home screen redesign per the Claude Design "Exposure Buddy" project (`Home - Redesign.dc.html`). Migrated the screen onto existing `packages/ui` design tokens, added a ladder progress bar, restyled all 4 home states with the warmer palette and explicit CTAs, and restyled the global `CalmMeButton` pill. Status: done.
- 2026-07-30 — Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) of the `main..planning/epic-12-ui-ux-enhancements` branch: 3 patches applied to this story (wrong token used for `progressingLabel` text color, `CalmMeButton` font-scaling overflow risk fixed, epics.md AC1's self-undermining precedent citation reworded), 1 deferred (`calmMe.fabLabel` not translated in `hi.json` — logged in `deferred-work.md`, matches pre-existing convention), 0 dismissed for this story. `pnpm turbo typecheck lint test` green after fixes. Status remains done.
