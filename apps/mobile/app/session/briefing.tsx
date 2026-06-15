import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'

export default function BriefingScreen() {
  const { t } = useTranslation()
  const router = useRouter()
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
      <View style={styles.container}>
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
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 16, textAlign: 'center' },
  sessionContext: { fontSize: 16, color: '#374151', lineHeight: 26, textAlign: 'center', marginBottom: 32 },
  letterBlock: { marginBottom: 32 },
  letterIntro: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  intentionText: { fontSize: 18, color: '#111827', lineHeight: 28, fontFamily: 'DMSerifDisplay_400Regular_Italic' },
  readyButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  readyText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
