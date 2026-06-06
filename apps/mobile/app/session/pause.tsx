import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'

export default function PauseScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { sessionId, fearItemId, description, preSuds } = useLocalSearchParams<{
    sessionId: string
    fearItemId: string
    description: string
    preSuds: string
  }>()

  function handleBegin() {
    // pre_session→active via exposure.begun event (state machine informational at screen level)
    router.push(
      // eslint-disable-next-line i18next/no-literal-string
      `/session/active?sessionId=${sessionId}&fearItemId=${encodeURIComponent(fearItemId)}&description=${encodeURIComponent(description ?? '')}&preSuds=${preSuds}`
    )
  }

  return (
    <>
      {/* headerShown: false + gestureEnabled: false set in session/_layout.tsx — forward-only */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('session.pause.title')}</Text>
        <Text style={styles.body}>{t('session.pause.body')}</Text>
        <TouchableOpacity
          style={styles.beginButton}
          onPress={handleBegin}
          accessibilityRole="button"
          accessibilityLabel={t('session.pause.begin')}
        >
          <Text style={styles.beginText}>{t('session.pause.begin')}</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', textAlign: 'center', marginBottom: 16 },
  body: { fontSize: 16, color: '#374151', textAlign: 'center', lineHeight: 26, marginBottom: 48 },
  beginButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 16, paddingHorizontal: 48, alignItems: 'center', width: '100%' },
  beginText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
