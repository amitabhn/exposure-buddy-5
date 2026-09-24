import type { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'Exposure Buddy',
  slug: 'exposure-buddy',
  // Bump manually following semver (MAJOR.MINOR.PATCH) before any build intended for
  // external distribution. Native build number is separate — EAS-remote-managed per
  // eas.json's cli.appVersionSource, auto-incremented on every build.
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
    'expo-dev-client',
    'expo-router',
    'expo-localization',
    'expo-notifications',
    '@react-native-community/datetimepicker',
    // @sentry/react-native/expo plugin removed — requires sentry-cli binary which
    // doesn't build on EAS with pnpm. Basic crash capturing via Sentry.init() in
    // src/error-handler.ts works without it. Re-add when sentry-cli issue resolved.
    './plugins/withIosScene27Compat',
  ],
  scheme: 'exposure-buddy',
  extra: {
    eas: {
      projectId: '1d801bb9-44e2-4693-8fb6-6ce7eca54f8e',
    },
  },
}

export default config
