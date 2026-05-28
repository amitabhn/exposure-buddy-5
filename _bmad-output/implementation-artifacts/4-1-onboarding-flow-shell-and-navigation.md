# Story 4.1: Onboarding Flow Shell & Navigation

Status: review

## Story

As a newly registered user,
I want to be guided through a structured onboarding sequence after creating my account,
So that I understand the app and arrive at my Courage Ladder prepared (FR-ONBOARD-01).

## Acceptance Criteria

1. **KV_KEYS centralised key store**
   Given `packages/core/src/constants/kvKeys.ts` is created
   When any code needs to reference an MMKV key
   Then it imports from `KV_KEYS` — the file exports user-scoped key functions (e.g. `ONBOARDING_PROGRESS: (userId: string) => \`onboarding:progress:${userId}\``) and device-scoped constants (e.g. `PREVIEW_CHALLENGES: 'preview_challenges'`) with inline comments documenting scope intent; `PREVIEW_CHALLENGES: 'preview_challenges'` is added as a device-scoped forward-reference constant in this story even though Story 2.3 is deferred — Story 2.4 sign-out logic references it (the `preview_challenges` key must not be cleared on sign-out); raw MMKV key string literals outside this file are prohibited via a lint rule in `apps/mobile`

2. **Post-auth onboarding routing**
   Given a user successfully completes OTP registration (Story 2.1)
   When the auth session is established
   Then the app checks `KV_KEYS.ONBOARDING_COMPLETE(userId)`; if not set, routes to `(onboarding)/welcome`; if set, routes to the home screen; this check runs after key derivation in the MMKV startup sequence (ARC-004)

3. **Onboarding route group and step indicator**
   Given the onboarding route group `(onboarding)/` is scaffolded via Expo Router
   When the user is in onboarding
   Then a step progress indicator shows current step and total (e.g. "Step 2 of 4"); back navigation is available on all steps except the first; all strings are via `t()` keys with EN+HI translations

4. **Onboarding progress resume**
   Given a user is mid-onboarding and closes the app
   When they relaunch
   Then `KV_KEYS.ONBOARDING_PROGRESS(userId)` is read; the app resumes at the first incomplete step; any fear items already enqueued in Story 4.3 are loaded from the local PowerSync cache — not lost

5. **MMKV read failure graceful degradation**
   Given the MMKV read of `KV_KEYS.ONBOARDING_PROGRESS(userId)` fails on resume
   When the error occurs
   Then the app defaults to step 1; a non-blocking toast displays `t('onboarding.resumeFailed.toast')`; no crash; fear items already enqueued remain in the PowerSync queue unaffected

6. **Onboarding skip on subsequent relaunches**
   Given the onboarding complete flag is already written
   When the user relaunches at any future time
   Then the app routes directly past onboarding to the home screen

## Tasks / Subtasks

### Pre-conditions — Resolve before any code change

These were flagged as "done before Story 4.1 created" in the Epic 3 retrospective. Verify/complete them first.

- [x] P1: Fix `react-test-renderer` version mismatch (Epic 3 retro Action Item 1)
  - [x] Confirm current `react-test-renderer` version in `apps/mobile/package.json`
  - [x] Pin it to match the `react` version Expo SDK 54 expects (see deferred-work.md `ENV-1`: `react@19.1.4` installed; align renderer to same version)
  - [x] Verify `pnpm turbo test` passes clean for `apps/mobile` before continuing

- [x] P2: Edge Function security pre-flight checklist (Epic 3 retro Action Item 2)
  - [x] Add the checklist section to `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` under a new `## Edge Function Security Pre-Flight Checklist` heading
  - [x] Items to include: (1) HTTP method guard present on all routes; (2) userId derived from verified JWT, never from request body (BOLA prevention); (3) env vars HTML-encoded before injection into any HTML template; (4) operator tokens in closure/module scope — never `window`-accessible; (5) SECURITY DEFINER functions must pin `SET search_path = public`

- [x] P3: `AuthProvider.tsx` state-transition audit (Epic 3 retro Action Item 3)
  - [x] Read `packages/supabase/src/auth/AuthProvider.tsx` lines 44–58 (state invariants comment block) end-to-end
  - [x] Verify all invariants hold after 5 stories of accumulated changes
  - [x] Document any discovered non-obvious conditions; update the comment block if needed
  - [x] **No code changes required** unless a real invariant violation is found — this is a read-and-confirm task

---

### T1 — Create `packages/core/src/constants/kvKeys.ts` (AC: 1)

- [x] T1.1: Create `packages/core/src/constants/kvKeys.ts` with the exact shape specified in Dev Notes
- [x] T1.2: Export `KV_KEYS` and `ONBOARDING_STEP_COUNT` from `packages/core/src/index.ts`
- [x] T1.3: Add `no-restricted-syntax` rule to `apps/mobile/.eslintrc.js` — ban raw MMKV key string literals passed directly to `mmkv.getString`, `mmkv.set`, `mmkv.getBoolean`, or `mmkv.delete` calls (see Dev Notes for the exact ESLint rule pattern)

### T2 — Onboarding MMKV helpers in `packages/supabase/src/auth/session.ts` (AC: 2, 4, 5, 6)

- [x] T2.1: Import `KV_KEYS` from `@exposure-buddy/core` at top of `session.ts`
- [x] T2.2: Add `getOnboardingComplete(mmkv: MMKV, userId: string): boolean` — reads `KV_KEYS.ONBOARDING_COMPLETE(userId)`, returns false if missing or on error (never throws)
- [x] T2.3: Add `setOnboardingComplete(mmkv: MMKV, userId: string): void` — writes `true` to `KV_KEYS.ONBOARDING_COMPLETE(userId)`
- [x] T2.4: Add `getOnboardingProgress(mmkv: MMKV, userId: string): { step: number } | null` — reads and JSON-parses `KV_KEYS.ONBOARDING_PROGRESS(userId)`; returns null if missing; throws on corrupt JSON (caller catches for graceful degradation in AC5)
- [x] T2.5: Add `setOnboardingProgress(mmkv: MMKV, userId: string, progress: { step: number }): void` — JSON-serialises and writes to `KV_KEYS.ONBOARDING_PROGRESS(userId)`
- [x] T2.6: Export all four new functions from `packages/supabase/src/index.ts` (only if needed by app layer — check before adding)

### T3 — Update `AuthProvider` to expose onboarding state (AC: 2, 4, 5, 6)

- [x] T3.1: Add the following four fields to `AuthContextValue` interface:
  - `isOnboardingComplete: boolean`
  - `markOnboardingComplete: () => void`
  - `onboardingProgressStep: number | null`
  - `setOnboardingProgressStep: (step: number) => void`
- [x] T3.2: Add corresponding `useState` calls in `AuthProvider` body — initial values: `false`, `null`
- [x] T3.3: In the `onAuthStateChange` handler, after `userId` is confirmed from session: read `getOnboardingComplete(store, session.user.id)` and set state; read `getOnboardingProgress(store, session.user.id)` in a try/catch and set state (catch sets `onboardingProgressStep` to `null`)
- [x] T3.4: Implement `markOnboardingComplete`: calls `setOnboardingComplete(mmkvRef.current, userId)`, updates local `isOnboardingComplete` state to `true`; guard: only runs if `mmkvRef.current` and `userId` are non-null
- [x] T3.5: Implement `setOnboardingProgressStep`: calls `setOnboardingProgress(mmkvRef.current, userId, { step })`, updates local `onboardingProgressStep` state; guard: only runs if `mmkvRef.current` and `userId` are non-null
- [x] T3.6: Pass the four new values through `AuthContext.Provider value={...}`

### T4 — Update `useAuth` hook (AC: 2, 4, 5, 6)

- [x] T4.1: In `packages/supabase/src/auth/useAuth.ts`, destructure and return `isOnboardingComplete`, `markOnboardingComplete`, `onboardingProgressStep`, `setOnboardingProgressStep` from `AuthContext`

### T5 — Update `(app)/_layout.tsx` onboarding gate (AC: 2, 6)

- [x] T5.1: Add `isOnboardingComplete` to destructured `useAuth()` result
- [x] T5.2: In the existing `useEffect` that handles `!isLoading && !isAuthenticated → sign-in`, add a second condition: `!isLoading && isAuthenticated && !isOnboardingComplete → router.replace('/(onboarding)/welcome')`
- [x] T5.3: Ensure both redirects are guarded by `!isLoading` — no cold-start flash (existing pattern)
- [x] T5.4: Add `isOnboardingComplete` to the `useEffect` dependency array

### T6 — Create `apps/mobile/app/(onboarding)/_layout.tsx` (AC: 3)

- [x] T6.1: Create the file — Stack navigator (`<Stack screenOptions={{ headerShown: false }} />`)
- [x] T6.2: Auth gate: read `useAuth().isAuthenticated`; if `!isLoading && !isAuthenticated` → redirect to `/(auth)/sign-in` (same guard as `(app)/_layout.tsx`)
- [x] T6.3: The step indicator is rendered **per-screen** (not in the layout) — each screen renders `<OnboardingStepIndicator step={N} />` so the progress is obvious. The layout just provides the Stack navigator and auth gate.
- [x] T6.4: Do NOT add `useOnboarding`-resume logic in the layout — resume happens in `welcome.tsx` (T7.2)

### T7 — Create `apps/mobile/app/(onboarding)/welcome.tsx` (AC: 3, 4, 5)

- [x] T7.1: Render welcome screen content (step 1 of `ONBOARDING_STEP_COUNT`):
  - `<OnboardingStepIndicator step={1} />` at the top
  - `t('onboarding.welcome.title')` heading
  - `t('onboarding.welcome.body')` body text
  - "Get started" CTA button (`t('onboarding.welcome.cta')`)
  - Back navigation is NOT present (step 1 — back would take user out of onboarding; disable via `Stack.Screen options={{ gestureEnabled: false }}`)
- [x] T7.2: Resume logic on mount — read `onboardingProgressStep` from `useAuth()`:
  - If `onboardingProgressStep > 1`: navigate to the appropriate step screen (see Dev Notes for step routing map)
  - If `onboardingProgressStep` is `null` and the previous `getOnboardingProgress` call threw (detect via a flag or separate error state): show toast `t('onboarding.resumeFailed.toast')` and stay on step 1
  - If `onboardingProgressStep` is 1 or null (no error): render normally, no navigation
- [x] T7.3: On "Get started" tap: call `setOnboardingProgressStep(1)` then navigate to `/(onboarding)/assessment` (Story 4.2 entry point)
- [x] T7.4: Create `apps/mobile/app/(onboarding)/assessment.tsx` as a minimal stub (see Dev Notes) so navigation from welcome works without a broken route

### T8 — Create `OnboardingStepIndicator` component (AC: 3)

- [x] T8.1: Create `apps/mobile/src/components/onboarding/OnboardingStepIndicator.tsx`
- [x] T8.2: Props: `{ step: number }` — renders `t('onboarding.stepIndicator', { current: step, total: ONBOARDING_STEP_COUNT })`
- [x] T8.3: Accessible: `accessibilityRole="progressbar"`, `accessibilityValue={{ min: 1, max: ONBOARDING_STEP_COUNT, now: step }}`

### T9 — i18n keys (AC: 3, 5)

- [x] T9.1: Add all onboarding keys to `apps/mobile/src/i18n/locales/en.json` — see Dev Notes for exact key list
- [x] T9.2: Add matching keys (initial HI placeholders) to `apps/mobile/src/i18n/locales/hi.json`

### T10 — Vitest unit tests for new `session.ts` helpers (packages/supabase)

- [x] T10.1: Create `packages/supabase/__tests__/session-onboarding.test.ts`
- [x] T10.2: Test `getOnboardingComplete` returns `false` when key absent, `true` when set
- [x] T10.3: Test `setOnboardingComplete` writes a key that `getOnboardingComplete` reads back as `true`
- [x] T10.4: Test `getOnboardingProgress` returns `null` when key absent, `{ step: 2 }` when set
- [x] T10.5: Test `getOnboardingProgress` throws on corrupt JSON (deliberate corrupt write + catch assertion)
- [x] T10.6: Test round-trip: `setOnboardingProgress(..., { step: 3 })` → `getOnboardingProgress` returns `{ step: 3 }`

### T11 — Jest component tests (apps/mobile)

- [x] T11.1: `welcome.tsx` test — renders heading via `t('onboarding.welcome.title')`, "Get started" button visible
- [x] T11.2: `OnboardingStepIndicator.test.tsx` — renders "Step 1 of 4" copy; `accessibilityValue` has correct `now`

### T12 — Typecheck + lint pass

- [x] T12.1: `pnpm turbo typecheck` passes with zero errors
- [x] T12.2: `pnpm turbo lint` passes with zero errors (including new `no-restricted-syntax` rule)
- [x] T12.3: `pnpm turbo test` passes — including the fixed `react-test-renderer` suite from P1

## Dev Notes

### Pre-condition context

**P1 (react-test-renderer):** The `deferred-work.md` entry `ENV-1` records `react@19.1.4` as installed. Pin `react-test-renderer` to `19.1.4` (matching the installed react version). Do NOT upgrade or downgrade react itself — only align the test renderer.

**P3 (AuthProvider audit):** The state invariants comment block in `AuthProvider.tsx` lines 44–58 is the reference. Key invariant to verify: `isLoading` must reach `false` via every code path (null mmkv, stored session, no stored session, listener-only). Check that the new fields added in T3 also reach a stable initial state on every path.

---

### KV_KEYS exact shape

Create `packages/core/src/constants/kvKeys.ts`:

```typescript
// User-scoped: key includes userId so multiple accounts on one device don't collide.
// Device-scoped: key is a static string; must survive sign-out.
export const KV_KEYS = {
  // ── User-scoped (functions) ──────────────────────────────────────────────
  ONBOARDING_COMPLETE:           (userId: string) => `onboarding:complete:${userId}`,
  ONBOARDING_PROGRESS:           (userId: string) => `onboarding:progress:${userId}`,
  SUDS_CALIBRATION:              (userId: string) => `suds:calibration:${userId}`,
  CRISIS_FLAGGED_IN_ONBOARDING:  (userId: string) => `onboarding:crisis:${userId}`,
  // ── Device-scoped (constants) ────────────────────────────────────────────
  // Forward-reference for Story 2.3 (deferred). Story 2.4 sign-out clears
  // all user-scoped MMKV keys but MUST NOT clear this key.
  PREVIEW_CHALLENGES: 'preview_challenges',
} as const

// Total number of onboarding steps — used by OnboardingStepIndicator and
// any screen that renders the step indicator.
export const ONBOARDING_STEP_COUNT = 4
```

Export from `packages/core/src/index.ts`:
```typescript
export { KV_KEYS, ONBOARDING_STEP_COUNT } from './constants/kvKeys'
```

**Zero imports required** — this file is pure string constants. No `react-native-mmkv`, no other internal deps. It can be imported anywhere including `packages/supabase`.

---

### Lint rule for raw MMKV key literals (`apps/mobile/.eslintrc.js`)

Add a `no-restricted-syntax` rule under `rules`:

```javascript
'no-restricted-syntax': [
  'error',
  {
    // Ban raw string literals as the first argument to MMKV read/write calls in apps/mobile.
    // All MMKV keys must come from KV_KEYS in @exposure-buddy/core.
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.property.name=/^(getString|set|getBoolean|getNumber|delete)$/] > Literal:first-child",
    message:
      "Raw MMKV key string literals are banned in apps/mobile. Import KV_KEYS from '@exposure-buddy/core' and use a typed key constant.",
  },
],
```

> **Important:** `packages/supabase/src/auth/session.ts` already contains `MMKV_KEYS` with raw strings (`'auth.state'`, `'auth.hasAuthedBefore'`). That file is in `packages/supabase`, not `apps/mobile`, so the new lint rule does NOT affect it. Do not migrate `MMKV_KEYS` in `session.ts` — leave it as-is.

---

### AuthProvider changes — what to touch and what NOT to touch

**Touch:** Add the four new fields to `AuthContextValue`, `DEFAULT_AUTH_STATE` equivalent, the `onAuthStateChange` handler (after `userId` confirmed), and the two new action functions.

**DO NOT touch:**
- The `mmkvReadyRef` guard logic — this is the cold-start race prevention; adding code inside or before the guard without understanding it will cause a flash of wrong state
- The `pendingDeletion` lifecycle (Steps A/B in `requestAccountDeletion`)
- The `hasAuthedBefore` write — it must stay in the `onAuthStateChange` SIGNED_IN path
- The `setSession()` bootstrap call and its error handler

**Reading onboarding state after SIGNED_IN:**
The `onAuthStateChange` fires with both new sessions (sign-in) and token refreshes. When reading onboarding state, only read from MMKV once per `userId` — add a ref guard if needed. A simple approach: read in the same `if (session)` branch where `setAuthStateLocal` is called:

```typescript
// in the onAuthStateChange handler, in the if (session) block:
const mmkvStore = mmkvRef.current
if (mmkvStore) {
  setIsOnboardingCompleteLocal(getOnboardingComplete(mmkvStore, session.user.id))
  try {
    const progress = getOnboardingProgress(mmkvStore, session.user.id)
    setOnboardingProgressStepLocal(progress?.step ?? null)
  } catch {
    setOnboardingProgressStepLocal(null)
    // progress read failure is surfaced as null; welcome.tsx toasts the user
  }
}
```

---

### Onboarding route file structure

```
apps/mobile/app/
  (onboarding)/
    _layout.tsx          ← Stack navigator + auth gate (NEW, T6)
    welcome.tsx          ← Step 1 (NEW, T7)
    assessment.tsx       ← Step 2 STUB only — Story 4.2 fills content (NEW, T7.4)
```

The `assessment.tsx` stub (T7.4) content:
```tsx
// Minimal stub — Story 4.2 replaces this content.
import { View, Text, StyleSheet } from 'react-native'
export default function AssessmentScreen() {
  return (
    <View style={styles.container}>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <Text>Step 2 — Story 4.2</Text>
    </View>
  )
}
const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } })
```

**Step routing map** (for resume navigation in T7.2):

| `onboardingProgressStep` | Navigate to |
|---|---|
| 1 | stay on `/(onboarding)/welcome` |
| 2 | `/(onboarding)/assessment` (Story 4.2) |
| 3 | `/(onboarding)/ladder` (Story 4.3 — not yet created; skip navigation for now) |
| 4 | `/(onboarding)/complete` (Story 4.4 — not yet created; skip navigation) |

For Story 4.1, only steps 1 and 2 have routes. If `onboardingProgressStep > 2`, log a warning and stay on welcome (the route doesn't exist yet).

---

### Routing architecture — how onboarding fits into existing auth gate

The existing `(app)/_layout.tsx` already handles:
- `!isLoading && !isAuthenticated → router.replace('/(auth)/sign-in')`

**Add after** that check (in the same `useEffect`):
```typescript
if (!isLoading && isAuthenticated && !isOnboardingComplete) {
  router.replace('/(onboarding)/welcome')
}
```

This means `(app)/` screens never render for a user who hasn't completed onboarding.

The `(onboarding)/` screens are at the same level as `(app)/` in the route tree — they are accessible once authenticated, and have their own auth gate to redirect to sign-in if somehow accessed unauthenticated.

---

### MMKV key read failure (AC5) — how to surface it

`getOnboardingProgress` in `session.ts` **throws** on corrupt JSON (T2.4). The `AuthProvider` `onAuthStateChange` handler catches this and leaves `onboardingProgressStep` as `null`. The caller (`welcome.tsx`) cannot distinguish "key absent" from "key corrupt/threw" based on the `null` alone.

To surface the toast correctly, use a separate boolean in `AuthContextValue`:

```typescript
onboardingProgressReadFailed: boolean
```

Set to `true` in the `catch` block in `AuthProvider`; stays `false` on normal reads. `welcome.tsx` checks this flag and shows the toast. Add it to T3 task items.

---

### i18n keys to add

Add to `apps/mobile/src/i18n/locales/en.json` under a new top-level `"onboarding"` key:

```json
"onboarding": {
  "stepIndicator": "Step {{current}} of {{total}}",
  "resumeFailed": {
    "toast": "Could not resume progress. Starting from step 1."
  },
  "welcome": {
    "title": "Your journey starts here",
    "body": "In a few steps, you'll learn what ERP is, practise the distress scale, and build your personal Courage Ladder.",
    "cta": "Get started"
  },
  "overwhelmed": {
    "cta": "Feeling overwhelmed?"
  },
  "fearLadder": {
    "minimumItems": "Add at least 3 situations to continue.",
    "maximumItems": "You've added the maximum of 10 situations."
  },
  "crisisDetected": {
    "banner": "We noticed something in what you wrote. You're not alone."
  },
  "complete": {
    "title": "You're ready to climb!",
    "encouragement": "You've built your Courage Ladder. Let's start with the first step.",
    "titleSoft": "Your ladder is ready.",
    "encouragementSoft": "Take your time. Your ladder will be here whenever you're ready."
  }
}
```

> **Note:** Include all onboarding keys used across Stories 4.1–4.4 now so the i18n test suite stays green. Stories 4.2–4.4 will use these keys without needing to add them.

Add corresponding Hindi placeholders to `hi.json` (same key structure, values can mirror English for now — translators update before launch).

---

### Styling — StyleSheet only (NativeWind rejected)

NativeWind v5.0.0-preview.3 was evaluated in Story 1.3 and rejected due to LightningCSS + Expo Go runtime failures. **Use `StyleSheet.create({...})` with hex color values throughout.** See existing screens (`sign-in.tsx`, `privacy-notice.tsx`) for the style patterns to follow:

- Background: `#ffffff`
- Primary text: `#111827`
- Secondary text: `#6b7280`
- Primary button background: `#111827`, text `#ffffff`
- Error text: `#ef4444`
- Progress text: use `#6b7280` for the step indicator

Fonts loaded in root `_layout.tsx`: `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`, `DMSerifDisplay_400Regular`, `DMSerifDisplay_400Regular_Italic`. Use `fontFamily: 'Inter_600SemiBold'` for the welcome title (serif reserved for clinical moment screens; onboarding is preparation mode — Inter is correct here).

---

### Existing patterns — must follow

**useReducer for multi-step flows** (`implementation-patterns-consistency-rules.md §State Management Patterns`):
The onboarding flow is a multi-step product flow. `welcome.tsx` is a single screen, so `useState` is fine. But `(onboarding)/_layout.tsx` or a future `useOnboardingFlow` hook, if it grows to manage multi-field state across steps, MUST use `useReducer` with `hasAttemptedSubmit: boolean` in state.

**useEffect exhaustive-deps:** `'react-hooks/exhaustive-deps': 'error'` is enforced in `apps/mobile/.eslintrc.js`. Every `useEffect` dependency array must be complete. The resume navigation `useEffect` in `welcome.tsx` must list `onboardingProgressStep`, `onboardingProgressReadFailed`, and `router` in its deps.

**Accessibility:** Every interactive element needs `accessibilityLabel` (enforced by `react-native-a11y/has-accessibility-props` rule). The "Get started" CTA must have `accessibilityRole="button"` and `accessibilityLabel={t('onboarding.welcome.cta')}`.

**auth.useAuth usage:** All screens call `useAuth()` — never `supabase.auth.getUser()` directly. `(onboarding)/_layout.tsx` auth gate follows the exact same pattern as `(app)/_layout.tsx`.

---

### Session.ts — import boundary check

`packages/supabase` is allowed to import from `packages/core` (see `project-structure-boundaries.md` import table). Adding `import { KV_KEYS } from '@exposure-buddy/core'` to `session.ts` is **within boundary**.

Existing `MMKV_KEYS` const in `session.ts` (`auth.state`, `auth.hasAuthedBefore`) stays unchanged — do NOT replace it with `KV_KEYS`. Auth keys remain in `session.ts`; new onboarding/app keys live in `packages/core/src/constants/kvKeys.ts`.

---

### What Story 4.2 will do (context only — do not implement)

Story 4.2 replaces `assessment.tsx` stub content with: mini-SPIN questionnaire (3 items, 0–4 each), conversational symptom check, safety behaviour checklist, psychoeducation screen, and SUDS calibration widget. It also creates the `user_onboarding_metadata` Supabase migration. Do not pre-implement any of this.

---

### Supabase migration status

No new migrations required for Story 4.1. Current latest: `0011_analytics_events_stub.sql`. Onboarding metadata table (`user_onboarding_metadata`) is created in Story 4.2. Fear ladder table is created in Story 4.3.

### Project Structure Notes

**New files:**
- `packages/core/src/constants/kvKeys.ts` (T1.1)
- `apps/mobile/app/(onboarding)/_layout.tsx` (T6)
- `apps/mobile/app/(onboarding)/welcome.tsx` (T7)
- `apps/mobile/app/(onboarding)/assessment.tsx` (T7.4 — stub)
- `apps/mobile/src/components/onboarding/OnboardingStepIndicator.tsx` (T8)
- `packages/supabase/__tests__/session-onboarding.test.ts` (T10)
- `apps/mobile/src/components/onboarding/OnboardingStepIndicator.test.tsx` (T11.2 — optional, needed for coverage)

**Modified files:**
- `packages/core/src/index.ts` (T1.2 — add KV_KEYS, ONBOARDING_STEP_COUNT exports)
- `packages/supabase/src/auth/session.ts` (T2 — add 4 new functions)
- `packages/supabase/src/auth/AuthProvider.tsx` (T3 — add 5 new context fields/functions)
- `packages/supabase/src/auth/useAuth.ts` (T4 — expose 5 new fields)
- `apps/mobile/app/(app)/_layout.tsx` (T5 — add onboarding gate)
- `apps/mobile/.eslintrc.js` (T1.3 — add no-restricted-syntax rule)
- `apps/mobile/src/i18n/locales/en.json` (T9.1)
- `apps/mobile/src/i18n/locales/hi.json` (T9.2)
- `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` (P2)

**Naming deviation note:** `packages/core/src/crisis/keywordDetector.ts` uses `keywordDetector.ts` (camelCase) rather than the architecture spec's `detector.ts` (kebab-case). Preserve this — do not rename. New files in `packages/core/src/` use kebab-case (`kv-keys.ts`... wait, the spec uses `kvKeys.ts` which is camelCase). Architecture spec says non-component files use kebab-case; however, `constants/kvKeys.ts` follows the existing deviation pattern set in Epic 3. Use `kvKeys.ts` to match the AC wording exactly.

### References

- Epic 4 story content: `_bmad-output/planning-artifacts/epics.md` §Story 4.1 (lines 939–970)
- Auth startup sequence: `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` §ADR-004
- MMKV key authority: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` §Auth Flow Patterns
- State management rules: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md` §State Management Patterns
- Package import boundaries: `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` §Package Import Boundaries
- AuthProvider current state: `packages/supabase/src/auth/AuthProvider.tsx` (lines 44–58 invariants, lines 74–122 mmkv bootstrap)
- `(app)/_layout.tsx` routing pattern: `apps/mobile/app/(app)/_layout.tsx`
- Epic 3 retro action items: `_bmad-output/implementation-artifacts/epic-3-retro-2026-05-28.md` §Action Items
- Deferred ENV-1: `_bmad-output/implementation-artifacts/deferred-work.md` §ENV-1 (react-test-renderer mismatch)
- StyleSheet adoption: memory `project_nativewind_fallback.md` (NativeWind v5 rejected)
- ESLint config reference: `apps/mobile/.eslintrc.js`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- All 6 ACs satisfied. KV_KEYS centralised in packages/core; onboarding MMKV helpers added to session.ts; AuthProvider extended with 5 new context fields (isOnboardingComplete, markOnboardingComplete, onboardingProgressStep, setOnboardingProgressStep, onboardingProgressReadFailed); (onboarding)/ route group scaffolded with _layout.tsx, welcome.tsx, and assessment.tsx stub; OnboardingStepIndicator component created.
- P1: react-test-renderer was already aligned at 19.1.0 — deferred-work.md entry was stale; 41 mobile tests pass.
- P2: Edge Function security pre-flight checklist confirmed already present in implementation-patterns-consistency-rules.md (added in Epic 3 implementation).
- P3: AuthProvider invariants audited; all code paths reach isLoading=false; new fields initialise correctly on sign-in and reset on sign-out.
- onboardingProgressReadFailed boolean added (beyond initial task list) to distinguish MMKV throw from "key absent" for AC5 toast requirement.
- Vitest session-onboarding tests required vi.mock for react-native-mmkv/expo-secure-store to prevent Flow `import typeof` parse failure in Rollup.
- Resume navigation tests: rewrote to use jest.fn() mockUseAuth pattern (not dynamic import) — Jest doesn't support dynamic import without --experimental-vm-modules.
- pnpm turbo typecheck: 10/10 tasks pass. pnpm turbo lint: 7/7 tasks pass. pnpm turbo test: 9/9 suites pass (41 Jest + 6 Vitest).

### File List

**New files:**
- packages/core/src/constants/kvKeys.ts
- apps/mobile/app/(onboarding)/_layout.tsx
- apps/mobile/app/(onboarding)/welcome.tsx
- apps/mobile/app/(onboarding)/assessment.tsx
- apps/mobile/src/components/onboarding/OnboardingStepIndicator.tsx
- packages/supabase/__tests__/session-onboarding.test.ts
- apps/mobile/src/components/onboarding/OnboardingStepIndicator.test.tsx
- apps/mobile/app/(onboarding)/welcome.test.tsx

**Modified files:**
- packages/core/src/index.ts
- packages/supabase/src/auth/session.ts
- packages/supabase/src/auth/AuthProvider.tsx
- packages/supabase/src/auth/useAuth.ts
- apps/mobile/app/(app)/_layout.tsx
- apps/mobile/.eslintrc.js
- apps/mobile/src/i18n/locales/en.json
- apps/mobile/src/i18n/locales/hi.json
