import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

export function BackButton() {
  const router = useRouter()
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <View style={styles.chevron} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#111827',
    transform: [{ rotate: '-45deg' }],
  },
})
