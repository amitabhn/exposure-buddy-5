import React, { useContext } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, it, expect, vi } from 'vitest'
import type { MMKV } from 'react-native-mmkv'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('react-native-mmkv', () => ({ MMKV: class {} }))
vi.mock('expo-secure-store', () => ({}))
vi.mock('../../src/client', () => ({ createSupabaseClient: () => ({}) }))

import { KV_KEYS } from '@exposure-buddy/core'
import { AuthContext } from '../../src/auth/AuthProvider'
import { OnboardingProvider, OnboardingContext } from '../../src/auth/OnboardingProvider'

function makeMockMmkv(initial: Record<string, unknown> = {}, throwOnSet = false) {
  const store = new Map<string, unknown>(Object.entries(initial))
  const mmkv = {
    getString: (k: string) => store.get(k) as string | undefined,
    getBoolean: (k: string) => store.get(k) as boolean | undefined,
    getNumber: (k: string) => store.get(k) as number | undefined,
    set: (k: string, v: unknown) => {
      if (throwOnSet) throw new Error('write failed')
      store.set(k, v)
    },
    delete: (k: string) => { store.delete(k) },
  } as unknown as MMKV
  return { mmkv, store }
}

const authFor = (userId: string | null) =>
  ({ authState: { userId } }) as unknown as React.ContextType<typeof AuthContext>

function setup(userId: string | null, mmkv: MMKV | null | undefined) {
  let ctx!: React.ContextType<typeof OnboardingContext>
  function Probe() {
    ctx = useContext(OnboardingContext)
    return null
  }
  const tree = (uid: string | null, m: MMKV | null | undefined) => (
    <AuthContext.Provider value={authFor(uid)}>
      <OnboardingProvider mmkv={m}>
        <Probe />
      </OnboardingProvider>
    </AuthContext.Provider>
  )
  let renderer!: ReturnType<typeof create>
  act(() => { renderer = create(tree(userId, mmkv)) })
  return { get: () => ctx, rerender: (uid: string | null, m: MMKV | null | undefined) => act(() => { renderer.update(tree(uid, m)) }) }
}

describe('OnboardingProvider — instaCalmIntroSeen (Story 19.4)', () => {
  it('is true (hidden) when mmkv is null or still loading', () => {
    expect(setup(null, undefined).get().instaCalmIntroSeen).toBe(true)
    expect(setup(null, null).get().instaCalmIntroSeen).toBe(true)
  })

  it('becomes false once mmkv transitions undefined -> store with the flag unset', () => {
    const h = setup(null, undefined)
    expect(h.get().instaCalmIntroSeen).toBe(true)
    h.rerender(null, makeMockMmkv().mmkv)
    expect(h.get().instaCalmIntroSeen).toBe(false)
  })

  it('stays true when the flag is already stored', () => {
    const { mmkv } = makeMockMmkv({ [KV_KEYS.INSTA_CALM_INTRO_SEEN]: true })
    expect(setup(null, mmkv).get().instaCalmIntroSeen).toBe(true)
  })

  it('stays true (hidden) when reading the flag throws', () => {
    const { mmkv } = makeMockMmkv()
    ;(mmkv as unknown as { getBoolean: () => boolean }).getBoolean = () => { throw new Error('read failed') }
    expect(setup(null, mmkv).get().instaCalmIntroSeen).toBe(true)
  })

  it('markInstaCalmIntroSeen stores the flag and hides, without a userId', () => {
    const { mmkv, store } = makeMockMmkv()
    const h = setup(null, mmkv)
    expect(h.get().instaCalmIntroSeen).toBe(false)
    act(() => { h.get().markInstaCalmIntroSeen() })
    expect(h.get().instaCalmIntroSeen).toBe(true)
    expect(store.get(KV_KEYS.INSTA_CALM_INTRO_SEEN)).toBe(true)
  })

  it('still hides for the session when the MMKV write throws', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { mmkv } = makeMockMmkv({}, true)
    const h = setup(null, mmkv)
    act(() => { h.get().markInstaCalmIntroSeen() })
    expect(h.get().instaCalmIntroSeen).toBe(true)
    errSpy.mockRestore()
  })

  it('is unchanged by sign-out (userId -> null)', () => {
    const { mmkv } = makeMockMmkv()
    const h = setup('user-1', mmkv)
    expect(h.get().instaCalmIntroSeen).toBe(false)
    h.rerender(null, mmkv)
    expect(h.get().instaCalmIntroSeen).toBe(false)
    act(() => { h.get().markInstaCalmIntroSeen() })
    h.rerender('user-1', mmkv)
    h.rerender(null, mmkv)
    expect(h.get().instaCalmIntroSeen).toBe(true)
  })
})
