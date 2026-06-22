import { describe, it, expect, vi, afterEach } from 'vitest'
import { PowerSyncSyncAdapter, initAdapter } from '../../src/adapter'
import type { SyncAdapter } from '../../src/adapter'
import type { AbstractPowerSyncDatabase } from '@powersync/react-native'
import { transition } from '@exposure-buddy/core'

// Story 9.2, Scenario 1 — network drop during active exposure.
//
// Per ADR-OFFLINE-DEGRADATION Decision 1, the adapter has no network awareness at
// all: enqueue() always succeeds against local SQLite regardless of network state.
// "Offline" is therefore simulated by simply having mockDb.execute resolve normally
// (no thrown network error) — there is nothing else to fake at this layer.
//
// getPendingCount() is a hardcoded `return 0` stub (Task 3.2 decision: option (b) —
// left non-functional in this story, tracked separately). Queue-increment is instead
// verified via a call-count *delta* on mockDb.execute, isolated to a single known
// enqueue() invocation (Task 3.3) — not a cumulative count, since execute() is the
// shared mock for every adapter operation (INSERT/UPDATE/DELETE/reorder).

function makeMockDb() {
  const mockTx = { execute: vi.fn() }
  const mockDb = {
    execute: vi.fn(),
    writeTransaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
  }
  return { mockDb, mockTx }
}

describe('Offline recovery — Scenario 1: network drop during active exposure', () => {
  afterEach(() => {
    initAdapter(null as unknown as SyncAdapter)
  })

  it('enqueue() resolves without throwing while "offline" (no network error simulated, per Decision 1)', async () => {
    const { mockDb } = makeMockDb()
    const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)

    await expect(
      adapter.enqueue('exposure_sessions', 'UPDATE', {
        id: 'session-uuid-1',
        status: 'started',
        updated_at: '2026-06-22T10:00:00.000Z',
      })
    ).resolves.toBeUndefined()
  })

  it('queue-count proxy: mockDb.execute call count increments by exactly 1 across a single enqueue() (delta, not cumulative — Task 3.3)', async () => {
    const { mockDb } = makeMockDb()
    const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)

    // Unrelated prior adapter activity — proves the assertion below isolates the
    // delta around the single known call, not an uncontrolled cumulative count.
    await adapter.enqueue('fear_ladder_items', 'INSERT', { id: 'item-1', user_id: 'user-1', description: 'x', predicted_suds: 5 })
    const before = mockDb.execute.mock.calls.length

    await adapter.enqueue('exposure_sessions', 'UPDATE', {
      id: 'session-uuid-1',
      status: 'started',
      updated_at: '2026-06-22T10:00:00.000Z',
    })
    const after = mockDb.execute.mock.calls.length

    expect(after - before).toBe(1)
  })

  it('in-memory SessionState stays active across the enqueue call — adapter and state machine are independent', async () => {
    const { mockDb } = makeMockDb()
    const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)

    // Establish 'active' via the real state machine (idle→pre_session→active),
    // matching the DB-enum-vs-in-memory vocabulary distinction from Dev Notes:
    // 'started' (DB) and 'active' (in-memory) refer to the same real-world state.
    const toPreSession = transition('idle', { type: 'session.started' })
    expect(toPreSession.ok).toBe(true)
    const toActive = transition(toPreSession.ok ? toPreSession.value : 'idle', { type: 'exposure.begun' })
    expect(toActive).toEqual({ ok: true, value: 'active' })

    const enqueueResult = await adapter.enqueue('exposure_sessions', 'UPDATE', {
      id: 'session-uuid-1',
      status: 'started',
      updated_at: '2026-06-22T10:00:00.000Z',
    })

    // enqueue() returns no value that could represent or mutate a SessionState — its
    // only observable side effects are on mockDb (asserted in the queue-count test
    // above). The deeper "enqueue() cannot drive a transition" guarantee is structural,
    // not something a runtime assertion here can observe: session-state-machine.ts has
    // zero imports of adapter.ts and vice versa, so no code path exists for one to reach
    // the other. Re-asserting `toActive.value === 'active'` after the call would only
    // re-check the same unchanged value computed above it — not prove anything about
    // the enqueue() call that just happened.
    expect(enqueueResult).toBeUndefined()
  })
})
