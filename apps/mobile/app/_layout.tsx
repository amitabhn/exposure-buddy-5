import { Stack } from 'expo-router'
import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { initErrorHandler } from '../src/error-handler'

// MUST be called before any React rendering — registers Sentry and global error handler
initErrorHandler()

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  )
}
