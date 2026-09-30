---
title: 'Interactive 5-4-3-2-1 Grounding — Text Entry Per Sense'
type: 'feature'
created: '2026-09-30'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: '0f076f3f16f750a51dd0e90f9a421f4e131c6119'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The 5-4-3-2-1 grounding exercise (`GroundingPrompt`, `packages/ui/src/components/GroundingPrompt.tsx`) is display-only — it shows one prompt per step ("Notice 5 things you can see") and advances on a "Got it" tap, with no input anywhere. A user can tap through all five steps without doing the exercise; naming what you notice is what actually grounds you.

**Approach:** Add per-step text fields (count matching the step: 5/4/3/2/1) beneath each prompt, independently editable, optional, never gating advancement. Field counts move from prompt-string text into data (`GROUNDING_STEPS` gains `count`), threaded through `GroundingPromptProps`. Entries are ephemeral component state — never lifted out, persisted, or synced. (Crisis-keyword detection on these fields is a deferred fast-follow — see `deferred-work.md`.)

## Boundaries & Constraints

**Always:**
- Typing never gates advancement — "Got it"/"I'm done" stay enabled regardless of field content, in both entry contexts.
- Field values are ephemeral component state inside `GroundingPrompt`, reset per step, never returned via props, never persisted or synced.
- `GROUNDING_STEPS` stays free of `react-native`/`expo-*`/`@supabase/*` imports (ARC-011) and becomes the single source of truth for field count — prompt copy must not disagree with it.
- New strings (field label template, placeholder) go in both `en.json` and `hi.json`; `hi.json` gets the English copy duplicated per this epic's no-localization-decision-yet convention.
- Keyboard avoidance is explicit (`KeyboardAvoidingView` + scroll) — the app has zero existing usage of it, so there's no pattern to copy; the advance button must stay reachable without dismissing the keyboard.
- Each field gets its own accessible label; focus order is prompt → fields → advance button; the existing step-change announcement must not steal focus from an active field. Verify on-device with VoiceOver and TalkBack (full dual-platform protocol, since focus behavior changes here).
- **Decision:** identical interactivity from both entry points (Insta Calm hub, Stop Exposure) — same route/screen either way, so no session-specific branch exists. Backlog 6.5's framing-copy question stays open and unaffected.

**Never:**
- No value prop, `onChange`, or any way for typed text to leave `GroundingPrompt` — no persistence path, however small.
- Do not touch `packages/supabase`, PowerSync schema, RLS, or the erasure/export functions.
- Do not backfill the pre-existing `hi.json` `grounding541` gaps (`touch`/`smell`/`taste`/`complete` already missing) — add only this story's new keys, matching the 18.4 precedent.
- Do not wire `detectCrisisKeywords` in this story — deferred, not cancelled (see `deferred-work.md`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Normal use | Types 2 of 5 "see" fields, taps "Got it" | Advances to "hear"; typed values discarded, new step's fields render empty | N/A |
| No input | Taps through every step empty | Advances/completes exactly as today | N/A |
| Small-screen + keyboard | 5 stacked fields, keyboard open | Advance button stays reachable by scroll without dismissing keyboard | N/A |

</frozen-after-approval>

## Code Map

- `packages/core/src/config/grounding-exercise.ts` -- add `count` to each `GROUNDING_STEPS` entry (5/4/3/2/1).
- `packages/ui/src/components/GroundingPrompt.tsx` -- display-only today (announce effect: lines 47-54; cross-fade effect: 59-71). Add per-field `TextInput`s sized to `steps[stepIndex].count`, state reset on `stepIndex` change, `KeyboardAvoidingView`/scroll wrapper.
- `apps/mobile/app/calm-me/grounding.tsx` -- sole screen rendering `GroundingPrompt`, reached identically from `calm-me/index.tsx:122` and `session/grounding.tsx:119`. Build `steps` with `count` + `fieldLabels: string[]` (`t('grounding541.fieldLabel', {index, count})`), pass `fieldPlaceholder`.
- `en.json` (`grounding541`, line 384) / `hi.json` (line 323, already missing `touch`/`smell`/`taste`/`complete` — leave alone) -- add `fieldLabel`, `fieldPlaceholder`.
- `apps/mobile/app/calm-me/grounding.test.tsx` -- extend this existing suite with new-field cases; `packages/ui` has no RN-renderable test setup, so tests live here, not there.
- `apps/mobile/app/session/grounding.test.tsx` -- picker screen only links to `/calm-me/grounding`, never renders `GroundingPrompt`; touch only if the prop change breaks its build.

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/config/grounding-exercise.ts` -- add `count` per step -- single source of truth, keeps prompt copy and rendered fields in sync
- [x] `packages/ui/src/components/GroundingPrompt.tsx` -- render N optional fields per step, ephemeral reset-per-step state, keyboard-avoiding scroll -- closes the display-only gap, no persistence path
- [x] `apps/mobile/app/calm-me/grounding.tsx` -- thread `count`/`fieldLabels`/`fieldPlaceholder` into `steps` -- wires the new API into the one screen serving both entry contexts
- [x] `en.json` + `hi.json` -- add `grounding541.fieldLabel`, `.fieldPlaceholder` -- CI-enforced `t()` convention
- [x] `apps/mobile/app/calm-me/grounding.test.tsx` -- cases: field count per step, non-gating advancement, values don't survive a step change

**Acceptance Criteria:**
- Given step 1, when rendered, then exactly 5 optional labeled fields appear beneath the prompt
- Given some fields filled and some empty, when "Got it"/"I'm done" is tapped, then advancement is unaffected — no field is required
- Given a step change, when the new step renders, then it shows empty fields sized to its own count
- Given entry via Stop Exposure vs. the Insta Calm hub, then behavior is identical in both
- Given `pnpm turbo typecheck lint test`, then all pass, extended `grounding.test.tsx` green, no regression in `session/grounding.test.tsx`

## Implementation Notes

Matrix audit: rows 1 ("Normal use") and 2 ("No input") are covered by automated tests in `grounding.test.tsx` (ran, passed — see Verification below). Row 3 ("Small-screen + keyboard") has no automated equivalent, consistent with this spec's own Verification section listing it as a manual-only check (RN Testing Library can't simulate real keyboard occlusion); it, plus the VoiceOver/TalkBack focus-order check, remain outstanding manual verification before merge — no device/simulator access in this environment.

## Spec Change Log

## Review Triage Log

- [blind-hunter] Completion screen's root `View` uses `styles.container`, which lost `backgroundColor` when it moved to the new `styles.outer` (applied only to the non-complete branch) — **false.** `GroundingPrompt` has exactly one consumer, `apps/mobile/app/calm-me/grounding.tsx`, whose own top-level `View` already sets `backgroundColor: color.surface.primary` (identical value) and fills the whole screen (`flex: 1`); the complete branch renders transparently over that identical-colored parent, so no visible regression occurs. Confirmed no other screen renders `GroundingPrompt` (`session/debrief.tsx`'s hit is a comment, not a render).
- [edge-case-hunter] Same claim, filed independently at high confidence — **false**, same evidence as above.
- [blind-hunter] `returnKeyType="next"` is set per field but no `onSubmitEditing`/ref chain advances focus, so the keyboard's "next" affordance is a no-op — **low.** Confirmed no focus-chain wiring exists. Rejected: unlikely to be noticed in everyday optional-field use, and a real fix (per-field refs + submit handlers) is more than a direct correction.
- [edge-case-hunter] Same claim, filed independently — **low**, same disposition.
- [blind-hunter] Crisis-keyword detection (`detectCrisisKeywords`) is not wired into the new free-text fields, with no interim mitigation — **out of scope.** The frozen Intent itself defers this explicitly ("Crisis-keyword detection on these fields is a deferred fast-follow — see `deferred-work.md`") and the Never list forbids wiring it in this story; already tracked in `deferred-work.md`. Rejected per the out-of-scope rule (intent itself excludes it).
- [blind-hunter] No dedicated `packages/core` test asserts the `GROUNDING_STEPS` count sequence (5/4/3/2/1) or its relation to `GROUNDING_TOTAL_STEPS` — **low.** A regression would still be caught by `grounding.test.tsx`'s "each step shows fields sized to its own count" test (the sole consumer). Rejected: not spec-required, already covered indirectly, and a dedicated core-level test is additive, not a direct correction.
- [blind-hunter] The test mock replaces real `t()` with a stub that never substitutes `en.json`/`hi.json`'s actual `{{index}}`/`{{count}}` placeholders, so a placeholder-name typo would pass CI silently — **low.** Verified true (checked `i18n.test.ts` — no test exercises real interpolation anywhere in the suite) and today's keys correctly match, so no live bug exists. Rejected: pre-existing whole-suite testing convention (every `t()` call is mocked this way, not novel to this story), and a real fix needs new real-i18next test infrastructure, more than a direct correction.
- [blind-hunter] No invariant guard that `fieldLabels.length === count`; a future desync would silently produce `undefined` accessibility labels — **false.** Both arrays are always derived from the same `count` value in the same `grounding.tsx` object-literal construction (the sole call site), so the two can't desync today; adding a guard for a state the program can't currently reach contradicts this repo's no-premature-validation convention.
- [blind-hunter] Field labels are generic ("Item 1 of 5") with no sense-specific wording, so "see" and "smell" steps announce identically to screen readers — **low.** This is exactly what the spec's own Code Map prescribes (`t('grounding541.fieldLabel', {index, count})`, one generic template); the frozen Boundaries only require each field have "its own accessible label" (satisfied — labels differ by position), not sense-specific wording. Rejected: spec-compliant as built; a real fix needs new per-sense i18n keys across 2 languages, more than a direct correction.
- [blind-hunter] Fields are single-line (no `multiline`), so longer "what I notice" entries won't wrap — **low.** Real but minor; fields are optional short notice-cues per the spec's own framing. Rejected: unlikely to be hit in everyday use, and `multiline` changes `returnKeyType`/submit semantics enough that it's more than a direct correction.
- [blind-hunter] Spec frontmatter (`in-progress`), the `sprint-status.yaml` narrative comment ("ready-for-dev"), and all-`[x]` Execution tasks with an empty Change/Triage Log don't reconcile — **rejected.** Same shape as the precedent finding in `spec-18-3-insta-calm-affirmation-rotation.md`: these sections populate during/after this review pass, so being empty/stale pre-review is expected, not a defect. Any fix here would mean editing this build's own spec/tracking metadata, which triage rejects outright.
- [edge-case-hunter] `count` is typed as plain `number` with no bounds check; a caller passing a negative or non-integer count would make `Array(count)` throw or desync from `fieldLabels` — **false.** The only call site derives `count` straight from the literal `GROUNDING_STEPS` `as const` array (values 5/4/3/2/1), so a negative/fractional count is not a state the program can currently reach.
- [edge-case-hunter / verification-gap] `fieldValues` is reset via a `useEffect` keyed on `[stepIndex, steps]`, which commits *after* the step-change render — for one commit, the outgoing step's `fieldValues` (old length/content) renders against the incoming step's shorter `fieldLabels`, so the extra field(s) get `accessibilityLabel={undefined}` and stale text is briefly visible; filed independently by both layers (verification-gap noted it for awareness without filing it as a formal gap) — **medium.** Real: confirmed the effect ordering in `GroundingPrompt.tsx:88-90` vs. the render at 183-184/207-219. Given this story's explicit focus on correct accessibility/focus behavior, routed to **patch**: render the field list against `currentStep.count` (always in sync with `fieldLabels`) instead of `fieldValues.length`, padding/truncating displayed values from the `fieldValues` array — removes the window entirely without adding new guards or public surface.

## Verification

**Commands:**
- `pnpm turbo typecheck` -- expect: 0 errors across all packages/apps
- `pnpm turbo lint` -- expect: 0 errors, including `i18next/no-literal-string`
- `pnpm turbo test` -- expect: all suites green, including the extended `grounding.test.tsx` cases

**Manual checks (if no CLI):**
- On-device (or simulator), open the exercise from both entry points, type into fields on a small-screen profile, and confirm the advance button stays reachable with the keyboard open
- VoiceOver (iOS) and TalkBack (Android): confirm focus order prompt → fields → advance button, each field announces a distinct label, and the step-change announcement doesn't steal focus from an active field
