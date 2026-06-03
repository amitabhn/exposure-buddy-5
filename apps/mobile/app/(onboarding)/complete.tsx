import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Stack, useRouter, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'

export default function CompleteScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { count } = useLocalSearchParams<{ count?: string }>()
  const itemCount = count !== undefined ? parseInt(count, 10) : null
  const showCount = itemCount !== null && !isNaN(itemCount) && itemCount > 0
  const { crisisFlaggedInOnboarding, markOnboardingComplete } = useAuth()

  function handleStartJourney() {
    // MUST precede router.replace — flips isOnboardingComplete before (app) layout mounts
    markOnboardingComplete()
    router.replace('/(app)/index')
  }

  const title = crisisFlaggedInOnboarding
    ? t('onboarding.complete.titleSoft')
    : t('onboarding.complete.title')

  const encouragement = crisisFlaggedInOnboarding
    ? t('onboarding.complete.encouragementSoft')
    : t('onboarding.complete.encouragement')

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>

        {!crisisFlaggedInOnboarding && showCount && (
          <Text style={styles.count}>
            {t('onboarding.complete.itemCount', { count: itemCount })}
          </Text>
        )}

        <Text style={styles.encouragement}>{encouragement}</Text>

        {crisisFlaggedInOnboarding && (
          <TouchableOpacity
            onPress={() => router.push('/(onboarding)/crisis')}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.overwhelmed.cta')}
            style={styles.overwhelmedLink}
          >
            <Text style={styles.overwhelmedText}>{t('onboarding.overwhelmed.cta')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleStartJourney}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.complete.cta')}
        >
          <Text style={styles.buttonText}>{t('onboarding.complete.cta')}</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingVertical: 48, backgroundColor: '#ffffff', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827', marginBottom: 8, textAlign: 'center' },
  count: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 8 },
  encouragement: { fontSize: 15, color: '#6b7280', lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  overwhelmedLink: { alignSelf: 'center', marginBottom: 16 },
  overwhelmedText: { fontSize: 14, color: '#6b7280', textDecorationLine: 'underline' },
  button: { alignSelf: 'stretch', backgroundColor: '#111827', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
