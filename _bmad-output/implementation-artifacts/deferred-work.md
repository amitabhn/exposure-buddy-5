# Deferred Work

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
