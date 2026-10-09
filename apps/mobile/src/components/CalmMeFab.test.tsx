import React from 'react'
import { AccessibilityInfo, BackHandler } from 'react-native'
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
const mockMarkSeen = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

let mockBannerVisible = false
const mockSubscribeResumeBannerVisible = jest.fn((listener: () => void) => {
  void listener
  return () => {}
})

jest.mock('../state/sessionResumeFlag', () => ({
  getResumeBannerVisible: () => mockBannerVisible,
  subscribeResumeBannerVisible: (listener: () => void) => mockSubscribeResumeBannerVisible(listener),
}))

import { CalmMeFab } from './CalmMeFab'

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ sessionRecoveryData: null, instaCalmIntroSeen: true, markInstaCalmIntroSeen: mockMarkSeen })
  mockBannerVisible = false
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
    mockUseAuth.mockReturnValue({ sessionRecoveryData: { sessionId: 's1', fearItemId: null, preSuds: 4, description: '' }, instaCalmIntroSeen: true, markInstaCalmIntroSeen: mockMarkSeen })
    const { getByRole } = render(<CalmMeFab />)
    fireEvent.press(getByRole('button'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me?inSession=1')
  })

  it('pushes plain /calm-me from /session/active when there is no recovery session', () => {
    mockUsePathname.mockReturnValue('/session/active')
    mockUseAuth.mockReturnValue({ sessionRecoveryData: null, instaCalmIntroSeen: true, markInstaCalmIntroSeen: mockMarkSeen })
    const { getByRole } = render(<CalmMeFab />)
    fireEvent.press(getByRole('button'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me')
  })

  it('pushes plain /calm-me from /session/grounding even with a recovery session (grounding has its own affordances)', () => {
    mockUsePathname.mockReturnValue('/session/grounding')
    mockUseAuth.mockReturnValue({ sessionRecoveryData: { sessionId: 's1', fearItemId: null, preSuds: 4, description: '' }, instaCalmIntroSeen: true, markInstaCalmIntroSeen: mockMarkSeen })
    const { getByRole } = render(<CalmMeFab />)
    fireEvent.press(getByRole('button'))
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me')
  })

  it('passes a translated accessibilityHint through to the underlying CalmMeButton', () => {
    mockUsePathname.mockReturnValue('/')
    const { getByRole } = render(<CalmMeFab />)
    const el = getByRole('button')
    expect(el.props.accessibilityHint).toBe('calmMe.fabHint')
  })
})

describe('CalmMeFab — Story 18.2 suppressed while the resume banner is visible', () => {
  it('renders null while the shared signal reports the banner visible, even on a regular screen', () => {
    mockBannerVisible = true
    mockUsePathname.mockReturnValue('/')
    const { toJSON } = render(<CalmMeFab />)
    expect(toJSON()).toBeNull()
  })

  it('renders null while the banner is visible on /session/active specifically', () => {
    mockBannerVisible = true
    mockUsePathname.mockReturnValue('/session/active')
    mockUseAuth.mockReturnValue({ sessionRecoveryData: { sessionId: 's1', fearItemId: null, preSuds: 4, description: '' }, instaCalmIntroSeen: true, markInstaCalmIntroSeen: mockMarkSeen })
    const { toJSON } = render(<CalmMeFab />)
    expect(toJSON()).toBeNull()
  })

  it('renders normally once the banner is no longer visible', () => {
    mockBannerVisible = false
    mockUsePathname.mockReturnValue('/session/active')
    mockUseAuth.mockReturnValue({ sessionRecoveryData: { sessionId: 's1', fearItemId: null, preSuds: 4, description: '' }, instaCalmIntroSeen: true, markInstaCalmIntroSeen: mockMarkSeen })
    const { UNSAFE_root } = render(<CalmMeFab />)
    expect(UNSAFE_root).toBeTruthy()
  })
})

describe('CalmMeFab — Story 19.4 first-launch intro callout', () => {
  const unseen = () => mockUseAuth.mockReturnValue({ sessionRecoveryData: null, instaCalmIntroSeen: false, markInstaCalmIntroSeen: mockMarkSeen })

  it('shows no callout when the intro was already seen', () => {
    mockUsePathname.mockReturnValue('/')
    const { queryByText } = render(<CalmMeFab />)
    expect(queryByText('calmMe.intro.title')).toBeNull()
  })

  it('shows the callout with the button still present when unseen', () => {
    unseen()
    mockUsePathname.mockReturnValue('/')
    const { getByText, getByLabelText } = render(<CalmMeFab />)
    expect(getByText('calmMe.intro.title')).toBeTruthy()
    expect(getByText('calmMe.intro.body')).toBeTruthy()
    expect(getByLabelText('calmMe.fab')).toBeTruthy()
    expect(getByLabelText('calmMe.intro.dismiss')).toBeTruthy()
  })

  it('"Got it" marks seen without navigating', () => {
    unseen()
    mockUsePathname.mockReturnValue('/')
    const { getByLabelText } = render(<CalmMeFab />)
    fireEvent.press(getByLabelText('calmMe.intro.dismiss'))
    expect(mockMarkSeen).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('tapping the button marks seen and still navigates to /calm-me', () => {
    unseen()
    mockUsePathname.mockReturnValue('/')
    const { getByLabelText } = render(<CalmMeFab />)
    fireEvent.press(getByLabelText('calmMe.fab'))
    expect(mockMarkSeen).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me')
  })

  it('announces the callout text for screen readers', () => {
    unseen()
    mockUsePathname.mockReturnValue('/')
    const spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
    render(<CalmMeFab />)
    expect(spy).toHaveBeenCalledWith('calmMe.intro.title. calmMe.intro.body')
    spy.mockRestore()
  })

  it.each(['/session/intent', '/session/briefing', '/session/active', '/session/pause', '/session/debrief'])(
    'hides the callout on %s, button still shown, flag untouched',
    (p) => {
      unseen()
      mockUsePathname.mockReturnValue(p)
      const { queryByText, getByLabelText } = render(<CalmMeFab />)
      expect(queryByText('calmMe.intro.title')).toBeNull()
      expect(getByLabelText('calmMe.fab')).toBeTruthy()
      expect(mockMarkSeen).not.toHaveBeenCalled()
    },
  )

  it('dims the screen with a scrim that swallows touches while the intro shows', () => {
    unseen()
    mockUsePathname.mockReturnValue('/')
    const { getByTestId } = render(<CalmMeFab />)
    const scrim = getByTestId('insta-calm-intro-scrim')
    expect(scrim.props.onStartShouldSetResponder()).toBe(true)
  })

  it('makes the button and card the only VoiceOver-reachable content while the intro shows', () => {
    unseen()
    mockUsePathname.mockReturnValue('/')
    const { getByTestId } = render(<CalmMeFab />)
    expect(getByTestId('calm-me-fab-container').props.accessibilityViewIsModal).toBe(true)
  })

  it('is not modal for VoiceOver once the intro was seen', () => {
    mockUsePathname.mockReturnValue('/')
    const { getByTestId } = render(<CalmMeFab />)
    expect(getByTestId('calm-me-fab-container').props.accessibilityViewIsModal).toBe(false)
  })

  it('has no scrim once the intro was seen', () => {
    mockUsePathname.mockReturnValue('/')
    const { queryByTestId } = render(<CalmMeFab />)
    expect(queryByTestId('insta-calm-intro-scrim')).toBeNull()
  })

  it.each(['/session/intent', '/session/active', '/calm-me', '/calm-me/helplines'])(
    'has no scrim on %s even when unseen',
    (p) => {
      unseen()
      mockUsePathname.mockReturnValue(p)
      const { queryByTestId } = render(<CalmMeFab />)
      expect(queryByTestId('insta-calm-intro-scrim')).toBeNull()
    },
  )

  it('has no scrim while the resume banner is visible', () => {
    unseen()
    mockBannerVisible = true
    mockUsePathname.mockReturnValue('/')
    const { queryByTestId } = render(<CalmMeFab />)
    expect(queryByTestId('insta-calm-intro-scrim')).toBeNull()
  })

  it('Android back dismisses the intro, marks it seen and is consumed', () => {
    unseen()
    mockUsePathname.mockReturnValue('/')
    const sub = { remove: jest.fn() }
    const add = jest.spyOn(BackHandler, 'addEventListener').mockReturnValue(sub as never)
    const { unmount } = render(<CalmMeFab />)
    expect(add).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function))
    const handler = add.mock.calls[0]![1] as () => boolean
    expect(handler()).toBe(true)
    expect(mockMarkSeen).toHaveBeenCalledTimes(1)
    unmount()
    expect(sub.remove).toHaveBeenCalled()
    add.mockRestore()
  })

  it('does not hook the back button when the intro is not showing', () => {
    mockUsePathname.mockReturnValue('/')
    const add = jest.spyOn(BackHandler, 'addEventListener')
    render(<CalmMeFab />)
    expect(add).not.toHaveBeenCalled()
    add.mockRestore()
  })

  it.each(['/calm-me', '/calm-me/helplines'])('renders nothing on %s even when unseen', (p) => {
    unseen()
    mockUsePathname.mockReturnValue(p)
    const { toJSON } = render(<CalmMeFab />)
    expect(toJSON()).toBeNull()
    expect(mockMarkSeen).not.toHaveBeenCalled()
  })

  it('renders nothing while the resume banner is visible, flag untouched', () => {
    unseen()
    mockBannerVisible = true
    mockUsePathname.mockReturnValue('/')
    const { toJSON } = render(<CalmMeFab />)
    expect(toJSON()).toBeNull()
    expect(mockMarkSeen).not.toHaveBeenCalled()
  })
})
