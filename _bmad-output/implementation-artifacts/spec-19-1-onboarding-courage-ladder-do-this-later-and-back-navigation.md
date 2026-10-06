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
- `apps/mobile/.maestro/onboarding.yaml` -- asserts the fear-item description field label (AC 4)
- `apps/mobile/src/components/onboarding/FearItemForm.tsx` -- renders `onboarding.fearLadder.descriptionLabel` as label and accessibility label (no code change)
- `apps/mobile/app/(onboarding)/ladder.test.tsx`, `assessment.test.tsx` -- Jest coverage

## Tasks & Acceptance

**Acceptance Criteria** (from `epics.md`, Story 19.1):

1. **Given** the empty-ladder CTA reads "Skip" **When** this story is implemented **Then** it reads "Do this later" in `en.json`, `hi.json` is updated per the established convention, the accessibility label follows the visible label, and the CTA's behaviour is unchanged.
2. **Given** pressing the OS back button on the ladder step takes the user to step 1 instead of the previous step **When** the cause is diagnosed **Then** OS back (Android hardware/gesture and iOS swipe-back) returns to the immediately previous onboarding step, from every onboarding step, and a regression test covers the ladder → previous-step case.
3. **Given** the crisis banner pushes `/(onboarding)/crisis` from this screen **When** the user presses back from crisis **Then** they return to the ladder with their in-progress items intact.
4. **Added scope (2026-10-05, requested by the product owner during review):** **Given** the onboarding "Build your Courage Ladder" screen copy **When** this story is implemented **Then** the subtitle reads "Add situations that make you anxious, then arrange them from least to most scary." (was "Add **the** situations…") and the description field label — visible text and accessibility label — reads "Describe a situation that makes you anxious" (was "Describe the situation"), in both `en.json` and `hi.json` (`onboarding.fearLadder.subtitle`, `onboarding.fearLadder.descriptionLabel`). `hi.json` keeps English for these keys, as before. The Maestro onboarding flow asserting the field label is updated in the same change.

**Tasks:**
- [x] Reword `skipCta` in `en.json` and `hi.json`; confirm accessibility label derives from it
- [x] Update Maestro clickthrough text assertions
- [x] AC 4 copy: update `onboarding.fearLadder.subtitle` and `descriptionLabel` in `en.json`/`hi.json`; update `onboarding.yaml` label assertions (not yet checked on device or via a Maestro run)
- [x] Diagnose back-nav root cause: `assessment → ladder` used `router.replace`, dropping assessment from the stack
- [x] Switch `assessment → ladder` and `ladder → complete` to `router.push`; update Jest tests (assert `push`, `replace` not called)
- [x] Verify on device — Android done 2026-10-05 (Redmi K20 Pro, EAS preview build of ae2fc9b); iOS not done. See Device Verification below
- [x] Verify crisis → back → ladder preserves in-progress items (AC 3) — verified on Android device; Jest test added for the crisis push
- [x] Audit remaining onboarding transitions (welcome resume rebuilt with push — see Review Findings) (welcome → … → assessment, complete) for `replace` misuse (AC 2 "every onboarding step")

**Verification:** onboarding Jest suite, `tsc`, ESLint clean; manual OS-back check on each onboarding step.

### Review Findings

_Code review 2026-10-05 — layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor (full mode). 0 decision-needed (1 resolved → patch), 4 patch (1 found on-device), 3 defer, 9 rejected._

- [x] [Review][Patch] Rebuild the stack on resume (decision: option a) — `welcome.tsx:30-34` resumes via `router.replace`, dropping welcome and leaving no back target. On resume at step 3 push assessment then ladder; at step 4 push assessment, ladder, then complete (with `count` param unavailable, as today), so OS back returns to the immediately previous step. Update welcome tests. [welcome.tsx:30]
- [x] [Review][Patch] Double-tap now stacks duplicate screens — `ladder.tsx:146-150` `handleNext` has no in-flight guard, and `assessment.tsx:55-58` resets `isSubmittingRef` just before `router.push`. With `replace` a double tap was harmless; with `push` it stacks two `complete`/`ladder` screens, so OS back lands on a duplicate. Add a navigation guard to both handlers (keep the ref set through the push) + test. [ladder.tsx:146, assessment.tsx:55]
- [x] [Review][Patch] Harden ladder tests — `ladder.test.tsx` ladder→complete tests don't assert `mockReplace` was not called (unlike `assessment.test.tsx`), titles at ~lines 75/139 still say "Skip", and there is no test that the crisis banner/link pushes `/(onboarding)/crisis` (AC 3 coverage). [ladder.test.tsx]
- [x] [Review][Defer] OS-back behaviour verified only by mocked router calls — no real-stack/expo-router test or Maestro back step; story status note says "Not verified on device" — deferred: perform the manual Android + iOS back check per the spec's Verification line (or add a Maestro back-from-ladder step); settles whether the `push` fix works on the real stack.
- [x] [Review][Defer] Persisted progress step stays 4 after back from `complete` to ladder — the `useEffect` at `ladder.tsx:47-49` only runs on mount, so closing the app then resumes to `complete` (no `count` param) — deferred: low impact, resume lands on a valid screen; revisit with the decision above. **RESOLVED 2026-10-06 (1367292):** ladder/assessment/complete now persist their step in `useFocusEffect`, so OS back rewinds the saved step.
- [x] [Review][Defer] No test that assessment Next works again after returning from ladder (`isSubmittingRef` reset) — deferred: code resets the flag; unpinned but low risk.

- [x] [Review][Patch] (found on-device) `setOnboardingProgressStep` clobbered the saved step under push navigation — `OnboardingProvider.setOnboardingProgressStep` was a plain function recreated every render, so the ladder's `useEffect([setOnboardingProgressStep])` re-fired while kept mounted under `complete` and rewrote step 4 → 3 (assessment likewise 3 → 2). A force-stop on `complete` then resumed onto the ladder. Fixed by `useCallback([userId])` in `packages/supabase/src/auth/OnboardingProvider.tsx` (commit 251f0ee); regression test `packages/supabase/__tests__/auth/onboardingProvider.setterIdentity.test.tsx` (fails on the pre-fix provider, passes after). **Fix not yet re-verified on device** — needs a new EAS build.

### Post-review fixes (2026-10-06)

Found while re-testing on device after the last review round; committed locally, not yet device-verified.

- **Persisted step vs visible screen (1367292).** The deferred "step stays 4 after back from `complete`" item, plus the same defect one screen earlier (back from ladder left the step at 3). `ladder.tsx` / `assessment.tsx` moved their step write from a mount effect to `useFocusEffect`; `complete.tsx` now writes 4 on focus so a stack rebuilt on resume doesn't leave the ladder's 3 as the saved step.
- **Mid-onboarding relaunch skipped to Home (1367292).** Root cause: the Story 18.7 reinstall fallback (`(app)/_layout.tsx` + `useOnboardingExistenceFallback`) treats any `fear_ladder_items` row as "already onboarded elsewhere", but the onboarding ladder writes real rows. Add one item, force-stop, relaunch → `markOnboardingComplete()` + Home, skipping `complete` and the crisis-flag handling. The fallback now runs only when no onboarding step is saved (a reinstall wipes MMKV, so that case is unchanged); a user with a saved step is sent to `welcome`, which resumes at that step. 10 new Jest tests; they fail against the previous code.
- **Resumed ladder hid saved items (found on device once the fallback fix made this reachable).** The onboarding ladder's list only grew from the form, so resuming at step 3 after a relaunch showed an empty ladder: saved items hidden, the next item reused position 1, `complete` got a wrong count, and "Do this later" was offered. `ladder.tsx` now merges the account's saved rows in via `useFearLadderItems` (merge-only by id, tolerant of late query results). 5 new Jest tests (4 fail without the change).
- **`complete` copy (c44caad).** "You've added 1 situations" → `itemCount_one` / `itemCount_other`; dropped the duplicated "You've built your Courage Ladder." from `encouragement` (also untrue on the zero-item path). `i18n.test.ts` key pattern now allows `_one` / `_other` plural suffixes; new tests use a real i18next instance.
- **Repeated assessment write stalled the upload queue (b92a3dc, hosted migration applied 2026-10-06).** `user_onboarding_metadata` is uploaded with `ON CONFLICT (user_id) DO UPDATE` but migration 0012 had no UPDATE policy, so redoing the assessment on an account that already has a row 403'd; PowerSync retried it forever and nothing after it synced (found on device: ladder items never reached the server). Migration `0034_user_onboarding_metadata_update_policy.sql` adds an owner-only UPDATE policy (latest calibration wins); 6 RLS tests added; verified on Android against hosted (the write returns 200 and the value updates).
- **Follow-ups filed from this verification:** 19.6 (reorder sent before the inserts it depends on), 19.7 (upload queue stalls on a permanently rejected write), 19.8 (sign-in flash), 19.9 (server rows not downloaded in the dev-client session; 18.7 fallback unverified on device), 19.10 (remaining device/Maestro verification), 19.11 (local RLS suite on Postgres 17).
- **Observed, not fixed (out of scope):** on cold start a user with a valid session sees the sign-in screen for ~3 s before the session restores and the app redirects — taps in that window land on sign-in controls. Filed as Story 19.8.

### Device Verification (Android, 2026-10-06)

Build: EAS `preview` APK of `e22d7d0` (does NOT include 1367292 or c44caad). Device: Redmi K20 Pro, hosted Supabase, existing signed-in account.

| Check | Result |
|---|---|
| Copy: "Do this later", subtitle "Add situations that make you anxious, then arrange them from least to most scary.", label "Describe a situation that makes you anxious" (AC 1, 4) | Pass |
| Back: ladder → assessment → welcome, one step per press (AC 2) | Pass |
| Crisis link → back → ladder with added item intact (AC 3) | Pass |
| Ladder → `complete` (double tap on Next) → one back lands on ladder, item intact | Pass |
| Cold relaunch after adding an item and backing out of `complete` | **Landed on Home** (not onboarding) — cause: Story 18.7 fallback; fixed in 1367292, unverified |
| Cold-start sign-in flash (~3 s) before session restore | Observed — not part of this story |

Still unchecked: 1367292 / c44caad on device (needs a new EAS build), iOS swipe-back, Android swipe-back gesture, TalkBack, Hindi.

### Device Verification (Android dev client, 2026-10-06)

Build: EAS `development` client of `db36d6c` with Metro serving the working tree (so it includes the resumed-ladder change). Device: Redmi K20 Pro, hosted Supabase, app data cleared then signed in fresh.

| Check | Result |
|---|---|
| `complete` copy: "You've added 1 situation…", no repeated line (c44caad) | Pass |
| Ladder → `complete` → back → force-stop → cold relaunch resumes at the ladder, not `complete` (1367292, step rewind) | Pass |
| Same relaunch with a saved ladder item resumes onboarding instead of landing on Home (1367292, fallback gate) | Pass |
| Resumed ladder lists the saved item with Next / Add another (resumed-ladder change) | Pass — before the change it showed an empty form |

Still unchecked: iOS swipe-back, Android swipe-back gesture, TalkBack, Hindi.

### Device Verification (Android, 2026-10-05)

Build: EAS `preview` APK of `ae2fc9b` (does NOT include 251f0ee). Device: Redmi K20 Pro, hosted Supabase, fresh app data + throwaway accounts.

| Check | Result |
|---|---|
| Back: assessment → welcome; ladder → assessment | Pass |
| Empty-ladder CTA reads "Do this later" | Pass (visual; TalkBack and Hindi not checked) |
| "Do this later" → `complete` → back → ladder | Pass |
| Crisis link → back → ladder with added item intact | Pass |
| Double tap on "Do this later" → one back lands on ladder (no duplicate `complete`) | Pass (adb taps are not truly simultaneous) |
| Resume at step 3 (force-stop on ladder): ladder → assessment → welcome | Pass |
| Resume at step 4 (force-stop on `complete`) | **Fail** — resumed onto ladder; cause fixed in 251f0ee, unverified |
| Android swipe-back gesture; iOS | Not checked |

Notes: the crisis screen is a placeholder ("Crisis Resources — Epic 5") in this build — outside this story. `complete` shows "You've added 1 situations" (pluralisation, pre-existing). Fixed in c44caad.

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
