module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: ['@supabase/supabase-js', '@exposure-buddy/sync'],
      },
    ],
  },
}
