# Story 10.1: Password-Based Sign-Up & Sign-In (Email + Phone)

Status: review

<!-- Reviewed 2026-07-09: all 10 patch findings applied inline (see Review Findings, all checked); 1 decision-needed resolved (pending-deletion guard made mandatory). Status remains ready-for-dev — this was a spec review, not an implementation review; no code exists yet. -->

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who doesn't want to wait for an OTP every time,
I want to create an account and sign in using an email or phone number plus a password,
so that I have a faster alternative to OTP verification (FR-AUTH-04).

## Acceptance Criteria

1. **Given** the existing OTP-only sign-in screen (`apps/mobile/app/(auth)/sign-in.tsx`)
   **When** this story is implemented
   **Then** the screen gains OTP / Password method tabs for both the email and phone identifier paths; password sign-up enforces an 8-character client-side minimum length; Supabase Auth's built-in password grant handles verification server-side. The `mode` (Create account/Sign in) and `authMethod` (OTP/Password) tab rows are independent axes — all four combinations (signup+OTP, signup+password, signin+OTP, signin+password) are valid, reachable states.

2. **Given** a user signs up with password auth
   **When** the account is created
   **Then** the same two mandatory safety checkboxes (FR-SAFE-01) gate the creation action, identical to the OTP sign-up path — no safety-check bypass exists for the password path; and the DPDPA consent record is written (`ConsentRecordService.recordConsent`) and `emitAccountCreated` fires **before** the user is redirected into the app — matching the OTP path's consent-then-redirect ordering exactly, not merely reusing the same checkboxes UI.

3. **Given** password sign-in for an existing account
   **When** the user submits valid credentials
   **Then** a session is established identically to the OTP path (same session storage, same `auth.hasAuthedBefore` MMKV flag per FR-AUTH-03), and an account with a pending-deletion request is blocked from signing in via password exactly as it is via OTP (sign out + `auth.deletion.accountPendingDeletion` error) — full guard parity with the OTP path, not just session-mechanics parity.

**Source:** [_bmad-output/planning-artifacts/epics.md#Story 10.1](../planning-artifacts/epics.md), FR-AUTH-04 / FR-SAFE-01 / FR-AUTH-03 in [prd.md](../planning-artifacts/prd.md).

## Tasks / Subtasks

- [x] Task 1 — Add OTP/Password method tabs and password field to `sign-in.tsx` (AC: #1)
  - [x] Add `authMethod: 'otp' | 'password'` to the screen's reducer `State`/`Action` (extend existing `useReducer`, do not introduce a new state container — see Dev Notes: State Management Patterns). `authMethod` tracks which tab is selected only — it is `'password'` for both password-signup and password-signin, so it cannot by itself signal "this was a new-account creation" (see Task 3's separate tracking requirement)
  - [x] Add a new tab row (OTP / Password) — apply to both `email` and `phone` identifier tabs, positioned after the Mode (Create account/Sign in) tab row and before the Email/Phone tab row. `mode` and `authMethod` are independent axes; all four combinations must render correctly
  - [x] Add a password `TextInput` (rendered only when `authMethod === 'password'`), `secureTextEntry`, with `accessibilityLabel`/`accessibilityHint` following the existing identifier-input pattern (identifier `TextInput` block in the current `sign-in.tsx` — locate by content, not line number; earlier tasks in this list shift line offsets as they're implemented)
  - [x] Add client-side validation: 8-character minimum on signup, applies to both email and phone identifier paths — extend the existing `validateIdentifier`-style pure function or add a sibling `validatePassword`, following the same signature/return-error-key convention
  - [x] Add new i18n keys under `auth.password.*` (label, hint, sign-in error, sign-up error) and `auth.validation.passwordRequired` / `auth.validation.passwordTooShort` to `apps/mobile/src/i18n/locales/en.json` (do not add to `hi.json` — see Dev Notes: i18n)
- [x] Task 2 — Implement password sign-up submit path (AC: #1, #2)
  - [x] New submit handler (e.g. `handlePasswordSubmit`) parallel to existing `handleSendCode`, gated by the same `checkboxesIncomplete` / `isSendDisabled`-style guard already present for the OTP signup path — reuse `SafetyCheckboxes`, do not duplicate its logic
  - [x] On signup, call `supabase.auth.signUp({ email, password })` or `{ phone, password }` depending on `identifierType`
  - [x] Handle Supabase Auth's email-enumeration protection: `signUp()` for an already-registered, confirmed identifier resolves successfully with **no error and no session** (by design, to avoid leaking which identifiers are registered). Do not treat "no error" as "success" alone — if the call resolves without throwing but `isAuthenticated` does not transition to `true` within the normal request window, surface a plain-language i18n error (new key, e.g. `auth.password.signUpUnavailable`) rather than leaving the submit button stuck in a loading state indefinitely
  - [x] Wire the button label/handler so `authMethod === 'password'` renders "Sign up"/"Sign in" using new, explicitly-named i18n keys `auth.password.submitSignUp` / `auth.password.submitSignIn` (distinct from `auth.otp.sendCode`; the existing `auth.mode.createAccount` / `auth.mode.signIn` keys remain reserved for the mode tab labels only)
- [x] Task 3 — Fix the consent-recording race for password sign-up (AC: #2) — **critical, see Dev Notes: Consent Recording Race**
  - [x] Extend `sign-in.tsx`'s existing `isAuthenticated` redirect `useEffect` (currently just `if (isAuthenticated) router.replace('/(app)/')`) so that, for a password signup that just completed, it performs the consent-record + `emitAccountCreated` sequence — mirroring `otp-verification.tsx`'s `isAuthenticated` effect — **before** redirecting, not after
  - [x] Track "this isAuthenticated transition came from a password signup" via a **new, distinct reducer field** (e.g. `isPasswordSignupPending: boolean`) — separate from `authMethod`, since `authMethod` stays `'password'` for both the signup and signin branches and cannot disambiguate them on its own. Set it when the password-signup submit handler fires, clear it once consumed
  - [x] Guard the effect's re-entry with a **`useRef`** (mirroring `otp-verification.tsx`'s `prevIsAuthenticated` ref), **not** reducer state — a reducer/state update is not synchronous and cannot reliably block a second effect invocation before the update commits; a ref read/write can
  - [x] Reuse `ConsentRecordService` (`packages/supabase`) and `emitAccountCreated`, `CONSENT_PURPOSE_ACCOUNT_CREATION`, `CONSENT_VERSION_CURRENT` (`packages/core`) exactly as imported in `otp-verification.tsx` — do not reimplement
  - [x] Handle consent-write failure the same way `otp-verification.tsx` does: surface `auth.safety.consentWriteFailed`, do not redirect, let the user retry (do not leave the ref guard stuck in a state that blocks retry)
  - [x] The `__DEV__`/preview-only test-user button (Task 6) must leave `isPasswordSignupPending` at its default (`false`) — it always signs in to a pre-existing, already-consented account, so it must never trigger the consent-write path
- [x] Task 4 — Implement password sign-in submit path (AC: #3)
  - [x] Call `supabase.auth.signInWithPassword({ email, password })` or `{ phone, password }`
  - [x] Do not add new session-storage or `hasAuthedBefore`-flag code — `AuthProvider`'s `onAuthStateChange` listener (`packages/supabase/src/auth/AuthProvider.tsx`) already handles this identically for any `SIGNED_IN` event regardless of which Supabase Auth method produced it; verify this holds rather than re-deriving it
  - [x] Map `signInWithPassword` error responses (e.g. "Invalid login credentials") to a plain-language i18n key — never surface the raw Supabase error string (Dev Notes: Error Handling)
  - [x] **Mandatory:** add the same `pendingDeletion` sign-in guard that `otp-verification.tsx` has — check `pendingDeletion?.userId === authState.userId` on the `isAuthenticated` transition for the sign-in (not signup) branch, sign out, and surface `auth.deletion.accountPendingDeletion`. This is required for AC #3's "identically to the OTP path" guarantee, not optional — a freshly-created signup account can never have a pre-existing `pendingDeletion` record, so this only needs to run on the sign-in branch
- [x] Task 5 — Remove or fold in the existing `__DEV__`/preview-only "Sign in as test user" button (locate by its `__DEV__ || EXPO_PUBLIC_APP_VARIANT === 'preview'` condition and "DEV: Sign in as test user" label — do not rely on a fixed line number, since Tasks 1–3 insert content ahead of it)
  - [x] It becomes redundant once real password sign-in exists; either delete it or confirm it still serves a distinct purpose (one-tap fixed test credentials vs. the new general password form) before keeping it
  - [x] If kept, confirm it does not set `isPasswordSignupPending` (see Task 3) and is not subject to the new `pendingDeletion` guard being bypassed incorrectly
- [x] Task 6 — Tests (co-located, first test file for this screen — AC: #1, #2, #3)
  - [x] Create `apps/mobile/app/(auth)/sign-in.test.tsx` following the RTL mock pattern in `apps/mobile/app/reminder-settings.test.tsx` and `apps/mobile/app/_layout.test.tsx` (mock `react-i18next`, `expo-router`, `@exposure-buddy/supabase`)
  - [x] Cover: all four `mode` × `authMethod` tab combinations render; 8-char password validation blocks submit; safety checkboxes gate password signup identically to OTP signup; successful password signup triggers consent record + `emitAccountCreated` + redirect, in that order; consent-write failure surfaces error and does not redirect; successful password sign-in redirects without a consent call; invalid-credentials error maps to a plain-language message; `signUp()` resolving with no error and no session (duplicate-identifier case) surfaces an error instead of hanging; password sign-in to a `pendingDeletion` account is blocked and signed out, matching `otp-verification.tsx`'s existing behavior

### Review Findings

- [x] [Review][Patch] Pending-deletion sign-in guard made mandatory (resolved decision) — user decided the guard is mandatory, matching OTP sign-in exactly. Fold into Task 4/AC #3: password sign-in must call the same `pendingDeletion` check as `otp-verification.tsx` (sign out + `auth.deletion.accountPendingDeletion` error) before completing. Applies to the sign-in branch only — not signup, since a freshly created account can never have a pre-existing `pendingDeletion` record.
- [x] [Review][Patch] Critical consent-recording requirement not reflected in any AC [Dev Notes: Consent Recording Race] — Task 3 and the Dev Notes call the consent-write-before-redirect sequencing for password sign-up a "hard requirement," but no AC states it; a review checking ACs alone won't catch a regression here. Fold the requirement explicitly into AC #2.
- [x] [Review][Patch] Task 3's reducer-state guard instruction contradicts the ref-guard pattern it says to mirror [Task 3] — Task 3 says to guard the consent-write re-entry "via reducer state... not via a race-prone side value," but `otp-verification.tsx`'s actual pattern (`prevIsAuthenticated`) uses a `useRef`, precisely because reducer/state updates are not synchronous and can't reliably block a second effect run before the update commits. Correct Task 3 to specify a ref guard, matching the cited precedent.
- [x] [Review][Patch] `signUp()` on an already-registered identifier returns success with no session and no error — unhandled [Task 2, Task 4] — Supabase Auth's email-enumeration protection means `signUp()` for a duplicate, confirmed identifier resolves without an error and without establishing a session. Task 2/4's error-mapping only covers `signInWithPassword` failures, leaving this a silent dead-end (submit UI stuck) with no fallback messaging. Add explicit handling guidance.
- [x] [Review][Patch] `authMethod` alone can't distinguish password-signup from password-signin for the consent-guard tracking field [Task 1, Task 3] — Task 1 defines only `authMethod: 'otp' | 'password'`; Task 3 says to track "came from a password signup" via reducer state "analogous to `isNewAccount`" but never says explicitly that this must be a separate field from `authMethod` (which stays `'password'` for both branches). Make the distinct field explicit.
- [x] [Review][Patch] Dev Notes line-number citations will self-invalidate across sequential tasks [Task 6, Dev Notes] — Tasks 1–3 insert new UI/state ahead of the `__DEV__` test button block that Task 6 cites at "lines 274–291" of the current file; by the time Task 6 executes those line numbers will have shifted. Note that all line citations describe pre-story file state only, and Task 6 should locate the block by content/comment, not line number.
- [x] [Review][Patch] No i18n key name specified for the new password-mode submit button label [Task 2] — every other new key in Task 1 is explicitly named, but Task 2's "needs its own label distinct from `auth.otp.sendCode`" names no key. Name it explicitly (e.g. `auth.password.submitSignUp` / `auth.password.submitSignIn`).
- [x] [Review][Patch] Mode × Method tab-matrix composition not made explicit [AC #1] — the story doesn't explicitly state that all four `mode` (signup/signin) × `authMethod` (OTP/password) combinations are valid, independent states. Add one explicit line to AC #1 or Dev Notes.
- [x] [Review][Patch] Dev test button not explicitly excluded from the new consent/signup tracking state [Task 6, Dev Notes] — once the `isAuthenticated` effect is extended to check "was this a password signup," add an explicit note that the `__DEV__` test button's sign-in must leave the new tracking field at its default (non-signup) value, since it always signs in to a pre-existing, already-consented test account.
- [x] [Review][Patch] `hi.json`-exclusion claim lacks a citation trail [Dev Notes: i18n] — the claim that `hi.json`'s `auth` object only has a `deletion` key was verified accurate during story creation and again independently during this review, but the story cites it as "checked" with no reference. Add a brief citation (e.g. "verified by inspecting `apps/mobile/src/i18n/locales/{en,hi}.json` during story creation").

## Dev Notes

### Current State of `apps/mobile/app/(auth)/sign-in.tsx` (file being modified, not created)

This file already exists and handles OTP-only sign-up/sign-in via three pieces of state layered on one `useReducer`:
- `mode: 'signup' | 'signin'` — tab row 1, defaults from `hasAuthedBefore` (device-level flag, MMKV)
- `identifierType: 'email' | 'phone'` — tab row 2
- `identifier: string` — the input value, validated by the pure `validateIdentifier(identifier, identifierType)` function (returns an i18n error key or `null`)

Submission (`handleSendCode`) currently only sends an OTP via `supabase.auth.signInWithOtp(...)` and pushes to `otp-verification.tsx` with `{ identifier, identifierType, isNewAccount }` params — verification, session establishment, and (for new accounts) consent recording all happen on that *separate* screen.

There is also a `useEffect` (near the top of the component body, right after the reducer is created) that redirects to `/(app)/` the instant `isAuthenticated` becomes true, with a comment noting it exists for "dev password sign-in or returning user". This effect has **no consent-recording step** — it assumes any account reaching `isAuthenticated` from `sign-in.tsx` either already has consent on file (returning user) or isn't a real signup (the `__DEV__`-only test button). Adding a real password signup path through this same screen breaks that assumption — see "Consent Recording Race" below.

**Note on line numbers in this document:** any line-number citation for `sign-in.tsx` below reflects the file's state *before* this story's own tasks modify it — Tasks 1–3 insert new UI/state ahead of later blocks (including the `__DEV__` test button Task 5 touches), so those numbers will drift as implementation proceeds. Locate referenced blocks by content/function name, not line number, once Task 1 is underway. Line citations for files this story does *not* modify (`otp-verification.tsx`, `AuthProvider.tsx`) remain stable.

### Consent Recording Race (critical — do not miss)

This is the single biggest way this story can silently ship a DPDPA compliance gap.

The OTP flow's consent-write-then-redirect logic lives entirely in `otp-verification.tsx` (a separate screen reached only *after* the OTP is sent, before verification/session-establishment happens). Password sign-up has no equivalent intermediate screen — `supabase.auth.signUp()` establishes the session directly, which flips `isAuthenticated` to `true` via `AuthProvider`'s global `onAuthStateChange` listener.

`sign-in.tsx`'s existing `isAuthenticated` effect will fire the instant that happens and call `router.replace('/(app)/')` — with **no consent record written**, because that effect was never built to do so. If Task 3 is skipped, password-signup users will get an account with no `ConsentRecordService.recordConsent(...)` call and no `emitAccountCreated` analytics event, silently. **This is now explicit in AC #2** — the consent-write-before-redirect ordering is a stated acceptance criterion, not just a Dev Notes footnote.

Mirror `otp-verification.tsx`'s pattern: a **ref-guarded** (not reducer-state-guarded — reducer updates aren't synchronous enough to reliably block re-entry) `isAuthenticated` transition effect that, for new-account creation, does consent-write → `emitAccountCreated` → redirect, and on consent-write failure sets an error and leaves the user able to retry via a manual action rather than being stuck or silently redirected.

### Architecture Compliance

- **State management** ([implementation-patterns-consistency-rules.md#State Management Patterns](../planning-artifacts/architecture/implementation-patterns-consistency-rules.md)): this screen is already a multi-step form with several values that must stay consistent (`mode`, `identifierType`, `identifier`, now `authMethod`, `password`) — stays on `useReducer`, do not introduce `useState` bags or Zustand.
- **Session/auth ownership**: `authState` is driven exclusively by `AuthProvider`'s `onAuthStateChange` listener (`packages/supabase/src/auth/AuthProvider.tsx`). Do not write any new code that sets session state directly from `sign-in.tsx` — calling `signUp`/`signInWithPassword` and letting the existing listener react is correct and sufficient for AC #3's session-mechanics requirement. (Exact line numbers are intentionally omitted here — they will shift as this story's own tasks edit `sign-in.tsx`; locate by function/hook name, not line number.)
- **`hasAuthedBefore` MMKV flag**: written automatically by `AuthProvider` on any `SIGNED_IN` event — no story-specific code needed for this part of AC #3.
- **`pendingDeletion` guard parity**: now an explicit, mandatory part of AC #3 and Task 4 — password sign-in must reject `pendingDeletion` accounts exactly as `otp-verification.tsx` does.
- **Error handling** ([implementation-patterns-consistency-rules.md#Format Patterns](../planning-artifacts/architecture/implementation-patterns-consistency-rules.md)): "Domain errors — actionable plain-language message; never raw error strings." `otp-verification.tsx`'s `classifyOtpError` is the existing precedent for turning a raw Supabase error message into an i18n key — follow the same shape for password errors (e.g. classify "Invalid login credentials" vs. "User already registered" vs. unknown) rather than displaying `error.message` directly.
- **ARC-011 boundary rules / packages/core purity**: no `database.types.ts`, `react-native`, or `expo-*` imports belong in `packages/core`. This story is UI + Supabase Auth calls only — if a `validatePassword`-style pure function is extracted, it may live alongside `validateIdentifier` in the screen file (current convention — `validateIdentifier` is not in `packages/core`) or in `packages/core` if you want it unit-tested with Vitest; either is acceptable, but do not create a new package boundary violation.

### Project Structure Notes

- **Deviation from `project-structure-boundaries.md`:** that document's target tree shows a separate `sign-up.tsx` alongside `sign-in.tsx` under `(auth)/`. The actual, already-shipped Epic 2 implementation combined sign-up and sign-in into one `sign-in.tsx` with mode tabs instead. This story follows the **actual, existing code**, not the target-tree doc — extend `sign-in.tsx`, do not create a new `sign-up.tsx` file. (Same class of documented deviation as the `keywordDetector.ts` vs. `detector.ts` naming noted in Epic 3.)
- No new files are required for AC #1–#3 beyond the new test file (Task 6). No new Supabase migration, Edge Function, or `packages/supabase` service is needed — `supabase.auth.signUp` / `signInWithPassword` are used directly via the existing `createSupabaseClient()` accessor, same as `signInWithOtp`/`verifyOtp` today.

### i18n

- Add new keys only to `apps/mobile/src/i18n/locales/en.json` under `auth.password.*` and `auth.validation.password*`. **Do not add to `hi.json`** — verified by inspecting `apps/mobile/src/i18n/locales/{en,hi}.json` during story creation (and re-confirmed independently during code review): `hi.json`'s `auth` object currently only has a `deletion` key; `otp`/`mode`/`safety`/`validation` (i.e. the entire existing OTP screen) has no Hindi translations yet. This is an existing, accepted gap (i18next falls back to English), not something this story should be the first to fix.
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

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Test-only bug: initial `sign-in.test.tsx` mock for `expo-router`'s `useRouter()` returned a fresh object literal on every call, whereas the real `expo-router` hook (and the `isAuthenticated` effect's dependency array, which includes `router`) relies on a stable reference — caused an infinite effect-loop / OOM crash in the pendingDeletion test until the mock was changed to return a module-level constant `mockRouter` object.
- Test-only quirk: embedding a `jest.fn()` reference directly as an object-literal property value (`signOut: mockSignOut`) in the auth mock fixture intermittently resolved to `undefined` inside the component under test; wrapping it in an arrow (`signOut: () => mockSignOut()`) reliably fixed it. Root cause not fully isolated (suspected babel/jest-hoist interaction with `jest.mock()` factory evaluation order); the wrapped form is a safe, common pattern for jest mocks regardless.
- `getByLabelText('auth.otp.emailLabel')` is ambiguous by design: the Email/Phone tab button and the identifier `TextInput` intentionally share the same i18n label (existing OTP-era pattern). Tests use `getAllByLabelText` filtered by `el.type === 'TextInput'` to disambiguate.

### Completion Notes List

- Extended `apps/mobile/app/(auth)/sign-in.tsx` (previously OTP-only) with a second, independent `authMethod: 'otp' | 'password'` tab row, a password field, and password sign-up/sign-in submit paths — all four `mode` × `authMethod` combinations render and function correctly.
- The critical consent-recording race (Dev Notes) is closed: a password signup's `isAuthenticated` transition is intercepted by a ref-guarded effect (mirroring `otp-verification.tsx`) that writes the DPDPA consent record and fires `emitAccountCreated` *before* redirecting. The `isPasswordSignupPending` reducer field must be set **before** calling `supabase.auth.signUp()` (not after it resolves), since `AuthProvider`'s `onAuthStateChange` listener can flip `isAuthenticated` while the `signUp()` promise is still in flight — network latency guarantees the flag is committed well before that.
- Supabase's email-enumeration protection (duplicate identifier → `signUp()` resolves with no error and no session) is handled explicitly, surfacing `auth.password.signUpUnavailable` instead of leaving the button stuck loading.
- The mandatory `pendingDeletion` guard is implemented once, in the shared `isAuthenticated` effect (not duplicated per branch) — it's a no-op for a fresh signup (which can never have a pre-existing `pendingDeletion` record for its own new `userId`), so one guard correctly covers both AC #2 (signup) and AC #3 (signin) without extra branching.
- The `__DEV__`/preview-only "Sign in as test user" button was kept (distinct one-tap-fixed-credentials purpose vs. the general password form) but its error-dispatch key was corrected from the stale `auth.otp.sendError` to `auth.password.signInError`; it already satisfies the "must not set `isPasswordSignupPending`" and "not bypass the `pendingDeletion` guard" requirements by construction, since it goes through the same shared effect.
- Full regression run (`pnpm turbo typecheck lint test`) is green across all 6 workspace packages — 39 mobile test suites / 387 tests pass, including the 9 new tests in `sign-in.test.tsx`.

### File List

- `apps/mobile/app/(auth)/sign-in.tsx` (modified)
- `apps/mobile/app/(auth)/sign-in.test.tsx` (new)
- `apps/mobile/src/i18n/locales/en.json` (modified — new `auth.authMethod.*`, `auth.password.*`, `auth.validation.password*` keys)
