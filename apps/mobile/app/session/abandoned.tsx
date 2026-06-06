import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'

export default function AbandonedScreen() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.message}>{t('session.abandoned.message')}</Text>

        {/* CalmMe button — always accessible, UX-DR04 */}
        <TouchableOpacity
          style={styles.calmMeButton}
          onPress={() => router.push('/calm-me')}
          accessibilityRole="button"
          accessibilityLabel={t('home.calmMe.cta')}
        >
          <Text style={styles.calmMeText}>{t('home.calmMe.cta')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.returnButton}
          onPress={() => router.replace('/(app)/index')}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.returnText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  message: { fontSize: 18, color: '#374151', textAlign: 'center', lineHeight: 28, marginBottom: 48 },
  calmMeButton: { backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 48, alignItems: 'center', marginBottom: 16, width: '100%' },
  calmMeText: { color: '#ffffff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  returnButton: { paddingVertical: 12, alignItems: 'center' },
  returnText: { fontSize: 14, color: '#6b7280', textDecorationLine: 'underline' },
})
