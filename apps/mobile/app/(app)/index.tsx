import { useEffect, useRef, type ElementRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, AccessibilityInfo, findNodeHandle, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@exposure-buddy/supabase'
import { CourageLadderEntryCard, LadderProgressBar, color, radius, spacing, typography } from '@exposure-buddy/ui'
import { resolveLowestPendingItem, resolveHomeScreenState, isGroundingSignalFresh, type HomeScreenContext } from '@exposure-buddy/core'
import { useFearLadderItems } from '../../src/hooks/useFearLadderItems'
import { useActiveExposureSession } from '../../src/hooks/useActiveExposureSession'

export default function HomeScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { firstHomeVisitSeen, markFirstHomeVisitSeen, isOnboardingComplete, authState, sessionRecoveryData, getGroundingActiveAt } = useAuth()
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
    // Guard on isOnboardingComplete: right after sign-in the router lands on '/' and home
    // mounts transiently before the (app) layout's effect redirects to onboarding (child
    // effects run before parent effects). Marking the visit on that pre-onboarding mount
    // burns the first-visit greeting before the user ever sees home.
    if (!firstHomeVisitSeen && authState.userId && isOnboardingComplete) {
      markFirstHomeVisitSeen()
    }
  }, [authState.userId, isOnboardingComplete]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const lowestPendingItemForLabel = resolveLowestPendingItem(items)
  const completedCount = items.filter(item => item.status === 'completed').length
  // Progress bar tracks ladder completion — meaningless with zero items, so it is
  // suppressed only for 'empty-ladder' (every other reachable state has items.length > 0).
  const showProgress = homeState !== 'empty-ladder'

  // State 4 ('progressing') navigation params: prefer sessionRecoveryData (MMKV, device-local,
  // already has description/preSuds), fall back to activeSession (PowerSync, cross-device) when
  // the recovery blob never reached this device. fearItemId can be null in either source (ladder
  // item deleted post-session-start, Story 6.2-C's ON DELETE SET NULL) — never crash on it.
  const progressingSessionId = sessionRecoveryData ? sessionRecoveryData.sessionId : activeSession?.id ?? ''
  const progressingFearItemId = sessionRecoveryData
    ? sessionRecoveryData.fearItemId
    : activeSession?.fearItemId ?? null
  const progressingDescription = sessionRecoveryData ? sessionRecoveryData.description : ''
  const progressingPreSuds = sessionRecoveryData ? sessionRecoveryData.preSuds : 0

  // Story 9.2: a session killed mid-grounding must recover to /session/grounding, not
  // /session/active — routing a just-grounded, still-anxious user back to the exposure
  // trigger on recovery is the exact regression GROUNDING_ACTIVE exists to prevent.
  const isRecoveringIntoGrounding = isGroundingSignalFresh(getGroundingActiveAt(), Date.now())
  // eslint-disable-next-line i18next/no-literal-string
  const progressingTarget = isRecoveringIntoGrounding ? '/session/grounding' : '/session/active'

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.greeting}>
        {seenOnMount.current ? t('home.welcomeBack') : t('home.readyToStart')}
      </Text>
      <Text style={styles.subGreeting}>
        {seenOnMount.current ? t('home.subGreetingWelcomeBack') : t('home.subGreetingReadyToStart')}
      </Text>

      {isLoading ? (
        <ActivityIndicator style={styles.loadingIndicator} accessibilityLabel={t('common.loading')} />
      ) : (
        <>
          {showProgress ? (
            <LadderProgressBar
              label={t('home.yourLadderLabel')}
              progressLabel={t('home.progressLabel', { completed: completedCount, total: items.length })}
              completed={completedCount}
              total={items.length}
            />
          ) : null}

          {homeState === 'morning' ? (
            <CourageLadderEntryCard
              ref={cardRef}
              lowestPendingItem={lowestPendingItemForLabel}
              onPress={() => router.push('/ladder')}
              nextStepLabel={t('home.nextStepLabel')}
              ctaLabel={t('home.nextStep.cta')}
              sudsPrefix={t('home.nextStep.sudsPrefix')}
              sudsSuffix={t('home.nextStep.sudsSuffix')}
              fallbackLabel={items.length === 0 ? t('home.courageCard.emptyLabel') : t('home.courageCard.noPendingLabel')}
              accessibilityLabel={
                lowestPendingItemForLabel
                  ? t('home.courageCard.itemLabel', {
                      description: lowestPendingItemForLabel.description,
                      suds: Math.min(10, Math.max(0, Math.round(lowestPendingItemForLabel.predictedSuds))),
                    })
                  : items.length === 0
                    ? t('home.courageCard.emptyLabel')
                    : t('home.courageCard.noPendingLabel')
              }
            />
          ) : homeState === 'completed' ? (
            <View style={styles.completedCard}>
              <Text style={styles.stateHeadline}>{t('home.completedState.headline')}</Text>
              <Text style={styles.stateSubtext}>{t('home.completedState.subtext')}</Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/ladder')}
                accessibilityRole="button"
                accessibilityLabel={t('home.completedState.cta')}
              >
                <Text style={styles.ctaButtonText}>{t('home.completedState.cta')}</Text>
              </TouchableOpacity>
            </View>
          ) : homeState === 'progressing' ? (
            <TouchableOpacity
              style={styles.progressingCard}
              onPress={() =>
                router.push(
                  // eslint-disable-next-line i18next/no-literal-string
                  `${progressingTarget}?sessionId=${progressingSessionId}&fearItemId=${progressingFearItemId != null ? encodeURIComponent(progressingFearItemId) : ''}&description=${encodeURIComponent(progressingDescription)}&preSuds=${progressingPreSuds}`
                )
              }
              accessibilityRole="button"
              accessibilityLabel={t('home.progressingState.cta')}
            >
              <View style={styles.progressingLabelRow}>
                <View style={styles.progressingDot} />
                <Text style={styles.progressingLabel}>{t('home.progressingState.label')}</Text>
              </View>
              {progressingDescription ? <Text style={styles.progressingDescription}>{progressingDescription}</Text> : null}
              <View style={styles.progressingCta}>
                <Text style={styles.progressingCtaText}>{t('home.progressingState.cta')}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            // 'empty-ladder', 'first-use' (unreachable — hasAccount is always true here), and the
            // type-level-only states ('avoidance', 'mid-exposure', 'return-after-gap', never
            // returned by resolveHomeScreenState in this story) all render the empty-ladder UI.
            <View style={styles.emptyCard}>
              <Text
                // eslint-disable-next-line i18next/no-literal-string
                accessibilityLiveRegion="polite"
                style={styles.stateHeadline}
              >
                {t('home.emptyState.headline')}
              </Text>
              <Text style={styles.stateSubtext}>{t('home.emptyState.subtext')}</Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/ladder')}
                accessibilityRole="button"
                accessibilityLabel={t('home.emptyState.cta')}
              >
                <Text style={styles.ctaButtonText}>{t('home.emptyState.cta')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing[5], backgroundColor: color.surface.primary },
  // paddingRight reserves space for the Calm Me FAB (top-right, ~110pt footprint at its
  // widest) — without it, wrapped text at large accessibility font sizes runs directly
  // behind the FAB (Story 9.3 max-font-size walkthrough finding).
  greeting: { ...typography.h1, color: color.content.primary, paddingRight: 130 },
  subGreeting: { ...typography.body, color: color.content.secondary, marginTop: spacing[1] },
  loadingIndicator: { marginVertical: spacing[4] },
  emptyCard: {
    marginTop: spacing[5],
    backgroundColor: color.surface.secondary,
    borderRadius: radius.card,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
  },
  completedCard: {
    marginTop: spacing[5],
    backgroundColor: color.reflect.background,
    borderColor: '#F1E4CC', // warm border companion to reflect.background — no token for this shade
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
  },
  stateHeadline: { ...typography.h2, color: color.content.primary, textAlign: 'center' },
  stateSubtext: { ...typography.body, color: color.content.secondary, textAlign: 'center' },
  ctaButton: {
    marginTop: spacing[2],
    alignSelf: 'stretch',
    backgroundColor: color.accent.courage,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaButtonText: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#ffffff' },
  progressingCard: {
    marginTop: spacing[5],
    backgroundColor: color.accent.courage,
    borderRadius: radius.card,
    padding: spacing[5],
    gap: spacing[3],
  },
  progressingLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  progressingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.accent.progress },
  progressingLabel: {
    ...typography.caption,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progressingDescription: { ...typography.h2, color: '#ffffff' },
  progressingCta: {
    marginTop: spacing[1],
    backgroundColor: '#ffffff',
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  progressingCtaText: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.accent.courage },
})
