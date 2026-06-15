import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import type { TechniqueType } from '@exposure-buddy/core'
import { BackButton } from '../../src/components/navigation/BackButton'

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
    if (!selected) return
    setLastUsedTechnique(fearItemId, selected)
    router.push(
      // eslint-disable-next-line i18next/no-literal-string
      `/session/intent?fearItemId=${fearItemId}&sessionId=${sessionId}&description=${encodeURIComponent(description ?? '')}&predictedSuds=${predictedSuds}&technique=${selected}`
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
          headerStyle: { backgroundColor: '#ffffff' },
          headerLeft: () => <BackButton />,
          headerBackVisible: false,
        }}
      />
      <View style={styles.container}>
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
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },
  heading: { fontSize: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 20 },
  card: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  cardSelected: {
    borderColor: '#0d9488',
    backgroundColor: '#f0fdfa',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 4 },
  cardDescription: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  continueButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  continueButtonDisabled: { backgroundColor: '#d1d5db' },
  continueText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
