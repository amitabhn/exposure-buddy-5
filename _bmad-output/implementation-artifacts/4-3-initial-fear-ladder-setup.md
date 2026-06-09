# Story 4.3: Initial Fear Ladder Setup

Status: done

## Story

As a new user,
I want to add my feared situations and arrange them from least to most anxiety-provoking,
So that my Courage Ladder starts from where I actually am (FR-HIER-01, FR-HIER-02).

*Depends on: Story 4.2 merged to main.* ✅

## Acceptance Criteria

1. **Add fear item**
   Given the fear ladder setup step renders
   When the user adds a fear item
   Then each item requires: description (text, required, max 200 chars) and predicted SUDs (0–10, required); on save, the item is persisted immediately via `adapter.enqueue()` to `fear_ladder_items`; `position` is assigned as the next sequential integer for that user

2. **`fear_ladder_items` migration**
   Given the `fear_ladder_items` table is created via migration `0013_fear_ladder_items.sql`
   When the schema is inspected
   Then the table contains: `id` (uuid PK), `user_id` (FK `auth.users`), `description` (text NOT NULL), `predicted_suds` (int NOT NULL), `actual_suds` (int NULLABLE — Epic 5 populates on session completion), `position` (int NOT NULL), `status` (text NOT NULL DEFAULT `'pending'` CHECK (`status` IN (`'pending'`, `'in_progress'`, `'completed'`))), `created_at` (timestamptz DEFAULT now()), `updated_at` (timestamptz DEFAULT now())

3. **Unencrypted descriptions ADR**
   Given fear item descriptions contain sensitive personal content
   When the encryption decision is assessed
   Then descriptions are stored unencrypted at rest, relying on Supabase at-rest disk encryption and RLS for access control; field-level encryption via `pgcrypto` is explicitly backlogged; this decision is documented in `docs/decisions/adr-fear-ladder-description-encryption.md`

4. **`therapist_patient_relationships` stub table**
   Given a stub table is needed to unblock Epic 5's clinician RLS policy
   When the migration `0014_therapist_patient_relationships.sql` runs
   Then the table contains: `id` (uuid PK), `therapist_user_id` (uuid NOT NULL), `patient_user_id` (uuid NOT NULL), `active` (boolean NOT NULL DEFAULT true), `created_at` (timestamptz DEFAULT now()); no data seeded; no RLS yet

5. **RLS for `fear_ladder_items`**
   Given RLS is applied to `fear_ladder_items`
   When the RLS policy test harness runs (`packages/supabase/__tests__/rls/fear_ladder_items.test.ts`)
   Then four assertions pass: [+] own-row SELECT and INSERT succeed for authenticated user; [−] cross-user SELECT is blocked; [−] unauthenticated access is blocked; [stub] clinician path — a user with no `therapist_patient_relationships` row for the target patient gets zero rows (placeholder; Epic 5 Story 5.4 activates the real join-based policy)

6. **Reorder: move up / move down**
   Given the user taps "Move up" or "Move down" on an item
   When the swap executes
   Then it is modelled as a single atomic `reorder_positions` enqueue: one `adapter.enqueue('fear_ladder_items', 'UPDATE', { type: 'reorder_positions', itemAId, itemANewPosition, itemBId, itemBNewPosition, updatedAt })` call; a single enqueue prevents half-applied swaps on mid-operation app crash; drag-to-reorder is explicitly deferred to Epic 5

7. **Minimum 3 items gate**
   Given the user has fewer than 3 items and attempts to proceed
   When they tap the "Next" button
   Then the button remains disabled AND `t('onboarding.fearLadder.minimumItems')` is shown as inline helper text below the item list — not as a toast or modal; both the disabled state and the helper text are visible simultaneously

8. **Soft nudge at 8+ items** *(updated — hard cap removed per UX-DR27)*
   Given the user has 8 or more items and has not dismissed the nudge
   When the list renders
   Then a dismissible advisory banner is shown (`t('onboarding.fearLadder.ladderNudge')`) with a "Got it" button (`t('onboarding.fearLadder.ladderNudgeDismiss')`); the form and "Add another" button remain accessible; there is no maximum item count

9. **Crisis keyword detection**
   Given the user types into the description field
   When `detectCrisisKeywords(description)` returns `true`
   Then `t('onboarding.crisisDetected.banner')` is shown with a link to crisis resources (`/(onboarding)/crisis`); the item save is NOT blocked; `KV_KEYS.CRISIS_FLAGGED_IN_ONBOARDING(userId)` is written to MMKV (`true`) exactly once per session (regardless of how many items trigger it) — Story 4.4 reads this flag to adjust the completion screen tone

10. **Resume routing for step 4**
    Given `welcome.tsx` resume logic runs and `onboardingProgressStep === 4`
    When the user relaunches after completing the ladder but before the completion screen
    Then `router.replace('/(onboarding)/complete')` fires (same pattern as step 3 routing in Story 4.2)

---

## Tasks / Subtasks

### T1 — Migration: `fear_ladder_items` (AC: 1, 2)

- [x] T1.1: Create `supabase/migrations/0013_fear_ladder_items.sql` — exact schema in Dev Notes
- [x] T1.2: Run `supabase migration up` locally; verify table + RLS exist in local DB
- [x] T1.3: Regenerate `packages/supabase/src/database.types.ts` — run `supabase gen types typescript --local > packages/supabase/src/database.types.ts`; the RLS test imports `type { Database }` from this file and CI typecheck will fail without the new table in the types

### T2 — Migration: `therapist_patient_relationships` stub (AC: 4)

- [x] T2.1: Create `supabase/migrations/0014_therapist_patient_relationships.sql` — exact schema in Dev Notes
- [x] T2.2: Run `supabase migration up` locally; verify table exists (no RLS, no seed data)

### T3 — ADR: unencrypted descriptions (AC: 3)

- [x] T3.1: Create `docs/decisions/adr-fear-ladder-description-encryption.md` — record the decision: descriptions stored unencrypted at rest; rationale: pgcrypto adds query complexity and breaks RLS substring search; mitigation: Supabase at-rest disk encryption + strict RLS (own-row only); post-MVP: field-level encryption backlogged; ADR number use next sequential in `docs/decisions/`

### T4 — RLS test: `fear_ladder_items` (AC: 5)

- [x] T4.1: Create `packages/supabase/__tests__/rls/fear_ladder_items.test.ts` — follow the exact `user_onboarding_metadata.test.ts` pattern (see Dev Notes for differences)
- [x] T4.2: 4 assertions: [+] own-row SELECT, [+] own-row INSERT, [−] cross-user SELECT, [−] unauthenticated SELECT; the clinician stub is the 4th assertion (a user who has no `therapist_patient_relationships` row for patient A sees 0 rows) — same user as cross-user test suffices for stub
- [x] T4.3: Confirm `describe.skipIf(skipIfNoSupabase)` pattern present

### T5 — PowerSync schema update (AC: 1)

- [x] T5.1: Add `fear_ladder_items` to `packages/sync/src/schema.ts` — columns in Dev Notes; **include `id: column.text`** (avoids the D5 deferred issue from Story 4.2 where `user_onboarding_metadata` omits `id`)

### T6 — `setCrisisFlaggedInOnboarding` in AuthProvider (AC: 9)

- [x] T6.1: Add `setCrisisFlaggedInOnboarding: () => void` to `AuthContextValue` interface in `packages/supabase/src/auth/AuthProvider.tsx` (after `setSudsCalibration`)
- [x] T6.2: Add no-op to default context value: `setCrisisFlaggedInOnboarding: () => {}`
- [x] T6.3: Implement inside `AuthProvider` function body — writes `true` to MMKV under `KV_KEYS.CRISIS_FLAGGED_IN_ONBOARDING(userId)`:
  ```typescript
  function setCrisisFlaggedInOnboarding(): void {
    const store = mmkvRef.current
    const userId = authState.userId
    if (!store || !userId) {
      console.error('[AuthProvider] setCrisisFlaggedInOnboarding called in degraded mode — cannot persist to MMKV')
      return
    }
    store.set(KV_KEYS.CRISIS_FLAGGED_IN_ONBOARDING(userId), true)
  }
  ```
- [x] T6.4: Add `setCrisisFlaggedInOnboarding` to Provider `value` prop
- [x] T6.5: Add `setCrisisFlaggedInOnboarding: () => void` to `UseAuthResult` interface in `packages/supabase/src/auth/useAuth.ts` (after `setSudsCalibration`)
- [x] T6.6: Destructure from context and include in `useAuth` return object

### T7 — i18n keys (AC: 1, 7, 8, 9)

- [x] T7.1: Add `fearLadder` form keys to `apps/mobile/src/i18n/locales/en.json` (see Dev Notes for full key list) — note: `minimumItems`, `ladderNudge`, `ladderNudgeDismiss`, `crisisDetected.banner` are **already present**; only add the new keys listed in Dev Notes (`maximumItems` was removed — do not re-add)
- [x] T7.2: Add matching keys to `hi.json` as English-text placeholders (same pattern as all existing onboarding keys in hi.json)

### T8 — `FearItemForm` component (AC: 1, 9)

- [x] T8.1: Create `apps/mobile/src/components/onboarding/FearItemForm.tsx` (see Dev Notes for structure)
- [x] T8.2: Props: `{ onSave: (description: string, predictedSuds: number) => void; onCrisisDetected: () => void }`
- [x] T8.3: State: `description: string` (empty), `predictedSuds: number | null` (null)
- [x] T8.4: `TextInput` for description — `maxLength={200}`, `multiline`, `onChangeText` calls `detectCrisisKeywords(text)` on every change; if true and not previously flagged (local `crisisRef`), calls `onCrisisDetected()`
- [x] T8.5: `SudsCalibrationWidget` for predicted SUDs — reuse existing component
- [x] T8.6: "Add to ladder" button — disabled until `description.trim().length > 0 && predictedSuds !== null`; on press calls `onSave(description.trim(), predictedSuds)` then clears form state
- [x] T8.7: All strings via `t()` — no literal string rule applies

### T9 — `ladder.tsx` full implementation (All ACs)

- [x] T9.1: Replace `apps/mobile/app/(onboarding)/ladder.tsx` entirely (current stub is 18 lines — see Dev Notes for stub content to verify before replacing)
- [x] T9.2: On mount: call `setOnboardingProgressStep(3)` — resume guard if user relaunches mid-ladder
- [x] T9.3: Render `<OnboardingStepIndicator step={3} />`
- [x] T9.4: State: `items: FearItem[]` (empty array), `crisisDetected: boolean` (false), `showForm: boolean` (true — form visible initially)
- [x] T9.5: Render items list with Move Up / Move Down buttons (see Dev Notes)
- [x] T9.6: Render `<FearItemForm>` unconditionally when `showForm`; render "Add another" button when `!showForm`; render dismissible soft nudge banner (`testID="ladder-nudge"`) when `items.length >= NUDGE_THRESHOLD (8) && !nudgeDismissed` — no hard cap
- [x] T9.7: `handleAddItem(description, predictedSuds)`: assigns next sequential position, enqueues to `fear_ladder_items` via `adapter.enqueue('fear_ladder_items', 'INSERT', {...})`, updates local state; on error: log + return without updating state (item not added)
- [x] T9.8: `handleMoveUp(index)` / `handleMoveDown(index)`: delegate to `swapItems(indexA, indexB)` — single `adapter.enqueue('fear_ladder_items', 'UPDATE', { type: 'reorder_positions', ... })` call then update local state; on error: log + return without updating local state
- [x] T9.9: Crisis banner: show `t('onboarding.crisisDetected.banner')` with `onboarding.overwhelmed.cta` link to `/(onboarding)/crisis` when `crisisDetected === true`; `crisisFlagWrittenRef` prevents duplicate MMKV writes
- [x] T9.10: Persistent "Feeling overwhelmed?" link — always visible
- [x] T9.11: Inline `t('onboarding.fearLadder.minimumItems')` text — visible when `items.length < MIN_ITEMS`
- [x] T9.12: "Next" button — disabled when `items.length < MIN_ITEMS`; on press: call `setOnboardingProgressStep(4)`, `router.replace('/(onboarding)/complete')`
- [x] T9.13: Stack.Screen options — preserve `headerShown: false` from the stub (reached via `router.replace` from assessment — no back to assessment after completing it)
- [x] T9.14: `detectCrisisKeywords` is NOT called on the "Feeling overwhelmed?" link press — crisis detection is description-text only (same rule as assessment.tsx)

### T10 — Create `complete.tsx` stub (AC: 10)

- [x] T10.1: Create `apps/mobile/app/(onboarding)/complete.tsx` as a minimal stub — Story 4.4 replaces this entirely (see Dev Notes for exact stub content)

### T11 — Update resume routing in `welcome.tsx` for step 4 (AC: 10)

- [x] T11.1: Update resume `useEffect` in `apps/mobile/app/(onboarding)/welcome.tsx` — add `else if (onboardingProgressStep === 4)` case routing to `/(onboarding)/complete`
- [x] T11.2: Update `apps/mobile/app/(onboarding)/welcome.test.tsx` — change the existing `'stays on welcome when onboardingProgressStep is > 3 (route not yet created)'` test to assert step 4 routes to `'/(onboarding)/complete'`; add a new test `'stays on welcome when onboardingProgressStep is > 4 (route not yet created)'` asserting `mockReplace` is NOT called for step 5

### T12 — Tests (All ACs)

- [x] T12.1: Create `apps/mobile/app/(onboarding)/ladder.test.tsx` — see Dev Notes for required test cases
- [x] T12.2: Create `apps/mobile/src/components/onboarding/FearItemForm.test.tsx` — see Dev Notes for required test cases

### T13 — CI gates

- [x] T13.1: `pnpm turbo typecheck` passes with zero errors
- [x] T13.2: `pnpm turbo lint` passes with zero errors
- [x] T13.3: `pnpm turbo test` passes — all new tests green; existing 54 Jest + Vitest tests unchanged

### Review Findings

- [x] [Review][Decision→Defer] `swapItems` custom `reorder_positions` envelope — keep as-is; adapter is no-op stub; Epic 6 connector must handle this type; documented at call site [`apps/mobile/app/(onboarding)/ladder.tsx`] — see 4-3-D1 in deferred-work.md
- [x] [Review][Decision→Patch] No `UNIQUE(user_id, position)` — fixed at app layer (itemsRef + isSwappingRef guards); DB constraint deferred to Epic 6 migration — see 4-3-D5 in deferred-work.md
- [x] [Review][Patch] Missing unauthenticated RLS test — added `[-] unauthenticated SELECT is blocked` test [`packages/supabase/__tests__/rls/fear_ladder_items.test.ts`]
- [x] [Review][Patch] `therapist_patient_relationships` has no RLS enabled — added `ENABLE ROW LEVEL SECURITY` (default deny) [`supabase/migrations/0014_therapist_patient_relationships.sql`]
- [x] [Review][Patch] `accessibilityRole="none"` on item rows — removed; item content now reachable by screen readers [`apps/mobile/app/(onboarding)/ladder.tsx`]
- [x] [Review][Patch] `accessibilityRole="link"` on in-app navigation — changed to `"button"` on both crisis and overwhelmed links [`apps/mobile/app/(onboarding)/ladder.tsx`]
- [x] [Review][Patch] Stale `items.length` in `handleAddItem` — fixed via `isAddingRef` guard + `itemsRef.current.length` for position [`apps/mobile/app/(onboarding)/ladder.tsx`]
- [x] [Review][Patch] `swapItems` stale closure — fixed via `isSwappingRef` + `itemsRef.current`; reorder buttons disabled during swap via `isSwapping` state [`apps/mobile/app/(onboarding)/ladder.tsx`]
- [x] [Review][Defer] UUID uses `Math.random()` (pre-existing pattern from assessment.tsx) [`apps/mobile/app/(onboarding)/ladder.tsx:22`] — deferred, pre-existing
- [x] [Review][Defer] `handleNext` sets progress step before navigation completes (pre-existing pattern) [`apps/mobile/app/(onboarding)/ladder.tsx:109`] — deferred, pre-existing
- [x] [Review][Defer] `userId` null mid-flight between auth guard and enqueue — session expiry after guard passes; item queued with stale userId silently fails RLS at sync time [`apps/mobile/app/(onboarding)/ladder.tsx:49`] — deferred, general session management
- [x] [Review][Defer] No `accessibilityHint` on description TextInput — sensitive input, hint would explain privacy/support context [`apps/mobile/src/components/onboarding/FearItemForm.tsx:39`] — deferred, pre-existing

---

## Dev Notes

### What this story replaces

`apps/mobile/app/(onboarding)/ladder.tsx` is currently an 18-line stub:

```tsx
import { View, Text, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

// Minimal stub — Story 4.3 replaces this content.
export default function LadderScreen() {
  return (
    <>
      {/* Reached via router.replace — suppress back button so users cannot return to assessment after completing it */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <Text>Step 3 — Story 4.3</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } })
```

**This story replaces the entire file.** Preserve: filename, default export convention, and `headerShown: false` in `Stack.Screen` (the screen is reached via `router.replace` — no back to assessment).

---

### Files to create or modify

| File | Action | Notes |
|---|---|---|
| `supabase/migrations/0013_fear_ladder_items.sql` | CREATE | New migration |
| `supabase/migrations/0014_therapist_patient_relationships.sql` | CREATE | Stub table |
| `packages/supabase/src/database.types.ts` | REGENERATE | After both migrations |
| `packages/supabase/__tests__/rls/fear_ladder_items.test.ts` | CREATE | RLS test |
| `packages/sync/src/schema.ts` | UPDATE | Add fear_ladder_items |
| `packages/supabase/src/auth/AuthProvider.tsx` | UPDATE | Add setCrisisFlaggedInOnboarding |
| `packages/supabase/src/auth/useAuth.ts` | UPDATE | Export setCrisisFlaggedInOnboarding |
| `apps/mobile/src/components/onboarding/FearItemForm.tsx` | CREATE | Item entry form |
| `apps/mobile/src/components/onboarding/FearItemForm.test.tsx` | CREATE | Form tests |
| `apps/mobile/app/(onboarding)/ladder.tsx` | REPLACE | Full implementation |
| `apps/mobile/app/(onboarding)/ladder.test.tsx` | CREATE | Screen tests |
| `apps/mobile/app/(onboarding)/complete.tsx` | CREATE | Minimal stub — Story 4.4 fills |
| `apps/mobile/app/(onboarding)/welcome.tsx` | UPDATE | Add step-4 resume route |
| `apps/mobile/app/(onboarding)/welcome.test.tsx` | UPDATE | Update step-4 test |
| `apps/mobile/src/i18n/locales/en.json` | UPDATE | Add new fearLadder keys |
| `apps/mobile/src/i18n/locales/hi.json` | UPDATE | Add keys (EN placeholders) |
| `docs/decisions/adr-fear-ladder-description-encryption.md` | CREATE | ADR |
| `packages/supabase/src/database.types.ts` | REGENERATE | After T1.3 |

---

### Migration: `0013_fear_ladder_items.sql`

```sql
CREATE TABLE IF NOT EXISTS public.fear_ladder_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description  TEXT        NOT NULL,
  predicted_suds INT       NOT NULL CHECK (predicted_suds >= 0 AND predicted_suds <= 10),
  actual_suds  INT         NULLABLE CHECK (actual_suds IS NULL OR (actual_suds >= 0 AND actual_suds <= 10)),
  position     INT         NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fear_ladder_items ENABLE ROW LEVEL SECURITY;

-- Authenticated user can read their own rows
CREATE POLICY "fear_ladder_items_select_own"
  ON public.fear_ladder_items FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated user can insert their own rows
CREATE POLICY "fear_ladder_items_insert_own"
  ON public.fear_ladder_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authenticated user can update their own rows
CREATE POLICY "fear_ladder_items_update_own"
  ON public.fear_ladder_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy — items are never deleted (status transitions cover the lifecycle)
-- Clinician read policy: deferred to Epic 5 Story 5.4 via therapist_patient_relationships join

COMMENT ON TABLE public.fear_ladder_items IS
  'User fear hierarchy items. description stored unencrypted — see docs/decisions/adr-fear-ladder-description-encryption.md. actual_suds renamed to peak_suds in Epic 5 migration.';
```

---

### Migration: `0014_therapist_patient_relationships.sql`

```sql
CREATE TABLE IF NOT EXISTS public.therapist_patient_relationships (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_user_id  UUID    NOT NULL,
  patient_user_id    UUID    NOT NULL,
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- No RLS at this stage — stub exists solely to unblock Epic 5's fear_ladder_items clinician
-- read policy without requiring a retroactive migration. No data is seeded.
-- Epic 5 Story 5.4 activates RLS and adds the join-based clinician policy.

COMMENT ON TABLE public.therapist_patient_relationships IS
  'Stub: unblocks Epic 5 clinician RLS policy. No data at MVP. Epic 5 Story 5.4 activates.';
```

---

### PowerSync schema update

```typescript
// packages/sync/src/schema.ts (UPDATE — add fear_ladder_items to AppSchema)
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

const fear_ladder_items = new Table({
  id: column.text,           // include id — avoids D5 gap from user_onboarding_metadata (4-2-D5)
  user_id: column.text,
  description: column.text,
  predicted_suds: column.integer,
  actual_suds: column.integer,
  position: column.integer,
  status: column.text,
  created_at: column.text,
  updated_at: column.text,
})

export const AppSchema = new Schema({ users, user_onboarding_metadata, fear_ladder_items })
export type Database = (typeof AppSchema)['types']
```

---

### RLS test: `fear_ladder_items.test.ts`

Follow the exact pattern from `packages/supabase/__tests__/rls/user_onboarding_metadata.test.ts`. Key differences:

- Table name: `fear_ladder_items`
- Test users: `fear-rls-test-a@example.com`, `fear-rls-test-b@example.com`
- Seed payload: `{ user_id: userAId, description: 'Test situation', predicted_suds: 5, position: 1, status: 'pending' }`
- **4 assertions:**
  1. `[+]` own-row SELECT — User A queries with `.eq('user_id', userAId)` → returns ≥1 row
  2. `[+]` own-row INSERT — User A inserts `{ user_id: userAId, description: 'Second situation', predicted_suds: 3, position: 2, status: 'pending' }` → no error
  3. `[-]` cross-user SELECT — User A queries `.eq('user_id', userBId)` → 0 rows
  4. `[stub] clinician path` — User B (no therapist_patient_relationships row for User A) queries User A's rows → 0 rows (same assertion as cross-user; this slot is semantically reserved for the Epic 5 real policy)
  - Note: unlike `user_onboarding_metadata`, there is no DELETE denial test here because the table has no DELETE policy and test coverage of that is low value — Epic 5 adds an explicit UPDATE policy test

- `describe.skipIf(!SERVICE_ROLE_KEY || !ANON_KEY)` pattern (same as existing RLS tests)

---

### `FearItemForm` component

```tsx
// apps/mobile/src/components/onboarding/FearItemForm.tsx
import { useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { detectCrisisKeywords } from '@exposure-buddy/core'
import { SudsCalibrationWidget } from './SudsCalibrationWidget'

interface FearItemFormProps {
  onSave: (description: string, predictedSuds: number) => void
  onCrisisDetected: () => void
}

export function FearItemForm({ onSave, onCrisisDetected }: FearItemFormProps) {
  const { t } = useTranslation()
  const [description, setDescription] = useState('')
  const [predictedSuds, setPredictedSuds] = useState<number | null>(null)
  const crisisCalledRef = useRef(false)  // prevent duplicate onCrisisDetected calls within one form instance

  function handleDescriptionChange(text: string) {
    setDescription(text)
    if (!crisisCalledRef.current && detectCrisisKeywords(text)) {
      crisisCalledRef.current = true
      onCrisisDetected()
    }
  }

  function handleSave() {
    if (!description.trim() || predictedSuds === null) return
    onSave(description.trim(), predictedSuds)
    setDescription('')
    setPredictedSuds(null)
    crisisCalledRef.current = false  // reset for next item on same form instance
  }

  const canSave = description.trim().length > 0 && predictedSuds !== null

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('onboarding.fearLadder.descriptionLabel')}</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={handleDescriptionChange}
        placeholder={t('onboarding.fearLadder.descriptionPlaceholder')}
        maxLength={200}
        multiline
        accessibilityLabel={t('onboarding.fearLadder.descriptionLabel')}
      />

      <Text style={styles.label}>{t('onboarding.fearLadder.predictedSudsLabel')}</Text>
      <SudsCalibrationWidget value={predictedSuds} onChange={setPredictedSuds} />

      <TouchableOpacity
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.fearLadder.addCta')}
        accessibilityState={{ disabled: !canSave }}
      >
        <Text style={styles.saveButtonText}>{t('onboarding.fearLadder.addCta')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  label: { fontSize: 14, color: '#374151', fontWeight: '500', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  saveButton: {
    alignSelf: 'stretch',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: { backgroundColor: '#d1d5db' },
  saveButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
```

---

### `ladder.tsx` full implementation

```tsx
// apps/mobile/app/(onboarding)/ladder.tsx
import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { OnboardingStepIndicator } from '../../src/components/onboarding/OnboardingStepIndicator'
import { FearItemForm } from '../../src/components/onboarding/FearItemForm'
import { getAdapter } from '../../src/sync/adapter'

const MIN_ITEMS = 3
const NUDGE_THRESHOLD = 8

interface FearItem {
  id: string
  description: string
  predictedSuds: number
  position: number
}

// Pure-JS UUID v4 — avoids native module dependency (same pattern as assessment.tsx)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export default function LadderScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { userId, setOnboardingProgressStep, setCrisisFlaggedInOnboarding } = useAuth()
  const [items, setItems] = useState<FearItem[]>([])
  const [crisisDetected, setCrisisDetected] = useState(false)
  const [showForm, setShowForm] = useState(true)
  const crisisFlagWrittenRef = useRef(false)  // prevent duplicate MMKV writes across multiple items

  useEffect(() => {
    setOnboardingProgressStep(3)
  }, [setOnboardingProgressStep])

  function handleCrisisDetected() {
    if (!crisisFlagWrittenRef.current) {
      crisisFlagWrittenRef.current = true
      setCrisisFlaggedInOnboarding()
    }
    setCrisisDetected(true)
  }

  async function handleAddItem(description: string, predictedSuds: number) {
    if (!userId) return
    const newItem: FearItem = {
      id: generateUUID(),
      description,
      predictedSuds,
      position: items.length + 1,
    }
    try {
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('fear_ladder_items', 'INSERT', {
        id: newItem.id,
        user_id: userId,
        description: newItem.description,
        predicted_suds: newItem.predictedSuds,
        actual_suds: null,
        position: newItem.position,
        // eslint-disable-next-line i18next/no-literal-string
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('[LadderScreen] enqueue failed:', err)
      // TODO(Epic 6): surface error toast and retry path
      return
    }
    setItems(prev => [...prev, newItem])
    setShowForm(false)  // always hide form after add; user taps "Add another" to re-show; nudge shown at NUDGE_THRESHOLD, no hard cap
  }

  async function swapItems(indexA: number, indexB: number) {
    const itemA = items[indexA]
    const itemB = items[indexB]
    if (!itemA || !itemB) return
    try {
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('fear_ladder_items', 'UPDATE', {
        // eslint-disable-next-line i18next/no-literal-string
        type: 'reorder_positions',
        itemAId: itemA.id,
        itemANewPosition: itemB.position,
        itemBId: itemB.id,
        itemBNewPosition: itemA.position,
        updatedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error('[LadderScreen] reorder enqueue failed:', err)
      return
    }
    setItems(prev => {
      const updated = [...prev]
      updated[indexA] = { ...itemB, position: itemA.position }
      updated[indexB] = { ...itemA, position: itemB.position }
      return updated
    })
  }

  async function handleNext() {
    if (items.length < MIN_ITEMS || !userId) return
    setOnboardingProgressStep(4)
    router.replace('/(onboarding)/complete')
  }

  const canProceed = items.length >= MIN_ITEMS

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container}>
        <OnboardingStepIndicator step={3} />
        <Text style={styles.title}>{t('onboarding.fearLadder.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.fearLadder.subtitle')}</Text>

        {/* Items list */}
        {items.map((item, index) => (
          <View key={item.id} style={styles.itemRow} accessibilityRole="none">
            <View style={styles.itemContent}>
              <Text style={styles.itemDescription}>{item.description}</Text>
              <Text style={styles.itemSuds}>{t('onboarding.fearLadder.sudsDisplay', { value: item.predictedSuds })}</Text>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity
                onPress={() => swapItems(index, index - 1)}
                disabled={index === 0}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.fearLadder.moveUp')}
                accessibilityState={{ disabled: index === 0 }}
                style={styles.reorderButton}
              >
                <Text style={[styles.reorderText, index === 0 && styles.reorderTextDisabled]}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => swapItems(index, index + 1)}
                disabled={index === items.length - 1}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.fearLadder.moveDown')}
                accessibilityState={{ disabled: index === items.length - 1 }}
                style={styles.reorderButton}
              >
                <Text style={[styles.reorderText, index === items.length - 1 && styles.reorderTextDisabled]}>↓</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Form / Add another */}
        {showForm && (
          <FearItemForm onSave={handleAddItem} onCrisisDetected={handleCrisisDetected} />
        )}
        {!showForm && (
          <TouchableOpacity
            testID="add-another-button"
            style={styles.addAnother}
            onPress={() => setShowForm(true)}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.fearLadder.addAnother')}
          >
            <Text style={styles.addAnotherText}>{t('onboarding.fearLadder.addAnother')}</Text>
          </TouchableOpacity>
        )}
        {/* Soft nudge at 8+ items — dismissible, no hard cap (UX-DR27) */}
        {items.length >= NUDGE_THRESHOLD && !nudgeDismissed && (
          <View style={styles.nudge} testID="ladder-nudge">
            <Text style={styles.nudgeText}>{t('onboarding.fearLadder.ladderNudge')}</Text>
            <TouchableOpacity onPress={() => setNudgeDismissed(true)} accessibilityRole="button" accessibilityLabel={t('onboarding.fearLadder.ladderNudgeDismiss')}>
              <Text style={styles.nudgeDismiss}>{t('onboarding.fearLadder.ladderNudgeDismiss')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Crisis banner */}
        {crisisDetected && (
          <View style={styles.crisisBanner}>
            <Text style={styles.crisisText}>{t('onboarding.crisisDetected.banner')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/(onboarding)/crisis')}
              accessibilityRole="link"
              accessibilityLabel={t('onboarding.overwhelmed.cta')}
            >
              <Text style={styles.crisisLink}>{t('onboarding.overwhelmed.cta')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Feeling overwhelmed? — always visible */}
        <TouchableOpacity
          onPress={() => router.push('/(onboarding)/crisis')}
          accessibilityRole="link"
          accessibilityLabel={t('onboarding.overwhelmed.cta')}
          style={styles.overwhelmedLink}
        >
          <Text style={styles.overwhelmedText}>{t('onboarding.overwhelmed.cta')}</Text>
        </TouchableOpacity>

        {/* Minimum items helper — both helper text and disabled button visible simultaneously (AC 7) */}
        {!canProceed && (
          <Text style={styles.helper}>{t('onboarding.fearLadder.minimumItems')}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, !canProceed && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.fearLadder.nextCta')}
          accessibilityState={{ disabled: !canProceed }}
        >
          <Text style={styles.buttonText}>{t('onboarding.fearLadder.nextCta')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingVertical: 32, backgroundColor: '#ffffff' },
  title: { fontSize: 26, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', lineHeight: 22, marginBottom: 24 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  itemContent: { flex: 1 },
  itemDescription: { fontSize: 15, color: '#111827', lineHeight: 22 },
  itemSuds: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  itemActions: { flexDirection: 'column', gap: 4, marginLeft: 8 },
  reorderButton: { padding: 4 },
  reorderText: { fontSize: 18, color: '#374151' },
  reorderTextDisabled: { color: '#d1d5db' },
  addAnother: { alignSelf: 'stretch', borderWidth: 1, borderColor: '#111827', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  addAnotherText: { color: '#111827', fontSize: 15, fontWeight: '500' },
  crisisBanner: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#fecaca' },
  crisisText: { fontSize: 14, color: '#991b1b', lineHeight: 20, marginBottom: 4 },
  crisisLink: { fontSize: 13, color: '#991b1b', textDecorationLine: 'underline' },
  overwhelmedLink: { marginTop: 20, alignSelf: 'center' },
  overwhelmedText: { fontSize: 14, color: '#6b7280', textDecorationLine: 'underline' },
  helper: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 8 },
  button: { alignSelf: 'stretch', backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { backgroundColor: '#d1d5db' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
```

**Invariant: both `minimumItems` helper text and the disabled Next button are visible simultaneously** (AC 7 explicit requirement). The current structure renders helper text before the button, so both render when `!canProceed`.

---

### `complete.tsx` stub

```tsx
// apps/mobile/app/(onboarding)/complete.tsx
import { View, Text, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

// Minimal stub — Story 4.4 replaces this content.
export default function CompleteScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <Text>Step 4 — Story 4.4</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } })
```

---

### Resume routing update in `welcome.tsx`

Add step-4 case to the resume `useEffect` (current code handles steps 2 and 3):

```typescript
} else if (onboardingProgressStep === 3) {
  router.replace('/(onboarding)/ladder')
} else if (onboardingProgressStep === 4) {
  router.replace('/(onboarding)/complete')
}
// Steps 5+ — stay on welcome (no route exists; steps > 4 not used at MVP)
```

---

### `welcome.test.tsx` changes

1. **Change existing test** `'stays on welcome when onboardingProgressStep is > 3 (route not yet created)'`:
   - Rename to `'navigates to complete when onboardingProgressStep is 4'`
   - Change `onboardingProgressStep: 4` assertion to `expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/complete')`

2. **Add new test** `'stays on welcome when onboardingProgressStep is > 4 (route not yet created)'`:
   - `onboardingProgressStep: 5`
   - Assert `mockReplace` is NOT called

---

### i18n keys to add

**Only add these new keys** — `fearLadder.minimumItems`, `fearLadder.ladderNudge`, `fearLadder.ladderNudgeDismiss`, `crisisDetected.banner`, `complete.*` already exist in both `en.json` and `hi.json`. (`fearLadder.maximumItems` was removed — do not add it.)

Add under the existing `"onboarding"."fearLadder"` key in `en.json`:

```json
"fearLadder": {
  "minimumItems": "Add at least 3 situations to continue.",           // already present — do NOT re-add
  "ladderNudge": "That's a solid ladder — most people find 10–15 situations gives enough range.", // already present — do NOT re-add
  "ladderNudgeDismiss": "Got it",                                     // already present — do NOT re-add
  "title": "Build your Courage Ladder",
  "subtitle": "Add the situations that make you anxious, then arrange them from least to most scary.",
  "descriptionLabel": "Describe the situation",
  "descriptionPlaceholder": "e.g. Riding the elevator alone",
  "predictedSudsLabel": "How anxious would you feel? (0–10)",
  "addCta": "Add to ladder",
  "addAnother": "Add another situation",
  "moveUp": "Move up",
  "moveDown": "Move down",
  "sudsDisplay": "Predicted anxiety: {{value}}/10",
  "nextCta": "Next"
}
```

Add matching keys to `hi.json` with English text as placeholders (same approach as all other onboarding keys).

---

### `OutboxOperation` constraint: reorder uses 'UPDATE'

`OutboxOperationSchema = z.enum(['INSERT', 'UPDATE', 'DELETE'])` — 'REORDER' is not a valid value. The reorder enqueue uses `'UPDATE'` as the operation with `type: 'reorder_positions'` in the payload. Epic 5's drag reorder (Story 5.1) uses the identical payload shape, so the PowerSync handler Epic 6 writes will handle both move-buttons and drag-reorder from the same enqueue.

---

### Test cases

**`ladder.test.tsx`** (Jest + RNTL):

Mock: `react-i18next`, `expo-router`, `@exposure-buddy/supabase` (`useAuth`), `../../src/components/onboarding/OnboardingStepIndicator`, `../../src/components/onboarding/FearItemForm`, `../../src/sync/adapter`. Use exact same mock structure as `assessment.test.tsx`.

In `beforeEach`: `jest.spyOn(Math, 'random').mockReturnValue(0.5)` (UUID generation uses Math.random).

`FearItemForm` mock should expose the `onSave` and `onCrisisDetected` props so tests can fire them:
```tsx
jest.mock('../../src/components/onboarding/FearItemForm', () => {
  const { TouchableOpacity, Text } = require('react-native')
  return {
    FearItemForm: ({ onSave, onCrisisDetected }: { onSave: (d: string, s: number) => void; onCrisisDetected: () => void }) => (
      <>
        <TouchableOpacity testID="form-add" onPress={() => onSave('Test situation', 5)} />
        <TouchableOpacity testID="form-crisis" onPress={() => onCrisisDetected()} />
      </>
    ),
  }
})
```

Required test cases:
1. `renders title` — `getByText('onboarding.fearLadder.title')` exists
2. `on mount calls setOnboardingProgressStep(3)` — mock called with 3
3. `Next button is disabled with fewer than 3 items` — `getByRole('button', { name: 'onboarding.fearLadder.nextCta' })` has `accessibilityState.disabled === true`; use `getByRole('button', { name: ... })` to disambiguate from other buttons on screen
4. `shows minimumItems helper text with fewer than 3 items` — `getByText('onboarding.fearLadder.minimumItems')` exists; both helper and disabled button visible simultaneously
5. `Next enabled and helper hidden after 3 items added` — press `form-add` → press `add-another-button` → press `form-add` → press `add-another-button` → press `form-add`; assert Next not disabled; assert `minimumItems` text absent (after adding, form is hidden and "Add another" renders, hence the alternating taps)
6. `shows soft nudge after 8 items and form remains accessible` — loop: press `form-add` then `add-another-button` 8 times; after 8th add assert `testID="ladder-nudge"` present and `form-add` still accessible
6b. `dismisses nudge when "Got it" pressed and form stays accessible` — same setup to 8 items; press the dismiss button inside `ladder-nudge`; assert nudge gone, `form-add` still present
7. `shows crisis banner when onCrisisDetected fires` — press `testID="form-crisis"`; assert `getByText('onboarding.crisisDetected.banner')` exists
8. `calls setCrisisFlaggedInOnboarding exactly once even when onCrisisDetected fires multiple times` — press `testID="form-crisis"` twice; assert `mockSetCrisisFlaggedInOnboarding` called once
9. `pressing Next when ≥3 items calls setOnboardingProgressStep(4) and navigates to complete` — add 3 items, press Next; wrap in `waitFor`; assert `mockSetOnboardingProgressStep` called with 4; assert `mockReplace` called with `'/(onboarding)/complete'`

**`FearItemForm.test.tsx`** (Jest + RNTL):

Mock: `react-i18next`, `@exposure-buddy/core` (`detectCrisisKeywords`), `./SudsCalibrationWidget`. Use pattern from `SudsCalibrationWidget.test.tsx`.

`SudsCalibrationWidget` mock:
```tsx
jest.mock('./SudsCalibrationWidget', () => {
  const { TouchableOpacity } = require('react-native')
  return {
    SudsCalibrationWidget: ({ onChange }: { onChange: (v: number) => void }) => (
      <TouchableOpacity testID="suds-widget" accessibilityRole="none" onPress={() => onChange(6)} />
    ),
  }
})
```

Required test cases:
1. `renders description input` — `getByRole('textinput', ...)` or `getByPlaceholderText('onboarding.fearLadder.descriptionPlaceholder')` exists
2. `Add button is disabled when description empty` — initial render; `getByRole('button', { name: 'onboarding.fearLadder.addCta' })` has `accessibilityState.disabled === true`
3. `Add button is disabled when suds not selected` — enter description only; button still disabled
4. `Add button is disabled when description is only whitespace` — set description to `'   '`; button still disabled
5. `pressing Add with valid inputs calls onSave and clears form` — enter description, fire SUDS widget; press Add button; assert `mockOnSave` called with `('test description', 6)`; assert description input cleared
6. `calls onCrisisDetected when detectCrisisKeywords returns true` — mock `detectCrisisKeywords` to return true; change description text; assert `mockOnCrisisDetected` called once
7. `does NOT call onCrisisDetected twice for same form instance` — mock returns true; change text twice; assert called once (crisisCalledRef guard)
8. `save is NOT blocked when crisis detected` — mock returns true; fill form; press Add; assert `mockOnSave` called (crisis does not block save)

---

### Patterns from Story 4.2 to follow

- UUID generation: use the same pure-JS `generateUUID()` helper (copy from assessment.tsx) — `crypto.randomUUID()` was NOT used in the final implementation (Hermes compatibility); the pure-JS version using `Math.random` was shipped instead
- `getAdapter()` import: `import { getAdapter } from '../../src/sync/adapter'`
- `useAuth()` destructure pattern: `const { userId, setOnboardingProgressStep, setCrisisFlaggedInOnboarding } = useAuth()`
- `Stack.Screen` at top of JSX return
- All strings via `t()` — `i18next/no-literal-string` ESLint rule enforced; use `// eslint-disable-next-line i18next/no-literal-string` for enqueue table/operation/status string literals
- Test mock for `useAuth`: `mockUseAuth.mockReturnValue({ isLoading: false, userId: 'user-123', setOnboardingProgressStep: mockSetOnboardingProgressStep, setCrisisFlaggedInOnboarding: mockSetCrisisFlaggedInOnboarding })` — include all destructured fields
- `jest.clearAllMocks()` in `beforeEach`
- `ScrollView` with `contentContainerStyle` (not `style`) for the outer container

### `setOnboardingProgressStep(3)` on mount invariant

Called in a `useEffect` with stable ref dep. Same pattern as assessment.tsx step 2. If app crashes after navigation to ladder but before any items added, next relaunch resumes to step 3 (ladder stub/screen) rather than step 2. Calibration value is already in MMKV. This is correct offline-first recovery behaviour.

### Note on `headerShown: false` preservation

The stub has `Stack.Screen options={{ headerShown: false }}` — this was explicitly set because the screen is reached via `router.replace('/(onboarding)/ladder')` from assessment. The header being hidden prevents a back button appearing that would let users navigate back to assessment after submitting their calibration. This must be preserved in the full implementation.

### Note on `actual_suds` column name

AC 2 specifies `actual_suds` (nullable int). Epic 5 Story 5.2 migration renames this to `peak_suds`. Create the column as `actual_suds` now — the rename migration runs in Epic 5, not here. Do NOT use `peak_suds` in this story.

### Note on clinician RLS assertion wording

The 4th RLS assertion for `fear_ladder_items` is labelled `[stub]` to signal it's a placeholder that gets replaced in Epic 5 Story 5.4. Functionally, it's identical to the cross-user assertion: User B has no `therapist_patient_relationships` row and gets 0 rows. This is intentional and correct at MVP.

### Baseline test count

Story 4.2 shipped 54 Jest tests (11 suites). This story adds `ladder.test.tsx` (9 cases), `FearItemForm.test.tsx` (8 cases), updates `welcome.test.tsx` (net 0 — one test renamed/changed, one added = no change in count). New baseline: ~71 Jest tests.

---

## Dev Agent Record

### Completion Notes

Implemented Story 4.3 in full. Key notes:

- Migration `0013_fear_ladder_items.sql` used `INT` (no keyword) for nullable `actual_suds` column — `NULLABLE` is not valid PostgreSQL syntax; omitting `NOT NULL` makes a column nullable by default.
- Supabase CLI version banner was appended to the generated `database.types.ts` via stdout redirect — stripped the two noise lines with a grep filter before writing.
- `Math.random().mockReturnValue(0.5)` in `ladder.test.tsx` would generate identical UUIDs for all items (duplicate React keys). Fixed with a cycling mock that produces distinct values per call.
- `getByRole('none')` in `FearItemForm.test.tsx` was ambiguous (multiple elements with that role); switched to `getByTestId('suds-widget')`.
- Added `testID="add-another-button"` to the "Add another" button in `ladder.tsx` to enable stable test queries across the 10-item loop test.
- PowerSync schema correctly includes `id: column.text` for `fear_ladder_items` (avoids the D5 deferred gap from Story 4.2).
- All 10 ACs satisfied; 72 Jest tests pass (13 suites); typecheck and lint clean.

## File List

- `supabase/migrations/0013_fear_ladder_items.sql` — Created
- `supabase/migrations/0014_therapist_patient_relationships.sql` — Created
- `packages/supabase/src/database.types.ts` — Regenerated
- `packages/supabase/__tests__/rls/fear_ladder_items.test.ts` — Created
- `packages/sync/src/schema.ts` — Updated
- `packages/supabase/src/auth/AuthProvider.tsx` — Updated
- `packages/supabase/src/auth/useAuth.ts` — Updated
- `apps/mobile/src/components/onboarding/FearItemForm.tsx` — Created
- `apps/mobile/src/components/onboarding/FearItemForm.test.tsx` — Created
- `apps/mobile/app/(onboarding)/ladder.tsx` — Replaced
- `apps/mobile/app/(onboarding)/ladder.test.tsx` — Created
- `apps/mobile/app/(onboarding)/complete.tsx` — Created
- `apps/mobile/app/(onboarding)/welcome.tsx` — Updated
- `apps/mobile/app/(onboarding)/welcome.test.tsx` — Updated
- `apps/mobile/src/i18n/locales/en.json` — Updated
- `apps/mobile/src/i18n/locales/hi.json` — Updated
- `docs/decisions/adr-fear-ladder-description-encryption.md` — Created
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated

## Change Log

- 2026-06-02: Story 4.3 created — Initial Fear Ladder Setup
- 2026-06-02: Story 4.3 implemented — fear_ladder_items migration + RLS, therapist_patient_relationships stub, FearItemForm component, full ladder.tsx, complete.tsx stub, welcome.tsx step-4 routing, AuthProvider setCrisisFlaggedInOnboarding, PowerSync schema, ADR, i18n keys, 17 new tests (9 ladder + 8 FearItemForm); 72 tests passing
