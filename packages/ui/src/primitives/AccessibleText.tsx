import { Text } from 'react-native'
import type { TextProps } from 'react-native'

// Wraps RN Text with a default accessibilityRole of 'text', ensuring semantic role is always set.
// accessibilityLabel is intentionally optional (AC3 required-label constraint applies to
// AccessiblePressable only) — screen readers read Text content directly, and an explicit label
// risks overriding the visible content with a divergent string.
export function AccessibleText({ accessibilityRole = 'text', ...props }: TextProps) {
  return <Text accessibilityRole={accessibilityRole} {...props} />
}
