import { useEffect, useRef, type ElementRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo, findNodeHandle, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { CourageLadderEntryCard } from '@exposure-buddy/ui'
import { resolveLowestPendingItem, resolveHomeScreenState, type HomeScreenContext } from '@exposure-buddy/core'
import { useFearLadderItems } from '../../src/hooks/useFearLadderItems'
import { useActiveExposureSession } from '../../src/hooks/useActiveExposureSession'

export default function HomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { firstHomeVisitSeen, markFirstHomeVisitSeen, authState } = useAuth()
  const cardRef = useRef<ElementRef<typeof CourageLadderEntryCard>>(null)
  // Capture MMKV-derived value at mount — prevents greeting flicker on first visit
  const seenOnMount = useRef(firstHomeVisitSeen)

  const { items, isLoading: ladderLoading } = useFearLadderItems(authState.userId)
  const { activeSession, isLoading: sessionLoading } = useActiveExposureSession(authState.userId)
  const isLoading = ladderLoading || sessionLoading

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

  // hasAccount is hardcoded true: (app)/_layout.tsx's route guard already redirects
  // unauthenticated users to /(auth)/sign-in before this screen can mount, so this
  // defers to that existing contract rather than re-checking it here.
  const ctx: HomeScreenContext = {
    hasAccount: true,
    hasLadder: items.length > 0,
    ladderComplete: items.length > 0 && items.every(item => item.status === 'completed'),
    activeThread: activeSession
      ? { exists: true, openCount: 0, openDurationHours: 0, userDeclaredIncomplete: false }
      : null,
    gapDays: 0,
    nowMs: Date.now(),
  }
  const homeState = resolveHomeScreenState(ctx)

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        {seenOnMount.current ? t('home.welcomeBack') : t('home.readyToStart')}
      </Text>

      {isLoading ? (
        <ActivityIndicator style={styles.loadingIndicator} accessibilityLabel={t('common.loading')} />
      ) : homeState === 'morning' ? (
        <CourageLadderEntryCard
          ref={cardRef}
          ladderItemCount={items.length}
          lowestPendingItem={resolveLowestPendingItem(items)}
          onPress={() => router.push('/ladder')}
        />
      ) : homeState === 'completed' ? (
        <Text style={styles.placeholder}>{t('home.state10.message')}</Text>
      ) : homeState === 'progressing' ? (
        <TouchableOpacity
          style={styles.placeholderCard}
          onPress={() => router.push('/ladder')}
          accessibilityRole="button"
        >
          <Text style={styles.placeholder}>{t('home.state4.placeholder')}</Text>
        </TouchableOpacity>
      ) : (
        // 'empty-ladder', 'first-use' (unreachable — hasAccount is always true here), and the
        // type-level-only states ('avoidance', 'mid-exposure', 'return-after-gap', never
        // returned by resolveHomeScreenState in this story) all render the empty-ladder UI.
        <View>
          <Text style={styles.placeholder}>{t('ladder.emptyState')}</Text>
          <TouchableOpacity
            style={styles.placeholderCard}
            onPress={() => router.push('/ladder')}
            accessibilityRole="button"
            accessibilityLabel={t('ladder.addItem')}
          >
            <Text style={styles.addItemText}>{t('ladder.addItem')}</Text>
          </TouchableOpacity>
        </View>
      )}

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
  loadingIndicator: { marginVertical: 16 },
  placeholder: { fontSize: 15, color: '#374151', marginVertical: 16 },
  placeholderCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
    marginVertical: 16,
    alignSelf: 'stretch',
  },
  addItemText: { fontSize: 15, color: '#111827', fontWeight: '600', textAlign: 'center' },
})
