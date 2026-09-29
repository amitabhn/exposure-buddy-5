# ADR-RN-VERSION — React Native / Expo SDK Version Pin

**Status:** Accepted  
**Owner:** Engineering lead  
**Required before:** Project initialisation (Story 1)

---

## Context

The project requires a pinned React Native and Expo SDK version to be recorded as an explicit decision. The version was selected as part of the starter template evaluation (Custom Turborepo + Expo + PowerSync) but was not formalised as a standalone ADR. This ADR records that decision and its constraints.

---

## Decision

| Component | Version | Pin strategy |
|-----------|---------|--------------|
| React Native | `0.86.3` | Expo SDK 57 managed — do not upgrade independently |
| Expo SDK | `57` | Pinned; upgrade only as a coordinated stack bump |
| Expo Router | `~57.0.23` | File-based routing; tied to Expo SDK 57 |
| NativeWind | `5.0.0-preview.3` | Pre-release; pin to exact version |
| PowerSync SDK | `@powersync/react-native@2.3.0` | Pin to exact version |
| PowerSync sync service | PowerSync Cloud, region `in` (India / ap-south-1) | User-owned account, Free plan |
| Node runtime | `20+` | LTS minimum |

React Native version is **not managed directly** — it is determined by the Expo SDK version. Expo SDK 57 ships React Native 0.86.3. Any React Native upgrade must go through an Expo SDK upgrade.

**Updated 2026-09-28 (Story 16.1, Epic 16):** bumped from Expo SDK 54 / RN 0.81 to Expo SDK 55 / RN 0.83.10 — originally planned as the first of three sequential SDK-hop stories toward SDK 57.

**Updated 2026-09-28 (Story 16.2, Epic 16 — final hop):** bumped directly from Expo SDK 55 / RN 0.83.10 to Expo SDK 57.0.25 / RN 0.86.3, skipping SDK 56 entirely, per the `expo-upgrade` skill's explicit guidance that SDK 56 and pre-`.0.9` SDK 57 releases carry a Hermes V1 memory regression affecting `react-native-worklets`/`react-native-reanimated`. Landing directly on `expo@57.0.25` (well above the `.0.9` floor) means this regression was never installed at any point — no transient risk window, unlike the originally planned 55→56→57 path. **Epic 16 (Expo SDK upgrade) is now complete; no further SDK hop is planned.** Expo Router's dependency on React Navigation was also removed at the SDK 56 boundary — `apps/mobile/app/_layout.tsx`'s `DefaultTheme`/`ThemeProvider` imports were migrated from `@react-navigation/native` to `expo-router` directly (the non-deprecated re-export), and the direct `@react-navigation/native` dependency was removed from `apps/mobile/package.json`.

**Updated 2026-09-29 (Story 16.4, Epic 16):** bumped `@powersync/react-native` from `1.34.0` to `2.3.0` (latest stable 2.x at implementation time). Root cause: PowerSync's old default SQLite driver, `@journeyapps/react-native-quick-sqlite@2.5.2`, compiles into the native binary on RN 0.86.3 but never registers to the JS bridge under the New Architecture — every launch crashed with `Could not resolve @journeyapps/react-native-quick-sqlite`, an iOS-specific failure (Android's `e2e-build-apk`/smoke CI already ran clean post-SDK-57 on PR #83). Fix: `@powersync/react-native@2.0+` bundles OP-SQLite (`@op-engineering/op-sqlite@18.2.5`, pinned as a new direct dependency of `apps/mobile/package.json` for RN autolinking) as its own default driver with real New Architecture support — `@journeyapps/react-native-quick-sqlite` was removed entirely, not patched around. `packages/sync/src/client.ts`'s `new PowerSyncDatabase({ schema, database: { dbFilename } })` construction and the app's one `connect(connector)` call site (`apps/mobile/app/_layout.tsx:190`) both matched the v2.x API unchanged — no code edits were required, only the dependency swap. `pnpm-workspace.yaml` gained an explicit `@powersync/common: 2.3.0` override after pnpm's resolver stuck an unrelated transitive `@powersync/common@1.57.3` in the tree despite every consumer (`@powersync/react-native@2.3.0`, `@powersync/react@2.0.1`, `@powersync/shared-internals@1.3.0`) requiring `^2.x`. Real on-device verification (fresh launch + offline-write-then-reconnect landing exactly one row in Supabase) is this story's completion gate, per its spec — see `spec-16-4-fix-powersync-quick-sqlite-new-architecture-crash.md`'s Implementation Notes for the actual verification outcome.

**Updated 2026-09-29 (Story 17.1):** provisioned this project's first-ever working PowerSync sync service — **PowerSync Cloud**, project "Exposure Buddy", **Development** instance, region `in` (PowerSync's own code for India/`ap-south-1`, selected for DPDPA data-residency alignment and pulled directly from the live instance via `powersync pull instance`, not hand-typed). Hosting choice was Cloud over self-hosted Open Edition specifically to avoid taking on standing infrastructure (a self-hosted compute container plus a separate MongoDB/Postgres storage backend) for a solo/small-team project; the Free plan requires no credit card, so no budget ceiling was set. **Account owner: the project owner (user), not this agent** — PowerSync account creation on a new third-party service cannot be done by an agent on the user's behalf. Config lives at `powersync/service.yaml`/`sync-config.yaml`/`cli.yaml` (checked in; secrets via `!env` referencing the gitignored `powersync/.env`). Prior to this story, no PowerSync sync service existed anywhere for this project (traces to Story 9.1) — see `spec-17-1-provision-powersync-sync-service.md` for the full decision record and `deferred-work.md` for the one verification scenario (offline-write-then-reconnect) still open.

---

## Rationale

### Why Expo SDK 54 / RN 0.81

All three starter options evaluated used Expo SDK 54 + RN 0.81 as the base (the only viable Expo SDK version at the time of architecture design that supported the required dependency set). No alternative RN version was evaluated — the choice was stack-level, not RN-version-level.

Key compatibility constraints that lock to this version:

- **NativeWind v5 preview** requires Expo SDK 52+; tested against SDK 54 in the Phase 0 spike
- **PowerSync `@powersync/react-native@1.34.0`** compatibility verified against RN 0.81
- **`react-native-mmkv`** (MMKV sync reads for ADR-004 cold start) requires the New Architecture (Fabric), enabled by default in RN 0.76+; RN 0.81 is confirmed compatible
- **Expo Dev Client** is required (MMKV is incompatible with Expo Go); Expo SDK 54 Dev Client is the baseline

### Why pin NativeWind to exact pre-release

`5.0.0-preview.3` is pre-release. Patch bumps have introduced breaking changes in prior preview releases. Each preview bump must be reviewed and tested before upgrading — automatic patch upgrades (`^`) are unsafe.

### Why pin PowerSync to exact version

PowerSync SDK manages the SQLite schema and outbox queue format. An unexpected upgrade could corrupt the local database schema on user devices. Exact pin prevents accidental upgrades via `pnpm update`.

---

## Upgrade Policy

1. **React Native / Expo SDK:** Upgrade as a coordinated stack bump. Before bumping: verify NativeWind preview compatibility, PowerSync SDK compatibility, and MMKV compatibility. Run Phase 0 spike protocol on new versions before merging.
2. **NativeWind:** Review release notes at each preview bump. Do not use `^` in `package.json`. Upgrade only after confirming no breaking changes to existing utility class behaviour.
3. **PowerSync SDK:** Pin to exact version. Upgrade requires integration test suite to pass end-to-end (offline write → reconnect → assert single row) before merge.
4. **Expo Router:** Tied to Expo SDK version — upgrade together, not independently.

---

## Consequences

- Expo manages the RN version — direct `react-native` version overrides in `package.json` are not permitted
- `package.json` must use exact versions (no `^` or `~`) for NativeWind and PowerSync SDK
- Phase 0 spike must verify NativeWind `5.0.0-preview.3` + PowerSync `1.34.0` + MMKV + Expo SDK 54 are mutually compatible before Story 1 is closed
- Any dependency that requires a higher RN version than 0.81 is blocked until an Expo SDK upgrade is planned
