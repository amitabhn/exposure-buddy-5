import type { ConfigPlugin, ExpoConfig } from 'expo/config'
import { withEntitlementsPlist } from 'expo/config-plugins'

// Free/personal Apple ID teams can never provision the Push Notifications
// capability, so `expo run:ios --device` fails signing on those accounts.
// Set EXPO_LOCAL_DEVICE_BUILD=1 to strip aps-environment for local testing;
// EAS builds (which use a paid team) are unaffected.
const withoutPushEntitlement: ConfigPlugin = (cfg) =>
  withEntitlementsPlist(cfg, (mod) => {
    delete mod.modResults['aps-environment']
    return mod
  })

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
    infoPlist: {
      // App only uses standard HTTPS/TLS (Supabase, Sentry) — no custom/non-exempt
      // encryption, so this skips the App Store Connect export-compliance question per build.
      ITSAppUsesNonExemptEncryption: false,
    },
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
    // Mod execution for a given mod type (e.g. entitlements) runs in reverse
    // plugin-array order, so this must be listed first to run last — after
    // expo-notifications adds aps-environment below.
    ...(process.env.EXPO_LOCAL_DEVICE_BUILD === '1' ? [withoutPushEntitlement] : []),
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
