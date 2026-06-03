# Story 4.4: Onboarding Completion & Home Screen Entry

Status: done

## Story

As a user who has finished onboarding,
I want to land on a meaningful home screen that shows my Courage Ladder,
so that I feel motivated and know exactly what to do next (FR-ONBOARD-01).

*Depends on: Story 4.3 merged to main.* ✅

## Acceptance Criteria

1. **Completion screen — no-crisis path**
   Given the user arrives at `complete.tsx` and `KV_KEYS.CRISIS_FLAGGED_IN_ONBOARDING(userId)` is NOT set
   When the screen renders
   Then it displays: `t('onboarding.complete.title')` (celebratory heading), item count (from `count` search param, e.g. "You've added {{count}} situations"), `t('onboarding.complete.encouragement')`, and a "Start your journey" CTA

2. **Completion screen — crisis path**
   Given the user arrives at `complete.tsx` and `KV_KEYS.CRISIS_FLAGGED_IN_ONBOARDING(userId)` IS set
   When the screen renders
   Then it displays `t('onboarding.complete.titleSoft')` (calm heading), `t('onboarding.complete.encouragementSoft')` (supportive copy), the "Start your journey" CTA, and the persistent `t('onboarding.overwhelmed.cta')` link to `/(onboarding)/crisis`; no item count shown in crisis path; no festive visual treatment

3. **"Start your journey" CTA action**
   Given the user taps "Start your journey"
   When navigation executes
   Then `markOnboardingComplete()` is called FIRST (sets `KV_KEYS.ONBOARDING_COMPLETE(userId)` in MMKV and flips `isOnboardingComplete` to true in context), THEN `router.replace('/(app)/index')` navigates to home; `AccessibilityInfo.setAccessibilityFocus()` is called on the home screen's first interactive element (UX-DR16 — implemented in home screen, not complete.tsx)

4. **Home screen — first visit greeting**
   Given the home screen renders for the first time after onboarding completion
   When `KV_KEYS.FIRST_HOME_VISIT_SEEN(userId)` is not set in MMKV
   Then `t('home.readyToStart')` is displayed; `markFirstHomeVisitSeen()` is called on mount (writes `true` to MMKV under `KV_KEYS.FIRST_HOME_VISIT_SEEN(userId)`)

5. **Home screen — returning visit greeting**
   Given the home screen renders on any subsequent visit
   When `KV_KEYS.FIRST_HOME_VISIT_SEEN(userId)` is already set
   Then `t('home.welcomeBack')` is displayed; `markFirstHomeVisitSeen()` is NOT called again

6. **`CourageLadderEntryCard` renders on home screen**
   Given the home screen renders
   When the screen loads
   Then `CourageLadderEntryCard` is rendered with props: `ladderItemCount: number`, `lowestPendingItem: FearLadderItemSummary | null`, `onPress: () => void`; in Story 4.4 `ladderItemCount = 0` and `lowestPendingItem = null` because the PowerSync connector is a no-op stub (Epic 6 wires real data); the card handles null gracefully (shows placeholder copy); `onPress` is a no-op stub (Epic 5 routes to full ladder screen); the card is the first interactive element and receives `ref` for accessibility focus

7. **`CalmMeButton` visible without scrolling**
   Given the home screen renders (UX-DR04)
   When the screen is visible
   Then a "Feeling overwhelmed?" / calm-me button is visible without scrolling; tapping it calls `router.push('/calm-me')`; the `calm-me.tsx` stub is at `apps/mobile/app/calm-me.tsx` (root-level Stack screen, same pattern as `privacy-notice.tsx`)

8. **item count passed to `complete.tsx` via search params**
   Given the user taps "Next" in `ladder.tsx` with N items
   When `handleNext` runs
   Then `router.replace` is called with `{ pathname: '/(onboarding)/complete', params: { count: String(items.length) } }` — `complete.tsx` reads `count` via `useLocalSearchParams()`; welcome.tsx resume routing to complete stays as string (no count on resume — handled gracefully)

---

## Tasks / Subtasks

### T1 — Add `FIRST_HOME_VISIT_SEEN` to KV_KEYS (AC: 4, 5)

- [x] T1.1: Edit `packages/core/src/constants/kvKeys.ts` — add `FIRST_HOME_VISIT_SEEN: (userId: string) => \`first_home_visit_seen:\${userId}\`` to the user-scoped section (after `CRISIS_FLAGGED_IN_ONBOARDING`)

### T2 — Fear ladder selector in `packages/core` (AC: 6)

- [x] T2.1: Create `packages/core/src/selectors/fearLadder.ts` — see Dev Notes for full interface and function signature
- [x] T2.2: Create `packages/core/src/__tests__/selectors/fearLadder.test.ts` — Vitest tests; see Dev Notes for required cases
- [x] T2.3: Update `packages/core/src/index.ts` — export `FearLadderItemSummary`, `FearLadderItem`, `resolveLowestPendingItem`

### T3 — `CourageLadderEntryCard` in `packages/ui` (AC: 6, 7)

- [x] T3.1: Create `packages/ui/src/components/CourageLadderEntryCard.tsx` — see Dev Notes for full implementation including `React.forwardRef` for accessibility ref. **i18n note:** placeholder strings ("Your ladder is being set up…", "No pending items") and SUDS display ("Anxiety: {n}/10") are MVP stubs — `packages/ui` has no i18n dependency, so these are not translatable via `t()`. Verify `packages/ui`'s ESLint config exempts these literals from `i18next/no-literal-string`; if not, add `{/* eslint-disable-next-line i18next/no-literal-string */}` before each literal JSX expression. Add `placeholderText` and `sudsLabel` props to `CourageLadderEntryCardProps` in a future story when real data arrives (Epic 6).
- [x] T3.2: Update `packages/ui/src/index.ts` — export `CourageLadderEntryCard` and re-export `CourageLadderEntryCardProps`

### T4 — AuthProvider additions (AC: 2, 4, 5)

- [x] T4.1: Add `crisisFlaggedInOnboarding: boolean` state to AuthProvider — initialized `false`; read from `mmkv.getBoolean(KV_KEYS.CRISIS_FLAGGED_IN_ONBOARDING(userId))` in the auth listener block where other onboarding state is read (alongside `isOnboardingComplete` and `onboardingProgressStep`); reset to `false` on sign-out. **Also update the existing `setCrisisFlaggedInOnboarding()` function (added in Story 4.2) to call `setCrisisFlaggedInOnboardingLocal(true)` after writing to MMKV** — without this, the crisis flag written mid-session during onboarding will not propagate to context state, and AC 2 (crisis path on `complete.tsx`) will silently never trigger on the first visit of any session.
- [x] T4.2: Add `firstHomeVisitSeen: boolean` state to AuthProvider — initialized `false`; read from `mmkv.getBoolean(KV_KEYS.FIRST_HOME_VISIT_SEEN(userId))` in same auth listener block; reset to `false` on sign-out
- [x] T4.3: Add `markFirstHomeVisitSeen(): void` function — writes `true` to `KV_KEYS.FIRST_HOME_VISIT_SEEN(userId)` and calls `setFirstHomeVisitSeenLocal(true)`; same pattern as `markOnboardingComplete()`; log error and return in degraded mode
- [x] T4.4: Add all three (`crisisFlaggedInOnboarding`, `firstHomeVisitSeen`, `markFirstHomeVisitSeen`) to `AuthContextValue` interface, default context, and `AuthContext.Provider value`
- [x] T4.5: Update `packages/supabase/src/auth/useAuth.ts` — add `crisisFlaggedInOnboarding`, `firstHomeVisitSeen`, `markFirstHomeVisitSeen` to `UseAuthResult` interface and destructure + return from `useAuth()`

### T5 — i18n keys (AC: 1, 2, 3, 4, 5, 7)

- [x] T5.1: Add to `apps/mobile/src/i18n/locales/en.json` under a new top-level `"home"` key:
  ```json
  "home": {
    "readyToStart": "Your Courage Ladder is ready. Let's go!",
    "welcomeBack": "Welcome back. Keep going.",
    "calmMe": {
      "cta": "Feeling overwhelmed?"
    }
  }
  ```
- [x] T5.2: Add `"onboarding"."complete"."cta": "Start your journey"` to `en.json` (under the existing `complete` block, alongside existing title/encouragement keys)
- [x] T5.3: Add `"onboarding"."complete"."itemCount": "You've added {{count}} situations to your Courage Ladder"` to `en.json`
- [x] T5.4: Add all new keys to `apps/mobile/src/i18n/locales/hi.json` as English-text placeholders (same pattern as all existing onboarding keys)

### T6 — Update `ladder.tsx` to pass count to `complete.tsx` (AC: 8)

- [x] T6.1: Update `handleNext` in `apps/mobile/app/(onboarding)/ladder.tsx` — change `router.replace('/(onboarding)/complete')` to `router.replace({ pathname: '/(onboarding)/complete', params: { count: String(items.length) } })`
- [x] T6.2: Update `apps/mobile/app/(onboarding)/ladder.test.tsx` — update test `'pressing Next when ≥3 items calls setOnboardingProgressStep(4) and navigates to complete'` to assert `mockReplace` was called with `{ pathname: '/(onboarding)/complete', params: { count: '3' } }` instead of the string

### T7 — Implement `complete.tsx` (AC: 1, 2, 3, 8)

- [x] T7.1: Replace `apps/mobile/app/(onboarding)/complete.tsx` (current stub, see Dev Notes for current stub content to verify)
- [x] T7.2: Read `crisisFlaggedInOnboarding` and `markOnboardingComplete` from `useAuth()`
- [x] T7.3: Read `count` from `useLocalSearchParams()` — parse as int; if absent or NaN, omit the item count line (resume case)
- [x] T7.4: Conditional rendering based on `crisisFlaggedInOnboarding`: crisis path shows `titleSoft` + `encouragementSoft` + "Feeling overwhelmed?" link; non-crisis path shows `title` + `encouragement` + item count (if available)
- [x] T7.5: CTA button calls `markOnboardingComplete()` THEN `router.replace('/(app)/index')` — order is critical to prevent (app)/_layout.tsx auth gate from re-redirecting to onboarding
- [x] T7.6: `Stack.Screen options={{ headerShown: false }}` — preserve stub's headerShown: false (screen is reached via router.replace)

### T8 — Create `calm-me.tsx` stub (AC: 7)

- [x] T8.1: Create `apps/mobile/app/calm-me.tsx` as a minimal root-level Stack screen stub (see Dev Notes for exact stub content) — follow same pattern as `privacy-notice.tsx` (root-level, non-tab screen)
- [x] T8.2: Add `<Stack.Screen name="calm-me" options={{ headerShown: false }} />` to `apps/mobile/app/_layout.tsx` Stack configuration

### T9 — Implement home screen `(app)/index.tsx` (AC: 4, 5, 6, 7)

- [x] T9.1: Replace `apps/mobile/app/(app)/index.tsx` (current placeholder, see Dev Notes for current content)
- [x] T9.2: Read `firstHomeVisitSeen`, `markFirstHomeVisitSeen` from `useAuth()`
- [x] T9.3: `useEffect` on mount — if `!firstHomeVisitSeen`, call `markFirstHomeVisitSeen()`; dep array is `[]` (mount-only); add `// eslint-disable-next-line react-hooks/exhaustive-deps` on the line immediately before `}, [])` — the intentional empty dep array violates the exhaustive-deps rule and must be suppressed so CI gate T11.2 passes.
- [x] T9.4: Accessibility focus `useEffect` on mount — use `setTimeout(..., 100)` to call `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(firstInteractiveRef.current))` after animation settles; clear timeout on unmount; also add `// eslint-disable-next-line react-hooks/exhaustive-deps` above its `}, [])`. **Do NOT use the existing `useFocusOnMount` hook** — that hook fires on `useFocusEffect` (every screen focus, not mount-only) and only for reduced-motion users; this accessibility focus is intentionally mount-only and unconditional for all users.
- [x] T9.5: Greeting text — add `const seenOnMount = useRef(firstHomeVisitSeen)` before the first `useEffect`, then render `seenOnMount.current ? t('home.welcomeBack') : t('home.readyToStart')`. Using a ref (not live state) prevents a visible flicker: without it, `markFirstHomeVisitSeen()` fires on mount and immediately re-renders the greeting from "ready to start" → "welcome back" within the same visit. With the ref, first-visit users always see "ready to start"; returning visits see "welcome back" immediately (MMKV already set, so `seenOnMount.current = true` at mount).
- [x] T9.6: Render `CourageLadderEntryCard` with `ref={firstInteractiveRef}`, `ladderItemCount={0}`, `lowestPendingItem={resolveLowestPendingItem([])}`, `onPress={() => {}}` (noop stub — Epic 5 replaces)
- [x] T9.7: Render CalmMe button below card (visible without scrolling — no ScrollView needed at this stage): `TouchableOpacity onPress={() => router.push('/calm-me')}` with `accessibilityRole="button"` and `accessibilityLabel={t('home.calmMe.cta')}`
- [x] T9.8: No `Stack.Screen` header override needed — `(app)/_layout.tsx` sets `headerShown: false` globally

### T10 — Tests (AC: 1–7)

- [x] T10.1: Create `apps/mobile/app/(onboarding)/complete.test.tsx` — see Dev Notes for required test cases
- [x] T10.2: Create `apps/mobile/app/(app)/index.test.tsx` — see Dev Notes for required test cases

### T11 — CI gates

- [x] T11.1: `pnpm turbo typecheck` passes with zero errors
- [x] T11.2: `pnpm turbo lint` passes with zero errors
- [x] T11.3: `pnpm turbo test` passes — all new tests green; existing 72 Jest + Vitest tests unchanged (or updated per T6.2)

---

## Dev Notes

### Architecture: why PowerSync data isn't available on the home screen yet

The `PowerSyncSyncAdapter` is a **true no-op stub** (Story 1.7 scaffold, Epic 6 wires the real connector). `adapter.enqueue()` resolves immediately without persisting data anywhere. There is also no `PowerSyncProvider` in the root `_layout.tsx`, so `usePowerSyncQuery` is unavailable.

**Consequence for Story 4.4:** `CourageLadderEntryCard` renders with `ladderItemCount: 0` and `lowestPendingItem: null`. This is the correct and expected behaviour — the card structure is in place; real data populates once Epic 6 wires the PowerSync cloud connector and `PowerSyncProvider` is added to the root layout.

**Do NOT:** attempt to add `PowerSyncProvider` to `_layout.tsx`, query Supabase directly from the home screen, or store fear_ladder_items in MMKV as a workaround. These are out of scope.

---

### Current stub: `complete.tsx`

```tsx
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

Replace this file entirely in T7.1.

---

### Current home screen: `(app)/index.tsx`

```tsx
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'

// Home screen placeholder — full implementation in Epic 5/6
export default function HomeScreen() {
  const { t } = useTranslation()
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('common.appName')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  title: { fontSize: 24, fontWeight: '600' },
})
```

Replace this file in T9.1.

---

### `calm-me.tsx` stub (T8.1)

```tsx
// apps/mobile/app/calm-me.tsx
import { View, Text, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

// Minimal stub — Epic 7 replaces this content.
export default function CalmMeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <Text>Calm Me — Epic 7</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } })
```

---

### `fearLadder.ts` selector (T2.1)

```typescript
// packages/core/src/selectors/fearLadder.ts
// ARC-001: zero imports from react-native, expo-*, or @supabase/*

export interface FearLadderItemSummary {
  id: string
  description: string
  predictedSuds: number
  position: number
}

// Full item type includes status for filtering; summary omits it for the card prop
export interface FearLadderItem extends FearLadderItemSummary {
  status: string
}

export function resolveLowestPendingItem(items: FearLadderItem[]): FearLadderItemSummary | null {
  const pending = items
    .filter(item => item.status === 'pending')
    .sort((a, b) => a.position - b.position)
  if (pending.length === 0) return null
  const { id, description, predictedSuds, position } = pending[0]
  return { id, description, predictedSuds, position }
}
```

---

### `packages/core/src/index.ts` additions (T2.3)

Add after existing exports:
```typescript
export type { FearLadderItemSummary, FearLadderItem } from './selectors/fearLadder'
export { resolveLowestPendingItem } from './selectors/fearLadder'
```

---

### `CourageLadderEntryCard.tsx` (T3.1)

```tsx
// packages/ui/src/components/CourageLadderEntryCard.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { FearLadderItemSummary } from '@exposure-buddy/core'

export interface CourageLadderEntryCardProps {
  ladderItemCount: number
  lowestPendingItem: FearLadderItemSummary | null
  onPress: () => void
}

export const CourageLadderEntryCard = React.forwardRef<
  React.ElementRef<typeof TouchableOpacity>,
  CourageLadderEntryCardProps
>(function CourageLadderEntryCard({ ladderItemCount, lowestPendingItem, onPress }, ref) {
  return (
    <TouchableOpacity
      ref={ref}
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
    >
      {lowestPendingItem ? (
        <View>
          <Text style={styles.description}>{lowestPendingItem.description}</Text>
          <Text style={styles.suds}>Anxiety: {lowestPendingItem.predictedSuds}/10</Text>
        </View>
      ) : (
        <Text style={styles.placeholder}>
          {ladderItemCount === 0 ? 'Your ladder is being set up…' : 'No pending items'}
        </Text>
      )}
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
    marginVertical: 16,
    alignSelf: 'stretch',
  },
  description: { fontSize: 16, color: '#111827', fontWeight: '600' },
  suds: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  placeholder: { fontSize: 15, color: '#9ca3af', textAlign: 'center' },
})
```

**Critical:** `React.forwardRef` is required so `HomeScreen` can pass a ref for `AccessibilityInfo.setAccessibilityFocus()`. The displayName is set via the named function inside `forwardRef`.

**Import constraint (ARC-001):** `packages/ui` may import from `packages/core` for types, but MUST NOT import from `@supabase/*`, `expo-*`, or anything not in `packages/ui`'s own dependencies. Verify `@exposure-buddy/core` is in `packages/ui/package.json` dependencies.

---

### `packages/ui/src/index.ts` additions (T3.2)

Add after existing exports:
```typescript
export { CourageLadderEntryCard } from './components/CourageLadderEntryCard'
export type { CourageLadderEntryCardProps } from './components/CourageLadderEntryCard'
```

---

### AuthProvider changes (T4.1–T4.5)

**New state variables** (add after existing `isStorageDegraded` state):
```typescript
const [crisisFlaggedInOnboarding, setCrisisFlaggedInOnboardingLocal] = useState(false)
const [firstHomeVisitSeen, setFirstHomeVisitSeenLocal] = useState(false)
```

**In the auth state change listener** — in the `if (session)` branch, after the existing `setOnboardingProgressStepLocal` block (still guarded by `store && session.user.id !== lastOnboardingReadUserIdRef.current`):
```typescript
setCrisisFlaggedInOnboardingLocal(
  mmkv.getBoolean(KV_KEYS.CRISIS_FLAGGED_IN_ONBOARDING(session.user.id)) ?? false
)
setFirstHomeVisitSeenLocal(
  mmkv.getBoolean(KV_KEYS.FIRST_HOME_VISIT_SEEN(session.user.id)) ?? false
)
```

**In the `else` (sign-out) branch**, reset both:
```typescript
setCrisisFlaggedInOnboardingLocal(false)
setFirstHomeVisitSeenLocal(false)
```

**New function** (add after `setSudsCalibration` and `setCrisisFlaggedInOnboarding`):
```typescript
function markFirstHomeVisitSeen(): void {
  const store = mmkvRef.current
  const userId = authState.userId
  if (!store || !userId) {
    console.error('[AuthProvider] markFirstHomeVisitSeen called in degraded mode — cannot persist to MMKV')
    return
  }
  store.set(KV_KEYS.FIRST_HOME_VISIT_SEEN(userId), true)
  setFirstHomeVisitSeenLocal(true)
}
```

**`AuthContextValue` interface** additions (after `setCrisisFlaggedInOnboarding: () => void`):
```typescript
crisisFlaggedInOnboarding: boolean
firstHomeVisitSeen: boolean
markFirstHomeVisitSeen: () => void
```

**Default context** additions:
```typescript
crisisFlaggedInOnboarding: false,
firstHomeVisitSeen: false,
markFirstHomeVisitSeen: () => {},
```

**Provider value** additions — add the three new values to the existing `value` object.

---

### `useAuth.ts` additions (T4.5)

Add to `UseAuthResult` interface:
```typescript
crisisFlaggedInOnboarding: boolean
firstHomeVisitSeen: boolean
markFirstHomeVisitSeen: () => void
```

Destructure from context and include in return object (same position as they appear in the interface).

---

### `complete.tsx` full implementation (T7)

```tsx
// apps/mobile/app/(onboarding)/complete.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useRouter, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'

export default function CompleteScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { count } = useLocalSearchParams<{ count?: string }>()
  const itemCount = count !== undefined ? parseInt(count, 10) : null
  const showCount = itemCount !== null && !isNaN(itemCount) && itemCount > 0
  const { crisisFlaggedInOnboarding, markOnboardingComplete } = useAuth()

  function handleStartJourney() {
    markOnboardingComplete()  // MUST precede router.replace — flips isOnboardingComplete before (app) layout mounts
    router.replace('/(app)/index')
  }

  const title = crisisFlaggedInOnboarding
    ? t('onboarding.complete.titleSoft')
    : t('onboarding.complete.title')

  const encouragement = crisisFlaggedInOnboarding
    ? t('onboarding.complete.encouragementSoft')
    : t('onboarding.complete.encouragement')

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>

        {!crisisFlaggedInOnboarding && showCount && (
          <Text style={styles.count}>
            {t('onboarding.complete.itemCount', { count: itemCount })}
          </Text>
        )}

        <Text style={styles.encouragement}>{encouragement}</Text>

        {crisisFlaggedInOnboarding && (
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/crisis')}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.overwhelmed.cta')}
            style={styles.overwhelmedLink}
          >
            <Text style={styles.overwhelmedText}>{t('onboarding.overwhelmed.cta')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleStartJourney}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.complete.cta')}
        >
          <Text style={styles.buttonText}>{t('onboarding.complete.cta')}</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingVertical: 48, backgroundColor: '#ffffff', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 8, textAlign: 'center' },
  count: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 8 },
  encouragement: { fontSize: 15, color: '#6b7280', lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  overwhelmedLink: { alignSelf: 'center', marginBottom: 16 },
  overwhelmedText: { fontSize: 14, color: '#6b7280', textDecorationLine: 'underline' },
  button: { alignSelf: 'stretch', backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
```

**Critical invariant:** `markOnboardingComplete()` MUST be called before `router.replace('/(app)/index')`. The `(app)/_layout.tsx` checks `isOnboardingComplete` on mount. If it is `false` when the layout renders, it will re-redirect to `/(onboarding)/welcome`. Since `markOnboardingComplete()` synchronously updates React state (`setIsOnboardingCompleteLocal(true)`), calling it first ensures the context value is `true` before the `(app)` layout effect runs.

---

### Home screen `(app)/index.tsx` full implementation (T9)

```tsx
// apps/mobile/app/(app)/index.tsx
import { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo, findNodeHandle } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { CourageLadderEntryCard } from '@exposure-buddy/ui'
import { resolveLowestPendingItem } from '@exposure-buddy/core'

export default function HomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { firstHomeVisitSeen, markFirstHomeVisitSeen } = useAuth()
  const cardRef = useRef<React.ElementRef<typeof CourageLadderEntryCard>>(null)
  // Capture MMKV-derived value at mount — prevents greeting flicker on first visit
  const seenOnMount = useRef(firstHomeVisitSeen)

  useEffect(() => {
    if (!firstHomeVisitSeen) {
      markFirstHomeVisitSeen()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // mount-only — dep array intentionally empty

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (cardRef.current) {
        const tag = findNodeHandle(cardRef.current)
        if (tag) AccessibilityInfo.setAccessibilityFocus(tag)
      }
    }, 100)
    return () => clearTimeout(timeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // PowerSync no-op stub — real items populate when Epic 6 wires the connector
  const lowestPendingItem = resolveLowestPendingItem([])

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        {seenOnMount.current ? t('home.welcomeBack') : t('home.readyToStart')}
      </Text>

      <CourageLadderEntryCard
        ref={cardRef}
        ladderItemCount={0}
        lowestPendingItem={lowestPendingItem}
        onPress={() => {/* Epic 5: router.push to full ladder screen */}}
      />

      <TouchableOpacity
        style={styles.calmMeButton}
        onPress={() => router.push('/calm-me')}
        accessibilityRole="button"
        accessibilityLabel={t('home.calmMe.cta')}
      >
        <Text style={styles.calmMeText}>{t('home.calmMe.cta')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 48, backgroundColor: '#ffffff' },
  greeting: { fontSize: 22, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 8 },
  calmMeButton: { alignSelf: 'center', marginTop: 24 },
  calmMeText: { fontSize: 14, color: '#6b7280', textDecorationLine: 'underline' },
})
```

**Greeting approach:** The greeting uses `seenOnMount.current` (a `useRef` capturing `firstHomeVisitSeen` at mount time), not the live state value. This prevents a visible flicker: without the ref, `markFirstHomeVisitSeen()` fires in the mount effect and synchronously calls `setFirstHomeVisitSeenLocal(true)`, causing an immediate re-render that would change the greeting from "ready to start" → "welcome back" within the same visit. With the ref: first visit mounts with `seenOnMount.current = false` → greeting is "ready to start" → state flips to `true` after `markFirstHomeVisitSeen()` → re-render occurs but `seenOnMount.current` stays `false` → greeting remains "ready to start" for the full visit. Subsequent launches: MMKV already set → AuthProvider initialises `firstHomeVisitSeen = true` → `seenOnMount.current = true` at mount → greeting is "welcome back" immediately.

---

### `_layout.tsx` Stack.Screen addition (T8.2)

In `apps/mobile/app/_layout.tsx`, inside the existing `<Stack screenOptions={{ headerShown: false }}>` block, add after the existing `privacy-notice` Screen:
```tsx
<Stack.Screen name="calm-me" options={{ headerShown: false }} />
```

---

### Vitest selector tests (T2.2)

```typescript
// packages/core/src/__tests__/selectors/fearLadder.test.ts
import { describe, it, expect } from 'vitest'
import { resolveLowestPendingItem } from '../../selectors/fearLadder'

const makeItem = (id: string, position: number, status = 'pending') => ({
  id, description: `Situation ${id}`, predictedSuds: 5, position, status,
})

describe('resolveLowestPendingItem', () => {
  it('returns null for empty array', () => {
    expect(resolveLowestPendingItem([])).toBeNull()
  })

  it('returns the single pending item', () => {
    const result = resolveLowestPendingItem([makeItem('a', 1)])
    expect(result?.id).toBe('a')
  })

  it('returns item with lowest position when multiple pending', () => {
    const result = resolveLowestPendingItem([makeItem('b', 2), makeItem('a', 1), makeItem('c', 3)])
    expect(result?.id).toBe('a')
  })

  it('ignores non-pending items', () => {
    const result = resolveLowestPendingItem([
      makeItem('x', 1, 'in_progress'),
      makeItem('y', 2, 'completed'),
    ])
    expect(result).toBeNull()
  })

  it('returns lowest pending item when mixed statuses', () => {
    const result = resolveLowestPendingItem([
      makeItem('a', 1, 'completed'),
      makeItem('b', 2, 'pending'),
      makeItem('c', 3, 'pending'),
    ])
    expect(result?.id).toBe('b')
  })

  it('returns summary shape (no status field)', () => {
    const result = resolveLowestPendingItem([makeItem('a', 1)])
    expect(result).toEqual({ id: 'a', description: 'Situation a', predictedSuds: 5, position: 1 })
    expect('status' in (result ?? {})).toBe(false)
  })
})
```

---

### `complete.test.tsx` required test cases (T10.1)

Mock: `react-i18next`, `expo-router` (`useRouter`, `Stack`, `useLocalSearchParams`), `@exposure-buddy/supabase` (`useAuth`).

```typescript
const mockUseAuth = jest.fn()
jest.mock('@exposure-buddy/supabase', () => ({ useAuth: () => mockUseAuth() }))

const mockReplace = jest.fn()
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}))
const mockUseLocalSearchParams = jest.fn()
```

Before each: `jest.clearAllMocks()`, set default `mockUseAuth` to `{ crisisFlaggedInOnboarding: false, markOnboardingComplete: mockMarkOnboardingComplete }`, set `mockUseLocalSearchParams` to return `{ count: '5' }`.

Required test cases:
1. `renders title (non-crisis path)` — `crisisFlaggedInOnboarding: false`; assert `getByText('onboarding.complete.title')` exists
2. `renders titleSoft (crisis path)` — `crisisFlaggedInOnboarding: true`; assert `getByText('onboarding.complete.titleSoft')` exists
3. `shows item count when count param is present and > 0 (non-crisis)` — count `'5'`; assert text containing `t('onboarding.complete.itemCount', { count: 5 })` is present
4. `omits item count in crisis path even when count present` — crisis + count `'5'`; assert itemCount text absent
5. `omits item count when count param is absent (resume case)` — `mockUseLocalSearchParams` returns `{}`; assert itemCount text absent — this also simulates the `welcome.tsx` resume path which calls `router.replace('/(onboarding)/complete')` without params
6. `omits item count when count param is "0"` — `mockUseLocalSearchParams` returns `{ count: '0' }`; assert itemCount text absent (zero items is not a reachable state via ladder.tsx which enforces MIN_ITEMS, but the guard must hold defensively)
7. `shows overwhelmed link in crisis path` — assert `getByText('onboarding.overwhelmed.cta')` exists
8. `does NOT show overwhelmed link in non-crisis path` — assert query for overwhelmed link returns null
9. `tapping CTA calls markOnboardingComplete then navigates` — press CTA; assert `mockMarkOnboardingComplete` called; assert `mockReplace` called with `'/(app)/index'`; check `mockMarkOnboardingComplete` called BEFORE `mockReplace` (check call order via `jest.fn().mock.invocationCallOrder`)
10. `does NOT call markOnboardingComplete on mount (only on CTA tap)` — render only; assert `mockMarkOnboardingComplete` not called

---

### `(app)/index.test.tsx` required test cases (T10.2)

Mock: `react-i18next`, `expo-router`, `@exposure-buddy/supabase`, `@exposure-buddy/ui` (`CourageLadderEntryCard`), `@exposure-buddy/core` (`resolveLowestPendingItem`), `react-native` (`AccessibilityInfo`, `findNodeHandle`).

```typescript
jest.mock('@exposure-buddy/ui', () => ({
  CourageLadderEntryCard: React.forwardRef(
    ({ onPress }: { onPress: () => void }, ref: React.Ref<unknown>) => (
      <TouchableOpacity ref={ref as React.Ref<typeof TouchableOpacity>} testID="courage-card" onPress={onPress} />
    )
  ),
}))

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native')
  return {
    ...actual,
    AccessibilityInfo: { setAccessibilityFocus: jest.fn() },
    findNodeHandle: jest.fn(() => 42),
  }
})
```

Before each: `jest.clearAllMocks()`, `jest.useFakeTimers()`.
After each: `jest.useRealTimers()`.

Required test cases:
1. `renders readyToStart greeting when firstHomeVisitSeen is false on mount` — mock `firstHomeVisitSeen: false`; assert `getByText('home.readyToStart')` exists. Note: the greeting uses `seenOnMount.current` (a ref capturing the value at mount time), not live `firstHomeVisitSeen` state — so mock calls to `markFirstHomeVisitSeen` (which are no-ops in the mock) do not affect this assertion.
2. `renders welcomeBack greeting when firstHomeVisitSeen is true on mount` — mock `firstHomeVisitSeen: true`; assert `getByText('home.welcomeBack')` exists.
3. `calls markFirstHomeVisitSeen on mount when not seen` — `firstHomeVisitSeen: false`; render; assert `mockMarkFirstHomeVisitSeen` called once
4. `does NOT call markFirstHomeVisitSeen when already seen` — `firstHomeVisitSeen: true`; render; assert `mockMarkFirstHomeVisitSeen` not called
5. `renders CourageLadderEntryCard` — assert `getByTestId('courage-card')` exists
6. `renders CalmMe button` — assert `getByRole('button', { name: 'home.calmMe.cta' })` exists
7. `CalmMe button navigates to /calm-me` — press button; assert `mockPush` called with `'/calm-me'`
8. `sets accessibility focus on card after 100ms` — render; `jest.advanceTimersByTime(100)`; assert `AccessibilityInfo.setAccessibilityFocus` called with `42` (mocked findNodeHandle result)

---

### Baseline test count

Story 4.3 shipped 72 Jest tests (13 suites). Story 4.4 adds:
- `complete.test.tsx`: 10 tests (9 original + 1 count=0 guard)
- `(app)/index.test.tsx`: 8 tests
- `fearLadder.test.ts` (Vitest in packages/core): 6 tests
- `ladder.test.tsx`: 1 test updated (not a new count)

New Jest baseline: ~90 Jest tests + 6 new Vitest tests.

---

### Files to create or modify

| File | Action | Notes |
|---|---|---|
| `packages/core/src/constants/kvKeys.ts` | UPDATE | Add `FIRST_HOME_VISIT_SEEN` |
| `packages/core/src/selectors/fearLadder.ts` | CREATE | Selector + types |
| `packages/core/src/__tests__/selectors/fearLadder.test.ts` | CREATE | Vitest tests |
| `packages/core/src/index.ts` | UPDATE | Export selector + types |
| `packages/ui/src/components/CourageLadderEntryCard.tsx` | CREATE | UI component |
| `packages/ui/src/index.ts` | UPDATE | Export card + props type |
| `packages/supabase/src/auth/AuthProvider.tsx` | UPDATE | Add crisis/firstVisit state + markFirstHomeVisitSeen |
| `packages/supabase/src/auth/useAuth.ts` | UPDATE | Export new fields |
| `apps/mobile/app/(onboarding)/complete.tsx` | REPLACE | Full implementation |
| `apps/mobile/app/(onboarding)/complete.test.tsx` | CREATE | Tests |
| `apps/mobile/app/(onboarding)/ladder.tsx` | UPDATE | Pass count param in handleNext |
| `apps/mobile/app/(onboarding)/ladder.test.tsx` | UPDATE | Assert params in router.replace |
| `apps/mobile/app/(app)/index.tsx` | REPLACE | Full home screen |
| `apps/mobile/app/(app)/index.test.tsx` | CREATE | Tests |
| `apps/mobile/app/calm-me.tsx` | CREATE | Stub screen |
| `apps/mobile/app/_layout.tsx` | UPDATE | Add Stack.Screen for calm-me |
| `apps/mobile/src/i18n/locales/en.json` | UPDATE | Add home.* and complete.cta/itemCount keys |
| `apps/mobile/src/i18n/locales/hi.json` | UPDATE | Add same keys (EN placeholders) |

---

### Patterns from Story 4.3 to follow

- `Stack.Screen options={{ headerShown: false }}` at top of JSX return — `complete.tsx` is reached via `router.replace` so no back button
- All strings via `t()` — `i18next/no-literal-string` rule; the stub comments use `{/* eslint-disable-next-line */}` pattern for literal strings
- `jest.clearAllMocks()` in `beforeEach`
- Mock `useAuth` with ALL fields the component destructures — if `markOnboardingComplete` is called but not in mock, test will throw
- `findNodeHandle` from `react-native` (not `react-native-reanimated`) — used for accessibility focus

### AuthProvider lint note

The new reads in the auth listener use the function-scoped `mmkv` variable from the closure (which is actually `store` in the existing code). Check the existing pattern carefully:
```typescript
if (store && session.user.id !== lastOnboardingReadUserIdRef.current) {
  // Add new reads here, inside this guard
}
```
The MMKV store variable in this block is named `store` (const at line ~160 of AuthProvider). Use `store.getBoolean(...)` not `mmkv.getBoolean(...)`.

---

## Review Findings

*Spec review conducted 2026-06-03 — Blind Hunter + Edge Case Hunter layers.*

### Patches (must fix before implementation)

- [x] [Review][Patch] P1: `crisisFlaggedInOnboarding` never updates mid-session — T4.1 adds read-back state but does NOT update existing `setCrisisFlaggedInOnboarding()` to also call `setCrisisFlaggedInOnboardingLocal(true)`. Auth-listener guard fires on sign-in only; crisis flag written mid-onboarding won't propagate to context. AC 2 (crisis path) silently never triggers on first visit. **Fixed: T4.1 updated.**
- [x] [Review][Patch] P2: `useEffect` exhaustive-deps lint violation not addressed — both home-screen effects intentionally omit deps; no `eslint-disable-next-line react-hooks/exhaustive-deps` prescribed. CI gate T11.2 will fail. **Fixed: T9.3/T9.4 updated; eslint-disable comments added to code snippet.**
- [x] [Review][Patch] P3: Home screen greeting flicker — `markFirstHomeVisitSeen()` fires on mount and immediately re-renders greeting from "ready to start" → "welcome back" within the same visit. **Fixed: T9.5 updated to use `useRef(firstHomeVisitSeen)` at mount; greeting reads `seenOnMount.current` instead of live state; test cases 1 and 2 updated with clarifying notes.**
- [x] [Review][Patch] P4: `showCount` guard missing `itemCount > 0` — `count=0` renders "You've added 0 situations"; `count=-1` also passes `!isNaN`. **Fixed: `showCount` definition updated to add `&& itemCount > 0`; test case 6 (count=0) added.**
- [x] [Review][Patch] P5: `CourageLadderEntryCard` placeholder strings are hardcoded English with no i18n path — "Your ladder is being set up…", "No pending items", "Anxiety: {suds}/10" are literals in `packages/ui`. **Fixed: T3.1 updated with i18n stub note and eslint-disable guidance; Epic 6 prop-based i18n deferred.**
- [x] [Review][Patch] P6: `useFocusOnMount` hook conflict undocumented — existing hook fires on `useFocusEffect` (every focus, not mount-only) for reduced-motion users only; spec prescribes inline `setTimeout` (unconditional, mount-only). **Fixed: T9.4 updated with explicit "Do NOT use `useFocusOnMount`" note and rationale.**
- [x] [Review][Patch] P7: Resume-to-`complete.tsx` path has no test coverage — `welcome.tsx` calls `router.replace('/(onboarding)/complete')` without params on resume; spec says "handled gracefully" but no test case explicitly covers this. **Fixed: test case 5 expanded to note it simulates the welcome.tsx resume path.**

### Defers

- [x] [Review][Defer] D1: `markOnboardingComplete()` ordering guarantee vs Expo Router concurrent render — architectural assumption across whole app, not specific to this story. deferred, pre-existing
- [x] [Review][Defer] D2: Degraded-mode `markOnboardingComplete()` no-op → saved by `isStorageDegraded` escape hatch in `(app)/_layout.tsx` — pre-existing pattern. deferred, pre-existing
- [x] [Review][Defer] D3: `FearLadderItem.status` permitted values unspecified — intentional stub; Epic 6 defines real schema. deferred, pre-existing
- [x] [Review][Defer] D4: `FIRST_HOME_VISIT_SEEN` MMKV key not cleared on account deletion — same lifecycle pattern as all onboarding MMKV keys; storage audit story is the right venue. deferred, pre-existing

### Code Review — 2026-06-03 (implementation)

No patches or decision-needed items.

#### Deferred

- [x] [Review][Defer] CR-D1: `resolveLowestPendingItem` sort has no tiebreaker for equal `position` values — sort order is engine-dependent if two items share the same position integer; moot while the function is called with `[]`; Epic 6 defines real schema [`packages/core/src/selectors/fearLadder.ts`] — deferred, pre-existing
- [x] [Review][Defer] CR-D2: Auth listener MMKV reads deferred to `TOKEN_REFRESHED` if `SIGNED_IN` fires before MMKV is ready — `isLoading` stays `true` during this window (blocking premature renders); recovery path works on next event; pre-existing auth pattern [`packages/supabase/src/auth/AuthProvider.tsx`] — deferred, pre-existing
- [x] [Review][Defer] CR-D3: `calm-me` `Stack.Screen` registration orphaned if `calm-me.tsx` moves to a sub-segment — structural fragility; no current bug; note for when Epic 7 fills the stub [`apps/mobile/app/_layout.tsx`] — deferred, structural
- [x] [Review][Defer] CR-D4: `CourageLadderEntryCard` SUDS label lacks range clamping — `predictedSuds ≤ 0` or `> 10` renders an invalid label; Epic 6 data validation story [`packages/ui/src/components/CourageLadderEntryCard.tsx`] — deferred, Epic 6

---

## Change Log

- 2026-06-03: Implemented Story 4.4 — onboarding completion screen (crisis + non-crisis paths), home screen with first/returning visit greeting, CourageLadderEntryCard component (forwardRef, accessibility focus), CalmMe stub screen, FIRST_HOME_VISIT_SEEN KV key, AuthProvider crisis/firstVisit state + markFirstHomeVisitSeen, fearLadder selector with Vitest tests, i18n home.* and complete.cta/itemCount keys. 18 files modified/created; 24 new tests added.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- All 11 tasks and 30 subtasks completed in a single session.
- `packages/ui/.eslintrc.js` updated to allow `react-native` imports in `src/components/**` (same exemption as `src/primitives/**`). The `i18next` plugin is not configured in packages/ui so literal strings in `CourageLadderEntryCard.tsx` need no disable comments.
- `packages/core/src/selectors/fearLadder.ts`: Used `const first = pending[0]; if (!first) return null` guard to satisfy `noUncheckedIndexedAccess` TS strict mode.
- `index.test.tsx` mock for `CourageLadderEntryCard` uses `require('react')` inside the factory (Jest restriction: module-scope vars not allowed in mock factories). AccessibilityInfo/findNodeHandle mocked via `jest.spyOn` per project pattern (matching `useFocusOnMount.test.tsx`) rather than `jest.mock('react-native')` which triggers TurboModuleRegistry errors with `jest.requireActual`.
- All 8 ACs verified by tests: 10 complete.test.tsx tests + 8 index.test.tsx tests + 6 fearLadder.test.ts Vitest tests.
- Final test counts: 90 Jest (15 suites) + 17 Vitest (3 suites). Zero regressions.

### File List

- `packages/core/src/constants/kvKeys.ts` — updated (FIRST_HOME_VISIT_SEEN key added)
- `packages/core/src/selectors/fearLadder.ts` — created
- `packages/core/src/__tests__/selectors/fearLadder.test.ts` — created
- `packages/core/src/index.ts` — updated (FearLadderItemSummary, FearLadderItem, resolveLowestPendingItem exported)
- `packages/ui/src/components/CourageLadderEntryCard.tsx` — created
- `packages/ui/src/index.ts` — updated (CourageLadderEntryCard, CourageLadderEntryCardProps exported)
- `packages/ui/.eslintrc.js` — updated (src/components/** added to react-native exemption)
- `packages/supabase/src/auth/AuthProvider.tsx` — updated (crisisFlaggedInOnboarding state + read-back, firstHomeVisitSeen state, markFirstHomeVisitSeen function, all in interface + provider value)
- `packages/supabase/src/auth/useAuth.ts` — updated (crisisFlaggedInOnboarding, firstHomeVisitSeen, markFirstHomeVisitSeen in UseAuthResult + return)
- `apps/mobile/app/(onboarding)/complete.tsx` — replaced (full implementation)
- `apps/mobile/app/(onboarding)/complete.test.tsx` — created (10 tests)
- `apps/mobile/app/(onboarding)/ladder.tsx` — updated (handleNext passes count param)
- `apps/mobile/app/(onboarding)/ladder.test.tsx` — updated (asserts params object in router.replace)
- `apps/mobile/app/(app)/index.tsx` — replaced (full home screen implementation)
- `apps/mobile/app/(app)/index.test.tsx` — created (8 tests)
- `apps/mobile/app/calm-me.tsx` — created (Epic 7 stub)
- `apps/mobile/app/_layout.tsx` — updated (calm-me Stack.Screen added)
- `apps/mobile/src/i18n/locales/en.json` — updated (home.*, onboarding.complete.cta, onboarding.complete.itemCount)
- `apps/mobile/src/i18n/locales/hi.json` — updated (same keys, EN placeholder text)
