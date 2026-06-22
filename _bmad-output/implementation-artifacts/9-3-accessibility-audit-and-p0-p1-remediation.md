# Story 9.3: Accessibility Audit & P0/P1 Remediation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user with a visual impairment or who relies on screen reader or large text settings,
I want every interactive element and content region in the app to be correctly labelled and navigable,
so that Exposure Buddy is usable regardless of accessibility need (NFR-ACCESS-01).

## Acceptance Criteria

1. **Given** the full app screen inventory across all epics **When** the accessibility audit is conducted **Then** every screen is reviewed against a checklist that includes: (1) all interactive elements have `accessibilityLabel` set to non-empty, meaningful text; (2) all interactive elements have `accessibilityRole` set appropriately (`button`, `link`, `header`, `text`, `image`); (3) `accessibilityHint` is present wherever the action outcome is non-obvious; (4) focus order follows the visual reading order; (5) `Text` components that display dynamic values use `accessibilityLiveRegion` where appropriate; the audit produces a findings list categorised as P0 (broken or missing — blocks screen reader use), P1 (degraded experience), or P2 (nice-to-have). **Correction:** the screen inventory is 24 routable screens under `apps/mobile/app/**` (layouts and `+not-found.tsx` excluded) — see Dev Notes "Confirmed screen inventory" for the full list. The findings list is written to `apps/mobile/docs/accessibility-audit.md` — this file and the `apps/mobile/docs/` folder **do not exist yet**; this story creates them, establishing the precedent that sibling Stories 9.6 (`error-state-inventory.md`) and 9.7 (`performance-budget.md`) already assume exists. [Source: epics.md#Story 9.3]

2. **Given** the audit findings list is produced **When** this story is considered complete **Then** all P0 and P1 findings are resolved; P2 findings are added to the post-MVP backlog; no P0 or P1 open findings remain at story close. **Correction:** "the post-MVP backlog" is `_bmad-output/planning-artifacts/post-mvp-backlog.md` § 6 "UX & Copy" (existing section, line 263) — append new entries there following the file's established `### N.M Title` / `**What:**` / `**Source:**` / `**Notes:**` format; do not create a new top-level section. [Source: epics.md#Story 9.3; post-mvp-backlog.md]

3. **Given** dynamic type scaling is in scope **When** device font size is set to the largest accessible size (iOS: Accessibility → Larger Text at maximum; Android: Display → Font size at largest) **Then** all text in the app is readable and no text is clipped, overlapping, or hidden; no text sizes are hardcoded in pixels that bypass system font scaling. **Correction:** the epic's literal wording — "NativeWind responsive text utilities are used to handle scaling" — does not apply to this codebase. `apps/mobile` has **zero NativeWind usage**; it is StyleSheet-only throughout, the same fallback adopted for `packages/ui` after the NativeWind v5 spike was rejected in Story 1.3 (`1-3-nativewind-v5-validation-spike.md`). Do not introduce NativeWind to satisfy this AC. Confirmed: `allowFontScaling` is never explicitly set to `false` anywhere in `apps/mobile` or `packages/ui` source, so RN's default Text auto-scaling is not currently being defeated — but it has never been verified end-to-end at max system font size either. This AC is satisfied by: (a) confirming no `allowFontScaling={false}` is introduced, and (b) a manual max-font-size walkthrough of all 24 screens, fixing any layout (not font-scaling-mechanism) breakage found — see Task 7. [Source: epics.md#Story 9.3; packages/ui CLAUDE memory "Story 1.3 FALLBACK — NativeWind v5"]

4. **Given** the Calm Me button and SUDS slider — the two highest-consequence interactive elements in the app **When** a screen reader is active **Then** the Calm Me button announces its label and role before any other interactive element regardless of visual position; the SUDS slider announces its current value, minimum, maximum, and the light-weight subtext for the selected value via `accessibilityValue`. **Correction/clarification:** there is no single "SUDS slider" — there are two separate components implementing the same 0–10 discrete-target pattern: `apps/mobile/src/components/session/SudsScale.tsx` (used in session briefing/active/debrief) and `apps/mobile/src/components/onboarding/SudsCalibrationWidget.tsx` (used in onboarding assessment). **Neither currently sets `accessibilityValue`** — but `apps/mobile/src/components/onboarding/OnboardingStepIndicator.tsx:15` already does (`accessibilityValue={{ min: 1, max: ONBOARDING_STEP_COUNT, now: step }}`, with `OnboardingStepIndicator.test.tsx:26-36` asserting on it), so this is not a greenfield pattern — follow that file's shape and test style rather than inventing a new one. `SudsCalibrationWidget.tsx` already wraps its targets in `accessibilityRole="radiogroup"` (line 15) — `SudsScale.tsx` does not (its targets are bare `accessibilityRole="button"` siblings with no group wrapper, `SudsScale.tsx:28-35`). Both need `accessibilityValue` added to converge on one correct pattern. On the Calm Me button: `packages/ui/src/components/CalmMeButton.tsx` has `accessibilityRole="button"` + `accessibilityLabel` (lines 19-20) but no `accessibilityHint`. The "announces before any other interactive element regardless of visual position" requirement is **currently violated by JSX structure, not styling**: `CalmMeFab` (which renders `CalmMeButton`) is mounted in `apps/mobile/app/_layout.tsx:107`, as a sibling rendered *after* `<Stack>` closes (`<Stack>` spans lines 97-106) — in accessibility-tree traversal order this places it **last**, not first, on every screen, even though it is visually positioned via `position: 'absolute'` (`CalmMeFab.tsx:52`) and appears to float independent of layout. Because the FAB's visual position is controlled entirely by absolute styling, its JSX order can be moved without changing its visual position — see Dev Notes and Task 6. [Source: epics.md#Story 9.3; packages/ui/src/components/CalmMeButton.tsx; apps/mobile/src/components/CalmMeFab.tsx; apps/mobile/app/_layout.tsx; apps/mobile/src/components/session/SudsScale.tsx; apps/mobile/src/components/onboarding/SudsCalibrationWidget.tsx]

## Tasks / Subtasks

- [ ] **Task 1 — Scaffold the audit artifact (AC: 1)**
  - [ ] 1.1 Create `apps/mobile/docs/accessibility-audit.md` (new folder, first file in it — precedent-setting path for Story 9.6/9.7). Header the doc with the 5-point checklist from AC1 verbatim, plus a P0/P1/P2 definition block.
  - [ ] 1.2 List all 24 confirmed screens as audit subjects, grouped by area (see Dev Notes "Confirmed screen inventory" for the authoritative list — do not re-derive from scratch, use it as the starting checklist so no screen is silently skipped).

- [ ] **Task 2 — Conduct the per-screen audit (AC: 1)**
  - [ ] 2.1 For each of the 24 screens, walk every interactive element (`Pressable`, `TouchableOpacity`, `TextInput`, `AccessiblePressable`) against the 5-point checklist; record every gap in `accessibility-audit.md` with exact `file:line` citations — vague findings ("some screens need work") are not acceptable, every entry must be independently verifiable by a reviewer.
  - [ ] 2.2 Give full re-verification (not a skim) to the screens flagged by the pre-story scan as lowest-density: `session/briefing.tsx` (2 a11y-prop hits / 2 interactive elements), `calm-me/grounding.tsx` (2/2), `calm-me/helplines.tsx` (2/2 — this is the crisis-helpline screen, treat any gap here as P0 by default given the user state it serves), `session/technique.tsx` (4), `(onboarding)/assessment.tsx` (4), `session/intent.tsx` (3).
  - [ ] 2.3 `(onboarding)/crisis.tsx` and `privacy-notice.tsx` showed **zero** accessibility props in the pre-story scan. Confirm whether this is correct (purely static text, nothing interactive, so nothing to label) or a genuine gap (e.g. missing `accessibilityRole="header"` on section titles, missing live-region behaviour on crisis safety content). Do not assume zero-props means zero-findings — verify directly against the file.
  - [ ] 2.4 Categorise every finding P0 / P1 / P2 per AC1's definitions.

- [ ] **Task 3 — Resolve P0 findings (AC: 2)**
  - [ ] 3.1 Fix every P0 finding from Task 2.
  - [ ] 3.2 Identify `Text` components rendering dynamic values during the audit (session timer, breathing-coach countdown, live SUDS value display, sync/loading status) and add `accessibilityLiveRegion="polite"` (or `"assertive"` only where the update is safety-relevant) — zero `accessibilityLiveRegion` usage exists in the codebase today, so this is new ground, not a fix to an existing broken usage.

- [ ] **Task 4 — Resolve P1 findings and defer P2 (AC: 2)**
  - [ ] 4.1 Fix every P1 finding from Task 2.
  - [ ] 4.2 Append every P2 finding to `post-mvp-backlog.md` § 6 "UX & Copy" (line 263), following the existing `### N.M Title` / `**What:**` / `**Source:**` / `**Notes:**` entry format exactly — do not invent a new section.

- [ ] **Task 5 — SUDS components: `accessibilityValue` + pattern convergence (AC: 4)**
  - [ ] 5.1 Add `accessibilityRole="radiogroup"` + `accessibilityValue={{ min: 0, max: 10, now: value }}` to the container `View` in `SudsScale.tsx` (currently has no group wrapper at all, `SudsScale.tsx:23`) — converge on the pattern `SudsCalibrationWidget.tsx` already partially establishes.
  - [ ] 5.2 Add `accessibilityValue={{ min: 0, max: 10, now: value }}` to `SudsCalibrationWidget.tsx`'s existing `accessibilityRole="radiogroup"` wrapper (`SudsCalibrationWidget.tsx:14-17`) — it has the role, not the value.
  - [ ] 5.3 AC4 also requires the announcement to include "the light-weight subtext for the selected value" — `accessibilityValue` supports an optional `text` field (a custom announcement string that overrides the numeric min/max/now composition on some platforms) for this; compose it from the same anchor-text source each component already uses for its selected-state label (`ANCHOR_KEYS`/`t(anchorKey)` in `SudsScale.tsx`; the onboarding widget's anchor `Text` elements) so screen readers announce the subtext, not just the raw number.
  - [ ] 5.4 Verify via manual VoiceOver/TalkBack pass (or RNTL `accessibilityValue` prop assertions, which Jest can check without a real screen reader) that both components now announce value + min + max + subtext.

- [ ] **Task 6 — Calm Me button: hint + accessibility-tree focus order (AC: 4)**
  - [ ] 6.1 Add `accessibilityHint` to `CalmMeButton.tsx` (`packages/ui/src/components/CalmMeButton.tsx:19-20` currently has role + label, no hint) — thread it through as a new optional prop, with `CalmMeFab.tsx:46` passing a translated hint string, mirroring how `accessibilityLabel` is already threaded.
  - [ ] 6.2 Move `<CalmMeFab />` (`apps/mobile/app/_layout.tsx:107`) to render **before** `<Stack screenOptions={{ headerShown: false }}>` (currently opens at line 97), i.e. immediately after `<ThemeProvider value={DefaultTheme}>` opens at line 96. `CalmMeFab`'s container is `position: 'absolute'` (`CalmMeFab.tsx:52`), so this reorder changes accessibility-tree traversal order without changing visual position or z-index. Confirm visually after the move that the FAB still renders in the same place — this is a pure ordering fix, not a styling change.
  - [ ] 6.3 Verify the fix: either a manual screen-reader pass on one representative screen (swipe-to-first-element should land on the Calm Me button, not screen content) or an RNTL test asserting the FAB's accessible element precedes screen content in render/query order. Document which verification method was used in Completion Notes — this AC cannot be fully proven by a snapshot test alone since accessibility-tree traversal order is a platform runtime behaviour, not purely a React tree property.

- [ ] **Task 7 — Dynamic type scaling walkthrough (AC: 3)**
  - [ ] 7.1 Confirm no `allowFontScaling={false}` exists anywhere in `apps/mobile` or `packages/ui` (already confirmed absent in pre-story scan — re-verify at story close in case Tasks 3-6 introduced one).
  - [ ] 7.2 Set system font size to maximum accessible size (iOS Accessibility → Larger Text at maximum; Android Display → Font size at largest) and walk all 24 screens from the Task 1 inventory; record any text that clips, overlaps, or truncates.
  - [ ] 7.3 Fix layout issues found — prefer `flexWrap`/`minHeight` over fixed `height` containers (note `SudsScale.tsx:53` already uses `minHeight: 56`, a correct existing pattern to extend elsewhere), relax or remove `numberOfLines` caps where truncation would lose meaning, ensure scrollable containers wrap content that may grow under large text.

- [ ] **Task 8 — Establish accessibility testing convention (AC: 1, 4)**
  - [ ] 8.1 `OnboardingStepIndicator.test.tsx:26-36` is the one existing precedent for asserting on `accessibilityValue` in this repo (testing `OnboardingStepIndicator.tsx:15`'s `accessibilityValue={{ min, max, now }}`) — follow its assertion style for the four components touched by Tasks 5-6: add or extend co-located `*.test.tsx` for `SudsScale.tsx`, `SudsCalibrationWidget.tsx`, `CalmMeButton.tsx` (packages/ui), and `CalmMeFab.tsx`, asserting the new `accessibilityValue`/`accessibilityHint`/group-role props are present with the expected shape.
  - [ ] 8.2 Per-screen findings from Task 2 are verified by manual screen-reader walkthrough and recorded in `accessibility-audit.md`, not exhaustively unit-tested — reserve new automated tests for the four AC4-named components plus any P0 fix where a regression-guard assertion is cheap to add alongside an existing test file already being touched.

## Dev Notes

### Confirmed screen inventory (24 screens, `apps/mobile/app/**`)

Layouts (`_layout.tsx` files) and `+not-found.tsx` are excluded from the audit subject list but matter for Task 6's focus-order fix.

- **Auth** `(auth)/`: `sign-in.tsx`, `otp-verification.tsx`
- **Onboarding** `(onboarding)/`: `welcome.tsx`, `assessment.tsx`, `ladder.tsx`, `crisis.tsx`, `complete.tsx`
- **Home** `(app)/`: `index.tsx`, `settings/index.tsx`
- **Calm-Me/Grounding** `calm-me/`: `index.tsx`, `breathing.tsx`, `grounding.tsx`, `helplines.tsx`
- **Session/ERP** `session/`: `intent.tsx`, `briefing.tsx`, `technique.tsx`, `active.tsx`, `pause.tsx`, `grounding.tsx`, `debrief.tsx`, `abandoned.tsx`
- **Settings/Misc** (root): `reminder-settings.tsx`, `privacy-notice.tsx`, `ladder.tsx`

[Source: pre-story repo scan of `apps/mobile/app/**`]

### `apps/mobile/docs/` does not exist yet

Confirmed via repo-wide search: no `apps/mobile/docs/` folder, no `error-state-inventory.md`, no `performance-budget.md`. Stories 9.6 and 9.7 reference these paths as if they already exist — this story is the first to actually create `apps/mobile/docs/`. Use kebab-case filenames consistent with this repo's non-component-file naming convention (`accessibility-audit.md`). [Source: implementation-patterns-consistency-rules.md l.21 naming convention; repo-wide file search]

### No accessibility section in the architecture doc

`implementation-patterns-consistency-rules.md` has no existing section on accessibility, WCAG, or screen-reader conventions — this story is establishing the working pattern from scratch (the audit doc itself, the `accessibilityValue` usage on SUDS components, the radiogroup convergence) rather than following a documented precedent. Do not assume conventions exist that aren't in this story's Dev Notes or visible in the cited files.

### `AccessiblePressable` already exists — reuse it, don't reinvent

`packages/ui/src/primitives/AccessiblePressable.tsx` is the established accessibility-aware Pressable wrapper, already consumed by `SudsCalibrationWidget.tsx`. `SudsScale.tsx` uses a bare `TouchableOpacity` instead. Converging `SudsScale.tsx` onto `AccessiblePressable` is optional for this story (not required by any AC) — if done, treat it as a bonus consistency fix, not a blocker; the required fix is the `accessibilityValue`/`radiogroup` addition (Task 5), which works regardless of which underlying touchable is used.

### Reference pattern already done correctly: `SudsArcChart`

`packages/ui/src/components/SudsArcChart.tsx:45-47` already has `accessible`, `accessibilityLabel`, and `accessibilityRole="image"` correctly set on a non-interactive data visualization. Use this as the in-repo reference for "what good looks like" when auditing other data-display (non-interactive) elements in Task 2.

### Reference pattern already done correctly: `OnboardingStepIndicator`

`apps/mobile/src/components/onboarding/OnboardingStepIndicator.tsx:15` already sets `accessibilityValue={{ min: 1, max: ONBOARDING_STEP_COUNT, now: step }}`, with `OnboardingStepIndicator.test.tsx:26-36` already asserting on it. This is a working, tested `accessibilityValue` precedent in the repo — Task 5's `accessibilityValue` additions to the two SUDS components, and Task 8's test assertions, should follow this file's shape rather than be designed from scratch.

### packages/ui and apps/mobile are StyleSheet-only — do not introduce NativeWind

Both packages are StyleSheet-based following the NativeWind v5 rejection documented in Story 1.3 (`1-3-nativewind-v5-validation-spike.md` — LightningCSS + Expo Go runtime failures). AC3's literal epic text references NativeWind utilities that do not apply here; see AC3's correction above. Any dynamic-type fix must be a StyleSheet/layout change (flexWrap, minHeight, numberOfLines), not a NativeWind migration.

### Why the Calm Me button's focus order is currently wrong (not a guess — read the files)

`CalmMeFab` is mounted once, globally, in `apps/mobile/app/_layout.tsx` as a sibling of `<Stack>` — not inside each screen. Its JSX position (`_layout.tsx:107`, after `<Stack>` closes at line 106) determines accessibility-tree traversal order on every screen simultaneously, because every screen renders inside that same `<Stack>`. This is why the fix is a single one-line move in `_layout.tsx` (Task 6.2), not a per-screen change — fixing it once at the layout level fixes it for all 24 screens at once. Do not attempt to fix this per-screen.

### `pnpm turbo test` is now a CI gate (Story 9.2)

Story 9.2 added the first repo-wide `test` job to `.github/workflows/ci.yml` (`needs: [build]`, runs `pnpm turbo test`). Any new test added in Task 8 runs in CI automatically — a red local `pnpm turbo test` now blocks merge to `main`, not just a local nuisance.

### Previous story (9.2) relevance

Story 9.2 (offline session recovery integration tests) is unrelated in subject matter — no offline/sync logic is touched by this story. The only carryover is repo-wide: the new CI test gate (above), and confirmation that `pnpm turbo test typecheck lint` is the standard full-validation command before marking a story done.

### Project Structure Notes

- New: `apps/mobile/docs/accessibility-audit.md` (new folder + file, Task 1).
- Modified: `packages/ui/src/components/CalmMeButton.tsx` (add `accessibilityHint` prop, Task 6.1).
- Modified: `apps/mobile/src/components/CalmMeFab.tsx` (pass hint through, Task 6.1).
- Modified: `apps/mobile/app/_layout.tsx` (move `<CalmMeFab />` before `<Stack>`, Task 6.2).
- Modified: `apps/mobile/src/components/session/SudsScale.tsx` (radiogroup wrapper + `accessibilityValue`, Task 5.1, 5.3).
- Modified: `apps/mobile/src/components/onboarding/SudsCalibrationWidget.tsx` (`accessibilityValue`, Task 5.2, 5.3).
- Modified: `_bmad-output/planning-artifacts/post-mvp-backlog.md` (append P2 findings under § 6, Task 4.2).
- Modified: an unenumerable set of screen files under `apps/mobile/app/**` per Task 2/3/4's audit findings — the exact list is only known once the audit (Task 2) is complete; do not pre-guess it, populate the File List at completion from the actual diff.
- New/modified tests: co-located `*.test.tsx` for `SudsScale.tsx`, `SudsCalibrationWidget.tsx`, `CalmMeButton.tsx`, `CalmMeFab.tsx` (Task 8.1), plus any regression-guard tests added alongside P0 fixes (Task 8.2).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.3] — full AC text
- [Source: _bmad-output/planning-artifacts/prd.md:483] — NFR-ACCESS-01 definition
- [Source: _bmad-output/implementation-artifacts/1-3-nativewind-v5-validation-spike.md] — NativeWind v5 rejection rationale, basis for AC3's correction
- [Source: _bmad-output/planning-artifacts/post-mvp-backlog.md:263] — § 6 "UX & Copy", target section for P2 deferrals, entry format
- [Source: packages/ui/src/components/CalmMeButton.tsx:19-20] — current accessibility props on Calm Me button
- [Source: apps/mobile/src/components/CalmMeFab.tsx:43-53] — FAB wiring, absolute positioning
- [Source: apps/mobile/app/_layout.tsx:96-108] — `<CalmMeFab />` JSX position relative to `<Stack>`, the focus-order root cause
- [Source: apps/mobile/src/components/session/SudsScale.tsx:23-46] — session SUDS component, no group wrapper
- [Source: apps/mobile/src/components/onboarding/SudsCalibrationWidget.tsx:14-33] — onboarding SUDS component, has radiogroup, missing accessibilityValue
- [Source: packages/ui/src/components/SudsArcChart.tsx:45-47] — reference pattern for correct non-interactive a11y usage
- [Source: apps/mobile/src/components/onboarding/OnboardingStepIndicator.tsx:15, OnboardingStepIndicator.test.tsx:26-36] — existing working `accessibilityValue` precedent and test style to follow
- [Source: packages/ui/src/primitives/AccessiblePressable.tsx] — existing accessibility-aware Pressable wrapper
- [Source: .github/workflows/ci.yml] — `test` job added in Story 9.2, now gates this story's new tests
- [Source: _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md] — confirmed: no existing accessibility section; naming conventions (l.21) followed for new doc filename

## Testing Requirements

- New/extended unit tests (Vitest for `packages/ui`, Jest/RNTL for `apps/mobile`) for `SudsScale.tsx`, `SudsCalibrationWidget.tsx`, `CalmMeButton.tsx`, `CalmMeFab.tsx` — assert `accessibilityRole`, `accessibilityLabel`/`Hint`, and `accessibilityValue` shape (Task 8.1).
- Manual verification (not Jest-automatable) required for: Task 6.3's focus-order check (screen reader or RNTL query-order assertion) and Task 7's max-font-size walkthrough — document completion of both explicitly in Completion Notes since neither produces an automated CI signal on its own.
- Run `pnpm turbo test typecheck lint` before marking done — the new `test` CI gate from Story 9.2 makes this merge-blocking for the first time for any new tests this story adds.

## Project Context Reference

No `project-context.md` exists in this repo (checked at workflow activation — no persistent facts loaded beyond the standard config/architecture docs already cited above).

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6)

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Change |
|---|---|
| 2026-06-22 | Story 9.3 created via create-story workflow. Corrected AC1 (screen inventory = 24 confirmed routes; audit doc path = `apps/mobile/docs/accessibility-audit.md`, folder created by this story), AC2 (P2 target = post-mvp-backlog.md § 6, existing section), AC3 (NativeWind reference does not apply — apps/mobile is StyleSheet-only per Story 1.3's fallback), AC4 (no single "SUDS slider" — two components, `SudsScale.tsx` + `SudsCalibrationWidget.tsx`, both missing `accessibilityValue`; Calm Me focus-order violation traced to `_layout.tsx:107`'s JSX position relative to `<Stack>`, not styling). |
| 2026-06-22 | Independent checklist validation (fresh-context review against actual source files) found one defect: the story claimed `accessibilityValue` was unused anywhere in the codebase, but `OnboardingStepIndicator.tsx:15`/`.test.tsx:26-36` already has a working, tested precedent. Corrected AC4, Task 8.1, and Dev Notes to cite it as the pattern to follow instead of declaring the work greenfield. All other file:line citations, the 24-screen inventory, the `apps/mobile/docs/` absence, and the zero-NativeWind claim were independently re-verified as accurate. |
