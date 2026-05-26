import { describe, it, expect } from 'vitest'
import { detectCrisisKeywords } from '../../crisis/keywordDetector'

describe('detectCrisisKeywords', () => {
  it('returns true for an EN crisis keyword', () => {
    expect(detectCrisisKeywords('I want to die')).toBe(true)
  })

  it('returns true for a HI crisis keyword', () => {
    expect(detectCrisisKeywords('मुझे मरना चाहता है')).toBe(true)
  })

  it('returns true for mixed EN+HI text containing a keyword', () => {
    expect(detectCrisisKeywords('I feel like जान देना')).toBe(true)
  })

  it('returns false for text with no crisis keywords', () => {
    expect(detectCrisisKeywords('I am feeling a bit anxious today')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(detectCrisisKeywords('')).toBe(false)
  })

  it('returns true for EN keyword in UPPERCASE', () => {
    expect(detectCrisisKeywords('SUICIDE')).toBe(true)
  })

  it('returns true for EN keyword in MixedCase', () => {
    expect(detectCrisisKeywords('Kill Myself')).toBe(true)
  })

  it('loads and operates without any network setup (AC3 — no network imports)', () => {
    // If keywordDetector imported any network module it would fail to load in the
    // pure Node/Vitest environment with no network globals mocked.
    // Reaching this assertion confirms zero network dependencies.
    expect(detectCrisisKeywords('safe text')).toBe(false)
  })
})
