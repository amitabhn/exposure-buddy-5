# Story 2.4: Account Deletion & Session Sign-Out

Status: done

## Story

As an authenticated user,
I want to sign out of my account and, if needed, request permanent deletion of my data,
so that I control my presence in the app and my data is handled per DPDPA 2023 (FR-DPO-03).

## Acceptance Criteria

1. **Sign-out — Session termination and token cleanup**
   Given an authenticated user taps "Sign out" in Settings
   When sign-out executes
   Then the Supabase session is terminated; Expo SecureStore keys `"supabase_access_token"` and `"supabase_refresh_token"` are **deleted** (not overwritten with null); MMKV `"preview_challenges"` key is **not** cleared; the user is routed to the unauthenticated sign-in screen (via the existing auth gate in `(app)/_layout.tsx`)

2. **Deletion dialog — Required DPDPA copy**
   Given an authenticated user navigates to Settings → Privacy → Delete my account
   When the confirmation dialog renders
   Then the dialog displays all of the following via `t()` keys: what happens (all personal data permanently deleted after 30 days); what is retained (consent records per DPDPA 2023 — account lifetime + 2 years post-deletion); what the 30-day window means (account is inaccessible during window; user cannot log back in or cancel once confirmed); DPO contact email (placeholder pending Story 3.5 Privacy Notice)

3. **Deletion request — DPO stub and sign-out**
   Given the user confirms deletion
   When the request is submitted
   Then `IDpoService.requestErasure(userId)` is called — interface at `packages/core/src/services/IDpoService.ts`; pre-Epic-3 the `DpoServiceStub` at `packages/core/src/stubs/DpoServiceStub.ts` is injected — it writes `{ userId, requestedAt: ISO8601, status: 'pending' }` to MMKV under key `"pending_deletion_request"` via an injected `StorageWriter` callback (ARC-011 boundary); the user is then signed out (AC1 sign-out path executes); the user lands on the sign-in screen

4. **Login rejection — Pending deletion guard (pre-Epic-3 client-side)**
   Given a user previously confirmed deletion and the `"pending_deletion_request"` MMKV entry exists on this device
   When their OTP is verified and `isAuthenticated` becomes true
   Then if `pendingDeletion.userId === authState.userId`, sign-out is called immediately; `t('auth.deletion.accountPendingDeletion')` is displayed in the OTP screen error area; the user is NOT routed into the app

5. **Audit log — Epic 3 dependency (documented gate)**
   Given the deletion request has been submitted and Epic 3's `/dpo/erase-user` is deployed
   When the DPO audit log is checked
   Then a log entry exists in `dpo_audit_log` via `/dpo/erase-user` Edge Function (FR-DPO-06, ARC-008); this story only ships the pre-Epic-3 stub path; this AC is satisfied by Epic 3

## Tasks / Subtasks

- [x] T1 — Add `IDpoService` interface, `PendingDeletionRecord` type, and `DpoServiceStub` to packages/core (AC: 3)
  - [x] Create `packages/core/src/services/IDpoService.ts` — `export type PendingDeletionRecord = { userId: string; requestedAt: string; status: 'pending' }` and `export interface IDpoService { requestErasure(userId: string): Promise<void> }`
  - [x] Create `packages/core/src/stubs/DpoServiceStub.ts` — constructor accepts `StorageWriter = (key: string, value: string) => void`; `requestErasure` writes `PendingDeletionRecord` JSON to key `"pending_deletion_request"` via writer callback; logs in `__DEV__`; returns `Promise<void>`
  - [x] Export both from `packages/core/src/index.ts`

- [x] T2 — Add `signOut` function to `packages/supabase/src/auth/session.ts` (AC: 1)
  - [x] Add `export async function signOut(mmkv: MMKV): Promise<void>` that: (1) calls `await createSupabaseClient().auth.signOut()` which triggers `SIGNED_OUT` → `clearAuthState(mmkv)` via existing listener; (2) additionally calls `clearAuthState(mmkv)` directly as belt-and-suspenders; (3) calls `await SecureStore.deleteItemAsync('supabase_access_token').catch(() => {})` and `await SecureStore.deleteItemAsync('supabase_refresh_token').catch(() => {})` — these keys don't exist in the current MMKV-based session implementation but are deleted defensively as required by AC1
  - [x] Import `createSupabaseClient` from `../client` (already used in the file pattern)
  - [x] Export `signOut` from `packages/supabase/src/index.ts`

- [x] T3 — Extend `AuthProvider` and `useAuth` with signOut, requestAccountDeletion, pendingDeletion (AC: 1, 3, 4)
  - [x] In `packages/supabase/src/auth/AuthProvider.tsx`:
    - Add `signOut: () => Promise<void>` and `requestAccountDeletion: () => Promise<void>` and `pendingDeletion: PendingDeletionRecord | null` to `AuthContextValue` interface
    - Add `pendingDeletion` state: `const [pendingDeletion, setPendingDeletion] = useState<PendingDeletionRecord | null>(null)`
    - In the MMKV bootstrap `useEffect` (after `getAuthState`), read `mmkv.getString('pending_deletion_request')` and `setPendingDeletion(JSON.parse(raw))` — catch JSON parse errors silently
    - Implement `signOut: () => signOut(mmkvRef.current!)` — import `signOut` from `./session` (renamed to avoid collision: import `{ signOut as sessionSignOut }`)
    - Implement `requestAccountDeletion`: create `DpoServiceStub((key, val) => mmkvRef.current!.set(key, val))`, call `await stub.requestErasure(authState.userId!)`, then call `await sessionSignOut(mmkvRef.current!)`; update `pendingDeletion` state after the write
    - Import `DpoServiceStub, PendingDeletionRecord` from `@exposure-buddy/core` (already a workspace dep)
    - Pass all three through `AuthContext.Provider value`
  - [x] In `packages/supabase/src/auth/useAuth.ts`:
    - Add `signOut: () => Promise<void>`, `requestAccountDeletion: () => Promise<void>`, `pendingDeletion: PendingDeletionRecord | null` to `UseAuthResult`
    - Destructure from `useContext(AuthContext)` and return

- [x] T4 — Add `auth.deletion.*`, `settings.*`, `nav.settings` i18n keys (AC: 2, 4)
  - [x] Add to `apps/mobile/src/i18n/locales/en.json`:
    - `auth.deletion.accountPendingDeletion`: `"Your account is scheduled for deletion and cannot be accessed. If you believe this is an error, contact us at {{dpoEmail}}."`
    - `settings.title`: `"Settings"`
    - `settings.signOut`: `"Sign out"`
    - `settings.privacy.title`: `"Privacy"`
    - `settings.privacy.deleteAccount`: `"Delete my account"`
    - `settings.deletion.dialogTitle`: `"Delete your account"`
    - `settings.deletion.whatHappens`: `"All your personal data will be permanently deleted after 30 days."`
    - `settings.deletion.whatRetained`: `"Your consent records will be retained for the duration of your account plus 2 years after deletion, as required by DPDPA 2023."`
    - `settings.deletion.windowMeaning`: `"During the 30-day window your account will be inaccessible. You will not be able to log back in, and this action cannot be cancelled once confirmed."`
    - `settings.deletion.dpoContact`: `"For questions about your data, contact our Data Protection Officer at {{dpoEmail}}."`
    - `settings.deletion.confirmButton`: `"Delete my account"`
    - `settings.deletion.cancelButton`: `"Cancel"`
    - `nav.settings`: `"Settings"`
  - [x] Note: `{{dpoEmail}}` is a placeholder i18next interpolation key. Hardcode value `"privacy@exposure-buddy.com"` for MVP; Story 3.5 will update to the real DPO email from the Privacy Notice

- [x] T5 — Create Settings screen (AC: 1, 2, 3)
  - [x] Create `apps/mobile/app/(app)/settings/index.tsx`:
    - Import `useAuth` from `@exposure-buddy/supabase`
    - `const { signOut, requestAccountDeletion, authState } = useAuth()`
    - State: `const [showDeleteModal, setShowDeleteModal] = useState(false)` and `const [isSigningOut, setIsSigningOut] = useState(false)` and `const [isDeletingAccount, setIsDeletingAccount] = useState(false)`
    - Sign-out handler: set `isSigningOut = true`, call `await signOut()`, clear flag — router redirect is handled by the auth gate in `(app)/_layout.tsx`; do NOT call `router.replace` manually
    - "Delete my account" row: `onPress={() => setShowDeleteModal(true)}`
    - Render `<DeleteAccountModal visible={showDeleteModal} onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteModal(false)} isLoading={isDeletingAccount} />`
    - `handleConfirmDelete`: set `isDeletingAccount = true`, call `await requestAccountDeletion()`, auth gate handles redirect; clear flag in finally block
    - Use `StyleSheet.create` — no NativeWind
    - All strings via `t()`

- [x] T6 — Create `DeleteAccountModal` component (AC: 2, 3)
  - [x] Create `apps/mobile/src/components/settings/DeleteAccountModal.tsx`:
    - Props: `{ visible: boolean; onConfirm: () => void; onCancel: () => void; isLoading: boolean }`
    - Use React Native `Modal` (not a third-party component) with `transparent={true}` and `animationType="fade"`
    - Render all four DPDPA copy blocks via `t()` keys (T4 keys): whatHappens, whatRetained, windowMeaning, dpoContact (with `dpoEmail: 'privacy@exposure-buddy.com'` interpolation)
    - Two buttons: Cancel (`accessibilityRole="button"`, `accessibilityLabel={t('settings.deletion.cancelButton')}`) and Delete (`accessibilityRole="button"`, destructive styling — `#ef4444` text, `accessibilityLabel={t('settings.deletion.confirmButton')}`)
    - Delete button disabled while `isLoading`
    - Use `StyleSheet.create` — no NativeWind

- [x] T7 — Add Settings tab to `(app)/_layout.tsx` (AC: 1, 2, 3)
  - [x] In `apps/mobile/app/(app)/_layout.tsx`: add `<Tabs.Screen name="settings/index" options={{ title: t('nav.settings') }} />` — Expo Router v4 requires the full path `"settings/index"` for a nested index file tab

- [x] T8 — Add pending deletion guard to OTP verification screen (AC: 4)
  - [x] In `apps/mobile/app/(auth)/otp-verification.tsx`:
    - Destructure `pendingDeletion, signOut` from `useAuth()`
    - In the `isAuthenticated` useEffect, before the `isNewAccount` branch, add the deletion guard:
      ```
      if (pendingDeletion?.userId === authState.userId) {
        signOut().catch(() => {})
        dispatch({ type: 'SUBMIT_ERROR', payload: 'auth.deletion.accountPendingDeletion' })
        prevIsAuthenticated.current = false  // allow re-check after sign-out clears state
        return
      }
      ```
    - Add `pendingDeletion` and `signOut` to the `useEffect` dependency array
    - The `t('auth.deletion.accountPendingDeletion')` error renders via the existing `{state.errorKey ? <Text ...>{t(state.errorKey)}</Text> : null}` — uses i18next interpolation for `dpoEmail`; pass `{ dpoEmail: 'privacy@exposure-buddy.com' }` to `t()` for the interpolation

- [x] T9 — Unit tests (AC: 1, 3, 4)
  - [x] Create `packages/core/src/stubs/DpoServiceStub.test.ts`:
    - Test: `requestErasure` calls writer callback with key `"pending_deletion_request"`
    - Test: written value is valid JSON with `userId`, `requestedAt` (ISO string), `status: 'pending'`
    - Test: `requestErasure` returns a Promise that resolves (no throw)
  - [x] Create `apps/mobile/src/components/settings/DeleteAccountModal.test.tsx`:
    - Test: all four DPDPA copy keys render when `visible={true}`
    - Test: `onConfirm` fires when delete button pressed
    - Test: `onCancel` fires when cancel button pressed
    - Test: delete button is disabled when `isLoading={true}`
    - Test: accessibility roles and labels on both buttons
  - [x] Create `apps/mobile/app/(app)/settings/index.test.tsx`:
    - Mock `useAuth` to return `{ signOut: jest.fn(), requestAccountDeletion: jest.fn(), authState: { userId: 'u1', ... } }`
    - Test: "Sign out" button renders
    - Test: pressing "Sign out" calls `signOut`
    - Test: "Delete my account" row renders
    - Test: pressing "Delete my account" opens modal (showDeleteModal state)

- [x] T10 — CI checks (all ACs)
  - [x] Run `turbo run typecheck` — all targets must pass
  - [x] Run `turbo run lint` — clean
  - [x] Run `turbo run test` — all existing tests plus new tests pass

## Dev Notes

### Architecture: Why signOut Lives in packages/supabase

`packages/supabase/src/auth/session.ts` already handles all auth token I/O (MMKV + SecureStore). Adding `signOut` there keeps token lifecycle in one file. The function:
1. Calls `createSupabaseClient().auth.signOut()` → triggers `SIGNED_OUT` in the `onAuthStateChange` listener → `clearAuthState(mmkv)` is called reactively (already implemented in `AuthProvider`)
2. Calls `clearAuthState(mmkv)` directly — belt-and-suspenders for offline/fast sign-out paths where the listener may race
3. Deletes `"supabase_access_token"` and `"supabase_refresh_token"` from SecureStore — these keys are NOT written by the current MMKV-based implementation (`persistSession: false` in client.ts means the Supabase JS library does not write to SecureStore), but the AC explicitly requires them to be deleted. The `.catch(() => {})` ensures a no-op if the keys don't exist.

**MMKV `"preview_challenges"` key is safe.** `clearAuthState(mmkv)` only calls `mmkv.delete(MMKV_KEYS.AUTH_STATE)` where `MMKV_KEYS.AUTH_STATE = 'auth.state'`. It does NOT call `mmkv.clearAll()`. Preview challenges are preserved automatically.

**Post-sign-out sign-in tab default (FR-AUTH-03).** Sign-out routes to `(auth)/sign-in`, which previously always defaulted to the "Create account" tab — jarring for a returning user who just signed out. A new MMKV key `MMKV_KEYS.HAS_AUTHED_BEFORE = 'auth.hasAuthedBefore'` is set by `setAuthState()` on every successful session write and read by `AuthProvider` at bootstrap. `clearAuthState()` does NOT touch this key — it persists across sign-out and is only lost on reinstall (MMKV key rotation). The sign-in screen reads `hasAuthedBefore` via `useAuth()` and lazy-initializes its `mode` reducer to `'signin'` when true, `'signup'` when false. Surfaced via context (not a second MMKV read) per `implementation-patterns § "read auth state from context only after cold start"`.

### Architecture: DpoServiceStub ARC-011 Compliance

`packages/core` must have zero `react-native`, `expo-*`, or `@supabase/*` imports (ARC-011). MMKV is `react-native-mmkv`. The stub cannot import MMKV directly.

Solution: inject a `StorageWriter = (key: string, value: string) => void` callback:

```typescript
// packages/core/src/stubs/DpoServiceStub.ts
import type { IDpoService } from '../services/IDpoService'
import type { PendingDeletionRecord } from '../services/IDpoService'

type StorageWriter = (key: string, value: string) => void

export class DpoServiceStub implements IDpoService {
  constructor(private write: StorageWriter) {}

  async requestErasure(userId: string): Promise<void> {
    const record: PendingDeletionRecord = {
      userId,
      requestedAt: new Date().toISOString(),
      // eslint-disable-next-line i18next/no-literal-string
      status: 'pending',
    }
    // eslint-disable-next-line i18next/no-literal-string
    this.write('pending_deletion_request', JSON.stringify(record))
    if (__DEV__) {
      console.log('[DpoServiceStub] requestErasure', userId)
    }
  }
}
```

In `AuthProvider` (which has mmkv in scope):
```typescript
const stub = new DpoServiceStub((key, val) => mmkvRef.current!.set(key, val))
```

### Architecture: AuthProvider Extensions

`packages/supabase` already depends on `@exposure-buddy/core` (see `packages/supabase/package.json`). Importing `DpoServiceStub` and `PendingDeletionRecord` into `AuthProvider.tsx` is valid.

**Name collision**: `session.ts` exports a function called `signOut`. `AuthProvider.tsx` must rename the import to avoid shadowing: `import { signOut as sessionSignOut, ... } from './session'`.

**pendingDeletion bootstrap**: Read from MMKV in the same `useEffect` that bootstraps `getAuthState`. This fires when `mmkv` prop transitions from `null` to available — identical timing to auth state restore. No additional async step needed.

**requestAccountDeletion guard**: Check `authState.userId` is not null before calling `stub.requestErasure`. If null (should never happen in (app)/ but defensive), throw rather than write a stub record with `userId: null`.

### Architecture: Settings Screen and Navigation

After `signOut()` resolves, `isAuthenticated` in the `AuthProvider` context becomes `false` (triggered by `SIGNED_OUT` event). The existing `useEffect` in `(app)/_layout.tsx` already handles the redirect:
```typescript
if (!isLoading && !isAuthenticated) {
  router.replace('/(auth)/sign-in')
}
```
**Do NOT call `router.replace` in the Settings screen.** The gate handles it. Just call `signOut()` and let the gate fire.

**Tab route name**: Expo Router v4 maps `app/(app)/settings/index.tsx` → tab name `"settings/index"`. Use `<Tabs.Screen name="settings/index" .../>`.

### Architecture: OTP Screen Pending Deletion Guard (AC4 — Pre-Epic-3)

The MMKV `"pending_deletion_request"` entry is written on device when the user requests deletion. If the user then signs back in on the same device:

1. AuthProvider bootstraps: reads `"pending_deletion_request"` from MMKV → sets `pendingDeletion` state
2. OTP verification succeeds → `isAuthenticated` becomes true
3. The `isAuthenticated` effect in `otp-verification.tsx` checks `pendingDeletion?.userId === authState.userId` BEFORE the `isNewAccount` branch
4. If match: calls `signOut()` (which fires `clearAuthState` → AuthProvider clears `authState` + `pendingDeletion`), dispatches `SUBMIT_ERROR` with `'auth.deletion.accountPendingDeletion'`

**Dependency array**: The guard reads `pendingDeletion` — add it to the dependency array: `[isAuthenticated, authState.userId, isNewAccount, pendingDeletion]`.

**`prevIsAuthenticated.current = false`**: After calling `signOut()`, `isAuthenticated` will become `false` again. Setting `prevIsAuthenticated.current = false` ensures the effect can re-trigger if something weird happens, but in practice `signOut()` clears auth and the effect won't re-enter the signed-in branch.

**Interpolation in t()**: The `auth.deletion.accountPendingDeletion` key uses `{{dpoEmail}}`. Pass it: `t('auth.deletion.accountPendingDeletion', { dpoEmail: 'privacy@exposure-buddy.com' })`.

**Cross-device limitation (documented)**: This is a client-side MMKV guard. If the user uses a different device, the `"pending_deletion_request"` key won't exist and they can log in. Epic 3's `/dpo/erase-user` Edge Function provides the server-side enforcement. This is the intentional MVP scope boundary.

### Sign-In Screen — No Changes Required

The sign-in screen (`sign-in.tsx`) does not need modification for this story. The pending deletion guard is in the OTP verification screen (post-verification) because the identifier entered at sign-in cannot be matched against the stored `userId` without an extra Supabase lookup.

### File Checklist

**New files:**
- `packages/core/src/services/IDpoService.ts`
- `packages/core/src/stubs/DpoServiceStub.ts`
- `packages/core/src/stubs/DpoServiceStub.test.ts`
- `apps/mobile/app/(app)/settings/index.tsx`
- `apps/mobile/app/(app)/settings/index.test.tsx`
- `apps/mobile/src/components/settings/DeleteAccountModal.tsx`
- `apps/mobile/src/components/settings/DeleteAccountModal.test.tsx`

**Modified files:**
- `packages/core/src/index.ts` — add `IDpoService`, `PendingDeletionRecord`, `DpoServiceStub` exports
- `packages/supabase/src/auth/session.ts` — add `signOut(mmkv: MMKV): Promise<void>`
- `packages/supabase/src/auth/AuthProvider.tsx` — extend `AuthContextValue`; add `pendingDeletion` state; implement `signOut` and `requestAccountDeletion`; bootstrap `pendingDeletion` from MMKV
- `packages/supabase/src/auth/useAuth.ts` — extend `UseAuthResult` with new fields
- `packages/supabase/src/index.ts` — export `signOut`, `PendingDeletionRecord`
- `apps/mobile/app/(app)/_layout.tsx` — add Settings tab
- `apps/mobile/app/(auth)/otp-verification.tsx` — add deletion guard in `isAuthenticated` effect
- `apps/mobile/src/i18n/locales/en.json` — add `auth.deletion.*`, `settings.*`, `nav.settings` keys

### Architecture Must-Follows (all inherited from Stories 2.1/2.2)

- **`StyleSheet.create` only** — no NativeWind/Tailwind; ADR-DARK-MODE-NATIVEWIND still in effect
- **`useReducer` for multi-field state** — the Settings screen has only independent single-state values (`showDeleteModal`, `isSigningOut`, `isDeletingAccount`) so `useState` is correct here
- **i18n keys, never hardcoded strings** — all user-visible text via `t()`; `eslint-disable-next-line i18next/no-literal-string` above any internal ID literal (e.g. `'pending_deletion_request'`, `status: 'pending'`)
- **No direct Supabase auth calls in screens** — use `signOut()` and `requestAccountDeletion()` from `useAuth()`; never call `createSupabaseClient().auth.signOut()` from `settings/index.tsx`
- **packages/core zero-framework boundary** — `IDpoService`, `PendingDeletionRecord`, `DpoServiceStub` must have zero `react-native`, `expo-*`, or `@supabase/*` imports (ARC-011); `StorageWriter` callback is the injection point
- **`__DEV__` in DpoServiceStub** — same pattern as `ConsentRecordServiceStub`; acceptable because consumers are always RN apps; no polyfill needed in packages/core
- **All Edge Function calls from packages/supabase only** — DpoServiceStub is pre-Epic-3; when Epic 3 wires the real `/dpo/erase-user`, it must be called from a `packages/supabase` function, not from apps/mobile directly

### Future Story Notes (do not implement)

- **Story 4.1 (KV_KEYS)**: Will create a `KV_KEYS` constant file with `PENDING_DELETION_REQUEST: 'pending_deletion_request'`. The raw string `'pending_deletion_request'` in `DpoServiceStub` will be refactored to use `KV_KEYS` at that point. A lint rule prohibiting raw MMKV key literals in `apps/mobile` will also be added in Story 4.1.
- **Story 3.3 (DPO Edge Functions)**: Replaces `DpoServiceStub` with a real `DpoService` that calls `/dpo/erase-user`. The `IDpoService` interface contract is unchanged.

### Deferred Work

- **DPO email and data-deletion dialog copy review** — The DPO contact email is currently hardcoded as `privacy@exposure-buddy.com` in two places (`apps/mobile/src/components/settings/DeleteAccountModal.tsx` and `apps/mobile/app/(auth)/otp-verification.tsx`) and the deletion dialog copy (`settings.deletion.*` i18n keys) has not been reviewed by a DPO or legal counsel. Both must be reviewed and updated before production release. Tracked by W2 in Review Findings above; Story 3.5 (Privacy Notice) is the target story for consolidating the real DPO email into a single constant and finalising the copy.

### References

- `packages/supabase/src/auth/session.ts` — `clearAuthState`, `MMKV_KEYS`, MMKV initialization pattern to follow
- `packages/supabase/src/auth/AuthProvider.tsx` — existing `AuthContextValue`, `mmkvRef`, bootstrap `useEffect` pattern to extend
- `packages/supabase/src/auth/useAuth.ts` — `UseAuthResult` shape to extend
- `packages/supabase/src/index.ts` — existing exports; add `signOut` and `PendingDeletionRecord`
- `packages/core/src/stubs/ConsentRecordServiceStub.ts` — exact `__DEV__` pattern and stub structure to mirror for `DpoServiceStub`
- `packages/core/src/index.ts` — add to existing exports, do not replace
- `apps/mobile/app/(app)/_layout.tsx` — existing `Tabs` structure; add `<Tabs.Screen name="settings/index" .../>`
- `apps/mobile/app/(auth)/otp-verification.tsx` — `isAuthenticated` effect at line ~104; add deletion guard at top of the `if (isAuthenticated && !prevIsAuthenticated.current)` block
- `apps/mobile/src/i18n/locales/en.json` — add under `auth.deletion` and new `settings` top-level key
- Story 2.2 `Dev Notes § Architecture Must-Follows` — `useReducer` conventions, `StyleSheet.create`, i18n patterns
- `epics.md §Story 2.4` — line 731; `epics.md §Story 3.3 AC` — line 843 documents what Epic 3's `/dpo/erase-user` resolves (the `pending_deletion_request` MMKV entry is cleared by Epic 3's execution)
- `ADR-DPDPA-WITHDRAWAL-DEFERRAL.md` — confirms account deletion is the only withdrawal mechanism at MVP

## Review Findings

- [x] [Review][Decision] D1: ARC-011 — `AuthProvider` directly constructs `new DpoServiceStub(...)` instead of receiving `IDpoService` via injection — coupling `packages/supabase` to the concrete stub prevents Epic 3 swap without modifying `AuthProvider`; spec states the stub is "injected" (ARC-011 boundary) — **fixed**: added `dpoService?: IDpoService` prop to `AuthProviderProps`; default factory constructs `DpoServiceStub`; unit test deferred (no React test infra in packages/supabase — see deferred-work.md)
- [x] [Review][Patch] P1: `signOut()` fire-and-forget in OTP deletion guard — missing `await` causes silent failure on network error and allows race re-entry via `prevIsAuthenticated.current = false` reset [apps/mobile/app/(auth)/otp-verification.tsx:107] — **fixed**: replaced with async IIFE; `prevIsAuthenticated` and dispatch are synchronous; `signOut` is properly awaited with explicit catch
- [x] [Review][Patch] P2: No error handling in `handleSignOut`/`handleConfirmDelete` — thrown errors are swallowed silently; user receives no feedback if either operation fails [apps/mobile/app/(app)/settings/index.tsx:14-29] — **fixed**: added `actionError` state; catch blocks set `t('settings.signOutError')` / `t('settings.deleteAccountError')`; error rendered above Privacy section; i18n keys added to en.json
- [x] [Review][Patch] P3: "Delete my account" row not disabled while `isDeletingAccount` is true — user can re-open modal and trigger a second concurrent `requestAccountDeletion` call [apps/mobile/app/(app)/settings/index.tsx:48] — **fixed**: added `disabled={isDeletingAccount}` and `rowDisabled` style to the row
- [x] [Review][Patch] P4: `mmkvRef.current!` non-null assertions in `signOut`/`requestAccountDeletion` without null guard — throws `TypeError` if called before MMKV is initialised [packages/supabase/src/auth/AuthProvider.tsx:102, 106] — **fixed**: `signOut` returns early if null; `requestAccountDeletion` throws descriptive error; `!` assertions removed
- [x] [Review][Defer] W1: `pending_deletion_request` MMKV key never cleared — intentional MVP design; Epic 3 `/dpo/erase-user` clears it on server-side confirmation; cross-device limitation documented in dev notes [packages/supabase/src/auth/session.ts] — deferred, by design
- [x] [Review][Defer] W2: DPO email `privacy@exposure-buddy.com` duplicated in two files — Story 3.5 consolidates into a real Privacy Notice constant [apps/mobile/src/components/settings/DeleteAccountModal.tsx, apps/mobile/app/(auth)/otp-verification.tsx] — deferred, Story 3.5
- [x] [Review][Defer] W3: `pending_deletion_request` stored in unencrypted MMKV — pre-existing architectural choice; story 9-4 covers MMKV key hygiene [packages/supabase/src/auth/AuthProvider.tsx] — deferred, pre-existing
- [x] [Review][Defer] W4: `DpoServiceStub` used as production implementation — intentional pre-Epic 3 MVP stub path; Epic 3 replaces it with real `DpoService` [packages/supabase/src/auth/AuthProvider.tsx:106] — deferred, by design
- [x] [Review][Defer] W5: `PendingDeletionRecord.status` only allows literal `'pending'` — no state machine; Epic 3 will expand status model when server-side deletion is wired [packages/core/src/services/IDpoService.ts:3] — deferred, Epic 3
- [x] [Review][Defer] W6: `signOut` exported standalone from `packages/supabase` requiring caller-managed MMKV param — API design risk; callers outside `AuthProvider` must supply their own MMKV instance [packages/supabase/src/index.ts] — deferred, pre-existing pattern
- [x] [Review][Defer] W7: `isAuthenticated` / `authState.userId` brief timing divergence on bootstrap — pre-existing race not introduced by this PR; deletion guard relies on `userId`, not `session` [packages/supabase/src/auth/AuthProvider.tsx] — deferred, pre-existing

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Vitest `__DEV__` undefined in `packages/core` node environment → fixed by adding `define: { __DEV__: false }` to `packages/core/vitest.config.ts`
- `i18next/no-literal-string` lint error on `animationType="fade"` JSX prop → extracted to `const ANIMATION_TYPE = 'fade' as const` with eslint-disable comment
- Duplicate `nav` key in `en.json` after adding `nav.settings` → removed old `nav: { home: "Home" }` block, kept consolidated block with both keys

### Completion Notes List

- T1: Created `IDpoService` interface + `PendingDeletionRecord` type in `packages/core/src/services/IDpoService.ts`; created `DpoServiceStub` with injected `StorageWriter` callback (ARC-011 compliant — zero framework imports); exported from `packages/core/src/index.ts`
- T2: Added `signOut(mmkv)` to `packages/supabase/src/auth/session.ts` — calls Supabase auth.signOut(), belt-and-suspenders `clearAuthState()`, and defensively deletes SecureStore tokens per AC1; exported from `packages/supabase/src/index.ts`
- T3: Extended `AuthProvider` with `pendingDeletion` state (bootstrapped from MMKV on init), `signOut()` wrapper, and `requestAccountDeletion()` (writes stub record, updates state, signs out). Extended `useAuth` return with all three new fields.
- T4: Added all i18n keys to `en.json` under `auth.deletion.*`, `settings.*`, and `nav.settings`. `{{dpoEmail}}` placeholder hardcoded to `privacy@exposure-buddy.com` for MVP.
- T5: Created `apps/mobile/app/(app)/settings/index.tsx` with sign-out handler, delete-account modal trigger, and `DeleteAccountModal`. Auth gate in `(app)/_layout.tsx` handles redirect after signOut — no manual `router.replace`.
- T6: Created `DeleteAccountModal` as an RN `Modal` with four DPDPA copy blocks, cancel/delete buttons with correct accessibility roles and labels, delete disabled while `isLoading`.
- T7: Added `<Tabs.Screen name="settings/index">` to `(app)/_layout.tsx`.
- T8: Added pending deletion guard at top of `isAuthenticated` effect in `otp-verification.tsx`; passes `{ dpoEmail }` interpolation to `t()` for the error display.
- T9: 3 Vitest tests for `DpoServiceStub`; 6 Jest tests for `DeleteAccountModal`; 4 Jest tests for `SettingsScreen` — all passing.
- T10: `turbo run typecheck` ✅, `turbo run lint` ✅, `turbo run test` ✅ (31 tests total: 3 core Vitest + 28 mobile Jest).

### File List

**New files:**
- `packages/core/src/services/IDpoService.ts`
- `packages/core/src/stubs/DpoServiceStub.ts`
- `packages/core/src/stubs/DpoServiceStub.test.ts`
- `apps/mobile/app/(app)/settings/index.tsx`
- `apps/mobile/app/(app)/settings/index.test.tsx`
- `apps/mobile/src/components/settings/DeleteAccountModal.tsx`
- `apps/mobile/src/components/settings/DeleteAccountModal.test.tsx`

**Modified files:**
- `packages/core/src/index.ts`
- `packages/core/vitest.config.ts`
- `packages/supabase/src/auth/session.ts`
- `packages/supabase/src/auth/AuthProvider.tsx`
- `packages/supabase/src/auth/useAuth.ts`
- `packages/supabase/src/index.ts`
- `apps/mobile/app/(app)/_layout.tsx`
- `apps/mobile/app/(auth)/otp-verification.tsx`
- `apps/mobile/src/i18n/locales/en.json`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
