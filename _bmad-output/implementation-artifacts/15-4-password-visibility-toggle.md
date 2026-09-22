# Story 15.4: Password Visibility Toggle

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user typing my password on the sign-in screen,
I want a toggle at the end of the password field to show or hide what I've typed,
so that I can verify it's correct before submitting, without risking a typo-driven failed attempt.

## Context

Added 2026-09-22 — requested directly, unlike Stories 15.1-15.3 which came out of this session's beta-distribution investigation. Grouped into Epic 15 per explicit instruction, though it's a usability addition rather than a safety/hardening fix. Full rationale: `_bmad-output/planning-artifacts/epics.md` → "Epic 15: Auth Safety Hardening for Hosted-Backend Builds", FR-PWDVIS-01.

`sign-in.tsx` is the only file in the app with a `secureTextEntry` field on `main` today (confirmed via `grep -rl secureTextEntry apps/mobile/app apps/mobile/src`) — scope is contained to this one screen, one field.

## Acceptance Criteria

1. A new local `useState<boolean>(false)` (e.g. `isPasswordVisible`) is added to the `SignInScreen` component — NOT wired into the existing `State`/`Action`/`reducer` triad, since it's pure presentational state with no bearing on validation or submission.
2. The password `TextInput`'s `secureTextEntry` prop becomes `!isPasswordVisible` (was hardcoded `secureTextEntry`).
3. A new icon-only `TouchableOpacity` is inserted as a sibling immediately after the password `TextInput`, inside `styles.passwordRow`, before the (Story 15.3) conditional "use a code instead" link. Since `styles.passwordInput` has `flex: 1`, this naturally places the toggle flush against the end of the field regardless of whether the OTP link also renders.
4. The toggle renders `<Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={color.content.secondary} />` — `@expo/vector-icons/Ionicons` is already a dependency (used in `apps/mobile/app/(app)/_layout.tsx`'s tab bar); no new dependency is added. Matches that file's existing filled/outline icon-naming convention.
5. The toggle has `accessibilityRole="button"`, `accessibilityLabel={t(isPasswordVisible ? 'auth.password.hidePassword' : 'auth.password.showPassword')}`, `accessibilityHint={t(isPasswordVisible ? 'auth.password.hidePasswordHint' : 'auth.password.showPasswordHint')}`, and `onPress={() => setIsPasswordVisible(v => !v)}`. It is NOT disabled during `state.isLoading` (unlike the mode/auth-method switch buttons) — toggling visibility doesn't submit or mutate the password value, so there's no double-submit risk to guard against.
6. Four new i18n keys — `auth.password.showPassword` ("Show password"), `auth.password.hidePassword` ("Hide password"), `auth.password.showPasswordHint` ("Reveals your typed password"), `auth.password.hidePasswordHint` ("Masks your typed password") — are added to `apps/mobile/src/i18n/locales/en.json`. **Deviation from original AC wording:** NOT added to `hi.json` — confirmed via `grep` that `hi.json` has no `auth.password.*` section at all (not even `label`, `hint`, `submitSignUp`, etc.), a pre-existing gap explicitly documented as intentional in Story 12.1's own AC text ("a pre-existing gap, not touched by this story"). Adding only these 4 new keys would create a partial, inconsistent section rather than closing the actual gap — follows established precedent instead of the story's original assumption.
7. New tests in `apps/mobile/app/(auth)/sign-in.test.tsx` assert: (a) the password field's `secureTextEntry` is `true` by default; (b) tapping the toggle (via `getByLabelText('auth.password.showPassword')`) flips it to `false`; (c) tapping again (now via `getByLabelText('auth.password.hidePassword')`) flips back to `true`.
8. `pnpm turbo typecheck lint test` passes clean with no regressions.

## Tasks / Subtasks

- [x] Task 1 — Local visibility state (AC: #1, #2)
  - [x] Added `const [isPasswordVisible, setIsPasswordVisible] = useState(false)` to `SignInScreen`
  - [x] Changed the password `TextInput`'s `secureTextEntry` to `!isPasswordVisible`
- [x] Task 2 — Toggle button (AC: #3, #4, #5)
  - [x] Imported `Ionicons` from `@expo/vector-icons/Ionicons` (not previously imported in this file)
  - [x] Added the `TouchableOpacity` + `Ionicons` toggle, positioned immediately after the `TextInput` inside `passwordRow`
- [x] Task 3 — i18n keys (AC: #6)
  - [x] Added the 4 new keys to `en.json`
  - [x] NOT added to `hi.json` — see AC #6's documented deviation (pre-existing gap, matches Story 12.1 precedent)
- [x] Task 4 — Tests (AC: #7, #8)
  - [x] Added 2 new tests (masked by default; toggle reveals/re-masks) in a `describe('password visibility toggle')` block
  - [x] Also added `jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons')`, matching the established pattern in `(app)/_layout.test.tsx` — avoids a benign but noisy `act()` warning from the icon font-loading state
  - [x] `pnpm turbo typecheck lint test` — 19/19 tasks passed, 431/431 mobile tests, zero regressions

## Dev Notes

### File being modified (current state, read in full during story creation)

`apps/mobile/app/(auth)/sign-in.tsx`, ~lines 494-518:

```tsx
<Text style={styles.fieldLabel}>{t('auth.password.label')}</Text>
<View style={[styles.passwordRow, isPasswordFieldError ? styles.inputError : null]}>
  <TextInput
    style={styles.passwordInput}
    value={state.password}
    onChangeText={text => dispatch({ type: 'SET_PASSWORD', payload: text })}
    onBlur={handlePasswordBlur}
    secureTextEntry
    autoCapitalize="none"
    autoCorrect={false}
    editable={!state.isLoading}
    accessibilityLabel={t('auth.password.label')}
    accessibilityHint={t('auth.password.hint')}
  />
  {process.env.EXPO_PUBLIC_ENABLE_OTP_SIGNIN === 'true' ? (
    <TouchableOpacity /* "use a code instead" — Story 15.3 */>
      ...
    </TouchableOpacity>
  ) : null}
</View>
```

The new toggle goes between the closing `/>` of the `TextInput` and the `EXPO_PUBLIC_ENABLE_OTP_SIGNIN` conditional block — i.e. always rendered (not flag-gated), immediately after the input.

### Layout reasoning

`styles.passwordRow` (`apps/mobile/app/(auth)/sign-in.tsx` styles, ~line 715): `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`. `styles.passwordInput` (~line 724) has `flex: 1`. Because the input claims all available width, any sibling after it sits flush against the row's trailing edge — this is what makes the toggle land "at the end of the field" without needing new layout styles. No changes to `passwordRow`/`passwordInput` styles are needed.

### Icon convention

`apps/mobile/app/(app)/_layout.tsx` already imports `Ionicons` from `@expo/vector-icons/Ionicons` and uses the `focused ? 'home' : 'home-outline'` filled/outline pattern for tab icons. This story follows the same import path and outline-icon convention (`eye-outline`/`eye-off-outline`), for visual consistency with the rest of the app — not introducing a new icon style.

### Testing standard

Follow this file's existing `getByLabelText`/`fireEvent.press` patterns exactly (see the mode-switch and auth-method-switch tests already in `sign-in.test.tsx`). Assert on the `TextInput`'s `secureTextEntry` prop directly via `.props.secureTextEntry`, matching how other tests in this file inspect props (e.g. `submit.props.accessibilityState.disabled` in `'disables password signup submit until both safety checkboxes are checked'`).

### Explicitly out of scope

- Any other password field in the app (none currently exist on `main` outside this screen)
- Wiring visibility state into the reducer, or persisting the preference across renders/sessions
- Changing `passwordRow`/`passwordInput` styles
- Any interaction with Story 15.3's OTP-gating conditional (the two coexist independently in the same row)

### Project Structure Notes

- Single file touched: `apps/mobile/app/(auth)/sign-in.tsx` (plus its test file), plus `en.json`/`hi.json`. No new dependencies, no `packages/*` changes.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` § "Epic 15: Auth Safety Hardening for Hosted-Backend Builds" / "Story 15.4", FR-PWDVIS-01]
- [Source: `apps/mobile/app/(auth)/sign-in.tsx`]
- [Source: `apps/mobile/app/(app)/_layout.tsx` — existing `Ionicons` filled/outline convention]
- [Source: `apps/mobile/app/(auth)/sign-in.test.tsx` — existing test patterns this story extends]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (interactive session, 2026-09-22)

### Debug Log References

- `npx jest "app/(auth)/sign-in.test.tsx"` — 17/17 passed (9 original + 3 dev-shortcut + 3 OTP-gating + 2 new password-visibility)
- `pnpm turbo typecheck lint test` — 19/19 tasks passed, 431/431 mobile tests

### Completion Notes List

- Implementation matches the story exactly: local `useState`, not wired into the reducer; toggle positioned immediately after the `TextInput` via `passwordRow`'s existing `flex: 1` layout (no style changes needed); `Ionicons` `eye-outline`/`eye-off-outline` matching the app's existing filled/outline icon convention.
- **Deviation:** `hi.json` was NOT updated (see AC #6) — `auth.password.*` doesn't exist there at all, a pre-existing, previously-documented gap (Story 12.1). Adding a partial 4-key section would have been worse than leaving it fully absent.
- Added `jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons')` to the test file, matching the established pattern already used in `apps/mobile/app/(app)/_layout.test.tsx` — without it, tests still pass but print a benign `act()` warning from the icon's internal font-loading state.
- Pure UI addition, no interaction with any other Epic 15 story or the auth reducer — no product sign-off needed (unlike Story 15.3).

### File List

- `apps/mobile/app/(auth)/sign-in.tsx` — added `isPasswordVisible` state, imported `Ionicons`, added the toggle button, changed `secureTextEntry`
- `apps/mobile/app/(auth)/sign-in.test.tsx` — mocked `Ionicons`, added 2 new tests
- `apps/mobile/src/i18n/locales/en.json` — added 4 new `auth.password.*` keys
