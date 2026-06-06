import { Stack } from 'expo-router'

export default function SessionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* pause, active, and grounding are forward-only (non-skippable) per UX spec */}
      <Stack.Screen name="pause" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="active" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="grounding" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  )
}
