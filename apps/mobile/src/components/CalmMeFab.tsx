import { useEffect, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { CalmMeButton } from '@exposure-buddy/ui'

// Global Calm Me FAB — mounted as a sibling to <Stack> in app/_layout.tsx so it persists
// across every route. Hidden on '/calm-me' and its sub-routes (techniques, helplines) —
// AC #2's no-double-stacking rule, extended to the whole calm-me subtree since those
// screens already have their own Back affordance back to the hub.
export function CalmMeFab() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { sessionRecoveryData } = useAuth()
  const navigatingRef = useRef(false)
  // eslint-disable-next-line i18next/no-literal-string
  const isOnCalmMeRoute = pathname === '/calm-me' || pathname.startsWith('/calm-me/')

  // Resets the double-tap guard once the user has left the calm-me subtree (or never
  // reached it), so the FAB is tappable again on the next screen — without this, a single
  // tap would permanently disable the FAB for the rest of the app session.
  useEffect(() => {
    if (!isOnCalmMeRoute) navigatingRef.current = false
  }, [isOnCalmMeRoute])

  if (isOnCalmMeRoute) return null

  // pathname here is the screen the FAB is tapped FROM — once /calm-me is pushed, that
  // screen's own usePathname() would just read '/calm-me', so this check must happen here,
  // at tap-construction time, and be threaded into the route (see Dev Notes — "Determining
  // in-session context").
  const isInSession = sessionRecoveryData !== null && pathname === '/session/active'

  function handlePress() {
    if (navigatingRef.current) return
    navigatingRef.current = true
    // eslint-disable-next-line i18next/no-literal-string
    router.push(isInSession ? '/calm-me?inSession=1' : '/calm-me')
  }

  return (
    // eslint-disable-next-line i18next/no-literal-string
    <View style={styles.container} pointerEvents="box-none">
      <CalmMeButton onPress={handlePress} accessibilityLabel={t('calmMe.fab')} accessibilityHint={t('calmMe.fabHint')} />
    </View>
  )
}

const styles = StyleSheet.create({
  // zIndex is required now that CalmMeFab mounts before <Stack> in app/_layout.tsx
  // (Story 9.3 focus-order fix) — without it, the Stack's opaque screen content paints
  // over the FAB instead of the reverse, since paint order otherwise follows source order.
  container: { position: 'absolute', right: 24, top: 48, zIndex: 10, elevation: 10 },
})
