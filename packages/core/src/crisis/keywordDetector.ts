import { CRISIS_KEYWORDS } from './keywords'

// Pre-normalise keywords once at module load (P5: avoid per-call recomputation)
const NORMALISED_KEYWORDS = CRISIS_KEYWORDS.map((kw) =>
  kw.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(),
)

export function detectCrisisKeywords(text: string): boolean {
  if (text == null) return false // P2: guard against runtime null/undefined
  const normalised = text
    .normalize('NFC') // P1: Unicode composition (Devanagari IME may emit NFD)
    .toLowerCase()
    .replace(/[‘’]/g, "'") // P3: iOS smart apostrophe → straight
    .replace(/\s+/g, ' ') // P4: collapse double-space, NBSP, tab
    .trim()
  return NORMALISED_KEYWORDS.some((kw) => normalised.includes(kw))
}
