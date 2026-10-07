import { describe, it, expect } from 'vitest'
import { resolveLowestPendingItem, sortLadderForDisplay } from '../../selectors/fearLadder'
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

describe('sortLadderForDisplay', () => {
  const ids = (items: { id: string }[]) => items.map(i => i.id)

  it('returns an empty array for an empty ladder', () => {
    expect(sortLadderForDisplay([])).toEqual([])
  })

  it('sinks completed items below unfinished ones, keeping each group in position order', () => {
    const sorted = sortLadderForDisplay([
      makeItem('1', 1, 'completed'), makeItem('2', 2), makeItem('3', 3, 'completed'), makeItem('4', 4),
    ])
    expect(ids(sorted)).toEqual(['2', '4', '1', '3'])
  })

  it('leaves an all-pending ladder in position order', () => {
    expect(ids(sortLadderForDisplay([makeItem('b', 2), makeItem('a', 1)]))).toEqual(['a', 'b'])
  })

  it('keeps an all-completed ladder in position order', () => {
    expect(ids(sortLadderForDisplay([makeItem('b', 2, 'completed'), makeItem('a', 1, 'completed')]))).toEqual(['a', 'b'])
  })

  it('breaks position ties by id', () => {
    expect(ids(sortLadderForDisplay([makeItem('b', 1), makeItem('a', 1)]))).toEqual(['a', 'b'])
  })

  it('does not mutate the input or rewrite positions', () => {
    const input = [makeItem('1', 1, 'completed'), makeItem('2', 2)]
    const snapshot = JSON.parse(JSON.stringify(input))
    const sorted = sortLadderForDisplay(input)
    expect(input).toEqual(snapshot)
    expect(sorted.map(i => i.position)).toEqual([2, 1])
  })
})
