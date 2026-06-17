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
  const from = vi.fn(() => ({
    update: vi.fn(() => ({ eq: updateEq })),
    delete: vi.fn(() => ({ eq: deleteEq })),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  }))
  const rpc = vi.fn().mockResolvedValue({ error: null })
  return { from, rpc, updateEq, deleteEq }
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
})
