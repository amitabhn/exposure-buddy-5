import { Stack } from 'expo-router'
import { BackButton } from '../../src/components/navigation/BackButton'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={({ navigation }) => ({
        headerShown: navigation.canGoBack(),
        headerTitle: () => null,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#ffffff' },
        headerLeft: () => <BackButton />,
        headerBackVisible: false,
      })}
    />
  )
}
