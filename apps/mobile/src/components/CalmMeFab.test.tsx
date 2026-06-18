import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockRouterPush = jest.fn()
const mockUsePathname = jest.fn()

jest.mock('expo-router', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: mockRouterPush }),
}))

const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

import { CalmMeFab } from './CalmMeFab'

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ sessionRecoveryData: null })
})

describe('CalmMeFab', () => {
  it('renders the FAB on a regular screen', () => {
    mockUsePathname.mockReturnValue('/')
    const { UNSAFE_root } = render(<CalmMeFab />)
    expect(UNSAFE_root).toBeTruthy()
  })

  it('hides on the /calm-me route (no double-stacking)', () => {
    mockUsePathname.mockReturnValue('/calm-me')
    const { toJSON } = render(<CalmMeFab />)
    expect(toJSON()).toBeNull()
  })

  it.each(['/calm-me/breathing', '/calm-me/grounding', '/calm-me/helplines'])(
    'hides on the %s technique sub-route (already has its own Back affordance to the hub)',
    (pathname) => {
      mockUsePathname.mockReturnValue(pathname)
      const { toJSON } = render(<CalmMeFab />)
      expect(toJSON()).toBeNull()
    }
  )

  it('pushes plain /calm-me when not in an active session', () => {
    mockUsePathname.mockReturnValue('/')
    const { getByRole } = render(<CalmMeFab />)
    fireEvent.press(getByRole('button'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me')
  })

  it('pushes /calm-me?inSession=1 when tapped from /session/active with a recovery session', () => {
    mockUsePathname.mockReturnValue('/session/active')
    mockUseAuth.mockReturnValue({ sessionRecoveryData: { sessionId: 's1', fearItemId: null, preSuds: 4, description: '' } })
    const { getByRole } = render(<CalmMeFab />)
    fireEvent.press(getByRole('button'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me?inSession=1')
  })

  it('pushes plain /calm-me from /session/active when there is no recovery session', () => {
    mockUsePathname.mockReturnValue('/session/active')
    mockUseAuth.mockReturnValue({ sessionRecoveryData: null })
    const { getByRole } = render(<CalmMeFab />)
    fireEvent.press(getByRole('button'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me')
  })

  it('pushes plain /calm-me from /session/grounding even with a recovery session (grounding has its own affordances)', () => {
    mockUsePathname.mockReturnValue('/session/grounding')
    mockUseAuth.mockReturnValue({ sessionRecoveryData: { sessionId: 's1', fearItemId: null, preSuds: 4, description: '' } })
    const { getByRole } = render(<CalmMeFab />)
    fireEvent.press(getByRole('button'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me')
  })
})
