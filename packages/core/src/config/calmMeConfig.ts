// ARC-011: zero imports from react-native, expo-*, or @supabase/*
// Post-MVP rotation: to add affirmation #17+, append the key here and add the matching
// `calmMe.affirmation.N` entry to both apps/mobile/src/i18n/locales/en.json and hi.json —
// no other code changes needed.
export const CALM_ME_AFFIRMATIONS: string[] = [
  'calmMe.affirmation.1',
  'calmMe.affirmation.2',
  'calmMe.affirmation.3',
  'calmMe.affirmation.4',
  'calmMe.affirmation.5',
  'calmMe.affirmation.6',
  'calmMe.affirmation.7',
  'calmMe.affirmation.8',
  'calmMe.affirmation.9',
  'calmMe.affirmation.10',
  'calmMe.affirmation.11',
  'calmMe.affirmation.12',
  'calmMe.affirmation.13',
  'calmMe.affirmation.14',
  'calmMe.affirmation.15',
  'calmMe.affirmation.16',
]

// Story 18.3 — Insta Calm affirmation rotation. Pure selection function: uniform-random
// pick from `pool` excluding `previousKey`, so a distressed user doesn't see the same
// line twice in a row across visits. Falls back to the sole entry when the pool has
// exactly one item (no repeat is impossible to satisfy — must not throw).
export function selectNextAffirmation(pool: string[], previousKey: string | null): string {
  if (pool.length <= 1) return pool[0]!

  const candidates = previousKey === null ? pool : pool.filter((key) => key !== previousKey)
  // If previousKey isn't actually in the pool (stale/unknown key), candidates === pool —
  // still a valid uniform pick over the whole pool.
  const effectiveCandidates = candidates.length > 0 ? candidates : pool
  const index = Math.floor(Math.random() * effectiveCandidates.length)
  return effectiveCandidates[index]!
}
