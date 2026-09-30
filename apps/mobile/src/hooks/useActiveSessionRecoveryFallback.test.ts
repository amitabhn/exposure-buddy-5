import { renderHook } from '@testing-library/react-native'
import { useActiveSessionRecoveryFallback } from './useActiveSessionRecoveryFallback'

const mockUseQuery = jest.fn()

jest.mock('@exposure-buddy/sync', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

const BASE_ROW = {
  id: 'session-1',
  fear_item_id: 'item-1',
  started_at: '2026-06-17T08:00:00.000Z',
  description: 'Test situation',
  pre_suds: 5,
}

describe('useActiveSessionRecoveryFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseQuery.mockReturnValue({ data: [BASE_ROW], isLoading: false })
  })

  it('returns { fallbackRecovery, isLoading } — not an array', () => {
    const { result } = renderHook(() => useActiveSessionRecoveryFallback(true))
    expect(result.current).toHaveProperty('fallbackRecovery')
    expect(result.current).toHaveProperty('isLoading')
    expect(Array.isArray(result.current)).toBe(false)
  })

  it('maps a row into a SessionRecoveryData shape', () => {
    const { result } = renderHook(() => useActiveSessionRecoveryFallback(true))
    expect(result.current.fallbackRecovery).toEqual({
      sessionId: 'session-1',
      fearItemId: 'item-1',
      preSuds: 5,
      description: 'Test situation',
      startedAt: '2026-06-17T08:00:00.000Z',
    })
  })

  it('defaults description to "" and preSuds to 0 when the LEFT JOIN / subquery find nothing', () => {
    mockUseQuery.mockReturnValue({
      data: [{ ...BASE_ROW, description: null, pre_suds: null }],
      isLoading: false,
    })
    const { result } = renderHook(() => useActiveSessionRecoveryFallback(true))
    expect(result.current.fallbackRecovery).toEqual(
      expect.objectContaining({ description: '', preSuds: 0 })
    )
  })

  it('returns fallbackRecovery: null when no row is returned', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false })
    const { result } = renderHook(() => useActiveSessionRecoveryFallback(true))
    expect(result.current.fallbackRecovery).toBeNull()
  })

  it('forwards isLoading: true when useQuery returns isLoading true', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true })
    const { result } = renderHook(() => useActiveSessionRecoveryFallback(true))
    expect(result.current.isLoading).toBe(true)
  })

  it('binds an `enabled` parameter of 1 when enabled=true, at the query level', () => {
    renderHook(() => useActiveSessionRecoveryFallback(true))
    const [, params] = mockUseQuery.mock.calls[0] as [string, unknown[]]
    expect(params[1]).toBe(1)
  })

  it('binds an `enabled` parameter of 0 when enabled=false — gating happens at the WHERE clause, not by skipping the hook call', () => {
    renderHook(() => useActiveSessionRecoveryFallback(false))
    const [, params] = mockUseQuery.mock.calls[0] as [string, unknown[]]
    expect(params[1]).toBe(0)
  })

  it('binds a 24h-ago ISO cutoff as the first parameter', () => {
    const now = Date.parse('2026-06-18T08:00:00.000Z')
    jest.spyOn(Date, 'now').mockReturnValue(now)
    renderHook(() => useActiveSessionRecoveryFallback(true))
    const [, params] = mockUseQuery.mock.calls[0] as [string, unknown[]]
    expect(params[0]).toBe(new Date(now - 24 * 60 * 60 * 1000).toISOString())
    jest.restoreAllMocks()
  })

  it('recomputes the cutoff fresh on every call (not memoized once)', () => {
    const t1 = Date.parse('2026-06-18T08:00:00.000Z')
    jest.spyOn(Date, 'now').mockReturnValue(t1)
    const { rerender } = renderHook((enabled: boolean) => useActiveSessionRecoveryFallback(enabled), {
      initialProps: true,
    })
    const firstCutoff = (mockUseQuery.mock.calls[0][1] as unknown[])[0]

    const t2 = t1 + 60 * 60 * 1000 // one hour later, same mounted hook
    jest.spyOn(Date, 'now').mockReturnValue(t2)
    rerender(true)
    const secondCutoff = (mockUseQuery.mock.calls.at(-1)![1] as unknown[])[0]

    expect(secondCutoff).not.toBe(firstCutoff)
    expect(secondCutoff).toBe(new Date(t2 - 24 * 60 * 60 * 1000).toISOString())
    jest.restoreAllMocks()
  })
})
