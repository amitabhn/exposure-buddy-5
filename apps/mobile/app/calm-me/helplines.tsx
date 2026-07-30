import { Linking, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HelplineCard, color } from '@exposure-buddy/ui'
import { HELPLINES } from '@exposure-buddy/core'

// AC #3: catches both a synchronous throw from Linking.openURL itself (try/catch) and a
// rejected promise (.catch()) — a .catch() alone only covers the rejection path.
function handleCall(number: string) {
  try {
    // eslint-disable-next-line i18next/no-literal-string
    Linking.openURL('tel:' + number).catch((err) => {
      console.error('[HelplinesScreen] call failed:', err)
    })
  } catch (err) {
    console.error('[HelplinesScreen] call failed:', err)
  }
}

export default function HelplinesScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const callLabel = t('helplines.call')

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('calmMe.back')}
        >
          {/* Decorative glyph, not reading content — scaling it with system font size
              pushes its bounds into the ScrollView content below (Story 9.3, Task 7
              max-font-size walkthrough finding). */}
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Text style={styles.backIcon} allowFontScaling={false}>‹</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 56 }]}>
          <Text style={styles.intro}>{t('helplines.intro')}</Text>

          {HELPLINES.length === 0 ? (
            <Text style={styles.unavailable}>{t('helplines.unavailable')}</Text>
          ) : (
            HELPLINES.map((entry) => (
              <HelplineCard
                key={entry.id}
                name={entry.name}
                displayNumber={entry.displayNumber}
                callLabel={callLabel}
                onCallPress={() => handleCall(entry.number)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surface.primary, width: '100%' },
  // top is set dynamically via useSafeAreaInsets so the button clears Dynamic Island / punch-hole cameras.
  backButton: { position: 'absolute', left: 24, padding: 8, zIndex: 1 },
  backIcon: { fontSize: 28, color: color.content.primary },
  content: { paddingHorizontal: 24, paddingBottom: 32 },
  intro: { fontSize: 16, color: color.content.primary, textAlign: 'center', marginBottom: 16 },
  unavailable: { fontSize: 15, color: color.content.secondary, textAlign: 'center', marginTop: 16 },
})
