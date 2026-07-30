import React from 'react'
import { TouchableOpacity, Image, Text, StyleSheet } from 'react-native'
import { color, radius } from '../tokens/theme'

export interface CalmMeButtonProps {
  label: string // pre-translated visible button copy; "\n" renders as a stacked second line (e.g. "INSTA\nCALM") — packages/ui has no react-i18next dependency
  onPress: () => void
  accessibilityLabel: string
  accessibilityHint?: string
}

export const CalmMeButton = React.forwardRef<
  React.ElementRef<typeof TouchableOpacity>,
  CalmMeButtonProps
>(function CalmMeButton({ label, onPress, accessibilityLabel, accessibilityHint }, ref) {
  return (
    <TouchableOpacity
      ref={ref}
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Text style={styles.label} allowFontScaling={false}>{label}</Text>
      <Image source={require('../assets/IconCalmMe.png')} style={styles.icon} />
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  icon: { width: 34, height: 34, flexShrink: 0 },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: color.accent.courage,
    letterSpacing: 0.2,
  },
  button: {
    minHeight: 48,
    borderRadius: radius.card,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: color.accent.courage,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    shadowColor: color.content.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
})
