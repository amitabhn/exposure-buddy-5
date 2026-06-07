import { useEffect, useRef, type ElementRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo, findNodeHandle } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { CourageLadderEntryCard } from '@exposure-buddy/ui'
import { resolveLowestPendingItem } from '@exposure-buddy/core'

// Determine home state for states 7 and 8.
// Epic 6: replace with resolveHomeScreenState() from packages/core + PowerSync data.
const POST_EXPOSURE_WINDOW_MS = 6 * 60 * 60 * 1000  // 6 hours in ms

type HomeDisplayState = 'default' | 'post-exposure' | 'expired'

function formatTimeRemaining(completedAtMs: number | undefined): string {
  if (!completedAtMs) return ''
  const windowExpiry = completedAtMs + POST_EXPOSURE_WINDOW_MS
  const remaining = windowExpiry - Date.now()
  if (remaining <= 0) return ''
  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / 60000)
  // Epic 6: replace clientMs+6h proxy with server expires_at from PowerSync
  return `${hours}h ${minutes}m remaining`  // Display only — expires_at epoch is authoritative
}

export default function HomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { firstHomeVisitSeen, markFirstHomeVisitSeen, authState, debriefPendingData } = useAuth()
  const cardRef = useRef<ElementRef<typeof CourageLadderEntryCard>>(null)
  // Capture MMKV-derived value at mount — prevents greeting flicker on first visit
  const seenOnMount = useRef(firstHomeVisitSeen)

  useEffect(() => {
    // Guard on userId: the home screen can mount before onAuthStateChange populates
    // authState.userId, which would cause markFirstHomeVisitSeen to fail silently.
    // Re-running when userId arrives ensures the flag is written on first visit.
    if (!firstHomeVisitSeen && authState.userId) {
      markFirstHomeVisitSeen()
    }
  }, [authState.userId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Epic 6: replace completedAtMs+6h proxy with PowerSync expires_at; extract to
  // resolveHomeScreenState() in packages/core
  const nowMs = Date.now()
  function resolveDisplayState(): HomeDisplayState {
    // eslint-disable-next-line i18next/no-literal-string
    if (!debriefPendingData) return 'default'
    const windowExpiry = debriefPendingData.completedAtMs + POST_EXPOSURE_WINDOW_MS
    // eslint-disable-next-line i18next/no-literal-string
    if (nowMs < windowExpiry) return 'post-exposure'           // state 7
    // eslint-disable-next-line i18next/no-literal-string
    if (!debriefPendingData.reflectionSubmitted) return 'expired'  // state 8
    // eslint-disable-next-line i18next/no-literal-string
    return 'default'  // reflection done AND window expired → fall through to state 3
  }

  const displayState = resolveDisplayState()

  function buildDebriefUrl(extraParams?: string): string {
    if (!debriefPendingData) return ''
    // eslint-disable-next-line i18next/no-literal-string
    return `/session/debrief?sessionId=${debriefPendingData.sessionId}` +
      `&fearItemId=${debriefPendingData.fearItemId != null ? encodeURIComponent(debriefPendingData.fearItemId) : ''}` +
      `&preSuds=${debriefPendingData.preSuds}` +
      `&debriefSuds=${debriefPendingData.debriefSuds}` +
      `&peakSuds=${debriefPendingData.peakSuds}` +
      `&completedAtMs=${debriefPendingData.completedAtMs}` +
      (extraParams ?? '')
  }

  return (
    <View style={styles.container}>

      {/* State 7: post-exposure reflection window open */}
      {displayState === 'post-exposure' && debriefPendingData && (
        <View style={styles.postExposureCard}>
          {debriefPendingData.hasLetter ? (
            <TouchableOpacity
              onPress={() => router.push(buildDebriefUrl('&readOnly=true') as never)}
              accessibilityRole="button"
              accessibilityLabel={t('home.state7.ctaLetter')}
            >
              <Text style={styles.ctaText}>{t('home.state7.ctaLetter')}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.acknowledgementText}>{t('home.state7.acknowledgement')}</Text>
          )}
          <Text style={styles.windowTimeText}>{formatTimeRemaining(debriefPendingData.completedAtMs)}</Text>
          <TouchableOpacity
            style={styles.calmMeButton}
            onPress={() => router.push('/calm-me')}
            accessibilityRole="button"
            accessibilityLabel={t('home.calmMe.cta')}
          >
            <Text style={styles.calmMeText}>{t('home.calmMe.cta')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* State 8: post-exposure window expired, late debrief */}
      {displayState === 'expired' && debriefPendingData && (
        <View style={styles.expiredCard}>
          <Text style={styles.contextCardText}>{t('home.state8.contextCard')}</Text>
          <TouchableOpacity
            style={styles.reflectNowButton}
            onPress={() => router.push(buildDebriefUrl() as never)}
            accessibilityRole="button"
            accessibilityLabel={t('home.state8.cta')}
          >
            <Text style={styles.reflectNowText}>{t('home.state8.cta')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.calmMeButton}
            onPress={() => router.push('/calm-me')}
            accessibilityRole="button"
            accessibilityLabel={t('home.calmMe.cta')}
          >
            <Text style={styles.calmMeText}>{t('home.calmMe.cta')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Default state: courage ladder entry */}
      {displayState === 'default' && (
        <>
          <Text style={styles.greeting}>
            {seenOnMount.current ? t('home.welcomeBack') : t('home.readyToStart')}
          </Text>

          <CourageLadderEntryCard
            ref={cardRef}
            ladderItemCount={0}
            lowestPendingItem={lowestPendingItem}
            onPress={() => router.push('/ladder')}
          />

          <TouchableOpacity
            style={styles.calmMeButton}
            onPress={() => router.push('/calm-me')}
            accessibilityRole="button"
            accessibilityLabel={t('home.calmMe.cta')}
          >
            <Text style={styles.calmMeText}>{t('home.calmMe.cta')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 48, backgroundColor: '#ffffff' },
  greeting: { fontSize: 22, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 8 },
  calmMeButton: { alignSelf: 'center', marginTop: 24 },
  calmMeText: { fontSize: 14, color: '#6b7280', textDecorationLine: 'underline' },
  // State 7 styles
  postExposureCard: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  ctaText: { fontSize: 18, color: '#0f766e', fontWeight: '600', fontFamily: 'Inter_600SemiBold', textDecorationLine: 'underline', textAlign: 'center' },
  acknowledgementText: { fontSize: 20, color: '#111827', lineHeight: 30, textAlign: 'center', fontFamily: 'DMSerifDisplay_400Italic' },
  windowTimeText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  // State 8 styles
  expiredCard: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  contextCardText: { fontSize: 16, color: '#374151', lineHeight: 24, textAlign: 'center' },
  reflectNowButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 16, paddingHorizontal: 32 },
  reflectNowText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
