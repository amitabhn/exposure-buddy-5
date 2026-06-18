import { useEffect, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { CalmMeButton } from '@exposure-buddy/ui'

// Global Calm Me FAB — mounted as a sibling to <Stack> in app/_layout.tsx so it persists
// across every route. Hidden on '/calm-me' itself (AC #2: no double-stacking).
export function CalmMeFab() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { sessionRecoveryData } = useAuth()
  const navigatingRef = useRef(false)

  // Resets the double-tap guard once the user has left '/calm-me' (or never reached it),
  // so the FAB is tappable again on the next screen — without this, a single tap would
  // permanently disable the FAB for the rest of the app session.
  useEffect(() => {
    if (pathname !== '/calm-me') navigatingRef.current = false
  }, [pathname])

  if (pathname === '/calm-me') return null

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
      <CalmMeButton onPress={handlePress} accessibilityLabel={t('calmMe.fab')} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { position: 'absolute', right: 24, bottom: 32 },
})
