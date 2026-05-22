module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: ['@supabase/supabase-js', '@exposure-buddy/sync'],
      },
    ],
  },
}
