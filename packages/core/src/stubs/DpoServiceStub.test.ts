import { describe, it, expect, vi } from 'vitest'
import { DpoServiceStub } from './DpoServiceStub'

describe('DpoServiceStub', () => {
  it('calls the writer callback with key "pending_deletion_request"', async () => {
    const writer = vi.fn()
    const stub = new DpoServiceStub(writer)
    await stub.requestErasure('user-123')
    expect(writer).toHaveBeenCalledOnce()
    expect(writer.mock.calls[0]![0]).toBe('pending_deletion_request')
  })

  it('writes valid JSON with userId, requestedAt (ISO string), and status "pending"', async () => {
    const writer = vi.fn()
    const stub = new DpoServiceStub(writer)
    const before = Date.now()
    await stub.requestErasure('user-abc')
    const after = Date.now()

    const written = JSON.parse(writer.mock.calls[0]![1])
    expect(written.userId).toBe('user-abc')
    expect(written.status).toBe('pending')
    const ts = new Date(written.requestedAt).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })

  it('returns a Promise that resolves without throwing', async () => {
    const stub = new DpoServiceStub(vi.fn())
    await expect(stub.requestErasure('user-xyz')).resolves.toBeUndefined()
  })
})
