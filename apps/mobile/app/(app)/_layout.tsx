import { Tabs } from 'expo-router'

// Auth gate placeholder — real auth check wired in Story 2.1
export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
    </Tabs>
  )
}
