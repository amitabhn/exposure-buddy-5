import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'

export function BackButton() {
  const router = useRouter()
  const { t } = useTranslation()
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
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
