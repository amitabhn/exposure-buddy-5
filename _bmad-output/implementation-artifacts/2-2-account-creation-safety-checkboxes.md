# Story 2.2: Account Creation Safety Checkboxes

Status: done

## Story

As a new user creating an account,
I want to confirm my age and understand the app's wellness scope before my account is created,
So that I give informed, voluntary consent before any personal data is stored (FR-SAFE-01, FR-DPO-04).

**Depends on:** Story 2.1 merged to main. ✅

## Acceptance Criteria

1. **Safety checkbox UI — Display on account creation screen**
   Given a user is on the account creation screen
   When the screen renders
   Then two checkboxes are displayed with required explanatory copy:
   - Above both checkboxes: `t('auth.safety.consentIntro')` — a one-sentence explanation of why these confirmations are required
   - Checkbox 1: `t('auth.safety.ageConfirmation')` — "I confirm I am 18 years of age or older"
   - Checkbox 2: `t('auth.safety.medicoLegalDisclaimer')` — "I understand that Exposure Buddy is a general health and wellness app. Its content is not a substitute for professional medical advice and is not valid for medico-legal proceedings."
   - Both checkboxes unchecked by default
   - "Create account" button disabled by default

2. **Button disabled while checkboxes unchecked**
   Given either or both checkboxes are unchecked
   When the user taps "Create account"
   Then the action does not execute; the button remains disabled; no request is sent

3. **Button enabled when both checkboxes checked**
   Given both checkboxes are checked
   When the user taps "Create account"
   Then the button becomes active and account creation proceeds (OTP is sent)

4. **Consent record interface — Call consent service**
   Given account creation succeeds (OTP verified)
   When the consent event fires
   Then `IConsentRecordService.recordConsent()` is called — interface at `packages/core/src/services/IConsentRecordService.ts` — with payload `{ timestampUtc: ISO8601, purposeId: 'account-creation-v1', consentVersion: '1.0', withdrawalStatus: false }`; direct writes to consent tables from any code path other than the `consent-record` Edge Function are prohibited (FR-DPO-04)

5. **Consent service stub — Pre-Epic-3 implementation**
   Given pre-Epic-3, the `ConsentRecordServiceStub` at `packages/core/src/stubs/ConsentRecordServiceStub.ts` is injected
   When the consent write is called
   Then it logs the payload to `console.log` in dev (`__DEV__`) and resolves immediately; no network call is made

6. **Consent write error handling — Graceful recovery**
   Given account creation succeeds but the consent-record write fails
   When the error is returned
   Then `t('auth.safety.consentWriteFailed')` is surfaced; the account is left in a fully recoverable retry state (user can attempt again); no half-created account persists silently

7. **Production readiness gate**
   Given this story's consent write is stubbed pending Epic 3
   When assessing production readiness
   Then this story is **not production-releasable** until Epic 3's `consent-record` Edge Function is deployed, verified, and `ConsentRecordServiceStub` is replaced with the live Edge Function call (FR-DPO-07 hard gate); if Epic 3 deploys the function before Story 2.2 merges, the stub is replaced with the live call as part of this story's completion criteria

## Tasks / Subtasks

- [x] T1 — Create `IConsentRecordService` interface and `ConsentRecord` type in `packages/core` (AC: 4, 5)
  - [x] Create `packages/core/src/services/IConsentRecordService.ts` — interface `{ recordConsent(payload: ConsentRecord): Promise<void> }`
  - [x] Create `packages/core/src/services/ConsentRecord.ts` — type `{ timestampUtc: string; purposeId: string; consentVersion: string; withdrawalStatus: boolean }`
  - [x] Create `packages/core/src/stubs/ConsentRecordServiceStub.ts` — implementation that calls `if (__DEV__) console.log('[ConsentRecordServiceStub]', payload)` and returns `Promise.resolve()`
  - [x] Export all three from `packages/core/src/index.ts`

- [x] T2 — Add `auth.safety.*` i18n keys (AC: 1, 6)
  - [x] Add to `apps/mobile/src/i18n/locales/en.json` under `auth.safety`:
    - `consentIntro`: `"We need your confirmation on two things before we create your account."`
    - `ageConfirmation`: `"I confirm I am 18 years of age or older"`
    - `medicoLegalDisclaimer`: `"I understand that Exposure Buddy is a general health and wellness app. Its content is not a substitute for professional medical advice and is not valid for medico-legal proceedings."`
    - `consentWriteFailed`: `"We couldn't save your consent record. Please try again."`

- [x] T3 — Add sign-up mode with safety checkboxes to sign-in screen (AC: 1, 2, 3)
  - [x] Extend `apps/mobile/app/(auth)/sign-in.tsx`:
    - Add `mode` state (`'signin' | 'signup'`) to the reducer (new `Action` type `SET_MODE`, initial `mode: 'signup'`)
    - Add `ageConfirmed` and `medicoLegalConfirmed` boolean fields to State (default `false`); add `TOGGLE_AGE` and `TOGGLE_MEDICO_LEGAL` actions
    - Add a mode toggle (two tabs: "Sign in" / "Create account") above the identifier input — reuse the existing `tabRow`/`tab`/`tabActive` style pattern
    - When `mode === 'signup'`: render the `SafetyCheckboxes` component below the identifier input
    - The "Send code" button must be disabled when `mode === 'signup'` and either checkbox is unchecked
    - Pass `isNewAccount: mode === 'signup'` as a route param when navigating to OTP screen

- [x] T4 — Create `SafetyCheckboxes` component (AC: 1, 2, 3)
  - [x] Create `apps/mobile/src/components/auth/SafetyCheckboxes.tsx`
  - [x] Props: `{ ageConfirmed: boolean; medicoLegalConfirmed: boolean; onToggleAge: () => void; onToggleMedicoLegal: () => void }`
  - [x] Render: intro text (`t('auth.safety.consentIntro')`), then two rows each with a touchable checkbox area + label text
  - [x] Checkbox visual: a `View` styled as a 22×22 bordered box; when confirmed, fill with accent colour (`#2D6A5A`) and render a checkmark `✓`; when unchecked, white fill with `#d1d5db` border
  - [x] Each checkbox row: `TouchableOpacity` wrapping both the box and the label text so the full row is tappable (44pt minimum height)
  - [x] Each `TouchableOpacity` has `accessibilityRole="checkbox"`, `accessibilityLabel={t('auth.safety.ageConfirmation')}` / `t('auth.safety.medicoLegalDisclaimer')`, `accessibilityState={{ checked: ageConfirmed }}` / `checked: medicoLegalConfirmed`
  - [x] Use `StyleSheet.create` — no NativeWind (Story 1.3 fallback decision: ADR-DARK-MODE-NATIVEWIND)

- [x] T5 — Wire consent service call into OTP verification screen (AC: 4, 5, 6)
  - [x] Add `isNewAccount` to the `useLocalSearchParams` destructure in `otp-verification.tsx` (string `'true'|'false'` from route params — parse with `isNewAccount === 'true'`)
  - [x] Add `consentError: string | null` to OTP screen State; add `SET_CONSENT_ERROR` and `CLEAR_CONSENT_ERROR` actions to the reducer
  - [x] Refactor the `isAuthenticated` effect in `otp-verification.tsx`:
    - When `isAuthenticated && !prevIsAuthenticated.current && isNewAccount`:
      1. Call `new ConsentRecordServiceStub().recordConsent({ timestampUtc: new Date().toISOString(), purposeId: 'account-creation-v1', consentVersion: '1.0', withdrawalStatus: false })`
      2. On success: call `emitAccountCreated(authState.userId)` then `router.replace('/(app)/')`
      3. On failure: dispatch `SET_CONSENT_ERROR` with `'auth.safety.consentWriteFailed'`; do NOT navigate away; user can retry
    - When `isAuthenticated && !prevIsAuthenticated.current && !isNewAccount`: keep existing behaviour (emit event, navigate immediately)
  - [x] Render `consentError` below the verify button if set: `{state.consentError ? <Text style={styles.errorText}>{t(state.consentError)}</Text> : null}`
  - [x] A retry press on the verify button while `isAuthenticated` (consent already succeeded but failed to record) should re-attempt consent write without calling `verifyOtp` again

- [x] T6 — Export new packages/core items and run CI checks (AC: 4, 5)
  - [x] Verify `packages/core/src/index.ts` exports: `IConsentRecordService`, `ConsentRecord`, `ConsentRecordServiceStub`
  - [x] Run `turbo run typecheck` — all three targets (packages/core, packages/supabase, apps/mobile) must pass
  - [x] Run `turbo run lint` — clean
  - [x] Run `turbo run test` — all existing tests pass; `packages/core` vitest config already has `passWithNoTests: true` (Story 2.1 T7)

- [x] T7 — Component tests for `SafetyCheckboxes` (AC: 1, 2, 3)
  - [x] Create `apps/mobile/src/components/auth/SafetyCheckboxes.test.tsx`
  - [x] Test: renders intro text
  - [x] Test: both checkboxes unchecked by default (verify `accessibilityState.checked === false` on both)
  - [x] Test: `onToggleAge` fires when age checkbox pressed
  - [x] Test: `onToggleMedicoLegal` fires when medico-legal checkbox pressed
  - [x] Test: accessibility roles and labels present

## Dev Notes

### What Story 2.1 Built — Exact Integration Points

**`apps/mobile/app/(auth)/sign-in.tsx`** (already exists — must be modified, not replaced):
- Uses `useReducer` with `State` = `{ identifier, identifierType, isLoading, errorKey, hasAttemptedSubmit }`
- Navigates to OTP screen via `router.push({ pathname: '/(auth)/otp-verification', params: { identifier, identifierType } })`
- Story 2.2 extends this reducer state with `mode`, `ageConfirmed`, `medicoLegalConfirmed`
- **CRITICAL:** The sign-up mode toggle must reuse the existing `tabRow`/`tab`/`tabActive` `StyleSheet` styles — do NOT create new styles for tabs; extend the existing ones

**`apps/mobile/app/(auth)/otp-verification.tsx`** (already exists — must be modified):
- The auth-state effect at line ~75: `if (isAuthenticated && !prevIsAuthenticated.current) { prevIsAuthenticated.current = true; if (authState.userId) emitAccountCreated(authState.userId); router.replace('/(app)/') }`
- Currently emits `emitAccountCreated` on EVERY OTP verification (sign-in and sign-up alike) — this is the MVP simplification from Story 2.1 dev notes. Story 2.2 gates `emitAccountCreated` on `isNewAccount === true`
- `identifier` and `identifierType` are read via `useLocalSearchParams` — add `isNewAccount` to that destructure
- Route params are always strings in Expo Router — parse `isNewAccount` as `isNewAccount === 'true'`
- The consent service instantiation goes here: `new ConsentRecordServiceStub()` — since DI wiring is deferred to Epic 3, direct instantiation of the stub is acceptable MVP scope

**`packages/core/src/index.ts`** (already exists — add exports):
- Currently exports `AuthTokenProvider` interface and `emitAccountCreated`/`onAccountCreated` from events
- Add three new exports: `IConsentRecordService`, `ConsentRecord`, `ConsentRecordServiceStub`
- Folder structure: add `packages/core/src/services/` and `packages/core/src/stubs/` directories

### Consent Service Interface Design

```typescript
// packages/core/src/services/ConsentRecord.ts
export type ConsentRecord = {
  timestampUtc: string      // ISO 8601 / RFC 3339, e.g. "2026-05-23T10:30:00.000Z"
  purposeId: string         // 'account-creation-v1' at MVP
  consentVersion: string    // '1.0' at MVP; allows re-prompt when version increments
  withdrawalStatus: boolean // false at creation; true when user withdraws consent
}

// packages/core/src/services/IConsentRecordService.ts
import type { ConsentRecord } from './ConsentRecord'

export interface IConsentRecordService {
  recordConsent(payload: ConsentRecord): Promise<void>
}
```

The `packages/core` boundary rule (ARC-011): zero `react-native`, `expo-*`, or `@supabase/*` imports. The service interface and stub use only TypeScript primitives — fully compliant. Enforce via `grep -r "from.*@supabase\|from.*react-native\|from.*expo" packages/core/src`.

### Stub Implementation

```typescript
// packages/core/src/stubs/ConsentRecordServiceStub.ts
import type { IConsentRecordService } from '../services/IConsentRecordService'
import type { ConsentRecord } from '../services/ConsentRecord'

export class ConsentRecordServiceStub implements IConsentRecordService {
  async recordConsent(payload: ConsentRecord): Promise<void> {
    if (__DEV__) {
      console.log('[ConsentRecordServiceStub] recordConsent', payload)
    }
  }
}
```

`__DEV__` is a React Native global — **it is available in `apps/mobile` consumers** but NOT in packages/core unit tests. If `packages/core` adds unit tests for the stub, mock `__DEV__` as a global. For now, `packages/core` ships with `passWithNoTests: true` (Story 2.1 T7 established this) — no tests needed in core for the stub.

### Extending the Sign-In Screen Reducer

The sign-in screen's State shape becomes:

```typescript
type State = {
  // existing fields from Story 2.1
  identifier: string
  identifierType: IdentifierType
  isLoading: boolean
  errorKey: string | null
  hasAttemptedSubmit: boolean
  // new fields
  mode: 'signin' | 'signup'
  ageConfirmed: boolean
  medicoLegalConfirmed: boolean
}
```

New Action types:
```typescript
| { type: 'SET_MODE'; payload: 'signin' | 'signup' }
| { type: 'TOGGLE_AGE' }
| { type: 'TOGGLE_MEDICO_LEGAL' }
```

Reducer cases:
```typescript
case 'SET_MODE':
  return { ...state, mode: action.payload, ageConfirmed: false, medicoLegalConfirmed: false }
case 'TOGGLE_AGE':
  return { ...state, ageConfirmed: !state.ageConfirmed }
case 'TOGGLE_MEDICO_LEGAL':
  return { ...state, medicoLegalConfirmed: !state.medicoLegalConfirmed }
```

Initial state addition: `mode: 'signup', ageConfirmed: false, medicoLegalConfirmed: false`.

**Button disabled condition** (extends existing): the send-code button is disabled when `state.isLoading` OR (when `state.mode === 'signup'` AND (`!state.ageConfirmed || !state.medicoLegalConfirmed`)).

### Extending the OTP Screen Reducer

The OTP screen State becomes:

```typescript
type State = {
  // existing fields
  code: string
  isLoading: boolean
  errorKey: string | null
  hasAttemptedSubmit: boolean
  // new field
  consentError: string | null
}
```

New Action types:
```typescript
| { type: 'SET_CONSENT_ERROR'; payload: string }
| { type: 'CLEAR_CONSENT_ERROR' }
```

The refactored `isAuthenticated` effect:

```typescript
useEffect(() => {
  if (isAuthenticated && !prevIsAuthenticated.current) {
    prevIsAuthenticated.current = true

    if (isNewAccount && authState.userId) {
      const consentService = new ConsentRecordServiceStub()
      consentService
        .recordConsent({
          timestampUtc: new Date().toISOString(),
          // eslint-disable-next-line i18next/no-literal-string
          purposeId: 'account-creation-v1',
          // eslint-disable-next-line i18next/no-literal-string
          consentVersion: '1.0',
          withdrawalStatus: false,
        })
        .then(() => {
          emitAccountCreated(authState.userId!)
          router.replace('/(app)/')
        })
        .catch(() => {
          dispatch({ type: 'SET_CONSENT_ERROR', payload: 'auth.safety.consentWriteFailed' })
          // prevIsAuthenticated stays true; user retries via manual button tap below
        })
    } else {
      if (authState.userId) emitAccountCreated(authState.userId)
      router.replace('/(app)/')
    }
  }
}, [isAuthenticated, authState.userId])
```

**Retry path:** When `consentError` is set and `isAuthenticated` is already true, the Verify button's `onPress` handler should detect this state and re-attempt consent write directly (without calling `verifyOtp` again). Check: `if (isAuthenticated && state.consentError) { /* retry consent */ return }`.

### Sign-Up vs Sign-In Mode Toggle

The existing `tabRow` UI pattern (email/phone tabs) is reused for the sign-in/sign-up toggle. Place the mode toggle ABOVE the email/phone tabs so the visual hierarchy is: mode → identifier type → identifier input → (checkboxes if signup) → button.

The mode toggle uses `accessibilityRole="tab"` and `accessibilityState={{ selected: ... }}` — same pattern as the email/phone tabs.

When switching mode from `signup` → `signin`, checkboxes are hidden and their state is reset (`SET_MODE` action resets `ageConfirmed`/`medicoLegalConfirmed` to `false`). This prevents residual checkbox state from leaking into a sign-in flow.

### `SafetyCheckboxes` Component Layout

```
┌─────────────────────────────────────────┐
│  "We need your confirmation on two      │
│   things before we create your account."│
│                                         │
│  ☐  I confirm I am 18 years of age      │
│     or older                            │
│                                         │
│  ☐  I understand that Exposure Buddy    │
│     is a general health and wellness    │
│     app. Its content is not a           │
│     substitute for professional         │
│     medical advice and is not valid     │
│     for medico-legal proceedings.       │
└─────────────────────────────────────────┘
```

Checkbox dimensions: 22×22 box, 6px border-radius, `#d1d5db` border when unchecked, `#2D6A5A` (accent.courage) fill when checked. Row layout: `flexDirection: 'row'`, `alignItems: 'flex-start'`, 12px gap between box and label text. Intro text: `bodySm` size (~13–14px), `#6b7280` colour.

### Architecture Must-Follows

- **No `supabase.auth.*` in screens** — OTP screen already calls `supabase.auth.verifyOtp`; do not add more direct Supabase auth calls
- **`StyleSheet.create` only** — no NativeWind/Tailwind; Story 1.3 NativeWind fallback decision is still in effect
- **`useReducer` for all multi-field state** — `useState` only for independent single values
- **i18n keys, never hardcoded strings** — all user-visible text uses `t()` from `useTranslation()`
- **`eslint-disable-next-line i18next/no-literal-string`** — required above any line with a literal string that is an internal ID (not user-facing), e.g. `purposeId: 'account-creation-v1'`
- **Direct consent table writes prohibited** — the stub is the only consent write path pre-Epic-3; `packages/supabase` must not be called for consent data in this story
- **`packages/core` zero-framework boundary** — `IConsentRecordService`, `ConsentRecord`, and `ConsentRecordServiceStub` must have zero `react-native`, `expo-*`, or `@supabase/*` imports (ARC-011)
- **`__DEV__` is a RN global** — acceptable in `ConsentRecordServiceStub` because consumers are always RN apps; do not add a polyfill in packages/core

### File Checklist

**New files:**
- `packages/core/src/services/IConsentRecordService.ts`
- `packages/core/src/services/ConsentRecord.ts`
- `packages/core/src/stubs/ConsentRecordServiceStub.ts`
- `apps/mobile/src/components/auth/SafetyCheckboxes.tsx`
- `apps/mobile/src/components/auth/SafetyCheckboxes.test.tsx`

**Modified files:**
- `packages/core/src/index.ts` — add three new exports
- `apps/mobile/src/i18n/locales/en.json` — add `auth.safety.*` keys
- `apps/mobile/app/(auth)/sign-in.tsx` — add mode toggle + checkbox state + SafetyCheckboxes component + isNewAccount param
- `apps/mobile/app/(auth)/otp-verification.tsx` — add isNewAccount param handling + consent service call + consentError state

### References

- `packages/core/src/index.ts` — current exports (add to, don't replace)
- `packages/core/src/events/accountCreated.ts` — event bus pattern to follow for new files
- `apps/mobile/app/(auth)/sign-in.tsx` — extend this reducer; do not rewrite from scratch
- `apps/mobile/app/(auth)/otp-verification.tsx:75` — the `isAuthenticated` effect to refactor
- `apps/mobile/src/i18n/locales/en.json` — add `auth.safety` under `auth`
- Story 2.1 dev notes — OTP error classification, `prevIsAuthenticated` ref pattern, `useReducer` conventions
- Architecture `implementation-patterns-consistency-rules.md` — `useReducer`, `AppError`, `Result<T>` patterns
- ADR-DARK-MODE-NATIVEWIND — light-mode + StyleSheet-only for all new screen/component styles
- epics.md §Story 2.2 AC4 — exact consent payload shape and FR-DPO-04 table-write prohibition

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Fixed `__DEV__` TypeScript error in packages/core: added `src/globals.d.ts` declaring the RN global and added `"dom"` to tsconfig lib (needed for `console`).
- Fixed i18next lint error on checkmark `✓` in SafetyCheckboxes: added `eslint-disable-next-line i18next/no-literal-string` comment.
- Added `auth.mode.*` i18n keys (`createAccount`, `signIn`) alongside `auth.safety.*` keys for the mode toggle tabs.

### Completion Notes List

- T1: Created `ConsentRecord` type, `IConsentRecordService` interface, `ConsentRecordServiceStub` class in packages/core under `src/services/` and `src/stubs/`. Added `src/globals.d.ts` for `__DEV__` type and `"dom"` lib in tsconfig. All exported from `src/index.ts`.
- T2: Added `auth.safety.*` and `auth.mode.*` i18n keys to `en.json`.
- T3: Extended sign-in screen reducer with `mode`, `ageConfirmed`, `medicoLegalConfirmed` state and `SET_MODE`, `TOGGLE_AGE`, `TOGGLE_MEDICO_LEGAL` actions. Mode toggle tab row placed above identifier type tabs. SafetyCheckboxes rendered when `mode === 'signup'`. Button disabled when checkboxes incomplete. `isNewAccount` route param passed to OTP screen.
- T4: Created `SafetyCheckboxes` component with `StyleSheet.create`, 22×22 checkbox boxes, `#2D6A5A` accent when checked, full-row `TouchableOpacity`, accessibility roles/labels/state.
- T5: Extended OTP screen with `isNewAccount` param, `consentError` state, refactored `isAuthenticated` effect to branch on `isNewAccount`, consent retry via Verify button when `isAuthenticated && consentError`.
- T6: All CI checks pass — `turbo run typecheck` (10 targets), `turbo run lint` (7 targets), `turbo run test` (18 tests, 0 failures).
- T7: 8 component tests for SafetyCheckboxes covering intro text, unchecked defaults, toggle callbacks, and accessibility attributes.

### Review Findings

- [x] [Review][Patch] [D1 resolved → Option 3] `isNewAccount` undefined: extend nav guard to block and redirect — Extend the existing `identifier`/`identifierType` guard (line 88-92 of `otp-verification.tsx`) to also cover `isNewAccount`. If undefined, log a structured error to the monitoring layer (not just `console.warn`) with session context, show a human-readable message ("We lost your session. Please sign in again to continue."), and redirect to sign-in via `router.replace`. Do NOT write a fallback consent record. Add a test case for this path. Also verify `router.replace` does not persist state that skips the new-account path on re-entry. **Decision rationale (multi-agent review, 2026-05-24):** The sign-in screen always passes `isNewAccount` as `'true'` or `'false'` and never omits it — therefore `undefined` only arises from broken deep-links, crash-recovery state loss, or developer misconfiguration, all of which bypass the consent checkboxes entirely. A `param_missing_fallback`-tagged consent record cannot assert the user saw the consent screen (DPDPA Section 6: consent must be free, specific, informed, and unambiguous); writing such a record creates a false compliance assertion that is materially worse than a documented audit gap. The normal 11pm registration user is never affected — she always has the param. Option 3 keeps the consent table trustworthy, routes the affected user back through a valid registration flow, and surfaces the routing bug to engineering via structured monitoring. [otp-verification.tsx:81, 88-92]

- [x] [Review][Patch] No loading state during consent write/retry — `recordConsent` is fired as an unguarded Promise in both the `useEffect` and the `handleVerify` retry path; the Verify button stays enabled while the write is in-flight, allowing concurrent writes on rapid double-tap. Fix: dispatch a loading action before `recordConsent` and clear it in both `.then()` and `.catch()`. [otp-verification.tsx:94–149]

- [x] [Review][Patch] `isNewAccount` missing from `useEffect` dependency array — The effect reads `isNewAccount` but the dep array only lists `[isAuthenticated, authState.userId]`; stale closure risk in strict mode / fast-refresh cycles. Fix: add `isNewAccount` to the dep array. [otp-verification.tsx:122]

- [x] [Review][Patch] `SET_MODE` reducer doesn't reset `hasAttemptedSubmit` or `errorKey` — Switching mode leaves stale validation state; switching back to signup triggers immediate inline errors on next keypress. Fix: add `hasAttemptedSubmit: false, errorKey: null` to the `SET_MODE` return value. [sign-in.tsx, SET_MODE reducer case]

- [x] [Review][Patch] Retry block in `handleVerify` missing `isNewAccount` guard — Retry fires when `isAuthenticated && state.consentError` with no `isNewAccount` check; currently safe because only the `isNewAccount` branch sets `consentError`, but fragile. Fix: wrap retry block in `if (isNewAccount)`. [otp-verification.tsx:127]

- [x] [Review][Patch] `dom` lib in `packages/core/tsconfig.json` is architecturally incorrect — `packages/core` is a zero-framework domain package (ARC-011); adding `"dom"` makes browser globals (`window`, `document`, etc.) type-valid here, undermining the boundary. `dom` was added for `console` types. Fix: remove `"dom"` from lib; declare `console` explicitly in `globals.d.ts` alongside `__DEV__`. [packages/core/tsconfig.json]

- [x] [Review][Patch] `handleSendCode` lacks early-return guard for `isSendDisabled` — `disabled={isSendDisabled}` prevents UI taps but the function body has no guard; a programmatic call (accessibility action, test harness) bypasses consent validation. Fix: add `if (isSendDisabled) return` at the top of `handleSendCode`. [sign-in.tsx:handleSendCode]

- [x] [Review][Patch] `purposeId` and `consentVersion` magic strings duplicated at both call sites — `'account-creation-v1'` and `'1.0'` are hardcoded with lint-suppress comments in both the effect and retry blocks. Fix: extract as named constants in `packages/core` (e.g. `CONSENT_PURPOSE_ACCOUNT_CREATION`, `CONSENT_VERSION_CURRENT`). [otp-verification.tsx:106, 138]

- [x] [Review][Patch] Inner `<Text>` labels in `SafetyCheckboxes` announce twice on screen readers — `accessibilityLabel` on the `TouchableOpacity` and the visible `<Text style={styles.label}>` are identical strings; VoiceOver/TalkBack reads both. Fix: add `accessible={false}` to both `<Text style={styles.label}>` elements. [SafetyCheckboxes.tsx:29, 43]

- [x] [Review][Defer] Duplicate consent-write logic / timestamp differs on retry — `ConsentRecord` constructed inline in two places with fresh `new Date().toISOString()`; retry timestamp differs from original attempt. Deferred: stub discards all data; refactor when Epic 3 wires real service. [otp-verification.tsx:101–108, 132–139]

- [x] [Review][Defer] `consentError` indistinguishable from OTP error; Verify button label confusing during retry — Both errors use identical `styles.errorText`; button still reads "Verify" when the expected action is consent-retry. Deferred: UX improvement, not a spec violation; address in a polish pass.

- [x] [Review][Defer] Consent bypass via client-only `isNewAccount` param — No server-side enforcement prevents a crafted URL from skipping consent recording. Deferred: Epic 3 Edge Function provides server enforcement (AC7 production gate).

- [x] [Review][Defer] Missing test coverage for OTP consent flow — New branches in `otp-verification.tsx` (consent write success/failure/retry) have zero test coverage. Deferred: out of story T7 scope; add in a future quality story (Epic 9 candidate).

- [x] [Review][Defer] ✓ checkmark Unicode renders inconsistently across Android/iOS — `✓` may differ across font stacks. Deferred: consider SF Symbol or vector icon in a future polish story. [SafetyCheckboxes.tsx:27, 41]

- [x] [Review][Defer] `SafetyCheckboxes` intro `<Text>` lacks `accessibilityRole` — Screen readers announce the intro as plain text with no structural context. Deferred: low severity. [SafetyCheckboxes.tsx:16]

- [x] [Review][Defer] Deep-link `isNewAccount` param fragility — Expo Router URL reconstruction could drop or corrupt the param. Deferred: MVP uses in-app navigation only; revisit when deep-linking is added.

- [x] [Review][Defer] `emitAccountCreated` else-branch navigates without `userId` guard — Inconsistency vs. new `isNewAccount` branch (which waits for userId). Deferred: pre-existing from Story 2.1; else-branch unchanged by this story. [otp-verification.tsx:118]

### File List

**New files:**
- `packages/core/src/services/ConsentRecord.ts`
- `packages/core/src/services/IConsentRecordService.ts`
- `packages/core/src/stubs/ConsentRecordServiceStub.ts`
- `packages/core/src/globals.d.ts`
- `apps/mobile/src/components/auth/SafetyCheckboxes.tsx`
- `apps/mobile/src/components/auth/SafetyCheckboxes.test.tsx`

**Modified files:**
- `packages/core/src/index.ts`
- `packages/core/tsconfig.json`
- `apps/mobile/src/i18n/locales/en.json`
- `apps/mobile/app/(auth)/sign-in.tsx`
- `apps/mobile/app/(auth)/otp-verification.tsx`

## Change Log

- 2026-05-23: Story 2.2 implemented — safety checkboxes UI, consent service interface and stub, OTP screen consent wiring (claude-sonnet-4-6)
