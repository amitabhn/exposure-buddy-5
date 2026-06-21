import { describe, it, expect, beforeEach } from 'vitest'
import { KV_KEYS } from '@exposure-buddy/core'

// Minimal in-memory MMKV stand-in — matches the subset used by AuthProvider helpers
function makeMockMmkv() {
  const store = new Map<string, string | boolean | number>()
  return {
    getString: (key: string) => {
      const v = store.get(key)
      return typeof v === 'string' ? v : undefined
    },
    set: (key: string, value: string | boolean | number) => store.set(key, value),
    delete: (key: string) => store.delete(key),
    has: (key: string) => store.has(key),
  }
}

const USER_ID = 'user-abc-123'

function getReminderTime(mmkv: ReturnType<typeof makeMockMmkv>, userId: string): string | null {
  return mmkv.getString(KV_KEYS.SESSION_REMINDER_TIME(userId)) ?? null
}

function setReminderTime(mmkv: ReturnType<typeof makeMockMmkv>, userId: string, time: string): void {
  mmkv.set(KV_KEYS.SESSION_REMINDER_TIME(userId), time)
}

function getReminderNotificationId(mmkv: ReturnType<typeof makeMockMmkv>, userId: string): string | null {
  return mmkv.getString(KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId)) ?? null
}

function setReminderNotificationId(mmkv: ReturnType<typeof makeMockMmkv>, userId: string, id: string): void {
  mmkv.set(KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId), id)
}

function clearReminderNotificationId(mmkv: ReturnType<typeof makeMockMmkv>, userId: string): void {
  mmkv.delete(KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId))
}

describe('getReminderTime / setReminderTime', () => {
  let mmkv: ReturnType<typeof makeMockMmkv>

  beforeEach(() => { mmkv = makeMockMmkv() })

  it('returns null when no time has been stored', () => {
    expect(getReminderTime(mmkv, USER_ID)).toBeNull()
  })

  it('returns the stored HH:mm string after set', () => {
    setReminderTime(mmkv, USER_ID, '08:00')
    expect(getReminderTime(mmkv, USER_ID)).toBe('08:00')
  })

  it('overwrites a previously stored time', () => {
    setReminderTime(mmkv, USER_ID, '08:00')
    setReminderTime(mmkv, USER_ID, '19:30')
    expect(getReminderTime(mmkv, USER_ID)).toBe('19:30')
  })
})

describe('getReminderNotificationId / setReminderNotificationId / clearReminderNotificationId', () => {
  let mmkv: ReturnType<typeof makeMockMmkv>

  beforeEach(() => { mmkv = makeMockMmkv() })

  it('returns null when no notification id has been stored', () => {
    expect(getReminderNotificationId(mmkv, USER_ID)).toBeNull()
  })

  it('returns the stored id after set', () => {
    setReminderNotificationId(mmkv, USER_ID, 'notif-id-1')
    expect(getReminderNotificationId(mmkv, USER_ID)).toBe('notif-id-1')
  })

  it('clears the stored id', () => {
    setReminderNotificationId(mmkv, USER_ID, 'notif-id-1')
    clearReminderNotificationId(mmkv, USER_ID)
    expect(getReminderNotificationId(mmkv, USER_ID)).toBeNull()
  })

  it('clearing a never-set id is a safe no-op', () => {
    expect(() => clearReminderNotificationId(mmkv, USER_ID)).not.toThrow()
    expect(getReminderNotificationId(mmkv, USER_ID)).toBeNull()
  })
})
