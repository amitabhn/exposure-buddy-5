import { useState } from 'react'
import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import type { TechniqueType } from '@exposure-buddy/core'
import { BackButton } from '../../src/components/navigation/BackButton'
import { color } from '@exposure-buddy/ui'

const TECHNIQUES: TechniqueType[] = ['somatic', 'breathing', 'cognitive']

export default function TechniqueScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { fearItemId, sessionId, description, predictedSuds } = useLocalSearchParams<{
    fearItemId: string
    sessionId: string
    description: string
    predictedSuds: string
  }>()

  const { getLastUsedTechnique, setLastUsedTechnique } = useAuth()

  const [selected, setSelected] = useState<TechniqueType | null>(
    () => (fearItemId ? getLastUsedTechnique(fearItemId) : null)
  )

  function handleContinue() {
    if (!selected || !fearItemId) return
    setLastUsedTechnique(fearItemId, selected)
    router.push(
      // eslint-disable-next-line i18next/no-literal-string
      `/session/intent?fearItemId=${encodeURIComponent(fearItemId)}&sessionId=${sessionId}&description=${encodeURIComponent(description ?? '')}&predictedSuds=${predictedSuds}&technique=${selected}`
    )
  }

  return (
    <>
      {/* technique.tsx disables swipe-back gesture (gestureEnabled: false in layout) while
          keeping the tappable BackButton — prevents accidental swipe abandonment while
          allowing intentional back navigation. BackButton calls router.back() as usual. */}
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t('session.technique.title'),
          headerShadowVisible: false,
          // eslint-disable-next-line i18next/no-literal-string
          headerStyle: { backgroundColor: color.surface.primary },
          headerLeft: () => <BackButton />,
          headerBackVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>{t('session.technique.title')}</Text>

        {TECHNIQUES.map((type) => {
          const isSelected = selected === type
          return (
            <TouchableOpacity
              key={type}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelected(type)}
              accessibilityRole="radio"
              accessibilityLabel={t(`session.technique.${type}Label`)}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={styles.cardTitle}>{t(`session.technique.${type}Label`)}</Text>
              <Text style={styles.cardDescription}>{t(`session.technique.${type}Description`)}</Text>
            </TouchableOpacity>
          )
        })}

        <TouchableOpacity
          style={[styles.continueButton, selected === null && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={selected === null}
          accessibilityRole="button"
          accessibilityLabel={t('session.technique.continue')}
          accessibilityState={{ disabled: selected === null }}
        >
          <Text style={styles.continueText}>{t('session.technique.continue')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  // Story 9.3 max-font-size walkthrough: at large accessibility text sizes the 3 technique
  // cards plus Continue button no longer fit in the viewport — ScrollView keeps them reachable.
  container: { flexGrow: 1, backgroundColor: color.surface.primary, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },
  heading: { fontSize: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.content.primary, marginBottom: 20 },
  card: {
    borderWidth: 1,
    borderColor: color.surface.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: color.surface.primary,
  },
  // #0d9488 / #f0fdfa — selected-state teal, out of scope per Story 12.5's semantic-colour
  // exception list; left unchanged.
  cardSelected: {
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.content.primary, marginBottom: 4 },
  cardDescription: { fontSize: 14, color: color.content.secondary, lineHeight: 20 },
  continueButton: { backgroundColor: color.accent.courage, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  continueButtonDisabled: { backgroundColor: color.surface.secondary },
  continueText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
