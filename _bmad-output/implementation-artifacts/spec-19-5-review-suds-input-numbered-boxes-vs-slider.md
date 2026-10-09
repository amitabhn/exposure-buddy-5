---
title: 'Review SUDS Input — Numbered Boxes vs. Slider'
type: 'feature'
created: '2026-10-08'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** (Beta feedback item 7.) The app asks for a 0–10 distress rating with numbered boxes, and beta users asked for a slider. Three different SUDS inputs ship today (two box controls and a number field), and the legend ("No distress / Moderate / Extreme distress") collides and clips at 200% system font (Android, 2026-10-06).

**Approach:** Replace every SUDS input with one shared slider. **Decision (human, 2026-10-09, after reviewing live renders):** a slider with a tick for each of the 11 steps, a − button and a + button beside a large readout, and a three-label legend under the ticks. The 0–10 integer scale and stored values are unchanged.

## Boundaries & Constraints

**Always:** One shared component on all seven surfaces: pre-session `session/intent`, mid-session and debrief in `session/active`, `calm-me/index`, onboarding `assessment`, `FearItemForm`, and the add/edit form in `app/ladder.tsx:461` (today a number field). Value `null` means unset: the thumb sits at 5 in a muted tint, the readout shows a dash with "Drag to rate" below it, and the surface's primary button (Continue, Log, Next, Save or Finish session) stays disabled. Editing an existing item (`ladder.tsx:176`) starts at its stored value, not unset. The first −, + or screen-reader increase/decrease from unset sets 5; a first drag sets the dragged value. "First drag" means the release: the control reports the value on `onSlidingComplete` (and on every `onValueChange` during the drag), so grabbing the thumb at its parked 5 and letting go without moving it still sets 5. A native slider does not fire `onValueChange` when the value is unchanged, so `onValueChange` alone must not be relied on. Thumb at least 44 dp and − / + buttons at least 52 dp, disabled at 0 and 10. A wrapper exposes the `adjustable` role and handles increment/decrement in JS (so the unset rule holds), and the native slider inside it is hidden from the accessibility tree (`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`) so a screen reader meets one slider stop, plus the separate − and + buttons, with spoken value "N out of 10, <word>", or "Not set". The readout shows the number with a word below it, centred between the buttons. The word comes from this table: 0 "No distress", 1–2 "Very mild", 3–4 "Mild", 5–6 "Moderate", 7–8 "High", 9 "Very high", 10 "Extreme distress". So 0 is the only "No distress", and 0, 5 and 10 always match the legend under the ticks. Insta Calm (`calm-me/index.tsx`) gets an explicit **Continue** button, disabled until a value exists and while the handler runs. Today one box tap runs `handleFreshSudsSelected`, which abandons the session, resets the ladder item and opens the debrief; a slider fires on the first press and on every drag step, so that handler runs only on Continue. The fresh-SUDS card also gets a friendly intro line above it: "Before we wrap up, take a moment to notice how you are feeling." Legend under the ticks sits in three equal columns with a 16 px gap and 8 px side padding: "No distress" left-aligned, "Moderate" centred, "Extreme distress" right-aligned, each wrapping inside its own column. Ticks are drawn to match the thumb's travel on both platforms. New copy (− / + labels, "Drag to rate", "Not set") goes in `en.json` and `hi.json`.

**Gate:** Before any call site is migrated, a spike (the dependency plus one slider on one screen, built into a dev client) must pass on a real iOS and a real Android device: renders, drags, steps, ticks line up with the thumb, TalkBack/VoiceOver adjust works, the slider is announced once (no duplicate focus stop from the native control), the slider drags and steps inside an Android `Modal` (the mid-session and debrief surfaces in `session/active` are Modals), and on iOS dragging the thumb inside a `pageSheet` Modal does not dismiss the sheet (the `ladder.tsx` edit sheet). If it fails, stop and return to the human; do not hand-build a gesture slider.

**Never:** No migration, no PowerSync schema change, no change to stored `suds_value` / `predicted_suds`. Do not cap or disable font scaling. Do not hand-build a gesture slider; use the Expo-bundled native slider. Keep the old controls only until every call site is migrated, then delete them.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Edit an existing item | stored value 7, open the ladder edit sheet | Slider shows 7 and "High", not unset; Save enabled once the description is valid | N/A |
| First press from unset | value null, tap + or − | `onChange(5)`; thumb takes the selected tint | N/A |
| Screen-reader adjust from unset | value null, increase or decrease | `onChange(5)`, same as the buttons | N/A |
| First drag from unset | value null, drag thumb | `onChange` with the dragged integer | N/A |
| Release without moving | value null, touch the parked thumb at 5 and release | `onChange(5)` from `onSlidingComplete`; the surface leaves the unset state | N/A |
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
- [ ] this story file -- record the comparison and decision (Design Notes) -- review deliverable
- [ ] `apps/mobile/package.json`, a spike screen (one story: the spike is a checkpoint inside it, not a separate story; no call site is migrated until it passes, and a failed spike stops the story) -- add the dependency, build a dev client, run the Gate on iOS and Android, record the result here -- native-module risk
- [ ] `apps/mobile/src/components/SudsSlider.tsx` -- shared control per the matrix -- replaces all SUDS inputs
- [ ] the seven call sites -- swap in `SudsSlider`; Insta Calm also gets the Continue button and intro line; the `session/active` Modal cards get a `ScrollView` -- one control everywhere
- [ ] delete the old components and tests; add `SudsSlider.test.tsx`, update screen tests, Jest slider mock -- regression coverage
- [ ] `.maestro/onboarding.yaml`, `.maestro/setup/addLadderItem.yaml` -- drive the slider -- keep E2E working
- [ ] `en.json`, `hi.json` -- new copy

**Acceptance Criteria:**
- Given the story file, when read, then it holds the comparison, the decision, the spike result, and the statement that all seven surfaces change together
- Given an unset slider, when the thumb is touched and released without moving, then the value becomes 5 and the primary button enables
- Given any SUDS surface shown unset, when nothing is touched, then the surface's primary button is disabled until the thumb is moved or − / + / a screen-reader adjust is used
- Given the mid-session and debrief cards in `session/active` at Android 200% font or iOS largest accessibility text size, when the content is taller than the screen, then the card scrolls and Log / Finish session stays reachable
- Given Android 200% font scale or iOS largest accessibility text size, when any SUDS surface renders, then every legend label, the readout and the "Drag to rate" hint are fully visible with no overlap
- Given the readout and legend, when the value is 0, 5 or 10, then both show the same word
- Given Insta Calm, when the value changes, then nothing runs until Continue is tapped, and Continue is disabled until a value exists
- Given an existing session or ladder item, when its value is read back, then it is unchanged and no migration ran
- Given an existing ladder item, when its edit sheet opens, then the slider shows the stored value
- Given the Maestro onboarding and ladder flows, when run, then their SUDS steps work with the slider and no flow fails that passes on `main` (core and session shards were red on `main` until Story 19.12 landed in PR #104; compare against the latest `main` run, not an older one)

## Implementation Notes

## Spec Change Log

## Review Triage Log

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
