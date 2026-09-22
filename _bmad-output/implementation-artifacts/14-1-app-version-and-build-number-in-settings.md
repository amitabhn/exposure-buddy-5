# Story 14.1: Surface App Version & Build Number in Settings

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a beta tester or team member,
I want to see exactly which app version and build number I'm running,
so that I can report feedback/bugs against a specific, identifiable build instead of an ambiguous "the app."

## Context

Added 2026-09-22 after the first ad hoc EAS `preview`-profile Android build was distributed to beta testers — there was no way for a tester or the team to know which build a piece of feedback referred to. Full epic rationale: `_bmad-output/planning-artifacts/epics.md` → "Epic 14: App Build Versioning & Identification".

**Scope boundary (do not exceed):** this story adds a visible build identifier only. It does NOT add release automation, CI-driven version bumping, or an in-app changelog/release-notes surface — those are explicitly out of scope for Epic 14 and would need their own future story.

## Acceptance Criteria

1. `apps/mobile/eas.json`'s `cli` block explicitly sets `"appVersionSource": "remote"`, silencing the `cli.appVersionSource is not set` warning EAS currently prints on every build (confirmed live during the 2026-09-22 `preview` build run). This makes explicit the versioning source of truth that was previously an implicit legacy default — EAS continues auto-incrementing Android `versionCode` / iOS `buildNumber` per build, unchanged in practice.
2. `apps/mobile/app.config.ts`'s `version: '1.0.0'` field gets a short comment documenting the manual semver-bump convention (bump before any build intended for external distribution). No bump automation is added — this is a documentation-only change to that field.
3. `expo-application` is added as a dependency of `apps/mobile` (installed via `npx expo install expo-application` so the SDK-compatible version is resolved automatically — do not hand-pick a version number).
4. `SettingsScreen` (`apps/mobile/app/(app)/settings/index.tsx`) renders a new, non-interactive row at the bottom of the screen, below the existing "Privacy" section, reading `{version} ({build})` (e.g. `1.0.0 (42)`), sourced from `Application.nativeApplicationVersion` and `Application.nativeBuildVersion` (from `expo-application`).
5. When `EXPO_PUBLIC_APP_VARIANT` is not `production`, the same row appends ` · {variant}` (e.g. `1.0.0 (42) · preview`). Production builds show only `{version} ({build})` — no variant suffix ever appears to end users.
6. The row has a single, complete `accessibilityLabel` (e.g. "App version 1.0.0, build 42, preview") distinct from its visible text — not left to screen readers concatenating adjacent text nodes.
7. Three new i18n keys — `settings.about.versionLabel`, `settings.about.variantSuffix`, `settings.about.versionAccessibilityLabel` — are added to both `apps/mobile/src/i18n/locales/en.json` and `hi.json` (English copy duplicated into `hi.json`, per established convention — no raw string literals in the changed component).
8. `apps/mobile/app/(app)/settings/index.test.tsx` gets a `jest.mock('expo-application', ...)` with fixed test values, plus tests asserting: (a) the row renders `{version} ({build})` with no suffix under a production-like mock, and (b) the ` · preview` suffix appears when `EXPO_PUBLIC_APP_VARIANT` is mocked as `preview`.
9. `pnpm turbo typecheck lint test` passes clean with no regressions to `SettingsScreen`'s existing tests.

## Tasks / Subtasks

- [ ] Task 1 — EAS/version-source config (AC: #1, #2)
  - [ ] Add `"appVersionSource": "remote"` to `apps/mobile/eas.json`'s `cli` block
  - [ ] Add the semver-bump-convention comment above `version` in `apps/mobile/app.config.ts`
- [ ] Task 2 — Add native version-reading dependency (AC: #3)
  - [ ] Run `npx expo install expo-application` from `apps/mobile`
- [ ] Task 3 — i18n keys (AC: #7)
  - [ ] Add `settings.about.versionLabel`, `settings.about.variantSuffix`, `settings.about.versionAccessibilityLabel` to `en.json`
  - [ ] Duplicate the same English copy into `hi.json`
- [ ] Task 4 — Settings screen row (AC: #4, #5, #6)
  - [ ] Read `Application.nativeApplicationVersion` / `Application.nativeBuildVersion` in `SettingsScreen`
  - [ ] Render the new row below the "Privacy" section using the existing `styles.row` / `styles.rowText` pattern (plain `Text`, not `TouchableOpacity` — nothing to tap)
  - [ ] Append the ` · {variant}` suffix only when `process.env.EXPO_PUBLIC_APP_VARIANT !== 'production'`
  - [ ] Set the row's `accessibilityLabel` from `settings.about.versionAccessibilityLabel` with full interpolated text
- [ ] Task 5 — Tests (AC: #8, #9)
  - [ ] Add `jest.mock('expo-application', ...)` to `settings/index.test.tsx`
  - [ ] Add the two new assertions (default/no-suffix, and preview-suffix)
  - [ ] Run `pnpm turbo typecheck lint test` and confirm zero regressions

## Dev Notes

### Files being modified (current state, read in full during story creation)

- **`apps/mobile/eas.json`** — `cli` block currently only has `{"version": ">= 7.0.0"}`, no `appVersionSource` key. Four build profiles exist (`development`, `preview`, `production`, `e2e`); none override `appVersionSource` per-profile, so setting it once at the top-level `cli` block covers all of them.
- **`apps/mobile/app.config.ts`** — single `ExpoConfig` object, `version: '1.0.0'` is a plain top-level field, no android `versionCode` / ios `buildNumber` fields present anywhere in the file (confirms `appVersionSource: "remote"` is the correct choice — there's no local value to conflict with).
- **`apps/mobile/app/(app)/settings/index.tsx`** — functional component, `ScrollView` root, existing sections are "the reminders/sign-out block" then a `sectionTitle` "Privacy" then two rows (Privacy Notice link, Delete my account). The new version row is the last element before the `</ScrollView>` close and the `DeleteAccountModal`. Existing style tokens to reuse: `styles.row` (padding + hairline bottom border), `styles.rowText` (16px, `color.content.primary`). No new `sectionTitle` needed — this is a single trailing row, not a new section, per the epic's story text.
- **`apps/mobile/app/(app)/settings/index.test.tsx`** — mocks `react-i18next` (identity `t()`), `expo-router`, `@exposure-buddy/supabase`'s `useAuth`, and the `DeleteAccountModal` component. `expo-application` has no existing mock and must be added following the same `jest.mock(...)` pattern already used for the other four.

### Reading the version/build values

- Use `expo-application`'s `Application.nativeApplicationVersion` (matches `app.config.ts`'s `version` string at build time) and `Application.nativeBuildVersion` (the EAS-managed native build number — Android `versionCode`, iOS `buildNumber` as a string).
- Do NOT use `expo-constants`'s `Constants.expoConfig.version` for the *build number* — that only reflects config-time `version`, not the EAS-remote-managed native build number this story exists to surface. `expo-constants` stays used elsewhere in the app for other purposes; this story doesn't touch that.
- `EXPO_PUBLIC_APP_VARIANT` is already read elsewhere in the codebase at runtime via `process.env.EXPO_PUBLIC_APP_VARIANT` — reuse that same access pattern (`development` / `preview` / `production`), don't introduce a new env-reading mechanism.
- **Caveat:** `Application.nativeApplicationVersion`/`nativeBuildVersion` reflect the actual compiled native binary and can return `null` when running under plain Expo Go (no real native build). This project already uses `expo-dev-client`, so any dev/preview/production EAS build has a real native binary and real values — this only matters if someone runs bare `expo start` without a dev-client build. Not a bug to fix in this story; render `null` values as-is (or a simple fallback dash) rather than adding special-case handling.

### i18n convention (established, do not deviate)

Every user-facing string must go through `t()` — CI-lint enforced (`eslint-plugin-i18next`). Hindi (`hi.json`) currently duplicates English copy for all newer keys pending Story 9.9's full localisation pass (established precedent since Story 6.2-B / 12.2) — do the same here, do not attempt real Hindi translation.

### Testing standard

Mobile tests run under Jest + `@testing-library/react-native` (`apps/mobile` is the only package in this monorepo with that set up). Follow the existing `jest.mock()` style in `settings/index.test.tsx` exactly — inline factory functions returning fixed values, no test-utils indirection.

### Explicitly out of scope (do not implement)

- CI-driven or automated semver bumping of `app.config.ts`'s `version` field
- An in-app changelog / release-notes screen
- Any change to how `versionCode`/`buildNumber` are computed beyond making the existing implicit EAS-remote behavior explicit via `appVersionSource`

### Project Structure Notes

- No new files are created by this story — every change is to an existing file (`eas.json`, `app.config.ts`, `settings/index.tsx`, `settings/index.test.tsx`, `en.json`, `hi.json`) plus one new npm dependency (`expo-application`) in `apps/mobile/package.json`.
- No conflicts with monorepo boundary rules (ARC-006/ARC-011/ARC-013) — this story touches only `apps/mobile`, no `packages/*` changes.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` § "Epic 14: App Build Versioning & Identification" / "Story 14.1"]
- [Source: `apps/mobile/eas.json`]
- [Source: `apps/mobile/app.config.ts`]
- [Source: `apps/mobile/app/(app)/settings/index.tsx`]
- [Source: `apps/mobile/app/(app)/settings/index.test.tsx`]
- [Source: `apps/mobile/package.json` — `expo-constants` `~18.0.13`, Expo SDK `~54.0.0`]

## Dev Agent Record

### Agent Model Used

_(to be filled in by dev-story)_

### Debug Log References

### Completion Notes List

### File List
