# Story 15.3: Hide OTP Sign-In ("Use a Code Instead") Pending SMTP Provisioning

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a beta program owner,
I want the "use a code instead" (OTP) sign-in/signup option hidden until custom SMTP is provisioned,
so that testers never hit a silently-broken auth path — email-OTP hard-fails for anyone outside the Supabase org team, and phone-OTP's status is unverified.

## Context

Added 2026-09-22, directly from this session's `deferred-work.md` finding ("beta-readiness investigation into OTP/SMTP delivery"). Same root cause and same precedent as Story 10.3 (password reset, flag-gated `EXPO_PUBLIC_ENABLE_PASSWORD_RESET` pending SMTP) — this story applies the identical pattern to a different auth affordance on the same screen. Full epic rationale: `_bmad-output/planning-artifacts/epics.md` → "Epic 15: Auth Safety Hardening for Hosted-Backend Builds", FR-OTPGATE-01.

**Confirmed finding (via Supabase docs, this session):** without custom SMTP, the hosted project's built-in default mailer only delivers to email addresses that are members of the project's Supabase organization team. Every other address — i.e. every beta tester — gets "Email address not authorized," a hard failure, not an occasional one. This is exactly the class of risk Story 10.3 already declined to ship for password reset; the same reasoning applies here.

**Unverified finding:** phone-OTP SMS delivery status on the hosted project could not be confirmed (no available tool exposes Twilio/SMS provider config). See `deferred-work.md` for details.

**Important scope consequence:** the "use a code instead" toggle is a single switch (`state.authMethod`) with no identifier-type dimension — it governs OTP for both email AND phone identifiers, and for both signup and signin modes. Hiding it hides all four combinations at once. This story accepts that as the simpler, safer default rather than building identifier-type-specific gating for a phone-OTP path nobody has verified actually works.

**⚠️ This is a user-facing behavior change**, unlike Stories 15.1/15.2 which were purely internal-risk fixes. It removes a previously-available sign-in/signup method for real users. Flag before shipping beyond internal testing — see AC #6.

## Acceptance Criteria

1. A new env var `EXPO_PUBLIC_ENABLE_OTP_SIGNIN` is declared in `apps/mobile/src/types/global.d.ts`'s `NodeJS.ProcessEnv` interface, alongside the existing `EXPO_PUBLIC_*` declarations. No value is set for it in any `.env*` file or `eas.json` profile by this story — its absence is the correct default (hidden).
2. The "use a code instead" inline link (`apps/mobile/app/(auth)/sign-in.tsx`, the `TouchableOpacity` wrapping `t('auth.authMethod.useCodeInstead')`, ~line 508-516) only renders when `process.env.EXPO_PUBLIC_ENABLE_OTP_SIGNIN === 'true'`. When the flag is off/unset, nothing renders in its place (not a disabled state — fully absent, matching Story 15.2's precedent for the dev shortcut).
3. No change is made to the reducer, `handleSendCode`, `signInWithOtp` call, or the "use a password instead" reverse-toggle link's own code — hiding the forward link is sufficient on its own, since `state.authMethod` can never become `'otp'` through any other path (`INITIAL_STATE.authMethod` is `'password'`, and `SET_AUTH_METHOD: 'otp'` is only ever dispatched from the link this story hides).
4. The existing test `'renders all four mode x authMethod combinations'` in `apps/mobile/app/(auth)/sign-in.test.tsx` is updated to set `process.env.EXPO_PUBLIC_ENABLE_OTP_SIGNIN = 'true'` before rendering (with `afterEach` restore) — **required**, not optional; this test currently exercises OTP mode via a `getByLabelText` call that will throw once the link is hidden by default.
5. New tests are added (in a `describe('OTP sign-in gating')` block or similar) asserting: (a) "use a code instead" is absent when the flag is unset; (b) it is present when the flag is `'true'`; (c) it is absent when the flag is any value other than the literal string `'true'` (e.g. `'false'`, `'1'`) — matching the strict string-equality convention already used for `EXPO_PUBLIC_APP_VARIANT` checks elsewhere in this file.
6. `pnpm turbo typecheck lint test` passes clean with no regressions.
7. Dev-story completion notes must explicitly flag: this is a user-facing behavior change (removes an existing sign-in/signup method for real users, not an internal-only fix like Stories 15.1/15.2) and requires product sign-off before shipping to any build distributed beyond internal testing.

## Tasks / Subtasks

- [ ] Task 1 — Declare the flag (AC: #1)
  - [ ] Add `EXPO_PUBLIC_ENABLE_OTP_SIGNIN?: string` to `apps/mobile/src/types/global.d.ts`
- [ ] Task 2 — Gate the link (AC: #2, #3)
  - [ ] Wrap the "use a code instead" `TouchableOpacity` in a flag check, rendering `null` when off
  - [ ] Verify no other code in that render branch changes
- [ ] Task 3 — Fix the existing test (AC: #4)
  - [ ] Set the flag to `'true'` in `'renders all four mode x authMethod combinations'`, restore after
- [ ] Task 4 — New tests (AC: #5, #6)
  - [ ] Add the three new gating test cases
  - [ ] Run `pnpm turbo typecheck lint test`, confirm zero regressions
- [ ] Task 5 — Completion notes (AC: #7)
  - [ ] Flag the user-facing/product-sign-off distinction explicitly in Dev Agent Record → Completion Notes

## Dev Notes

### File being modified (current state, read in full during story creation)

`apps/mobile/app/(auth)/sign-in.tsx`, ~lines 492-531:

```tsx
{state.authMethod === 'password' ? (
  <>
    {/* password field */}
    <TouchableOpacity
      onPress={() => { if (!isAuthMethodOrModeLocked) dispatch({ type: 'SET_AUTH_METHOD', payload: 'otp' }) }}
      accessibilityRole="button"
      accessibilityLabel={t('auth.authMethod.switchToOtp')}
      accessibilityHint={t('auth.authMethod.switchToOtpHint')}
      accessibilityState={{ disabled: isAuthMethodOrModeLocked }}
    >
      <Text style={styles.inlineLink}>{t('auth.authMethod.useCodeInstead')}</Text>
    </TouchableOpacity>
  </>
) : (
  <View style={styles.authMethodSwitchRow}>
    {/* "use a password instead" link */}
  </View>
)}
```

The `TouchableOpacity` wrapping `useCodeInstead` needs the new flag check; nothing else in this block changes. Since `authMethod` can only become `'otp'` via this link's `onPress`, the `else` branch (the "use a password instead" link) becomes correctly unreachable without needing its own guard.

### Why a flag, not a backend-URL check

Story 15.2 used `isLocalSupabaseUrl(EXPO_PUBLIC_SUPABASE_URL)` to gate the dev shortcut — appropriate there because "is this a local Supabase instance" is exactly the right predicate for that risk. Here, the right predicate is "does this Supabase project have custom SMTP configured," which is NOT the same as "is this hosted" — a hosted project could have SMTP configured (in which case OTP should work), and today's problem is specifically the *absence* of SMTP, not hosted-ness itself. A URL-based check would keep hiding OTP even after SMTP is eventually provisioned, requiring a second fix. A flag (matching Story 10.3's `EXPO_PUBLIC_ENABLE_PASSWORD_RESET` precedent, though that one only exists on an unmerged branch — this story is the first such flag actually landing on `main`) flips cleanly once, whenever SMTP+domain work completes.

### Testing standard

Follow the `process.env.X = '...'` + `afterEach` restore pattern Story 15.2 established in this same test file for `EXPO_PUBLIC_SUPABASE_URL`. Match the strict `=== 'true'` string-equality convention already used elsewhere in `sign-in.tsx` (e.g. `EXPO_PUBLIC_APP_VARIANT === 'preview'`) — do not accept truthy-string variants like `'1'` or `'yes'`.

### Explicitly out of scope

- Identifier-type-specific gating (e.g. hiding email-OTP only, keeping phone-OTP) — phone-OTP's actual delivery status is unverified, not confirmed-working, so there's nothing to selectively preserve yet. Revisit if/when phone-SMS is verified.
- Any change to `handleSendCode`, `signInWithOtp`, or the reducer
- Setting `EXPO_PUBLIC_ENABLE_OTP_SIGNIN` in any `.env*` file or `eas.json` profile — its absence (undefined → hidden) is the intended default; a value is only ever added when someone deliberately re-enables this post-SMTP

### Project Structure Notes

- Two files touched: `apps/mobile/app/(auth)/sign-in.tsx` (+ its test file), `apps/mobile/src/types/global.d.ts`. No `packages/*` changes.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` § "Epic 15: Auth Safety Hardening for Hosted-Backend Builds" / "Story 15.3", FR-OTPGATE-01]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` § "beta-readiness investigation into OTP/SMTP delivery (2026-09-22)"]
- [Source: `apps/mobile/app/(auth)/sign-in.tsx`]
- [Source: `apps/mobile/src/types/global.d.ts`]
- [Source: `_bmad-output/implementation-artifacts/15-2-hide-dev-sign-in-shortcut-when-pointed-at-hosted-supabase.md` — the `process.env` mocking test pattern this story reuses]

## Dev Agent Record

### Agent Model Used

_(to be filled in by dev-story)_

### Debug Log References

### Completion Notes List

### File List
