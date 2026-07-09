# Story 10.1: Password-Based Sign-Up & Sign-In (Email + Phone)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who doesn't want to wait for an OTP every time,
I want to create an account and sign in using an email or phone number plus a password,
so that I have a faster alternative to OTP verification (FR-AUTH-04).

## Acceptance Criteria

1. **Given** the existing OTP-only sign-in screen (`apps/mobile/app/(auth)/sign-in.tsx`)
   **When** this story is implemented
   **Then** the screen gains OTP / Password method tabs for both the email and phone identifier paths; password sign-up enforces an 8-character client-side minimum length; Supabase Auth's built-in password grant handles verification server-side.

2. **Given** a user signs up with password auth
   **When** the account is created
   **Then** the same two mandatory safety checkboxes (FR-SAFE-01) gate the creation action, identical to the OTP sign-up path — no safety-check bypass exists for the password path.

3. **Given** password sign-in for an existing account
   **When** the user submits valid credentials
   **Then** a session is established identically to the OTP path (same session storage, same `auth.hasAuthedBefore` MMKV flag per FR-AUTH-03).

**Source:** [_bmad-output/planning-artifacts/epics.md#Story 10.1](../planning-artifacts/epics.md), FR-AUTH-04 / FR-SAFE-01 / FR-AUTH-03 in [prd.md](../planning-artifacts/prd.md).

## Tasks / Subtasks

- [ ] Task 1 — Add OTP/Password method tabs and password field to `sign-in.tsx` (AC: #1)
  - [ ] Add `authMethod: 'otp' | 'password'` to the screen's reducer `State`/`Action` (extend existing `useReducer`, do not introduce a new state container — see Dev Notes: State Management Patterns)
  - [ ] Add a new tab row (OTP / Password) — apply to both `email` and `phone` identifier tabs, positioned after the Mode (Create account/Sign in) tab row and before the Email/Phone tab row
  - [ ] Add a password `TextInput` (rendered only when `authMethod === 'password'`), `secureTextEntry`, with `accessibilityLabel`/`accessibilityHint` following the existing identifier-input pattern (lines 214–234 of current `sign-in.tsx`)
  - [ ] Add client-side validation: 8-character minimum on signup, applies to both email and phone identifier paths — extend the existing `validateIdentifier`-style pure function or add a sibling `validatePassword`, following the same signature/return-error-key convention
  - [ ] Add new i18n keys under `auth.password.*` (label, hint, sign-in error, sign-up error) and `auth.validation.passwordRequired` / `auth.validation.passwordTooShort` to `apps/mobile/src/i18n/locales/en.json` (do not add to `hi.json` — see Dev Notes: i18n)
- [ ] Task 2 — Implement password sign-up submit path (AC: #1, #2)
  - [ ] New submit handler (e.g. `handlePasswordSubmit`) parallel to existing `handleSendCode`, gated by the same `checkboxesIncomplete` / `isSendDisabled`-style guard already present for the OTP signup path — reuse `SafetyCheckboxes`, do not duplicate its logic
  - [ ] On signup, call `supabase.auth.signUp({ email, password })` or `{ phone, password }` depending on `identifierType`
  - [ ] Wire the button label/handler so `authMethod === 'password'` renders "Sign up"/"Sign in" (existing i18n keys `auth.mode.createAccount` / `auth.mode.signIn` may be reused for tab labels; the submit button needs its own label distinct from `auth.otp.sendCode`)
- [ ] Task 3 — Fix the consent-recording race for password sign-up (AC: #2) — **critical, see Dev Notes: Consent Recording Race**
  - [ ] Extend `sign-in.tsx`'s existing `isAuthenticated` redirect `useEffect` (currently just `if (isAuthenticated) router.replace('/(app)/')`) so that, for a password signup that just completed, it performs the consent-record + `emitAccountCreated` sequence — mirroring `otp-verification.tsx`'s `isAuthenticated` effect (lines 108–150) — **before** redirecting, not after
  - [ ] Track "this isAuthenticated transition came from a password signup" via reducer state (analogous to `isNewAccount` in `otp-verification.tsx`), not via a race-prone side value
  - [ ] Reuse `ConsentRecordService` (`packages/supabase`) and `emitAccountCreated`, `CONSENT_PURPOSE_ACCOUNT_CREATION`, `CONSENT_VERSION_CURRENT` (`packages/core`) exactly as imported in `otp-verification.tsx` — do not reimplement
  - [ ] Handle consent-write failure the same way `otp-verification.tsx` does: surface `auth.safety.consentWriteFailed`, do not redirect, let the user retry (do not leave `prevIsAuthenticated`-equivalent guard state stuck)
- [ ] Task 4 — Implement password sign-in submit path (AC: #3)
  - [ ] Call `supabase.auth.signInWithPassword({ email, password })` or `{ phone, password }`
  - [ ] Do not add new session-storage or `hasAuthedBefore`-flag code — `AuthProvider`'s `onAuthStateChange` listener (`packages/supabase/src/auth/AuthProvider.tsx`) already handles this identically for any `SIGNED_IN` event regardless of which Supabase Auth method produced it; verify this holds rather than re-deriving it
  - [ ] Map `signInWithPassword` error responses (e.g. "Invalid login credentials") to a plain-language i18n key — never surface the raw Supabase error string (Dev Notes: Error Handling)
- [ ] Task 5 — Consider the pending-deletion sign-in guard gap for the new real password sign-in path (AC: #3, system-consistency)
  - [ ] `otp-verification.tsx` blocks sign-in for accounts with `pendingDeletion` (lines 108–122); the current dev-only password button in `sign-in.tsx` does not have this guard. Now that password sign-in becomes a first-class, real user-facing path, evaluate whether to add the same guard to the extended `isAuthenticated` effect — flag decision/rationale in Dev Agent Record if deferred
- [ ] Task 6 — Remove or fold in the existing `__DEV__`/preview-only "Sign in as test user" button (lines 274–291 of current `sign-in.tsx`)
  - [ ] It becomes redundant once real password sign-in exists; either delete it or confirm it still serves a distinct purpose (one-tap fixed test credentials vs. the new general password form) before keeping it
- [ ] Task 7 — Tests (co-located, first test file for this screen — AC: #1, #2, #3)
  - [ ] Create `apps/mobile/app/(auth)/sign-in.test.tsx` following the RTL mock pattern in `apps/mobile/app/reminder-settings.test.tsx` and `apps/mobile/app/_layout.test.tsx` (mock `react-i18next`, `expo-router`, `@exposure-buddy/supabase`)
  - [ ] Cover: method-tab switching; 8-char password validation blocks submit; safety checkboxes gate password signup identically to OTP signup; successful password signup triggers consent record + `emitAccountCreated` + redirect, in that order; consent-write failure surfaces error and does not redirect; successful password sign-in redirects without a consent call; invalid-credentials error maps to a plain-language message

## Dev Notes

### Current State of `apps/mobile/app/(auth)/sign-in.tsx` (file being modified, not created)

This file already exists and handles OTP-only sign-up/sign-in via three pieces of state layered on one `useReducer`:
- `mode: 'signup' | 'signin'` — tab row 1, defaults from `hasAuthedBefore` (device-level flag, MMKV)
- `identifierType: 'email' | 'phone'` — tab row 2
- `identifier: string` — the input value, validated by the pure `validateIdentifier(identifier, identifierType)` function (returns an i18n error key or `null`)

Submission (`handleSendCode`) currently only sends an OTP via `supabase.auth.signInWithOtp(...)` and pushes to `otp-verification.tsx` with `{ identifier, identifierType, isNewAccount }` params — verification, session establishment, and (for new accounts) consent recording all happen on that *separate* screen.

There is also a `useEffect` at lines 100–104 that redirects to `/(app)/` the instant `isAuthenticated` becomes true, with a comment noting it exists for "dev password sign-in or returning user". This effect has **no consent-recording step** — it assumes any account reaching `isAuthenticated` from `sign-in.tsx` either already has consent on file (returning user) or isn't a real signup (the `__DEV__`-only test button). Adding a real password signup path through this same screen breaks that assumption — see "Consent Recording Race" below.

### Consent Recording Race (critical — do not miss)

This is the single biggest way this story can silently ship a DPDPA compliance gap.

The OTP flow's consent-write-then-redirect logic lives entirely in `otp-verification.tsx` (a separate screen reached only *after* the OTP is sent, before verification/session-establishment happens). Password sign-up has no equivalent intermediate screen — `supabase.auth.signUp()` establishes the session directly, which flips `isAuthenticated` to `true` via `AuthProvider`'s global `onAuthStateChange` listener.

`sign-in.tsx`'s existing `isAuthenticated` effect will fire the instant that happens and call `router.replace('/(app)/')` — with **no consent record written**, because that effect was never built to do so. If Task 3 is skipped, password-signup users will get an account with no `ConsentRecordService.recordConsent(...)` call and no `emitAccountCreated` analytics event, silently. This is not covered by any AC's literal text but is required for the feature to work correctly in the existing system (DPDPA-compliant account creation) — treat it as a hard requirement.

Mirror `otp-verification.tsx`'s pattern (lines 108–150): a ref-guarded `isAuthenticated` transition effect that, for new-account creation, does consent-write → `emitAccountCreated` → redirect, and on consent-write failure sets an error and leaves the user able to retry via a manual action rather than being stuck or silently redirected.

### Architecture Compliance

- **State management** ([implementation-patterns-consistency-rules.md#State Management Patterns](../planning-artifacts/architecture/implementation-patterns-consistency-rules.md)): this screen is already a multi-step form with several values that must stay consistent (`mode`, `identifierType`, `identifier`, now `authMethod`, `password`) — stays on `useReducer`, do not introduce `useState` bags or Zustand.
- **Session/auth ownership**: `authState` is driven exclusively by `AuthProvider`'s `onAuthStateChange` listener (packages/supabase/src/auth/AuthProvider.tsx:118). Do not write any new code that sets session state directly from `sign-in.tsx` — calling `signUp`/`signInWithPassword` and letting the existing listener react is correct and sufficient for AC #3's "session established identically" requirement.
- **`hasAuthedBefore` MMKV flag**: written automatically by `AuthProvider` on any `SIGNED_IN` event (AuthProvider.tsx:209) — no story-specific code needed for this part of AC #3.
- **Error handling** ([implementation-patterns-consistency-rules.md#Format Patterns](../planning-artifacts/architecture/implementation-patterns-consistency-rules.md)): "Domain errors — actionable plain-language message; never raw error strings." `otp-verification.tsx`'s `classifyOtpError` is the existing precedent for turning a raw Supabase error message into an i18n key — follow the same shape for password errors (e.g. classify "Invalid login credentials" vs. "User already registered" vs. unknown) rather than displaying `error.message` directly.
- **ARC-011 boundary rules / packages/core purity**: no `database.types.ts`, `react-native`, or `expo-*` imports belong in `packages/core`. This story is UI + Supabase Auth calls only — if a `validatePassword`-style pure function is extracted, it may live alongside `validateIdentifier` in the screen file (current convention — `validateIdentifier` is not in `packages/core`) or in `packages/core` if you want it unit-tested with Vitest; either is acceptable, but do not create a new package boundary violation.

### Project Structure Notes

- **Deviation from `project-structure-boundaries.md`:** that document's target tree shows a separate `sign-up.tsx` alongside `sign-in.tsx` under `(auth)/`. The actual, already-shipped Epic 2 implementation combined sign-up and sign-in into one `sign-in.tsx` with mode tabs instead. This story follows the **actual, existing code**, not the target-tree doc — extend `sign-in.tsx`, do not create a new `sign-up.tsx` file. (Same class of documented deviation as the `keywordDetector.ts` vs. `detector.ts` naming noted in Epic 3.)
- No new files are required for AC #1–#3 beyond the new test file (Task 7). No new Supabase migration, Edge Function, or `packages/supabase` service is needed — `supabase.auth.signUp` / `signInWithPassword` are used directly via the existing `createSupabaseClient()` accessor, same as `signInWithOtp`/`verifyOtp` today.

### i18n

- Add new keys only to `apps/mobile/src/i18n/locales/en.json` under `auth.password.*` and `auth.validation.password*`. **Do not add to `hi.json`** — checked: `hi.json`'s `auth` object currently only has a `deletion` key; `otp`/`mode`/`safety`/`validation` (i.e. the entire existing OTP screen) has no Hindi translations yet. This is an existing, accepted gap (i18next falls back to English), not something this story should be the first to fix.
- Follow the `// eslint-disable-next-line i18next/no-literal-string` convention already used throughout `sign-in.tsx`/`otp-verification.tsx` for any literal strings that are intentionally not translated (type-literal values, dev-only labels).

### Testing Standards

- Framework: Jest + `@testing-library/react-native`, co-located `.test.tsx` (per `implementation-patterns-consistency-rules.md#Structure Patterns`).
- **No test file currently exists for `sign-in.tsx` or `otp-verification.tsx`** — this story creates the first one for this screen. Follow the mock pattern in `apps/mobile/app/reminder-settings.test.tsx` and `apps/mobile/app/_layout.test.tsx`: mock `react-i18next` (`t` returns the key, optionally serialized with interpolation args), mock `expo-router` (`useRouter`, `useLocalSearchParams` if needed), and mock `@exposure-buddy/supabase` (`createSupabaseClient`, `useAuth`) rather than hitting a real Supabase client.
- Do not attempt to test the real `AuthProvider`/`onAuthStateChange` wiring in this screen's unit tests — mock `useAuth()`'s `isAuthenticated` to flip between renders to simulate the post-signUp/signIn transition, consistent with how `authState`/`isAuthenticated` are already consumed as external props from the screen's point of view.

### Previous Story Intelligence

This is Story 10.1, the first story in Epic 10 — no prior Epic 10 story file exists to inherit learnings from (per the earlier user decision, the retroactively-documented `feature/password-based-login` branch is being treated as separate/ignored for this fresh implementation, not as prior-story intelligence).

### Git Intelligence

Recent commits on `main` (`6d3ccf0`, `bba361d`) are planning-doc-only merges for Epic 10/11 — no code precedent to draw from there. The most relevant *code* precedent is the existing `sign-in.tsx` / `otp-verification.tsx` pair itself (read in full above), which is the actual pattern to extend.

### References

- [_bmad-output/planning-artifacts/epics.md — Epic 10 / Story 10.1](../planning-artifacts/epics.md)
- [_bmad-output/planning-artifacts/prd.md — FR-AUTH-03, FR-AUTH-04, FR-SAFE-01](../planning-artifacts/prd.md)
- [_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md — State Management Patterns, Format Patterns, Structure Patterns](../planning-artifacts/architecture/implementation-patterns-consistency-rules.md)
- [_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md — ADR-004 (session/navigation state invariants)](../planning-artifacts/architecture/core-architectural-decisions.md)
- [_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md — target auth route tree (deviation noted above)](../planning-artifacts/architecture/project-structure-boundaries.md)
- `apps/mobile/app/(auth)/sign-in.tsx` (file to modify)
- `apps/mobile/app/(auth)/otp-verification.tsx` (pattern to mirror for consent-write-then-redirect)
- `packages/supabase/src/auth/AuthProvider.tsx` (session/`hasAuthedBefore` invariants, lines 106–120 and 195–224)
- `apps/mobile/src/components/auth/SafetyCheckboxes.tsx` (reused as-is)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
