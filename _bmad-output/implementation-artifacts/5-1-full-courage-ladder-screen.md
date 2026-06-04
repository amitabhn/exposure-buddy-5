# Story 5.1: Full Courage Ladder Screen

Status: done

## Story

As a user,
I want to see my complete fear hierarchy and manage its order,
so that I can choose my next exposure with full context (FR-LADDER-01, FR-LADDER-02).

*Depends on: Story 4.4 merged to main.* ✅

## Acceptance Criteria

1. **Full ladder screen renders all items**
   Given the full ladder screen is navigated to (via `CourageLadderEntryCard.onPress()`)
   When the screen renders
   Then all `fear_ladder_items` for the authenticated user are shown, sorted by `position` ascending; each item displays description, predicted SUDs, and a `status` visual indicator (`pending` / `in_progress` / `completed`)

2. **Drag-to-reorder replaces move-up/down**
   Given the user long-presses an item to drag-reorder
   When the drag completes
   Then the new positions are persisted via a single atomic `reorder_positions` enqueue:
   `getAdapter().enqueue('fear_ladder_items', 'reorder_positions', { itemAId, itemANewPosition, itemBId, itemBNewPosition, updatedAt: Date.now() })`;
   positions update optimistically in local state immediately; this replaces the move-up/down buttons from Story 4.3

3. **Add item**
   Given the user taps "Add situation"
   When the form submits
   Then `detectCrisisKeywords(description)` is called — crisis banner shown on detection per Story 4.3 pattern; a new `fear_ladder_items` row is enqueued with the next sequential `position` via `getAdapter().enqueue('fear_ladder_items', 'INSERT', { id, user_id, description, predicted_suds, actual_suds: null, position, status: 'pending', created_at, updated_at })`

4. **Edit existing item**
   Given the user taps an existing item to edit
   When the form submits
   Then only `description` and `predicted_suds` are editable post-onboarding; `position` is managed via drag-reorder; `status` is managed by the session flow; update enqueued via `getAdapter().enqueue('fear_ladder_items', 'UPDATE', { id, description, predicted_suds, updated_at })`

5. **Accessibility focus on screen entry**
   Given the screen is entered via navigation
   When the transition completes
   Then `AccessibilityInfo.setAccessibilityFocus()` lands on the first ladder item or the "Add situation" button if the list is empty (UX-DR16)

---

## Tasks / Subtasks

### T1 — Install drag library and wire Gesture Handler (AC: 2)

- [x] T1.1: Install dependencies via `npx expo install react-native-reanimated react-native-gesture-handler react-native-draggable-flatlist` — Expo will pin compatible versions for SDK 54; do NOT manually specify versions
- [x] T1.2: Add Reanimated Babel plugin to `apps/mobile/babel.config.js`. The current file has no `plugins` key — create it. Full resulting file:
  ```js
  module.exports = function (api) {
    api.cache(true)
    return {
      presets: ['babel-preset-expo'],
      plugins: ['react-native-reanimated/plugin'],
    }
  }
  ```
  **`react-native-reanimated/plugin` must be the LAST entry in `plugins`.** If other plugins are added in future, keep it last.
- [x] T1.3: Add Gesture Handler Expo plugin to `apps/mobile/app.config.ts` `plugins` array:
  ```ts
  'react-native-gesture-handler',
  ```
  Add BEFORE `'expo-router'` — plugin ordering matters for new-architecture compatibility.
- [x] T1.4: Wrap the root `_layout.tsx` return with `GestureHandlerRootView` — import from `'react-native-gesture-handler'`; apply `style={{ flex: 1 }}`. This must be the OUTERMOST wrapper inside the function return, wrapping `AuthProvider` and everything else:
  ```tsx
  // apps/mobile/app/_layout.tsx — T1.4 change
  import { GestureHandlerRootView } from 'react-native-gesture-handler'
  // ...
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider mmkv={mmkv}>
        {/* ...existing content unchanged... */}
      </AuthProvider>
    </GestureHandlerRootView>
  )
  ```
  **Do NOT add `GestureHandlerRootView` to individual screens** — one root-level wrapper is correct.

### T2 — Extend OutboxOperationSchema for `reorder_positions` (AC: 2)

- [x] T2.1: Edit `packages/sync/src/utils/outbox-schema.ts` — extend `OutboxOperationSchema`:
  ```ts
  export const OutboxOperationSchema = z.enum(['INSERT', 'UPDATE', 'DELETE', 'reorder_positions'])
  ```
  This is the ONLY change to this file. No other types or schemas need updating.

### T3 — Create `useFearLadderItems` hook (AC: 1)

- [x] T3.1: Create `apps/mobile/src/hooks/useFearLadderItems.ts`:
  ```typescript
  // apps/mobile/src/hooks/useFearLadderItems.ts
  import type { FearLadderItem } from '@exposure-buddy/core'

  // PowerSync no-op stub — Epic 6 replaces with usePowerSyncQuery against fear_ladder_items table.
  // Returns items sorted by position ascending.
  export function useFearLadderItems(_userId: string | null): FearLadderItem[] {
    return []
  }
  ```
  **Do NOT:** add `usePowerSyncQuery`, `useMemo`, or state — this is a pure stub. Epic 6 wires the real query.
  **Do NOT:** query Supabase directly — offline-first via PowerSync is the architectural requirement (ADR-002/ADR-003). Epic 6 adds the PowerSync connector.

### T4 — Create ladder screen `apps/mobile/app/ladder.tsx` (AC: 1–5)

- [x] T4.1: Create `apps/mobile/app/ladder.tsx` — see Dev Notes for full implementation. This is a root-level Stack screen following the `calm-me.tsx` pattern (NOT inside `(app)/`).
- [x] T4.2: Add `<Stack.Screen name="ladder" options={{ headerShown: true, headerTitle: '', headerShadowVisible: false, headerStyle: { backgroundColor: '#ffffff' }, headerLeft: () => <BackButton />, headerBackVisible: false }} />` to `apps/mobile/app/_layout.tsx` — same position as `privacy-notice` and `calm-me` entries.

### T5 — Wire navigation from home screen (AC: 1)

- [x] T5.1: Update `apps/mobile/app/(app)/index.tsx` — replace the no-op stub in `CourageLadderEntryCard.onPress`:
  ```tsx
  // Before (Story 4.4 stub):
  onPress={() => {/* Epic 5: router.push to full ladder screen */}}
  // After:
  onPress={() => router.push('/ladder')}
  ```
  No other changes to `(app)/index.tsx`.

### T6 — i18n keys (AC: 1–5)

- [x] T6.1: Add to `apps/mobile/src/i18n/locales/en.json` under a new top-level `"ladder"` key:
  ```json
  "ladder": {
    "title": "Your Courage Ladder",
    "addItem": "Add situation",
    "emptyState": "Your Courage Ladder is empty. Add your first situation to get started.",
    "editItem": "Edit situation",
    "saveItem": "Save",
    "cancel": "Cancel",
    "descriptionLabel": "Situation",
    "descriptionPlaceholder": "Describe the situation...",
    "sudsLabel": "Anxiety level (0–10)",
    "statusPending": "Pending",
    "statusInProgress": "In progress",
    "statusCompleted": "Completed",
    "reorderHint": "Long-press to reorder",
    "crisis": {
      "banner": "This situation might feel very distressing. Remember, you can take it slow.",
      "cta": "I need support"
    }
  }
  ```
- [x] T6.2: Add the same keys to `apps/mobile/src/i18n/locales/hi.json` using the English text as placeholders (identical pattern to all existing onboarding keys — English text as placeholder, awaiting translation).

### T7 — Tests (AC: 1–5)

- [x] T7.1: Update `apps/mobile/app/(app)/index.test.tsx` — add one test: `'CourageLadderEntryCard onPress navigates to /ladder'` — press the card mock; assert `mockPush` called with `'/ladder'`. Update existing test case 5 (`renders CourageLadderEntryCard`) mock so `onPress` is verified.
- [x] T7.2: Create `apps/mobile/app/ladder.test.tsx` — see Dev Notes for required test cases.

### T8 — CI gates

- [x] T8.1: `pnpm turbo typecheck` passes with zero errors
- [x] T8.2: `pnpm turbo lint` passes with zero errors
- [x] T8.3: `pnpm turbo test` passes — all new tests green; no regressions in existing 90 Jest + 17 Vitest tests

---

## Dev Notes

### Navigation architecture decision

The full ladder screen is placed at **root level** (`apps/mobile/app/ladder.tsx`), NOT inside `apps/mobile/app/(app)/`. This follows the `calm-me.tsx` and `privacy-notice.tsx` pattern for screens that push on top of the tab navigator.

**Why not inside `(app)/`?** The `(app)/_layout.tsx` uses `<Tabs>` — files inside a Tabs layout that aren't listed as `Tabs.Screen` entries render within the tab container, not as Stack screens on top of it. Putting the ladder screen at root level ensures it pushes naturally on top of the Tabs via the root Stack.

**Navigation call:** `router.push('/ladder')` from `(app)/index.tsx`.

**Back navigation:** The root Stack's `BackButton` handles it (via `Stack.Screen headerLeft: () => <BackButton />`). No custom back-button logic needed in the screen.

**Auth protection:** The ladder screen does not have an explicit auth gate (same as `calm-me.tsx`). It is only reachable from `(app)/index.tsx` which is behind the `(app)/_layout.tsx` auth gate. The screen reads `userId` via `useAuth()` and passes it to `useFearLadderItems` — returns empty list if null (graceful degradation).

---

### Out-of-scope for 5.1

**Item deletion** is not part of this story. The UI has no delete control. Addressed in a future story.

---

### Why items appear empty (PowerSync stub)

`useFearLadderItems` returns `[]` because `PowerSyncSyncAdapter` is a true no-op stub (wired in Epic 6). Items added during onboarding (Story 4.3) were enqueued to this no-op adapter and were not persisted anywhere.

**Consequence for Story 5.1:** The ladder screen will render the empty state in a real device run. This is expected and matches Story 4.4's pattern (`CourageLadderEntryCard` rendered with `ladderItemCount: 0` and `lowestPendingItem: null`). Tests mock `useFearLadderItems` and verify correct rendering.

**Do NOT** attempt to query Supabase directly or add `PowerSyncProvider` to the root layout — that scope belongs to Epic 6.

**Empty state:** The screen must render `t('ladder.emptyState')` when the items list is empty, alongside the "Add situation" button. This is not an error state.

---

### Drag library: `react-native-draggable-flatlist`

**Package:** `react-native-draggable-flatlist` — depends on `react-native-reanimated` and `react-native-gesture-handler`.

**Critical setup:**
1. `GestureHandlerRootView` must wrap the ENTIRE app in `_layout.tsx` (T1.4). Missing this causes a crash on Android with Gesture Handler v2.
2. Reanimated babel plugin MUST be the last plugin in `babel.config.js` (T1.2). Placing it before other plugins causes module resolution failures.
3. After installing, a **full native rebuild** is required (`npx expo run:ios` / `npx expo run:android`). The dev client must be rebuilt — hot reload alone is insufficient for native module changes.

**Usage pattern:**
```tsx
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist'

<DraggableFlatList
  data={items}
  keyExtractor={(item) => item.id}
  onDragEnd={({ data: reorderedData, from, to }) => {
    if (from === to) return  // no-op if position unchanged
    // items are already reordered in `reorderedData`
    const updatedItems = reorderedData.map((item, index) => ({
      ...item,
      position: index + 1,
    }))
    setItems(updatedItems)  // optimistic local update
    // enqueue the two affected items (the dragged item and the item it displaced)
    const movedItem = updatedItems[to]
    const displacedItem = updatedItems[from]
    if (!movedItem || !displacedItem) return
    getAdapter().enqueue('fear_ladder_items', 'reorder_positions', {
      itemAId: movedItem.id,
      itemANewPosition: movedItem.position,
      itemBId: displacedItem.id,
      itemBNewPosition: displacedItem.position,
      updatedAt: Date.now(),
    }).catch(err => console.error('[LadderScreen] reorder enqueue failed:', err))
  }}
  renderItem={({ item, drag, isActive }) => (
    <ScaleDecorator>
      <LadderItemRow item={item} drag={drag} isActive={isActive} onEdit={() => openEditForm(item)} />
    </ScaleDecorator>
  )}
/>
```

**`ScaleDecorator`** — wraps each item and applies the drag scaling animation. Required for correct haptic + visual feedback during drag.

**Position model:** positions are 1-indexed (`position: 1, 2, 3...`). When the user drags item from index `from` to index `to`, recalculate ALL positions as `index + 1` to ensure a clean sequential sequence.

**Atomic enqueue — intentionally partial:** The enqueue captures only `itemAId` (dragged item, now at `to`) and `itemBId` (`updatedItems[from]`, the item that shifted into the original slot). For non-adjacent drags, intermediate items also shift position but are NOT captured in the enqueue payload. This is intentional for Story 5.1 — the PowerSync upload handler does not exist yet (Epic 6). **Epic 6 obligation:** the `reorder_positions` upload handler MUST perform a full server-side read-and-rewrite (i.e., fetch all item positions, apply the change from the payload, write back all rows), not a two-row UPDATE, to avoid stale positions for intermediate items.

---

### `ladder.tsx` implementation guide

```tsx
// apps/mobile/app/ladder.tsx
import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo, findNodeHandle, TextInput, Modal } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist'
import { useAuth } from '@exposure-buddy/supabase'
import { detectCrisisKeywords } from '@exposure-buddy/core'
import type { FearLadderItem } from '@exposure-buddy/core'
import { getAdapter } from '../src/sync/adapter'
import { useFearLadderItems } from '../src/hooks/useFearLadderItems'
import { BackButton } from '../src/components/navigation/BackButton'

// Pure-JS UUID v4 — same pattern as onboarding ladder.tsx
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export default function LadderScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { userId } = useAuth()
  const remoteItems = useFearLadderItems(userId)
  const [items, setItems] = useState<FearLadderItem[]>([...remoteItems].sort((a, b) => a.position - b.position))
  const [crisisDetected, setCrisisDetected] = useState(false)

  // Form state
  const [formVisible, setFormVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<FearLadderItem | null>(null)
  const [description, setDescription] = useState('')
  const [predictedSuds, setPredictedSuds] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Accessibility: focus first item or add button on mount
  const firstInteractiveRef = useRef<TouchableOpacity | null>(null)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (firstInteractiveRef.current) {
        const tag = findNodeHandle(firstInteractiveRef.current)
        if (tag) AccessibilityInfo.setAccessibilityFocus(tag)
      }
    }, 100)
    return () => clearTimeout(timeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync remote items into local state when stub is replaced in Epic 6; sort by position ascending (AC 1)
  useEffect(() => {
    setItems([...remoteItems].sort((a, b) => a.position - b.position))
  }, [remoteItems])

  function openAddForm() {
    setEditingItem(null)
    setDescription('')
    setPredictedSuds(null)
    setFormVisible(true)
  }

  function openEditForm(item: FearLadderItem) {
    setEditingItem(item)
    setDescription(item.description)
    setPredictedSuds(item.predictedSuds)
    setFormVisible(true)
  }

  function closeForm() {
    setFormVisible(false)
    setEditingItem(null)
    setDescription('')
    setPredictedSuds(null)
    setIsSubmitting(false)
  }

  async function handleSubmit() {
    if (!userId || isSubmitting || !description.trim() || predictedSuds === null) return
    setIsSubmitting(true)
    const now = new Date().toISOString()

    if (editingItem) {
      // Edit path — only description and predicted_suds
      const updated = { ...editingItem, description: description.trim(), predictedSuds: predictedSuds }
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i))  // optimistic
      try {
        await getAdapter().enqueue('fear_ladder_items', 'UPDATE', {
          id: editingItem.id,
          description: updated.description,
          predicted_suds: updated.predictedSuds,
          updated_at: now,
        })
      } catch (err) {
        console.error('[LadderScreen] edit enqueue failed:', err)
      }
    } else {
      // Add path — crisis check first
      const hasCrisis = detectCrisisKeywords(description.trim())
      if (hasCrisis) setCrisisDetected(true)
      const newItem: FearLadderItem = {
        id: generateUUID(),
        description: description.trim(),
        predictedSuds: predictedSuds,
        position: items.length + 1,
        status: 'pending',
      }
      setItems(prev => [...prev, newItem])  // optimistic
      try {
        await getAdapter().enqueue('fear_ladder_items', 'INSERT', {
          id: newItem.id,
          user_id: userId,
          description: newItem.description,
          predicted_suds: newItem.predictedSuds,
          actual_suds: null,
          position: newItem.position,
          status: 'pending',
          created_at: now,
          updated_at: now,
        })
      } catch (err) {
        console.error('[LadderScreen] add enqueue failed:', err)
      }
    }
    closeForm()
  }

  function handleDragEnd({ data: reorderedData, from, to }: { data: FearLadderItem[]; from: number; to: number }) {
    if (from === to) return
    const updatedItems = reorderedData.map((item, index) => ({ ...item, position: index + 1 }))
    setItems(updatedItems)  // optimistic
    const movedItem = updatedItems[to]
    const displacedItem = updatedItems[from]
    if (!movedItem || !displacedItem) return
    getAdapter().enqueue('fear_ladder_items', 'reorder_positions', {
      itemAId: movedItem.id,
      itemANewPosition: movedItem.position,
      itemBId: displacedItem.id,
      itemBNewPosition: displacedItem.position,
      updatedAt: Date.now(),
    }).catch(err => console.error('[LadderScreen] reorder enqueue failed:', err))
  }

  const statusLabel = (status: string) => {
    if (status === 'in_progress') return t('ladder.statusInProgress')
    if (status === 'completed') return t('ladder.statusCompleted')
    return t('ladder.statusPending')
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t('ladder.title'),
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#ffffff' },
          headerLeft: () => <BackButton />,
          headerBackVisible: false,
        }}
      />
      <View style={styles.container}>
        {/* Crisis banner — persists for session once shown; same behaviour as Story 4.3 */}
        {crisisDetected && (
          <View style={styles.crisisBanner}>
            <Text style={styles.crisisText}>{t('ladder.crisis.banner')}</Text>
            <TouchableOpacity onPress={() => router.push('/calm-me')} accessibilityRole="button" accessibilityLabel={t('ladder.crisis.cta')}>
              <Text style={styles.crisisLink}>{t('ladder.crisis.cta')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <Text style={styles.emptyState}>{t('ladder.emptyState')}</Text>
        )}

        {/* Drag-to-reorder list */}
        <DraggableFlatList
          data={items}
          keyExtractor={(item) => item.id}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, drag, isActive, getIndex }) => {
            const index = getIndex() ?? 0
            return (
              <ScaleDecorator>
                <TouchableOpacity
                  ref={index === 0 ? firstInteractiveRef : null}
                  style={[styles.itemRow, isActive && styles.itemRowDragging]}
                  onLongPress={drag}
                  onPress={() => openEditForm(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.description}, ${t('ladder.sudsLabel')}: ${item.predictedSuds}, ${statusLabel(item.status)}`}
                  accessibilityHint={t('ladder.reorderHint')}
                >
                  <View style={styles.itemContent}>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                    <Text style={styles.itemMeta}>
                      {/* eslint-disable-next-line i18next/no-literal-string */}
                      {item.predictedSuds}/10 · {statusLabel(item.status)}
                    </Text>
                  </View>
                  <Text style={styles.dragHandle}>⠿</Text>
                </TouchableOpacity>
              </ScaleDecorator>
            )
          }}
        />

        {/* Add item CTA — ref set here when list is empty so focus goes to it */}
        <TouchableOpacity
          ref={items.length === 0 ? firstInteractiveRef : null}
          style={styles.addButton}
          onPress={openAddForm}
          accessibilityRole="button"
          accessibilityLabel={t('ladder.addItem')}
        >
          <Text style={styles.addButtonText}>{t('ladder.addItem')}</Text>
        </TouchableOpacity>

        {/* Add/Edit modal form */}
        <Modal visible={formVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeForm}>
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              {editingItem ? t('ladder.editItem') : t('ladder.addItem')}
            </Text>
            <Text style={styles.formLabel}>{t('ladder.descriptionLabel')}</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder={t('ladder.descriptionPlaceholder')}
              multiline
              accessibilityLabel={t('ladder.descriptionLabel')}
            />
            <Text style={styles.formLabel}>{t('ladder.sudsLabel')}</Text>
            <TextInput
              style={styles.textInput}
              value={predictedSuds !== null ? String(predictedSuds) : ''}
              onChangeText={(v) => {
                const n = parseInt(v, 10)
                setPredictedSuds(isNaN(n) || n < 0 || n > 10 ? null : n)
              }}
              keyboardType="number-pad"
              maxLength={2}
              accessibilityLabel={t('ladder.sudsLabel')}
            />
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeForm} accessibilityRole="button" accessibilityLabel={t('ladder.cancel')}>
                <Text style={styles.cancelText}>{t('ladder.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (!description.trim() || predictedSuds === null || isSubmitting) && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={!description.trim() || predictedSuds === null || isSubmitting}
                accessibilityRole="button"
                accessibilityLabel={t('ladder.saveItem')}
                accessibilityState={{ disabled: !description.trim() || predictedSuds === null || isSubmitting }}
              >
                <Text style={styles.saveText}>{t('ladder.saveItem')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  listContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  itemRowDragging: { backgroundColor: '#f3f4f6', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  itemContent: { flex: 1 },
  itemDescription: { fontSize: 15, color: '#111827', lineHeight: 22 },
  itemMeta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  dragHandle: { fontSize: 20, color: '#9ca3af', marginLeft: 8 },
  emptyState: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginHorizontal: 24, marginTop: 48, lineHeight: 22 },
  addButton: { position: 'absolute', bottom: 32, left: 24, right: 24, backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  crisisBanner: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginHorizontal: 24, marginTop: 12, borderWidth: 1, borderColor: '#fecaca' },
  crisisText: { fontSize: 14, color: '#991b1b', lineHeight: 20, marginBottom: 4 },
  crisisLink: { fontSize: 13, color: '#991b1b', textDecorationLine: 'underline' },
  formContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 48, backgroundColor: '#ffffff' },
  formTitle: { fontSize: 22, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 24 },
  formLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827', marginBottom: 20, backgroundColor: '#f9fafb' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 15, color: '#374151' },
  saveButton: { flex: 1, backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#d1d5db' },
  saveText: { color: '#ffffff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
```

**Critical notes:**
- The `firstInteractiveRef` strategy: assign the `ref` to the first item row when `items.length > 0`, or to the "Add situation" button when `items.length === 0`. This ensures UX-DR16 is met in both states.
- The `useEffect` that syncs `remoteItems → items` (with `.sort()`) ensures that when Epic 6 replaces the stub with a real query, items will populate in position order without requiring a screen unmount/remount.
- The `position` meta uses `eslint-disable-next-line i18next/no-literal-string` for the `{n}/10` interpolation — same pattern as `CourageLadderEntryCard`.

---

### `_layout.tsx` update (T4.2)

In `apps/mobile/app/_layout.tsx`, inside the `<Stack screenOptions={{ headerShown: false }}>` block, add after the existing `calm-me` Screen:

```tsx
<Stack.Screen
  name="ladder"
  options={{
    headerShown: true,
    headerTitle: '',
    headerShadowVisible: false,
    headerStyle: { backgroundColor: '#ffffff' },
    headerLeft: () => <BackButton />,
    headerBackVisible: false,
  }}
/>
```

**Note:** `headerTitle: ''` in `_layout.tsx` is overridden by `<Stack.Screen options={{ headerTitle: t('ladder.title') }} />` inside `ladder.tsx`. This is the correct pattern — the layout provides visual defaults (no shadow, white background, BackButton), the screen provides the translated title.

**GestureHandlerRootView (T1.4) placement:** wrap the function return BEFORE the AuthProvider:
```tsx
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <AuthProvider mmkv={mmkv}>
      ...rest unchanged...
    </AuthProvider>
  </GestureHandlerRootView>
)
```

---

### `ladder.test.tsx` required test cases (T7.2)

Mocks needed:
```typescript
jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react')
  const { FlatList, TouchableOpacity } = require('react-native')
  return {
    __esModule: true,
    default: ({ data, renderItem, keyExtractor }: any) => (
      <FlatList data={data} renderItem={renderItem} keyExtractor={keyExtractor} />
    ),
    ScaleDecorator: ({ children }: any) => children,
  }
})

jest.mock('../src/hooks/useFearLadderItems')
jest.mock('../src/sync/adapter')
jest.mock('@exposure-buddy/supabase', () => ({ useAuth: jest.fn() }))
```

Before each: `jest.clearAllMocks()`.

Required test cases:
1. `renders empty state when no items` — `useFearLadderItems` returns `[]`; assert `getByText('ladder.emptyState')` exists
2. `renders items sorted by position` — mock returns `[{id:'b', position:2, ...}, {id:'a', position:1, ...}]`; assert items render in position order (a before b)
3. `renders status labels for each item` — mock item with `status: 'pending'`; assert `getByText('ladder.statusPending')` exists in rendered list
4. `Add situation button is present` — assert `getByRole('button', { name: 'ladder.addItem' })` exists
5. `tapping Add situation opens form` — press add button; assert form/modal visible (check for `getByText('ladder.addItem')` in form title OR check form input presence)
6. `form save disabled when description empty` — open form; assert save button disabled (via `getByRole('button', { name: 'ladder.saveItem' })`'s disabled state)
7. `form save disabled when SUDS null` — open form, type description only; save still disabled
8. `cancel button closes form` — open form; press cancel; assert form no longer visible
9. `detectCrisisKeywords called on add submit` — mock `detectCrisisKeywords` to return `true`; submit add form; assert crisis banner text visible AND CTA button (`getByRole('button', { name: 'ladder.crisis.cta' })`) present and navigates to `'/calm-me'` on press
10. `crisis banner not shown when no crisis keyword` — `detectCrisisKeywords` returns `false`; add item; assert no crisis banner
11. `getAdapter().enqueue called on add submit` — mock `getAdapter` to return `{ enqueue: mockEnqueue }`; submit add form with description='test' and suds=3; assert `mockEnqueue` called with `('fear_ladder_items', 'INSERT', expect.objectContaining({ description: 'test', predicted_suds: 3, status: 'pending' }))`
12. `getAdapter().enqueue called with UPDATE on edit submit` — open edit for an item; change description; save; assert `mockEnqueue` called with `('fear_ladder_items', 'UPDATE', expect.objectContaining({ id: item.id, description: updatedDesc }))`
13. `edit form shows existing description and suds` — open edit for item; assert TextInput values pre-populated
14. `accessibility focus set on first item after 100ms` — mock `AccessibilityInfo.setAccessibilityFocus` and `findNodeHandle`; render with items; `jest.advanceTimersByTime(100)`; assert `setAccessibilityFocus` called
15. `accessibility focus set on Add button when empty` — render with no items; `jest.advanceTimersByTime(100)`; assert `setAccessibilityFocus` called

---

### `(app)/index.test.tsx` update (T7.1)

Add one test to the existing test file:
```typescript
it('CourageLadderEntryCard onPress navigates to /ladder', () => {
  // Render with default mock (firstHomeVisitSeen: false)
  render(<HomeScreen />)
  const card = getByTestId('courage-card')
  fireEvent.press(card)
  expect(mockPush).toHaveBeenCalledWith('/ladder')
})
```

Update existing test 5 (`renders CourageLadderEntryCard`) — also verify the `onPress` prop is a function (not undefined):
```typescript
it('renders CourageLadderEntryCard', () => {
  const { getByTestId } = render(<HomeScreen />)
  expect(getByTestId('courage-card')).toBeTruthy()
})
```

---

### Files to create or modify

| File | Action | Notes |
|---|---|---|
| `apps/mobile/package.json` | UPDATE | Add `react-native-reanimated`, `react-native-gesture-handler`, `react-native-draggable-flatlist` |
| `apps/mobile/babel.config.js` | UPDATE | Add `'react-native-reanimated/plugin'` to plugins (must be last) |
| `apps/mobile/app.config.ts` | UPDATE | Add `'react-native-gesture-handler'` to plugins (before `'expo-router'`) |
| `apps/mobile/app/_layout.tsx` | UPDATE | Add `GestureHandlerRootView` wrapper + `ladder` Stack.Screen entry |
| `apps/mobile/app/ladder.tsx` | CREATE | Full ladder screen |
| `apps/mobile/app/ladder.test.tsx` | CREATE | 15 Jest tests |
| `apps/mobile/app/(app)/index.tsx` | UPDATE | Wire `CourageLadderEntryCard.onPress` → `router.push('/ladder')` |
| `apps/mobile/app/(app)/index.test.tsx` | UPDATE | Add 1 test for onPress navigation |
| `apps/mobile/src/hooks/useFearLadderItems.ts` | CREATE | Stub hook returning `[]` |
| `apps/mobile/src/i18n/locales/en.json` | UPDATE | Add `ladder.*` keys |
| `apps/mobile/src/i18n/locales/hi.json` | UPDATE | Add same keys (EN placeholders) |
| `packages/sync/src/utils/outbox-schema.ts` | UPDATE | Add `'reorder_positions'` to `OutboxOperationSchema` |

---

### Patterns from Story 4.3/4.4 to follow

- `getAdapter().enqueue('fear_ladder_items', 'INSERT', {...})` — write pattern established in Story 4.3 `ladder.tsx`; follow exact same field naming (snake_case in payload: `user_id`, `predicted_suds`, `actual_suds: null`, `status`, `created_at`, `updated_at`)
- `detectCrisisKeywords()` imported from `@exposure-buddy/core`; returns boolean
- Crisis banner: red-tinted `View` with `backgroundColor: '#fef2f2'`, `borderColor: '#fecaca'`, `color: '#991b1b'` — match Story 4.3 `ladder.tsx` exact styles
- `generateUUID()` — copy the exact same pure-JS UUID function from Story 4.3 `ladder.tsx` (NOT `crypto.randomUUID()` — avoids native module dependency)
- `// eslint-disable-next-line i18next/no-literal-string` for structural string literals (e.g., `'/10'` separator)
- `jest.clearAllMocks()` in `beforeEach`
- `jest.useFakeTimers()` before + `jest.useRealTimers()` after for accessibility focus tests

### AuthProvider lint note (Story 4.4 pattern)

No changes needed to `AuthProvider` or `useAuth` in Story 5.1. The ladder screen reads only `userId` from `useAuth()`.

### Test baseline

Story 4.4 shipped: 90 Jest (15 suites) + 17 Vitest (3 suites).

Story 5.1 adds:
- `ladder.test.tsx`: 15 new Jest tests (1 suite)
- `(app)/index.test.tsx`: 1 new Jest test (updates existing suite)
- `packages/sync`: no new Vitest tests (schema change is a type extension only)

New Jest baseline: ~106 Jest + 17 Vitest tests.

---

### Review Findings

- [x] [Review][Defer] No rollback on optimistic add/edit when enqueue fails [apps/mobile/app/ladder.tsx:84–127] — deferred, pre-existing; stub adapter never throws; rollback logic needed when Epic 6 wires real adapter
- [x] [Review][Defer] Inconsistent `reorder_positions` enqueue convention vs onboarding ladder screen [apps/mobile/app/ladder.tsx:138 vs apps/mobile/app/(onboarding)/ladder.tsx] — deferred, pre-existing; onboarding enqueues reorder via plain UPDATE payload; new screen uses `reorder_positions` as the operation directly; Epic 6 connector must reconcile both conventions
- [x] [Review][Defer] Accessibility focus timing race for non-empty list — 100 ms timeout may fire before DraggableFlatList attaches ref to first item [apps/mobile/app/ladder.tsx:38–52] — deferred, pre-existing; stub returns [] so Add button is always focused today; surfaces when Epic 6 replaces stub with live data
- [x] [Review][Defer] Position number duplication risk when Epic 6 wires real data [apps/mobile/app/ladder.tsx:103] — deferred, pre-existing; `items.length + 1` computed from optimistic local state; if sync resets state, next add can reuse a position already in the outbox
- [x] [Review][Defer] Non-integer SUDS value from database not validated in edit path [apps/mobile/app/ladder.tsx:246–249] — deferred, pre-existing; `item.predictedSuds` typed as `number`; a decimal value from a DB migration/conflict would be displayed and re-submitted without rounding; only possible via direct DB manipulation

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- T1.3 was the only outstanding task — `'react-native-gesture-handler'` added to `app.config.ts` plugins before `'expo-router'`.
- Two TypeScript fixes required: `useRef<TouchableOpacity>` → `useRef<ElementRef<typeof TouchableOpacity>>` in `ladder.tsx`; test mock type annotation `jest.fn<boolean, [string]>` for `mockDetectCrisisKeywords`.
- Lint: 10 `i18next/no-literal-string` violations suppressed in `ladder.tsx` and one in `_layout.tsx` for the new `ladder` Stack.Screen entry — all are non-translatable (enum constants, hex colors, JSX prop values).
- Test fix: `getByText('ladder.statusPending', { exact: false })` — full meta text is `5/10 · ladder.statusPending` so exact match failed.
- Final: 107 Jest tests (16 suites), 17 Vitest tests — 0 failures.

### File List

- `apps/mobile/package.json` — added react-native-reanimated, react-native-gesture-handler, react-native-draggable-flatlist
- `apps/mobile/babel.config.js` — added react-native-reanimated/plugin
- `apps/mobile/app.config.ts` — added react-native-gesture-handler plugin before expo-router
- `apps/mobile/app/_layout.tsx` — GestureHandlerRootView wrapper; ladder Stack.Screen entry (with eslint-disable)
- `apps/mobile/app/ladder.tsx` — created full Courage Ladder screen
- `apps/mobile/app/ladder.test.tsx` — created 16 Jest tests (15 specified + crisis CTA split into 2)
- `apps/mobile/app/(app)/index.tsx` — wired CourageLadderEntryCard.onPress → router.push('/ladder')
- `apps/mobile/app/(app)/index.test.tsx` — added ladder navigation test
- `apps/mobile/src/hooks/useFearLadderItems.ts` — created PowerSync stub hook
- `apps/mobile/src/i18n/locales/en.json` — added ladder.* i18n keys
- `apps/mobile/src/i18n/locales/hi.json` — added ladder.* keys (EN placeholders)
- `packages/sync/src/utils/outbox-schema.ts` — extended OutboxOperationSchema with reorder_positions
- `pnpm-lock.yaml` — updated by package installs
