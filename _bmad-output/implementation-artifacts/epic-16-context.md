# Epic 16 Context: Expo SDK 57 Upgrade

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Move the mobile app from Expo SDK 54 to Expo SDK 57 (and the React Native / Expo Router / Expo-managed package versions that requires) with zero functional or visual regression versus the SDK 54 baseline. Originally planned as three sequential hops (54→55→56→57); revised 2026-09-28 after Story 16.1 landed to two stories — 54→55 (done), then 55→57 directly — after the `expo-upgrade` skill's own guidance surfaced that the intermediate SDK 56 stop carries a known Hermes V1 memory regression. Covers only the SDK/dependency upgrade and its regression verification — not new features the newer SDKs enable.

## Stories

- Story 16.1: Upgrade Expo SDK from 54 to 55 — done
- Story 16.2: Upgrade Expo SDK from 55 to 57 (direct jump, skips SDK 56) — draft

## Requirements & Constraints

- The app must build, run, and pass its full typecheck/lint/test suite on the target SDK, with no user-visible regression in any existing screen or flow.
- SDK 56, and SDK 57 releases before `expo@57.0.9`, carry a confirmed Hermes V1 memory regression affecting `react-native-worklets`/`react-native-reanimated` (both direct dependencies here). Story 16.2 must land on `expo@57.0.9` or later specifically — never an earlier 57.x patch, and never SDK 56 — so this regression is never installed at all, rather than accepted as a transient risk.
- Non-Expo-managed native dependencies (currently: `@sentry/react-native`, `@journeyapps/react-native-quick-sqlite`, `@rn-primitives/portal`, `react-native-draggable-flatlist`) are not touched by `expo install --fix` and must be individually checked for React Native/New Architecture compatibility, bumped only if required.
- Any change to the pinned `@powersync/react-native@1.34.0` version itself (not just its SQLite driver) requires PowerSync's integration test suite to pass end-to-end before merge, per `ADR-RN-VERSION.md`'s Upgrade Policy.
- SDK 56 removed Expo Router's dependency on React Navigation — going from SDK 55 to 57 still crosses that boundary, so any direct `@react-navigation/*` import in the app must be migrated to its `expo-router` equivalent as part of this upgrade.
- Native-module or config-plugin incompatibilities surfaced mid-upgrade may warrant their own follow-up story rather than blocking epic completion.

## Technical Decisions

- No `android/`/`ios/` directories are committed (Continuous Native Generation) — this must remain true after the upgrade; any `expo prebuild` run for local verification has its output deleted afterward.
- `ADR-RN-VERSION.md`'s version-pin table is the source of truth for the currently-installed React Native/Expo SDK/Expo Router versions and must be updated once the upgrade lands.
- Version bumps go through `npx expo install expo@<resolved-version>` + `npx expo install --fix` — no hand-picked Expo-managed dependency versions.
- `npx expo-doctor` is the standard post-upgrade diagnostic; every issue it flags must be fixed or explicitly triaged with a documented reason, not silently ignored.
- The official `expo-upgrade` Claude Code skill (installed at `.claude/skills/expo-upgrade`, from `github.com/expo/skills`) is the reference for upgrade mechanics, deprecated-package migrations, and known SDK-specific regressions — its explicit recommendation (skip SDK 56, land on `expo@57.0.9`+ directly) is why Story 16.2 targets 57 directly instead of stopping at 56.
- `pnpm turbo typecheck lint test` (all packages, not just `apps/mobile`) is the primary automated regression gate.
- This environment has no working iOS Simulator GUI and no real interactive terminal for EAS build credential setup — manual on-device/EAS-build smoke tests are attempted but may need to be logged as a deferred verification step, not silently skipped.

## Cross-Story Dependencies

- Story 16.2 depends on Story 16.1 being done (cannot skip ahead of the 54→55 hop).
- Story 16.2 is the final story in this epic — no further hop is needed after `expo@57.0.9`+ lands.
