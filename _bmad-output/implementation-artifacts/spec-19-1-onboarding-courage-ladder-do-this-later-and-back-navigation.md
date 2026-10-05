---
title: 'Onboarding Courage Ladder — "Do this later" Label & Back Navigation'
type: 'bugfix'
created: '2026-10-05'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: []
baseline_commit: '8c51e0e6e4fbe26bde64dcfcc7584ade2604a9a9'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** (Beta feedback items 1 and 2; FR-ONBOARD-NAV-01.) On the onboarding Courage Ladder step, the empty-ladder deferral CTA reads "Skip" (`onboarding.fearLadder.skipCta`) rather than being worded as a deferral, and pressing the OS back control on the ladder step takes the user to step 1 instead of the immediately previous onboarding step.

**Approach:** Reword the CTA to "Do this later" in `en.json` (with `hi.json` updated per convention; accessibility label follows the visible label; behaviour unchanged). Diagnose the back-navigation cause (suspects: `router.replace` usage across onboarding steps, or a back handler in `(onboarding)/_layout.tsx`) and fix it so OS back returns to the immediately previous step from every onboarding step, with a regression test for ladder → previous step.

## Boundaries & Constraints

**Always:**
- The CTA's behaviour is unchanged — only its label (and the accessibility label tracking it) changes.
- `hi.json` is updated in the same change, following the established locale convention.
- Maestro flows that assert on the old "Skip" text are updated in this same change (`deferred-work.md` already records Maestro flows that went stale silently).
- OS back (Android hardware/gesture and iOS swipe-back) returns to the immediately previous onboarding step from **every** onboarding step, not only the ladder.
- A regression test covers the ladder → previous-step case.
- Pressing back from the crisis screen (pushed as `/(onboarding)/crisis` from the crisis banner on this screen) returns to the ladder with in-progress items intact.

**Never:**
- Do not rename the i18n key `onboarding.fearLadder.skipCta` or any route/component identifier.
- Do not change onboarding progress persistence semantics (`setOnboardingProgressStep`, `setSudsCalibration`) as a side effect of the navigation fix.
- Do not add custom back-handler hacks if stack-history correction resolves the cause.

</frozen-after-approval>

## Code Map

- `apps/mobile/app/(onboarding)/ladder.tsx` -- ladder step; skip CTA (`onboarding.fearLadder.skipCta`) and its navigation to `/(onboarding)/complete`
- `apps/mobile/app/(onboarding)/assessment.tsx` -- previous step; navigation into the ladder
- `apps/mobile/app/(onboarding)/_layout.tsx` -- onboarding stack definition
- `apps/mobile/src/i18n/locales/en.json` / `hi.json` -- `onboarding.fearLadder.skipCta`
- `apps/mobile/.maestro/setup/_onboarding-clickthrough.yaml` -- Maestro clickthrough asserting on the CTA text
- `apps/mobile/app/(onboarding)/ladder.test.tsx`, `assessment.test.tsx` -- Jest coverage

## Tasks & Acceptance

**Acceptance Criteria** (from `epics.md`, Story 19.1):

1. **Given** the empty-ladder CTA reads "Skip" **When** this story is implemented **Then** it reads "Do this later" in `en.json`, `hi.json` is updated per the established convention, the accessibility label follows the visible label, and the CTA's behaviour is unchanged.
2. **Given** pressing the OS back button on the ladder step takes the user to step 1 instead of the previous step **When** the cause is diagnosed **Then** OS back (Android hardware/gesture and iOS swipe-back) returns to the immediately previous onboarding step, from every onboarding step, and a regression test covers the ladder → previous-step case.
3. **Given** the crisis banner pushes `/(onboarding)/crisis` from this screen **When** the user presses back from crisis **Then** they return to the ladder with their in-progress items intact.

**Tasks:**
- [x] Reword `skipCta` in `en.json` and `hi.json`; confirm accessibility label derives from it
- [x] Update Maestro clickthrough text assertions
- [x] Diagnose back-nav root cause: `assessment → ladder` used `router.replace`, dropping assessment from the stack
- [x] Switch `assessment → ladder` and `ladder → complete` to `router.push`; update Jest tests (assert `push`, `replace` not called)
- [ ] Verify on device (Android + iOS) — not yet done
- [ ] Verify crisis → back → ladder preserves in-progress items (AC 3) — no test in the implementation commit
- [x] Audit remaining onboarding transitions (welcome resume rebuilt with push — see Review Findings) (welcome → … → assessment, complete) for `replace` misuse (AC 2 "every onboarding step")

**Verification:** onboarding Jest suite, `tsc`, ESLint clean; manual OS-back check on each onboarding step.

### Review Findings

_Code review 2026-10-05 — layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor (full mode). 0 decision-needed (1 resolved → patch), 3 patch, 3 defer, 9 rejected._

- [x] [Review][Patch] Rebuild the stack on resume (decision: option a) — `welcome.tsx:30-34` resumes via `router.replace`, dropping welcome and leaving no back target. On resume at step 3 push assessment then ladder; at step 4 push assessment, ladder, then complete (with `count` param unavailable, as today), so OS back returns to the immediately previous step. Update welcome tests. [welcome.tsx:30]
- [x] [Review][Patch] Double-tap now stacks duplicate screens — `ladder.tsx:146-150` `handleNext` has no in-flight guard, and `assessment.tsx:55-58` resets `isSubmittingRef` just before `router.push`. With `replace` a double tap was harmless; with `push` it stacks two `complete`/`ladder` screens, so OS back lands on a duplicate. Add a navigation guard to both handlers (keep the ref set through the push) + test. [ladder.tsx:146, assessment.tsx:55]
- [x] [Review][Patch] Harden ladder tests — `ladder.test.tsx` ladder→complete tests don't assert `mockReplace` was not called (unlike `assessment.test.tsx`), titles at ~lines 75/139 still say "Skip", and there is no test that the crisis banner/link pushes `/(onboarding)/crisis` (AC 3 coverage). [ladder.test.tsx]
- [x] [Review][Defer] OS-back behaviour verified only by mocked router calls — no real-stack/expo-router test or Maestro back step; story status note says "Not verified on device" — deferred: perform the manual Android + iOS back check per the spec's Verification line (or add a Maestro back-from-ladder step); settles whether the `push` fix works on the real stack.
- [x] [Review][Defer] Persisted progress step stays 4 after back from `complete` to ladder — the `useEffect` at `ladder.tsx:47-49` only runs on mount, so closing the app then resumes to `complete` (no `count` param) — deferred: low impact, resume lands on a valid screen; revisit with the decision above.
- [x] [Review][Defer] No test that assessment Next works again after returning from ladder (`isSubmittingRef` reset) — deferred: code resets the flag; unpinned but low risk.

**Rejected:**
- `complete` exit leaves onboarding screens on the stack — false: `complete.tsx:18` `replace('/')` plus the layout's `isOnboardingComplete → replace('/(app)')` effect (`_layout.tsx:13-17`); welcome→assessment was already `push`, so nothing new.
- Stale `count` param when re-pushing `complete` — false: `push` creates a fresh route instance with fresh params.
- `hi.json` neighbours still English — pre-existing, outside this diff (low, not worth fixing here).
- Other Maestro flows stale on "Skip" — false: `onboarding.yaml`/`ensureOnboarded.yaml`/`reachDebrief.yaml` only mention "Skip" in comments; the `_onboarding-clickthrough.yaml` comments (lines 4-5, 28) are cosmetic (low).
- Accessibility label follows visible label unverified — false: label is `t('onboarding.fearLadder.skipCta')` per the Maestro note and the same key.
- `_layout.tsx` back-handler suspect not ruled out — false: layout has no back handler; root cause was `replace` dropping the assessment.
- Tests don't assert rendered "Do this later" text — low: Jest uses i18n keys by convention; not worth a new mechanism.
- `ladder → complete` push "changes CTA behaviour" — false: destination and params unchanged; only history differs, which is the intended fix.
- Unverified-on-device status moved to `review` — process note, covered by the defer above.
