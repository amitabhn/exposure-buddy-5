import { useEffect, useRef, useSyncExternalStore } from 'react'
import { View, StyleSheet, BackHandler, useWindowDimensions } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@exposure-buddy/supabase'
import { CalmMeButton } from '@exposure-buddy/ui'
import { InstaCalmIntroCallout } from './InstaCalmIntroCallout'
import { getResumeBannerVisible, subscribeResumeBannerVisible } from '../state/sessionResumeFlag'

// Global Calm Me FAB — mounted as a sibling to <Stack> in app/_layout.tsx so it persists
// across every route. Hidden on '/calm-me' and its sub-routes (techniques, helplines) —
// AC #2's no-double-stacking rule, extended to the whole calm-me subtree since those
// screens already have their own Back affordance back to the hub.
export function CalmMeFab() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const { sessionRecoveryData, instaCalmIntroSeen, markInstaCalmIntroSeen } = useAuth()
  const navigatingRef = useRef(false)
  // eslint-disable-next-line i18next/no-literal-string
  const isOnCalmMeRoute = pathname === '/calm-me' || pathname.startsWith('/calm-me/')

  // Story 18.2 — suppressed specifically while the /session/active resume banner is
  // visible (it offers the identical Insta Calm action), reappearing once the banner is
  // dismissed so it stays available for the rest of the resumed session.
  const isResumeBannerVisible = useSyncExternalStore(subscribeResumeBannerVisible, getResumeBannerVisible)

  // Story 19.4 — the first-launch intro overlay stays off every /session/* screen (SUDS rating,
  // active, stop, pause, debrief): it would dim a distressed moment. The flag stays unset, so it
  // appears on the next screen outside a session. Computed before the early returns so the
  // BackHandler effect below can follow the rules of hooks.
  // eslint-disable-next-line i18next/no-literal-string
  const isOnSessionRoute = pathname === '/session' || pathname.startsWith('/session/')
  const showIntro = !instaCalmIntroSeen && !isOnSessionRoute && !isOnCalmMeRoute && !isResumeBannerVisible

  // Android hardware back dismisses the intro (and counts as seen) instead of navigating away
  // underneath a still-dimmed screen. Registered only while the overlay is actually showing.
  // markInstaCalmIntroSeen is not memoized, so it is read through a ref to avoid re-subscribing
  // to the back button on every render.
  const markSeenRef = useRef(markInstaCalmIntroSeen)
  markSeenRef.current = markInstaCalmIntroSeen
  useEffect(() => {
    if (!showIntro) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      markSeenRef.current()
      return true
    })
    return () => sub.remove()
  }, [showIntro])

  // Resets the double-tap guard once the user has left the calm-me subtree (or never
  // reached it), so the FAB is tappable again on the next screen — without this, a single
  // tap would permanently disable the FAB for the rest of the app session.
  useEffect(() => {
    if (!isOnCalmMeRoute) navigatingRef.current = false
  }, [isOnCalmMeRoute])

  if (isOnCalmMeRoute) return null
  if (isResumeBannerVisible) return null

  // pathname here is the screen the FAB is tapped FROM — once /calm-me is pushed, that
  // screen's own usePathname() would just read '/calm-me', so this check must happen here,
  // at tap-construction time, and be threaded into the route (see Dev Notes — "Determining
  // in-session context").
  const isInSession = sessionRecoveryData !== null && pathname === '/session/active'

  function handlePress() {
    if (navigatingRef.current) return
    navigatingRef.current = true
    // Story 19.4 — tapping the button itself counts as having seen the intro.
    if (!instaCalmIntroSeen) markInstaCalmIntroSeen()
    // eslint-disable-next-line i18next/no-literal-string
    router.push(isInSession ? '/calm-me?inSession=1' : '/calm-me')
  }

  return (
    <>
      {/* Dims the whole screen and swallows touches, so only the button (above it) and the
          intro card stay interactive until "Got it". */}
      {showIntro && (
        // eslint-disable-next-line i18next/no-literal-string
        <View style={[styles.scrim, { width, height }]} onStartShouldSetResponder={() => true} importantForAccessibility="no" testID="insta-calm-intro-scrim" />
      )}
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
        <CalmMeButton
          onPress={handlePress}
          label={t('calmMe.fabLabel')}
          accessibilityLabel={t('calmMe.fab')}
          accessibilityHint={t('calmMe.fabHint')}
        />
        {showIntro && <InstaCalmIntroCallout onDismiss={markInstaCalmIntroSeen} />}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  // zIndex is required now that CalmMeFab mounts before <Stack> in app/_layout.tsx
  // (Story 9.3 focus-order fix) — without it, the Stack's opaque screen content paints
  // over the FAB instead of the reverse, since paint order otherwise follows source order.
  // top is set dynamically via useSafeAreaInsets so the button clears Dynamic Island / punch-hole cameras.
  container: { position: 'absolute', right: 24, zIndex: 10, elevation: 10, alignItems: 'flex-end' },
  // Source order puts the container after the scrim, so the button paints on top of it.
  // Sized from useWindowDimensions: the parent here has no height of its own, so top/bottom: 0 collapses to 0.
  scrim: { position: 'absolute', top: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 10, elevation: 10 },
})
