import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __DEV__: false,
  },
  test: {
    environment: 'node',
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
  },
})
