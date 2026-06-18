import { Stack } from 'expo-router'

export default function CalmMeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="breathing" />
      <Stack.Screen name="grounding" />
      <Stack.Screen name="helplines" />
    </Stack>
  )
}
