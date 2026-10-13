---
title: 'Story 19.10: Complete Story 19.1 Remaining Device and Automation Verification'
type: 'chore'
created: '2026-10-12'
status: 'done'
baseline_commit: 'fec0f80267d3d852a10131cfb9a4aae5cad0c646'
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
- [x] `apps/mobile/app/(onboarding)/assessment.test.tsx` -- add a behavioral test (no access to `isSubmittingRef`): pick a SUDS value, press Next and await the async `enqueue` (one push), fire the focus callbacks, press Next again, expect a second push -- closes the 19.1 review deferral. Commit this test first, before the device runs, so it survives if they slip
- [x] Maestro -- record the SHA the run built and confirm `onboarding.yaml` and `_onboarding-clickthrough.yaml` are unchanged since 19.1's edits (history of both files); if they changed, say so and rerun the shard instead of citing the old run. Record the latest green `onboarding`, `core` and `session` shard run on `main` (run 38249274244, the PR #107 merge, all three passed; the 19.8 merge run 38264200966 was still in progress, check it before recording) in the 19.1 table, noting the onboarding shard covers the "Do this later" and new ladder copy path; no rerun and no flow change
- [x] Pre-flight, not evidence: `grep -rn gestureEnabled "apps/mobile/app/(onboarding)"` before building for the iPhone; a hit that disables the swipe is a defect to fix or defer before the device run
- [x] iOS swipe-back on the iPhone against hosted with a fresh throwaway account (expo run:ios --device, team JCG7J2Y5BN): ladder to assessment to welcome, crisis to ladder, complete to ladder; also note whether the crisis step has a visible back control or the swipe is the only exit; record in the 19.1 table
- [x] Hindi on the Redmi (device language Hindi): skip CTA and layout; list every English string seen on the step; take a screenshot for review (kept out of the repo) and record in words what is shown, including whether the Devanagari glyphs clip in the button
- [x] `_bmad-output/implementation-artifacts/spec-19-1-*.md` -- update "Still unchecked" lines (TalkBack stays unchecked, pointing at the deferral; drop the stale "1367292 / c44caad on device" item, already passed on the 2026-10-06 dev client) and tables with dates and builds; fix the malformed "Press Home on the ladder" row (stray extra column) in the 2026-10-06 table; `sprint-status.yaml` and `deferred-work.md` -- close the 19.1 deferrals that are now done

**Acceptance Criteria:**
- Given the iPhone, when the user swipes back (ladder to assessment to welcome; crisis to ladder; complete to ladder), then each lands on the previous step, and the result is in the 19.1 table
- Given the device language is Hindi, when the ladder step is opened, then the skip CTA is recorded as seen in Hindi with its layout intact, and the other English strings are recorded as known-untranslated
- Given the Maestro onboarding flows, when the latest CI run or a fresh run is checked, then the pass or failure is recorded with a run id and the SHA it built, with the flows confirmed unchanged since 19.1
- Given assessment returned to from the ladder, when Next is pressed again, then a Jest test shows it navigates again
- Given a defect found by any check, when it is small and within 19.1's scope, then it is fixed and re-verified; otherwise it is logged in `deferred-work.md`

## Implementation Notes

- **Re-arm test** (`2616e49`): "Next navigates to the ladder again after returning from it" in `assessment.test.tsx`; behavioral (two pushes), no ref access. Verified it fails with the `isSubmittingRef` re-arm removed from `useFocusEffect`.
- **`gestureEnabled` pre-flight:** the only hit is `welcome.tsx` (`gestureEnabled: false`, first step, nothing to swipe back to); assessment, ladder, crisis and `complete` leave the swipe enabled.
- **Maestro:** run 38249274244 (main, built `4f3a38d`, the PR #107 merge): `onboarding`, `core`, `session` all green. The 19.8 merge run 38264200966 also finished green on all three shards. The flows were edited after 19.1 by 19.4 (`a0a7b51`) and 19.5 (`e364dc1`), both inside the run, and are identical to HEAD, so the literal "unchanged since 19.1" check does not hold but the evidence covers the current flows. Correction to the I/O matrix wording: `onboarding.yaml` asserts the new ladder label; the "Do this later" tap is in `_onboarding-clickthrough.yaml` (core and session shards).
- **iOS swipe-back:** passes on ladder to assessment to welcome, crisis to ladder, `complete` to ladder (iPhone 15 Plus, local Release build of `54baff8`, hosted, throwaway account). The crisis step has no visible back control; the swipe is the only exit, accepted as is (`1cc8e00`).
- **Defect found and fixed (small, in 19.1's scope):** the iOS assessment step ("Step 2 of 4") showed a visible header back button, unlike the ladder and `complete`. Set `headerShown: false` with `insets.top + 16` top padding, as on the ladder (`94c39e4`); re-verified on the iPhone. The swipe and OS back still work. This goes beyond the spec's "no new onboarding behaviour" wording and was requested by the human on 2026-10-12.
- **Hindi:** skip CTA "बाद में करें" intact with no clipping; English strings seen, including three outside the known-untranslated list ("Drag to rate", the SUDS legend, "Feeling overwhelmed?") plus the whole assessment step; logged in `deferred-work.md`. Tested on the EAS preview 1.0.2 (2) already on the Redmi, which pre-dates the header change. The throwaway account used for it was deleted through the app's own flow (30-day soft delete), and the device language was restored to en-GB.
- **Closed in `deferred-work.md`:** the three 19.1 code-review deferrals (OS-back device check, persisted step after back from `complete`, re-arm test). TalkBack and the Hindi translation stay deferred.
- **Operational notes:** `expo run:ios` stalls on "Preparing <device>" when the iPhone is locked, and its install step can hang; `devicectl device install app` plus `process launch` is the reliable path.

## Review Triage Log

Layers: Blind Hunter (9 findings, floor 6), Edge Case Hunter (6), Verification Gap (1 gap + 2 other). Loopbacks: none (`review_loop_iteration` 0).

| # | Finding (layers) | Verdict | Route | Evidence |
|---|---|---|---|---|
| 1 | Maestro run 38249274244 built `4f3a38d`, before the assessment header change, so it does not cover the final assessment layout (BH, ECH, VG) | medium | patch | True: 94c39e4 is later than that run. The 19.1 Maestro row now says so and tells the PR to carry the `run-e2e` label. |
| 2 | Android not rechecked after hiding the assessment header; status-bar overlap, 2x font, OS back unchecked (BH, ECH) | low | patch | Real gap, but the identical `headerShown: false` + `insets.top + 16` pattern is on the ladder and passed on Android incl. 2x font. Recorded as "not rechecked" in the 19.1 table. |
| 3 | No test asserts the header option or padding (BH, VG) | low | patch | True: `Stack.Screen` was mocked to null. Added "hides the header..." test capturing the options; it fails when `headerShown: false` is reverted. `useSafeAreaInsets` needs no mock (suite passes). |
| 4 | Top padding plus removed header pushes Next further below the fold (ECH) | false | reject | Old layout was header plus 32 dp top padding; new is `insets.top + 16`, so content moves up. The screen is a ScrollView. |
| 5 | Hindi/other English strings under a Hindi locale are waved off as "fine for beta", incl. account-deletion notice (BH) | medium | defer | Pre-existing (not caused by this diff). Priority note for the deletion dialog and DPDPA added to the `deferred-work.md` entry. |
| 6 | No visible back control is an accessibility cost; switch/VoiceOver users have no way back; add a "Back" link (BH) | low | reject | Human-requested removal; OS back exists on both platforms and the forward path stays open; same accepted trade-off as the crisis step (1cc8e00). |
| 7 | Spec scope, Boundaries and ACs not updated for the header change (BH, ECH) | n/a | reject | Fix is to edit this build's spec, and the intent is frozen. The deviation is human-requested and recorded in Implementation Notes; the human can renegotiate the frozen intent if wanted. |
| 8 | Status mismatch: spec `in-review` vs sprint `in-progress`; 19.1 sprint entry ends "not pushed, no PR" (BH, ECH) | low | reject | The sprint flip to `review` is the next step (present). The stale 19.1 text is pre-existing, not caused by this diff. |
| 9 | Hindi evidence gaps: one device and build, screenshot not in the repo, not rechecked with the new padding, no i18n key audit (BH, ECH) | low | reject | Padding is language-independent; the screenshot is intentionally outside the repo (human decision); an i18n audit is speculative. |
| 10 | Re-arm test: `getByRole('button')` ambiguous; no guard assertion before focus; deferred-work cites `2616e49` ordering unprovable (BH, VG) | false | reject | The screen has one button (the neighbouring tests use the same query and pass); the double-press test covers the guard; the commit order is in `git log` (2616e49 precedes the device-run docs). |
| 11 | Hosted throwaway accounts only soft-deleted; the iPhone account's cleanup not mentioned (BH) | low | reject | Not caused by the code diff. The iPhone account was created by the human; surfaced in the review summary instead. |

## Verification

**Commands:**
- `pnpm turbo typecheck lint test` -- expected: all green
