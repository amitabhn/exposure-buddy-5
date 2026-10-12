// Vitest runs in node; the real react-native entry is Flow-typed and unparseable here.
// AuthProvider only needs AppState (Story 19.8 refresh retry).
export const AppState = {
  addEventListener: () => ({ remove: () => {} }),
}
