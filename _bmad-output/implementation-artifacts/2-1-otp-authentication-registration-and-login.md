# Story 2.1: OTP Authentication — Registration & Login

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a new or returning user,
I want to register or log in using my email address or phone number with OTP verification,
so that I have a secure, password-free account that protects my therapy data.

## Acceptance Criteria

1. **Send code:** Given an unauthenticated user enters a valid email address or phone number and taps "Send code", then a one-time passcode is dispatched via Supabase Auth and the UI transitions to the OTP code-entry screen.

2. **Correct OTP:** Given a user enters the correct OTP and submits, then a valid Supabase session is created; tokens are persisted via `setAuthState(mmkv, session)` (ARC-004 MMKV path — see Dev Notes §Token storage); and the user is routed to `(app)/`.

3. **Invalid OTP:** Given a user enters an incorrect OTP and submits, then `t('auth.otp.invalidCode')` is displayed; no session is created; the user can retry without limit (MVP).

4. **Expired OTP:** Given an OTP expires before use and the user submits, then `t('auth.otp.expired')` is displayed and the user is prompted to request a new code.

5. **Returning user cold-launch:** Given a returning authenticated user launches the app and the MMKV startup sequence completes with valid tokens stored, then the user is routed directly to the home screen without re-authenticating.

6. **AuthTokenProvider DI contract:** Given the `AuthTokenProvider` interface is implemented in `packages/core`, when `apps/mobile` initialises auth, then token provisioning uses constructor DI — `apps/mobile` is the composition root; no direct import of `@supabase/supabase-js` outside `packages/supabase`.

7. **New account event:** Given a new account is successfully created and the OTP is verified, then `onNewAccountCreated(userId)` is emitted via `packages/core/src/events/accountCreated.ts`. This event is the trigger for Story 2.3's preview-completion re-assignment (deferred post-MVP); ownership of re-assignment logic lives in Story 2.3, not here.

8. **Profiles table RLS:** Given a `profiles` table is created and the RLS test harness runs via `supabase test db` / Vitest, then four assertions pass: `[+]` own-row read succeeds, `[−]` cross-user read blocked, `[−]` unauthenticated read blocked, `[stub]` clinician path returns empty (ARC-006, ARC-007).

9. **Production gate:** This story is **NOT production-releasable** until Epic 3's `consent-record` Edge Function and DPO operator panel are both deployed and verified in production (FR-DPO-07 hard gate).

## Tasks / Subtasks

- [x] T1 — Create `packages/core` DI interface and event emitter (AC: 6, 7)
  - [x] `packages/core/src/interfaces/AuthTokenProvider.ts` — interface `{ getUserId(): string | null; getAccessToken(): string | null }`
  - [x] `packages/core/src/events/accountCreated.ts` — simple callback registry: `onNewAccountCreated(userId: string): void`; no Supabase/RN imports; export `emitAccountCreated` and `onAccountCreated` (subscribe)

- [x] T2 — Add `profiles` table migration and update DB types (AC: 8)
  - [x] `supabase/migrations/0003_profiles.sql` — create `profiles` table (`id UUID PK → auth.users CASCADE`, `display_name TEXT`, `created_at TIMESTAMPTZ DEFAULT NOW()`); enable RLS; policies: own-row SELECT, own-row INSERT WITH CHECK, own-row UPDATE
  - [x] `packages/supabase/src/database.types.ts` — add `profiles` Row/Insert/Update hand-authored types alongside existing `users` types

- [x] T3 — Write profiles RLS integration test (AC: 8)
  - [x] `packages/supabase/__tests__/rls/profiles.test.ts` — follow exact pattern from `users.test.ts`; `describe.skipIf(skipIfNoSupabase)` guard; `beforeAll`/`afterAll` admin client setup; four named assertions: `[+] own-row read succeeds`, `[-] cross-user read blocked`, `[-] unauthenticated read blocked`, `[stub] clinician path returns empty (ARC-007)`

- [x] T4 — Replace sign-in placeholder (AC: 1, 3, 4)
  - [x] `apps/mobile/app/(auth)/sign-in.tsx` — email/phone input; `useReducer` for `{ identifier, identifierType, isLoading, errorKey, hasAttemptedSubmit }` (multi-step: silent until first submit, then live-on-blur)
  - [x] Call `createSupabaseClient().auth.signInWithOtp({ email })` or `signInWithOtp({ phone })`
  - [x] On success: `router.push('/(auth)/otp-verification')` with identifier param
  - [x] On error: surface typed error code via i18n key; never raw string
  - [x] Loading state: disable "Send code" button while in-flight
  - [x] Accessibility: `accessibilityLabel` + `accessibilityHint` on all interactive elements; no `dark:` utilities (light-mode only)

- [x] T5 — Create OTP verification screen (AC: 2, 3, 4, 7)
  - [x] `apps/mobile/app/(auth)/otp-verification.tsx` — `useReducer` for `{ code, isLoading, errorKey, hasAttemptedSubmit }`
  - [x] Call `createSupabaseClient().auth.verifyOtp({ email/phone, token: code, type: 'email'/'sms' })`
  - [x] On `AuthError` with `message` matching expired pattern → show `t('auth.otp.expired')`
  - [x] On `AuthError` with invalid-token pattern → show `t('auth.otp.invalidCode')`
  - [x] On success: `onAuthStateChange` fires automatically and updates context; `useEffect` watching `isAuthenticated` transition `false → true` emits `emitAccountCreated(userId)` then `router.replace('/(app)/')`
  - [x] "Resend code" triggers `signInWithOtp` again (no limit MVP); clears error state
  - [x] Accessibility labels and hints on code input and all buttons (all via i18n)

- [x] T6 — Wire auth gate in `(app)/_layout.tsx` (AC: 5)
  - [x] Replace placeholder `apps/mobile/app/(app)/_layout.tsx`: call `useAuth()`; if `!isLoading && !isAuthenticated` → `router.replace('/(auth)/sign-in')`
  - [x] Add `AppState` listener: on change to `'active'` call `createSupabaseClient().auth.getSession()` — catches token expiry during background suspension (ADR-008 §5b)
  - [x] Clean up `AppState` listener in `useEffect` return

- [x] T7 — Add i18n keys (AC: 1, 3, 4)
  - [x] `apps/mobile/src/i18n/locales/en.json` — added under `auth.otp`: `emailLabel`, `phoneLabel`, `sendCode`, `enterCode`, `verify`, `resend`, `invalidCode`, `expired`, `sendError`, `codeLabel`, `codeHint`, `verifyHint`, `resendHint`, `emailInputHint`, `phoneInputHint`, `sendCodeHint`; added `auth.validation`: `emailRequired`, `phoneRequired`, `invalidEmail`, `invalidPhone`

## Dev Notes

### Token Storage Reconciliation (CRITICAL — read before touching auth)

The epics AC says tokens are "stored in Expo SecureStore under key `supabase_access_token` / `supabase_refresh_token`". **This language predates Story 1.7.** Story 1.7 reviewed and merged the ARC-004 MMKV approach: tokens are stored as a JSON blob under MMKV key `auth.state` in an MMKV instance encrypted by a SecureStore-derived key. The MMKV instance **IS** the hardware-backed secure storage.

**What to do:** Call `setAuthState(mmkv, session)` on OTP success — do NOT add separate `SecureStore.setItemAsync('supabase_access_token', ...)` writes. The existing `AuthProvider.tsx` `onAuthStateChange` listener already calls `setAuthState` automatically. You do not need to call it from the screen.

For Story 2.4 sign-out, `clearAuthState(mmkv)` replaces the "delete SecureStore keys" language in that story's AC.

### What Story 1.7 Already Built — Do Not Reinvent

| Utility | File | What it does |
|---------|------|-------------|
| `initSession()` | `packages/supabase/src/auth/session.ts:40` | MMKV init singleton (promise-safe, concurrent-call safe) |
| `setAuthState(mmkv, session)` | `session.ts:72` | Atomically writes session JSON to MMKV |
| `clearAuthState(mmkv)` | `session.ts:81` | Deletes MMKV auth state key |
| `getAuthState(mmkv)` | `session.ts:59` | Reads + parses MMKV auth state; returns `AuthState` |
| `AuthProvider` | `auth/AuthProvider.tsx` | `onAuthStateChange` listener; calls `setAuthState`/`clearAuthState` automatically |
| `useAuth()` | `auth/useAuth.ts` | Returns `{ authState, isLoading, isAuthenticated }` |
| `createSupabaseClient()` | `client.ts` | Singleton Supabase client (`persistSession: false`, `autoRefreshToken: true`) |
| Root layout wiring | `apps/mobile/app/_layout.tsx` | `initSession()` → `setMmkv` → `<AuthProvider mmkv={mmkv}>` |

### Auth Flow Wiring — How OTP Success Propagates Automatically

1. OTP screen calls `supabase.auth.verifyOtp(...)`.
2. On success, Supabase internally fires `onAuthStateChange('SIGNED_IN', session)`.
3. The existing `AuthProvider` listener (already mounted by root layout) calls `setAuthState(mmkv, session)` and updates `authState` context.
4. `useAuth().isAuthenticated` becomes `true` in all subscribers.
5. `(app)/_layout.tsx` sees `isAuthenticated === true` and allows navigation through — **no imperative navigation from the OTP screen is needed after session is confirmed via context**.

Preferred pattern for post-OTP navigation:
```typescript
// otp-verification.tsx
const { isAuthenticated } = useAuth()
useEffect(() => {
  if (isAuthenticated) router.replace('/(app)/')
}, [isAuthenticated])
```

### Cold Start Returning User — Already Works

`AuthProvider.tsx:38-58` bootstraps the stored session from MMKV via `supabase.auth.setSession()` on mount. The `(app)/_layout.tsx` auth gate only needs to guard against `!isLoading && !isAuthenticated` — it must not redirect while `isLoading === true` or it will flash the sign-in screen on every cold start before the bootstrap completes.

### New Account Event Detection (AC7)

`verifyOtp` does not return a "is this a new user?" flag directly. Detect new-account registration like this:

```typescript
// In otp-verification.tsx
const prevIsAuthenticated = useRef(false)
const { authState, isAuthenticated } = useAuth()

useEffect(() => {
  if (isAuthenticated && !prevIsAuthenticated.current) {
    const isNewAccount = /* pass this via route params from sign-in screen
                            based on whether it was a sign-up vs sign-in flow */
    if (isNewAccount && authState.userId) {
      emitAccountCreated(authState.userId)
    }
    prevIsAuthenticated.current = true
  }
}, [isAuthenticated])
```

The simplest MVP approach: the sign-in screen passes an `isNewAccount: boolean` param when navigating to the verification screen (determined by whether the user came from "Create account" vs "Sign in" path). If sign-in/sign-up share one screen (recommended MVP simplification), this is always `true` on first OTP verification — Supabase creates the account if one doesn't exist.

**Sign-in screen tab default (FR-AUTH-03).** The screen has two tabs — "Create account" (`mode: 'signup'`) and "Sign in" (`mode: 'signin'`). The reducer's initial `mode` is chosen via `useReducer`'s lazy initializer based on `useAuth().hasAuthedBefore`: `true` → `'signin'`, `false` → `'signup'`. `hasAuthedBefore` is sourced from MMKV key `auth.hasAuthedBefore` (set by `setAuthState()` on every successful session write; preserved across sign-out; cleared only on reinstall) and surfaced via `AuthContext` per ARC-004 (no MMKV reads after cold start). Tab switches by the user are not persisted — re-mounting the screen always re-runs the lazy initializer.

### Profiles Table

The `profiles` table is for user metadata (display name, preferences) — **distinct from** `public.users` which is the auth linkage table created in Story 1.7. Story 2.1 creates the table and RLS harness; later stories populate it. Follow the 4-item entity checklist from impl-patterns:
1. `database.types.ts` — hand-authored types (done in T2)
2. `packages/supabase/src/mappers/profile.mapper.ts` — if a mapper is added; can defer to the story that first reads/writes profiles if Story 2.1 only creates the schema
3. `packages/core/src/types/profile.ts` — domain type (can defer to first use story)
4. Mapper round-trip test (defer to same)

For Story 2.1, delivering (1) and the RLS test (T3) satisfies AC8. Mapper and domain type may be deferred to the first story that reads a profile.

### AuthTokenProvider Interface

Lightweight — `packages/core` must have zero Supabase/RN imports. The interface is a DI contract:

```typescript
// packages/core/src/interfaces/AuthTokenProvider.ts
export interface AuthTokenProvider {
  getUserId(): string | null
  getAccessToken(): string | null
}
```

No concrete implementation is needed in this story. In a later story, `apps/mobile` will create an adapter wrapping `useAuth()` and inject it into packages/core services that need identity. The CI gate (`grep -r "from.*@supabase" packages/core`) enforces the boundary.

### Supabase OTP API (local Supabase dev)

```typescript
// Request OTP (email)
const { error } = await createSupabaseClient().auth.signInWithOtp({ email })

// Request OTP (phone — international format required)
const { error } = await createSupabaseClient().auth.signInWithOtp({ phone: '+91XXXXXXXXXX' })

// Verify
const { data, error } = await createSupabaseClient().auth.verifyOtp({
  email,          // or phone
  token: code,    // 6-digit string
  type: 'email',  // or 'sms'
})

// Error detection
if (error?.message.toLowerCase().includes('token has expired')) { /* expired */ }
if (error?.message.toLowerCase().includes('token is invalid'))  { /* invalid */ }
// Also check error.status: 401 = invalid/expired, 422 = malformed input
```

For local dev with Supabase CLI (`supabase start`), OTP codes are logged to the Inbucket UI at `http://localhost:54324` (email) — no actual email sent.

### Architecture Must-Follows

- **No `supabase.auth.getUser()` in screens** — use `useAuth()` only (ADR-008 §5c)
- **No `@supabase/supabase-js` import in `apps/mobile` screens** — call via `createSupabaseClient()` from `@exposure-buddy/supabase`
- **`(app)/_layout.tsx` is the SOLE auth enforcement point** — screens inside `(app)/` do not re-check auth
- **`useReducer` for OTP flow** — `code`, `isLoading`, `error`, `hasAttemptedSubmit` must stay consistent; `useState` only for independent single values
- **`Result<T, AppError>` for any packages/core domain functions** — never throw
- **Light-mode only** — no `dark:` Tailwind utilities (ADR-DARK-MODE-NATIVEWIND); use `StyleSheet.create` (not NativeWind) for all screen styles (Story 1.3 NativeWind fallback decision)
- **AppState listener must be cleaned up** in `useEffect` return to prevent memory leak

### Project Structure Notes

Screen files follow Expo Router file-based routing — kebab-case:
```
apps/mobile/app/
  (auth)/
    _layout.tsx         ← already exists (Stack, headerShown: false)
    sign-in.tsx         ← REPLACE placeholder
    otp-verification.tsx ← CREATE
  (app)/
    _layout.tsx         ← REPLACE placeholder (wire auth gate)
    index.tsx           ← untouched placeholder
```

packages/core internal structure — new files go in:
```
packages/core/src/
  interfaces/
    AuthTokenProvider.ts  ← CREATE
  events/
    accountCreated.ts     ← CREATE
```

No barrel export changes needed in `packages/core/src/index.ts` unless consumers outside the package need these — defer until a consumer story.

### References

- ARC-004 cold-start sequence: [Source: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md`]
- ADR-008 auth flow rules §5a–5c: [Source: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`]
- Result type + AppError: [Source: `implementation-patterns-consistency-rules.md` §Error handling]
- useReducer for multi-step flows: [Source: `implementation-patterns-consistency-rules.md` §State Management]
- Token storage (MMKV, not raw SecureStore): [Source: `packages/supabase/src/auth/session.ts`]
- AuthProvider listener (automatic setAuthState): [Source: `packages/supabase/src/auth/AuthProvider.tsx:63-83`]
- Existing RLS test pattern: [Source: `packages/supabase/__tests__/rls/users.test.ts`]
- OTP UX flow F1 H→I: [Source: `_bmad-output/planning-artifacts/ux-design-specification/user-journey-flows.md`]
- Story 2.1 full AC: [Source: `_bmad-output/planning-artifacts/epics.md` §Story 2.1]
- Expo SecureStore keys note reconciliation: [Source: Story 1.7 dev notes — ARC-004 MMKV approach merged]
- ADR-DARK-MODE-NATIVEWIND (light-mode only): [Source: `_bmad-output/planning-artifacts/adrs/ADR-DARK-MODE-NATIVEWIND.md`]
- ADR-ERROR-STATES (loading/error/success states): [Source: `_bmad-output/planning-artifacts/adrs/ADR-ERROR-STATES.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- T1: `AuthTokenProvider` interface and `accountCreated` event emitter created in `packages/core` with zero Supabase/RN imports. Exported from `packages/core/src/index.ts` since `apps/mobile` is an immediate consumer.
- T2: `0003_profiles.sql` migration creates `profiles` table (distinct from `public.users`) with RLS; `database.types.ts` updated with hand-authored Row/Insert/Update types.
- T3: Profiles RLS test follows exact `users.test.ts` pattern; 4 assertions; `describe.skipIf(skipIfNoSupabase)` guard ensures CI passes without local Supabase.
- T4: Sign-in screen uses `useReducer` with `errorKey` (i18n key) pattern; errors are stored as keys, translated at render. `validateIdentifier` returns i18n keys. All accessibility props use `t()`. ESLint `jsx-attributes.exclude` extended with RN input control props (`autoCapitalize`, `keyboardType`).
- T5: OTP verification screen emits `emitAccountCreated` on `isAuthenticated` transition (MVP: always emits). `classifyOtpError` distinguishes expired vs invalid by message pattern and status code. Navigation via reactive `useAuth().isAuthenticated` effect.
- T6: Auth gate guards on `!isLoading && !isAuthenticated` — never redirects while loading (cold-start flash prevention). AppState listener refreshes session on foreground resume.
- T7: Added 17 i18n keys covering all UI strings, accessibility hints, and validation messages. Added `router\.push`, `router\.replace` to ESLint callees.exclude (route paths are not translatable). Added `passWithNoTests: true` to `packages/core` vitest config (mirrors `packages/ui` pattern from Story 1.6).
- All 9 pre-existing tests pass; 0 regressions. Full lint clean. All 3 typecheck targets pass.

### Review Findings

- [x] [Review][Patch] P1: Missing null/undefined guard on navigation params [otp-verification.tsx:62-65] — fixed: guard useEffect + early return null redirects to sign-in if params lost
- [x] [Review][Patch] P2: Resend doesn't set isLoading — concurrent calls possible [otp-verification.tsx:117-129] — fixed: RESEND_START/RESEND_DONE actions added; finally block ensures cleanup
- [x] [Review][Patch] P3: classifyOtpError maps 'unknown' to invalidCode [otp-verification.tsx:103-106] — fixed: unknown kind now routes to auth.otp.sendError; catch block updated too
- [x] [Review][Patch] P4: emitAccountCreated forEach unprotected against listener throws [accountCreated.ts:13-15] — fixed: each listener wrapped in try/catch
- [x] [Review][Patch] P5: Identifier not trimmed before Supabase call [sign-in.tsx, otp-verification.tsx] — fixed: .trim() applied at API call sites in both screens
- [x] [Review][Patch] P6: RLS test IDs used in .eq() without undefined narrowing [profiles.test.ts] — fixed: runtime throw guards added at top of each test (not ! assertions)
- [x] [Review][Defer] Phone digit validation beyond + prefix — MVP scope; spec doesn't mandate digit validation; deferred to post-MVP
- [x] [Review][Defer] getSession() fires on foreground regardless of auth state — minor inefficiency; harmless; per spec (ADR-008 §5b)
- [x] [Review][Defer] isLoading+isAuthenticated inconsistent state — AuthProvider state machine concern; not introduced here
- [x] [Review][Defer] Empty email string in MMKV — pre-existing in packages/supabase/src/auth/session.ts

### File List

- packages/core/src/interfaces/AuthTokenProvider.ts (created)
- packages/core/src/events/accountCreated.ts (created)
- packages/core/src/index.ts (modified — exports for new interfaces and events)
- packages/core/vitest.config.ts (modified — added passWithNoTests: true)
- supabase/migrations/0003_profiles.sql (created)
- packages/supabase/src/database.types.ts (modified — added profiles table types)
- packages/supabase/__tests__/rls/profiles.test.ts (created)
- apps/mobile/app/(auth)/sign-in.tsx (replaced)
- apps/mobile/app/(auth)/otp-verification.tsx (created)
- apps/mobile/app/(app)/_layout.tsx (replaced)
- apps/mobile/src/i18n/locales/en.json (modified — added auth.otp and auth.validation keys)
- apps/mobile/.eslintrc.js (modified — extended jsx-attributes.exclude and callees.exclude)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified — status: in-progress → review)
- _bmad-output/implementation-artifacts/2-1-otp-authentication-registration-and-login.md (this file)
