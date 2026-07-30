# Story 12.1: Sign-In/Sign-Up Screen — UI/UX Enhancements

**Status:** done

## Story

As a new or returning user opening the sign-in screen,
I want a cleaner, less form-heavy entry point,
So that creating an account or signing in feels quick and modern rather than like filling out a form (FR-UXENH-01).

*Source: Claude Design project "Exposure Buddy" — `Sign In Options.dc.html` plus a dedicated `design_handoff_sign_in/` folder (`1c-sign-in.html` high-fidelity reference + a written `README.md` handoff spec mapping every design element to the existing `sign-in.tsx` reducer/state), imported via the `claude_design` MCP. Second story in Epic 12 to leave placeholder state, alongside Story 12.2 (Home), both 2026-07-30.*

---

## Acceptance Criteria

See the full Given/When/Then acceptance criteria under Story 12.1 in `_bmad-output/planning-artifacts/epics.md` (Epic 12). Summary:

1. All existing functional logic (`State`/`Action`/`reducer`, validation, error classification, the `isAuthenticated` redirect effect, DPDPA consent-write retry, dev test-user shortcut) is unchanged — visual/layout simplification only, per the handoff README's explicit instruction.
2. Three stacked tab rows (mode / identifier-type / auth-method) are consolidated into one identifier-type pill switch + two inline text links (auth-method toggle, mode toggle) — same underlying actions/guards, different UI.
3. Title becomes mode-variant ("Welcome to {{appName}}" / "Welcome back"); the separate subtitle line is removed.
4. Identifier field becomes an underlined field with example-format placeholders; its accessibility label is unchanged.
5. Password field gets an uppercase label above it instead of a placeholder (avoids screen readers reading placeholder text for a masked field).
6. Primary button restyled to a green pill with a decorative "→" glyph — button label logic (3 distinct translation keys per branch) is unchanged, despite the mockup showing a generic "Continue".
7. Layout becomes top-anchored with a `flex: 1` spacer pushing the button/footer to the bottom, replacing the current vertically-centered block.
8. Two palette values (`#FDFBF7` background, `#9AAEA7` muted text) have no equivalent design token and are kept as documented raw hex, per the Story 12.2 precedent.
9. i18n keys added/removed in both locale files; `sign-in.test.tsx`'s 9 tests updated for the new interaction points with no loss of functional coverage.

---

## Tasks / Subtasks

### T1 — i18n keys (AC: 3, 4, 6, 9)

- [x] Add `auth.welcomeSignup`, `auth.welcomeSignin`, `auth.identifierType.{emailShort,phoneShort,emailPlaceholder,phonePlaceholder}`, `auth.modeSwitch.{newHere,alreadyHaveAccount}` to `en.json` and `hi.json`
- [x] Replace `auth.authMethod.{otp,password,passwordAccessibilityLabel}` with `auth.authMethod.{useCodeInstead,usePasswordInstead,switchToOtp,switchToOtpHint,switchToPassword,switchToPasswordHint}` in `en.json`; add the new set to `hi.json`
- [x] Delete `auth.password.screenSubtitle` from `en.json` (zero remaining call sites after this story)
- [x] Verify no orphaned key references remain (repo-wide grep)

### T2 — Title & layout (AC: 3, 7)

- [x] Replace the single-line title + separate subtitle with the mode-variant title (`auth.welcomeSignup`/`welcomeSignin`)
- [x] Remove `justifyContent: 'center'`/`alignItems: 'center'` from the container; switch to top-anchored flow with `paddingTop: 44, paddingHorizontal: 28, paddingBottom: 28`
- [x] Add a `flex: 1` spacer `View` before the submit button

### T3 — Identifier-type pill switch (AC: 2, 4)

- [x] Replace the mode tab row and identifier-type tab row with a single pill switch (`color.surface.secondary` track, `color.accent.courage` active pill) driving `identifierType` only
- [x] Keep dispatching `SET_IDENTIFIER_TYPE` under the same `isAuthMethodOrModeLocked` guard
- [x] Identifier `TextInput`'s `accessibilityLabel` stays on `auth.otp.emailLabel`/`phoneLabel`; only its placeholder changes to the new example-format keys

### T4 — Password field & auth-method inline links (AC: 5, 2)

- [x] Add an uppercase `auth.password.label` caption above the password field; remove the field's placeholder
- [x] Replace the auth-method tab row with two mutually-exclusive inline links ("use a code instead" shown when `authMethod === 'password'`; "use a password instead" shown when `authMethod === 'otp'`), each dispatching `SET_AUTH_METHOD` under the existing guard

### T5 — Mode-switch footer line & submit button (AC: 3, 6)

- [x] Replace the mode tab row (already removed in T3) with a bottom "New here? **Create an account**" / "Already have an account? **Sign in**" touchable, `accessibilityLabel` set to the *target* mode's label (reuses `auth.mode.createAccount`/`signIn` unchanged)
- [x] Restyle the submit button to a green pill with a trailing decorative "→" `Text` (`eslint-disable-next-line i18next/no-literal-string`); button label branch logic (`auth.otp.sendCode` / `auth.password.submitSignUp` / `auth.password.submitSignIn`) unchanged

### T6 — Tokens & documented exceptions (AC: 8)

- [x] Import `color`/`radius`/`spacing`/`typography` from `@exposure-buddy/ui`; use tokens everywhere the redesign's palette matches them exactly
- [x] Keep `#FDFBF7` (background) and `#9AAEA7` (muted footer text) as raw hex with inline comments explaining the token gap

### T7 — Tests (AC: 9)

- [x] Remove the 8 now-redundant `auth.authMethod.passwordAccessibilityLabel` no-op press calls (the key no longer exists; `INITIAL_STATE.authMethod` is already `'password'`, so these presses changed nothing)
- [x] Rewrite the "renders all four mode x authMethod combinations" test to drive the new inline links and mode-switch button
- [x] `pnpm turbo typecheck lint test` green across all packages/apps (19/19 tasks; 394 mobile Jest tests, sign-in suite 9/9)

### Review Findings

- [x] [Review][Patch] Password field's `inputError` style is applied to `passwordInput`, but the visible underline border lives on the wrapping `passwordRow` — the red error color has zero effect [apps/mobile/app/(auth)/sign-in.tsx:488] — fixed: moved the conditional `inputError` style onto `passwordRow`
- [x] [Review][Patch] Mode-switch footer button has no `accessibilityHint`, unlike its sibling auth-method toggle links which both got one [apps/mobile/app/(auth)/sign-in.tsx:578-593] — fixed: added `auth.modeSwitch.toSignInHint`/`toSignUpHint` keys and wired the hint
- [x] [Review][Patch] `#9AAEA7` raw-hex token-gap comment only appears at its first use site (`modeSwitchText`); `privacyLinkText` reuses the same value with no comment of its own [apps/mobile/app/(auth)/sign-in.tsx:~745] — fixed: added a matching comment at the second use site

---

## Dev Notes

- **The handoff README was unusually explicit and load-bearing.** Unlike Story 12.2 (where the `.dc.html` mockup was the only source), this screen had a dedicated `design_handoff_sign_in/README.md` written specifically for an implementing engineer — it named exact hex values, exact reducer field names, and explicitly said what NOT to change. Implementation followed it directly rather than re-deriving intent from the HTML mock alone.
- **Button label was a case where the mockup's illustrative copy ("Continue") had to be overridden by the README's explicit instruction to keep the three existing translation keys.** Taking the mockup literally would have collapsed three distinct, context-specific button labels (send-code / sign-up / sign-in) into one generic word — a functional regression the README pre-empted by name.
- **`INITIAL_STATE.authMethod` is `'password'`, not `'otp'`** — this was discovered while rewriting tests: the old test suite's comment ("Default: signup + otp") was stale/inaccurate relative to the actual default, but harmless since no test asserted on it directly. The new tests assert the correct default explicitly.
- **Accessibility label preserved, not decorative-icon-dependent.** The identifier field's `accessibilityLabel` deliberately stays on the full `auth.otp.emailLabel`/`phoneLabel` ("Email address"/"Phone number") even though the visible placeholder shrank to an example format — a screen reader user should not lose the field's purpose to a terser visual placeholder.
- **`otp-verification.tsx` is out of scope.** The design handoff is specifically for the identifier/password entry screen; the OTP code-entry step (a separate screen) was not part of this redesign and is untouched.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

None — no blocking issues. `pnpm turbo typecheck lint test` passed clean (19/19 tasks, 394 mobile Jest tests including sign-in's 9/9) on the first full run after implementation.

### Completion Notes List

- T1: `auth.authMethod.password`/`otp`/`passwordAccessibilityLabel` and `auth.password.screenSubtitle` deleted from `en.json` after confirming (repo-wide grep) zero remaining call sites. `hi.json` never had these sections populated to begin with (pre-existing gap, not introduced or fixed by this story) — only the new keys this story adds were added to `hi.json`, English-duplicated per convention.
- T2–T5: Implemented as described in the ACs; see `apps/mobile/app/(auth)/sign-in.tsx` for the full diff. The three-tab-row → pill-switch-plus-two-inline-links consolidation preserves every dispatched action and every existing guard condition (`isAuthMethodOrModeLocked`, `isActionDisabled`, `isSubmitDisabled`) unchanged.
- T7: Of the 9 existing tests, 8 opened with a press against `auth.authMethod.passwordAccessibilityLabel` — a key that no longer exists post-redesign. Confirmed via the reducer's `SET_AUTH_METHOD` case and `INITIAL_STATE` that this press was already a no-op in the prior implementation (authMethod defaults to `'password'`; the reducer branch resets fields to values already at their defaults). Removed all 8 with no assertion changes needed elsewhere in those tests. The one test that meaningfully exercised the mode/authMethod state space was rewritten to use the two new inline-link accessibility labels and the single mode-switch button (whose `accessibilityLabel` conveniently resolves to the same `auth.mode.signIn`/`createAccount` strings the old always-visible tabs used, since it's labelled with the *target* mode).

### File List

- `apps/mobile/app/(auth)/sign-in.tsx` (modified)
- `apps/mobile/app/(auth)/sign-in.test.tsx` (modified)
- `apps/mobile/src/i18n/locales/en.json` (modified)
- `apps/mobile/src/i18n/locales/hi.json` (modified)
- `_bmad-output/planning-artifacts/epics.md` (modified — Story 12.1 ACs, Epic 12 summary)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

### Change Log

- 2026-07-30 — Implemented Story 12.1: Sign-in/sign-up screen redesign per the Claude Design "Exposure Buddy" project's `design_handoff_sign_in/` folder (`Sign In Options.dc.html` + `1c-sign-in.html` + `README.md`). Consolidated three tab rows into one pill switch plus two inline links, restyled title/fields/button/layout onto `packages/ui` tokens (with two documented raw-hex exceptions), all existing auth logic unchanged. Status: done.
- 2026-07-30 — Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) of the `main..planning/epic-12-ui-ux-enhancements` branch: 3 patches applied to this story (password field error border applied to the wrong element, missing `accessibilityHint` on the mode-switch footer, missing token-gap comment at a second use site), 0 deferred, 0 dismissed for this story. `pnpm turbo typecheck lint test` green after fixes. Status remains done.
