# Story 4.2: Fear Ladder Introduction & SUDS Calibration

Status: review

## Story

As a new user,
I want to understand what a fear ladder is and practise using the distress scale,
So that I can engage meaningfully with my first exposure session (FR-ONBOARD-02, FR-ONBOARD-03).

*Depends on: Story 4.1 merged to main.* ✅

## Acceptance Criteria

1. **Psychoeducation content**
   Given the user reaches the psychoeducation step
   When the screen renders
   Then it displays plain-language content covering: what a fear ladder is, why ERP works, and what "courage" means in this context; all content is via `t()` keys with EN+HI translations

2. **SUDS calibration widget**
   Given the SUDs calibration widget renders
   When the user interacts with it
   Then 11 tap-targets present values 0–10 with anchor labels at 0 ("No distress"), 5 ("Moderate"), and 10 ("Extreme distress"); the container has `accessibilityRole="radiogroup"`; each tap-target has `accessibilityRole="radio"`, `accessibilityState={{ checked }}`, and `accessibilityLabel="N out of 10"` (e.g. "7 out of 10") so screen readers announce selection state and value in context; the widget is operable via `AccessiblePressable`

3. **Calibration value persisted to MMKV + PowerSync outbox**
   Given the user submits a rating for the provided practice scenario
   When the calibration completes
   Then the calibration value is stored in MMKV under `KV_KEYS.SUDS_CALIBRATION(userId)` AND enqueued via `adapter.enqueue()` to `user_onboarding_metadata`; table schema: `id` (uuid PK), `user_id` (FK `auth.users`), `suds_calibration_value` (int NOT NULL), `completed_at` (timestamptz), `created_at` (timestamptz DEFAULT now())

4. **RLS policy for `user_onboarding_metadata`**
   Given RLS is applied to `user_onboarding_metadata`
   When the RLS policy test harness runs (`packages/supabase/__tests__/rls/user_onboarding_metadata.test.ts`)
   Then four assertions pass: [+] own-row SELECT and INSERT succeed for authenticated user; [−] cross-user SELECT is blocked; [−] unauthenticated access is blocked; [−] DELETE is explicitly denied for all roles

5. **"Feeling overwhelmed?" persistent link**
   Given the psychoeducation screen is visible
   When it renders
   Then a persistent "Feeling overwhelmed?" link is visible without any user action, displaying `t('onboarding.overwhelmed.cta')`; tapping it opens the crisis resources screen; `detectCrisisKeywords()` is NOT called on this screen — the practice scenario is app-provided, not user-typed

## Tasks / Subtasks

### T1 — Supabase migration for `user_onboarding_metadata` (AC: 3, 4)

- [x] T1.1: Create `supabase/migrations/0012_user_onboarding_metadata.sql` with the exact schema in Dev Notes
- [x] T1.2: Run `supabase migration up` locally and verify the table + RLS exist in local DB
- [x] T1.3: Regenerate `packages/supabase/src/database.types.ts` — run `supabase gen types typescript --local > packages/supabase/src/database.types.ts`; the RLS test imports `type { Database }` from this file and will fail CI typecheck without `user_onboarding_metadata` in the types

### T2 — RLS policy test file (AC: 4)

- [x] T2.1: Create `packages/supabase/__tests__/rls/user_onboarding_metadata.test.ts` — **5 assertions** (not 4, see Dev Notes); note that `consent_records.test.ts` is a partial model only — its INSERT assertion tests denial, whereas this table's INSERT policy allows own-row insert
- [x] T2.2: Confirm test is skipped in CI when `SUPABASE_SERVICE_ROLE_KEY` is not set (`describe.skipIf` pattern — same as existing RLS tests)

### T3 — PowerSync schema update (AC: 3)

- [x] T3.1: Add `user_onboarding_metadata` to `packages/sync/src/schema.ts` — columns: `user_id` (text), `suds_calibration_value` (integer), `completed_at` (text), `created_at` (text)

### T4 — Sync adapter accessor in `apps/mobile` (AC: 3)

- [x] T4.1: Create `apps/mobile/src/sync/adapter.ts` — exports `getAdapter(): SyncAdapter` returning a module-level `PowerSyncSyncAdapter` singleton (see Dev Notes)
- [x] T4.2: Import `SyncAdapter`, `PowerSyncSyncAdapter` from `@exposure-buddy/sync`

### T5 — `setSudsCalibration` in AuthProvider (AC: 3)

- [x] T5.1: Add `setSudsCalibration: (value: number) => void` to `AuthContextValue` interface in `packages/supabase/src/auth/AuthProvider.tsx`
- [x] T5.2: Implement the function — writes `value` as an integer to MMKV via `mmkvRef.current?.set(KV_KEYS.SUDS_CALIBRATION(userId), value)`; guard: only runs when store and userId are non-null; logs error in degraded mode. **Import note: `KV_KEYS` is NOT yet imported in `AuthProvider.tsx` — add `import { KV_KEYS } from '@exposure-buddy/core'` alongside the existing `@exposure-buddy/core` type imports.**
- [x] T5.3: Add `setSudsCalibration` to the default context value (no-op) and the Provider's `value` prop
- [x] T5.4: Add two new fields to `UseAuthResult` in `packages/supabase/src/auth/useAuth.ts`, both after the `setOnboardingProgressStep` field: (1) `userId: string | null` — wired as `authState.userId` (same pattern as `isAuthenticated: authState.session !== null`); (2) `setSudsCalibration: (value: number) => void` — destructured from context and returned. `assessment.tsx` destructures `userId` directly from `useAuth()` so this top-level alias is required.

### T6 — SUDS calibration widget component (AC: 2)

- [x] T6.1: Create `apps/mobile/src/components/onboarding/SudsCalibrationWidget.tsx` (see Dev Notes for full spec)
- [x] T6.2: Props: `{ value: number | null; onChange: (v: number) => void }`
- [x] T6.3: Renders 11 `AccessiblePressable` tap-targets for values 0–10; each has `accessibilityLabel={\`${i} out of 10\`}`, `accessibilityRole="radio"`, and `accessibilityState={{ checked: value === i }}` — required for VoiceOver/TalkBack to announce selected/deselected state within the radiogroup
- [x] T6.4: Container `View` has `accessibilityRole="radiogroup"` and `accessibilityLabel` from i18n (no `accessibilityValue` — not a slider)
- [x] T6.5: Anchor labels at 0, 5, 10 using `t()` keys (below the number row)
- [x] T6.6: Selected value is visually highlighted; unselected values are dimmed

### T7 — Assessment screen (replaces stub) (AC: 1, 2, 3, 5)

- [x] T7.1: Replace `apps/mobile/app/(onboarding)/assessment.tsx` content entirely (current stub is 13 lines — see Dev Notes for what to preserve)
- [x] T7.2: On mount: call `setOnboardingProgressStep(2)` — saves progress before user reads or interacts (resume logic in welcome.tsx will route here on relaunch)
- [x] T7.3: Render `<OnboardingStepIndicator step={2} />` at top
- [x] T7.4: Back navigation is available on step 2 — do NOT add `gestureEnabled: false` to `Stack.Screen`
- [x] T7.5: Render psychoeducation content section (three paragraphs, all via `t()` — see i18n keys in Dev Notes)
- [x] T7.6: Render the practice scenario text and `<SudsCalibrationWidget>` below
- [x] T7.7: Render "Feeling overwhelmed?" link using `t('onboarding.overwhelmed.cta')` — persistent, always visible; taps navigate to `/(app)/crisis` (see Dev Notes)
- [x] T7.8: Render "Next" button — disabled until user selects a value from the widget
- [x] T7.9: On "Next" tap: (1) call `setSudsCalibration(selectedValue)`, (2) call `setOnboardingProgressStep(3)` — local state committed before network I/O, (3) `await getAdapter().enqueue(...)` inside a try/catch — on catch: log error + return without navigating (TODO Epic 6: surface error toast + retry path), (4) `router.replace('/(onboarding)/ladder')`

### T8 — Update resume routing in `welcome.tsx` for step 3 (AC: 3)

- [x] T8.1: Update the resume `useEffect` in `apps/mobile/app/(onboarding)/welcome.tsx` to handle `onboardingProgressStep === 3` → `router.replace('/(onboarding)/ladder')` (currently stays on welcome for steps > 2; add the step-3 case now that the route will exist). **Also update `apps/mobile/app/(onboarding)/welcome.test.tsx`** — the existing test "stays on welcome when onboardingProgressStep is > 2" asserts `mockReplace` is NOT called for step 3; after this change that assertion must become: step 3 calls `router.replace('/(onboarding)/ladder')`, steps 4+ do not call replace.
- [x] T8.2: Steps 4+ remain as "stay on welcome" — `/(onboarding)/complete` is created in Story 4.4

### T9 — Create `ladder.tsx` stub (AC: 3)

- [x] T9.1: Create `apps/mobile/app/(onboarding)/ladder.tsx` as a minimal stub so navigation from assessment works (see Dev Notes for exact content); Story 4.3 replaces this entirely

### T10 — i18n keys (AC: 1, 2, 5)

- [x] T10.1: Add `onboarding.assessment.*` keys to `apps/mobile/src/i18n/locales/en.json` (see Dev Notes for full key list)
- [x] T10.2: Add matching keys to `apps/mobile/src/i18n/locales/hi.json` as English-text placeholders (same approach as existing onboarding keys in hi.json)

### T11 — Tests (AC: 1, 2, 3, 4, 5)

- [x] T11.1: Create `apps/mobile/app/(onboarding)/assessment.test.tsx` — see Dev Notes for required test cases
- [x] T11.2: Create `apps/mobile/src/components/onboarding/SudsCalibrationWidget.test.tsx` — see Dev Notes for required test cases

### T13 — Create `crisis.tsx` stub (AC: 5)

- [x] T13.1: Create `apps/mobile/app/(app)/crisis.tsx` as a minimal stub so "Feeling overwhelmed?" navigation resolves without a runtime unmatched-route error; use the same stub pattern as `ladder.tsx` (see Dev Notes). Epic 5 / In-the-moment sprint replaces this entirely.

### T12 — CI gates

- [x] T12.1: `pnpm turbo typecheck` passes with zero errors
- [x] T12.2: `pnpm turbo lint` passes with zero errors
- [x] T12.3: `pnpm turbo test` passes — all new tests green; existing 43 Jest + 9 Vitest tests unchanged

---

## Dev Notes

### What this story replaces

`apps/mobile/app/(onboarding)/assessment.tsx` is currently a 13-line stub:

```tsx
import { View, Text, StyleSheet } from 'react-native'
// Minimal stub — Story 4.2 replaces this content.
export default function AssessmentScreen() { ... }
```

**This story replaces the entire file.** Do not reference or preserve any of the stub's content beyond the filename and default export convention.

---

### Files to create or modify

| File | Action | Notes |
|---|---|---|
| `supabase/migrations/0012_user_onboarding_metadata.sql` | CREATE | New migration |
| `packages/supabase/__tests__/rls/user_onboarding_metadata.test.ts` | CREATE | RLS test |
| `packages/sync/src/schema.ts` | UPDATE | Add table to AppSchema |
| `apps/mobile/src/sync/adapter.ts` | CREATE | Adapter singleton |
| `packages/supabase/src/auth/AuthProvider.tsx` | UPDATE | Add setSudsCalibration |
| `packages/supabase/src/auth/useAuth.ts` | UPDATE | Export setSudsCalibration |
| `apps/mobile/src/components/onboarding/SudsCalibrationWidget.tsx` | CREATE | SUDS widget |
| `apps/mobile/app/(onboarding)/assessment.tsx` | REPLACE | Full implementation |
| `apps/mobile/app/(onboarding)/welcome.tsx` | UPDATE | Add step-3 resume route |
| `apps/mobile/app/(onboarding)/ladder.tsx` | CREATE | Minimal stub for Story 4.3 |
| `apps/mobile/src/i18n/locales/en.json` | UPDATE | Add assessment keys |
| `apps/mobile/src/i18n/locales/hi.json` | UPDATE | Add assessment keys (EN placeholders) |
| `apps/mobile/app/(onboarding)/assessment.test.tsx` | CREATE | Component tests |
| `apps/mobile/src/components/onboarding/SudsCalibrationWidget.test.tsx` | CREATE | Widget tests |
| `apps/mobile/app/(app)/crisis.tsx` | CREATE | Minimal stub — AC 5 navigation target |
| `packages/supabase/src/database.types.ts` | REGENERATE | `supabase gen types typescript --local` after migration |

---

### Migration: `0012_user_onboarding_metadata.sql`

```sql
CREATE TABLE IF NOT EXISTS public.user_onboarding_metadata (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suds_calibration_value INT NOT NULL CHECK (suds_calibration_value >= 0 AND suds_calibration_value <= 10),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_onboarding_metadata ENABLE ROW LEVEL SECURITY;

-- Authenticated user can read their own row
CREATE POLICY "user_onboarding_metadata_select_own"
  ON public.user_onboarding_metadata FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated user can insert their own row
CREATE POLICY "user_onboarding_metadata_insert_own"
  ON public.user_onboarding_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE policy — calibration is write-once via PowerSync outbox
-- No DELETE policy — explicitly denied for all roles (no permissive DELETE policy)

COMMENT ON TABLE public.user_onboarding_metadata IS
  'Stores per-user onboarding calibration data. suds_calibration_value written during Story 4.2 psychoeducation step. One row per user enforced by UNIQUE(user_id). Epic 6 outbox adapter must use ON CONFLICT (user_id) DO UPDATE for retry idempotency.';
```

---

### RLS test: `user_onboarding_metadata.test.ts`

Follow the exact pattern from `packages/supabase/__tests__/rls/consent_records.test.ts`. Key differences from the template:

- Table name: `user_onboarding_metadata`
- Seed payload: `{ user_id: userAId, suds_calibration_value: 5, completed_at: new Date().toISOString() }`
- **5 assertions** (note: `consent_records.test.ts` is a partial model only — its INSERT assertion tests denial; this table's INSERT policy ALLOWS own-row inserts, so polarity differs):
  1. `[+]` own-row SELECT — authenticated user A queries `user_onboarding_metadata` with `.eq('user_id', userAId)` → returns 1 row
  2. `[+]` own-row INSERT — authenticated user A inserts `{ user_id: userAId, suds_calibration_value: 7, completed_at: new Date().toISOString() }` via the Supabase client (not service role) → no error, row count is now 2 (or use a fresh user to keep count at 1)
  3. `[-]` cross-user SELECT — authenticated user A queries with `.eq('user_id', userBId)` → returns 0 rows
  4. `[-]` unauthenticated SELECT — anon client queries → returns 0 rows (or RLS error)
  5. `[-]` DELETE denied — authenticated user A attempts DELETE on their own row → Supabase returns error (no DELETE policy = deny)

---

### PowerSync schema update

```typescript
// packages/sync/src/schema.ts (UPDATE)
import { Schema, Table, column } from '@powersync/react-native'

const users = new Table({
  email: column.text,
  created_at: column.text,
})

const user_onboarding_metadata = new Table({
  user_id: column.text,
  suds_calibration_value: column.integer,
  completed_at: column.text,
  created_at: column.text,
})

export const AppSchema = new Schema({ users, user_onboarding_metadata })
export type Database = (typeof AppSchema)['types']
```

---

### Sync adapter singleton: `apps/mobile/src/sync/adapter.ts`

```typescript
import { PowerSyncSyncAdapter, type SyncAdapter } from '@exposure-buddy/sync'

// No-op stub — Epic 6 replaces PowerSyncSyncAdapter with the real durable outbox.
// Consumers call getAdapter() rather than instantiating directly so Epic 6 can
// swap the implementation without touching each call site.
const _adapter: SyncAdapter = new PowerSyncSyncAdapter()

export function getAdapter(): SyncAdapter {
  return _adapter
}
```

---

### AuthProvider: `setSudsCalibration`

Add to `AuthContextValue` interface (after `isStorageDegraded`):

```typescript
setSudsCalibration: (value: number) => void
```

Add to default context value:

```typescript
setSudsCalibration: () => {},
```

Add implementation inside `AuthProvider` function body (same pattern as `setOnboardingProgressStep`):

```typescript
function setSudsCalibration(value: number): void {
  const store = mmkvRef.current
  const userId = authState.userId
  if (!store || !userId) {
    console.error('[AuthProvider] setSudsCalibration called in degraded mode — cannot persist to MMKV')
    return
  }
  store.set(KV_KEYS.SUDS_CALIBRATION(userId), value)
  // value is stored as a number type. Downstream readers MUST use store.getNumber(key), not store.getString(key).
}
```

Add to Provider `value` prop. Add to `UseAuthResult` and return from `useAuth.ts`.

**Import note:** `KV_KEYS` is NOT yet imported in `AuthProvider.tsx`. Add `import { KV_KEYS } from '@exposure-buddy/core'` alongside the existing `@exposure-buddy/core` type imports at the top of the file. `SUDS_CALIBRATION` key is defined in `packages/core/src/constants/kvKeys.ts`.

**`useAuth.ts` additions required:** Add the following two fields to `UseAuthResult` (after `setOnboardingProgressStep`) and wire them in the return object:
```typescript
userId: string | null          // alias for authState.userId — required by assessment.tsx destructure
setSudsCalibration: (value: number) => void
```
In the `useAuth` function body, add both to the destructure from `useContext(AuthContext)` and include in the returned object:
```typescript
userId: authState.userId,
setSudsCalibration,
```

---

### SUDS calibration widget

```tsx
// apps/mobile/src/components/onboarding/SudsCalibrationWidget.tsx
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { AccessiblePressable } from '@exposure-buddy/ui'

interface SudsCalibrationWidgetProps {
  value: number | null
  onChange: (v: number) => void
}

export function SudsCalibrationWidget({ value, onChange }: SudsCalibrationWidgetProps) {
  const { t } = useTranslation()

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('onboarding.assessment.calibrationLabel')}
    >
      <View style={styles.row}>
        {Array.from({ length: 11 }, (_, i) => (
          <AccessiblePressable
            key={i}
            onPress={() => onChange(i)}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === i }}
            accessibilityLabel={`${i} out of 10`}
            style={[styles.target, value === i && styles.targetSelected]}
          >
            <Text style={[styles.targetText, value === i && styles.targetTextSelected]}>
              {i}
            </Text>
          </AccessiblePressable>
        ))}
      </View>
      <View style={styles.anchors}>
        <Text style={styles.anchor}>{t('onboarding.assessment.sudsAnchor0')}</Text>
        <Text style={styles.anchor}>{t('onboarding.assessment.sudsAnchor5')}</Text>
        <Text style={styles.anchor}>{t('onboarding.assessment.sudsAnchor10')}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  target: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  targetSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  targetText: { fontSize: 13, color: '#374151' },
  targetTextSelected: { color: '#ffffff', fontWeight: '600' },
  anchors: { flexDirection: 'row', justifyContent: 'space-between' },
  anchor: { fontSize: 11, color: '#6b7280' },
})
```

---

### Assessment screen structure

```tsx
// apps/mobile/app/(onboarding)/assessment.tsx
import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { OnboardingStepIndicator } from '../../src/components/onboarding/OnboardingStepIndicator'
import { SudsCalibrationWidget } from '../../src/components/onboarding/SudsCalibrationWidget'
import { getAdapter } from '../../src/sync/adapter'

export default function AssessmentScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { userId, setOnboardingProgressStep, setSudsCalibration } = useAuth()
  const [selectedValue, setSelectedValue] = useState<number | null>(null)

  // Save progress to MMKV on mount so resume logic routes here if app is closed
  useEffect(() => {
    setOnboardingProgressStep(2)
  }, [setOnboardingProgressStep])

  async function handleNext() {
    if (selectedValue === null) return
    if (!userId) return  // always non-null behind the onboarding auth gate; guard satisfies TypeScript
    setSudsCalibration(selectedValue)
    setOnboardingProgressStep(3)  // local state first — intent committed before fallible I/O
    try {
      await getAdapter().enqueue('user_onboarding_metadata', 'INSERT', {
        id: crypto.randomUUID(),  // client-generated UUID: offline-first pattern — server DEFAULT gen_random_uuid() is for DBA inserts only
        user_id: userId,
        suds_calibration_value: selectedValue,
        completed_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('[AssessmentScreen] enqueue failed — calibration value persisted locally:', err)
      // TODO(Epic 6): surface error toast and retry path when real outbox adapter is wired
      return
    }
    router.replace('/(onboarding)/ladder')
  }

  return (
    <>
      {/* Back gesture is available on step 2 — no gestureEnabled: false */}
      <Stack.Screen options={{}} />
      <ScrollView contentContainerStyle={styles.container}>
        <OnboardingStepIndicator step={2} />

        {/* Psychoeducation section */}
        <Text style={styles.title}>{t('onboarding.assessment.title')}</Text>
        <Text style={styles.body}>{t('onboarding.assessment.body1')}</Text>
        <Text style={styles.body}>{t('onboarding.assessment.body2')}</Text>
        <Text style={styles.body}>{t('onboarding.assessment.body3')}</Text>

        {/* SUDS calibration section */}
        <Text style={styles.sectionTitle}>{t('onboarding.assessment.calibrationTitle')}</Text>
        <Text style={styles.scenario}>{t('onboarding.assessment.practiceScenario')}</Text>
        <SudsCalibrationWidget value={selectedValue} onChange={setSelectedValue} />

        {/* "Feeling overwhelmed?" — persistent, always visible */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/crisis')}
          accessibilityRole="link"
          accessibilityLabel={t('onboarding.overwhelmed.cta')}
          style={styles.overwhelmedLink}
        >
          <Text style={styles.overwhelmedText}>{t('onboarding.overwhelmed.cta')}</Text>
        </TouchableOpacity>

        {/* Next button — disabled until value selected */}
        <TouchableOpacity
          style={[styles.button, selectedValue === null && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={selectedValue === null}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.assessment.cta')}
          accessibilityState={{ disabled: selectedValue === null }}
        >
          <Text style={styles.buttonText}>{t('onboarding.assessment.cta')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  )
}
```

**Do NOT call `detectCrisisKeywords()` on this screen** — the practice scenario is app-provided text, not user-typed content. This is an explicit AC requirement.

**"Feeling overwhelmed?" navigation:** Uses `router.push('/(app)/crisis')`. The user IS authenticated at this point (onboarding gate enforces auth), so the `(app)/_layout.tsx` auth check will pass. The crisis screen renders on-device contacts only — no network required.

---

### `ladder.tsx` stub (Story 4.3 replaces)

```tsx
// apps/mobile/app/(onboarding)/ladder.tsx
import { View, Text, StyleSheet } from 'react-native'

// Minimal stub — Story 4.3 replaces this content.
export default function LadderScreen() {
  return (
    <View style={styles.container}>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <Text>Step 3 — Story 4.3</Text>
    </View>
  )
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } })
```

---

### `crisis.tsx` stub (Epic 5 / In-the-moment sprint replaces)

```tsx
// apps/mobile/app/(app)/crisis.tsx
import { View, Text, StyleSheet } from 'react-native'

// Minimal stub — Epic 5 replaces this with the real crisis resources screen.
export default function CrisisScreen() {
  return (
    <View style={styles.container}>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <Text>Crisis Resources — Epic 5</Text>
    </View>
  )
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } })
```

---

### Resume routing update in `welcome.tsx`

Add a step-3 case to the resume `useEffect` (currently only steps 1 and 2 are handled):

```typescript
if (onboardingProgressStep === 2) {
  router.replace('/(onboarding)/assessment')
} else if (onboardingProgressStep === 3) {
  router.replace('/(onboarding)/ladder')
}
// Steps 4+ (complete) created in Story 4.4 — stay on welcome for now
```

---

### i18n keys to add: `onboarding.assessment.*`

Add under the existing `"onboarding"` key in `en.json`:

```json
"assessment": {
  "title": "What is a fear ladder?",
  "body1": "A fear ladder is a list of situations that make you anxious, arranged from least to most scary. You start at the bottom and work your way up — one step at a time.",
  "body2": "Exposure and Response Prevention (ERP) works by helping your nervous system learn that the feared situation is manageable. The anxiety peaks, then drops — every time you face it.",
  "body3": "Courage here doesn't mean feeling no fear. It means taking one small step even when it feels uncomfortable.",
  "calibrationTitle": "Let's practise the distress scale",
  "practiceScenario": "Imagine you're about to give a short speech to 5 strangers. How anxious would you feel right now?",  // PLACEHOLDER — pending India user research validation; do not treat as clinically calibrated for the target population
  "calibrationLabel": "Rate your distress (0–10)",
  "sudsAnchor0": "No distress",
  "sudsAnchor5": "Moderate",
  "sudsAnchor10": "Extreme distress",
  "cta": "Next"
}
```

Add matching keys to `hi.json` with English text as placeholders (same approach used for all other onboarding keys in Story 4.1 — EN text stands in until HI translations are provided).

**Note:** `onboarding.overwhelmed.cta` is already in both locale files from Story 4.1. Do not re-add it.

---

### Test cases

**`assessment.test.tsx`** (Jest + RNTL):

Mock `@exposure-buddy/supabase` (`useAuth`), `expo-router`, `react-i18next`, `../../src/components/onboarding/OnboardingStepIndicator`, `../../src/components/onboarding/SudsCalibrationWidget`, `../../src/sync/adapter`. Use the same mock pattern as `welcome.test.tsx`.

Import `waitFor` from `@testing-library/react-native` (required for test case 6).

In `beforeEach`, add: `jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('test-uuid-1234' as any)` — `handleNext` calls `crypto.randomUUID()` inline before the mocked `enqueue`; Jest/jsdom does not guarantee its availability.

Required test cases:
1. `renders psychoeducation title and body content` — `getByText('onboarding.assessment.title')` exists
2. `renders calibration section title` — `getByText('onboarding.assessment.calibrationTitle')` exists
3. `renders the "Feeling overwhelmed?" link` — `getByText('onboarding.overwhelmed.cta')` exists
4. `Next button is disabled before value selected` — `getByRole('button')` has `accessibilityState.disabled === true`
5. `on mount calls setOnboardingProgressStep(2)` — verify mock is called with 2
6. `pressing Next when value set calls setSudsCalibration, setOnboardingProgressStep(3), and replaces to ladder` — simulate widget `onChange`, press Next; wrap all three assertions in `waitFor` (handleNext is async): `mockSetSudsCalibration` called with selected value, `mockSetOnboardingProgressStep` called with 3, `mockRouterReplace` called with `'/(onboarding)/ladder'`; mock `router.replace`, not `router.push`

**`SudsCalibrationWidget.test.tsx`** (Jest + RNTL):

Required test cases:
1. `renders 11 tap targets (0–10)` — use `getAllByRole('radio')` and assert `.length === 11`
2. `tapping a target calls onChange with correct value` — `fireEvent.press(getByText('7'))` → `mockOnChange` called with 7
3. `anchor labels 0, 5, 10 are rendered` — `getByText('onboarding.assessment.sudsAnchor0')` etc. exist
4. `selected value tap-target has contextual label and style` — render with `value={5}`; `getByLabelText('5 out of 10')` exists; assert selected style: `expect(getByLabelText('5 out of 10')).toHaveStyle({ backgroundColor: '#111827' })` (use `toHaveStyle` from `@testing-library/react-native`)

---

### Patterns from Story 4.1 to follow

- `OnboardingStepIndicator` — import from `../../src/components/onboarding/OnboardingStepIndicator`; already implemented, tested, and passing CI
- `useAuth()` — destructure `userId`, `setOnboardingProgressStep`, and new `setSudsCalibration`
- `Stack.Screen` — include at top of JSX return; omit `gestureEnabled: false` (step 2 allows back)
- i18n — all strings via `t()`, no literal strings (lint rule `i18next/no-literal-string` enforced)
- No-literal-string exception for stub files: use `{/* eslint-disable-next-line i18next/no-literal-string */}` above the stub `<Text>`
- Test file location: co-located alongside the screen file (`app/(onboarding)/assessment.test.tsx`)
- `mockUseAuth.mockReturnValue({ isLoading: false, ... })` in `beforeEach` — include all fields useAuth returns
- `jest.clearAllMocks()` in `beforeEach`

### Invariant: `setOnboardingProgressStep(2)` fires on every mount

This is called in a `useEffect` with `[setOnboardingProgressStep]` as the dep array (stable ref). It fires once on mount. This is intentional: if the user navigates to assessment and the app crashes before they tap Next, relaunch will resume to step 2 (assessment) rather than step 1 (welcome). This is the correct recovery behaviour per AC: "the app resumes at the first incomplete step".

### `crypto.randomUUID()` availability

Available in Expo SDK 54 / Hermes without any polyfill. Use directly in the `handleNext` function. No `uuid` package import needed.

### Authentication state on this screen

The user is always authenticated when this screen renders — `(onboarding)/_layout.tsx` redirects unauthenticated users to `/(auth)/sign-in`. `userId` from `useAuth()` is therefore always non-null here. The `setSudsCalibration` guard in AuthProvider handles the degraded-mode case (no MMKV) gracefully by logging an error and returning without crashing.

### State management choice: `useState` vs `useReducer`

This screen has a single independent piece of UI state (`selectedValue: number | null`). Per the architecture rule: use `useState` for single independent values; `useReducer` only when two or more values must stay consistent. `useState` is correct here.

### Back navigation and progress integrity

When the user presses Back from assessment to welcome, `onboardingProgressStep` is already 2 (set on mount). When welcome's `resumeHandled` ref logic runs... wait — `resumeHandled` is set to `true` once on mount in welcome. Pressing Back navigates to an already-mounted welcome screen where `resumeHandled.current === true`, so the resume effect is a no-op. The user sees welcome as-is and can tap "Get started" again, which calls `setOnboardingProgressStep(1)` and navigates forward. This is acceptable MVP behaviour — the progress step reverts to 1 only on the explicit "Get started" tap, not on back-navigate. No special handling needed.

### Step routing map (updated for this story)

| `onboardingProgressStep` | Navigate to |
|---|---|
| 1 | stay on `/(onboarding)/welcome` |
| 2 | `/(onboarding)/assessment` ← this story |
| 3 | `/(onboarding)/ladder` ← stub created this story; Story 4.3 fills |
| 4 | `/(onboarding)/complete` ← Story 4.4 creates |

---

## Dev Agent Record

### Review Findings (code review: 2026-06-01)

- [x] [Review][Decision] `setOnboardingProgressStep(3)` before enqueue: on enqueue error MMKV holds step 3 while user stays on assessment; next app relaunch routes to `/(onboarding)/ladder` (stub), not back to assessment — newly identified relaunch-routing consequence of party-mode ordering decision; local calibration IS persisted so routing to ladder is arguably correct offline-first behaviour; confirm: (a) accept as MVP risk and document in 4-2-D2, or (b) move `setOnboardingProgressStep(3)` to after `router.replace` (error path stays at step 2, retryable; crash window: app killed between replace and step write routes back to assessment on relaunch)

- [x] [Review][Patch] `userId` not a top-level field in `UseAuthResult` — `assessment.tsx` destructures `{ userId } = useAuth()` but `UseAuthResult` only exposes `authState: AuthState`; `userId` will always be `undefined`; `if (!userId) return` bails every time; AC 3 breaks completely; fix: add `userId: string | null` to `UseAuthResult` wired as `authState.userId` (same pattern as `isAuthenticated: authState.session !== null`) [`packages/supabase/src/auth/useAuth.ts:6-20`]
- [x] [Review][Patch] `KV_KEYS` import missing from `AuthProvider.tsx` — dev notes claim "already imported in AuthProvider.tsx from @exposure-buddy/core (added in Story 4.1)" but the file only imports `type { IDpoService, PendingDeletionRecord }`; `KV_KEYS` is in `session.ts` only; T5.2 must add `import { KV_KEYS } from '@exposure-buddy/core'` [`packages/supabase/src/auth/AuthProvider.tsx`]
- [x] [Review][Patch] `/(app)/crisis` route does not exist and no task creates it — AC 5 navigation will throw an Expo Router unmatched-route error at runtime; `apps/mobile/app/(app)/` has no `crisis.tsx`; create a minimal stub task (parallel to T9 for ladder) [`apps/mobile/app/(app)/`]
- [x] [Review][Patch] `database.types.ts` not updated — RLS test follows `consent_records.test.ts` pattern which imports `type { Database }`; `user_onboarding_metadata` is absent from the types file; CI typecheck will fail; add a task to run `supabase gen types` or manually add the table to `Database['public']['Tables']` [`packages/supabase/src/database.types.ts`]
- [x] [Review][Patch] `welcome.test.tsx` breaks after T8.1 — existing test asserts `mockReplace` is NOT called when `onboardingProgressStep === 3`; T8.1 makes it navigate to ladder for step 3; must update `welcome.test.tsx` as part of T8.1 or T11 [`apps/mobile/app/(onboarding)/welcome.test.tsx`]
- [x] [Review][Patch] `accessibilityRole="radio"` and `accessibilityState` missing from tap-targets — items inside a `radiogroup` must carry `accessibilityRole="radio"` and `accessibilityState={{ checked: value === i }}` for VoiceOver/TalkBack to announce selected/deselected state; `AccessiblePressable` accepts both props; update T6.3 and widget code [`apps/mobile/src/components/onboarding/SudsCalibrationWidget.tsx`]
- [x] [Review][Patch] RLS test missing INSERT positive-case assertion — AC 4 states "own-row INSERT succeeds" but the test spec only covers SELECT positive; add 5th assertion: authenticated user A performs INSERT of own row, expects success (no error, row count +1) [`packages/supabase/__tests__/rls/user_onboarding_metadata.test.ts`]
- [x] [Review][Patch] `waitFor` import not listed in test spec — test case 6 uses `waitFor` from `@testing-library/react-native` but no import instruction is given in T11.1; add `import { ..., waitFor } from '@testing-library/react-native'` to the mock/import list [`apps/mobile/app/(onboarding)/assessment.test.tsx`]
- [x] [Review][Patch] Widget test case 1 needs `getAllByRole` — "11 pressable elements present" without an RNTL query; `getByRole` throws when multiple elements match; specify `getAllByRole('button')` and assert `.length === 11` [`apps/mobile/src/components/onboarding/SudsCalibrationWidget.test.tsx`]
- [x] [Review][Patch] Widget test case 4 needs `toHaveStyle()` — "selected style applied" requires RNTL's `toHaveStyle()` matcher; spec gives no guidance; note: `expect(getByLabelText('5 out of 10')).toHaveStyle({ backgroundColor: '#111827' })` [`apps/mobile/src/components/onboarding/SudsCalibrationWidget.test.tsx`]
- [x] [Review][Patch] `crypto.randomUUID()` not mocked in Jest test env — `handleNext` calls it inline before the mocked `enqueue`; Jest/jsdom may lack `crypto.randomUUID`; add `jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('test-uuid')` to `beforeEach` in assessment test spec [`apps/mobile/app/(onboarding)/assessment.test.tsx`]
- [x] [Review][Patch] Hard line-number references in T5.4 will drift — "insert after line 17" and "currently ends at line 20" are fragile; replace with logical anchor: "insert after the `setOnboardingProgressStep: (step: number) => void` field" [`_bmad-output/implementation-artifacts/4-2-fear-ladder-introduction-and-suds-calibration.md`]

- [x] [Review][Defer] `setOnboardingProgressStep(3)` on error path relaunch routing — stub never throws at MVP; offline-first routing to ladder on relaunch after a theoretical error is acceptable; document relaunch-routing consequence as addendum to 4-2-D2 in deferred-work.md — deferred, pre-existing decision

### Completion Notes

Implemented all 13 task groups in a single session. All ACs satisfied:

- **AC1 (Psychoeducation)**: `assessment.tsx` renders three paragraphs via `t()` keys covering fear ladder, ERP, and courage concepts.
- **AC2 (SUDS widget)**: `SudsCalibrationWidget.tsx` renders 11 `AccessiblePressable` tap-targets (0–10) with `accessibilityRole="radio"`, `accessibilityState={{ checked }}`, and `accessibilityLabel="N out of 10"` inside a `radiogroup` container.
- **AC3 (Calibration persistence)**: `setSudsCalibration` writes to MMKV under `KV_KEYS.SUDS_CALIBRATION(userId)`; `getAdapter().enqueue()` queues to PowerSync outbox `user_onboarding_metadata`.
- **AC4 (RLS)**: 5-assertion RLS test created covering own-row SELECT/INSERT (allow), cross-user SELECT (block), unauthenticated SELECT (block), DELETE (block); `describe.skipIf` skips in CI.
- **AC5 ("Feeling overwhelmed?")**: Persistent link always visible; navigates to `/(app)/crisis` stub; `detectCrisisKeywords()` not called.

Key decisions: `crypto.randomUUID` spy typed with UUID template literal to satisfy TypeScript; `i18next/no-literal-string` eslint-disable added for enqueue table/operation string args.

CI gates: typecheck ✅ lint ✅ test ✅ (54 Jest tests, 11 suites — up 11 tests from 43 baseline).

## File List

- `supabase/migrations/0012_user_onboarding_metadata.sql` — CREATED
- `packages/supabase/src/database.types.ts` — REGENERATED
- `packages/supabase/__tests__/rls/user_onboarding_metadata.test.ts` — CREATED
- `packages/sync/src/schema.ts` — UPDATED
- `apps/mobile/src/sync/adapter.ts` — CREATED
- `packages/supabase/src/auth/AuthProvider.tsx` — UPDATED
- `packages/supabase/src/auth/useAuth.ts` — UPDATED
- `apps/mobile/src/components/onboarding/SudsCalibrationWidget.tsx` — CREATED
- `apps/mobile/src/components/onboarding/SudsCalibrationWidget.test.tsx` — CREATED
- `apps/mobile/app/(onboarding)/assessment.tsx` — REPLACED
- `apps/mobile/app/(onboarding)/assessment.test.tsx` — CREATED
- `apps/mobile/app/(onboarding)/welcome.tsx` — UPDATED
- `apps/mobile/app/(onboarding)/welcome.test.tsx` — UPDATED
- `apps/mobile/app/(onboarding)/ladder.tsx` — CREATED
- `apps/mobile/app/(app)/crisis.tsx` — CREATED
- `apps/mobile/src/i18n/locales/en.json` — UPDATED
- `apps/mobile/src/i18n/locales/hi.json` — UPDATED
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — UPDATED

## Change Log

- 2026-06-01: Story 4.2 implemented — Fear Ladder psychoeducation screen, SUDS calibration widget, `user_onboarding_metadata` migration + RLS, PowerSync schema, sync adapter singleton, AuthProvider/useAuth extensions, resume routing for step 3, ladder/crisis stubs, i18n keys, 11 new tests.
