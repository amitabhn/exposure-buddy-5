# Deferred Work

## Deferred from: Epic 2 retrospective (2026-05-26) — Epic 9 candidates

- **OTP consent-flow test coverage** — New branches in `otp-verification.tsx` introduced across Stories 2.2 and 2.4 have zero test coverage: consent write success path, consent write failure + retry path, pending deletion guard path. Two stories deferred this independently. Target: Epic 9 quality story. [`apps/mobile/app/(auth)/otp-verification.tsx`]

- **`packages/supabase` React test infrastructure** — `AuthProvider` has no unit tests because `@testing-library/react` + jsdom is not configured in the package. The D1 fix in Story 2.4 (injected `dpoService` prop) requires a test asserting `requestErasure` is called with the correct `userId`. Add test infra and coverage in the next infrastructure story. [`packages/supabase/src/auth/AuthProvider.tsx`]

## Deferred from: code review of 2-4-account-deletion-and-session-sign-out (2026-05-24)

- **W1: `pending_deletion_request` MMKV key never cleared** — Intentional MVP design; the MMKV flag persists on-device until Epic 3's `/dpo/erase-user` Edge Function clears it on server-side confirmation. Documented cross-device limitation: a different device won't have the key and can log in (server-side guard is Epic 3). [`packages/supabase/src/auth/session.ts`]

- **W2: DPO email `privacy@exposure-buddy.com` hardcoded in two files** — `DeleteAccountModal.tsx` uses a module-level `DPO_EMAIL` constant; `otp-verification.tsx` inlines the literal. No single source of truth. Story 3.5 Privacy Notice will introduce a centralised DPO contact constant. [`apps/mobile/src/components/settings/DeleteAccountModal.tsx`, `apps/mobile/app/(auth)/otp-verification.tsx`]

- **W3: `pending_deletion_request` stored in unencrypted MMKV** — Contains `userId` and ISO timestamp in plaintext. Pre-existing architectural choice (SecureStore is already used for auth tokens; MMKV stores app state). Story 9-4 (MMKV key hygiene and storage audit) is the correct remediation vehicle. [`packages/supabase/src/auth/AuthProvider.tsx`]

- **W4: `DpoServiceStub` used as production implementation in `AuthProvider`** — The stub (writes only to MMKV, no server call) is the intentional pre-Epic 3 path. No account is actually deleted from Supabase until Epic 3 wires the real `/dpo/erase-user` Edge Function. [`packages/supabase/src/auth/AuthProvider.tsx:106`]

- **W5: `PendingDeletionRecord.status` only allows literal `'pending'`** — No state machine for `cancelled` or `completed` states. Breaking type change required when Epic 3 introduces server-side deletion acknowledgement. [`packages/core/src/services/IDpoService.ts:3`]

- **W6: `signOut` exported as standalone from `packages/supabase` requiring caller-managed MMKV** — Public API exposes a function that requires the caller to supply the MMKV instance directly. Callers outside `AuthProvider` risk runtime errors if they pass the wrong MMKV instance. Pre-existing pattern; revisit when the auth module's public API is hardened. [`packages/supabase/src/index.ts`]

- **W8: Unit test for `AuthProvider.requestAccountDeletion` injection seam** — The D1 patch added `dpoService?: IDpoService` prop injection to `AuthProvider`. A unit test asserting that `requestErasure` is called with the correct `userId` when the prop is supplied requires React component testing (`@testing-library/react` + jsdom) which is not configured in `packages/supabase`. Add test infra and the test in the next infrastructure story. [`packages/supabase/src/auth/AuthProvider.tsx`]

- **W7: `isAuthenticated` / `authState.userId` brief timing divergence** — `isAuthenticated` is derived from `session !== null` while the deletion guard checks `authState.userId`. Brief window on bootstrap where session is non-null but `userId` may not yet be populated. Pre-existing bootstrap race from Story 2.1; not introduced by this PR. [`packages/supabase/src/auth/AuthProvider.tsx`]

## Deferred from: code review of 2-2-account-creation-safety-checkboxes (2026-05-24)

- **W1: Duplicate consent-write logic / retry timestamp differs** — `ConsentRecord` constructed inline in two places; retry timestamp differs from original attempt. Refactor into a helper when Epic 3 wires real service. [otp-verification.tsx:101–108, 132–139]

- **W2: `consentError` indistinguishable from OTP error; Verify button label confusing during retry** — Both errors use `styles.errorText`; button still reads "Verify" on consent-retry. UX improvement; address in a polish pass.

- **W3: Consent bypass via client-only `isNewAccount` param** — No server-side enforcement; Epic 3 Edge Function provides the guard (AC7 production gate).

- **W4: Missing test coverage for OTP consent flow** — New branches in `otp-verification.tsx` (consent write success/failure/retry) have no tests. Epic 9 candidate.

- **W5: ✓ checkmark Unicode cross-platform rendering** — May differ across font stacks; consider vector icon in a polish story. [SafetyCheckboxes.tsx:27, 41]

- **W6: `SafetyCheckboxes` intro `<Text>` lacks `accessibilityRole`** — Low severity; announce as plain text. [SafetyCheckboxes.tsx:16]

- **W7: Deep-link `isNewAccount` param fragility** — Expo Router URL reconstruction could drop the param; revisit when deep-linking is added.

- **W8: `emitAccountCreated` else-branch navigates without `userId` guard** — Pre-existing from Story 2.1; inconsistency vs. new `isNewAccount` branch. [otp-verification.tsx:118]

## Deferred from: simulator testing of 2-2-account-creation-safety-checkboxes (2026-05-24)

- **ENV-1: React Native version drift blocks local simulator builds** — Project has `react-native@0.81.6` but Expo SDK 54 expects `0.81.5`. On this machine (Xcode 16 / Apple Clang 16), this causes a `getDevServer is not a function` crash during lazy bundle init, preventing `AppRegistry.registerComponent` from running. Fix: pin `react-native` to `0.81.5` in `apps/mobile/package.json`, or upgrade to Expo SDK 55+ which supports 0.81.6. Also affects: `react@19.1.4` vs expected `19.1.0`, `expo-localization@56.0.5` vs `~17.0.8`, `expo-splash-screen@0.29.24` vs `~31.0.13`. [apps/mobile/package.json]

## Deferred from: code review of 1-7-data-foundation-supabase-mmkv-and-powersync-adapter-scaffold (2026-05-23)

- **W1: In-memory `_pending` outbox** — `PowerSyncSyncAdapter` holds queued entries in a plain array; all entries lost on app restart. Documented scaffold behavior; real durability wired in Epic 6. [`packages/sync/src/adapter.ts`]

- **W2: `zod ^4.4.3` vs spec's `^3`** — zod 4.x is now the stable `latest` on npm; the spec predated v4 GA; no functional regression in CI. Update the Dev Notes version table in the next story. 

- **W3: AES-256 key entropy under-provisioned** — `crypto.randomUUID().replace(/-/g, '')` yields 16 bytes (128 bits); AES-256 requires 32 bytes. The `encryptionType: 'AES-256'` claim may be incorrect. Address in Epic 9 MMKV key hygiene (story 9-4). [`packages/supabase/src/auth/session.ts`]

- **W4: `resolveConflict` stub has no guard** — returns `_remote` with no "not implemented" signal; future callers cannot distinguish scaffold from intentional policy. Acceptable at scaffold stage; Epic 6 hardens. [`packages/sync/src/utils/conflict.ts`]

- **W5: `supabase-import-gate` CI step hardcodes scanned directories** — new packages silently bypass the boundary check. Fix in Epic 9 or next CI cleanup story. [`.github/workflows/ci.yml`]

- **W6: `email` column in `public.users` duplicates `auth.users.email` with no sync trigger** — stale on email change. Pre-existing design choice; no trigger migration in scope this story. [`supabase/migrations/0001_users.sql`]

- **W7: Clinician stub test runs live assertions** — 4th test in `users.test.ts` signs in as User B and performs an active cross-user read; AC2 describes the slot as "empty (ARC-007 deferred)". Functionally validates cross-user blocking; disputable AC interpretation. [`packages/supabase/__tests__/rls/users.test.ts`]

## Deferred from: code review of 1-6-developer-infrastructure-i18n-scaffold-and-accessibility-gates (2026-05-22)

- **i18n side-effect import mid-block** — `import '../src/i18n'` placed between other imports in `_layout.tsx`; import auto-fixers (e.g. `import/order` eslint rule) could reorder it and silently break i18n init sequence. Add an explicit comment anchor or move to a designated side-effect block. [apps/mobile/app/_layout.tsx:7]

- **useFocusOnMount stale reduced:true boot value** — AnimationContext initialises `reduced: true` as a fail-safe before `isReduceMotionEnabled` resolves asynchronously; `useFocusEffect` may fire during this window, causing `setAccessibilityFocus` to be called even when the user hasn't enabled reduced motion. Requires an `isReady` / `loaded` flag in AnimationContext. Pre-existing AnimationContext design from Story 1.5. [apps/mobile/src/hooks/useFocusOnMount.ts:17, apps/mobile/src/contexts/AnimationContext.tsx]

- **useFocusEffect no cleanup** — Callback returns no cleanup function; if back-navigation or unmount interrupts before TalkBack processes the focus, the stale handle is a no-op at best, accessibility service crash at worst on some Android versions. Low risk at scaffold stage; address when the hook is used in real screens. [apps/mobile/src/hooks/useFocusOnMount.ts:18]

## Deferred from: code review of 1-5-motion-layout-and-mode-foundations (2026-05-22)

- **ADR unverified MVP scope claim** — "No Epic 2–7 screen requires CalmMeButton above native system UI" is asserted without citation. Validate against each epic's feature list before the In-the-moment sprint begins. [ADR-CALMME-RENDER.md]

- **Story 1.2 evaluation not summarised inline in ADR** — The ADR cross-references Story 1.2 completion notes but does not reproduce key findings inline. Future readers must navigate to a separate artifact to verify the evaluation. Acceptable for MVP; revisit if ADR becomes a standalone document. [ADR-CALMME-RENDER.md]

- **No sign-off enforcement gate before Epic 7** — ADR must be signed before the In-the-moment sprint; no automation reminds the team. Add a CI check or sprint planning checklist item before Epic 7 kicks off. [ADR-CALMME-RENDER.md]

- **No Alternatives Considered for `@rn-primitives/portal` vs React Native `Modal`** — Only `@gorhom/bottom-sheet` vs `@rn-primitives/portal` was evaluated. RN's built-in `Modal` (transparent + `animationType="none"`) was not explicitly rejected. Low risk given the portal-first architecture decision; document if challenged. [ADR-CALMME-RENDER.md]

- **`surface.secondary` (#EBF0EE) missing from Preparation token table** — `theme.ts` tags `surface.secondary` as "cards, sheets, preparation register" but the brief's Token Surface table omits it. Preparation card/sheet components will need to infer the correct surface. Add in the story that introduces the first Preparation card component. [docs/ux/mode-briefs/preparation.md]

- **2-second In-the-moment SLA underspecified** — Start event (tap-down vs tap-up), reach definition (first frame vs interactive), and reference device (e.g. "2GB RAM Android 10") are not defined. Specify in the SLA section before Epic 7 performance testing begins. [docs/ux/mode-briefs/in-the-moment.md]

- **`reflect.background` vs `surface.primary` in mixed-mode screens** — No guidance on which background token to use when a screen transitions between Reflection and another mode. Clarify when the first mixed-mode screen is designed. [docs/ux/mode-briefs/reflection.md]

## Deferred from: code review of 1-4-token-system-and-typography-architecture (2026-05-21)

- **DMSerifDisplay_400Regular (non-italic) loaded but no token uses it** — Spec-compliant load; no existing token references the upright face. Reserve for a future typography token (e.g. a non-italic `display` variant). [apps/mobile/app/_layout.tsx:13]

- **ESLint groundingTokens rule misses import paths 3+ levels deep and non-standard file naming** — Relative paths `../tokens/theme` and `../../tokens/theme` covered; `../../../tokens/theme` and deeper escape the rule. Non-conventional file names (e.g. `grounding-context.ts`) also bypass the glob. Low risk while packages/ui is shallow; revisit if nested directory structure grows. [packages/ui/.eslintrc.js]

- **ESLint rule scope limited to packages/ui — apps/mobile Context/Provider files unprotected** — The `no-grounding-token-in-context` rule lives in `packages/ui/.eslintrc.js` and has no effect on `apps/mobile`. Any `GroundingContext.tsx` created in the app package can import `groundingTokens` without ESLint error. Add an equivalent `overrides` block to `apps/mobile/.eslintrc.js` when Context/Provider files are created there. [packages/ui/.eslintrc.js]

- **accent.grounding (4.37:1) — no machine-enforceable normal-text-use constraint** — Constraint is advisory (token comment + WCAG sign-off doc). No lint rule or TypeScript enforcement prevents misuse on normal body text. Consider a design-system lint rule targeting `color.accent.grounding` in Text-style positions when the component library matures. [packages/ui/src/tokens/theme.ts:23]

- **accent.progress decorative-only — advisory comment only, no enforcement** — No rule prevents `accent.progress` being used as a `<Text>` foreground color. Enforce via design-system lint or a wrapped colour type when the component primitives layer is built. [packages/ui/src/tokens/theme.ts:22]

- **DmSerifSurface type is voluntary — typography.display and typography.narrative spread freely** — The type guard documents the constraint but does not prevent access. A component-level wrapper (e.g. `<DmSerifText surface={…}>`) that validates the `DmSerifSurface` union at the JSX boundary would give compile-time enforcement. Defer until the primitive component layer is built. [packages/ui/src/tokens/theme.ts]

- **No timeout fallback if expo-font hangs indefinitely** — If `useFonts` never resolves (network failure, slow device), the splash screen is permanently displayed. Add a `setTimeout(() => SplashScreen.hideAsync(), 5000)` fallback in a follow-up story covering defensive app-shell resilience. [apps/mobile/app/_layout.tsx:42-44]

- **fontError not reported to Sentry** — Font load failures are silent in production. Wire `fontError` into `Sentry.captureException` when full Sentry integration is implemented. [apps/mobile/app/_layout.tsx:34-38]

- **PortalHost unmounted during null-return font-loading phase** — Portals triggered before fonts load (deep links, push notifications) have no host to mount into and will silently disappear. Address when portal consumers are implemented and the startup sequence is hardened. [apps/mobile/app/_layout.tsx:46]

## Deferred from: code review of 1-2-ui-library-evaluation-rn-primitives-and-bottom-sheet (2026-05-21)

- **`react-dom@18.3.1` cross-major + Expo web bundling risk** — `@radix-ui/react-dialog` imports `react-dom` only for its web render path; on a native Metro build this is excluded. If an Expo web target is added, the web build will get a `react-dom@18` + `react@19` cross-major mismatch. Revisit before adding Expo web. [docs/decisions/ui-library-evaluation.md: Section 1]

- **`@rn-primitives/*` as `dependencies` vs `peerDependencies`** — Listed as hard `dependencies` in `packages/ui/package.json`. In a publishable shared package, these should be `peerDependencies`. Benign in this internal monorepo with pnpm workspace deduplication, but revisit if `@exposure-buddy/ui` is ever extracted or published. [packages/ui/package.json]

- **Metro cold-start not verified on a running dev server** — Evaluation confirmed `pnpm turbo build` passes but a running Metro dev server was not available. Verify no new cold-start warnings when a dev build is available in Story 1.3. [docs/decisions/ui-library-evaluation.md: Section 4]

- **`zustand` deduplication fragile on future direct adoption** — `@rn-primitives/portal` owns `zustand@5.0.x` as a runtime dep. If any future workspace package adds a direct `zustand` dep at a conflicting range, two zustand instances will be installed, isolating portal's store. Review when zustand is first adopted directly. [packages/ui/package.json]

- **`@radix-ui/react-dialog` web-only code bundled on Expo web target** — Not in Phase 1 scope. Revisit before adding an Expo web build target. [pnpm-lock.yaml]

## Deferred from: code review of 1-1-monorepo-initialisation-mobile-app-shell-and-build-pipeline (2026-05-21)

- **`turbo.json` `.env*` cache input may expose secrets to Turbo Remote Cache** — `"inputs": ["$TURBO_DEFAULT$", ".env*"]` in `turbo.json` causes `.env` file contents to be hashed into Turbo's content-addressed cache key. If Turbo Remote Cache is ever enabled (`TURBO_TOKEN`), these hashes could leak into remote cache metadata. Revisit before enabling remote caching. [turbo.json:7]

- **`web-import-gate` does not account for future `apps/` directories** — the grep scope in `ci.yml` is limited to `apps/mobile/src apps/mobile/app packages/`; new `apps/` directories added in later phases (e.g., `apps/desktop`) would not be checked for `apps/web` imports. Low risk at current project size but should be widened when a second app is added. [.github/workflows/ci.yml:63]

- **`typecheck` CI job rebuilds from scratch on fresh runners** — `pnpm turbo typecheck` depends on `build` outputs that live on a different runner; there is no Turbo Remote Cache configured, so the build is re-run from scratch on the typecheck runner. Makes `needs: [build]` ordering redundant and doubles CI time. Address when Turbo Remote Cache is configured. [.github/workflows/ci.yml:117]
