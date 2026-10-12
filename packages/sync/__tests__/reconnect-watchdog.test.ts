import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { watchStalledConnection, STALL_MS } from '../src/reconnect-watchdog'

describe('watchStalledConnection (Story 19.7)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const setup = (connected: boolean) => {
    const db = { currentStatus: { connected } }
    const reconnect = vi.fn()
    const stop = watchStalledConnection(db as never, reconnect, () => Date.now())
    return { db, reconnect, stop }
  }

  it('reconnects once the stream has been disconnected for STALL_MS', () => {
    const { reconnect } = setup(false)
    vi.advanceTimersByTime(STALL_MS - 5_000)
    expect(reconnect).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10_000)
    expect(reconnect).toHaveBeenCalledTimes(1)
  })

  it('keeps retrying every STALL_MS while still disconnected', () => {
    const { reconnect } = setup(false)
    vi.advanceTimersByTime(STALL_MS * 3 + 5_000)
    expect(reconnect).toHaveBeenCalledTimes(3)
  })

  it('never reconnects while connected, and a reconnect resets the timer', () => {
    const { db, reconnect } = setup(true)
    vi.advanceTimersByTime(STALL_MS * 2)
    expect(reconnect).not.toHaveBeenCalled()
    db.currentStatus.connected = false
    vi.advanceTimersByTime(STALL_MS - 5_000)
    db.currentStatus.connected = true
    vi.advanceTimersByTime(10_000)
    db.currentStatus.connected = false
    vi.advanceTimersByTime(STALL_MS - 5_000)
    expect(reconnect).not.toHaveBeenCalled()
  })

  it('stops when disposed', () => {
    const { reconnect, stop } = setup(false)
    stop()
    vi.advanceTimersByTime(STALL_MS * 2)
    expect(reconnect).not.toHaveBeenCalled()
  })
})
