import { useCallback, useRef } from 'react'
import { Text, TouchableOpacity, StyleSheet, ScrollView, View } from 'react-native'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { color } from '@exposure-buddy/ui'
import { BackButton } from '../../src/components/navigation/BackButton'
import { RELAXATION_TECHNIQUES, type RelaxationTechnique } from '../../src/relaxation/techniques'

// Story 19.2 — the Home "Practice Relaxation" picker. Unlike /session/technique it carries no
// fearItemId/sessionId and never continues into the exposure flow: each option opens its own
// technique screen, or "Coming soon" when none exists yet.
export default function RelaxationPickerScreen() {
  const { t } = useTranslation()
  const router = useRouter()

  // push keeps this screen mounted under the technique screen, so a rapid second tap would stack a
  // duplicate; the guard is re-armed whenever the picker regains focus (e.g. back from a technique).
  const isNavigatingRef = useRef(false)
  useFocusEffect(
    useCallback(() => {
      isNavigatingRef.current = false
    }, []),
  )

  function handleSelect(technique: RelaxationTechnique) {
    if (isNavigatingRef.current) return
    isNavigatingRef.current = true
    if (technique.route) {
      router.push(technique.route)
      return
    }
    router.push({ pathname: '/relaxation/coming-soon', params: { technique: technique.key } })
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t('relaxation.title'),
          headerShadowVisible: false,
          // eslint-disable-next-line i18next/no-literal-string
          headerStyle: { backgroundColor: color.surface.primary },
          headerLeft: () => <BackButton />,
          headerBackVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>{t('relaxation.heading')}</Text>
        {RELAXATION_TECHNIQUES.map((technique) => (
          <TouchableOpacity
            key={technique.key}
            style={styles.card}
            onPress={() => handleSelect(technique)}
            testID={`relaxation-card-${technique.key}`}
            accessibilityRole="button"
            // An unbuilt technique is announced as such, since the visible "Coming soon" badge is not
            // read when the card carries an explicit label.
            accessibilityLabel={
              technique.route === null
                ? t('relaxation.comingSoon.cardLabel', { technique: t(`relaxation.techniques.${technique.key}.label`) })
                : t(`relaxation.techniques.${technique.key}.label`)
            }
            accessibilityHint={t(`relaxation.techniques.${technique.key}.description`)}
          >
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{t(`relaxation.techniques.${technique.key}.label`)}</Text>
              {technique.route === null && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t('relaxation.comingSoon.badge')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardDescription}>{t(`relaxation.techniques.${technique.key}.description`)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  // ScrollView keeps every card reachable at large accessibility font sizes (six cards).
  container: { flexGrow: 1, backgroundColor: color.surface.primary, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },
  heading: { fontSize: 20, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.content.primary, marginBottom: 20 },
  card: {
    borderWidth: 1,
    borderColor: color.content.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: color.surface.primary,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { flexShrink: 1, fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.content.primary },
  badge: { marginLeft: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: color.surface.secondary },
  badgeText: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.content.secondary },
  cardDescription: { fontSize: 14, color: color.content.secondary, lineHeight: 20 },
})
