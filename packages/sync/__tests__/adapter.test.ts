import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PowerSyncSyncAdapter, initAdapter, getAdapter } from '../src/adapter'
import type { AbstractPowerSyncDatabase } from '@powersync/react-native'

function makeMockDb() {
  const mockTx = { execute: vi.fn() }
  const mockDb = {
    execute: vi.fn(),
    writeTransaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
  }
  return { mockDb, mockTx }
}

describe('PowerSyncSyncAdapter', () => {
  describe('INSERT', () => {
    it('executes plain INSERT with snake_case fields only', async () => {
      const { mockDb } = makeMockDb()
      const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)
      await adapter.enqueue('fear_ladder_items', 'INSERT', {
        id: 'uuid-1',
        user_id: 'user-1',
        description: 'test',
        predicted_suds: 5,
        updatedAt: Date.now(),  // camelCase — must be filtered out
      })
      expect(mockDb.execute).toHaveBeenCalledOnce()
      const [sql, params] = mockDb.execute.mock.calls[0]
      expect(sql).toMatch(/^INSERT INTO fear_ladder_items/)
      expect(sql).not.toContain('OR IGNORE')
      expect(sql).toContain('id')
      expect(sql).toContain('user_id')
      expect(sql).toContain('predicted_suds')
      expect(sql).not.toContain('updatedAt')
      expect(params).toContain('uuid-1')
      expect(params).toContain('user-1')
    })

    it('throws on empty payload after snake_case filter', async () => {
      const { mockDb } = makeMockDb()
      const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)
      await expect(
        adapter.enqueue('fear_ladder_items', 'INSERT', { updatedAt: 123, camelCase: 'x' })
      ).rejects.toThrow('[sync] INSERT payload empty after snake_case filter')
    })
  })

  describe('UPDATE', () => {
    it('executes UPDATE SET ... WHERE id for non-reorder payload', async () => {
      const { mockDb } = makeMockDb()
      const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)
      await adapter.enqueue('fear_ladder_items', 'UPDATE', {
        id: 'uuid-1',
        description: 'updated',
        updated_at: '2026-01-01T00:00:00.000Z',
        updatedAt: Date.now(),  // camelCase — filtered
      })
      expect(mockDb.execute).toHaveBeenCalledOnce()
      const [sql, params] = mockDb.execute.mock.calls[0]
      expect(sql).toMatch(/^UPDATE fear_ladder_items SET/)
      expect(sql).toContain('description = ?')
      expect(sql).toContain('updated_at = ?')
      expect(sql).toContain('WHERE id = ?')
      expect(sql).not.toContain('updatedAt')
      expect(params[params.length - 1]).toBe('uuid-1')
    })

    it('throws on UPDATE payload missing id', async () => {
      const { mockDb } = makeMockDb()
      const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)
      await expect(
        adapter.enqueue('fear_ladder_items', 'UPDATE', { description: 'x' })
      ).rejects.toThrow('[sync] UPDATE payload missing id')
    })

    it('throws on UPDATE payload with no SET fields after filtering', async () => {
      const { mockDb } = makeMockDb()
      const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)
      await expect(
        adapter.enqueue('fear_ladder_items', 'UPDATE', { id: 'uuid-1', updatedAt: 123 })
      ).rejects.toThrow('[sync] UPDATE payload has no fields to SET')
    })
  })

  describe('DELETE', () => {
    it('executes DELETE WHERE id', async () => {
      const { mockDb } = makeMockDb()
      const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)
      await adapter.enqueue('fear_ladder_items', 'DELETE', { id: 'uuid-1' })
      expect(mockDb.execute).toHaveBeenCalledOnce()
      const [sql, params] = mockDb.execute.mock.calls[0]
      expect(sql).toBe('DELETE FROM fear_ladder_items WHERE id = ?')
      expect(params).toEqual(['uuid-1'])
    })
  })

  describe('reorder_positions — calling convention equivalence (D15)', () => {
    it('UPDATE + { type: reorder_positions } and direct reorder_positions produce identical writes', async () => {
      const payload = { itemAId: 'a', itemANewPosition: 1, itemBId: 'b', itemBNewPosition: 2 }

      // Convention A: UPDATE envelope
      const { mockDb: dbA, mockTx: txA } = makeMockDb()
      const adapterA = new PowerSyncSyncAdapter(dbA as unknown as AbstractPowerSyncDatabase)
      await adapterA.enqueue('fear_ladder_items', 'UPDATE', { type: 'reorder_positions', ...payload })
      const callsA = txA.execute.mock.calls

      // Convention B: direct reorder_positions
      const { mockDb: dbB, mockTx: txB } = makeMockDb()
      const adapterB = new PowerSyncSyncAdapter(dbB as unknown as AbstractPowerSyncDatabase)
      await adapterB.enqueue('fear_ladder_items', 'reorder_positions', payload)
      const callsB = txB.execute.mock.calls

      // SQL statements must be identical
      expect(callsA.map(c => c[0])).toEqual(callsB.map(c => c[0]))
      // Param length and non-timestamp values must match; timestamps are computed per-call so
      // they may differ between convention A and B — but within each call, both rows share `now`.
      expect(callsA.length).toBe(2)
      expect(callsB.length).toBe(2)
      // Within call A: both rows use the same `now` (params index 1 for each row)
      expect(callsA[0][1][1]).toBe(callsA[1][1][1])
      // Within call B: both rows use the same `now`
      expect(callsB[0][1][1]).toBe(callsB[1][1][1])
      // Position and id params are identical
      expect(callsA[0][1][0]).toBe(callsB[0][1][0])  // posA
      expect(callsA[0][1][2]).toBe(callsB[0][1][2])  // idA
      expect(callsA[1][1][0]).toBe(callsB[1][1][0])  // posB
      expect(callsA[1][1][2]).toBe(callsB[1][1][2])  // idB
    })
  })

  describe('filterSnakeCase regex', () => {
    it('accepts valid snake_case keys', async () => {
      const { mockDb } = makeMockDb()
      const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)
      await adapter.enqueue('t', 'INSERT', { id: '1', user_id: 'u', predicted_suds: 5 })
      const [sql] = mockDb.execute.mock.calls[0]
      expect(sql).toContain('id')
      expect(sql).toContain('user_id')
      expect(sql).toContain('predicted_suds')
    })

    it('rejects proto pollution and camelCase keys', async () => {
      const { mockDb } = makeMockDb()
      const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)
      await expect(
        adapter.enqueue('t', 'INSERT', {
          __proto__: 'bad',
          _private: 'bad',
          '1col': 'bad',
          updatedAt: 'bad',
        })
      ).rejects.toThrow('[sync] INSERT payload empty after snake_case filter')
    })
  })

  describe('initAdapter / getAdapter', () => {
    it('getAdapter returns adapter after initAdapter', () => {
      const mockDb = {} as AbstractPowerSyncDatabase
      const adapter = new PowerSyncSyncAdapter(mockDb)
      initAdapter(adapter)
      expect(getAdapter()).toBe(adapter)
    })
  })

  describe('unknown operation', () => {
    it('throws on unknown operation string', async () => {
      const { mockDb } = makeMockDb()
      const adapter = new PowerSyncSyncAdapter(mockDb as unknown as AbstractPowerSyncDatabase)
      await expect(
        adapter.enqueue('t', 'UNKNOWN' as never, {})
      ).rejects.toThrow('[sync] unknown operation: UNKNOWN')
    })
  })
})
