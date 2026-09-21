# Investigation: `E2E Smoke (onboarding)` "launchApp never fires" flake

## Hand-off Brief

1. **What happened.** Commit `831f637` (PR #68, 2026-09-19) deleted the flow's only `- launchApp` step while removing an unrelated stale tap in the same diff hunk; fixing it surfaced a second, independent staleness bug (a stale `index: 1` selector on the "Send code" tap, orphaned by Story 12.1's redesign) one layer further into the flow.
2. **Where the case stands.** Both root causes Confirmed with direct evidence, both fixed on PR #69, and both **verified passing on real CI** (run `35595854350`: `E2E Smoke (onboarding)` green in 10m38s, all 16 checks pass). Case closed.
3. **What's needed next.** Nothing — resolved. PR #69 is ready to merge (pending human review/merge decision).

## Case Info

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Ticket           | N/A — user request, following up on `deferred-work.md`'s open item        |
| Date opened      | 2026-09-21                                                                 |
| Status           | Concluded                                                                  |
| System           | GitHub Actions `ubuntu-latest`, Android API-31 emulator (Nexus 6 profile), Maestro CLI (unpinned, installed fresh per run via `curl -Ls https://get.maestro.mobile.dev \| bash`) |
| Evidence sources | `.github/workflows/ci.yml`; `apps/mobile/.maestro/onboarding.yaml` + git history; `apps/mobile/.maestro/setup/ensureOnboarded.yaml`; CI run artifacts (`report.xml`, `logcat.txt`) for runs `35342301063`, `35432087134`, `35434733958`, `35437623314`, `35457705888`/`35457723793`; `_bmad-output/implementation-artifacts/deferred-work.md`                            |

## Problem Statement

User-reported (relayed from a prior session's `deferred-work.md` entry): the `onboarding` E2E shard's Maestro flow occasionally never launches the app at all — `adb install -r` succeeds, but no `ActivityTaskManager START` event or `ReactNativeJS` output ever appears in logcat, and the flow times out (~25s) polling for `"use a code instead"`. Framed as a "possible flake, not yet confirmed reproducible," distinct from the 4 already-fixed stale-copy bugs, with resource pressure, native crashes, and ANRs already ruled out. `core` and `session` shards' own `launchApp` calls (via `ensureOnboarded.yaml`) have never shown this.

## Evidence Inventory

| Source                                                                 | Status    | Notes                                                                                          |
| ----------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------ |
| `apps/mobile/.maestro/onboarding.yaml` (current)                        | Available | No `launchApp` command anywhere in the file                                                     |
| `apps/mobile/.maestro/setup/ensureOnboarded.yaml`                       | Available | Has explicit `launchApp: { stopApp: true, clearState: true }` — used by every `core`/`session` flow |
| Git history of `onboarding.yaml`                                        | Available | Full diff history via `git log -p`                                                              |
| CI run artifacts (`logcat.txt`, `report.xml`) — 2 runs downloaded       | Available | `35342301063` (pre-regression) and `35457705888` (post-regression)                              |
| CI run list for the PR branch (5 runs)                                  | Available | `gh run list` + per-run job conclusions via `gh run view --json jobs`                            |
| `deferred-work.md`'s prior analysis                                     | Available | Secondhand — based on a single run (`35437623314`), did not examine the diff                    |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Compare `onboarding.yaml` vs. flows that never show the symptom | High | Done | Found `ensureOnboarded.yaml` has explicit `launchApp`; `onboarding.yaml` does not |
| 2 | Git-blame the missing `launchApp` | High | Done | Traced to commit `831f637` |
| 3 | Check whether every post-`831f637` CI run failed identically (deterministic vs. flaky) | High | Done | 4/4 failures since the commit |
| 4 | Confirm via raw logcat (not secondhand via `deferred-work.md`) | High | Done | Downloaded and diffed logcat for a pre- and post-regression run |
| 5 | Confirm Maestro does not implicitly auto-launch without `launchApp` | Medium | Done | Consistent with the observed 100% failure rate post-deletion |

## Timeline of Events

| Time                  | Event                                                                                       | Source                                        | Confidence |
| ---------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------- |
| commit `5ab58b2` (Story 9.5) | `onboarding.yaml` created with an explicit `- launchApp` step                          | `git show 5ab58b2:apps/mobile/.maestro/onboarding.yaml` | Confirmed |
| 2026-09-18 12:58 UTC   | Run `35342301063` (sha `217f4ac`, `launchApp` still present): app launches successfully (`ReactNativeJS "Running main"` at 12:58:15.641); flow fails later on the unrelated stale `"Create account"` tap | `logcat.txt`, `report.xml` for `35342301063` | Confirmed |
| 2026-09-19 08:26 UTC (approx.) | Commit `831f637` — while removing the now-stale `tapOn: "Create account"`, also deletes the adjacent `- launchApp` line in the same hunk | `git show 831f637 -- apps/mobile/.maestro/onboarding.yaml` | Confirmed |
| 2026-09-19 08:28 UTC   | Run `35432087134` (sha `831f637`, first run without `launchApp`): `E2E Smoke (onboarding)` fails; `core`/`session` pass | `gh run view --json jobs` | Confirmed |
| 2026-09-19 09:27 UTC   | Run `35434733958` (sha `3584cf7`): onboarding fails again | `gh run view --json jobs` | Confirmed |
| 2026-09-19 10:31 UTC   | Run `35437623314` (sha `6734bca`): onboarding fails again — this is the run `deferred-work.md`'s "Remaining" note is based on | `gh run view --json jobs`, `deferred-work.md:14-22` | Confirmed |
| 2026-09-19 17:19 UTC   | PR #68 merges; both the branch-head run `35457705888` and `main`'s run `35457723793` fail identically | `gh run list` | Confirmed |
| 2026-09-19 18:03 UTC   | Run `35457705888` logcat: zero `ActivityTaskManager: START` and zero `ReactNativeJS` lines for the entire run | `logcat.txt` for `35457705888` | Confirmed |

## Confirmed Findings

### Finding 1: `onboarding.yaml` has no `launchApp` command as of `HEAD`

**Evidence:** `apps/mobile/.maestro/onboarding.yaml:1-14` (current file) — the header comment reads "Launch app — defaults to signup mode on fresh install..." but is followed directly by `# Story 10.1 defaulted the auth method to Password...`, with no `launchApp` command between them.

**Detail:** Every other flow file in the repo either has an explicit `launchApp` (e.g. `setup/ensureOnboarded.yaml:22-24`, `backgrounded-recovery.yaml:93`) or reaches one via `runFlow` (`ladder-build.yaml`, `exposure-loop.yaml` → `reachDebrief.yaml`, `debrief.yaml` → `reachDebrief.yaml`, `backgrounded-recovery.yaml` — all route through `ensureOnboarded.yaml`). `onboarding.yaml` is the only flow file in the entire `.maestro/` directory, and the only flow used by the `onboarding` CI shard, with none at all.

### Finding 2: `launchApp` was present originally and removed in commit `831f637`

**Evidence:** `git show 5ab58b2:apps/mobile/.maestro/onboarding.yaml` shows `- launchApp` present at flow creation (Story 9.5). `git show 831f637418f51b7ba3d0686dfa0351d7eab4eca5 -- apps/mobile/.maestro/onboarding.yaml` shows the diff:
```
-# Launch app — defaults to signup mode on fresh install
-- launchApp
-
-# Ensure we're on the signup tab
-- tapOn:
-    text: "Create account"
+# Launch app — defaults to signup mode on fresh install (hasAuthedBefore is false, so
+...
+# there is nothing to tap here — this step was a stale leftover and has been removed).
```

**Detail:** The commit's stated intent (per its message) was to remove the now-stale `tapOn: "Create account"` tap, since the app already defaults fresh installs to signup mode. That reasoning is correct and the tap removal is a legitimate fix. But the same hunk also deleted the `- launchApp` line immediately above it, and the commit message never mentions removing `launchApp` — this reads as an unintentional deletion, not a deliberate one. `831f637` was written by a prior session responding to CI run `35342301063`'s failure (`Element not found: Text matching regex: Create account`), which itself confirms the app *was* launching successfully at that point (see Finding 3) — there was no reason to touch `launchApp` at all.

### Finding 3: Every CI run since `831f637` has failed `E2E Smoke (onboarding)` — 4 for 4, not intermittent

**Evidence:** `gh run view <id> --json jobs` for all 5 runs on `fix/e2e-maestro-stale-home-cta-text`:

| Run | sha | `launchApp` present? | `E2E Smoke (onboarding)` |
|---|---|---|---|
| `35342301063` | `217f4ac` | yes | fail (unrelated: stale `"Create account"` tap) |
| `35432087134` | `831f637` | **no** | **fail** |
| `35434733958` | `3584cf7` | no | **fail** |
| `35437623314` | `6734bca` | no | **fail** |
| `35457705888` (branch) / `35457723793` (main, post-merge) | `0083916` | no | **fail** |

**Detail:** `core` and `session` shards passed on every run from `35432087134` onward. Only `onboarding` — the one flow lacking `launchApp` — has failed, on literally every run since the line was deleted. This directly contradicts the "possible flake, not yet confirmed reproducible" framing: it is 100% reproducible, not a flake.

### Finding 4: Raw logcat confirms the app never starts post-regression, and did start pre-regression

**Evidence:**
- `35342301063` (pre-regression, `launchApp` present) logcat: `09-18 12:58:15.641 I/ReactNativeJS( 2403): Running "main"` — app launched normally 100ms after being installed; the flow's subsequent failure was purely the stale-tap issue, already fixed in the same commit that (accidentally) broke launch.
- `35457705888` (post-regression) logcat: `grep -c "ActivityTaskManager: START"` → `0`; `grep -c "ReactNativeJS"` → `0`, across the entire 792KB log for the run. `report.xml`: `No visible element found: "use a code instead"` after 25.9s — Maestro polled for UI that was never rendered because the process was never started.

**Detail:** This is the direct, primary-source confirmation (not secondhand via `deferred-work.md`) that the app process genuinely never starts once `launchApp` is absent — `adb install -r` alone does not launch the installed app, and nothing else in the CI script (`ci.yml:430-445`) or the flow launches it either.

## Deduced Conclusions

### Deduction 1: The "occasional flake" characterization in `deferred-work.md` was based on incomplete evidence

**Based on:** Finding 3, Finding 4.

**Reasoning:** The prior session's note (`deferred-work.md:14-22`) was written after observing exactly one failing run (`35437623314`) and explicitly says "Could not be distinguished from a genuine bug without another CI run to check reproducibility — deliberately not spent here given cost." Three more runs have since occurred (including the post-merge run on `main`) and all three also failed identically. The prior session also did not diff `onboarding.yaml` against its own history, so it never saw that `launchApp` had been deleted three commits earlier in the same PR it was investigating.

**Conclusion:** This is not a flake. It is a 100%-reproducible regression, self-inflicted by the PR that was fixing the *other* onboarding staleness bugs.

## Hypothesized Paths

### Hypothesis 1 (the user's framing): "Maestro's `launchApp` command itself, or an emulator hiccup, sometimes fails to start the app"

**Status:** Refuted

**Theory:** As stated in the investigation request — a nondeterministic infra/tooling issue in `android-actions/setup-android@v3` / `reactivecircus/android-emulator-runner@v2` specifically affecting `onboarding.yaml`'s "top-level, DEV-bypass-free `launchApp` call."

**Supporting indicators:** The symptom (install succeeds, no activity start, no crash) is consistent with a launch mechanism failing silently.

**Would confirm:** An intermittent pass/fail split across runs with `launchApp` genuinely present and identical otherwise.

**Would refute:** `onboarding.yaml` not actually containing a `launchApp` call at all as of `HEAD` — confirmed directly by reading the file (Finding 1) — combined with a 100% failure rate exactly coincident with its removal (Finding 3).

**Resolution:** There is no `launchApp` call left in the flow to be flaky. The premise (that a `launchApp` call exists and sometimes misbehaves) is false as of commit `831f637`.

## Missing Evidence

None blocking. (Optional, not needed for the conclusion: confirming whether Maestro ever had implicit auto-launch behavior in some version — moot, since the observed 100%/0% pre/post split already fully explains the symptom regardless of Maestro's exact internal semantics.)

## Source Code Trace

| Element       | Detail                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------- |
| Error origin  | `apps/mobile/.maestro/onboarding.yaml` — missing `- launchApp` step (present in original `5ab58b2`, deleted in `831f637`) |
| Trigger       | `E2E Smoke (onboarding)` CI job runs `maestro test apps/mobile/.maestro/onboarding.yaml` (`.github/workflows/ci.yml:438-439`) against a freshly `adb install -r`'d, never-launched APK |
| Condition     | Any invocation of this flow, unconditionally — not state-dependent |
| Related files | `apps/mobile/.maestro/setup/ensureOnboarded.yaml:22-24` (the correct pattern, for contrast); `.github/workflows/ci.yml:411-445` (emulator boot + install + maestro invocation) |

## Conclusion

**Confidence:** High

Root cause is Confirmed via three independent lines of evidence: (1) the exact diff showing `- launchApp` deleted alongside an unrelated, legitimately-stale tap in commit `831f637`; (2) a clean 4/4 deterministic correlation between "commit lacks `launchApp`" and "CI job fails," with `core`/`session` unaffected throughout; (3) direct logcat evidence showing the app process genuinely never starts post-regression (zero `ReactNativeJS`/`ActivityTaskManager: START` lines) versus a normal launch pre-regression. The original "possible flake" framing in `deferred-work.md` is superseded — this is a deterministic regression, not an infra flake, and it has never had a chance to pass since `831f637` landed.

## Recommended Next Steps

### Fix direction

Re-add a `- launchApp` step to `apps/mobile/.maestro/onboarding.yaml` in place of the deleted line (a bare `- launchApp`, matching the original — `ensureOnboarded.yaml`'s `stopApp: true, clearState: true` isn't needed here since this shard's emulator/app state is already fresh per-run). Keep the rest of `831f637`'s change (the stale `"Create account"` tap removal remains correct).

### Diagnostic

None needed — proceed directly to the fix. Verification is the CI run itself (see Reproduction Plan).

## Reproduction Plan

1. Add back `- launchApp` to `apps/mobile/.maestro/onboarding.yaml`.
2. Push and let `E2E Smoke (onboarding)` run on CI (or `act`/local Maestro run against a booted emulator, if available).
3. Expect: logcat shows `ReactNativeJS "Running main"` shortly after install, and the flow proceeds past the `"use a code instead"` step instead of timing out at 25s.

## Side Findings

- **Maestro CLI is not version-pinned in CI** (`.github/workflows/ci.yml:377`: `curl -Ls "https://get.maestro.mobile.dev" | bash` installs whatever is latest at run time). Unrelated to this root cause, but it means Maestro's own behavior could silently change between runs — worth pinning for reproducibility, as a separate hardening item.
- `deferred-work.md`'s "Remaining" entry (lines 14-22) should be updated/superseded once this fix lands — it currently misdescribes this as an unconfirmed flake.

## Follow-up: 2026-09-21

### New Evidence

PR #69 (branch `fix/onboarding-e2e-launchapp-regression`, commit `00652e0`) pushed the `launchApp` fix to real CI (run `35587263831`). Result: `E2E Smoke (core)` and `E2E Smoke (session)` passed; `E2E Smoke (onboarding)` still failed, but on a **different, later** symptom — `report.xml`: `Element not found: Text matching regex: Send code, Index: 1`, after a 98-second run (vs. the old 25-second dead-launch timeout). Logcat confirms the app genuinely launched this time (`ReactNativeJS "Running main"` at `11:09:50.833`), and a failure screenshot (`step-018-tapOnElement-Send_code.png`) shows the flow correctly reached the OTP-mode sign-up screen with email filled and both consent checkboxes checked — the failure is purely the "Send code" tap itself.

### Additional Findings

**Finding 5: The `index: 1` disambiguator on the "Send code" tap is itself stale — the duplicate subtitle it was written for no longer exists.**

**Evidence:** `git show f28b02d5a951403f278946d84b2eb10470c3284d` (2026-07-09) shows `index: 1` was added specifically because the sign-in screen's subtitle rendered the same `t('auth.otp.sendCode')` string as the button, ahead of it in the hierarchy. `apps/mobile/app/(auth)/sign-in.tsx:554-576` (current) shows only two usages of that key on the whole screen — the button's own `accessibilityLabel` and its inner `<Text>` — no separate subtitle element. The CI run's own screen-hierarchy dump (`step-018-tapOnElement-Send_code.json`, from the `maestro-debug-logs-onboarding` artifact) confirms these render as 2 distinct accessibility-tree nodes at failure time — a clickable `Button` (`accessibilityText: "Send code"`) wrapping a non-clickable `TextView` (`text: "Send code"`), fully nested inside it — yet Maestro's own match count there was only 1 (it reported `index: 1`, the second match, not found), consistent with Maestro resolving to the nearest clickable ancestor rather than double-counting a non-interactive child. The failure screenshot itself shows only one "Send code" button on screen, no subtitle.

**Detail:** Story 12.1 (Sign-in/Sign-up screen UI/UX redesign, merged 2026-07-30) is the intervening change — it restyled this screen and evidently dropped the old duplicate subtitle along the way. `831f637`'s wave of staleness fixes (2026-09-19) never caught this because the flow was still dying at the `launchApp` step before ever reaching this tap; it only surfaced once that blocker was cleared.

### Updated Hypotheses

None — this is a new, independently-confirmed finding, not a revision of the original `launchApp` hypothesis (which remains Confirmed; `core`/`session` staying green and the app now genuinely launching in run `35587263831` corroborate it directly).

### Backlog Changes

Added, actioned, and closed: removed the stale `index: 1` from all 3 "Send code" `tapOn` calls in `onboarding.yaml` (PR #69, commit `6fef2d9`) — verified passing on CI run `35595854350`.

### Updated Conclusion

Both bugs blocking the `onboarding` shard are Confirmed root-caused and fixed in PR #69, and both are now verified passing on real CI: run `35587263831` confirmed the `launchApp` fix (app launches, flow reaches the "Send code" step); run `35595854350` confirmed the `index: 1` fix (`E2E Smoke (onboarding)` green end-to-end in 10m38s, all 16 PR checks passing). A "waves of staleness" pattern, consistent with how the original 4 bugs in `831f637`'s own PR were discovered — each fix let the flow reach further and surface the next latent bug. No further verification needed; case closed.
