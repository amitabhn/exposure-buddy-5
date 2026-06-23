# Accessibility Audit — Story 9.3

NFR-ACCESS-01. Audit of every routable screen under `apps/mobile/app/**` (24 screens; layouts and
`+not-found.tsx` excluded — see "Screen inventory" below) against a fixed 5-point checklist. Findings are
categorised P0/P1/P2 and tracked to closure per AC2 (all P0/P1 resolved before story close; P2 deferred to
`_bmad-output/planning-artifacts/post-mvp-backlog.md` § 6).

## Checklist (verbatim from AC1)

For every interactive element and content region on every screen:

1. All interactive elements have `accessibilityLabel` set to non-empty, meaningful text.
2. All interactive elements have `accessibilityRole` set appropriately (`button`, `link`, `header`, `text`,
   `image`).
3. `accessibilityHint` is present wherever the action outcome is non-obvious.
4. Focus order follows the visual reading order.
5. `Text` components that display dynamic values use `accessibilityLiveRegion` where appropriate.

## P0 / P1 / P2 definitions

- **P0** — broken or missing; blocks screen reader use of the element or screen entirely.
- **P1** — present but degraded; the element is usable but the experience falls short of the checklist
  (e.g. missing hint on a non-obvious action, missing live region on a dynamic value).
- **P2** — nice-to-have; a polish-level gap with no material impact on screen reader usability (e.g. a
  dev-only debug control, a redundant hint on an already-obvious action).

## Screen inventory (24 screens)

Layouts (`_layout.tsx`) and `+not-found.tsx` are excluded from the audit subject list (focus-order fixes
that touch a layout — Task 6 — are recorded against the layout file directly, see Calm Me FAB finding
below).

- **Auth** `(auth)/`: `sign-in.tsx`, `otp-verification.tsx`
- **Onboarding** `(onboarding)/`: `welcome.tsx`, `assessment.tsx`, `ladder.tsx`, `crisis.tsx`, `complete.tsx`
- **Home** `(app)/`: `index.tsx`, `settings/index.tsx`
- **Calm-Me/Grounding** `calm-me/`: `index.tsx`, `breathing.tsx`, `grounding.tsx`, `helplines.tsx`
- **Session/ERP** `session/`: `intent.tsx`, `briefing.tsx`, `technique.tsx`, `active.tsx`, `pause.tsx`,
  `grounding.tsx`, `debrief.tsx`, `abandoned.tsx`
- **Settings/Misc** (root): `reminder-settings.tsx`, `privacy-notice.tsx`, `ladder.tsx`

## Methodology note

Per-screen findings cite exact `file:line`. Shared components rendered by more than one screen
(`SudsScale`, `SudsCalibrationWidget`, `CalmMeButton`/`CalmMeFab`, `BreathingCoach`, `GroundingPrompt`,
`HelplineCard`, `CourageLadderEntryCard`, `SudsArcChart`, `BackButton`, `SafetyCheckboxes`, `FearItemForm`,
`DeleteAccountModal`, `OnboardingStepIndicator`, `AccessiblePressable`, `AccessibleText`) are audited once,
against their component file, and referenced from every consuming screen rather than re-audited per screen.
A repo-wide scan for `TouchableOpacity` / `Pressable` / `AccessiblePressable` / `TextInput` elements missing
`accessibilityLabel` or `accessibilityRole` was run across `apps/mobile/app`, `apps/mobile/src`, and
`packages/ui/src` to cross-check the manual per-screen walkthrough; its results are folded into the findings
below.

---

## Findings

### Auth

#### `(auth)/sign-in.tsx`

Audited (8 interactive elements: 4 tabs, 1 text input, safety checkboxes via `SafetyCheckboxes`, send-code
button, privacy link, dev-only sign-in button). All production-facing elements have `accessibilityRole` +
`accessibilityLabel`; tabs correctly use `accessibilityState={{ selected }}`.

- **[P2]** `apps/mobile/app/(auth)/sign-in.tsx:269-284` — the `__DEV__`/preview-only "Sign in as test user"
  `TouchableOpacity` has `accessibilityRole="button"` but no `accessibilityLabel` (relies on the inner
  `Text` "DEV: Sign in as test user", which is also hardcoded English, not translated). This control is
  never reachable in a production build. Deferred — see post-mvp-backlog.md § 6.

#### `(auth)/otp-verification.tsx`

Audited (1 text input, verify button, resend button, privacy link). All have `accessibilityLabel` +
`accessibilityHint` + `accessibilityRole`. No findings.

### Onboarding

#### `(onboarding)/welcome.tsx`

Audited (1 CTA button, `OnboardingStepIndicator`). CTA has role + label.
`OnboardingStepIndicator.tsx:15` already sets `accessibilityValue` — reference pattern, see Dev Notes. No
findings.

#### `(onboarding)/assessment.tsx`

Audited (5 a11y-prop-hit re-verification per Task 2.2, corrected count). `SudsCalibrationWidget` audited
separately below (Task 5). "Next" CTA has role/label/state. No findings on this screen's own elements beyond
the SUDS widget gap tracked under Task 5.

- **[P2]** `apps/mobile/app/(onboarding)/assessment.tsx:69-76` — the "Feeling overwhelmed?" link has
  `accessibilityRole="link"` + `accessibilityLabel` but no `accessibilityHint`; the destination (crisis
  support resources) isn't obvious from the label alone. Deferred — see post-mvp-backlog.md § 6.

#### `(onboarding)/ladder.tsx`

Audited (add/edit form via `FearItemForm`, move-up/move-down buttons, add-another button, nudge-dismiss,
crisis-banner link, overwhelmed link, next/skip CTA). All have role + label; disabled states use
`accessibilityState`. No P0/P1 findings.

- **[P2]** `apps/mobile/app/(onboarding)/ladder.tsx:221-228` — same "Feeling overwhelmed?" link hint gap as
  `assessment.tsx`. Deferred — see post-mvp-backlog.md § 6.

#### `(onboarding)/crisis.tsx` — ⚠ Named elevated finding (Task 2.3 escalation)

Re-confirmed: this screen genuinely has **zero** accessibility props (`apps/mobile/app/(onboarding)/crisis.tsx:1-13`).
It is an intentional Epic 5 stub (`// Minimal stub — Epic 5 replaces this with the real crisis resources
screen.`, line 3) consisting of a single hardcoded, untranslated `Text` ("Crisis Resources — Epic 5") with
no interactive elements at all — no back button, no real content.

- **[P0 — named, elevated]** `apps/mobile/app/(onboarding)/crisis.tsx:8` — the screen's sole `Text` element
  functions as the page heading but has no `accessibilityRole="header"`. Per the Task 2.2 convention (any
  gap on crisis-adjacent screens defaults to P0), this is fixed in this story (Task 3).
- **Out of scope, explicitly not fixed**: the screen has no interactive escape affordance (no back/exit
  button) and no real crisis-resource content — building that is Epic 5's job per the file's own comment;
  this story does not expand scope into building the real crisis screen. Flagged here by name per the Task
  2.3 escalation path so it is not silently folded into routine remediation.

#### `(onboarding)/complete.tsx`

Audited (overwhelmed link conditionally shown, start-journey CTA). Both have role + label. No findings.

### Home

#### `(app)/index.tsx`

Audited (`CourageLadderEntryCard`, progressing-state card, empty-ladder add-item button,
`ActivityIndicator` loading state). Manual `AccessibilityInfo.setAccessibilityFocus` correctly drives focus
to the primary card on mount (lines 32-41) — focus order is intentionally managed, no violation.

- **[P0]** `packages/ui/src/components/CourageLadderEntryCard.tsx:16-21` — the card's `TouchableOpacity` has
  `accessibilityRole="button"` but **no `accessibilityLabel`**. This is the home screen's primary "morning
  state" CTA (the main entry point into starting a fear-ladder session) — a screen reader announces only
  "button" with no description of the ladder item, predicted SUDS, or action. Consumed by `(app)/index.tsx:85-90`.
  Fixed in Task 3 (Task 3.1).

#### `(app)/settings/index.tsx`

Audited (reminders row, sign-out, privacy-notice link, delete-account, `DeleteAccountModal`). All have
role + label; `DeleteAccountModal.tsx` cancel/confirm buttons (lines 32-49) also correctly labelled. No
findings.

### Calm-Me / Grounding

#### `calm-me/index.tsx`

Audited (exit button, 3 technique cards, keep-going/need-to-stop footer, debrief-confirm yes/not-now,
`SudsScale` in the fresh-SUDS prompt). All buttons have role + label.

- **[P2]** `apps/mobile/app/calm-me/index.tsx:138-153` — "I can keep going" / "I need to stop" buttons have
  labels but no hints describing the outcome (dismiss vs. open a debrief confirmation). Low priority — the
  label text itself is fairly self-describing. Deferred — see post-mvp-backlog.md § 6.

#### `calm-me/breathing.tsx`

Audited (back button, `BreathingCoach`). Back button has role + label.

- **[P1]** `packages/ui/src/components/BreathingCoach.tsx:118` — the `timer` `Text` (mm:ss countdown,
  `styles.timer`) renders a value that updates every second with **no `accessibilityLiveRegion`** — purely
  visual, no auditory update for screen reader users. (The phase-prompt `Text` at lines 112-115 is correctly
  covered by an imperative `AccessibilityInfo.announceForAccessibility(promptText)` call on phase change,
  lines 64-66 — that is the correct existing pattern and is not itself a finding.) Fixed in Task 3 (Task
  3.2).

#### `calm-me/grounding.tsx`

Audited (back button, `GroundingPrompt`). Back button has role + label. `GroundingPrompt.tsx`'s step
counter (`styles.counter`, line 142) is a dynamic-value `Text` but is correctly covered by an imperative
`AccessibilityInfo.announceForAccessibility` call on every step/completion change (lines 47-54,
"Step X of N. {prompt}") — this is the correct existing pattern (equivalent to a live region without the
double-announcement risk a literal `accessibilityLiveRegion` would add on top of the manual announce). No
findings.

#### `calm-me/helplines.tsx` — Task 2.2 P0-by-default screen

Full re-verification per Task 2.2 (crisis-helpline screen, gaps here are P0 by default). Back button has
role + label. `HelplineCard.tsx:22-29`'s call button has role + a composed label
(`${callLabel} ${name}: ${displayNumber}`) — correct and complete. Intro/unavailable `Text` are static, non-
interactive, no role needed. **No gap found** — re-verified directly against both `helplines.tsx` and
`HelplineCard.tsx`; the screen is fully compliant.

### Session / ERP

#### `session/intent.tsx` — Task 2.2 re-verification (6→ corrected count screen, see below for `technique.tsx`)

Re-verified at full density. `SudsScale` audited separately (Task 5). Intention `TextInput` (line 151) has
`accessibilityLabel` but no `accessibilityHint` — acceptable, the label ("What's your intention for this
session?") already conveys purpose and RN `TextInput` doesn't require an explicit role for the checklist's
5 points. Continue button has role/label/state. No P0/P1 findings beyond the SUDS widget (Task 5).

#### `session/briefing.tsx` — Task 2.2 re-verification (2/2 lowest-density screen)

Full re-verification per Task 2.2. Ready button has role + label. Letter-intro/intention `Text` are static
narrative content (DM Serif surface, UX-DR21), no interactivity. **No gap found** — confirmed compliant at
2/2 density; the low count reflects a genuinely simple screen, not an audit gap.

#### `session/technique.tsx` — Task 2.2 re-verification (corrected count: 6, not 4)

Full re-verification per Task 2.2's corrected methodology (per-prop counting). 3 technique radio cards use
`accessibilityRole="radio"` + label + `accessibilityState={{ selected }}` (lines 58-69); continue button has
role/label/state. No findings.

#### `session/active.tsx`

Audited (log-SUDS, complete-exposure, stop-exposure buttons; 2 modals each with a `SudsScale`, a confirm
button, and a cancel button).

- **[P0]** `apps/mobile/app/session/active.tsx:209` — the SUDS-logging modal's "Cancel" `TouchableOpacity`
  (`onPress={() => setSudsModalVisible(false)}`) has **no `accessibilityRole` and no `accessibilityLabel`**
  at all — a screen reader user cannot identify this as an interactive element, let alone its purpose.
  Fixed in Task 3 (Task 3.1).
- **[P0]** `apps/mobile/app/session/active.tsx:247-251` — the completion modal's "Cancel" `TouchableOpacity`
  (`onPress={() => setCompletionModalVisible(false)}`) has the same gap — no role, no label. Fixed in Task 3
  (Task 3.1).
- **[P1]** `apps/mobile/app/session/active.tsx:175-182` — the "Stop exposure" button has a label but no
  `accessibilityHint`; the outcome (ends the active exposure and routes into the grounding/de-escalation
  flow) is not obvious from the label alone, and this is a safety-relevant control. Fixed in Task 4 (Task
  4.1).

#### `session/pause.tsx`

Audited. This screen is superseded/dead code (`// SUPERSEDED — replaced by briefing.tsx in Story 6.1. No
longer in the active session start flow.`, line 1) but remains a routable file under `apps/mobile/app/**`
so it is included per the confirmed inventory. Begin button has role + label. No findings.

#### `session/grounding.tsx`

Audited (3 technique cards, resume button, stop-session button). All have role + label. No findings.

#### `session/debrief.tsx`

Audited (`SudsArcChart` — reference-pattern compliant, see Dev Notes — 3 crisis-contact links, reflection
text input, done button, read-only-mode done button). Crisis contact links have composed labels
(`"iCall: 9152987821"` etc., lines 156-176) — correct. No findings.

#### `session/abandoned.tsx`

Audited (return button). Has role + label. No findings.

### Settings / Misc

#### `reminder-settings.tsx`

Audited (radiogroup wrapper + 2 radio rows with `accessibilityState={{ checked, disabled }}`, native
`DateTimePicker` — OS-level accessibility, not customisable here, save button, open-settings link). All
custom elements have role + label. No findings.

#### `privacy-notice.tsx` — Task 2.3 correction

Re-confirmed directly against the file: this screen does **not** have zero accessibility props — it has 8
`Text` elements with `accessibilityRole="header"` (`apps/mobile/app/privacy-notice.tsx:13,16,19,23,26,29,32,35`).
Audited for completeness: body text and the DPO email `Text` are static, non-interactive content; no
findings. The screen is fully compliant.

#### `ladder.tsx` (root)

Audited (crisis-banner link, drag-to-reorder item rows with composed labels + reorder hint, start-session
button, add-item button, add/edit modal form, remove-item button with guard text). Item rows
(`apps/mobile/app/ladder.tsx:230-248`) already set `accessibilityHint={t('ladder.reorderHint')}` — a good
existing reference pattern for non-obvious actions (tap vs. long-press). Manual
`AccessibilityInfo.setAccessibilityFocus` on mount (lines 40-49) correctly manages initial focus. No
findings.

---

## Shared components (audited once, referenced from consuming screens above)

| Component | File | Result |
|---|---|---|
| `SudsScale` | `apps/mobile/src/components/session/SudsScale.tsx` | **[P1]** no `radiogroup` wrapper / `accessibilityValue` — tracked under Task 5, not this list (AC4-specific). |
| `SudsCalibrationWidget` | `apps/mobile/src/components/onboarding/SudsCalibrationWidget.tsx` | **[P1]** has `radiogroup` role, missing `accessibilityValue` — tracked under Task 5. |
| `CalmMeButton` | `packages/ui/src/components/CalmMeButton.tsx` | **[P1]** role + label present, no `accessibilityHint` — tracked under Task 6 (AC4-specific). |
| `CalmMeFab` | `apps/mobile/src/components/CalmMeFab.tsx` | **[P0]** focus-order violation (mounted after `<Stack>` closes in `app/_layout.tsx:107`) — tracked under Task 6 (AC4-specific). |
| `CourageLadderEntryCard` | `packages/ui/src/components/CourageLadderEntryCard.tsx` | **[P0]** missing `accessibilityLabel`, see Home findings above. |
| `BreathingCoach` | `packages/ui/src/components/BreathingCoach.tsx` | **[P1]** countdown `Text` missing live region, see `calm-me/breathing.tsx` findings above. |
| `GroundingPrompt` | `packages/ui/src/components/GroundingPrompt.tsx` | Compliant — imperative announce pattern, reference-quality. |
| `HelplineCard` | `packages/ui/src/components/HelplineCard.tsx` | Compliant. |
| `SudsArcChart` | `packages/ui/src/components/SudsArcChart.tsx` | Compliant — reference pattern (`accessible`, `accessibilityLabel`, `accessibilityRole="image"`, lines 45-47). |
| `BackButton` | `apps/mobile/src/components/navigation/BackButton.tsx` | Compliant (role + label, lines 12-13). |
| `SafetyCheckboxes` | `apps/mobile/src/components/auth/SafetyCheckboxes.tsx` | Compliant — uses `accessibilityState={{ checked }}` and `accessible={false}` on the redundant inner label `Text` to avoid double-announcement (lines 21-24, 29). |
| `FearItemForm` | `apps/mobile/src/components/onboarding/FearItemForm.tsx` | Compliant. |
| `DeleteAccountModal` | `apps/mobile/src/components/settings/DeleteAccountModal.tsx` | Compliant. |
| `OnboardingStepIndicator` | `apps/mobile/src/components/onboarding/OnboardingStepIndicator.tsx` | Compliant — existing `accessibilityValue` reference pattern (line 15). |
| `AccessiblePressable` | `packages/ui/src/primitives/AccessiblePressable.tsx` | Compliant — enforces a required `accessibilityLabel` at the type level. |
| `AccessibleText` | `packages/ui/src/primitives/AccessibleText.tsx` | Compliant. |

## Dynamic-value Text / `accessibilityLiveRegion` scan (AC1 point 5 / Task 3.2)

Repo-wide scan for "session timer, breathing-coach countdown, live SUDS value display, sync/loading status"
style dynamic `Text` elements, prior to any fix:

- **breathing-coach countdown** — found: `packages/ui/src/components/BreathingCoach.tsx:118` (see P1 finding
  above; fixed in Task 3).
- **session timer** — no separate elapsed/countdown `Text` exists outside the breathing coach countdown
  above; `session/active.tsx` has no visible session-duration timer.
- **live SUDS value display** — no screen renders the currently-selected SUDS value as a standalone `Text`
  outside the `SudsScale`/`SudsCalibrationWidget` button labels themselves (which are interactive elements
  with their own per-target `accessibilityLabel`/`accessibilityValue`, not a passive mirror `Text`); nothing
  to fix here.
- **sync/loading status** — no "Syncing…" or similar status `Text` exists anywhere in the codebase (verified
  via repo-wide grep); the only loading indicators are `ActivityIndicator` elements with a static
  `accessibilityLabel={t('common.loading')}` (`(app)/index.tsx:83`, `ladder.tsx:212`), which are not `Text`
  components and already correctly labelled.

## Summary

| Severity | Count | Status |
|---|---|---|
| P0 | 4 | All resolved (Task 3) |
| P1 | 3 | All resolved (Task 4) — plus the 2 AC4-specific SUDS/Calm-Me-FAB P1/P0 items tracked under Tasks 5–6 |
| P2 | 5 | Deferred to `post-mvp-backlog.md` § 6 (Task 4.2) |

P0 findings: `CourageLadderEntryCard.tsx:16-21`, `session/active.tsx:209`, `session/active.tsx:247-251`,
`(onboarding)/crisis.tsx:8`.

P1 findings: `BreathingCoach.tsx:118`, `session/active.tsx:175-182` (stop-exposure hint), plus the AC4-named
SUDS `accessibilityValue` gaps (Task 5) and Calm Me hint/focus-order gaps (Task 6), tracked separately
because AC4 specifies their own verification requirements (manual screen-reader pass + RNTL assertion).

P2 findings (deferred): dev-only sign-in button label (`sign-in.tsx:269`), "Feeling overwhelmed?" hint gap
(`assessment.tsx:69`, `(onboarding)/ladder.tsx:221`), Calm-Me keep-going/need-to-stop hints
(`calm-me/index.tsx:138-153`), SUDS calibration widget sparse anchor hints.

---

## Task 7 — Dynamic type / max-font-size walkthrough (AC3)

Performed live against a running iOS Simulator (iPhone 17, iOS 26.5) with
`xcrun simctl ui booted content_size accessibility-extra-extra-extra-large` (the true OS-level maximum —
"Larger Text" slider pushed past its standard range into the Accessibility Sizes range), not a static
visual estimate. 18 of the 24 screens were directly screenshotted at this setting (every structural layout
pattern in the app is represented in this set); the remaining 6 (`(auth)/otp-verification.tsx`,
`(onboarding)/assessment.tsx`, `(onboarding)/ladder.tsx`, `(onboarding)/crisis.tsx` — only reachable
pre-authentication/mid-onboarding, which this signed-in test account could not cleanly re-enter without a
real device tap — plus `session/active.tsx`'s SUDS-logging/completion modals, which require an in-app tap to
open) were not independently screenshotted but share an already-tested structural pattern (sparse plain-CTA
screens, or the already-fixed `SudsScale`/`ScrollView` patterns) and received the same class of fix
proactively where source review confirmed the same risk. Screenshots were taken to `/tmp` during the
session and are not committed as a permanent image archive alongside this doc — the findings and fixes
below are the durable record.

7.1 confirmed (re-verified by repo-wide grep at story close): zero `allowFontScaling={false}` usage in
`apps/mobile` or `packages/ui`.

### Confirmed findings (live screenshot evidence) and fixes applied

1. **`packages/ui/src/components/CalmMeButton.tsx`** — the heart glyph `Text` (`icon` style, `fontSize: 26`)
   scaled with system font size and broke out of the FAB's fixed 56×56 circular bounds at max accessibility
   size, visually destroying the FAB on every screen it appears on. **Fixed:** `allowFontScaling={false}` on
   the glyph (decorative pictograph, not reading content — same exemption class as a navigation chevron).
2. **`apps/mobile/src/components/session/SudsScale.tsx`** — `button: { width: 56, ... }` was a *fixed*
   width; at max accessibility size the scaled number + anchor text overflowed the 56pt box and visually
   bled into neighbouring buttons (confirmed via `session/intent.tsx` screenshot — numbers and anchor labels
   overlapping across button boundaries). One of the two AC4-named highest-consequence components. **Fixed:**
   `width` → `minWidth` (container already has `flexWrap: 'wrap'`, so wider buttons reflow naturally) —
   mirrors the `minHeight: 56` pattern the story's Dev Notes already flagged as correct.
3. **`apps/mobile/src/components/onboarding/SudsCalibrationWidget.tsx`** — same fixed-size circular-target
   bug as #2 (`target: { width: 32, height: 32 }`), not independently screenshotted but confirmed via source
   review to be the identical pattern. **Fixed:** `width`/`height` → `minWidth`/`minHeight`, added
   `flexWrap: 'wrap'` to the row container (it had none — worse than SudsScale's, since 11 fixed-size targets
   in an unwrapped row would have overflowed off the right edge of the screen entirely).
4. **`apps/mobile/app/calm-me/breathing.tsx`, `calm-me/grounding.tsx`, `calm-me/helplines.tsx`** — the `‹`
   back-chevron `Text` (`backIcon` style) scaled with system font size; on `helplines.tsx` (confirmed via
   screenshot) this pushed the button's effective footprint past the content's `paddingTop: 96` clearance,
   visually colliding with the intro text below. **Fixed:** `allowFontScaling={false}` on all three (same
   decorative-glyph exemption as #1).
5. **No `ScrollView`, content pushed off-screen with no way to reach it** — confirmed via screenshot on
   `calm-me/index.tsx` (technique picker — the screen's entire purpose — completely unreachable),
   `session/technique.tsx` (2 of 3 technique cards + Continue unreachable), `(app)/settings/index.tsx`
   ("Delete my account" row clipped at the bottom with no scroll). **Fixed:** wrapped each in `ScrollView`
   with `contentContainerStyle` using `flexGrow: 1` (not `flex: 1`) so short-content layouts (including
   `marginTop: 'auto'` bottom-pinned footers on `calm-me/index.tsx`) render identically to before, while
   tall content now scrolls instead of being clipped. Proactively applied the same fix to
   `(auth)/sign-in.tsx`, `(auth)/otp-verification.tsx`, `(onboarding)/welcome.tsx`,
   `(onboarding)/complete.tsx` (same plain-`View`-no-scroll pattern, not independently screenshotted but a
   structural match with #5/#6's confirmed cases) and `session/pause.tsx` (superseded/dead code, but the
   identical pattern — fixed for consistency since it was a zero-risk, one-line-per-spot change while
   already touching this exact bug class).
6. **`justifyContent: 'center'` with no scroll clips the top of content off-screen** — confirmed via
   screenshot on `session/briefing.tsx` (title "You're almost ready" — the word "almost" rendered behind the
   status bar) and `session/abandoned.tsx` (message clipped the same way). Centering content taller than the
   viewport pushes its top edge above `y=0` with no way to scroll up to it. **Fixed:** same `ScrollView` +
   `flexGrow: 1` treatment as #5 — `justifyContent: 'center'` inside a `flexGrow: 1` content container still
   centers short content (no visual change for normal font sizes) but stops clipping tall content. Applied
   to `session/grounding.tsx` and `session/pause.tsx` too (identical pattern, confirmed via screenshot for
   `grounding.tsx`).
7. **Missing top safe-area clearance once screens became scrollable** — after applying fix #6,
   `session/grounding.tsx` still rendered its first line flush against the status bar (confirmed via a
   second screenshot pass) because its container had no `paddingTop` at all — centering had been masking
   this. **Fixed:** added `paddingTop: 48` (matching the convention already used by
   `session/briefing.tsx`/`calm-me/index.tsx`) to `session/grounding.tsx`, `session/abandoned.tsx`, and
   `session/pause.tsx`.
8. **`(app)/index.tsx` and `(app)/settings/index.tsx` heading text overlapping the Calm Me FAB** — confirmed
   via screenshot: at max accessibility size, the wrapped greeting ("Welcome back. Keep going.") and the
   "Settings" title both ran directly behind the FAB's top-right corner. The FAB itself stayed fully visible
   and tappable throughout (its `zIndex: 10`, added alongside the Task 6.2 focus-order fix, paints it above
   sibling content) — this is a text-legibility finding, not a FAB-functionality one. **Fixed:** added
   `paddingRight: 88` (FAB footprint + clearance) to both headings. Not applied speculatively to other
   headerless screens without direct screenshot evidence of the same collision, to avoid unverified changes.
9. **`(app)/settings/index.tsx`'s reminder row** — `rowBetween` (`flexDirection: 'row', justifyContent:
   'space-between'`, no wrap) caused the label ("Daily reminder") and value ("5:03 PM") to collide/visually
   truncate into each other at max size (confirmed via screenshot: rendered as "Daily reminder5"). **Fixed:**
   added `flexWrap: 'wrap'` + `rowGap: 4` so the value wraps to its own line when the row can't fit both.

### Also discovered, not fixed (z-index regression from Task 6.2, fixed as part of that work)

Moving `<CalmMeFab />` before `<Stack>` in `app/_layout.tsx` (Task 6.2) changes paint order: without an
explicit `zIndex`, the Stack's screen content would paint over the now-earlier FAB instead of the FAB
painting over content, making the FAB invisible on every screen. Confirmed via screenshot immediately after
the Task 6.2 reorder, before this was caught. **Fixed:** added `zIndex: 10` (and Android `elevation: 10`) to
`CalmMeFab.tsx`'s container style — see Task 6 Completion Notes.

### Accepted as-is (within the AC3 rubric's permitted "reflow/wrap")

`calm-me/helplines.tsx`'s helpline names/numbers ("Tele MANAS" → "Tele / MANA / S") wrap mid-word at extreme
sizes — ugly but not a clip/overlap/truncate/off-screen violation; the `Call` button beside each entry
remains fully visible and tappable. Not fixed — would require a hyphenation/`textBreakStrategy` strategy out
of scope for this story.

### Not independently verified

`(auth)/otp-verification.tsx`, `(onboarding)/assessment.tsx`, `(onboarding)/ladder.tsx`,
`(onboarding)/crisis.tsx` were not directly screenshotted at max font size (only reachable
pre-authentication/mid-onboarding; this session's signed-in test account could not cleanly re-enter that
flow without a real device tap, and blind UI automation via host-OS mouse clicks was judged too risky to
attempt without screen-capture verification, which was unavailable in this environment — see Completion
Notes). `assessment.tsx` and `ladder.tsx` already use `ScrollView` (confirmed via source), so they're
lower-risk; `crisis.tsx` is a single-line stub with no interactive elements. `otp-verification.tsx` received
the same proactive `ScrollView` fix as `sign-in.tsx` (identical pattern) but wasn't independently
screenshotted to confirm.
