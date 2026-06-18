import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'

// Placeholder — Story 7.3 replaces this body with the full 5-4-3-2-1 sensory grounding exercise.
// Navigation wiring (Back button) is owned by this story and must not change.
export default function GroundingPlaceholderScreen() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('calmMe.back')}
        >
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.comingSoon}>{t('calmMe.comingSoon')}</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 48, left: 24, padding: 8 },
  backIcon: { fontSize: 28, color: '#111827' },
  comingSoon: { fontSize: 16, color: '#374151' },
})
