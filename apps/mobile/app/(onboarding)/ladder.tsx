import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { OnboardingStepIndicator } from '../../src/components/onboarding/OnboardingStepIndicator'
import { FearItemForm } from '../../src/components/onboarding/FearItemForm'
import { getAdapter } from '../../src/sync/adapter'

const MIN_ITEMS = 3
const MAX_ITEMS = 10

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
  const crisisFlagWrittenRef = useRef(false)
  const itemsRef = useRef<FearItem[]>([])
  const isAddingRef = useRef(false)
  const isSwappingRef = useRef(false)
  const [isSwapping, setIsSwapping] = useState(false)

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
    if (!userId || isAddingRef.current) return
    isAddingRef.current = true
    const newItem: FearItem = {
      id: generateUUID(),
      description,
      predictedSuds,
      position: itemsRef.current.length + 1,
    }
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('[LadderScreen] enqueue failed:', err)
      // TODO(Epic 6): surface error toast and retry path
      isAddingRef.current = false
      return
    }
    const updatedItems = [...itemsRef.current, newItem]
    itemsRef.current = updatedItems
    setItems(updatedItems)
    setShowForm(false)
    isAddingRef.current = false
  }

  async function swapItems(indexA: number, indexB: number) {
    if (isSwappingRef.current) return
    isSwappingRef.current = true
    setIsSwapping(true)
    const currentItems = itemsRef.current
    const itemA = currentItems[indexA]
    const itemB = currentItems[indexB]
    if (!itemA || !itemB) {
      isSwappingRef.current = false
      setIsSwapping(false)
      return
    }
    try {
      // eslint-disable-next-line i18next/no-literal-string
      await getAdapter().enqueue('fear_ladder_items', 'UPDATE', {
        // eslint-disable-next-line i18next/no-literal-string
        type: 'reorder_positions', // Epic 6: connector must handle this envelope for fear_ladder_items
        itemAId: itemA.id,
        itemANewPosition: itemB.position,
        itemBId: itemB.id,
        itemBNewPosition: itemA.position,
        updatedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error('[LadderScreen] reorder enqueue failed:', err)
      isSwappingRef.current = false
      setIsSwapping(false)
      return
    }
    const updated = [...currentItems]
    updated[indexA] = { ...itemB, position: itemA.position }
    updated[indexB] = { ...itemA, position: itemB.position }
    itemsRef.current = updated
    setItems(updated)
    isSwappingRef.current = false
    setIsSwapping(false)
  }

  async function handleNext() {
    if (items.length < MIN_ITEMS || !userId) return
    setOnboardingProgressStep(4)
    router.replace({ pathname: '/(onboarding)/complete', params: { count: String(items.length) } })
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
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemContent}>
              <Text style={styles.itemDescription}>{item.description}</Text>
              <Text style={styles.itemSuds}>{t('onboarding.fearLadder.sudsDisplay', { value: item.predictedSuds })}</Text>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity
                onPress={() => swapItems(index, index - 1)}
                disabled={index === 0 || isSwapping}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.fearLadder.moveUp')}
                accessibilityState={{ disabled: index === 0 || isSwapping }}
                style={styles.reorderButton}
              >
                <Text style={[styles.reorderText, index === 0 && styles.reorderTextDisabled]}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => swapItems(index, index + 1)}
                disabled={index === items.length - 1 || isSwapping}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.fearLadder.moveDown')}
                accessibilityState={{ disabled: index === items.length - 1 || isSwapping }}
                style={styles.reorderButton}
              >
                <Text style={[styles.reorderText, index === items.length - 1 && styles.reorderTextDisabled]}>↓</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Form / Add another / Maximum */}
        {items.length < MAX_ITEMS && showForm && (
          <FearItemForm onSave={handleAddItem} onCrisisDetected={handleCrisisDetected} />
        )}
        {items.length < MAX_ITEMS && !showForm && (
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
        {items.length >= MAX_ITEMS && (
          <Text style={styles.helper}>{t('onboarding.fearLadder.maximumItems')}</Text>
        )}

        {/* Crisis banner */}
        {crisisDetected && (
          <View style={styles.crisisBanner}>
            <Text style={styles.crisisText}>{t('onboarding.crisisDetected.banner')}</Text>
            <TouchableOpacity
              onPress={() => router.push('/(onboarding)/crisis')}
              accessibilityRole="button"
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
