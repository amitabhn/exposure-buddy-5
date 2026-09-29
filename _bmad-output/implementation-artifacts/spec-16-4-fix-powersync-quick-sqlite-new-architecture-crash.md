---
title: 'Story 16.4: Fix PowerSync/@journeyapps/react-native-quick-sqlite New Architecture runtime crash'
type: 'bugfix'
created: '2026-09-29'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 1
baseline_commit: '52ac083843fdbfceee64d3ebe487614252816c18'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-16-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** On Expo SDK 57 (RN 0.86.3), PowerSync fails to initialize at runtime — `@journeyapps/react-native-quick-sqlite@2.5.2` compiles into the native binary but never registers to the JS bridge under the New Architecture, throwing `Could not resolve @journeyapps/react-native-quick-sqlite` from `packages/sync`'s `createPowerSyncDatabase` on every launch, breaking all local/offline database access app-wide.

**Approach:** Migrate off the retired quick-sqlite driver onto PowerSync's own maintainer-sanctioned replacement — `@powersync/react-native`'s v2.0+ SDK (latest published: 2.3.0) bundles OP-SQLite (`@op-engineering/op-sqlite`) as its built-in default driver with out-of-the-box New Architecture support, entirely removing the old driver dependency rather than patching around it or reporting upstream. **Decision:** real on-device verification (fresh launch with no crash + an offline-write-then-reconnect pass landing exactly one row in Supabase) is the actual completion gate for `ADR-RN-VERSION.md`'s integration-test requirement — the existing mocked `offline-recovery.test.ts` suite is kept running as a secondary regression check but does not by itself count as proof, since it never exercises real native SQLite.

## Boundaries & Constraints

**Always:** Pin `@powersync/react-native` to an exact version per `ADR-RN-VERSION.md` (confirm the current latest stable 2.x at implementation time — do not hand-pick `2.0.0` without checking); keep `packages/core`'s zero RN/Expo-deps boundary and the ARC-005 re-export pattern (`apps/mobile` only touches PowerSync via `@exposure-buddy/sync`) intact.

**Never:** Do not write a New Architecture interop/compat shim to keep the old quick-sqlite driver — an actively maintained v2.x replacement exists. Do not treat this as an upstream-report-only issue. **Decision:** do not build new CI infrastructure (e.g. an iOS Simulator-boot job) as part of this story — Android's existing `e2e-build-apk`/smoke suite already confirms this bug is iOS-specific (PR #83 passed clean on Android post-SDK-57, including PowerSync-writing flows), and closing the iOS CI gap for real is comparable in scope to the existing `e2e-spike.yml` Android investigation; logged in `deferred-work.md` as a separate future story instead.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cold launch, post-fix | Fresh install, SDK 57/RN 0.86.3, no prior local DB file | PowerSync initializes; no "Could not resolve" or other native-module error; ladder/session screens load normally | N/A |
| Offline write → reconnect | Airplane mode on; user adds a fear ladder item; airplane mode off | Item appears in UI immediately (local-first); after reconnect, exactly one matching row lands in Supabase's `fear_ladder_items` | No duplicate row; no thrown/unhandled error during either phase |

</frozen-after-approval>

## Code Map

- `packages/sync/src/client.ts` -- `getPowerSyncDatabase`/`createPowerSyncDatabase` construct `new PowerSyncDatabase({ schema, database: { dbFilename } })` — already uses the plain-object `database` shape v2.0+ expects (no `OPSqliteOpenFactory` wrapper to remove); verify against the actually-installed v2.x types rather than assuming no change is needed.
- `packages/sync/src/connector.ts` + `apps/mobile/app/_layout.tsx:190` (`powerSyncDb.connect(connector)`) -- the only `connect()` call site in the app; no `retryDelayMs`/logger args used here, so v2.0's breaking change moving those options onto `connect()` shouldn't require an edit — confirm, don't assume.
- `apps/mobile/package.json:23-29,40` -- remove `@journeyapps/react-native-quick-sqlite` (dependency + its now-moot `expo.doctor.reactNativeDirectoryCheck.exclude` suppression); add `@op-engineering/op-sqlite` as a new direct dependency (RN autolinking only sees direct deps) at the version the installed `@powersync/react-native` peer range requires.
- `packages/sync/package.json:16` -- bump `@powersync/react-native` from the current exact pin `1.34.0` to the latest stable 2.x (confirm exact version at implementation time).
- `packages/sync/__tests__/integration/offline-recovery.test.ts` -- the project's only PowerSync "integration" test; fully mocked, never exercises real native SQLite — informs the on-device-verification decision recorded in Approach above.
- `_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md` -- version-pin table + Upgrade Policy §3; update the PowerSync SDK pin once the new version is confirmed installed.
- `_bmad-output/implementation-artifacts/16-1-upgrade-expo-sdk-from-54-to-55.md` (Completion Notes) -- records the prior call that quick-sqlite's New Architecture/bridgeless support was sufficient via RN's interop layer; this story's root cause directly contradicts that call. Reference for context, don't re-litigate.

## Tasks & Acceptance

**Execution:**
- [x] `apps/mobile/package.json` -- remove `@journeyapps/react-native-quick-sqlite` and its doctor-check exclude; add `@op-engineering/op-sqlite` at the required version -- old driver is retired upstream; new driver needs a direct dependency for autolinking
- [x] `packages/sync/package.json` -- bump `@powersync/react-native` to the latest stable 2.x, exact pin -- `ADR-RN-VERSION.md` requires an exact PowerSync SDK pin
- [x] `packages/sync/src/client.ts`, `apps/mobile/app/_layout.tsx:190` -- verify construction/`connect()` call sites against installed v2.x types; adjust only if the signature actually changed -- confirm compatibility, don't assume
- [x] `pnpm install && pnpm turbo typecheck lint test` -- confirm 0 regressions across every package -- standard gate, but insufficient alone for this bug class (see Approach's verification-gate decision)
- [x] Cold-launch on-device verification (I/O matrix row 1) -- the actual regression this story exists to close -- **VERIFIED**, real iOS Simulator run, no crash
- [ ] Offline-write-then-reconnect on-device verification (I/O matrix row 2, this story's stated completion gate per the ADR) -- **NOT VERIFIED** — blocked by a pre-existing project-wide gap (no PowerSync sync endpoint deployed anywhere yet, see deferred-work.md); left unchecked deliberately, not silently skipped
- [x] `_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md` -- update the PowerSync SDK version-pin table entry -- keep the ADR the source of truth, matching Stories 16.1–16.3's convention

**Acceptance Criteria:**
- **VERIFIED (iOS)** — Given a fresh install on Expo SDK 57 (RN 0.86.3), when the app launches, then PowerSync initializes with no native-module-registration error and local/offline database access works normally. **Android unverified — see Review Triage Log.**
- **NOT VERIFIED** — Given no network connectivity, when a durable write is made, then it succeeds locally without loss; when connectivity returns, then exactly one corresponding row appears in Supabase (the ADR's named scenario). Blocked by a pre-existing project-wide gap (no PowerSync sync endpoint ever deployed) — see deferred-work.md.
- **VERIFIED** — Given `pnpm turbo typecheck lint test` runs after the dependency swap, then it passes with zero regressions

## Implementation Notes

**Dependency swap (2026-09-29):** Confirmed latest stable `@powersync/react-native` 2.x at implementation time was `2.3.0` (matches the Approach's stated expectation). Bumped `packages/sync/package.json`'s exact pin from `1.34.0` to `2.3.0`. Removed `@journeyapps/react-native-quick-sqlite` and its now-moot `expo.doctor.reactNativeDirectoryCheck.exclude` block from `apps/mobile/package.json`; added `@op-engineering/op-sqlite@18.2.5` (latest published, within `@powersync/react-native@2.3.0`'s peer range `>=17.1.0 <19.0.0`) as a new direct dependency so RN autolinking picks it up.

**Code compatibility (verified, not assumed):** Read the installed v2.3.0 `.d.ts` sources directly rather than trusting docs. `packages/sync/src/client.ts`'s `new PowerSyncDatabase({ schema, database: { dbFilename } })` matches the SDK's own documented v2.x example verbatim — no edit needed. `CommonPowerSyncDatabase.connect(connector, options?)` still takes the connector as its first (only required) arg, matching `apps/mobile/app/_layout.tsx:190`'s `powerSyncDb.connect(connector)` call — no edit needed. `PowerSyncBackendConnector`'s `fetchCredentials`/`uploadData`/`PowerSyncCredentials` shapes are unchanged (`AbstractPowerSyncDatabase` is now a documented alias of `CommonPowerSyncDatabase`, still exported); `packages/sync/src/connector.ts` needed no changes either. Net result: this story is a pure dependency swap, zero application code changed.

**Unexpected resolution issue:** After the two `package.json` edits, `pnpm install` alone left `@powersync/common` resolved to a stale `1.57.3` in `pnpm-lock.yaml` even though every consumer (`@powersync/react-native@2.3.0`'s own exact `"2.3.0"` dependency, `@powersync/react@2.0.1`'s `^2.2.0` peer, `@powersync/shared-internals@1.3.0`'s `^2.3.0` peer) required 2.x — confirmed via `pnpm why -r`, a full `node_modules` wipe + reinstall, and `pnpm dedupe`, none of which fixed it. Root cause not fully diagnosed (looks like a pnpm 11.1.3 resolver quirk around a package that is simultaneously a real dependency and a peer dependency of its own parent), but resolved pragmatically by adding an explicit `"@powersync/common": 2.3.0` entry to `pnpm-workspace.yaml`'s `overrides`. After that, `pnpm peers check` reports no issues and `pnpm why -r @powersync/common` shows a single deduped `2.3.0` everywhere. This override is outside the spec's original Code Map — flagging it here for visibility since it touches a shared workspace file, not just the two packages named in the plan.

**Automated verification:** `pnpm install && pnpm turbo typecheck lint test` — all 10/10 typecheck tasks, 8/8 lint tasks pass; mobile Jest 452/452 tests green (matches the Story 16.3 baseline exactly); `packages/sync` Vitest 26/26 (3 suites, including the mocked `offline-recovery.test.ts`) green. `npx expo-doctor` inside `apps/mobile`: 18/21, the same 3 pre-existing benign findings as Story 16.2's completion notes (`@expo/config-plugins` direct-install exception, pnpm peer-hash duplicate-version noise, in-range reanimated/worklets patch mismatches) — no new finding from the PowerSync/op-sqlite swap.

**On-device verification — cold launch (VERIFIED, real device):** `npx expo prebuild --platform ios --clean` succeeded cleanly; `pod install` linked the `op-sqlite` CocoaPod (`ios/Podfile.lock` confirmed) with zero `journeyapps`/`quick-sqlite` references anywhere in the native graph. `npx expo run:ios` built the real Xcode project (0 errors, 1 pre-existing unrelated warning about a build-phase script's dependency analysis), installed, and launched on the iPhone 17 Pro Simulator. **No `Could not resolve @journeyapps/react-native-quick-sqlite` or any other native-module-registration crash occurred** — this is the exact regression this story exists to fix, and it did not reproduce post-fix. (Note: this session's iOS Simulator GUI was previously reported unusable per project memory notes — `project_ios_simulator_gui_unavailable.md` — but `expo run:ios` worked cleanly this time; that memory note may now be stale and worth revisiting separately.)

One pre-existing, unrelated runtime warning was observed in the device log: `WARN [PowerSync]: Schema validation failed... [Error: An id column is automatically added, custom id columns are not supported]`, triggered by `packages/sync/src/schema.ts`'s explicit `id: column.text` declarations on the `fear_ladder_items`/`user_onboarding_metadata` tables. Verified via direct inspection of the downloaded `@powersync/common` package source that this exact `throw` (caught internally by PowerSync and downgraded to a non-fatal warning) already existed identically in `@powersync/common@1.52.0` — the exact version transitively pinned by the previous `@powersync/react-native@1.34.0` — so this is **not a regression introduced by this story**, just a pre-existing schema quirk that was never observed before because no prior story had a working on-device Simulator session. Out of scope to fix here (not in this story's Code Map); worth its own follow-up if it's ever more than cosmetic.

**On-device verification — offline write → reconnect → exactly one Supabase row (NOT COMPLETED — pre-existing project-wide gap, corrected during review):** Could not exercise this scenario. The implementing subagent's first diagnosis ("no Docker Desktop") was incomplete — re-checked directly during review: `colima` (a Docker daemon alternative) is installed, and `colima start` does unblock `supabase start` cleanly (confirmed live, then stopped again to restore the prior environment state). But local Supabase alone doesn't complete the picture: `connector.ts`'s `fetchCredentials()` short-circuits to `null` whenever `EXPO_PUBLIC_POWERSYNC_URL` is unset ("not configured in this env — local/CI use"), and **no PowerSync sync endpoint is configured anywhere in this repo, for any environment** — no `.env*` beyond `.env.example`, no self-hosted PowerSync docker-compose config. This traces back to Story 9.1's own Completion Notes, which already flagged `supabase/sync-rules.yaml` as never having a documented deploy process and requiring escalation: this project has never had a real, reachable PowerSync sync service (hosted or self-hosted) in any session. This is a pre-existing gap orthogonal to this story's fix, not something a working local Docker setup alone would have closed — see `deferred-work.md` for the corrected finding and trigger. The dependency swap itself is verified compatible (typecheck/lint/test all green, real native build+launch succeeded, the actual crash this story exists to fix did not reproduce) — only this one scenario's completion gate is unmet, and it's blocked on the separate Story 9.1 gap.

## Spec Change Log

## Review Triage Log

_Review pass 1 (2026-09-29): Blind Hunter + Edge Case Hunter + Verification Gap against the implementation diff._

- **[HIGH — patch in progress]** The Boundaries section's "Never build iOS CI infra" decision cited Android's `e2e-build-apk` CI (PR #83) as proof Android is unaffected by this bug class — but PR #83 tested the *old* `@journeyapps/react-native-quick-sqlite` driver; this story's replacement, `@op-engineering/op-sqlite`, had never been built/linked/run on Android anywhere. This environment has no Android emulator/SDK to verify locally. **Resolution (human-decided):** open a real PR for this branch with the `run-e2e` label so GitHub's Android-emulator CI (`e2e-build-apk` + smoke shards, which exercise a real PowerSync write via `ladder-build.yaml`) verifies the new driver for real. Outcome recorded once CI completes.
- **[medium — patched]** Tasks & AC section marked the on-device verification task `[x]` despite its own parenthetical admitting the offline-write-reconnect scenario was not completed, and the AC list gave no per-criterion status — misleading at a glance. Fixed: split into two tasks (one checked/verified, one explicitly unchecked/not-verified) and annotated each AC with VERIFIED/NOT VERIFIED.
- **[medium — patched]** `sprint-status.yaml`'s 16-4 note stated the offline-reconnect blocker as "no Docker Desktop installed" — contradicting this same review's own corrected finding (`colima start` unblocks it fine; the real blocker is no PowerSync sync endpoint ever being deployed for this project). Fixed: rewrote the note to match the corrected root cause and flag the Android open question.
- **[low — patched]** The `colima start` unblocks-`supabase start` discovery wasn't recorded in `docs/setup/local-environment.md`'s troubleshooting section, where a future developer hitting this would look first. Fixed: added a new troubleshooting entry there.
- **[low — patched]** `pnpm-workspace.yaml`'s new `@powersync/common` override had no inline marker pointing at its `deferred-work.md` explanation. Fixed: added a comment.
- **[maybe-false — deferred]** No scenario covers an existing user's quick-sqlite-created local DB being opened by op-sqlite post-upgrade. Likely fine (standard SQLite3 file format; PowerSync's own schema is JS-managed, not driver-managed; the official v2.0 migration guide documents no data-migration step) but unverified, and would be medium-if-true. No real installed base exists yet to be at risk. Logged in `deferred-work.md` with a pre-distribution trigger.
- **false** — `baseline_commit` claimed malformed (39 hex chars). Verified: it's a valid 40-character SHA-1 (`wc -c` = 40, `git cat-file -t` = `commit`), matching the actual recorded HEAD at planning time.
- **false** — `pnpm-lock.yaml` claimed to lose `@react-native/dev-middleware`'s `bufferutil`/`utf-8-validate` transitivePeerDependencies as a side effect. Verified: `git diff <baseline> -- pnpm-lock.yaml | grep dev-middleware` returns nothing — no such change exists anywhere in the actual diff.
- **low — rejected** — The ad-hoc colima/Docker re-diagnosis correction (made just before this formal review pass) didn't go through `review_loop_iteration`/this Review Triage Log mechanism. True as a process observation, but no information was actually lost or hidden — it's fully documented in `deferred-work.md` and Implementation Notes already, and this review pass is now populating the formal log as intended going forward.
- **low — rejected** — No lint/CI guard prevents `@journeyapps/react-native-quick-sqlite` from being silently reintroduced later. Real recurrence-risk class (same shape as Story 16.3's deferred `deploymentTarget` finding), but unlikely to be hit in everyday use and the smallest real fix (a new ESLint rule or CI check) exceeds a direct correction — rejected per the same low-severity threshold rule, not deferred.

## Verification

**Commands:**
- `pnpm install && pnpm turbo typecheck lint test` -- expected: all packages/apps pass, 0 regressions vs. the 452/452 mobile-test baseline as of Story 16.3
- `npx expo prebuild --platform ios --clean && npx expo run:ios` (or equivalent on-device build) -- expected: 0 build errors, app launches without the PowerSync crash; delete local `ios/` output afterward per this project's CNG convention

**Manual checks (if no CLI):**
- With network disabled, add one fear ladder item; confirm it appears immediately in the UI. Re-enable network; confirm the same row appears in Supabase's `fear_ladder_items` shortly after reconnect, with no duplicate.
