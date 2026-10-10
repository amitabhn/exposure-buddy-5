import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpdateType, type CrudEntry, type AbstractPowerSyncDatabase } from '@powersync/react-native'
import type { SupabaseClient } from '@exposure-buddy/supabase'
import { SupabasePowerSyncConnector } from '../src/connector'

// @powersync/react-native's real module requires `react-native` (Flow-typed source) —
// esbuild/vitest cannot parse it in a plain Node test environment. Mock it with just the
// runtime surface connector.ts actually uses (UpdateType's string values). Vitest hoists
// vi.mock calls above all imports, so the real module is never evaluated.
vi.mock('@powersync/react-native', () => ({
  UpdateType: { PUT: 'PUT', PATCH: 'PATCH', DELETE: 'DELETE' },
}))

function makeEntry(overrides: Partial<CrudEntry> & { id: string }): CrudEntry {
  return {
    clientId: 1,
    op: UpdateType.PATCH,
    table: 'fear_ladder_items',
    transactionId: undefined,
    opData: {},
    previousValues: undefined,
    metadata: undefined,
    ...overrides,
  } as CrudEntry
}

function makeMockSupabase() {
  const updateEq = vi.fn().mockResolvedValue({ error: null })
  const deleteEq = vi.fn().mockResolvedValue({ error: null })
  // Shared across from() calls so tests can compare invocationCallOrder with rpc/updateEq/deleteEq.
  const upsert = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn(() => ({
    update: vi.fn(() => ({ eq: updateEq })),
    delete: vi.fn(() => ({ eq: deleteEq })),
    upsert,
  }))
  const rpc = vi.fn().mockResolvedValue({ error: null })
  return { from, rpc, updateEq, deleteEq, upsert }
}

function makeMockDatabase(crud: CrudEntry[]) {
  const complete = vi.fn().mockResolvedValue(undefined)
  const getCrudBatch = vi.fn().mockResolvedValue({ crud, complete })
  return { getCrudBatch, complete }
}

describe('SupabasePowerSyncConnector.uploadData', () => {
  let supabase: ReturnType<typeof makeMockSupabase>

  beforeEach(() => {
    supabase = makeMockSupabase()
  })

  it('detects a reorder pair (2 PATCH entries sharing transactionId, fear_ladder_items, numeric position) and calls the RPC exactly once', async () => {
    const entryA = makeEntry({ id: 'item-a', transactionId: 1, opData: { position: 2 } })
    const entryB = makeEntry({ id: 'item-b', transactionId: 1, opData: { position: 1 } })
    const db = makeMockDatabase([entryA, entryB])
    const connector = new SupabasePowerSyncConnector(supabase as unknown as SupabaseClient)

    await connector.uploadData(db as unknown as AbstractPowerSyncDatabase)

    expect(supabase.rpc).toHaveBeenCalledTimes(1)
    expect(supabase.rpc).toHaveBeenCalledWith('swap_ladder_positions', {
      p_item_a_id: 'item-a',
      p_item_a_new_position: 2,
      p_item_b_id: 'item-b',
      p_item_b_new_position: 1,
    })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(db.complete).toHaveBeenCalledOnce()
  })

  it('two PATCH entries with different transactionIds go through the normal per-entry update path, RPC not called', async () => {
    const entryA = makeEntry({ id: 'item-a', transactionId: 1, opData: { position: 2 } })
    const entryB = makeEntry({ id: 'item-b', transactionId: 2, opData: { position: 1 } })
    const db = makeMockDatabase([entryA, entryB])
    const connector = new SupabasePowerSyncConnector(supabase as unknown as SupabaseClient)

    await connector.uploadData(db as unknown as AbstractPowerSyncDatabase)

    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledTimes(2)
  })

  it('a DELETE entry goes through the existing delete path (now covered)', async () => {
    const entry = makeEntry({ id: 'item-a', op: UpdateType.DELETE, opData: undefined })
    const db = makeMockDatabase([entry])
    const connector = new SupabasePowerSyncConnector(supabase as unknown as SupabaseClient)

    await connector.uploadData(db as unknown as AbstractPowerSyncDatabase)

    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledWith('fear_ladder_items')
    expect(supabase.deleteEq).toHaveBeenCalledWith('id', 'item-a')
  })

  it('3 entries sharing a transactionId fall through entirely to per-entry upload, RPC not called', async () => {
    const entryA = makeEntry({ id: 'item-a', transactionId: 1, opData: { position: 1 } })
    const entryB = makeEntry({ id: 'item-b', transactionId: 1, opData: { position: 2 } })
    const entryC = makeEntry({ id: 'item-c', transactionId: 1, opData: { position: 3 } })
    const db = makeMockDatabase([entryA, entryB, entryC])
    const connector = new SupabasePowerSyncConnector(supabase as unknown as SupabaseClient)

    await connector.uploadData(db as unknown as AbstractPowerSyncDatabase)

    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledTimes(3)
  })

  it('a mixed DELETE+PATCH group sharing a transactionId falls through entirely to per-entry upload, RPC not called', async () => {
    const entryA = makeEntry({ id: 'item-a', transactionId: 1, op: UpdateType.PATCH, opData: { position: 1 } })
    const entryB = makeEntry({ id: 'item-b', transactionId: 1, op: UpdateType.DELETE, opData: undefined })
    const db = makeMockDatabase([entryA, entryB])
    const connector = new SupabasePowerSyncConnector(supabase as unknown as SupabaseClient)

    await connector.uploadData(db as unknown as AbstractPowerSyncDatabase)

    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['string', { position: 'two' }],
    ['null', { position: null }],
    ['missing', {}],
  ])('a malformed opData.position (%s) falls through to per-entry upload, RPC not called', async (_label, opData) => {
    const entryA = makeEntry({ id: 'item-a', transactionId: 1, opData })
    const entryB = makeEntry({ id: 'item-b', transactionId: 1, opData: { position: 1 } })
    const db = makeMockDatabase([entryA, entryB])
    const connector = new SupabasePowerSyncConnector(supabase as unknown as SupabaseClient)

    await connector.uploadData(db as unknown as AbstractPowerSyncDatabase)

    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledTimes(2)
  })

  it('a non-retryable RPC error (item not found) does not throw a batch-wide retry', async () => {
    supabase.rpc.mockResolvedValueOnce({ error: { message: 'swap_ladder_positions: one or both items not found' } })
    const entryA = makeEntry({ id: 'item-a', transactionId: 1, opData: { position: 2 } })
    const entryB = makeEntry({ id: 'item-b', transactionId: 1, opData: { position: 1 } })
    const db = makeMockDatabase([entryA, entryB])
    const connector = new SupabasePowerSyncConnector(supabase as unknown as SupabaseClient)

    await expect(connector.uploadData(db as unknown as AbstractPowerSyncDatabase)).resolves.not.toThrow()
    expect(db.complete).toHaveBeenCalledOnce()
  })

  it('a non-retryable RPC error (not owned) does not throw a batch-wide retry', async () => {
    supabase.rpc.mockResolvedValueOnce({ error: { message: 'swap_ladder_positions: auth.uid() does not own both items' } })
    const entryA = makeEntry({ id: 'item-a', transactionId: 1, opData: { position: 2 } })
    const entryB = makeEntry({ id: 'item-b', transactionId: 1, opData: { position: 1 } })
    const db = makeMockDatabase([entryA, entryB])
    const connector = new SupabasePowerSyncConnector(supabase as unknown as SupabaseClient)

    await expect(connector.uploadData(db as unknown as AbstractPowerSyncDatabase)).resolves.not.toThrow()
  })

  it('a non-retryable RPC error (must differ) does not throw a batch-wide retry', async () => {
    supabase.rpc.mockResolvedValueOnce({ error: { message: 'swap_ladder_positions: item_a and item_b must differ' } })
    const entryA = makeEntry({ id: 'item-a', transactionId: 1, opData: { position: 2 } })
    const entryB = makeEntry({ id: 'item-b', transactionId: 1, opData: { position: 1 } })
    const db = makeMockDatabase([entryA, entryB])
    const connector = new SupabasePowerSyncConnector(supabase as unknown as SupabaseClient)

    await expect(connector.uploadData(db as unknown as AbstractPowerSyncDatabase)).resolves.not.toThrow()
  })

  it('a retryable RPC error (network failure) throws to preserve batch retry', async () => {
    supabase.rpc.mockResolvedValueOnce({ error: { message: 'network timeout' } })
    const entryA = makeEntry({ id: 'item-a', transactionId: 1, opData: { position: 2 } })
    const entryB = makeEntry({ id: 'item-b', transactionId: 1, opData: { position: 1 } })
    const db = makeMockDatabase([entryA, entryB])
    const connector = new SupabasePowerSyncConnector(supabase as unknown as SupabaseClient)

    await expect(connector.uploadData(db as unknown as AbstractPowerSyncDatabase)).rejects.toEqual({ message: 'network timeout' })
  })

  describe('upload order follows ps_crud order (Story 19.6)', () => {
    const put = (id: string, transactionId: number) =>
      makeEntry({ id, op: UpdateType.PUT, transactionId, opData: { position: 1 } })
    const swapPair = (transactionId: number, a = 'item-a', b = 'item-b') => [
      makeEntry({ id: a, transactionId, opData: { position: 2 } }),
      makeEntry({ id: b, transactionId, opData: { position: 1 } }),
    ]
    const run = (supabaseMock: ReturnType<typeof makeMockSupabase>, crud: CrudEntry[]) => {
      const db = makeMockDatabase(crud)
      const connector = new SupabasePowerSyncConnector(supabaseMock as unknown as SupabaseClient)
      return { db, result: connector.uploadData(db as unknown as AbstractPowerSyncDatabase) }
    }

    it('uploads both inserts before the swap that depends on them (same batch)', async () => {
      const { db, result } = run(supabase, [put('item-a', 1), put('item-b', 2), ...swapPair(3)])
      await result

      expect(supabase.upsert).toHaveBeenCalledTimes(2)
      expect(supabase.rpc).toHaveBeenCalledOnce()
      const lastUpsert = Math.max(...supabase.upsert.mock.invocationCallOrder)
      expect(lastUpsert).toBeLessThan(supabase.rpc.mock.invocationCallOrder[0]!)
      expect(db.complete).toHaveBeenCalledOnce()
    })

    it('does not call the swap, nor complete the batch, when an earlier insert fails (swap stays queued)', async () => {
      supabase.upsert.mockResolvedValueOnce({ error: { message: 'insert rejected' } })
      const { db, result } = run(supabase, [put('item-a', 1), put('item-b', 2), ...swapPair(3)])

      await expect(result).rejects.toEqual({ message: 'insert rejected' })
      expect(supabase.rpc).not.toHaveBeenCalled()
      expect(db.complete).not.toHaveBeenCalled()
    })

    it('a swap whose items were deleted elsewhere is logged and skipped, batch still completes (synthetic: delete before swap)', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      supabase.rpc.mockResolvedValueOnce({ error: { message: 'swap_ladder_positions: one or both items not found' } })
      const del = makeEntry({ id: 'item-a', op: UpdateType.DELETE, transactionId: 3, opData: undefined })
      const { db, result } = run(supabase, [put('item-a', 1), put('item-b', 2), del, ...swapPair(4)])

      await expect(result).resolves.not.toThrow()
      expect(supabase.deleteEq.mock.invocationCallOrder[0]).toBeLessThan(supabase.rpc.mock.invocationCallOrder[0]!)
      expect(consoleError).toHaveBeenCalled()
      expect(db.complete).toHaveBeenCalledOnce()
      consoleError.mockRestore()
    })

    it('two swaps with a PATCH between them execute in original order', async () => {
      const patch = makeEntry({ id: 'item-a', transactionId: 3, opData: { description: 'edited' } })
      const { result } = run(supabase, [...swapPair(1), patch, ...swapPair(2, 'item-c', 'item-d')])
      await result

      expect(supabase.rpc).toHaveBeenCalledTimes(2)
      const [firstSwap, secondSwap] = supabase.rpc.mock.invocationCallOrder as [number, number]
      expect(firstSwap).toBeLessThan(supabase.updateEq.mock.invocationCallOrder[0]!)
      expect(supabase.updateEq.mock.invocationCallOrder[0]!).toBeLessThan(secondSwap)
    })

    it('a non-pair group is not regrouped: its members stay in place around other transactions', async () => {
      const g1 = makeEntry({ id: 'g-1', transactionId: 1, op: UpdateType.PUT, opData: {} })
      const other = makeEntry({ id: 'other', transactionId: 2, op: UpdateType.DELETE, opData: undefined })
      const g2 = makeEntry({ id: 'g-2', transactionId: 1, op: UpdateType.PATCH, opData: { position: 1 } })
      const g3 = makeEntry({ id: 'g-3', transactionId: 1, op: UpdateType.PATCH, opData: { position: 2 } })
      const { result } = run(supabase, [g1, other, g2, g3])
      await result

      const upsertOrder = supabase.upsert.mock.invocationCallOrder[0]!
      const deleteOrder = supabase.deleteEq.mock.invocationCallOrder[0]!
      const patchOrders = supabase.updateEq.mock.invocationCallOrder
      expect(upsertOrder).toBeLessThan(deleteOrder)
      expect(deleteOrder).toBeLessThan(patchOrders[0]!)
    })
  })
})
