import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { color } from '@exposure-buddy/ui'
import { BackButton } from '../../src/components/navigation/BackButton'
import { isRelaxationTechniqueKey } from '../../src/relaxation/techniques'

// Story 19.2 — shown for a listed technique that has no screen yet. Always offers a way back to the
// picker; an unknown or missing technique key falls back to a generic message rather than crashing.
export default function RelaxationComingSoonScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { technique } = useLocalSearchParams<{ technique?: string }>()

  const body = isRelaxationTechniqueKey(technique)
    ? t('relaxation.comingSoon.body', { technique: t(`relaxation.techniques.${technique}.label`) })
    : t('relaxation.comingSoon.bodyGeneric')

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerShadowVisible: false,
          // eslint-disable-next-line i18next/no-literal-string
          headerStyle: { backgroundColor: color.surface.primary },
          headerLeft: () => <BackButton />,
          headerBackVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('relaxation.comingSoon.title')}</Text>
        <Text style={styles.body}>{body}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('relaxation.comingSoon.back')}
        >
          <Text style={styles.buttonText}>{t('relaxation.comingSoon.back')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: color.surface.primary, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.content.primary, textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 16, color: color.content.secondary, lineHeight: 24, textAlign: 'center', marginBottom: 32 },
  button: { backgroundColor: color.accent.courage, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', alignSelf: 'stretch' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
