import { useEffect, useRef, useState, type ElementRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo, findNodeHandle, TextInput, Modal, ActivityIndicator, Alert } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist'
import { useAuth } from '@exposure-buddy/supabase'
import { color, radius } from '@exposure-buddy/ui'
import { detectCrisisKeywords } from '@exposure-buddy/core'
import type { FearLadderItem } from '@exposure-buddy/core'
import { getAdapter } from '../src/sync/adapter'
import { useFearLadderItems } from '../src/hooks/useFearLadderItems'
import { useActiveExposureSession } from '../src/hooks/useActiveExposureSession'
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
  const { activeSession, isLoading: sessionLoading } = useActiveExposureSession(userId)
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

  async function handleConfirmDelete(item: FearLadderItem) {
    try {
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('fear_ladder_items', 'DELETE', { id: item.id })
    } catch (err) {
      console.error('[LadderScreen] delete enqueue failed:', err)
    }
    closeForm()
  }

  function handleRemoveItem(item: FearLadderItem) {
    Alert.alert(
      t('ladder.delete.confirmTitle'),
      t('ladder.delete.confirmMessage'),
      [
        // eslint-disable-next-line i18next/no-literal-string
        { text: t('ladder.cancel'), style: 'cancel' },
        // eslint-disable-next-line i18next/no-literal-string
        { text: t('ladder.delete.confirmButton'), style: 'destructive', onPress: () => handleConfirmDelete(item) },
      ]
    )
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

  // D8b: fail closed while the active-session query is still resolving, not just once
  // it returns a non-null session — a tap during the loading window would otherwise
  // slip past the guard entirely.
  const removeDisabled = activeSession !== null || sessionLoading

  const statusLabel = (status: string) => {
    // Legacy: 'in_progress' was removed from the DB CHECK constraint in migration 0021
    // (Story 6.2-A). Stale rows from pre-migration syncs may still carry this value.
    if (status === 'in_progress') return t('ladder.statusInProgress')
    if (status === 'completed') return t('ladder.statusCompleted')
    return t('ladder.statusPending')
  }

  const badgeStyle = (status: string) => status === 'completed' ? styles.badgeDone : styles.badgeToDo
  const badgeTextStyle = (status: string) => status === 'completed' ? styles.badgeDoneText : styles.badgeToDoText

  return (
    <>
      {/* headerShown:false — this screen renders its own inline header (below) to match
          the Claude Design "Exposure Buddy" redesign's showLadder view, rather than the
          native iOS nav bar every other pushed screen still uses (Story 12.3) */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>{t('ladder.title')}</Text>
        </View>

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
          <Text
            // eslint-disable-next-line i18next/no-literal-string
            accessibilityLiveRegion="polite"
            style={styles.emptyState}
          >{t('ladder.emptyState')}</Text>
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
                  {/* eslint-disable-next-line i18next/no-literal-string */}
                  <Text style={styles.dragHandle}>⠿</Text>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                    <Text style={styles.itemMeta}>
                      {t('ladder.sudsPrefix')}
                      {item.predictedSuds}
                      {t('ladder.sudsSuffix')}
                    </Text>
                  </View>
                  <View style={badgeStyle(item.status)}>
                    <Text style={badgeTextStyle(item.status)}>{statusLabel(item.status)}</Text>
                  </View>
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
            {editingItem !== null && (
              // T7.1: "Start session" — all items (pending and completed). Completed items
              // can be repeated; active.tsx will update peak_suds on the re-run.
              // T7.2: Guard against starting while another session is in progress
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
                    `/session/technique?fearItemId=${editingItem.id}&sessionId=${sessionId}&description=${encodeURIComponent(editingItem.description)}&predictedSuds=${editingItem.predictedSuds}`
                  )
                }}
                accessibilityRole="button"
                accessibilityLabel={`${t('ladder.startSession')}, ${editingItem.description}`}
              >
                <Text style={styles.startSessionText}>{t('ladder.startSession')}</Text>
              </TouchableOpacity>
            )}
            {editingItem !== null && (
              <View style={styles.removeSection}>
                <TouchableOpacity
                  style={[styles.removeButton, removeDisabled && styles.removeButtonDisabled]}
                  onPress={() => handleRemoveItem(editingItem)}
                  disabled={removeDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={t('ladder.removeItem')}
                  accessibilityState={{ disabled: removeDisabled }}
                >
                  <Text style={[styles.removeText, removeDisabled && styles.removeTextDisabled]}>{t('ladder.removeItem')}</Text>
                </TouchableOpacity>
                {removeDisabled && (
                  <Text style={styles.removeGuardText}>{t('ladder.delete.guardMessage')}</Text>
                )}
              </View>
            )}
          </View>
        </Modal>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, marginTop: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', color: color.content.primary },
  listContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 100 },
  // #E3EAE7 (resting card border) has no equivalent in packages/ui's 8 semantic tokens —
  // same documented token gap as sign-in.tsx's #9AAEA7 (Story 12.1)
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', borderRadius: radius.card, borderWidth: 1, borderColor: '#E3EAE7', padding: 16, marginBottom: 8 },
  itemRowDragging: { backgroundColor: '#ffffff', elevation: 8, shadowColor: color.content.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  itemContent: { flex: 1 },
  itemDescription: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.content.primary, lineHeight: 22 },
  itemMeta: { fontSize: 12, color: color.content.secondary, marginTop: 4 },
  // #9AAEA7 (muted drag-handle colour) — same documented token gap as sign-in.tsx (Story 12.1)
  dragHandle: { fontSize: 16, color: '#9AAEA7', paddingHorizontal: 2, lineHeight: 16 },
  badgeDone: { backgroundColor: color.surface.secondary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeDoneText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.accent.courage },
  // #B8863A ("to do" badge text) has no equivalent in packages/ui's 8 semantic tokens —
  // same documented token gap as sign-in.tsx's #9AAEA7 (Story 12.1); badge fill reuses
  // reflect.background, the closest existing warm-neutral token
  badgeToDo: { backgroundColor: color.reflect.background, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  badgeToDoText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#B8863A' },
  loadingIndicator: { marginTop: 48 },
  emptyState: { fontSize: 15, color: color.content.secondary, textAlign: 'center', marginHorizontal: 24, marginTop: 48, lineHeight: 22 },
  addButton: { position: 'absolute', bottom: 32, left: 24, right: 24, backgroundColor: color.accent.courage, borderRadius: radius.button, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  crisisBanner: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginHorizontal: 24, marginTop: 12, borderWidth: 1, borderColor: '#fecaca' },
  crisisText: { fontSize: 14, color: '#991b1b', lineHeight: 20, marginBottom: 4 },
  crisisLink: { fontSize: 13, color: '#991b1b', textDecorationLine: 'underline' },
  startSessionButton: { backgroundColor: color.accent.courage, borderRadius: radius.button, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  startSessionText: { color: '#ffffff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  formContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 24, backgroundColor: '#ffffff' },
  formTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold', color: color.content.primary, marginBottom: 24 },
  formLabel: { fontSize: 12, fontWeight: '500', color: color.content.secondary, marginBottom: 6 },
  // #d7e0dc (input border) has no equivalent in packages/ui's 8 semantic tokens — same
  // documented token gap as sign-in.tsx's #9AAEA7 (Story 12.1)
  textInput: { borderWidth: 1, borderColor: '#d7e0dc', borderRadius: radius.input, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: color.content.primary, marginBottom: 20, backgroundColor: '#ffffff' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: color.surface.secondary, borderRadius: radius.button, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 15, color: color.content.secondary },
  saveButton: { flex: 1, backgroundColor: color.accent.courage, borderRadius: radius.button, paddingVertical: 14, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: color.surface.secondary },
  saveText: { color: '#ffffff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  removeSection: { marginTop: 24, alignItems: 'center' },
  removeButton: { paddingVertical: 12, paddingHorizontal: 16 },
  removeButtonDisabled: { opacity: 0.5 },
  removeText: { color: '#dc2626', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  removeTextDisabled: { color: '#9ca3af' },
  removeGuardText: { fontSize: 13, color: color.content.secondary, marginTop: 4, textAlign: 'center' },
})
