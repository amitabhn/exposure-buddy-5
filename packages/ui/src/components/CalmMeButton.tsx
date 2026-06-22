import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { color } from '../tokens/theme'

export interface CalmMeButtonProps {
  onPress: () => void
  accessibilityLabel: string
  accessibilityHint?: string
}

export const CalmMeButton = React.forwardRef<
  React.ElementRef<typeof TouchableOpacity>,
  CalmMeButtonProps
>(function CalmMeButton({ onPress, accessibilityLabel, accessibilityHint }, ref) {
  return (
    <TouchableOpacity
      ref={ref}
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {/* Decorative pictographic glyph, not reading content — scaling it with system
          font size breaks out of the FAB's fixed 56x56 circular bounds (Story 9.3,
          Task 7 max-font-size walkthrough finding). */}
      <Text style={styles.icon} allowFontScaling={false}>♡</Text>
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.accent.courage,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: { fontSize: 26, color: '#ffffff', lineHeight: 28 },
})
