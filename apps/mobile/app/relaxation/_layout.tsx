import { Stack } from 'expo-router'

export default function RelaxationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="coming-soon" />
    </Stack>
  )
}
