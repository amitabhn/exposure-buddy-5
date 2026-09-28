# Story 16.1: Upgrade Expo SDK from 54 to 55

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the engineering team maintaining the mobile app,
I want the app upgraded from Expo SDK 54 to Expo SDK 55 (the first of three sequential SDK hops toward 57),
so that we can isolate any regression to this specific SDK boundary before moving further, per Expo's general incremental-upgrade guidance.

## Context

Added 2026-09-28. Full epic rationale: `_bmad-output/planning-artifacts/epics.md` → "Epic 16: Expo SDK 57 Upgrade" / "Story 16.1". This is the first of three sequential stories planned for Epic 16 (16.1: 54→55, 16.2: 55→56, 16.3: 56→57).

**Why incremental, not a direct 54→57 jump:** researching this story with the official `expo-upgrade` Claude Code skill (`github.com/expo/skills`) surfaced that SDK 56, and SDK 57 releases before `expo@57.0.9`, carry a Hermes V1 memory regression affecting `react-native-worklets`/`react-native-reanimated` — both direct dependencies of this app. A direct 54→57 jump would have avoided ever installing an affected version. The incremental path was chosen anyway (explicit decision, 2026-09-28) to match Expo's general "upgrade one SDK at a time" guidance and make it easier to isolate which SDK boundary introduces any given regression. **This means Story 16.2 (55→56) will land on a version carrying the known Hermes V1 regression — any build produced during that window must stay internal (CI/local verification only), never distributed to testers.** Story 16.3 (56→57.0.9+) resolves it. This story (16.1, the 54→55 hop) is unaffected — SDK 55 only carries the regression if Hermes V1 is explicitly opted into, which this story does not do (see AC #2 and the `expo-upgrade` skill's explicit guidance not to opt in/out of Hermes versions).

**Scope boundary (do not exceed):** this story is the 54→55 SDK/dependency bump and its regression verification only. It does NOT continue on to SDK 56 or 57 (those are Stories 16.2/16.3), does NOT add new features enabled by newer SDKs, does NOT adopt React Compiler (a separate, independently-risky change — flag as a future story candidate, don't bundle it here), and does NOT touch `packages/ui`'s NativeWind status (this app already uses the StyleSheet fallback, unrelated to this upgrade).

## Acceptance Criteria

1. `apps/mobile/package.json`'s `expo` dependency is bumped to the latest stable `expo@55.x` release — confirm the exact version at implementation time — via `npx expo install expo@<resolved-55.x-version>` followed by `npx expo install --fix`. This aligns every Expo-managed dependency (`expo-router`, `expo-application`, `expo-constants`, `expo-dev-client`, `expo-font`, `expo-linking`, `expo-localization`, `expo-notifications`, `expo-splash-screen`, `expo-status-bar`, `@expo/config-plugins`, `babel-preset-expo`, `jest-expo`) to SDK 55-compatible versions automatically. Do not hand-pick any of these version numbers (matches the established convention from Story 14.1). Do NOT install SDK 56 or 57 as part of this story.
2. Hermes V1 is left at whatever SDK 55's default is — this story does NOT opt in or out of Hermes V1 (per the `expo-upgrade` skill's explicit guidance: "Do not guide users to opt in to or out of Hermes V1... unsupported and has significant build and dependency-management caveats"). If `expo install --fix` or `expo-doctor` surfaces a Hermes-related prompt, the default is accepted, not overridden.
3. SDK 55 requires the New Architecture unconditionally (Legacy Architecture support ended at SDK 54). This app has no `newArchEnabled` flag in `app.config.ts` today. Confirm the app is already running on the New Architecture (the RN 0.81/Expo SDK 54 default) — this is a verification step, not a code change. Document the confirmation method used (e.g. `expo-doctor` output, or a runtime `global._IS_FABRIC` check) in Completion Notes.
4. `npx expo-doctor` is run post-upgrade and reports no unresolved issues. Any issue it flags is either fixed or explicitly triaged with a documented reason in this story's Completion Notes — not silently ignored.
5. Three native dependencies that `expo install --fix` does NOT manage are individually checked for compatibility with SDK 55's bundled React Native version / New Architecture, and bumped only if required:
   - `@sentry/react-native` (`~7.2.0`) — check Sentry's own RN compatibility matrix. Note: the Expo config plugin (`@sentry/react-native/expo`) is intentionally NOT used today (see `app.config.ts` comment — it requires a `sentry-cli` binary that doesn't build on EAS with pnpm); re-verify this constraint still holds for whatever Sentry version is selected, and do not re-add the plugin unless that underlying pnpm/EAS blocker is independently resolved (out of scope for this story).
   - `@journeyapps/react-native-quick-sqlite` (`^2.5.2`) — the SQLite driver `@powersync/react-native@1.34.0` depends on (`packages/sync`). This gets particular scrutiny: per `ADR-RN-VERSION.md`'s existing Upgrade Policy, any change to the pinned `@powersync/react-native@1.34.0` version itself (as opposed to bumping just its SQLite driver) requires PowerSync's integration test suite to pass end-to-end (offline write → reconnect → assert single row) before merge — not just `pnpm turbo typecheck lint test`.
   - `@rn-primitives/portal` (`1.4.0`) and `react-native-draggable-flatlist` (`^4.0.3`) — confirm no known New Architecture incompatibility via each package's release notes/issue tracker; bump only if required.
6. `ADR-RN-VERSION.md`'s version-pin table is updated to the actually-installed post-upgrade versions — confirm the exact `react-native` version from `package.json` after `expo install --fix` runs rather than assuming one. Note in the ADR that this is the first of three sequential hops toward SDK 57 (cross-referencing Epic 16 and Stories 16.2/16.3), not the final target.
7. `eas.json`'s `node: "22.13.0"` pin (all four build profiles) and `engines.node: ">=20.0.0"` (root and `apps/mobile` `package.json`) are re-checked against SDK 55's actual minimum Node requirement (`^20.19.4`/`^22.13.0`/`^24.3.0` per the SDK 55 changelog — confirm at implementation time). Bump the pins if they fall below the floor.
8. This repo has no `android/`/`ios/` directories (Continuous Native Generation), no `expo.install.exclude` entries, and no `patches/` directory today — this remains true after the story. If `npx expo prebuild` is run locally for verification, its output directories are deleted afterward, not committed. If the upgrade newly requires an `expo.install.exclude` entry or a patch, it is documented in Completion Notes with the reason.
9. `pnpm turbo typecheck lint test` passes clean across every package in the monorepo (not just `apps/mobile`) with zero regressions. This is the primary automated regression gate for this story.
10. A manual on-device/EAS-build smoke test (sign-in, home screen load, start one ERP session — the core loop most likely to surface a Reanimated/gesture-handler or New Architecture regression) is attempted. Given confirmed prior environment limitations (no working iOS Simulator GUI in this environment; EAS build credential setup requires a real interactive terminal, not the `!`-passthrough shell), if this cannot be completed within the story, it is explicitly logged as a deferred verification step in Completion Notes — not silently skipped. Any build produced at this SDK 55 stop is safe to distribute if needed (the Hermes V1 regression only applies from SDK 56 onward, per the Context section above) — unlike the build that will come out of Story 16.2.
11. No code change is made to continue on to SDK 56/57, adopt React Compiler, or touch any `expo-av`-adjacent code (this app has zero `expo-av` usage, confirmed via repo-wide search) — these are explicitly out of scope per the Context section above.

## Tasks / Subtasks

- [x] Task 1 — Core Expo/dependency bump (AC: #1, #2)
  - [x] Confirm the current latest stable Expo SDK 55 release (check `https://expo.dev/changelog/sdk-55`)
  - [x] Run `npx expo install expo@<resolved-55.x-version>` then `npx expo install --fix` from `apps/mobile`
  - [x] Confirm no Hermes V1 opt-in/opt-out was introduced
- [x] Task 2 — New Architecture verification (AC: #3)
  - [x] Confirm the app is running on the New Architecture; document the method used
- [x] Task 3 — Diagnostics (AC: #4)
  - [x] Run `npx expo-doctor`; fix or document every flagged issue
- [x] Task 4 — Non-Expo-managed native dependency audit (AC: #5)
  - [x] Check `@sentry/react-native` compatibility; bump if required; re-verify the sentry-cli/pnpm/EAS plugin constraint still holds
  - [x] Check `@journeyapps/react-native-quick-sqlite` compatibility; if `@powersync/react-native`'s pin must change, run the PowerSync integration test suite per `ADR-RN-VERSION.md`
  - [x] Check `@rn-primitives/portal` and `react-native-draggable-flatlist` compatibility; bump only if required
- [x] Task 5 — Documentation updates (AC: #6)
  - [x] Update `ADR-RN-VERSION.md`'s version-pin table with actually-installed versions and the "first of three hops" note
- [x] Task 6 — Node/build config floor check (AC: #7)
  - [x] Confirm SDK 55's minimum Node requirement; bump `eas.json` and `engines.node` if needed
- [x] Task 7 — CNG/housekeeping checklist (AC: #8)
  - [x] Confirm no `android/`/`ios/` dirs, `expo.install.exclude`, or `patches/` were introduced (or document why one was needed)
- [x] Task 8 — Full regression suite (AC: #9)
  - [x] Run `pnpm turbo typecheck lint test`; fix any regression before proceeding
- [x] Task 9 — Manual smoke test or documented deferral (AC: #10)
  - [x] Attempt an EAS development/preview build and manual smoke test (sign-in → home → start one ERP session)
  - [x] If blocked by environment limitations, log the deferral explicitly in Completion Notes
- [x] Task 10 — Scope guard (AC: #11)
  - [x] Confirm no SDK 56/57 install, React Compiler, or expo-av-migration code was introduced incidentally during the bump

## Dev Notes

### Files being touched (current state, read in full during story creation)

- **`apps/mobile/package.json`** — `expo ~54.0.0`, `react-native 0.81.5`, `expo-router ~6.0.23`, `react 19.1.0`; full current dependency list captured in this story's Context research. There is no top-level `expo` key in `package.json` today, so no `expo.install.exclude` field exists — confirm `expo install --fix` doesn't need to introduce one.
- **`apps/mobile/eas.json`** — four build profiles (`development`, `preview`, `e2e`, `production`), all pin `"node": "22.13.0"`.
- **`apps/mobile/app.config.ts`** — no `newArchEnabled` field present (New Architecture is already the RN 0.81/Expo SDK 54 default; SDK 55 requires it unconditionally, so its absence here is already correct — no change needed). Has a local config plugin `./plugins/withIosScene27Compat` and an intentionally-removed `@sentry/react-native/expo` plugin (see inline comment) — do not re-add the Sentry plugin as part of this story.
- **`_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md`** — pins `React Native: 0.81` / `Expo SDK: 54` / `Expo Router: v4`; also references NativeWind and `react-native-mmkv`, both of which are **stale** (this project uses the StyleSheet fallback and `@journeyapps/react-native-quick-sqlite`, not NativeWind/MMKV) — pre-existing inaccuracies from before this story, not introduced by it. Do not fix those unrelated rows as part of this story (avoid unrelated scope creep) — only touch the React Native / Expo SDK / Expo Router rows and add the "first of three hops" note.
- **`packages/sync/package.json`** — pins `@powersync/react-native@1.34.0` exactly (no `^`/`~`), per `ADR-RN-VERSION.md`'s explicit "exact pin, upgrade requires integration test suite" policy.
- **`.github/workflows/ci.yml`** — `NODE_VERSION: '22'` (resolves to latest 22.x via `actions/setup-node`; re-verify against SDK 55's floor per AC #7).

### Confirmed NOT applicable to this upgrade (checked during story creation, don't re-investigate)

- **`expo-av`**: zero usage anywhere in `apps/mobile` (confirmed via repo-wide grep) — the `expo-av`→`expo-audio`/`expo-video` migration in the `expo-upgrade` skill's reference docs does not apply.
- **Native Tabs**: the app's only tab navigator is `<Tabs>`/`<Tabs.Screen>` from `expo-router` (`apps/mobile/app/(app)/_layout.tsx`) — the standard JS-based tab navigator, not `expo-router/unstable-native-tabs`. This is a SDK 55-era migration guide anyway, not relevant to this hop.
- **`@react-navigation/native` direct usage**: only `DefaultTheme`/`ThemeProvider` are imported (`apps/mobile/app/_layout.tsx`) — a standard peer-dependency usage pattern that `expo-router` itself relies on, not a hand-rolled navigator. The skill's `react-navigation-to-expo-router.md` migration guide (for apps using `@react-navigation/*` navigators directly, and specific to the SDK 56 hop) does not apply here.
- **React 19 migration checklist** (`useContext`→`use`, `Context.Provider`→`Context`, `forwardRef` removal): this app is already on React 19.1.0 (landed with the SDK 54 upgrade) — this is a checklist for the 53→54 transition, already complete.

### The `expo-upgrade` Claude Code skill

Installed at `.claude/skills/expo-upgrade` (symlink to `.agents/skills/expo-upgrade/`) specifically to support this epic. Use its `SKILL.md` step-by-step process and reference docs (`references/new-architecture.md`, `references/react-compiler.md`, etc.) during implementation. Its housekeeping checklist (exclude entries, `patches/`, Metro/Babel config redundancy) is the source for AC #8. Its explicit Hermes V1 guidance ("do not guide users to opt in/out") is the source for AC #2.

### Testing standard

`pnpm turbo typecheck lint test` is this monorepo's standard gate (per every prior story in Epics 14/15). No new test files are expected from this story specifically — it's a dependency-version story, not a feature story — but any existing test that breaks due to a dependency's changed behavior must be fixed, not skipped or `.skip()`-marked.

### Explicitly out of scope (do not implement)

- Continuing on to SDK 56 or 57 — those are Stories 16.2 and 16.3, not this one.
- React Compiler adoption (`experiments.reactCompiler: true`) — a separate, independently-risky change per the `expo-upgrade` skill's own housekeeping note ("recommended" but not required); candidate for its own future story in this epic.
- Any Native Tabs migration, expo-av migration, or React Navigation→Expo Router migration — none apply to this codebase, and the latter two are SDK 55/56-era concerns anyway.
- Fixing the pre-existing stale NativeWind/`react-native-mmkv` references in `ADR-RN-VERSION.md` — unrelated to this story's version-pin update.
- Re-adding the `@sentry/react-native/expo` config plugin — blocked on an unrelated sentry-cli/pnpm/EAS issue, out of scope here.

### Project Structure Notes

- No new files are created by this story except `pnpm-lock.yaml` changes — all edits are to existing files (`apps/mobile/package.json`, `apps/mobile/eas.json` if the Node floor changes, `_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md`) plus whatever `expo install --fix` resolves.
- No conflicts with monorepo boundary rules (ARC-006/ARC-011/ARC-013) — `packages/core` and `packages/supabase` have no Expo/RN dependency exposure to begin with; `packages/sync`'s PowerSync pin is the one cross-package risk, explicitly covered by AC #5.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` § "Epic 16: Expo SDK 57 Upgrade" / "Story 16.1"]
- [Source: `_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md`]
- [Source: `apps/mobile/package.json`, `apps/mobile/eas.json`, `apps/mobile/app.config.ts`]
- [Source: `packages/sync/package.json` — `@powersync/react-native@1.34.0` exact pin]
- [Source: `.claude/skills/expo-upgrade/SKILL.md` (installed 2026-09-28 from `github.com/expo/skills`) — Hermes V1 regression note and Hermes-version guidance]
- [Source: Expo changelog `https://expo.dev/changelog/sdk-55`]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5), via manual implementation guided by the `expo-upgrade` Claude Code skill (create-story workflow not used interactively for this pass — story was already drafted; implementation done directly)

### Debug Log References

- `npx expo-doctor` (with `NODE_PATH` workaround for the known pnpm-monorepo `expo/bin/cli config --json` crash — see `expo-upgrade`'s own environment; unrelated to this SDK bump) went from 6 failing checks → 2 (both explained/accepted, see below)
- `pnpm turbo typecheck lint test`: first post-bump run failed (`react-native-worklets/jest/resolver.js` not found → root-caused to `expo install --fix` downgrading worklets to 0.7.4, which lacks the jest resolver present in 0.8.3); second run (post worklets fix) failed 23/39 mobile suites with `Invariant Violation: __fbBatchedBridgeConfig is not set` → root-caused to `packages/ui` resolving a physically different `react-native@0.83.10` copy than `apps/mobile` (pnpm peer-hash divergence), fixed via a jest `moduleNameMapper` forcing canonical resolution; third run failed 1/39 suites (`settings/index.test.tsx`, "Cannot find native module 'ExpoPushTokenManager'") → root-caused to `expo-notifications@55.0.27` eagerly resolving a new native module at import time with no upstream jest mock shipped, fixed with a local `jest.mock('expo-notifications', ...)` matching the existing pattern from `sessionReminder.test.ts`. Fourth run: 19/19 turbo tasks, 451/451 mobile tests — matches pre-upgrade baseline exactly.

### Completion Notes List

- **Core bump:** `expo` → `55.0.31` (latest stable at implementation time) via `npx expo install expo@55.0.31` + `npx expo install --fix`. All Expo-managed deps aligned to SDK 55 (react 19.2.0, react-native 0.83.10, expo-router ~55.0.18, expo-application/-constants/-dev-client/-font/-linking/-localization/-notifications/-splash-screen/-status-bar, @expo/config-plugins, babel-preset-expo, jest-expo). `@sentry/react-native` was also auto-bumped (7.2.0 → 7.11.0) — it's in Expo's compatibility map despite not being an `expo-*` package. `react-test-renderer` bumped manually to 19.2.0 (must match `react` exactly; not Expo-managed).
- **Root cause found — `pnpm-workspace.yaml` had workspace-wide `overrides` hard-pinning `react: 19.1.0`, `react-native: 0.81.5`, `@types/react: ~19.1.4`**, silently reverting every `expo install`/`pnpm add` I ran. Updated all three to the SDK 55-resolved versions. This also surfaced a stale devDependency pin (`react: 19.1.0`, `react-test-renderer: 19.1.0`) in `packages/supabase/package.json` causing duplicate React installations — bumped to 19.2.0 (user-approved).
- **Removed `patches/@expo__metro-runtime@4.0.1.patch`** (and its `pnpm-workspace.yaml` `patchedDependencies` entry) — fixed a CJS/ESM interop bug specific to `@expo/metro-runtime@4.0.1`'s exact file content; doesn't apply to the SDK 55-resolved `~55.0.12` (a completely different major version line). Verified no regression via full test suite + a clean `expo export` bundle (user-approved).
- **`react-native-worklets` deliberately kept at `0.8.3`** (not `expo install --fix`'s suggested `0.7.4`) — `react-native-reanimated@4.2.1`'s own peer range is `"0.7 - 0.8"`, so 0.8.3 is fully compatible, and only 0.8.3 ships the `jest/resolver.js` this project's jest config requires. Documented via `expo.install.exclude` in `apps/mobile/package.json` so a future `expo install --fix` doesn't silently regress it.
- **New Architecture (AC #3):** confirmed already active — `app.config.ts` has no `newArchEnabled` field (RN 0.81/SDK 54 default was already New Arch), and SDK 55 requires it unconditionally with no config-level opt-out remaining. No code change needed.
- **Native dependency audit (AC #5):** `@sentry/react-native` — auto-resolved via `expo install --fix`, no manual action needed; the intentionally-removed `@sentry/react-native/expo` config plugin was re-confirmed still the same sentry-cli-requiring plugin (its `app.plugin.js` re-exports `./expo`) and was NOT re-added. `@journeyapps/react-native-quick-sqlite` — flagged by `expo-doctor`'s React Native Directory check as "Untested on New Architecture"; researched and confirmed the package was upgraded upstream to support New Architecture/bridgeless mode via RN's interop layer, and PowerSync's own docs still list it as the default SQLite driver (not deprecated) — functionally verified via the full test suite (PowerSync/sync package tests all pass). Suppressed the directory-metadata warning via `expo.doctor.reactNativeDirectoryCheck.exclude`, documented inline. `@rn-primitives/portal` / `react-native-draggable-flatlist` — no compatibility warnings from `expo-doctor` or `pnpm install`, full test suite green; no version change needed.
- **`app.config.ts`:** added `expo-font` to `plugins` (newly required at SDK 55); deliberately did NOT add `@sentry/react-native`'s plugin (see above).
- **`metro.config.js`:** `watchFolders` was fully overwriting Expo's defaults (`= [workspaceRoot]`) instead of appending; changed to spread the existing default array plus the workspace root, clearing `expo-doctor`'s Metro config warning with no functional change (pnpm monorepo resolution still works).
- **Remaining `expo-doctor` findings (2), both intentional/accepted, not fixed:** (1) `@expo/config-plugins` flagged as "should not be installed directly" — the local `withIosScene27Compat` plugin needs `mergeContents` from `@expo/config-plugins/build/utils/generateCode`, which is NOT re-exported through `expo/config-plugins` (verified: `expo/config-plugins.js` is `module.exports = require('@expo/config-plugins')`, and `mergeContents` isn't part of that package's public top-level API in this version) — exactly the case `expo-doctor`'s own message says is fine to ignore. (2) `react-native-reanimated` "patch version mismatch" (4.2.3 found vs. 4.2.1 expected) — benign; 4.2.3 satisfies our own `~4.2.1` range and was resolved naturally during a full lockfile regeneration, not a hand-picked override.
- **Manual smoke test (AC #10) — partially deferred, as anticipated:** a live on-device/EAS-build smoke test was not attempted — this environment has no working iOS Simulator and EAS build credential setup requires a real interactive terminal (both confirmed prior limitations). As a substitute, ran `npx expo export --platform ios` — Metro successfully bundled the full app (2298 modules, all workspace packages including `packages/ui`, `packages/sync`'s PowerSync chain, Reanimated/gesture-handler/worklets) into a valid Hermes bytecode bundle with zero errors. **Trigger for the full manual smoke test: before the next `preview`/`development` build is distributed to testers or used for any on-device verification.**
- `pnpm turbo typecheck lint test`: 19/19 tasks green, 451/451 mobile tests (matches pre-upgrade baseline exactly, zero regressions).
- Did a full `pnpm-lock.yaml` regeneration (`rm pnpm-lock.yaml && pnpm install`) partway through — needed because incremental `pnpm add` calls plus the workspace-override fix left stale/duplicate resolutions (`expo-doctor`'s "duplicate dependencies" and "overridden dependencies" checks) that a plain `pnpm install` didn't reconcile.
- **AC #5 Sentry compatibility check — completed during code review (2026-09-28):** the original implementation pass accepted `expo install --fix`'s auto-bump of `@sentry/react-native` (7.2.0 → 7.11.0) without independently checking Sentry's own RN compatibility matrix, as AC #5 requires. Checked afterward: `getsentry/sentry-react-native`'s CHANGELOG for the full 7.3.0→7.11.0 range shows no breaking changes and no RN-version floor bump; `package.json`'s `peerDependencies.react-native` is `>=0.65.0` (admits 0.83.10); v7.9.0 actually fixed a New-Architecture-specific bug (duplicate iOS error reporting), making 7.11.0 more New-Arch-safe than 7.2.0, not less. No incompatibility found.
- **AC #7 Node floor re-check — completed during code review (2026-09-28):** the original implementation pass checked off Task 6 without recording a confirmed outcome. Confirmed via `expo.dev/changelog/sdk-55`: SDK 55 requires Node `^20.19.4` / `^22.13.0` / `^24.3.0` / `^25.0.0`. `apps/mobile/eas.json`'s `node: "22.13.0"` pin already satisfied this exactly (no change needed). Root `package.json`'s `engines.node` was `">=20.0.0"`, which permitted `20.0.0`–`20.19.3` — below the SDK 55 floor for the 20.x line — bumped to `">=20.19.4"`.

### File List

- `apps/mobile/package.json` (modified — dependency bumps, `jest.moduleNameMapper` addition, `expo.install.exclude`/`expo.doctor.reactNativeDirectoryCheck.exclude`)
- `apps/mobile/app.config.ts` (modified — added `expo-font` plugin, updated Sentry-plugin-exclusion comment)
- `apps/mobile/metro.config.js` (modified — `watchFolders` now appends to Expo's defaults instead of replacing them)
- `apps/mobile/metro.config.test.js` (new — code review, 2026-09-28: covers the `watchFolders` append behavior)
- `apps/mobile/app/(app)/settings/index.test.tsx` (modified — added `jest.mock('expo-notifications', ...)`)
- `packages/supabase/package.json` (modified — `react`/`react-test-renderer` devDependency pins bumped 19.1.0 → 19.2.0)
- `pnpm-workspace.yaml` (modified — `overrides` bumped to SDK 55 versions; removed the stale `@expo/metro-runtime@4.0.1` `patchedDependencies` entry)
- `patches/@expo__metro-runtime@4.0.1.patch` (deleted — stale, doesn't apply to the SDK 55-resolved metro-runtime version)
- `pnpm-lock.yaml` (regenerated from scratch)
- `_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md` (modified — version-pin table updated to SDK 55/RN 0.83.10, added upgrade-history note)

### Review Findings

- [x] [Review][Patch] AC #5 Sentry compatibility — record the now-completed verification in Completion Notes — the original gap was that `@sentry/react-native` `~7.2.0` → `~7.11.0` was accepted purely because `expo install --fix` auto-resolved it, with no independent check against Sentry's own RN compatibility matrix as AC #5 requires. **Resolved during review (2026-09-28):** checked `getsentry/sentry-react-native`'s CHANGELOG for the full 7.3.0→7.11.0 range and its `package.json` peer range (`react-native: >=0.65.0`) — no breaking changes, no RN-version floor bump, and v7.9.0 actually *fixed* a New-Architecture-specific bug (duplicate iOS error reporting), making 7.11.0 more New-Arch-safe than 7.2.0. No incompatibility found. Add this verification note to the story's Completion Notes List so the AC is satisfied on record, not just by the tool's silent success.
- [x] [Review][Patch] AC #7 Node floor — root `package.json`'s `engines.node` is below Expo SDK 55's actual floor — **Resolved during review (2026-09-28):** confirmed via `expo.dev/changelog/sdk-55` that SDK 55 requires Node `^20.19.4` / `^22.13.0` / `^24.3.0` / `^25.0.0`. `apps/mobile/eas.json`'s `node: "22.13.0"` pin (all 4 profiles) already satisfies this exactly — no change needed there. But root `package.json:7`'s `engines.node: ">=20.0.0"` permits `20.0.0`–`20.19.3`, which is below the SDK 55 floor for the 20.x line. Bump it to `>=20.19.4` and add the verification note to Completion Notes.
- [x] [Review][Patch] `@types/react` version pin drift between workspace override and `apps/mobile` — `pnpm-workspace.yaml:12` overrides `@types/react` to `~19.2.10` while `apps/mobile/package.json:78` declares `~19.2.18`. Verified this is **not** currently causing a wrong install (installed version is `19.2.18`, confirmed via `apps/mobile/node_modules/@types/react/package.json`, and it satisfies both ranges since `~19.2.10` and `~19.2.18` overlap below `19.3.0`) — but it's exactly the same class of override-vs-declaration drift this same commit explicitly root-caused and fixed for `react`/`react-native` elsewhere in `pnpm-workspace.yaml`. Align the override to `~19.2.18` (or later) to stop relying on coincidental range overlap.
- [x] [Review][Patch] `packages/supabase`'s `@types/react` devDependency left stale — `packages/supabase/package.json:26` still declares `^19.1.4`, unlike every other `@types/react`/`react` reference in this diff which moved to the 19.2.x line. Currently harmless (`^19.1.4` admits the workspace-resolved `19.2.18`), but it's a version-pin table that no longer reflects what's actually installed, in a diff whose whole point is keeping these pins accurate. Bump to match (e.g. `^19.2.0`).
- [x] [Review][Patch] `metro.config.js`'s new `watchFolders` spread has no automated verification path in the normal PR gate — `apps/mobile/metro.config.js:12` changed `config.watchFolders = [workspaceRoot]` to `config.watchFolders = [...config.watchFolders, workspaceRoot]`, which assumes `getDefaultConfig()`'s `watchFolders` is always an array. Currently true (verified against the installed `@expo/metro-config@55.0.27` source) so no live bug — but `metro.config.js` is excluded from `apps/mobile/tsconfig.json`'s `include` and nothing in the Jest config loads it, so `pnpm turbo typecheck lint test` (the standard PR gate) would never catch a future regression here. The only thing that exercises this file is the `e2e-build-apk` CI job, which is label-gated (`run-e2e`) on ordinary PRs and only runs unconditionally on push to `main`. **Fixed (2026-09-28):** added `apps/mobile/metro.config.test.js`, which mocks `expo/metro-config` (the real chain pulls in an ESM-only `yaml` dependency Jest's transform pipeline doesn't handle) and asserts the append behavior directly.
- [x] [Review][Defer] `app.config.ts`'s new `expo-font` plugin entry has the same CI-gating gap — [<apps/mobile/app.config.ts:50>] deferred: same root cause as the `metro.config.js` finding above (this file's plugin-resolution step only runs inside the label-gated `e2e-build-apk` job's `expo prebuild`), but closing it fully means un-gating `expo prebuild` for every PR — a broader CI-cost tradeoff (the 2026-09-24 `run-e2e` label-gating decision) that's out of scope for a one-line plugin addition in this story.

**Rejected**

- `false` — Blind Hunter: "worklets kept at 0.8.3 with no compatibility confirmation for the new RN/Reanimated pair stated in the diff." Refuted: the compatibility rationale is documented in this same commit's Completion Notes (`reanimated@4.2.1`'s peer range is `"0.7 - 0.8"`) and was independently re-verified against the installed package's own `compatibility.json`/`peerDependencies` by a separate reviewer — it just isn't inline in the (JSON) diff.
- `false` — Blind Hunter: "patch deletion (`patches/@expo__metro-runtime@4.0.1.patch`) carries no rationale in the diff." Refuted: the commit message and Completion Notes state the patch is version-specific and doesn't apply to the SDK 55-resolved `@expo/metro-runtime`; independently confirmed by inspecting the installed package — the file the patch touched was rewritten upstream to no longer need it.
- `false` — Blind Hunter: "no app version/build-metadata bump or note about needing a new native/EAS build." Refuted: `app.config.ts`'s `version` field is unrelated to EAS build-number handling in this project, and the actual distribution-safety concern (this SDK boundary being the last one safe to distribute before Story 16.2's transient Hermes regression) is already explicitly documented in Completion Notes with its own trigger condition.
- `false` — Verification Gap: "unclear whether the SDK-55-resolved `@expo/metro-runtime` still needs the deleted patch's fix." Refuted by a separate reviewer's direct inspection: the exact file the patch touched (`messageSocket.native.ts`) was rewritten upstream to use ESM imports and the global `WebSocket`, with no bare `require()` needing `.default` — genuinely obsolete, not silently dropped.
- `low` — Blind Hunter: "new Jest `moduleNameMapper` entry (`^react-native$`) has no explanatory comment." Not worth fixing as filed: `package.json` is strict JSON and cannot hold comments at all; the rationale (pnpm duplicate `react-native` instance under Jest) is recorded in `sprint-status.yaml` and the commit message, which is this repo's normal place for JSON-config rationale.
- `low` — Blind Hunter: "`expo.install.exclude`/`expo.doctor.reactNativeDirectoryCheck.exclude` entries undocumented in the config file." Not worth fixing as filed: same JSON-comment limitation as above; both exclusions are documented in Completion Notes as "documented intentional exceptions."
