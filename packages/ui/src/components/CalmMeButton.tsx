import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
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
      <Ionicons name="leaf-outline" size={26} color="#ffffff" />
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
})
