import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@exposure-buddy/supabase'
import { color } from '@exposure-buddy/ui'

export default function BriefingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sessionId, fearItemId, description, preSuds } = useLocalSearchParams<{
    sessionId: string
    fearItemId: string
    description: string
    preSuds: string
  }>()

  const { getSessionIntention } = useAuth()
  const intentionText = getSessionIntention(sessionId ?? '')

  function handleReady() {
    router.push(
      // eslint-disable-next-line i18next/no-literal-string
      `/session/active?sessionId=${sessionId ?? ''}&fearItemId=${encodeURIComponent(fearItemId ?? '')}&description=${encodeURIComponent(description ?? '')}&preSuds=${preSuds ?? ''}`
    )
  }

  return (
    <>
      {/* headerShown: false + gestureEnabled: false set in session/_layout.tsx — forward-only, no skip affordance */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>{t('session.briefing.title')}</Text>
        <Text style={styles.sessionContext}>{t('session.briefing.sessionContext')}</Text>

        {intentionText ? (
          <View style={styles.letterBlock}>
            <Text style={styles.letterIntro}>{t('session.briefing.letterIntro')}</Text>
            {/* DmSerifSurface: 'pre-exposure-readback' — one of four permitted surfaces (UX-DR21) */}
            <Text style={styles.intentionText}>{intentionText}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.readyButton}
          onPress={handleReady}
          accessibilityRole="button"
          accessibilityLabel={t('session.briefing.readyButton')}
        >
          <Text style={styles.readyText}>{t('session.briefing.readyButton')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  // Story 9.3 max-font-size walkthrough: justifyContent:'center' on a non-scrolling View
  // centers content even when it's taller than the viewport, clipping the top of the title
  // off-screen. flexGrow + justifyContent on the ScrollView's content container preserves
  // the centered look for short content while scrolling once content overflows.
  container: { flexGrow: 1, backgroundColor: color.surface.primary, paddingHorizontal: 24, paddingBottom: 48, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.content.primary, marginBottom: 16, textAlign: 'center' },
  sessionContext: { fontSize: 16, color: color.content.secondary, lineHeight: 26, textAlign: 'center', marginBottom: 32 },
  letterBlock: { marginBottom: 32 },
  letterIntro: { fontSize: 13, color: color.content.secondary, marginBottom: 8 },
  intentionText: { fontSize: 18, color: color.content.primary, lineHeight: 28, fontFamily: 'DMSerifDisplay_400Regular_Italic' },
  readyButton: { backgroundColor: color.accent.courage, borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  readyText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
