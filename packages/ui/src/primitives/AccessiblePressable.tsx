import { Pressable } from 'react-native'
import type { PressableProps } from 'react-native'

// accessibilityLabel is required (non-optional string) — omitting it is a TypeScript compilation error.
// Use this wrapper instead of bare Pressable to ensure all interactive elements are labelled.
type AccessiblePressableProps = Omit<PressableProps, 'accessibilityLabel'> & {
  accessibilityLabel: string
}

export function AccessiblePressable({
  accessibilityLabel,
  accessibilityRole,
  ...props
}: AccessiblePressableProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole ?? 'button'}
      {...props}
    />
  )
}
