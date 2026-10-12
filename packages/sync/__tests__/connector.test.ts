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

let nextClientId = 1

// Real ps_crud clientIds are unique per entry; the connector keys its retry counter on them.
function makeEntry(overrides: Partial<CrudEntry> & { id: string }): CrudEntry {
  return {
    clientId: nextClientId++,
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
  const getSession = vi.fn().mockResolvedValue({
    data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600 } },
  })
  return { from, rpc, updateEq, deleteEq, upsert, auth: { getSession } }
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

    it('a swap whose items were deleted elsewhere is dropped and reported, batch still completes (synthetic: delete before swap)', async () => {
      supabase.rpc.mockResolvedValueOnce({ error: { message: 'swap_ladder_positions: one or both items not found' } })
      const del = makeEntry({ id: 'item-a', op: UpdateType.DELETE, transactionId: 3, opData: undefined })
      const { db, result } = run(supabase, [put('item-a', 1), put('item-b', 2), del, ...swapPair(4)])

      await expect(result).resolves.toBeUndefined()
      expect(supabase.rpc).toHaveBeenCalledOnce()
      expect(supabase.deleteEq.mock.invocationCallOrder[0]).toBeLessThan(supabase.rpc.mock.invocationCallOrder[0]!)
      expect(db.complete).toHaveBeenCalledOnce()
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
      expect(patchOrders).toHaveLength(2)
      expect(deleteOrder).toBeLessThan(patchOrders[0]!)
      expect(patchOrders[0]!).toBeLessThan(patchOrders[1]!)
    })
  })
})

describe('permanent rejections (Story 19.7)', () => {
  let supabase: ReturnType<typeof makeMockSupabase>
  let report: ReturnType<typeof vi.fn>
  let notice: ReturnType<typeof vi.fn>

  beforeEach(() => {
    supabase = makeMockSupabase()
    report = vi.fn()
    notice = vi.fn()
  })

  const put = (id: string, table = 'fear_ladder_items') =>
    makeEntry({ id, op: UpdateType.PUT, table, opData: { position: 1 } })
  const uniqueViolation = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "uq_user_position"',
    details: 'Key (user_id, position)=(11111111-2222-3333-4444-555555555555, 1) already exists.',
  }
  const connectorFor = () =>
    new SupabasePowerSyncConnector(supabase as unknown as SupabaseClient, report, notice)
  const upload = (connector: SupabasePowerSyncConnector, db: ReturnType<typeof makeMockDatabase>) =>
    connector.uploadData(db as unknown as AbstractPowerSyncDatabase)

  it('throws on attempts 1-4 and drops on the 5th; valid writes after it upload and the batch completes', async () => {
    const bad = put('bad')
    const good1 = put('good-1')
    const good2 = put('good-2')
    supabase.upsert.mockImplementation(async (row: { id: string }) =>
      ({ error: row.id === 'bad' ? uniqueViolation : null }))
    const db = makeMockDatabase([bad, good1, good2])
    const connector = connectorFor()

    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(upload(connector, db)).rejects.toEqual(uniqueViolation)
    }
    expect(db.complete).not.toHaveBeenCalled()
    expect(report).not.toHaveBeenCalled()

    await expect(upload(connector, db)).resolves.toBeUndefined()
    expect(db.complete).toHaveBeenCalledOnce()
    expect(report).toHaveBeenCalledOnce()
    expect(report).toHaveBeenCalledWith({
      table: 'fear_ladder_items',
      op: 'PUT',
      code: '23505',
      constraint: 'uq_user_position',
      level: 'warning',
    })
    expect(notice).toHaveBeenCalledOnce()
  })

  it('does not drop on a transient failure: network error, 5xx, 401, 429, 40001, PGRST204, unknown 4xx, unclassified', async () => {
    const errors = [
      { message: 'TypeError: Network request failed', code: '' },
      { message: 'bad gateway', code: '502' },
      { message: 'JWT expired', code: 'PGRST301' },
      { message: 'unauthorized', code: '401' },
      { message: 'too many requests', code: '429' },
      { message: 'serialization failure', code: '40001' },
      { message: 'column not in schema cache', code: 'PGRST204' },
      { message: 'bad request', code: '400' },
      { message: 'who knows' },
    ]
    for (const error of errors) {
      const entry = put(`item-${error.code ?? 'none'}`)
      supabase.upsert.mockResolvedValue({ error })
      const db = makeMockDatabase([entry])
      const connector = connectorFor()
      for (let attempt = 1; attempt <= 8; attempt++) {
        await expect(upload(connector, db)).rejects.toEqual(error)
      }
      expect(db.complete).not.toHaveBeenCalled()
    }
    expect(report).not.toHaveBeenCalled()
    expect(notice).not.toHaveBeenCalled()
  })

  it('drops a 23503 child on the first rejection and uploads later writes', async () => {
    const child = put('reading-1', 'exposure_sessions')
    const later = put('later')
    supabase.upsert.mockImplementation(async (row: { id: string }) => ({
      error: row.id === 'reading-1'
        ? { code: '23503', message: 'insert or update on table "exposure_sessions" violates foreign key constraint "exposure_sessions_fear_item_id_fkey"' }
        : null,
    }))
    const db = makeMockDatabase([child, later])

    await expect(upload(connectorFor(), db)).resolves.toBeUndefined()
    expect(supabase.upsert).toHaveBeenCalledTimes(2)
    expect(db.complete).toHaveBeenCalledOnce()
    expect(report).toHaveBeenCalledWith(expect.objectContaining({
      table: 'exposure_sessions', code: '23503', constraint: 'exposure_sessions_fear_item_id_fkey',
    }))
  })

  it('42501 with a valid session is bounded then dropped; a DELETE is reported at error level', async () => {
    const del = makeEntry({ id: 'item-x', op: UpdateType.DELETE, opData: undefined })
    supabase.deleteEq.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } })
    const db = makeMockDatabase([del])
    const connector = connectorFor()

    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(upload(connector, db)).rejects.toMatchObject({ code: '42501' })
    }
    await expect(upload(connector, db)).resolves.toBeUndefined()
    expect(report).toHaveBeenCalledWith({
      table: 'fear_ladder_items', op: 'DELETE', code: '42501', level: 'error',
    })
    expect(notice).toHaveBeenCalledOnce()
  })

  it('42501 without a valid session is transient and never counts toward the drop', async () => {
    supabase.upsert.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } })
    const connector = connectorFor()
    const db = makeMockDatabase([put('item-a')])

    for (const session of [null, {}, { expires_at: Math.floor(Date.now() / 1000) - 10 }]) {
      supabase.auth.getSession.mockResolvedValue({ data: { session } })
      for (let attempt = 1; attempt <= 8; attempt++) {
        await expect(upload(connector, db)).rejects.toMatchObject({ code: '42501' })
      }
    }
    expect(report).not.toHaveBeenCalled()
  })

  it('a write that succeeds after transient failures reports nothing and shows no notice', async () => {
    supabase.upsert
      .mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key value violates unique constraint "uq_user_position"' } })
      .mockResolvedValue({ error: null })
    const connector = connectorFor()
    const db = makeMockDatabase([put('item-a')])

    await expect(upload(connector, db)).rejects.toMatchObject({ code: '23505' })
    await expect(upload(connector, db)).resolves.toBeUndefined()
    expect(db.complete).toHaveBeenCalledOnce()
    expect(report).not.toHaveBeenCalled()
    expect(notice).not.toHaveBeenCalled()
  })

  it('reports a parent and three 23503 children as 4 reports and 1 notice', async () => {
    const parent = put('parent')
    const children = [put('c1', 'exposure_sessions'), put('c2', 'exposure_sessions'), put('c3', 'exposure_sessions')]
    supabase.upsert.mockImplementation(async (row: { id: string }) => ({
      error: row.id === 'parent'
        ? uniqueViolation
        : { code: '23503', message: 'violates foreign key constraint "exposure_sessions_fear_item_id_fkey"' },
    }))
    const db = makeMockDatabase([parent, ...children])
    const connector = connectorFor()

    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(upload(connector, db)).rejects.toBeDefined()
    }
    await upload(connector, db)
    expect(report).toHaveBeenCalledTimes(4)
    expect(notice).toHaveBeenCalledOnce()
  })

  it('a swap rejected with 23505 follows the bounded path, then later writes proceed', async () => {
    const swap = [
      makeEntry({ id: 'item-a', transactionId: 9, opData: { position: 2 } }),
      makeEntry({ id: 'item-b', transactionId: 9, opData: { position: 1 } }),
    ]
    supabase.rpc.mockResolvedValue({ error: uniqueViolation })
    const db = makeMockDatabase([...swap, put('after')])
    const connector = connectorFor()

    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(upload(connector, db)).rejects.toEqual(uniqueViolation)
    }
    await expect(upload(connector, db)).resolves.toBeUndefined()
    expect(supabase.upsert).toHaveBeenCalledOnce()
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ op: 'swap', code: '23505' }))
  })

  it('a dropped write is not re-attempted or re-reported when the batch is replayed after a transient throw', async () => {
    const fk = put('child', 'exposure_sessions')
    const flaky = put('flaky')
    let flakyCalls = 0
    supabase.upsert.mockImplementation(async (row: { id: string }) => {
      if (row.id === 'child') return { error: { code: '23503', message: 'violates foreign key constraint "exposure_sessions_fear_item_id_fkey"' } }
      flakyCalls++
      return { error: flakyCalls === 1 ? { message: 'network down' } : null }
    })
    const db = makeMockDatabase([fk, flaky])
    const connector = connectorFor()

    await expect(upload(connector, db)).rejects.toEqual({ message: 'network down' })
    expect(notice).not.toHaveBeenCalled()
    await expect(upload(connector, db)).resolves.toBeUndefined()

    expect(supabase.upsert.mock.calls.filter(([row]) => row.id === 'child')).toHaveLength(1)
    expect(report).toHaveBeenCalledOnce()
    expect(notice).toHaveBeenCalledOnce()
  })

  it('never puts message or details text in the report, and omits a constraint name that fails the pattern', async () => {
    const uuid = '99999999-aaaa-bbbb-cccc-000000000000'
    const leaky = {
      code: '23514',
      message: `new row violates check constraint "Bad Name ${uuid}"`,
      details: `Failing row contains (${uuid}, free text the user typed).`,
    }
    supabase.upsert.mockResolvedValue({ error: leaky })
    const db = makeMockDatabase([put('item-a')])
    const connector = connectorFor()
    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(upload(connector, db)).rejects.toBeDefined()
    }
    await upload(connector, db)

    const payload = JSON.stringify(report.mock.calls)
    expect(payload).not.toContain(uuid)
    expect(payload).not.toContain('free text')
    expect(report.mock.calls[0]![0]).toEqual({
      table: 'fear_ladder_items', op: 'PUT', code: '23514', level: 'warning',
    })
  })

  it('a 22P02 message that echoes an input value never reaches the report', async () => {
    const uuid = '12345678-1234-1234-1234-123456789012'
    supabase.upsert.mockResolvedValue({
      error: { code: '22P02', message: `invalid input syntax for type uuid: "${uuid}"` },
    })
    const db = makeMockDatabase([put('item-a')])
    const connector = connectorFor()
    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(upload(connector, db)).rejects.toBeDefined()
    }
    await upload(connector, db)
    expect(JSON.stringify(report.mock.calls)).not.toContain(uuid)
    expect(report.mock.calls[0]![0]).not.toHaveProperty('constraint')
  })

  it('a throwing reporter does not stall the queue', async () => {
    report.mockImplementation(() => { throw new Error('sentry down') })
    supabase.upsert.mockResolvedValue({
      error: { code: '23503', message: 'violates foreign key constraint "exposure_sessions_fear_item_id_fkey"' },
    })
    const db = makeMockDatabase([put('child', 'exposure_sessions')])
    await expect(upload(connectorFor(), db)).resolves.toBeUndefined()
    expect(db.complete).toHaveBeenCalledOnce()
  })
})
