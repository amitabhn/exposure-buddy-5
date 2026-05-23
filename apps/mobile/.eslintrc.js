module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  plugins: ['i18next', 'react-native-a11y'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: {
    es2020: true,
    node: true, // process, console
  },
  globals: {
    __DEV__: 'readonly', // React Native global
    global: 'readonly',  // React Native global object
  },
  rules: {
    // i18n gate: reject hardcoded strings in JSX text and prop values (FR-I18N-01)
    'i18next/no-literal-string': [
      'error',
      {
        mode: 'all',
        'jsx-attributes': {
          exclude: [
            // plugin defaults
            'className', 'styleName', 'style', 'type', 'key', 'id', 'width', 'height',
            // RN/Expo Router structural props — route identifiers and semantic roles, not user strings
            'testID', 'nativeID', 'name', 'accessibilityRole',
            // RN input control props — semantic API values, not translatable user text
            'autoCapitalize', 'autoComplete', 'autoCorrect', 'keyboardType', 'returnKeyType',
            'textContentType', 'importantForAccessibility', 'keyboardAppearance', 'inputMode',
          ],
        },
        callees: {
          exclude: [
            // plugin defaults (must re-specify — callees option replaces, not extends, defaults)
            'i18n(ext)?', 't', 'require', 'addEventListener', 'removeEventListener',
            'postMessage', 'getElementById', 'dispatch', 'commit',
            'includes', 'indexOf', 'endsWith', 'startsWith',
            // strings inside StyleSheet.create() are CSS property values, not translatable text
            'StyleSheet\\.create',
            // console calls are developer-facing debug output, not user-visible strings
            'console\\.(log|warn|error|info|debug)',
            // Expo Router navigation — route paths are structural identifiers, not user-visible strings
            'router\\.push', 'router\\.replace', 'router\\.navigate', 'router\\.back',
          ],
        },
      },
    ],
    // a11y gate: Pressable/TouchableOpacity must have accessibilityLabel (NFR-ACCESS-01)
    'react-native-a11y/has-accessibility-props': 'error',
    // ARC-005: Direct @powersync/react-native imports are forbidden in apps/mobile.
    // All writes must go through adapter.enqueue() from @exposure-buddy/sync.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@powersync/react-native', '@powersync/common'],
            message:
              'Use adapter.enqueue() from @exposure-buddy/sync — direct PowerSync imports bypass the sync boundary (ARC-005)',
          },
          {
            group: ['@supabase/supabase-js'],
            message:
              'Use @exposure-buddy/supabase instead — direct @supabase/supabase-js imports violate the package boundary (ARC-006)',
          },
        ],
      },
    ],
    // TypeScript declaration files use declare — no-unused-vars is a false positive
    'no-unused-vars': 'off',
  },
  overrides: [
    {
      // Test files: Jest globals + allow literal strings in assertions
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: { jest: true },
      rules: {
        'i18next/no-literal-string': 'off',
        'react-native-a11y/has-accessibility-props': 'off',
      },
    },
    {
      // TypeScript declaration files — ESLint should not run rules here
      files: ['**/*.d.ts'],
      rules: {
        'no-undef': 'off',
        'no-unused-vars': 'off',
      },
    },
    {
      // i18n bootstrap and non-component utilities: no JSX, rules not applicable
      files: ['src/i18n/**', 'src/error-handler.ts'],
      rules: {
        'i18next/no-literal-string': 'off',
        'react-native-a11y/has-accessibility-props': 'off',
      },
    },
  ],
}
