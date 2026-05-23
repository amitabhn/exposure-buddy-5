// @exposure-buddy/core — pure TypeScript domain logic, zero framework dependencies
// ARC-011: No react-native, expo-*, or @supabase/* imports permitted in this package
export type { AuthTokenProvider } from './interfaces/AuthTokenProvider'
export { emitAccountCreated, onAccountCreated } from './events/accountCreated'
