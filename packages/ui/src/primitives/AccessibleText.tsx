import { Text } from 'react-native'
import type { TextProps } from 'react-native'

// Wraps RN Text with a default accessibilityRole of 'text', ensuring semantic role is always set.
export function AccessibleText({ accessibilityRole = 'text', ...props }: TextProps) {
  return <Text accessibilityRole={accessibilityRole} {...props} />
}
