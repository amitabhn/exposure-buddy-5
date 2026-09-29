# Epic 16 Context: Expo SDK 57 Upgrade

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Move the mobile app from Expo SDK 54 to Expo SDK 57 (and the React Native / Expo Router / Expo-managed package versions that requires) with zero functional or visual regression versus the SDK 54 baseline. The SDK/dependency bump itself is done, but the epic was reopened after the first real on-device/iOS-Simulator run (previously unavailable in this environment) surfaced two regressions that the automated suite cannot catch: a broken iOS deployment target (fixed, Story 16.3) and a PowerSync runtime crash under the New Architecture (Story 16.4, this story). Covers only the SDK/dependency upgrade and its regression verification — not new features the newer SDKs enable.

## Stories

- Story 16.1: Upgrade Expo SDK from 54 to 55 — done
- Story 16.2: Upgrade Expo SDK from 55 to 57 (direct jump, skips SDK 56) — done
- Story 16.3: Fix iOS deployment target for Expo SDK 57 — done (merged PR #84)
- Story 16.4: Fix PowerSync/`@journeyapps/react-native-quick-sqlite` New Architecture runtime crash — this story

## Requirements & Constraints

- The app must build, run, and pass its full typecheck/lint/test suite on Expo SDK 57 (React Native 0.86.3), with no user-visible regression in any existing screen or flow — this is the requirement Story 16.4 is closing out.
- Neither `pnpm turbo typecheck lint test` nor `expo-doctor` can catch a real native-linking failure — both only ever exercise a Jest-mocked native module. Only a real on-device/Simulator run surfaces this class of bug, and the environment's on-device verification is otherwise very limited (no iOS Simulator GUI, no interactive-terminal EAS credential setup) — plan verification accordingly.
- Any change to the pinned `@powersync/react-native@1.34.0` version itself (not just its SQLite driver) requires PowerSync's integration test suite to pass end-to-end (offline write → reconnect → assert single row) before merge, per `ADR-RN-VERSION.md`'s Upgrade Policy. A driver-only swap (e.g. replacing `@journeyapps/react-native-quick-sqlite`) still needs the same end-to-end verification given it sits on the same data path, even if the policy text is worded around the `@powersync/react-native` pin specifically.
- `ADR-RN-VERSION.md` pins PowerSync SDK to an exact version for a stated reason: an unexpected upgrade could corrupt the local SQLite schema/outbox-queue format on user devices. Any driver change must not alter on-disk schema/outbox compatibility for existing installs.
- No `android/`/`ios/` directories are committed (Continuous Native Generation) — this must remain true; any `expo prebuild` run for local verification has its output deleted afterward, not committed.

## Technical Decisions

- `packages/sync` is the sole PowerSync integration point (`createPowerSyncDatabase`, adapter, connector, schema, outbox) — see `packages/sync/src/client.ts`, `adapter.ts`, `connector.ts`, `schema.ts`. `apps/mobile/package.json` pins `@journeyapps/react-native-quick-sqlite` directly (not Expo-managed) at `^2.5.2`, already the latest version published upstream.
- The official `expo-upgrade` Claude Code skill (`.claude/skills/expo-upgrade`, from `github.com/expo/skills`) is the reference for upgrade mechanics and known SDK-specific regressions; it was already consulted for the SDK 56 Hermes V1 skip decision in Story 16.2.
- `ADR-RN-VERSION.md`'s version-pin table is the source of truth for currently-installed versions and must be updated if this story changes the PowerSync/driver pin.
- `pnpm turbo typecheck lint test` (all packages) is the primary automated regression gate, but is known to be insufficient on its own for this story's class of bug — real on-device verification (or the closest available substitute) is required to close it out, not just the standard gate.

## Cross-Story Dependencies

- Split out of Story 16.3 (both discovered in the same 2026-09-28 on-device Simulator session) because this is open-ended root-cause investigation + fix evaluation, not a small self-contained fix — independently shippable from 16.3, which already merged.
- Depends on Stories 16.1/16.2 having landed (SDK 57 / RN 0.86.3 is the baseline this bug reproduces on).
- This is the last open story in the epic — epic 16 closes once this lands.
