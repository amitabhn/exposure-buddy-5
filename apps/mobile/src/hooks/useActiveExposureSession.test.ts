import { renderHook } from '@testing-library/react-native'
import { useActiveExposureSession } from './useActiveExposureSession'

const mockUseQuery = jest.fn()

jest.mock('@exposure-buddy/sync', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

const BASE_ROW = {
  id: 'session-1',
  fear_item_id: 'item-1',
  started_at: '2026-06-17T08:00:00.000Z',
}

describe('useActiveExposureSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseQuery.mockReturnValue({ data: [BASE_ROW], isLoading: false })
  })

  it('returns { activeSession, isLoading } — not an array', () => {
    const { result } = renderHook(() => useActiveExposureSession(null))
    expect(result.current).toHaveProperty('activeSession')
    expect(result.current).toHaveProperty('isLoading')
    expect(Array.isArray(result.current)).toBe(false)
  })

  it('maps row snake_case fields to camelCase fields', () => {
    const { result } = renderHook(() => useActiveExposureSession(null))
    expect(result.current.activeSession).toEqual({
      id: 'session-1',
      fearItemId: 'item-1',
      startedAt: '2026-06-17T08:00:00.000Z',
    })
  })

  it('returns activeSession: null when no row is returned', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false })
    const { result } = renderHook(() => useActiveExposureSession(null))
    expect(result.current.activeSession).toBeNull()
  })

  it('forwards isLoading: true when useQuery returns isLoading true', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true })
    const { result } = renderHook(() => useActiveExposureSession(null))
    expect(result.current.isLoading).toBe(true)
  })
})
