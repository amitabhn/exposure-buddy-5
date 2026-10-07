import { useEffect } from 'react'
import { AccessibilityInfo, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { color, radius } from '@exposure-buddy/ui'

// At 200% system font the card grew to ~17 lines and covered the sign-in form (device check,
// Story 19.4); capping text scaling keeps it a small card while staying readable.
const FONT_SCALE_CAP = 1.2

interface InstaCalmIntroCalloutProps {
  onDismiss: () => void
}

// Story 19.4 — one-time explanation card under the Insta Calm FAB, shown over a full-screen scrim (rendered by CalmMeFab). Presentational only; the parent
// decides when it shows. Only the card itself is touchable (outer wrapper is box-none).
export function InstaCalmIntroCallout({ onDismiss }: InstaCalmIntroCalloutProps) {
  const { t } = useTranslation()
  const title = t('calmMe.intro.title')
  const body = t('calmMe.intro.body')

  // accessibilityLiveRegion is Android-only; iOS VoiceOver needs an explicit announcement.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${title}. ${body}`)
  }, [title, body])

  return (
    // eslint-disable-next-line i18next/no-literal-string
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <View style={styles.card} accessibilityLiveRegion="polite">
        <Text style={styles.title} maxFontSizeMultiplier={FONT_SCALE_CAP}>{title}</Text>
        <Text style={styles.body} maxFontSizeMultiplier={FONT_SCALE_CAP}>{body}</Text>
        <TouchableOpacity
          style={styles.dismiss}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t('calmMe.intro.dismiss')}
        >
          <Text style={styles.dismissText} maxFontSizeMultiplier={FONT_SCALE_CAP}>{t('calmMe.intro.dismiss')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 12, alignItems: 'flex-end' },
  // maxWidth keeps the card clear of left-aligned controls (e.g. sign-in identifier pills).
  card: {
    maxWidth: 280,
    backgroundColor: '#ffffff',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.accent.courage,
    padding: 16,
    shadowColor: color.content.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  title: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', color: color.content.primary },
  body: { fontSize: 14, lineHeight: 20, color: color.content.secondary, marginTop: 4 },
  dismiss: { alignSelf: 'flex-end', minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  dismissText: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.accent.courage },
})
