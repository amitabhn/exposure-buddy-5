import type { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'Exposure Buddy',
  slug: 'exposure-buddy',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.exposurebuddy.app',
  },
  android: {
    package: 'com.exposurebuddy.app',
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  plugins: [
    'expo-router',
    [
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        uploadSourceMaps: false,
      },
    ],
  ],
  scheme: 'exposure-buddy',
  extra: {
    eas: {
      projectId: '1d801bb9-44e2-4693-8fb6-6ce7eca54f8e',
    },
  },
}

export default config
