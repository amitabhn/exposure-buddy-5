import type { ExpoConfig } from 'expo/config'
import type { ConfigPlugin } from 'expo/config-plugins'
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
  version: '1.0.2',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.exposurebuddy.app',
    // Expo SDK 57's core `Expo` CocoaPod requires iOS 16.4+ (confirmed via its
    // podspec's `s.platforms` — see node_modules/expo/Expo.podspec) — without
    // this, `pod install` fails dependency resolution and EAS Xcode builds fail
    // with confusing Swift-version-mismatch errors. Re-check that podspec's
    // `s.platforms`/`s.swift_version` against this value on every future Expo
    // SDK bump — it silently drifts out of sync otherwise.
    deploymentTarget: '16.4',
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
    'expo-font',
    'expo-splash-screen',
    '@react-native-community/datetimepicker',
    // @sentry/react-native's plugin (app.plugin.js -> ./expo, same as the old
    // @sentry/react-native/expo subpath) intentionally NOT added — requires
    // sentry-cli binary which doesn't build on EAS with pnpm. Re-confirmed still
    // the same plugin during the Epic 16 SDK 55 upgrade (Story 16.1). Basic crash
    // capturing via Sentry.init() in src/error-handler.ts works without it.
    // Re-add when sentry-cli issue resolved.
    './plugins/withIosScene27Compat',
    // ExpoConfig['plugins'] types only allow string/tuple entries, but @expo/config-plugins'
    // withStaticPlugin resolver explicitly supports passing a plugin function directly
    // (see its `typeof pluginResolve === 'function'` branch) — the cast below just matches
    // what Expo's own runtime already does, it doesn't change behavior.
  ] as unknown as ExpoConfig['plugins'],
  scheme: 'exposure-buddy',
  extra: {
    eas: {
      projectId: '1d801bb9-44e2-4693-8fb6-6ce7eca54f8e',
    },
  },
}

export default config
