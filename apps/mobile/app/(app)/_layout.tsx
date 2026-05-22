import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'

// Auth gate placeholder — real auth check wired in Story 2.1
export default function AppLayout() {
  const { t } = useTranslation()
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t('nav.home') }} />
    </Tabs>
  )
}
