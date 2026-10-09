---
title: 'Maestro Core and Session Shards Pass Again'
type: 'bugfix'
created: '2026-10-09'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-19-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `E2E Smoke (core)` and `E2E Smoke (session)` have failed on every `main` push run since the Story 18.7 merge (`6aecb65`, 2026-10-02); the last green `main` was `458d7c3` (2026-09-30). Found in PR #100's CI (run 37460921690) and again on PR #103; not caused by either PR. `E2E Smoke (onboarding)` passes. The signature is identical each time: the first flow in a shard passes (`ladder-build`, `debrief`) and the second fails with `Element not found: Text matching regex: Add your first situation` (`exposure-loop`, `backgrounded-recovery`; on one run `debrief` was the failing second flow). The second flow is the one that starts with the shared test user (`test1@test.com`) already holding server-side onboarding metadata and ladder items from the first flow. Because the e2e jobs are label-gated on pull requests, the regression reached `main` unnoticed.

**Approach:** Diagnose first, from evidence (CI artifacts, logcat, screenshots, a reproduction of two flows in sequence), and record the cause in this spec. Then fix the flows, or the app if the app is wrong, so the second flow in each shard passes. Working hypotheses, none assumed: (a) Story 18.7's reinstall fallback holds the onboarding redirect up to 10 s while it checks the local replica, and CI has no PowerSync endpoint, so the welcome screen appears later than `ensureOnboarded.yaml`'s `waitForAnimationToEnd` waits and the `when: visible: "Your journey starts here"` check is false; (b) the test user's existing server-side data changes the post-sign-in route; (c) something else. Candidate fixes: wait explicitly for the welcome or Home screen instead of the animation wait; give each flow its own test user. Finish by recording whether e2e gating should change.

## Boundaries & Constraints

**Always:** The cause is written into this spec's Implementation Notes before any fix is described as done. Each flow stays independently correct and idempotent regardless of execution order (the contract stated in `ensureOnboarded.yaml`). If the app is the thing that is wrong, fix the app with a unit test, not a flow workaround. All three shards (`core`, `session`, `onboarding`) are green on a run on this branch, with the `run-e2e` label applied.

**Never:** No weakening of assertions to make flows pass (no removing steps, no `optional: true` on the assertion that fails). No change to the 18.7 fallback's user-visible behaviour (reinstall + existing account still lands on Home, not onboarding) unless the human renegotiates. No server, schema or PowerSync change. No push or CI run without asking first (paid runs of about 70 min). Do not make the e2e jobs required or unlabeled in `ci.yml` in this story; record the recommendation only.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First flow in a shard | cleared state, test user fresh | signs in, completes onboarding, flow passes | N/A |
| Second flow in a shard | cleared app state, test user already onboarded server-side | signs in, reaches Home with "Add your first situation" or the populated ladder as the flow expects, flow passes | A flow that needs an empty ladder creates its own state or user |
| Slow welcome/Home | 18.7 hold still pending after sign-in | flow waits explicitly for welcome or Home, then proceeds | wait has a bounded timeout that fails with a readable message |
| Flows run in either order | shard flow order swapped | both still pass | N/A |
| `onboarding` shard | real OTP path | unchanged, still passes | N/A |

</frozen-after-approval>

## Code Map

- `apps/mobile/.maestro/setup/ensureOnboarded.yaml` -- sign-in then conditional onboarding on `when: visible: "Your journey starts here"` right after `waitForAnimationToEnd`; the likely race
- `apps/mobile/.maestro/setup/_onboarding-clickthrough.yaml`, `setup/reachDebrief.yaml`, `setup/addLadderItem.yaml`, `setup/seedAuthUser.js` -- shared setup; `seedAuthUser.js` always uses `test1@test.com`
- `apps/mobile/.maestro/ladder-build.yaml`, `exposure-loop.yaml`, `debrief.yaml`, `backgrounded-recovery.yaml` -- the four shard flows
- `.github/workflows/ci.yml` -- `e2e-smoke` matrix (core: ladder-build + exposure-loop; session: debrief + backgrounded-recovery; onboarding), `e2e-build-apk`, the `run-e2e` label gate
- `apps/mobile/app/(app)/_layout.tsx` and `useOnboardingExistenceFallback` -- the 18.7 hold; touch only if the diagnosis says the app is wrong
- Do not modify: the `onboarding.yaml` real-OTP flow's assertions

## Tasks & Acceptance

**Execution:**
- [ ] Pull artifacts from a red `main` run (screenshots, logcat, `report.xml`) and reproduce the two-flow sequence; record the screen the second flow is actually on when it fails
- [ ] Record the diagnosed cause in Implementation Notes, ruling hypotheses (a) and (b) in or out with evidence
- [ ] Fix the flows or the app accordingly (explicit waits and/or per-flow users); app fixes carry a unit test
- [ ] Record the e2e gating recommendation (scheduled or required run versus label-gated) in Implementation Notes and `deferred-work.md` if it is left for a later story
- [ ] Run all three shards with the `run-e2e` label (after asking before pushing) and record the run id

**Acceptance Criteria:**
- Given the failing second flow in `core` and `session`, then the cause is written down with evidence, not inferred
- Given the fix, when each shard runs its two flows in sequence, then both pass in `core` and in `session`, and `onboarding` still passes
- Given the flows in swapped order, then they still pass (independence preserved)
- Given the 18.7 reinstall scenario, then an existing account on a fresh install still lands on Home
- Given the story is done, then `main` CI is green on all three shards and the gating recommendation is recorded
- Given `pnpm turbo typecheck lint test`, then all pass

## Implementation Notes

(To be filled in during implementation: diagnosed cause, evidence, run ids.)

## Spec Change Log

- 2026-10-09 — Spec drafted from the `epics.md` Story 19.12 entry and the code as it stands on `main`; not yet approved by the human.

## Design Notes

The 18.7 fallback holds the onboarding redirect for up to 10 s, and CI has no PowerSync endpoint, so on CI the hold always runs to its limit when the local replica is empty. A fixed animation wait cannot cover that; an explicit wait for the welcome or Home screen (with a timeout above 10 s) can. Per-flow users remove the shared-server-state coupling entirely but cost more seeding; pick based on what the diagnosis shows.

## Verification

**Commands:**
- `pnpm turbo typecheck lint test` -- expected: all green
- Push with the `run-e2e` label (ask first) -- expected: `E2E Smoke (core)`, `(session)` and `(onboarding)` all green
