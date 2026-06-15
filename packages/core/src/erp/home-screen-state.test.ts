import { describe, it, expect } from 'vitest'
import { resolveHomeScreenState, type HomeDisplayState } from './home-screen-state'

describe('resolveHomeScreenState', () => {
  it('returns default unconditionally (Story 5.6 — States 7 and 8 removed)', () => {
    expect(resolveHomeScreenState()).toBe<HomeDisplayState>('default')
  })
})
