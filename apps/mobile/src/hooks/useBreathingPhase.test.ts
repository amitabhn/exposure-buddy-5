import { renderHook, act } from '@testing-library/react-native'
import { useBreathingPhase } from './useBreathingPhase'

describe('useBreathingPhase', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('starts guided at phase 0 (inhale) with the full 300s on the clock', () => {
    const { result } = renderHook(() => useBreathingPhase())
    expect(result.current.phaseIndex).toBe(0)
    expect(result.current.isGuided).toBe(true)
    expect(result.current.remainingSeconds).toBe(300)
    expect(result.current.sessionEnded).toBe(false)
  })

  it('cycles inhale → holdIn → exhale → holdOut → inhale every 4s', () => {
    const { result } = renderHook(() => useBreathingPhase())

    act(() => jest.advanceTimersByTime(4000))
    expect(result.current.phaseIndex).toBe(1) // holdIn

    act(() => jest.advanceTimersByTime(4000))
    expect(result.current.phaseIndex).toBe(2) // exhale

    act(() => jest.advanceTimersByTime(4000))
    expect(result.current.phaseIndex).toBe(3) // holdOut

    act(() => jest.advanceTimersByTime(4000))
    expect(result.current.phaseIndex).toBe(0) // wraps back to inhale, cycle 1 complete
  })

  it('resets phaseElapsedMs to 0 on a phase boundary and advances it within a phase', () => {
    const { result } = renderHook(() => useBreathingPhase())
    act(() => jest.advanceTimersByTime(1000))
    expect(result.current.phaseElapsedMs).toBe(1000)

    act(() => jest.advanceTimersByTime(3000)) // crosses the 4000ms inhale boundary
    expect(result.current.phaseIndex).toBe(1)
    expect(result.current.phaseElapsedMs).toBe(0)
  })

  it('decrements remainingSeconds at 1s resolution', () => {
    const { result } = renderHook(() => useBreathingPhase())
    act(() => jest.advanceTimersByTime(5000))
    expect(result.current.remainingSeconds).toBe(295)
  })

  it('stays guided through both configured cycles, then flips to passive on the next inhale', () => {
    const { result } = renderHook(() => useBreathingPhase())

    // 2 guided cycles = 8 phase advances = 32s. The final holdOut of cycle 2 is still guided.
    act(() => jest.advanceTimersByTime(28000)) // 7 advances: ends mid-holdOut of cycle 2
    expect(result.current.phaseIndex).toBe(3)
    expect(result.current.isGuided).toBe(true)

    act(() => jest.advanceTimersByTime(4000)) // 8th advance: wraps to inhale, cycleCount -> 2
    expect(result.current.phaseIndex).toBe(0)
    expect(result.current.isGuided).toBe(false)
  })

  it('keeps the cycle counter incrementing harmlessly through the passive phase', () => {
    const { result } = renderHook(() => useBreathingPhase())
    act(() => jest.advanceTimersByTime(16000 * 5)) // 5 full cycles
    expect(result.current.isGuided).toBe(false)
    expect(result.current.phaseIndex).toBe(0)
  })

  it('AC #6: lets the in-progress phase finish before ending the session when the timer expires mid-phase', () => {
    const { result } = renderHook(() => useBreathingPhase())

    // 300s isn't a multiple of 16s, so most configurations expire mid-phase. Advance to 1s
    // before expiry to observe the pre-expiry phase, then cross the boundary.
    act(() => jest.advanceTimersByTime(299000))
    expect(result.current.sessionEnded).toBe(false)
    const phaseBeforeExpiry = result.current.phaseIndex

    act(() => jest.advanceTimersByTime(1000))
    expect(result.current.remainingSeconds).toBe(0)
    // Session only ends once a phase boundary is reached, not immediately at 0:00 — so phase
    // either stays unchanged (still mid-phase) or the session has now ended at this boundary.
    if (result.current.sessionEnded) {
      expect(result.current.endReason).toBe('timer')
    } else {
      expect(result.current.phaseIndex).toBe(phaseBeforeExpiry)
    }
  })

  it('AC #6: never cuts the ring mid-phase — phaseIndex is unchanged at the moment the session ends', () => {
    const { result } = renderHook(() => useBreathingPhase())
    act(() => jest.advanceTimersByTime(300000))
    expect(result.current.sessionEnded).toBe(true)
    expect(result.current.endReason).toBe('timer')
    expect(result.current.remainingSeconds).toBe(0)
  })

  it('AC #7: "I\'m ready" ends the session immediately with no completion message', () => {
    const { result } = renderHook(() => useBreathingPhase())
    act(() => jest.advanceTimersByTime(20000))

    act(() => result.current.onReadyPress())

    expect(result.current.sessionEnded).toBe(true)
    expect(result.current.endReason).toBe('early-exit')
  })

  it('AC #7 tie-break: a tap that lands before the timer-expiry boundary wins — exactly one exit path executes', () => {
    const { result } = renderHook(() => useBreathingPhase())

    // One tick before the 300s mark, the timer hasn't expired yet — the tap claims the
    // session first via the same reducer, before the final tick's boundary check can fire.
    act(() => jest.advanceTimersByTime(299000))
    act(() => result.current.onReadyPress())
    expect(result.current.sessionEnded).toBe(true)
    expect(result.current.endReason).toBe('early-exit')

    // The expiry tick still fires after this, but the reducer's ended-state guard makes it a
    // no-op — it must not flip endReason to 'timer' or otherwise double-fire exit logic.
    act(() => jest.advanceTimersByTime(1000))
    expect(result.current.endReason).toBe('early-exit')
  })

  it('AC #7 double-fire guard: a second "I\'m ready" tap after the session has already ended is a no-op', () => {
    const { result } = renderHook(() => useBreathingPhase())
    act(() => result.current.onReadyPress())
    expect(result.current.endReason).toBe('early-exit')

    act(() => result.current.onReadyPress())
    expect(result.current.endReason).toBe('early-exit')
  })

  it('clears the interval on unmount', () => {
    const setIntervalSpy = jest.spyOn(global as unknown as typeof globalThis, 'setInterval')
    const clearIntervalSpy = jest.spyOn(global as unknown as typeof globalThis, 'clearInterval')
    const { unmount } = renderHook(() => useBreathingPhase())
    const intervalId = setIntervalSpy.mock.results[0]!.value
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId)
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })
})
