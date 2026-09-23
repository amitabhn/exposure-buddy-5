# Story 12.4: Exposure Flow — UI/UX Enhancements

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user about to start or just having finished an exposure session,
I want the pre-exposure note prompt to actually ask what the screen needs from me, and the debrief screen's save-failure message to tell me what really happened,
So that the intent screen's note field matches its real purpose as a feeling/expectation check-in (not a generic journaling prompt), and a failed reflection save doesn't wrongly reassure me my data is safely stored when it's actually just sitting unsent in front of me (FR-UXENH-01).

*Source: two independent, already-logged findings in `deferred-work.md`, not a Claude Design mockup — no mockup exists for the exposure flow. (1) Product feedback on `intent.tsx` (2026-08-04), explicitly flagged there as "strong candidate input for Story 12.4." (2) Cross-cutting `debrief.tsx` items surfaced during Story 12.3's code review (2026-09-17) and explicitly deferred as "not specific to that story" because they're pre-existing patterns `ladder.tsx` had copied from `debrief.tsx`, not defects introduced by 12.3.*

**Screens in scope for this pass:** `apps/mobile/app/session/intent.tsx` and `apps/mobile/app/session/debrief.tsx` only. The epic's full reservation (`briefing.tsx`, `technique.tsx`, `active.tsx`, `pause.tsx`, `grounding.tsx`, `abandoned.tsx`) remains an open placeholder — untouched here, pending future feedback, review, or a design mockup.

**Explicitly out of scope for this pass:** the emotion-identification aid (chip list / picker) from the same 2026-08-04 feedback item — needs UX design input (word set, structured-vs-free-text storage, placement) before ACs can be written. Stays in `deferred-work.md`.

---

## Acceptance Criteria

Full Given/When/Then text lives under Story 12.4 in `_bmad-output/planning-artifacts/epics.md` (Epic 12). Summary:

**AC-A (intent.tsx prompt + placeholder rewrite).** `session.intent.intentionPrompt` changes from "Would you like to write yourself a note?" to "How are you feeling right now? What do you think will happen?" (`en.json` + `hi.json`, hi.json duplicating the English copy per existing convention) — this single key drives both the visible label (`intent.tsx:159`) and the field's `accessibilityLabel` (`intent.tsx:167`). `session.intent.intentionPlaceholder` changes from "What do you expect to feel? What do you want to remember after?" (now half-redundant with the new prompt) to an example-format hint, e.g. "e.g. Nervous my hands will shake, but I can handle it" — same restated-question → example-format convention Story 12.1 used for the sign-in screen's identifier placeholders.

**AC-B (debrief.tsx saveFailed copy accuracy).** `session.debrief.saveFailed` currently reads "We couldn't save your reflection. Your session data is stored on your device and will sync automatically." — inaccurate, since `handleSubmitReflection`'s `catch` block (`debrief.tsx:116-120`) never successfully calls `enqueue()`; the reflection text only survives in React state, not in any durable/syncable store. Copy changes to accurately describe the actual state and next step, e.g. "We couldn't save your reflection yet. It's still here — tap Try again to save it." Only `session.debrief.saveFailed` is touched — the matching `ladder.saveFailed`/`onboarding.calibration.saveFailed`/`onboarding.fearLadder.saveFailed` keys on other screens are out of scope (not session/ screens) and remain the separately-logged fast-follow.

**AC-C (debrief.tsx iOS live-region gap).** `accessibilityLiveRegion="polite"` (`debrief.tsx:205`) is Android-only, so iOS VoiceOver never auto-announces the save error. Add an `AccessibilityInfo.announceForAccessibility(saveError)` call fired when `saveError` transitions from `null` to a value, giving iOS the same automatic announcement Android already gets.

---

## Tasks / Subtasks

### T1 — intent.tsx copy (AC: A)

- [x] Update `session.intent.intentionPrompt` in `en.json` and `hi.json`
- [x] Update `session.intent.intentionPlaceholder` in `en.json` and `hi.json` to the example-format hint
- [x] Confirm no other call site depends on the old prompt/placeholder wording (grep `intentionPrompt`, `intentionPlaceholder`)
- [x] Update/add tests in `apps/mobile/app/session/intent.test.tsx` asserting the new label text and accessibility label

### T2 — debrief.tsx saveFailed copy (AC: B)

- [x] Update `session.debrief.saveFailed` in `en.json` and `hi.json`
- [x] Update/add tests in `apps/mobile/app/session/debrief.test.tsx` asserting the new error copy renders on enqueue failure

### T3 — debrief.tsx iOS announcement (AC: C)

- [x] Import `AccessibilityInfo` from `react-native` in `debrief.tsx` (if not already imported)
- [x] Fire `AccessibilityInfo.announceForAccessibility(saveError)` at the point `saveError` is set in the `catch` block of `handleSubmitReflection` (or via a `useEffect` keyed on `saveError`, whichever keeps `accessibilityLiveRegion` and the imperative announcement from double-firing on Android — verify Android doesn't double-announce before deciding)
- [x] Add a test asserting `announceForAccessibility` is called with the error text when `enqueue` throws
- [x] `pnpm turbo typecheck lint test` green across all packages/apps

### T4 — Verification

- [ ] Manual check: `intent.tsx` screen shows new label/placeholder correctly in both English and Hindi locales
- [ ] Manual check: triggering a debrief save failure shows the corrected copy and (on a real iOS device/simulator with VoiceOver on) is announced automatically

---

## Dev Notes

- `session.intent.intentionPrompt` is read in three places in `intent.tsx` (visible `<Text>` label, `TextInput.accessibilityLabel`, and nowhere else) — changing the one key is sufficient; no JSX restructuring needed.
- The `hi.json` entries for both `session.intent.*` and `session.debrief.saveFailed` currently duplicate English text (pre-existing gap, not this story's concern) — keep that convention, don't attempt a real Hindi translation here.
- `AccessibilityInfo.announceForAccessibility` is the standard RN cross-platform imperative announcement API (works via `UIAccessibilityAnnouncementNotification` on iOS, and posts to the accessibility event stream on Android) — confirm during implementation whether pairing it with the existing `accessibilityLiveRegion="polite"` causes a double-announcement on Android, and if so, prefer the imperative call alone (drop the `accessibilityLiveRegion` prop) rather than keeping both.
- This story does **not** touch `ladder.saveFailed`/`onboarding.*.saveFailed` — those remain the copy-wide-pass fast-follow already logged in `deferred-work.md`'s Story 12.3 review section.

## Dev Agent Record

### Implementation Plan

- AC-A: changed `session.intent.intentionPrompt` and `session.intent.intentionPlaceholder` in `en.json`/`hi.json` only — confirmed via grep that `intent.tsx` is the only call site (visible label + `TextInput.accessibilityLabel`, both driven by `intentionPrompt`; placeholder drives `TextInput.placeholder`). No JSX changes needed.
- AC-B: changed `session.debrief.saveFailed` in `en.json`. `hi.json` did not previously define this key at all (fell back to English via i18next's fallback language, unlike `intentionPrompt`/`intentionPlaceholder` which did duplicate English text) — added it to `hi.json` with the same English copy to match the story's stated convention going forward.
- AC-C: added a `useEffect` in `debrief.tsx` keyed on `saveError` that calls `AccessibilityInfo.announceForAccessibility(saveError)` whenever `saveError` becomes truthy (mirrors the existing `GroundingPrompt`/`BreathingCoach` pattern in `packages/ui`, which already use imperative-only announcements with no `accessibilityLiveRegion` prop on the same node). Removed the `accessibilityLiveRegion="polite"` prop from the `saveErrorText` `<Text>` rather than keeping both — RN's Android live-region announcement and the imperative `announceForAccessibility` call are two independent paths to the same TalkBack event stream, and per the Dev Notes' explicit "prefer imperative alone" fallback, this avoids a plausible double-announcement on Android that can't be conclusively verified without a physical device.

### Test coverage decision (T1/T2)

Both `intent.test.tsx` and `debrief.test.tsx` mock `react-i18next`'s `t()` as the identity function (`t: (key) => key`), a pre-existing pattern in this codebase. This means component-level tests can only assert on translation *keys*, not on translated copy — so the AC-A/AC-B copy-accuracy requirement ("new label text", "new error copy") is asserted at the content level in `src/i18n/i18n.test.ts` (new `Story 12.4` describe blocks), which imports the real `en.json`/`hi.json` and checks exact string values. `intent.test.tsx` and `debrief.test.tsx` were still updated per the task list: `intent.test.tsx` gained wiring tests confirming `intentionPrompt` drives both the visible label and `TextInput.accessibilityLabel`, and that `intentionPlaceholder` drives the `TextInput.placeholder`; `debrief.test.tsx` gained the `announceForAccessibility` assertions for AC-C and had its now-invalid `accessibilityLiveRegion="polite"` assertion replaced.

### Completion Notes

- All 3 ACs implemented; `pnpm turbo typecheck lint test` green across all packages/apps (19/19 tasks, 445 mobile tests, no regressions).
- T4 (manual device verification) intentionally left unchecked — see status note below.

### File List

- `apps/mobile/src/i18n/locales/en.json` — modified (`session.intent.intentionPrompt`, `session.intent.intentionPlaceholder`, `session.debrief.saveFailed`)
- `apps/mobile/src/i18n/locales/hi.json` — modified (same three keys; `session.debrief.saveFailed` newly added)
- `apps/mobile/app/session/debrief.tsx` — modified (AccessibilityInfo import, `useEffect` announcement, removed `accessibilityLiveRegion` from saveErrorText)
- `apps/mobile/app/session/intent.test.tsx` — modified (added AC-A wiring tests)
- `apps/mobile/app/session/debrief.test.tsx` — modified (added AC-C `announceForAccessibility` tests, replaced obsolete `accessibilityLiveRegion` assertion)
- `apps/mobile/src/i18n/i18n.test.ts` — modified (added Story 12.4 locale-content assertions for AC-A/AC-B)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-09-23 | Story scoped from `deferred-work.md` candidates (intent.tsx product feedback + debrief.tsx cross-cutting Story 12.3 review items); status set to ready-for-dev | Amitabh |
| 2026-09-23 | T1–T3 implemented (AC-A/B/C) and fully tested; `pnpm turbo typecheck lint test` green; T4 manual device checks pending user verification | Claude Sonnet 5 |
