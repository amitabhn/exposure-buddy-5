import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { chunk, sendPushNotification } from './expoPush.ts'

function mockFetchOnce(response: { ok: boolean; json?: () => Promise<unknown> }) {
  const original = globalThis.fetch
  globalThis.fetch = (() =>
    Promise.resolve(response as unknown as Response)) as typeof fetch
  return () => {
    globalThis.fetch = original
  }
}

function mockFetchThrows(error: Error) {
  const original = globalThis.fetch
  globalThis.fetch = (() => Promise.reject(error)) as typeof fetch
  return () => {
    globalThis.fetch = original
  }
}

Deno.test('sendPushNotification — success ticket returns { ok: true }', async () => {
  const restore = mockFetchOnce({
    ok: true,
    json: () => Promise.resolve({ data: [{ status: 'ok' }] }),
  })
  try {
    const result = await sendPushNotification('ExponentPushToken[abc]', 'title', 'body')
    assertEquals(result, { ok: true })
  } finally {
    restore()
  }
})

Deno.test('sendPushNotification — DeviceNotRegistered ticket maps to PruneToken', async () => {
  const restore = mockFetchOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }],
      }),
  })
  try {
    const result = await sendPushNotification('ExponentPushToken[abc]', 'title', 'body')
    assertEquals(result, { ok: false, signal: 'PruneToken' })
  } finally {
    restore()
  }
})

Deno.test('sendPushNotification — InvalidCredentials ticket maps to Unknown, not PruneToken', async () => {
  const restore = mockFetchOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        data: [{ status: 'error', details: { error: 'InvalidCredentials' } }],
      }),
  })
  try {
    const result = await sendPushNotification('ExponentPushToken[abc]', 'title', 'body')
    assertEquals(result, { ok: false, signal: 'Unknown' })
  } finally {
    restore()
  }
})

Deno.test('sendPushNotification — unrecognized error ticket maps to Unknown', async () => {
  const restore = mockFetchOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        data: [{ status: 'error', details: { error: 'MessageTooBig' } }],
      }),
  })
  try {
    const result = await sendPushNotification('ExponentPushToken[abc]', 'title', 'body')
    assertEquals(result, { ok: false, signal: 'Unknown' })
  } finally {
    restore()
  }
})

Deno.test('sendPushNotification — network error maps to RetryLater', async () => {
  const restore = mockFetchThrows(new Error('network down'))
  try {
    const result = await sendPushNotification('ExponentPushToken[abc]', 'title', 'body')
    assertEquals(result, { ok: false, signal: 'RetryLater' })
  } finally {
    restore()
  }
})

Deno.test('sendPushNotification — non-2xx response maps to RetryLater', async () => {
  const restore = mockFetchOnce({ ok: false })
  try {
    const result = await sendPushNotification('ExponentPushToken[abc]', 'title', 'body')
    assertEquals(result, { ok: false, signal: 'RetryLater' })
  } finally {
    restore()
  }
})

Deno.test('sendPushNotification — malformed JSON response maps to RetryLater', async () => {
  const restore = mockFetchOnce({
    ok: true,
    json: () => Promise.reject(new Error('invalid json')),
  })
  try {
    const result = await sendPushNotification('ExponentPushToken[abc]', 'title', 'body')
    assertEquals(result, { ok: false, signal: 'RetryLater' })
  } finally {
    restore()
  }
})

Deno.test('chunk — splits arrays into groups of the given size', () => {
  const input = Array.from({ length: 205 }, (_, i) => i)
  const result = chunk(input, 100)
  assertEquals(result.length, 3)
  assertEquals(result[0].length, 100)
  assertEquals(result[1].length, 100)
  assertEquals(result[2].length, 5)
  assertEquals(result.flat(), input)
})

Deno.test('chunk — empty array returns empty array', () => {
  assertEquals(chunk([], 100), [])
})

Deno.test('chunk — array smaller than size returns a single chunk', () => {
  const input = [1, 2, 3]
  assertEquals(chunk(input, 100), [[1, 2, 3]])
})

Deno.test('chunk — size <= 0 throws instead of looping forever', () => {
  assertThrows(() => chunk([1, 2, 3], 0))
  assertThrows(() => chunk([1, 2, 3], -1))
})
