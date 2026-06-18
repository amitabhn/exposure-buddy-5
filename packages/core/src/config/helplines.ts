// ARC-011: zero imports from react-native, expo-*, or @supabase/*
// Story 7.4 builds the UI that consumes this data — this file only creates it.
export interface Helpline {
  id: string
  name: string
  number: string // dialable, for tel: URI
  displayNumber: string // formatted for display
}

export const HELPLINES: Helpline[] = [
  { id: 'telemanas', name: 'Tele MANAS', number: '18008914416', displayNumber: '1800-891-4416' },
  { id: 'kiran', name: 'KIRAN', number: '18005990019', displayNumber: '1800-599-0019' },
  { id: 'icall', name: 'iCall', number: '9152987821', displayNumber: '9152987821' },
  { id: 'vandrevala', name: 'Vandrevala Foundation', number: '9999666555', displayNumber: '9999-666-555' },
  { id: 'aasra', name: 'AASRA', number: '02227546669', displayNumber: '+91-22-27546669' },
]
