import { View, StyleSheet } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import { useAuth } from '@exposure-buddy/supabase'
import { CalmMeButton } from '@exposure-buddy/ui'

// Global Calm Me FAB — mounted as a sibling to <Stack> in app/_layout.tsx so it persists
// across every route. Hidden on '/calm-me' itself (AC #2: no double-stacking).
export function CalmMeFab() {
  const pathname = usePathname()
  const router = useRouter()
  const { sessionRecoveryData } = useAuth()

  if (pathname === '/calm-me') return null

  // pathname here is the screen the FAB is tapped FROM — once /calm-me is pushed, that
  // screen's own usePathname() would just read '/calm-me', so this check must happen here,
  // at tap-construction time, and be threaded into the route (see Dev Notes — "Determining
  // in-session context").
  const isInSession = sessionRecoveryData !== null && pathname === '/session/active'

  return (
    // eslint-disable-next-line i18next/no-literal-string
    <View style={styles.container} pointerEvents="box-none">
      <CalmMeButton
        onPress={() =>
          // eslint-disable-next-line i18next/no-literal-string
          router.push(isInSession ? '/calm-me?inSession=1' : '/calm-me')
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { position: 'absolute', right: 24, bottom: 32 },
})
