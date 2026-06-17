import { useEffect, useRef, useState, type ElementRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo, findNodeHandle, TextInput, Modal, ActivityIndicator } from 'react-native'
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
  const { userId, sessionRecoveryData } = useAuth()
  const { items: remoteItems, isLoading: ladderLoading } = useFearLadderItems(userId)
  const [items, setItems] = useState<FearLadderItem[]>([...remoteItems].sort((a, b) => a.position - b.position))
  const [crisisDetected, setCrisisDetected] = useState(false)

  // Form state
  const [formVisible, setFormVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<FearLadderItem | null>(null)
  const [description, setDescription] = useState('')
  const [predictedSuds, setPredictedSuds] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Accessibility: focus first item or add button on mount
  const firstInteractiveRef = useRef<ElementRef<typeof TouchableOpacity> | null>(null)
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
        // eslint-disable-next-line i18next/no-literal-string
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
        // eslint-disable-next-line i18next/no-literal-string
        status: 'pending',
        peakSuds: null,
      }
      setItems(prev => [...prev, newItem])  // optimistic
      try {
        // eslint-disable-next-line i18next/no-literal-string
        await getAdapter().enqueue('fear_ladder_items', 'INSERT', {
          id: newItem.id,
          user_id: userId,
          description: newItem.description,
          predicted_suds: newItem.predictedSuds,
          peak_suds: null,
          position: newItem.position,
          // eslint-disable-next-line i18next/no-literal-string
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
    // eslint-disable-next-line i18next/no-literal-string
    getAdapter().enqueue('fear_ladder_items', 'reorder_positions', {
      itemAId: movedItem.id,
      itemANewPosition: movedItem.position,
      itemBId: displacedItem.id,
      itemBNewPosition: displacedItem.position,
      updatedAt: Date.now(),
    }).catch(err => console.error('[LadderScreen] reorder enqueue failed:', err))
  }

  const statusLabel = (status: string) => {
    // Legacy: 'in_progress' was removed from the DB CHECK constraint in migration 0021
    // (Story 6.2-A). Stale rows from pre-migration syncs may still carry this value.
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
          // eslint-disable-next-line i18next/no-literal-string
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

        {/* Loading state — show spinner while PowerSync hydrates local SQLite */}
        {ladderLoading && (
          <ActivityIndicator style={styles.loadingIndicator} accessibilityLabel={t('common.loading')} />
        )}

        {/* Empty state — only shown once loaded and zero items */}
        {!ladderLoading && items.length === 0 && (
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
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  <Text style={styles.dragHandle}>⠿</Text>
                </TouchableOpacity>
                {/* T7.1: "Start session" button — only for pending items */}
                {/* T7.2: Guard against starting while another session is in progress */}
                {item.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.startSessionButton}
                    onPress={() => {
                      // T7.2: If a session is already in progress, navigate to (app) home where
                      // the recovery modal renders, rather than starting a second session which
                      // would orphan the in-progress fear_ladder_items row.
                      if (sessionRecoveryData) {
                        // eslint-disable-next-line i18next/no-literal-string
                        router.replace('/')
                        return
                      }
                      const sessionId = generateUUID()
                      router.push(
                        // eslint-disable-next-line i18next/no-literal-string
                        `/session/technique?fearItemId=${item.id}&sessionId=${sessionId}&description=${encodeURIComponent(item.description)}&predictedSuds=${item.predictedSuds}`
                      )
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('ladder.startSession')}, ${item.description}`}
                  >
                    <Text style={styles.startSessionText}>{t('ladder.startSession')}</Text>
                  </TouchableOpacity>
                )}
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
        {/* eslint-disable-next-line i18next/no-literal-string */}
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
  loadingIndicator: { marginTop: 48 },
  emptyState: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginHorizontal: 24, marginTop: 48, lineHeight: 22 },
  addButton: { position: 'absolute', bottom: 32, left: 24, right: 24, backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  crisisBanner: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginHorizontal: 24, marginTop: 12, borderWidth: 1, borderColor: '#fecaca' },
  crisisText: { fontSize: 14, color: '#991b1b', lineHeight: 20, marginBottom: 4 },
  crisisLink: { fontSize: 13, color: '#991b1b', textDecorationLine: 'underline' },
  startSessionButton: { backgroundColor: '#1d4ed8', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, marginHorizontal: 4, marginBottom: 4, alignSelf: 'flex-start' },
  startSessionText: { color: '#ffffff', fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
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
