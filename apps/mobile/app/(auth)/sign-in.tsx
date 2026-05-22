import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'

// Placeholder — OTP authentication implemented in Story 2.1
export default function SignInScreen() {
  const { t } = useTranslation()
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('common.appName')}</Text>
      <Text style={styles.subtitle}>{t('auth.signin.placeholder')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666' },
})
