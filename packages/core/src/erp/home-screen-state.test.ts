import { describe, it, expect } from 'vitest'
import { resolveHomeScreenState, type HomeScreenContext, type HomeScreenState } from './home-screen-state'

const BASE: HomeScreenContext = {
  hasAccount: true,
  hasLadder: true,
  activeThread: null,
  gapDays: 0,
  ladderComplete: false,
  nowMs: 0,
}

describe('resolveHomeScreenState', () => {
  it('!hasAccount -> first-use', () => {
    const ctx: HomeScreenContext = { ...BASE, hasAccount: false }
    expect(resolveHomeScreenState(ctx)).toBe<HomeScreenState>('first-use')
  })

  it('ladderComplete=true outranks active thread and gap -> completed', () => {
    const ctx: HomeScreenContext = {
      ...BASE,
      hasLadder: true,
      ladderComplete: true,
      activeThread: { exists: true, openCount: 0, openDurationHours: 0, userDeclaredIncomplete: false },
      gapDays: 15,
    }
    expect(resolveHomeScreenState(ctx)).toBe<HomeScreenState>('completed')
  })

  it('hasAccount && !hasLadder && !ladderComplete -> empty-ladder', () => {
    const ctx: HomeScreenContext = { ...BASE, hasLadder: false, ladderComplete: false }
    expect(resolveHomeScreenState(ctx)).toBe<HomeScreenState>('empty-ladder')
  })

  it('activeThread.exists=true -> progressing', () => {
    const ctx: HomeScreenContext = {
      ...BASE,
      activeThread: { exists: true, openCount: 0, openDurationHours: 0, userDeclaredIncomplete: false },
    }
    expect(resolveHomeScreenState(ctx)).toBe<HomeScreenState>('progressing')
  })

  it('active thread with avoidance-like values still resolves to progressing, NOT avoidance (state 5 omitted)', () => {
    const ctx: HomeScreenContext = {
      ...BASE,
      activeThread: { exists: true, openCount: 99, openDurationHours: 999, userDeclaredIncomplete: true },
    }
    expect(resolveHomeScreenState(ctx)).toBe<HomeScreenState>('progressing')
  })

  it('hasLadder=true && activeThread=null -> morning', () => {
    const ctx: HomeScreenContext = { ...BASE, hasLadder: true, activeThread: null }
    expect(resolveHomeScreenState(ctx)).toBe<HomeScreenState>('morning')
  })

  it('hasLadder=true && activeThread=null && gapDays=15 -> morning, NOT return-after-gap (state 9 omitted)', () => {
    const ctx: HomeScreenContext = { ...BASE, hasLadder: true, activeThread: null, gapDays: 15 }
    expect(resolveHomeScreenState(ctx)).toBe<HomeScreenState>('morning')
  })
})
