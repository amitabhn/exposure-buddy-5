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

        <TouchableOpacity
          style={styles.returnButton}
          onPress={() => router.replace('/')}
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
  returnButton: { paddingVertical: 12, alignItems: 'center' },
  returnText: { fontSize: 14, color: '#6b7280', textDecorationLine: 'underline' },
})
