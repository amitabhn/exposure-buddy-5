module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2020, sourceType: 'module', ecmaFeatures: { jsx: true } },
  env: {
    es2020: true,
    node: true, // process, console
  },
  rules: {
    // TypeScript interface/type method signatures (e.g. AuthContextValue) have no
    // implementation, so their param names are never "used" — false positive.
    'no-unused-vars': 'off',
    // Ban raw MMKV key string literals — all keys must come from KV_KEYS in
    // @exposure-buddy/core (or this package's own MMKV_KEYS for the two
    // pre-auth device-scoped keys in session.ts).
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "CallExpression[callee.type='MemberExpression'][callee.property.name=/^(getString|set|getBoolean|getNumber|delete)$/] > Literal:first-child",
        message:
          "Raw MMKV key string literals are banned in apps/mobile. Import KV_KEYS from '@exposure-buddy/core' and use a typed key constant.",
      },
    ],
  },
  overrides: [
    {
      // Test files: Jest/Vitest globals
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: { jest: true },
    },
  ],
}
