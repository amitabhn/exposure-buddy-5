---
title: 'Story 16.3: Fix iOS deployment target for Expo SDK 57'
type: 'bugfix'
created: '2026-09-28'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
baseline_commit: '9c678e1'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-16-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Expo SDK 57's core `Expo` CocoaPod requires iOS 16.4+ and Swift 6.0 (confirmed directly in the installed `Expo.podspec`'s `s.platforms`/`s.swift_version`), but `apps/mobile/app.config.ts` never sets `ios.deploymentTarget`, so the generated `Podfile` falls back to its old hardcoded default of `15.1`. This broke local `pod install` outright (`CocoaPods could not find compatible versions for pod "Expo"... required a higher minimum deployment target`), and is the suspected root cause of a real EAS `production`-profile iOS build failure (build `be5c4417-1201-4756-a49c-1e6bfa3adccf`, commit `0998e94`) that failed with Swift compiler errors (`'weak' must be a mutable variable`, `RuntimeScheduler` `SWIFT_RETURNS_RETAINED`/`UNRETAINED` errors — classic Swift-6/deployment-target-mismatch symptoms).

**Approach:** Add `deploymentTarget: '16.4'` (re-confirm this is still the `Expo` pod's current requirement at implementation time — do not assume) under `app.config.ts`'s `ios` key, with a short comment recording why. Verify fresh from scratch: `expo prebuild --platform ios --clean` + `pod install` + a real Xcode build (`expo run:ios` or equivalent) must succeed with 0 errors, install, and launch on a Simulator. Then trigger a fresh EAS iOS build (`distribution: store` profile, e.g. `production`) to confirm whether this same fix also resolves that specific EAS failure — document the outcome either way, don't assume it's fixed without checking. This was already done once in an exploratory session (2026-09-28) with a successful local build/launch outcome; this story re-derives and commits it properly rather than trusting that unverified/uncommitted state.

</frozen-after-approval>

## Implementation Notes

- **Re-confirmed the requirement at implementation time** (per the Approach's "don't assume" instruction): `node_modules/.pnpm/expo@57.0.25*/node_modules/expo/Expo.podspec`'s `s.platforms` block still reads `:ios => '16.4'` with `s.swift_version = '6.0'` — unchanged from the exploratory session. Used `16.4`.
- **Applied the fix** to `apps/mobile/app.config.ts`: added `deploymentTarget: '16.4'` under the `ios` key with an explanatory comment, in both this worktree (the story branch) and the primary checkout (`/Volumes/AN/workspace/exposure-buddy-5`) — confirmed byte-identical via `diff` before verifying.
- **Fresh local verification (redone from scratch, not reusing the exploratory session's state):** `npx expo prebuild --platform ios --clean` + `pod install` completed cleanly (no dependency resolution errors — previously failed with `CocoaPods could not find compatible versions for pod "Expo"`). `npx expo run:ios --device "iPhone 17 Pro"` then built with **0 errors, 1 warning** (an unrelated, pre-existing Xcode script-phase dependency-analysis warning, not caused by this change), installed, and launched on the simulator. Reproduced successfully a second time to confirm it wasn't a fluke.
- **Fresh EAS verification:** triggered a new `production`-profile iOS build (`eas build --platform ios --profile production --non-interactive`) from the primary checkout with the fix applied. Build succeeded end-to-end, producing a real `.ipa` (`https://expo.dev/artifacts/eas/mVE9vQ9dt_rN0ph3CkFXM-VI4p9fkoLkWcUzDicGmgI.ipa`) — confirming the earlier EAS build failure (build `be5c4417-1201-4756-a49c-1e6bfa3adccf`, commit `0998e94`, Swift compiler errors) shared this same root cause and is now resolved. No credential/interactive-terminal issues this time either (existing Apple Distribution cert + provisioning profile reused non-interactively, same as the earlier failed attempt).
- `pnpm turbo typecheck lint test`: 19/19 tasks, 452/452 mobile tests — matches the pre-change baseline exactly (this is a native-config-only change with no JS/TS surface, so no regression expected or found).
- Local `ios/` prebuild output deleted after verification (not committed), per this project's Continuous Native Generation convention.

## Review Triage Log

Reviewed: `git diff HEAD -- apps/mobile/app.config.ts` (Blind Hunter only, per oneshot route). 8 findings, all verified.

- **No automated regression guard tying `deploymentTarget` to the installed `expo` podspec** — real, but smallest fix (a new CI/lint check) exceeds a direct correction. Routed to **defer** (see `deferred-work.md`), grouped with the "silent drift after `pnpm update`" finding below (same root cause).
- **`docs/setup/local-environment.md` has no iOS 16.4/Xcode minimum note** — real, simple fix. **Patch applied**: added an "Xcode (for iOS)" row to the Prerequisites table (both this worktree and the primary checkout) pointing at the podspec to re-check on future SDK bumps.
- **App Store / device-support consequence of raising the deployment target is undocumented** — `false`/rejected as low: iOS 16.4 shipped March 2023; by the time this app would actually be distributed, real-world device coverage below that floor is negligible, and the floor itself isn't discretionary (the Expo SDK 57 pod mandates it) — there's no product decision this story could have made differently. Fix would exceed a direct correction (App Store Connect listings, PRD updates).
- **Code comment doesn't say how to re-verify the value on the next SDK bump** — real, simple fix. **Patch applied**: expanded the comment to name the exact file/fields to check (`node_modules/expo/Expo.podspec`'s `s.platforms`/`s.swift_version`).
- **Story doc said the podspec lives at `expo/ios/Expo.podspec`** — real typo (actual path has no `ios/` subdirectory). **Fixed** in Implementation Notes above.
- **No check for an equivalent Android `minSdkVersion`/`compileSdkVersion` floor regression** — `false`: verified `app.config.ts` has no Android SDK-version override (none needed — Android's floor is read fresh from `expo-modules-core`'s own gradle properties every prebuild, not pinned into a stale generated file like iOS's `Podfile` template), and CI's `e2e-build-apk` job (which runs a full `expo prebuild --platform android` + Gradle build) has passed cleanly on every relevant run, including PR #83.
- **No version/build-number bump accompanies a fix for a broken distribution build** — `false`: this project's own documented convention (`app.config.ts`'s comment, confirmed with the user) ties the version bump to the moment of actually building for external distribution, not to landing an infrastructure fix that enables some future distribution build to succeed. This story's own verification builds were to test the fix, not a real release.
- **Bare scalar with no assertion tying it to the installed `expo` package, can silently drift** — same root cause as the first finding above; grouped and deferred together.

