import { describe, it, expect } from 'vitest'
import { resolveLowestPendingItem } from '../../selectors/fearLadder'
import type { FearLadderItemStatus } from '../../selectors/fearLadder'

const makeItem = (id: string, position: number, status: FearLadderItemStatus = 'pending') => ({
  id, description: `Situation ${id}`, predictedSuds: 5, position, status, peakSuds: null,
})

describe('resolveLowestPendingItem', () => {
  it('returns null for empty array', () => {
    expect(resolveLowestPendingItem([])).toBeNull()
  })

  it('returns the single pending item', () => {
    const result = resolveLowestPendingItem([makeItem('a', 1)])
    expect(result?.id).toBe('a')
  })

  it('returns item with lowest position when multiple pending', () => {
    const result = resolveLowestPendingItem([makeItem('b', 2), makeItem('a', 1), makeItem('c', 3)])
    expect(result?.id).toBe('a')
  })

  it('ignores non-pending items', () => {
    const result = resolveLowestPendingItem([
      makeItem('x', 1, 'completed'),
      makeItem('y', 2, 'completed'),
    ])
    expect(result).toBeNull()
  })

  it('returns lowest pending item when mixed statuses', () => {
    const result = resolveLowestPendingItem([
      makeItem('a', 1, 'completed'),
      makeItem('b', 2, 'pending'),
      makeItem('c', 3, 'pending'),
    ])
    expect(result?.id).toBe('b')
  })

  it('returns summary shape (no status field)', () => {
    const result = resolveLowestPendingItem([makeItem('a', 1)])
    expect(result).toEqual({ id: 'a', description: 'Situation a', predictedSuds: 5, position: 1 })
    expect('status' in (result ?? {})).toBe(false)
  })

  it('breaks ties on identical position by ascending id', () => {
    const result = resolveLowestPendingItem([makeItem('b', 1), makeItem('a', 1)])
    expect(result?.id).toBe('a')
  })
})
