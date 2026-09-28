---
title: 'Story 16.3: Fix iOS deployment target for Expo SDK 57'
type: 'bugfix'
created: '2026-09-28'
status: 'in-progress'
route: 'oneshot'
review_loop_iteration: 0
baseline_commit: 'PENDING_AT_IMPLEMENTATION'
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

