---
title: 'Insta Calm Rename — Screen-Reader Label Parity'
type: 'bugfix'
created: '2026-09-30'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: '007e9b016023bb669de4690e12f02e0b77f51ab8'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 12.2's "Calm Me" → "Insta Calm" rename changed only the visual FAB label (`calmMe.fabLabel`, `"INSTA\nCALM"`); the FAB's `accessibilityLabel` (`calmMe.fab`, consumed at `CalmMeFab.tsx:58` and `active.tsx:200`) still announces the pre-rename name in both locales — `"Calm Me"` in `en.json`, `"मुझे शांत करें"` in `hi.json` — so a screen-reader user hears a different product name than a sighted user sees. Same defect class already fixed by Stories 12.1 and 14.1.

**Approach:** Update `calmMe.fab` in both locale files to announce "Insta Calm" as natural speech (not the visual all-caps/two-line treatment), update the one Maestro flow that asserts on the old text, and sweep the rest of the `calmMe.*` copy for any other stale occurrence of the pre-rename name.

## Boundaries & Constraints

**Always:**
- The new accessibility-label value reads as natural speech ("Insta Calm"), not a transcription of the visual label's casing or line break — the Story 14.1 precedent.
- Every changed user-facing string is updated in both `en.json` and `hi.json`.
- `apps/mobile/.maestro/backgrounded-recovery.yaml` is updated in this same change, not a follow-up — `deferred-work.md` already records four Maestro flows that went stale silently; this story must not add a fifth.
- **Decision:** `hi.json`'s `calmMe.fab` stays Latin script — `"Insta Calm"`, matching the existing `fabLabel` precedent, treating "Insta Calm" as an untranslated brand name consistent across both locales.

**Never:**
- Do not rename any code identifier: the route `/calm-me`, `CalmMeFab`, `CalmMeButton`, `calmMeConfig.ts`, `CALM_ME_AFFIRMATIONS`, or the `calmMe.*` i18n namespace all keep their current names.
- Do not change `calmMe.fabLabel` (the visual FAB label) — out of scope, already correct since Story 12.2.
- Do not touch focus order, announcement timing, or add/remove any focusable element — this is a pure string change; the lighter single-platform verification in Tasks & Acceptance depends on that staying true.

</frozen-after-approval>

## Code Map

- `apps/mobile/src/i18n/locales/en.json:341` -- `calmMe.fab` value, change `"Calm Me"` → `"Insta Calm"`
- `apps/mobile/src/i18n/locales/hi.json:292` -- `calmMe.fab` value, change `"मुझे शांत करें"` → `"Insta Calm"` (Latin script, per decision above)
- `apps/mobile/src/components/CalmMeFab.tsx:58` -- consumes `t('calmMe.fab')` as `accessibilityLabel`; no code change, confirms one of the two call sites
- `apps/mobile/app/session/active.tsx:200` -- second consumer of `t('calmMe.fab')` (Story 18.2's resume banner); inherits the fix automatically, no code change
- `apps/mobile/.maestro/backgrounded-recovery.yaml:122,125,129,131` -- lines 125 and 129 assert/tap on `text: "Calm Me"` against this exact `accessibilityLabel`; lines 122 and 131 are explanatory comments naming the same old text. Update all four to "Insta Calm" for consistency.
- `apps/mobile/app/_layout.test.tsx:95` and `apps/mobile/src/components/CalmMeButton.test.tsx:10,13,21,32` -- these hardcode `"Calm Me"` as an arbitrary example `accessibilityLabel` prop passed directly into a mock/generic primitive render, decoupled from the real i18n value — not the FAB's actual production copy. Leave unchanged; do not conflate with `calmMe.fab`.
- `calmMe.fabHint` (both locales) -- confirmed contains no product name ("Opens calming techniques and crisis support" / Hindi equivalent) -- no change needed.
- `apps/mobile/app/session/active.test.tsx:335,341,375,383` -- queries `getByLabelText('calmMe.fab')` against the mocked translation key itself (not the real value) -- unaffected by this change, no update needed.

## Tasks & Acceptance

**Execution:**
- [x] `apps/mobile/src/i18n/locales/en.json` -- change `calmMe.fab` from `"Calm Me"` to `"Insta Calm"` -- closes the screen-reader/visual name mismatch
- [x] `apps/mobile/src/i18n/locales/hi.json` -- change `calmMe.fab` per the resolved localization decision -- same fix for the Hindi locale
- [x] `apps/mobile/.maestro/backgrounded-recovery.yaml` -- update the two `text: "Calm Me"` assertions and the two adjoining comments to "Insta Calm" -- keeps this E2E flow in sync with the new accessibilityLabel in the same change
- [x] Sweep `en.json`/`hi.json`'s `calmMe.*` block for any other stale occurrence of the pre-rename name beyond `fab` -- confirms nothing else was missed (`fabHint` already checked clean)

**Acceptance Criteria:**
- Given `calmMe.fab` is `"Calm Me"` in `en.json` while the visible FAB label reads "INSTA CALM", when this story is implemented, then `calmMe.fab` announces "Insta Calm" in natural-speech casing — not "INSTA CALM" and not the two-line treatment
- Given `hi.json`'s `calmMe.fab` was a genuine Hindi translation of the old name, when the Hindi label is updated, then it reads `"Insta Calm"` in Latin script, matching `fabLabel`
- Given `backgrounded-recovery.yaml` asserts/taps on `text: "Calm Me"` against this accessibilityLabel, when the label changes, then the flow's assertions are updated in the same change and the flow passes
- Given the old name could survive elsewhere in `calmMe.*` copy, when this story is implemented, then a sweep confirms every other occurrence is updated or consciously left unchanged, and no code identifier is renamed
- Given this is a pure string change with no focus-order or announcement-timing change, when verified, then a single one-platform screen-reader spot check confirming the FAB announces "Insta Calm" is sufficient, alongside `pnpm turbo typecheck lint test` green and the updated Maestro flow passing

## Implementation Notes

- `en.json`: `calmMe.fab` changed from `"Calm Me"` to `"Insta Calm"`.
- `hi.json`: `calmMe.fab` changed from `"मुझे शांत करें"` to `"Insta Calm"` (Latin script, matching `fabLabel`, per the frozen decision).
- `backgrounded-recovery.yaml`: the two `text: "Calm Me"` assertions (lines 125, 129) and the two adjoining comments (lines 122, 131) updated to "Insta Calm". Other generic prose references to "the Calm Me FAB" elsewhere in the file's comments (lines 5, 8, 16, 78, 98) were left as-is — they describe the feature/route by its long-standing internal name, not the accessibility-label string under test, and are outside the Code Map's scope for this file.
- Swept both locale files' full `calmMe.*` block (affirmations, `exit`, `keepGoing`/`needToStop`, `debriefNow`, `yes`/`notNow`, `comingSoon`, `back`, `technique.*`, `fabHint`, `fabLabel`) — no other occurrence of the pre-rename name found.
- No code identifiers touched; no focus order, announcement timing, or focusable elements changed.
- **Post-review patch:** added a `Story 18.5` describe block to `apps/mobile/src/i18n/i18n.test.ts` pinning `enJson.calmMe.fab === 'Insta Calm'` and `hiJson.calmMe.fab === enJson.calmMe.fab`, closing the review's medium finding that no automated test in the default CI path would catch a regression to this string.

## Spec Change Log

## Review Triage Log

_Code review of the diff vs. baseline `007e9b016023bb669de4690e12f02e0b77f51ab8` (en.json/hi.json `calmMe.fab` + `backgrounded-recovery.yaml`). Blind Hunter + Edge Case Hunter + Verification Gap Reviewer, 2026-09-30._

- `medium` — [Patch, applied] No automated test in the default CI path (unit/Jest) pins `calmMe.fab`'s exact literal value in either locale. `CalmMeFab.test.tsx` and `active.test.tsx` mock `t()` to return the raw key, never the real translated string, and `i18n.test.ts` doesn't touch `calmMe.fab` even though it already has an established pattern for pinning exact values of other important strings (`enJson.session.intent.intentionPrompt`, `enJson.settings.privacy.title`, `hi.session.debrief.saveFailed`, etc., including the `hi.X === enJson.X` duplication-check pattern). The only test that would catch a regression to this string is the Maestro flow, which is skipped on an unlabeled PR. A future accidental revert of this exact fix would go undetected by `pnpm turbo test`. (Combines Blind Hunter's "no unit/snapshot test pins the value" + "no comment marks the hi.json decision as intentional" findings, Edge Case Hunter's "AC claims verification that wasn't performed" finding, and the Verification Gap Reviewer's filed finding — same root cause: no automated check exercises the real string value.) Fixed by adding a `Story 18.5` describe block to `apps/mobile/src/i18n/i18n.test.ts` pinning `enJson.calmMe.fab === 'Insta Calm'` and `hiJson.calmMe.fab === enJson.calmMe.fab`, matching the file's existing value-pinning pattern.
- `low` — [Defer] The manual on-device screen-reader spot check and the `maestro test` run of the updated `backgrounded-recovery.yaml` flow were not actually performed (no simulator/device/Maestro CLI available in this build environment) — the spec's own Verification/Results section already discloses this. Matches this repo's established pattern of deferring on-device manual verification when no device is available (see e.g. Story 9.2's Profile B cold-start re-measurement).
- `false` — Blind Hunter: "the reviewed diff excludes `sprint-status.yaml`/`epic-18-context.md`, so tracking-update consistency can't be judged from the diff alone." Deliberate scope: those are bookkeeping files outside the story's actual code/content change (per the workflow, the diff under review covers the implementation, not spec/tracker bookkeeping), and their consistency was independently checked by the reviewing session before dispatch.
- `false` — Blind Hunter: "the Maestro rename only touches the 4 lines matching the changed accessibilityLabel, leaving 5 nearby prose comments referencing 'the Calm Me FAB' unchanged, and the diff doesn't show this is deliberate." Refuted by the spec's own Implementation Notes, which explicitly records this scoping decision and its rationale (those comments name the feature's long-standing internal name, not the announced string under test).
- `false` — Blind Hunter: "the diff carries no changelog/release-notes entry." No changelog convention exists in this repository — user-facing fixes are tracked via the spec file + `sprint-status.yaml` entry, which this change already has.
- `low` — [Defer] Blind Hunter: the Maestro comment "Calm-me screen shows 'Insta Calm' heading or accessible content" is inaccurate — the calm-me screen renders with `headerShown: false` and has no heading; the assertion that follows actually checks the unrelated `"I can keep going"` button label. Verified true, but pre-existing: the comment was already equally inaccurate before this diff (it said "Calm Me heading" then too) — this story only swapped the quoted product name, it didn't introduce the inaccuracy.



**Commands:**
- `pnpm turbo typecheck` -- expect: 0 errors across all packages/apps
- `pnpm turbo lint` -- expect: 0 errors, including the `i18next/no-literal-string` and locale-key-parity lint rules
- `pnpm turbo test` -- expect: all existing suites green with no regressions; this is a copy-only key-value change already covered by existing tests that exercise the `accessibilityLabel` wiring via a mocked `t()`

**Manual checks (if no CLI):**
- On one platform (iOS VoiceOver or Android TalkBack), focus the global Calm Me FAB from Home and confirm it announces "Insta Calm" as natural speech, not letter-by-letter caps
- Run the updated `apps/mobile/.maestro/backgrounded-recovery.yaml` flow (locally via `maestro test` or in CI) and confirm it still passes end-to-end

**Results (2026-09-30):**
- `pnpm turbo typecheck` -- 0 errors, 10/10 tasks successful
- `pnpm turbo lint` -- 0 errors, 8/8 tasks successful
- `pnpm turbo test` -- 41 suites / 491 tests passed, 0 regressions (`exposure-buddy-mobile`, includes the 2 new value-pinning tests added by the post-review patch); no manual screen-reader spot check or `maestro test` run performed in this environment (no simulator/device or Maestro CLI available) -- deferred, see `deferred-work.md`.
- Re-verified after the post-review patch (all three commands above re-run clean against the patched tree).
