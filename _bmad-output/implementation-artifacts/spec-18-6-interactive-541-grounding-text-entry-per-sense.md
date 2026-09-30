---
title: 'Interactive 5-4-3-2-1 Grounding — Text Entry Per Sense'
type: 'feature'
created: '2026-09-30'
status: 'ready-for-dev'
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
- [ ] `packages/core/src/config/grounding-exercise.ts` -- add `count` per step -- single source of truth, keeps prompt copy and rendered fields in sync
- [ ] `packages/ui/src/components/GroundingPrompt.tsx` -- render N optional fields per step, ephemeral reset-per-step state, keyboard-avoiding scroll -- closes the display-only gap, no persistence path
- [ ] `apps/mobile/app/calm-me/grounding.tsx` -- thread `count`/`fieldLabels`/`fieldPlaceholder` into `steps` -- wires the new API into the one screen serving both entry contexts
- [ ] `en.json` + `hi.json` -- add `grounding541.fieldLabel`, `.fieldPlaceholder` -- CI-enforced `t()` convention
- [ ] `apps/mobile/app/calm-me/grounding.test.tsx` -- cases: field count per step, non-gating advancement, values don't survive a step change

**Acceptance Criteria:**
- Given step 1, when rendered, then exactly 5 optional labeled fields appear beneath the prompt
- Given some fields filled and some empty, when "Got it"/"I'm done" is tapped, then advancement is unaffected — no field is required
- Given a step change, when the new step renders, then it shows empty fields sized to its own count
- Given entry via Stop Exposure vs. the Insta Calm hub, then behavior is identical in both
- Given `pnpm turbo typecheck lint test`, then all pass, extended `grounding.test.tsx` green, no regression in `session/grounding.test.tsx`

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `pnpm turbo typecheck` -- expect: 0 errors across all packages/apps
- `pnpm turbo lint` -- expect: 0 errors, including `i18next/no-literal-string`
- `pnpm turbo test` -- expect: all suites green, including the extended `grounding.test.tsx` cases

**Manual checks (if no CLI):**
- On-device (or simulator), open the exercise from both entry points, type into fields on a small-screen profile, and confirm the advance button stays reachable with the keyboard open
- VoiceOver (iOS) and TalkBack (Android): confirm focus order prompt → fields → advance button, each field announces a distinct label, and the step-change announcement doesn't steal focus from an active field
