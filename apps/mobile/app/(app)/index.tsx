import { useEffect, useRef, type ElementRef } from 'react'
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
  const cardRef = useRef<ElementRef<typeof CourageLadderEntryCard>>(null)
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
