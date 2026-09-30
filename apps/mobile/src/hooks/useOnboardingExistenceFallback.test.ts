import { renderHook } from '@testing-library/react-native'
import { useOnboardingExistenceFallback } from './useOnboardingExistenceFallback'

const mockUseQuery = jest.fn()

jest.mock('@exposure-buddy/sync', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

describe('useOnboardingExistenceFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseQuery.mockReturnValue({ data: [], isLoading: false })
  })

  it('returns { hasExistingAccountData, isLoading } — not an array', () => {
    const { result } = renderHook(() => useOnboardingExistenceFallback(true))
    expect(result.current).toHaveProperty('hasExistingAccountData')
    expect(result.current).toHaveProperty('isLoading')
    expect(Array.isArray(result.current)).toBe(false)
  })

  // I/O matrix row 1: reinstall, existing account — replica has >=1 fear_ladder_items row.
  it('reports hasExistingAccountData: true when the replica returns at least one row', () => {
    mockUseQuery.mockReturnValue({ data: [{ id: 'item-1' }], isLoading: false })
    const { result } = renderHook(() => useOnboardingExistenceFallback(true))
    expect(result.current.hasExistingAccountData).toBe(true)
  })

  // I/O matrix row 2: genuine new signup — replica correctly has zero rows.
  it('reports hasExistingAccountData: false when the replica returns zero rows', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false })
    const { result } = renderHook(() => useOnboardingExistenceFallback(true))
    expect(result.current.hasExistingAccountData).toBe(false)
  })

  it('treats an undefined data result as no existing account data', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true })
    const { result } = renderHook(() => useOnboardingExistenceFallback(true))
    expect(result.current.hasExistingAccountData).toBe(false)
  })

  it('forwards isLoading: true when useQuery returns isLoading true', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true })
    const { result } = renderHook(() => useOnboardingExistenceFallback(true))
    expect(result.current.isLoading).toBe(true)
  })

  // I/O matrix row 3: already onboarded — caller gates enabled=false; query still runs
  // (hooks are unconditional) but binds enabled=0 at the WHERE-clause level.
  it('binds an `enabled` parameter of 1 when enabled=true, at the query level', () => {
    renderHook(() => useOnboardingExistenceFallback(true))
    const [, params] = mockUseQuery.mock.calls[0] as [string, unknown[]]
    expect(params[0]).toBe(1)
  })

  it('binds an `enabled` parameter of 0 when enabled=false — gating happens at the WHERE clause, not by skipping the hook call', () => {
    renderHook(() => useOnboardingExistenceFallback(false))
    const [, params] = mockUseQuery.mock.calls[0] as [string, unknown[]]
    expect(params[0]).toBe(0)
  })

  it('queries fear_ladder_items with no user_id filter (PowerSync sync-rule scoping already restricts the replica per-user)', () => {
    renderHook(() => useOnboardingExistenceFallback(true))
    const [query] = mockUseQuery.mock.calls[0] as [string, unknown[]]
    expect(query).toContain('fear_ladder_items')
    expect(query).not.toMatch(/user_id/i)
  })
})
