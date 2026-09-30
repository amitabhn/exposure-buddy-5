import { describe, it, expect } from 'vitest'
import { selectNextAffirmation } from './calmMeConfig'

describe('selectNextAffirmation', () => {
  it('never repeats the previous key when pool.length > 1 (many trials)', () => {
    const pool = ['a', 'b', 'c', 'd']
    let previous: string | null = 'a'
    for (let i = 0; i < 200; i++) {
      const next = selectNextAffirmation(pool, previous)
      expect(next).not.toBe(previous)
      expect(pool).toContain(next)
      previous = next
    }
  })

  it('returns the sole entry when pool.length === 1, regardless of previousKey', () => {
    expect(selectNextAffirmation(['only'], null)).toBe('only')
    expect(selectNextAffirmation(['only'], 'only')).toBe('only')
    expect(selectNextAffirmation(['only'], 'some-other-key')).toBe('only')
  })

  it('handles previousKey === null by picking uniformly from the whole pool', () => {
    const pool = ['a', 'b', 'c']
    for (let i = 0; i < 50; i++) {
      expect(pool).toContain(selectNextAffirmation(pool, null))
    }
  })

  it('handles a previousKey not present in the pool by picking from the whole pool without throwing', () => {
    const pool = ['a', 'b']
    expect(() => selectNextAffirmation(pool, 'not-in-pool')).not.toThrow()
    expect(pool).toContain(selectNextAffirmation(pool, 'not-in-pool'))
  })

  it('two-entry pool always alternates to the other entry', () => {
    const pool = ['a', 'b']
    expect(selectNextAffirmation(pool, 'a')).toBe('b')
    expect(selectNextAffirmation(pool, 'b')).toBe('a')
  })

  it('falls back to the full pool without throwing when every entry equals previousKey', () => {
    const pool = ['x', 'x']
    expect(() => selectNextAffirmation(pool, 'x')).not.toThrow()
    expect(selectNextAffirmation(pool, 'x')).toBe('x')
  })
})
