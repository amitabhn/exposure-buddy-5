import { Stack } from 'expo-router'

export default function SessionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* technique: headerShown: false in layout lets technique.tsx control its own header via inline Stack.Screen override */}
      <Stack.Screen name="technique" options={{ headerShown: false, gestureEnabled: false }} />
      {/* briefing: forward-only, no skip affordance */}
      <Stack.Screen name="briefing" options={{ headerShown: false, gestureEnabled: false }} />
      {/* pause, active, and grounding are forward-only (non-skippable) per UX spec */}
      <Stack.Screen name="pause" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="active" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="grounding" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  )
}
