---
title: 'Story 16.2: Upgrade Expo SDK from 55 to 57'
type: 'chore'
created: '2026-09-28'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-16-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md'
  - '{project-root}/.agents/skills/expo-upgrade/SKILL.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app is pinned to Expo SDK 55 (`react-native 0.83.10`). Epic 16 needs it moved to Expo SDK 57 to complete the upgrade. The intermediate SDK 56 stop carries a confirmed Hermes V1 memory regression affecting `react-native-worklets`/`react-native-reanimated` (both used here); the `expo-upgrade` skill's own guidance is to skip it entirely.

**Approach:** Bump `expo` directly to `expo@57.0.9` or a later `57.x` release (never below `.0.9`, never SDK 56) via `npx expo install expo@<version>` + `npx expo install --fix`. Migrate the app's one `@react-navigation/*` direct import to its `expo-router` equivalent (a breaking change introduced at SDK 56 that still applies crossing from 55 to 57), audit non-Expo-managed native dependencies, run `expo-doctor`, update `ADR-RN-VERSION.md`, and pass the full regression suite. This closes out Epic 16 — no further SDK hop follows.

## Boundaries & Constraints

**Always:**
- Use `npx expo install expo@<version>` + `npx expo install --fix` — never hand-pick Expo-managed dependency versions.
- Land on `expo@57.0.9` or later specifically — confirm the resolved version is not below `.0.9` before proceeding (earlier 57.x patches still carry the Hermes V1 regression).
- Run `npx expo-doctor` post-upgrade; fix or explicitly document every flagged issue in Implementation Notes.
- Run `pnpm turbo typecheck lint test` across the whole monorepo as the primary regression gate.

**Never:**
- Do not install or pass through SDK 56 as an intermediate step.
- Do not opt in or out of Hermes V1 — accept SDK 57's default (which resolves the regression at `.0.9`+ regardless).
- Do not adopt React Compiler, migrate to Native Tabs, or touch `expo-av` — none apply to this codebase.
- Do not change the `@powersync/react-native@1.34.0` pin unless required; if it must change, the PowerSync integration test suite must pass end-to-end first (`ADR-RN-VERSION.md` Upgrade Policy).

</frozen-after-approval>

## Code Map

- `apps/mobile/package.json` — current: `expo ~55.0.31`, `react-native 0.83.10`, `expo-router ~55.0.18`, `react 19.2.0`, `@sentry/react-native ~7.11.0`, `@journeyapps/react-native-quick-sqlite ^2.5.2`, `@rn-primitives/portal 1.4.0`, `react-native-draggable-flatlist ^4.0.3`, `@react-navigation/native ^7.0.0`. All Expo-managed deps get bumped via `expo install --fix`; the four non-Expo-managed ones need individual compatibility checks (same pattern as Story 16.1).
- `apps/mobile/app/_layout.tsx:3` — `import { DefaultTheme, ThemeProvider } from '@react-navigation/native'`. Breaking change introduced at SDK 56 (still applies crossing 55→57): Expo Router no longer depends on React Navigation; direct `@react-navigation/*` imports must move to `expo-router/react-navigation` (see mapping table in `references/react-navigation-to-expo-router.md`). This is the only direct `@react-navigation/*` import anywhere in `apps/mobile` (confirmed via repo-wide grep) — `expo-codemod sdk-56-expo-router-react-navigation-replace` can do the rewrite, or it can be hand-edited given it's a single file/two symbols.
- `apps/mobile/app/_layout.test.tsx:22` — `jest.mock('@react-navigation/native', ...)` must be updated to mock whatever module `_layout.tsx` imports from after the migration.
- `apps/mobile/package.json` — after migration, check whether `@react-navigation/native` is still needed as a direct dependency (it may remain a transitive peer of `expo-router`); remove the direct entry only if `expo-doctor`/install confirms it's unused and not a required peer.
- `_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md` — version-pin table currently reads `React Native 0.83.10` / `Expo SDK 55` / `Expo Router ~55.0.18`; update to actually-installed SDK 57 versions and note the epic is now complete (this is the final hop).
- `apps/mobile/eas.json` (4 build profiles, currently `node: "22.13.0"`) and root `package.json` (`engines.node: ">=20.19.4"`) — re-check against SDK 57's actual Node floor at implementation time via the SDK 57 changelog.
- `.agents/skills/expo-upgrade/references/react-navigation-to-expo-router.md` — migration steps and mapping table for the breaking change above.
- `.agents/skills/expo-upgrade/SKILL.md` — "If upgrading from SDK 55 or earlier, skip SDK 56 and upgrade directly to SDK 57. Don't use expo@57.0.8 or below." — the source of this story's direct-jump approach.
- Confirmed N/A (checked during spec creation, don't re-investigate): `expo-av` (zero usage), Native Tabs (app uses `<Tabs>`/`<Tabs.Screen>` from `expo-router`, not `expo-router/unstable-native-tabs`), React 19 migration checklist (already on React 19).

## Tasks & Acceptance

**Execution:**
- [ ] `apps/mobile/package.json` -- bump `expo` to `expo@57.0.9` or later via `expo install` + `expo install --fix`, confirming the resolved version is not below `.0.9` -- aligns all Expo-managed deps to SDK 57 in one hop, skipping SDK 56
- [ ] `apps/mobile/app/_layout.tsx`, `apps/mobile/app/_layout.test.tsx` -- migrate `@react-navigation/native` import (`DefaultTheme`, `ThemeProvider`) to its `expo-router` equivalent, update the test mock to match -- required breaking change from crossing the SDK 56 boundary
- [ ] `apps/mobile/package.json` -- remove `@react-navigation/native` direct dependency if no longer directly imported and not a required peer (verify via `expo-doctor`) -- housekeeping per the migration guide
- [ ] `@sentry/react-native`, `@journeyapps/react-native-quick-sqlite`, `@rn-primitives/portal`, `react-native-draggable-flatlist` -- individually check SDK 57's bundled React Native/New Architecture compatibility, bump only if required -- these are not touched by `expo install --fix`
- [ ] Run `npx expo-doctor` -- fix or document every flagged issue
- [ ] `_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md` -- update version-pin table to actually-installed post-upgrade versions, note the epic is complete
- [ ] `apps/mobile/eas.json`, root `package.json` -- re-verify Node floor against SDK 57's actual requirement, bump if the current pins fall below it
- [ ] Run `pnpm turbo typecheck lint test` -- fix any regression across every package, not just `apps/mobile`
- [ ] Attempt a manual on-device/EAS-build smoke test (sign-in, home screen load, start one ERP session); if blocked by this environment's known iOS Simulator/EAS-terminal limitations, log the deferral explicitly in Implementation Notes

**Acceptance Criteria:**
- Given the app is pinned to `expo ~55.0.31` / `react-native 0.83.10`, when this story is implemented, then `expo` is bumped directly to `expo@57.0.9` or a later `57.x` release (confirmed not below `.0.9`, and SDK 56 is never installed as an intermediate step), with every Expo-managed dependency aligned via `expo install --fix`
- Given SDK 56 removed Expo Router's dependency on React Navigation, when this story is implemented, then no source file in `apps/mobile` imports directly from `@react-navigation/*` (verified by repo-wide search), and the app's theming (`DefaultTheme`/`ThemeProvider`) continues to work identically
- Given `npx expo-doctor` is the standard post-upgrade diagnostic, when this story is implemented, then it reports no unresolved issues — each flagged issue is fixed or explicitly triaged with a documented reason
- Given four native dependencies are not managed by `expo install --fix`, when this story is implemented, then each is checked against SDK 57's bundled React Native version and bumped only if required, with the check's outcome recorded
- Given `ADR-RN-VERSION.md` pins the current stack, when this story is implemented, then its version-pin table reflects the actually-installed post-upgrade versions and notes Epic 16 is complete
- Given this repo has no `android/`/`ios/` directories today, when this story is implemented, then this remains true afterward (any local `expo prebuild` output is deleted, not committed)
- Given `pnpm turbo typecheck lint test` is this monorepo's standard gate, when this story is implemented, then it passes clean across every package with zero regressions versus the pre-upgrade baseline
- Given `expo@57.0.9`+ resolves the Hermes V1 memory regression entirely, when this story is implemented, then no code change opts in or out of Hermes V1, and any build produced at this stop is safe for normal distribution (no internal-only restriction, unlike the original 55→56→57 plan)

## Implementation Notes

## Spec Change Log

- 2026-09-28: Re-scoped from "Upgrade Expo SDK from 55 to 56" to "Upgrade Expo SDK from 55 to 57" (direct jump) before approval, per explicit user decision after reviewing the `expo-upgrade` skill's guidance to skip SDK 56 entirely (Hermes V1 memory regression). Original 55→56 spec superseded; Story 16.3 (56→57) retired and folded into this story. No prior review loop — this is the initial draft.

## Review Triage Log

## Verification

**Commands:**
- `npx expo-doctor` -- expected: no unresolved issues (each flagged item fixed or documented)
- `pnpm turbo typecheck lint test` -- expected: all tasks pass, test count matches or exceeds the pre-upgrade baseline (452/452 mobile tests as of Story 16.1)
- `grep -rn "@react-navigation" apps/mobile --include="*.ts" --include="*.tsx"` -- expected: zero matches outside of comments/`package.json`
- `npx expo export --platform ios` -- expected: clean bundle build (zero errors), as a substitute smoke test if on-device/EAS verification remains blocked

**Manual checks (if no CLI):**
- If an EAS development/preview build is reachable: sign in, load the home screen, start one ERP session — confirm no visual or behavioral regression versus the SDK 55 baseline
