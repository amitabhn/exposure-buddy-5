// __DEV__ is a React Native global injected by the Metro bundler.
// Declared here so packages/core can type-check stubs that reference it
// without importing any React Native packages (ARC-011).
declare const __DEV__: boolean

// console is a runtime global in all JS environments; declared here
// so packages/core can reference it without the dom lib (ARC-011).
declare const console: {
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}
