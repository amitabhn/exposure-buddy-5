---
title: 'Review SUDS Input — Numbered Boxes vs. Slider'
type: 'feature'
created: '2026-10-08'
status: 'review'
baseline_commit: 'f0dc2e7594d8e0793a17524f0b0be583493f3704'
route: 'dispatch'
review_loop_iteration: 5
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** (Beta feedback item 7.) The app asks for a 0–10 distress rating with numbered boxes, and beta users asked for a slider. Three different SUDS inputs ship today (two box controls and a number field), and the legend ("No distress / Moderate / Extreme distress") collides and clips at 200% system font (Android, 2026-10-06).

**Approach:** Replace every SUDS input with one shared slider. **Decision (human, 2026-10-09, after reviewing live renders):** a slider with a tick for each of the 11 steps, a − button and a + button beside a large readout, and a three-label legend under the ticks. The 0–10 integer scale and stored values are unchanged.

## Boundaries & Constraints

**Always:** One shared component on all seven surfaces: pre-session `session/intent`, mid-session and debrief in `session/active`, `calm-me/index`, onboarding `assessment`, `FearItemForm`, and the add/edit form in `app/ladder.tsx:461` (today a number field). Value `null` means unset: the thumb sits at 5 in a muted tint, the readout shows a dash with "Drag to rate" below it, and the surface's primary button (Continue, Log, Next, Save or Finish session) stays disabled. Editing an existing item (`ladder.tsx:176`) starts at its stored value, not unset. The first −, + or screen-reader increase/decrease from unset sets 5; a first drag sets the dragged value. "First drag" means the release: the control reports the value on `onSlidingComplete` (and on every `onValueChange` during the drag), so grabbing the thumb at its parked 5 and letting go without moving it still sets 5. A native slider does not fire `onValueChange` when the value is unchanged, so `onValueChange` alone must not be relied on. Thumb at least 44 dp and − / + buttons at least 52 dp, disabled at 0 and 10. A wrapper exposes the `adjustable` role and handles increment/decrement in JS (so the unset rule holds), and the native slider inside it is hidden from the accessibility tree (`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`) so a screen reader meets one slider stop, plus the separate − and + buttons, with spoken value "N out of 10, <word>", or "Not set". Pressing − or + with a screen reader on speaks the new rating again ("N out of 10, <word>"), because those buttons keep focus on themselves; the slider's own screen-reader adjust needs no extra announcement, since its value is re-read. The readout shows the number with a word below it, centred between the buttons. The word comes from this table: 0 "No distress", 1–2 "Very mild", 3–4 "Mild", 5–6 "Moderate", 7–8 "High", 9 "Very high", 10 "Extreme distress". So 0 is the only "No distress", and 0, 5 and 10 always match the legend under the ticks. Insta Calm (`calm-me/index.tsx`) gets an explicit **Continue** button, disabled until a value exists and while the handler runs. Today one box tap runs `handleFreshSudsSelected`, which abandons the session, resets the ladder item and opens the debrief; a slider fires on the first press and on every drag step, so that handler runs only on Continue. The fresh-SUDS card also gets a friendly intro line above it: "Before we wrap up, take a moment to notice how you are feeling." Legend under the ticks sits in three equal columns with a 16 px gap and 8 px side padding: "No distress" left-aligned, "Moderate" centred, "Extreme distress" right-aligned, each wrapping inside its own column. Ticks are drawn to match the thumb's travel on both platforms. New copy (− / + labels, "Drag to rate", "Not set") goes in `en.json` and `hi.json`.

**Gate:** Before any call site is migrated, a spike (the dependency plus one slider on one screen, built into a dev client) must pass every check below on a real iOS and a real Android device:

- It renders, drags and steps, and the ticks line up with the thumb.
- TalkBack/VoiceOver adjust works, and the slider is announced once (no duplicate focus stop from the native control).
- On Android, the slider drags and steps inside a `Modal` (the mid-session and debrief surfaces in `session/active` are Modals).
- On both platforms, the slider drags and steps when it sits inside a vertical `ScrollView` inside that Modal, and the `ScrollView` content is taller than the viewport so it actually scrolls (a `ScrollView` whose content fits tests nothing). The parent scroll must not steal or delay the thumb drag.
- On iOS, dragging the thumb inside a `pageSheet` Modal does not dismiss the sheet (the `ladder.tsx` edit sheet).

A prop-level fix on the `ScrollView`, `Modal` or slider (for example `nestedScrollEnabled`, or disabling parent scroll while the thumb is held) counts as a pass; record the prop in Implementation Notes. If a check still fails after that, stop and return to the human; do not hand-build a gesture slider.

**Never:** No migration, no PowerSync schema change, no change to stored `suds_value` / `predicted_suds`. Do not cap or disable font scaling. Do not hand-build a gesture slider; use the Expo-bundled native slider. Keep the old controls only until every call site is migrated, then delete them.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Edit an existing item | stored value 7, open the ladder edit sheet | Slider shows 7 and "High", not unset; Save enabled once the description is valid | N/A |
| First press from unset | value null, tap + or − | `onChange(5)`; thumb takes the selected tint | N/A |
| Screen-reader adjust from unset | value null, increase or decrease | `onChange(5)`, same as the buttons | N/A |
| First drag from unset | value null, drag thumb | `onChange` with the dragged integer | N/A |
| Release without moving | value null, touch the parked thumb at 5 and release | `onChange(5)` from `onSlidingComplete`; the surface leaves the unset state | N/A |
| Button press with a screen reader | TalkBack/VoiceOver on, focus on − or +, press | The new rating is announced as "N out of 10, <word>", once | N/A |
| Limits | value 0 then −, or 10 then + | Button disabled, no `onChange` | N/A |
| Word | value 0 / 2 / 4 / 6 / 8 / 9 / 10 | "No distress" / "Very mild" / "Mild" / "Moderate" / "High" / "Very high" / "Extreme distress" | N/A |
| Insta Calm | drag or press to 7, then tap Continue | Fresh-SUDS handler runs once with 7; nothing runs before Continue; a second tap while it runs does nothing | N/A |
| 200% font | Android font scale 200%, iOS largest accessibility text size | Readout wraps between the buttons; the "Drag to rate" hint and legend labels wrap in their own space; none overlap or clip | N/A |
| Modal card at 200% font | `session/active` mid-session or debrief card, Android font scale 200% or iOS largest accessibility text size | The card scrolls if its content overflows; the Log / Finish session button is reachable; at normal font on the baseline devices (iPhone SE 3rd gen, 360 × 640 dp Android) it is reachable without scrolling | N/A |
| Edit-sheet drag | iOS page sheet in `ladder.tsx` | Dragging the thumb does not dismiss the sheet | N/A |

</frozen-after-approval>

## Code Map

- `apps/mobile/src/components/session/SudsScale.tsx`, `onboarding/SudsCalibrationWidget.tsx` -- box controls to replace, then delete; contract `{ value: number | null, onChange }`
- Call sites: `session/intent.tsx:158`, `session/active.tsx:278,313`, `calm-me/index.tsx:200`, `(onboarding)/assessment.tsx:82`, `onboarding/FearItemForm.tsx:58`, `app/ladder.tsx:461` (TextInput, inside a `pageSheet` Modal at `:447`)
- `apps/mobile/package.json` -- add `@react-native-community/slider` at `5.2.0` (SDK 57 `bundledNativeModules`); native module, so a new dev-client/EAS build is required; Epic 16's `quick-sqlite` registration failure is why the spike gate exists
- Maestro: `apps/mobile/.maestro/onboarding.yaml:166,195,198` tap "5 out of 10" (change to one tap on the + button, which lands on 5); `.maestro/setup/addLadderItem.yaml` types into the number field (rewrite for the slider)
- `session/active.tsx:278,313` -- the mid-session and debrief cards are Modals; wrap each card's content in a `ScrollView` so Log / Finish session stays reachable when the slider card overflows at large text
- `calm-me/index.tsx:200` -- `SudsScale value={null} onChange={handleFreshSudsSelected}` acts on selection; change to hold the value and call the handler from a new Continue button (keep the `submittingSuds` guard at `:65`), and add the intro line above the card
- `en.json`, `hi.json` -- `onboarding.assessment.sudsAnchor0/5/10` for the legend and the words at 0, 5 and 10; new strings for "Very mild", "Mild", "High" and "Very high" (and "Moderate" reuses `sudsAnchor5`); all `session.suds.anchor*` keys become unused, since only `SudsScale.tsx` read them (remove them with it); the Insta Calm intro line (new copy); reuse the existing "Continue" label; Hindi mirrors English: `hi.json` carries English text today, so the new strings are deliberate English placeholders until a translation pass, not translated copy
- Tests: replace `SudsScale.test.tsx` / `SudsCalibrationWidget.test.tsx` with `SudsSlider.test.tsx`; update screen tests that press "N out of 10" or type into the ladder field; Jest setup needs a slider mock
- Reference render: Artifact "SUDS input options", final slider candidate

## Tasks & Acceptance

**Execution:**
- [x] this story file -- record the comparison and decision (Design Notes) -- review deliverable
- [x] `apps/mobile/package.json`, a spike screen (one story: the spike is a checkpoint inside it, not a separate story; no call site is migrated until it passes, and a failed spike stops the story) -- add the dependency, build a dev client, run the Gate on iOS and Android, record the result here -- native-module risk
- [x] `apps/mobile/src/components/SudsSlider.tsx` -- shared control per the matrix -- replaces all SUDS inputs
- [x] the seven call sites -- swap in `SudsSlider`; Insta Calm also gets the Continue button and intro line; the `session/active` Modal cards get a `ScrollView` -- one control everywhere
- [x] delete the old components and tests; add `SudsSlider.test.tsx`, update screen tests, Jest slider mock -- regression coverage. `SudsSlider.test.tsx` must include the matrix row "Button press with a screen reader": spy on `AccessibilityInfo.announceForAccessibility`, press + (and −), and assert one call with `"N out of 10, <word>"` per press and none when the button is disabled at 0 or 10, and none for the slider's own screen-reader adjust
- [x] `.maestro/onboarding.yaml`, `.maestro/setup/addLadderItem.yaml` -- drive the slider -- keep E2E working
- [x] `en.json`, `hi.json` -- new copy

**Acceptance Criteria:**
- Given the story file, when read, then it holds the comparison, the decision, the spike result, and the statement that all seven surfaces change together
- Given an unset slider, when the thumb is touched and released without moving, then the value becomes 5 and the primary button enables
- Given any SUDS surface shown unset, when nothing is touched, then the surface's primary button is disabled until the thumb is moved or − / + / a screen-reader adjust is used
- Given the mid-session and debrief cards in `session/active` at Android 200% font or iOS largest accessibility text size, when the content is taller than the screen, then the card scrolls and Log / Finish session stays reachable
- Given Android 200% font scale or iOS largest accessibility text size, when any SUDS surface renders, then every legend label, the readout and the "Drag to rate" hint are fully visible with no overlap
- Given a screen reader is on and focus is on the − or + button, when it is pressed, then the new rating is announced once as "N out of 10, <word>"
- Given the readout and legend, when the value is 0, 5 or 10, then both show the same word
- Given Insta Calm, when the value changes, then nothing runs until Continue is tapped, and Continue is disabled until a value exists
- Given an existing session or ladder item, when its value is read back, then it is unchanged and no migration ran
- Given an existing ladder item, when its edit sheet opens, then the slider shows the stored value
- Given the Maestro onboarding and ladder flows, when run, then their SUDS steps work with the slider and no flow fails that passes on `main` (core and session shards were red on `main` until Story 19.12 landed in PR #104; compare against the latest `main` run, not an older one)

## Implementation Notes

Spike Gate result, 2026-10-09 (human-run). **iOS: PASS.** Device: iPhone 15 Plus, iOS 26.6, Debug dev client built from this worktree (slider 5.2.0), JS from Metro. Checked on `/spike-slider`: (1) inline slider: drag, − / +, ticks, release-without-moving; (2) slider inside a `Modal` with an overflowing vertical `ScrollView`: thumb drag not stolen by the parent scroll; (3) slider inside a `pageSheet` Modal: dragging the thumb does not dismiss the sheet; (4) VoiceOver adjust. All four worked. No prop-level fix was needed. **Android: PASS** (human-run, 2026-10-09). Device: Redmi K20 Pro, Android 11, EAS development APK (build `1914c343`, commit `f0dc2e7`; it contains the slider's native classes), JS from Metro. Checked on `/spike-slider`: inline slider, slider inside a plain `Modal`, slider inside the `Modal` with an overflowing `ScrollView` (parent scroll did not steal the thumb drag), and TalkBack (slider announced once, adjust works, − and + are separate controls, and the rating is spoken after − or +). No prop-level fix was needed. The screen-reader announcement after − / + was added after the iOS run and has not been checked on iOS with VoiceOver; it is covered by the matrix row and acceptance criterion. **Gate: cleared on both platforms.** **Decision (human):** on iOS the thumb moves continuously while dragging and settles on the nearest step at release; `step={1}` already makes the value an integer, and the library ignores value updates mid-drag on iOS (`RNCSliderComponentView.mm`). Accepted as-is: no library patch, no custom thumb. Android was checked afterward; any platform difference is accepted. Prepared 2026-10-09: dev-only spike route `apps/mobile/app/spike-slider.tsx` has an inline slider, a Modal with an overflowing ScrollView, and a pageSheet Modal, with the adjustable wrapper and hidden native control. The Gate has passed on both platforms: delete the spike route and the temporary "Slider spike" home-screen button before the call-site migration. No call site migrated.

Implementation, 2026-10-09: `SudsSlider` (`src/components/SudsSlider.tsx`) replaces both box controls on all seven surfaces; `SudsScale`, `SudsCalibrationWidget`, their tests and the spike route are deleted; `session/active` cards scroll (`ScrollView`, card `maxHeight` 90%); Insta Calm has the intro line and a Continue button. `ladder.test.tsx` mocks `SudsSlider` with a text field so its form tests are unchanged. Maestro: besides the two named flows, `_onboarding-clickthrough`, `reachDebrief` and `backgrounded-recovery` tapped "N out of 10" / "4 — Mild" and now use + (and − once for 4). Jest 601/601, tsc clean. Not yet done: on-device checks in Verification (200% font, modal-card scrolling, iOS VoiceOver announcement), Maestro run. `hi.json` carries English placeholders for the new strings, as the spec says.

## Spec Change Log

Five party-mode review passes, 2026-10-09. Gate edits are human-approved (Cooper). Pass 5 (`e95ee77` plus this commit): the Gate's `ScrollView` check now requires overflowing content, a prop-level fix counts as a pass, and the Gate is a checklist. Review stopped here by the human; the spike is the next evidence.

After pass 5, human-requested (Cooper, 2026-10-09): `a9e2e70` added the screen-reader announcement after − / + (Always sentence, matrix row "Button press with a screen reader", acceptance criterion); `210edee` and `c28c4cf` recorded the Gate result (iOS and Android pass) in Implementation Notes; party-mode Gate review added a Jest test for the announcement row (see Tasks). Open: the announcement is untested on Android 12+ (`View.announceForAccessibility` is deprecated from API 36) and on iOS with VoiceOver.

## Review Triage Log

### Review Findings

Code review 2026-10-10 (Blind Hunter, Edge Case Hunter, Verification Gap Reviewer, Acceptance Auditor), diff `f0dc2e7..e364dc1`.

- [x] [Review][Decision→Patch] Readout moved between − and + (human chose fix-the-code, 2026-10-10): top row is (−) readout (+), slider track with ticks on its own line below, legend under. Needs the on-device 200% font check. [apps/mobile/src/components/SudsSlider.tsx]
- [x] [Review][Patch] Add one unmocked `SudsSlider` wiring test: every consumer test stubs the slider, so a wrong `value`/`onChange` hookup passes Jest. Render the real slider in `assessment.test.tsx` or `FearItemForm.test.tsx` and assert the primary button enables after pressing `session.suds.increase` [apps/mobile/app/(onboarding)/assessment.test.tsx]
- [x] [Review][Patch] Omit `now` from `accessibilityValue` when unset, so assistive tech does not report a parked 5 next to "Not set" [apps/mobile/src/components/SudsSlider.tsx:87]
- [x] [Review][Patch] Remove the orphaned `onboarding.assessment.calibrationLabel` key (only `SudsCalibrationWidget` used it) from `en.json` and `hi.json` [apps/mobile/src/i18n/locales/en.json:156]
- [x] [Review][Patch] Update the stale 19-5 comment in sprint-status.yaml ("not implemented") to the real state [_bmad-output/implementation-artifacts/sprint-status.yaml:250]
- [x] [Review][Defer] `hi.json` carries English for `session.suds.*` and `calmMe.freshSudsIntro`; the spec allows placeholders but a Hindi translation (and word order in `valueText`) is still owed — deferred: spec-sanctioned placeholder, needs a translator
- [x] [Review][Defer] Tick alignment (fixed 22 dp inset, `trackWidth` 0 until first layout), the 44 dp thumb, 200% font legend/readout wrap, and ladder pageSheet overflow at 200% are unverified; unverified severity medium — deferred: settled by the on-device checks in the spec's Verification section
- [x] [Review][Defer] Android may emit `onValueChange` on mount, which would silently turn unset into 5 and enable the primary button; unverified severity medium — deferred: settled by the Android device check (open any SUDS surface, touch nothing, confirm the button stays disabled); the spike did not report it

#### Rejected

- `freshSuds` never reset in Insta Calm (3 layers) — false: `handleExit` calls `router.back()` and unmounts the screen, and the confirm step cannot be re-entered from the prompt in the same mount; keeping the value after a failed submit is intended for retry.
- `onChange` fires twice per drag end — false/harmless: same value, idempotent set-state.
- Ladder form cannot clear to null — false: `setPredictedSuds(null)` runs on add/edit open and cancel (`ladder.tsx:168,186`).
- Readout/speech may carry a "0 —" prefix from the anchor strings — false: `en.json` anchors are plain ("No distress", "Moderate", "Extreme distress").
- Native dependency, missing Jest mock, spike result unrecorded — false: Gate result is recorded in Implementation Notes and `SudsSlider.test.tsx` renders the real slider and passes.
- Slider drag stolen by the modal `ScrollView` — false: covered by the Gate on both platforms.
- Slider-to-crisis 7→8 boundary untested — false: the ≥8 crisis logic in `active.tsx` is unchanged; the slider only supplies the integer.
- Hard-coded hex colours and file-level `i18next` lint disable — low, not worth fixing here: no theming consumer exists, and the disable is scoped to identifiers (lint is clean).
- Two screen-reader labels on the ladder form, Prettier indentation in `active.tsx`, Maestro `reachDebrief`/`addLadderItem` scroll and unset-start assumptions, announce-before-parent-confirms, stale docs references to the deleted components, lost large-font tests of deleted components — low, unlikely to be met in everyday use, and the fixes add complexity.

## Design Notes

| | Boxes | Slider (chosen) |
|---|---|---|
| Speed when distressed | One tap | Drag, or one press per step with − / + |
| Precision | Exact | Snaps to 11 steps; ticks and − / + remove overshoot risk |
| Screen reader | Direct radio per value | Adjustable role steps by 1; − / + give a direct alternative |
| Touch target | 32–56 dp | 44 dp thumb, 52 dp buttons |
| Cost | JS only | New native module, new dev-client/EAS build, spike gate |

Chosen because beta users asked for a slider and the − / + buttons answer the precision and screen-reader step-count concerns. Every SUDS input changes together, so the app never ships two. Spec review (party mode, 2026-10-09) added the seventh surface, the Maestro changes, the single vocabulary, the unset screen-reader rule and the spike gate.

## Verification

**Commands:**
- `cd apps/mobile && npx jest SudsSlider app/session app/calm-me "app/\(onboarding\)" ladder` -- expected: pass
- `pnpm turbo typecheck lint` -- expected: clean

**Manual checks (new dev-client build required):**
- Android at 200% font and iOS at the largest accessibility text size: the mid-session and debrief cards in `session/active` scroll and keep Log / Finish session reachable; at normal font on iPhone SE (3rd gen) and a 360 × 640 dp Android they need no scrolling
- iOS and Android at 200% font: assessment, add-item form, ladder edit sheet and session intent show the full legend and readout; TalkBack/VoiceOver adjust and − / + both change the value; sheet does not dismiss while dragging (also covered earlier by the spike Gate)
