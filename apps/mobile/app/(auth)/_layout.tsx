import { Stack } from 'expo-router'
import { BackButton } from '../../src/components/navigation/BackButton'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={({ navigation }) => ({
        headerShown: navigation.canGoBack(),
        headerTitle: '',
        headerShadowVisible: false,
        // eslint-disable-next-line i18next/no-literal-string
        headerStyle: { backgroundColor: '#ffffff' },
        headerLeft: () => <BackButton />,
        headerBackVisible: false,
      })}
    />
  )
}
