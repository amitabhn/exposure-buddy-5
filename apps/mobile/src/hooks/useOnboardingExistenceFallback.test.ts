import { renderHook, act, waitFor } from '@testing-library/react-native'
import { useOnboardingExistenceFallback, SYNC_WAIT_TIMEOUT_MS } from './useOnboardingExistenceFallback'

const mockUseQuery = jest.fn()
const mockUseStatus = jest.fn()
const mockGetAll = jest.fn()
const mockDb = { getAll: (...args: unknown[]) => mockGetAll(...args) }

jest.mock('@exposure-buddy/sync', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useStatus: (...args: unknown[]) => mockUseStatus(...args),
  usePowerSync: () => mockDb,
}))

describe('useOnboardingExistenceFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, isFetching: false })
    mockUseStatus.mockReturnValue({ hasSynced: true })
    mockGetAll.mockResolvedValue([])
  })

  it('returns { hasExistingAccountData, isLoading, isDecided } — not an array', () => {
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

  // Story 18.7 on-device finding: after a reinstall the replica is empty until the first sync
  // completes, so "zero rows" is only trustworthy once hasSynced is true.
  describe('isDecided', () => {
    afterEach(() => {
      jest.useRealTimers()
    })

    it('is false while the first sync has not completed, even though the query returned zero rows', () => {
      mockUseStatus.mockReturnValue({ hasSynced: false })
      const { result } = renderHook(() => useOnboardingExistenceFallback(true))
      expect(result.current.hasExistingAccountData).toBe(false)
      expect(result.current.isDecided).toBe(false)
    })

    it('is false when hasSynced is not yet known (undefined)', () => {
      mockUseStatus.mockReturnValue({ hasSynced: undefined })
      const { result } = renderHook(() => useOnboardingExistenceFallback(true))
      expect(result.current.isDecided).toBe(false)
    })

    it('is true once the first sync has completed and the authoritative local read answers empty (genuine new account)', async () => {
      mockGetAll.mockResolvedValue([])
      const { result } = renderHook(() => useOnboardingExistenceFallback(true))
      await waitFor(() => expect(result.current.isDecided).toBe(true))
      expect(result.current.hasExistingAccountData).toBe(false)
    })

    // On-device finding: hasSynced flipped true while the reactive watched query still showed
    // zero rows — the one-shot local read is what catches the freshly synced rows.
    it('reinstall race: reactive query still empty after first sync, but the authoritative read finds rows -> hit', async () => {
      mockUseQuery.mockReturnValue({ data: [], isLoading: false, isFetching: false })
      mockGetAll.mockResolvedValue([{ id: 'item-1' }])
      const { result } = renderHook(() => useOnboardingExistenceFallback(true))
      await waitFor(() => expect(result.current.hasExistingAccountData).toBe(true))
      expect(result.current.isDecided).toBe(true)
    })

    it('stays undecided after the first sync until the authoritative read has answered', () => {
      mockGetAll.mockReturnValue(new Promise(() => {}))
      const { result } = renderHook(() => useOnboardingExistenceFallback(true))
      expect(result.current.isDecided).toBe(false)
    })

    it('does not run the authoritative read before the first sync completes', () => {
      mockUseStatus.mockReturnValue({ hasSynced: false })
      renderHook(() => useOnboardingExistenceFallback(true))
      expect(mockGetAll).not.toHaveBeenCalled()
    })

    it('a failed authoritative read does not decide — the timeout still releases the hold', async () => {
      jest.useFakeTimers()
      mockGetAll.mockRejectedValue(new Error('db closed'))
      const { result } = renderHook(() => useOnboardingExistenceFallback(true))
      await act(async () => {})
      expect(result.current.isDecided).toBe(false)
      act(() => {
        jest.advanceTimersByTime(SYNC_WAIT_TIMEOUT_MS)
      })
      expect(result.current.isDecided).toBe(true)
    })

    it('is true immediately on a hit, without waiting for the first sync to be reported', () => {
      mockUseStatus.mockReturnValue({ hasSynced: false })
      mockUseQuery.mockReturnValue({ data: [{ id: 'item-1' }], isLoading: false, isFetching: false })
      const { result } = renderHook(() => useOnboardingExistenceFallback(true))
      expect(result.current.isDecided).toBe(true)
    })

    it('becomes true after SYNC_WAIT_TIMEOUT_MS when sync never completes (offline) so the user is never trapped', () => {
      jest.useFakeTimers()
      mockUseStatus.mockReturnValue({ hasSynced: false })
      const { result } = renderHook(() => useOnboardingExistenceFallback(true))
      expect(result.current.isDecided).toBe(false)
      act(() => {
        jest.advanceTimersByTime(SYNC_WAIT_TIMEOUT_MS)
      })
      expect(result.current.isDecided).toBe(true)
      expect(result.current.hasExistingAccountData).toBe(false)
    })

    it('does not start the timeout while disabled', () => {
      jest.useFakeTimers()
      mockUseStatus.mockReturnValue({ hasSynced: false })
      const { result } = renderHook(() => useOnboardingExistenceFallback(false))
      act(() => {
        jest.advanceTimersByTime(SYNC_WAIT_TIMEOUT_MS * 2)
      })
      expect(result.current.isDecided).toBe(false)
    })
  })
})
