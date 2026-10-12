---
title: 'Story 19.10: Complete Story 19.1 Remaining Device and Automation Verification'
type: 'chore'
created: '2026-10-12'
status: 'in-progress'
baseline_commit: '888d5816a8b9e0a2096196c0dad4dc65aad2a8eb'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 19.1 (onboarding "Do this later" label, new ladder copy, OS back from every onboarding step) was device-verified on one Android phone only. iOS swipe-back and Hindi are unchecked (TalkBack is deferred, see Decisions); the Maestro onboarding flows were edited for the new strings but their run status has never been recorded against 19.1; and one review deferral is open: no Jest test shows assessment's Next works again after returning from the ladder (the `isSubmittingRef` re-arm). The re-arm was already seen passing on the Android dev client (19.1 table, 2026-10-06), so the test pins existing behaviour; it is not a new device check.

**Approach:** Run the device checks in scope and record them in 19.1's device-verification table, confirm the Maestro onboarding flows pass (from CI evidence, or a run), and add the re-arm test. No product behaviour changes unless a check finds a defect; a defect found is recorded and fixed only if it is small and in 19.1's scope, otherwise deferred.

## Boundaries & Constraints

**Always:** Record every check, including failures and "not run", in the 19.1 spec's Device Verification section with build, device and date. Keep ARC-004 and the push-not-replace onboarding navigation from 19.1. Hindi results state what was seen, not only pass/fail.

**Never:** No Maestro back-from-ladder step and no change to the Maestro flows. No Hindi translation work and no TalkBack check in this story (both deferred, see Decisions). No new onboarding behaviour, copy rewrite or navigation redesign. No change to `ensureOnboarded.yaml` (fixed by 19.12, done; the core and session shards depend on it). No edit to 19.1's frozen intent.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| iOS swipe-back | iPhone, onboarding: ladder, crisis, complete, on a fresh throwaway account (not an existing one: a slow first sync can route it to onboarding and stall uploads, 19.9) | Left-edge swipe returns to the previous step each time (ladder to assessment to welcome; crisis to ladder; complete to ladder) | A step that exits onboarding or skips a step is a defect: record, then fix or defer |
| Hindi | Device language Hindi, onboarding ladder | Skip CTA shows "बाद में करें" and its layout holds (no clipping in the button). The rest of the ladder step is English in `hi.json` lines ~79-89 (`title`, `subtitle`, `descriptionLabel`, `descriptionPlaceholder`, `predictedSudsLabel`, `addCta`, `addAnother`, `moveUp`, `moveDown`, `sudsDisplay`, `nextCta`): recorded as known-untranslated | Clipping or overflow anywhere on the step, or an English string outside that list, is recorded, not silently passed |
| Maestro onboarding | `onboarding.yaml` (real signup/OTP path, taps "Do this later") and the clickthrough used by `ensureOnboarded` | Pass in CI (or a local run); record the run id and that the shard exercises the 19.1 strings | A failure is diagnosed here if it is a 19.1 string or flow issue |
| Re-arm test | Select SUDS, Next, simulate focus return, Next again | `push` is called a second time | n/a |

**Decisions (2026-10-12, human):** the Hindi translation of the onboarding ladder strings (all of `hi.json` lines ~79-89 except `skipCta`, `minimumItems`, `ladderNudge`, `ladderNudgeDismiss`) is deferred as fine for beta; the Hindi check records them as known-untranslated and only verifies the skip CTA and layout. The TalkBack check is deferred in full; recorded in `deferred-work.md`. **Decision (2026-10-12, human):** no back-from-ladder Maestro step; OS back stays covered by Jest and the manual device checks.

</frozen-after-approval>

## Code Map

- `_bmad-output/implementation-artifacts/spec-19-1-onboarding-courage-ladder-do-this-later-and-back-navigation.md` -- Device Verification tables ("Still unchecked: iOS swipe-back, TalkBack, Hindi"); review deferral at the isSubmittingRef line
- `apps/mobile/app/(onboarding)/assessment.tsx` -- `isSubmittingRef` re-armed in `useFocusEffect`; `handleNext` pushes the ladder
- `apps/mobile/app/(onboarding)/assessment.test.tsx` -- has "on re-focus rewinds step to 2" and double-press-once; no "Next works again after refocus". `mockFocusCallbacks` lets a test fire focus
- `apps/mobile/app/(onboarding)/ladder.tsx` -- Skip CTA `onboarding.fearLadder.skipCta`; its own focus effect
- `apps/mobile/.maestro/onboarding.yaml` -- real signup/OTP path; run by the `onboarding` CI shard
- `apps/mobile/.maestro/setup/_onboarding-clickthrough.yaml` -- welcome, assessment, "Do this later", complete; shared by `ensureOnboarded.yaml` (core and session shards); not edited in this story
- `apps/mobile/src/i18n/locales/hi.json`, `en.json` -- ladder strings (`hi.json` lines ~79-89)
- `.github/workflows/ci.yml` -- e2e jobs run only with the `run-e2e` label on PRs; Maestro is not installed locally
- Devices: Redmi K20 Pro (adb c77f545f), iPhone 15 Plus (UDID 00008120-001074290EE8201E); local build rigs in memory `android-local-build-rig`

## Tasks & Acceptance

**Execution:**
- [ ] `apps/mobile/app/(onboarding)/assessment.test.tsx` -- add a behavioral test (no access to `isSubmittingRef`): pick a SUDS value, press Next and await the async `enqueue` (one push), fire the focus callbacks, press Next again, expect a second push -- closes the 19.1 review deferral. Commit this test first, before the device runs, so it survives if they slip
- [ ] Maestro -- record the SHA the run built and confirm `onboarding.yaml` and `_onboarding-clickthrough.yaml` are unchanged since 19.1's edits (history of both files); if they changed, say so and rerun the shard instead of citing the old run. Record the latest green `onboarding`, `core` and `session` shard run on `main` (run 38249274244, the PR #107 merge, all three passed; the 19.8 merge run 38264200966 was still in progress, check it before recording) in the 19.1 table, noting the onboarding shard covers the "Do this later" and new ladder copy path; no rerun and no flow change
- [ ] Pre-flight, not evidence: `grep -rn gestureEnabled "apps/mobile/app/(onboarding)"` before building for the iPhone; a hit that disables the swipe is a defect to fix or defer before the device run
- [ ] iOS swipe-back on the iPhone against hosted with a fresh throwaway account (expo run:ios --device, team JCG7J2Y5BN): ladder to assessment to welcome, crisis to ladder, complete to ladder; also note whether the crisis step has a visible back control or the swipe is the only exit; record in the 19.1 table
- [ ] Hindi on the Redmi (device language Hindi): skip CTA and layout; list every English string seen on the step; take a screenshot for review (kept out of the repo) and record in words what is shown, including whether the Devanagari glyphs clip in the button
- [ ] `_bmad-output/implementation-artifacts/spec-19-1-*.md` -- update "Still unchecked" lines (TalkBack stays unchecked, pointing at the deferral; drop the stale "1367292 / c44caad on device" item, already passed on the 2026-10-06 dev client) and tables with dates and builds; fix the malformed "Press Home on the ladder" row (stray extra column) in the 2026-10-06 table; `sprint-status.yaml` and `deferred-work.md` -- close the 19.1 deferrals that are now done

**Acceptance Criteria:**
- Given the iPhone, when the user swipes back (ladder to assessment to welcome; crisis to ladder; complete to ladder), then each lands on the previous step, and the result is in the 19.1 table
- Given the device language is Hindi, when the ladder step is opened, then the skip CTA is recorded as seen in Hindi with its layout intact, and the other English strings are recorded as known-untranslated
- Given the Maestro onboarding flows, when the latest CI run or a fresh run is checked, then the pass or failure is recorded with a run id and the SHA it built, with the flows confirmed unchanged since 19.1
- Given assessment returned to from the ladder, when Next is pressed again, then a Jest test shows it navigates again
- Given a defect found by any check, when it is small and within 19.1's scope, then it is fixed and re-verified; otherwise it is logged in `deferred-work.md`

## Implementation Notes

(empty until implementation)

## Verification

**Commands:**
- `pnpm turbo typecheck lint test` -- expected: all green
