import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function AbandonedScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.message}>{t('session.abandoned.message')}</Text>

        <TouchableOpacity
          style={styles.returnButton}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.returnText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  // Story 9.3 max-font-size walkthrough: justifyContent:'center' on a non-scrolling View
  // clips the top of the message off-screen once it's taller than the viewport — see
  // session/briefing.tsx for the same fix pattern.
  container: { flexGrow: 1, backgroundColor: '#ffffff', paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  message: { fontSize: 18, color: '#374151', textAlign: 'center', lineHeight: 28, marginBottom: 48 },
  returnButton: { paddingVertical: 12, alignItems: 'center' },
  returnText: { fontSize: 14, color: '#6b7280', textDecorationLine: 'underline' },
})
