module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2020, sourceType: 'module', ecmaFeatures: { jsx: true } },
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
  overrides: [
    {
      // primitives/ and components/ are the React Native abstraction layers — react-native imports are
      // required here by design. Approved exception: removing only the react-native
      // pattern while keeping all other boundary restrictions intact.
      files: ['src/primitives/**', 'src/components/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              '@supabase/*',
              '@exposure-buddy/sync',
              '@exposure-buddy/supabase',
              // react-native intentionally OMITTED for primitives — this is the RN abstraction layer
              'expo-*',
            ],
          },
        ],
      },
    },
    {
      // no-grounding-token-in-context: groundingTokens must not be imported in
      // Context or Provider files — the grounding surface has a 2s access SLA and
      // must not route through a provider's async render cycle (UX-DR2).
      files: [
        '**/*Context.ts',
        '**/*Context.tsx',
        '**/*Provider.ts',
        '**/*Provider.tsx',
      ],
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
            paths: [
              {
                name: './tokens/theme',
                importNames: ['groundingTokens'],
                message:
                  'no-grounding-token-in-context (UX-DR2): groundingTokens must not be imported in Context or Provider files.',
              },
              {
                name: '../tokens/theme',
                importNames: ['groundingTokens'],
                message:
                  'no-grounding-token-in-context (UX-DR2): groundingTokens must not be imported in Context or Provider files.',
              },
              {
                name: '../../tokens/theme',
                importNames: ['groundingTokens'],
                message:
                  'no-grounding-token-in-context (UX-DR2): groundingTokens must not be imported in Context or Provider files.',
              },
              {
                name: '../index',
                importNames: ['groundingTokens'],
                message:
                  'no-grounding-token-in-context (UX-DR2): groundingTokens must not be imported in Context or Provider files.',
              },
              {
                name: '../../index',
                importNames: ['groundingTokens'],
                message:
                  'no-grounding-token-in-context (UX-DR2): groundingTokens must not be imported in Context or Provider files.',
              },
              {
                name: '@exposure-buddy/ui',
                importNames: ['groundingTokens'],
                message:
                  'no-grounding-token-in-context (UX-DR2): groundingTokens must not be imported in Context or Provider files.',
              },
            ],
          },
        ],
      },
    },
  ],
}
