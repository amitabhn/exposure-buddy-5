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
  overrides: [
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
