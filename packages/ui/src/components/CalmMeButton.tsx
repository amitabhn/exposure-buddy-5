import React from 'react'
import { TouchableOpacity, Image, StyleSheet } from 'react-native'
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
      <Image source={require('../assets/IconCalmMe.png')} style={styles.icon} />
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  icon: { width: 32, height: 32 },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: color.accent.courage,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
})
