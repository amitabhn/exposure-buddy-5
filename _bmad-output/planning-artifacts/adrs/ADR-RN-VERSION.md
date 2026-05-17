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
| React Native | `0.81` | Expo SDK 54 managed — do not upgrade independently |
| Expo SDK | `54` | Pinned; upgrade only as a coordinated stack bump |
| Expo Router | `v4` | File-based routing; tied to Expo SDK 54 |
| NativeWind | `5.0.0-preview.3` | Pre-release; pin to exact version |
| PowerSync SDK | `@powersync/react-native@1.34.0` | Pin to exact version |
| Node runtime | `20+` | LTS minimum |

React Native version is **not managed directly** — it is determined by the Expo SDK version. Expo SDK 54 ships React Native 0.81. Any React Native upgrade must go through an Expo SDK upgrade.

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
