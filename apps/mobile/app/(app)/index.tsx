import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'

// Home screen placeholder — full implementation in Epic 5/6
export default function HomeScreen() {
  const { t } = useTranslation()
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('common.appName')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  title: { fontSize: 24, fontWeight: '600' },
})
