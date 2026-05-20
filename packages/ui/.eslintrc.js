module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          '@supabase/*',
          '@exposure-buddy/sync',
          '@exposure-buddy/supabase',
          'react-native',
          'expo-*',
        ],
      },
    ],
  },
}
