import { renderHook } from '@testing-library/react-native'
import { useFearLadderItems } from './useFearLadderItems'

const mockUseQuery = jest.fn()

jest.mock('@exposure-buddy/sync', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}))

const BASE_ROW = {
  id: '1',
  description: 'Fear A',
  predicted_suds: 5,
  peak_suds: null,
  position: 1,
  status: 'pending',
}

describe('useFearLadderItems', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseQuery.mockReturnValue({ data: [BASE_ROW], isLoading: false })
  })

  it('returns { items, isLoading } — not an array', () => {
    const { result } = renderHook(() => useFearLadderItems(null))
    expect(result.current).toHaveProperty('items')
    expect(result.current).toHaveProperty('isLoading')
    expect(Array.isArray(result.current)).toBe(false)
  })

  it('maps row snake_case fields to FearLadderItem camelCase fields', () => {
    const { result } = renderHook(() => useFearLadderItems(null))
    const item = result.current.items.at(0)
    expect(item?.id).toBe('1')
    expect(item?.description).toBe('Fear A')
    expect(item?.predictedSuds).toBe(5)
    expect(item?.position).toBe(1)
    expect(item?.status).toBe('pending')
  })

  it('maps peak_suds null to peakSuds null (not 0 or undefined)', () => {
    const { result } = renderHook(() => useFearLadderItems(null))
    expect(result.current.items.at(0)?.peakSuds).toBeNull()
  })

  it('forwards isLoading: true when useQuery returns isLoading true', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true })
    const { result } = renderHook(() => useFearLadderItems(null))
    expect(result.current.isLoading).toBe(true)
  })

  it('filters rows with unexpected status and emits console.warn', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockUseQuery.mockReturnValue({
      data: [
        { ...BASE_ROW, id: '2', status: 'in_progress' },
        { ...BASE_ROW, id: '3', status: 'pending' },
      ],
      isLoading: false,
    })
    const { result } = renderHook(() => useFearLadderItems(null))
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items.at(0)?.id).toBe('3')
    expect(warnSpy).toHaveBeenCalledWith(
      '[useFearLadderItems] filtering row with unexpected status:',
      'in_progress',
      '2',
    )
    warnSpy.mockRestore()
  })

  it('passes through valid completed status', () => {
    mockUseQuery.mockReturnValue({
      data: [{ ...BASE_ROW, status: 'completed' }],
      isLoading: false,
    })
    const { result } = renderHook(() => useFearLadderItems(null))
    expect(result.current.items.at(0)?.status).toBe('completed')
  })
})
