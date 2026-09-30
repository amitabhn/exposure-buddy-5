import React from 'react'
import { AppState } from 'react-native'
import { render, act, waitFor, fireEvent } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockRouterReplace = jest.fn()
const mockRouterPush = jest.fn()

jest.mock('expo-router', () => ({
  Tabs: Object.assign(
    ({ children }: { children: React.ReactNode }) => children,
    { Screen: () => null },
  ),
  useRouter: () => ({ replace: mockRouterReplace, push: mockRouterPush }),
}))

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons')

const mockGetSession = jest.fn()

const mockGetReminderTime = jest.fn()
const mockGetReminderNotificationId = jest.fn()
const mockSetReminderNotificationId = jest.fn()
const mockClearReminderNotificationId = jest.fn()
const mockSetReminderTime = jest.fn()
const mockGetReminderEnabled = jest.fn()
const layoutAuthState = { userId: 'user-1' }

const mockClearSessionInProgress = jest.fn()
const mockSetSessionInProgress = jest.fn()
const mockClearSessionIntention = jest.fn()
let mockSessionRecoveryData: { sessionId: string; fearItemId: string | null; description: string; preSuds: number; startedAt?: string } | null = null

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    isOnboardingComplete: true,
    isStorageDegraded: false,
    sessionRecoveryData: mockSessionRecoveryData,
    setSessionInProgress: mockSetSessionInProgress,
    clearSessionInProgress: mockClearSessionInProgress,
    clearSessionIntention: mockClearSessionIntention,
    userId: layoutAuthState.userId,
    getReminderTime: mockGetReminderTime,
    getReminderNotificationId: mockGetReminderNotificationId,
    setReminderNotificationId: mockSetReminderNotificationId,
    clearReminderNotificationId: mockClearReminderNotificationId,
    setReminderTime: mockSetReminderTime,
    getReminderEnabled: mockGetReminderEnabled,
  }),
  createSupabaseClient: () => ({ auth: { getSession: mockGetSession } }),
}))

jest.mock('../../src/sync/adapter', () => ({
  getAdapter: jest.fn(() => ({ enqueue: jest.fn().mockResolvedValue(undefined) })),
}))

jest.mock('../../src/contexts/PushRegistrationContext', () => ({
  PushRegistrationProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const mockUseActiveSessionRecoveryFallback = jest.fn()

jest.mock('../../src/hooks/useActiveSessionRecoveryFallback', () => ({
  useActiveSessionRecoveryFallback: (...args: unknown[]) => mockUseActiveSessionRecoveryFallback(...args),
}))

const mockMarkSessionResumed = jest.fn()

jest.mock('../../src/state/sessionResumeFlag', () => ({
  markSessionResumed: (...args: unknown[]) => mockMarkSessionResumed(...args),
}))

const mockScheduleSessionReminder = jest.fn()
const mockCancelSessionReminder = jest.fn()

jest.mock('../../src/notifications/sessionReminder', () => ({
  scheduleSessionReminder: (...args: unknown[]) => mockScheduleSessionReminder(...args),
  cancelSessionReminder: (...args: unknown[]) => mockCancelSessionReminder(...args),
}))

import AppLayout from './_layout'

// File-wide default so every existing test (which doesn't care about the Story 18.2
// fallback hook) keeps rendering as before — individual tests below override this.
beforeEach(() => {
  mockUseActiveSessionRecoveryFallback.mockReturnValue({ fallbackRecovery: null, isLoading: false })
})

function emitAppStateChange(state: 'active' | 'background' | 'inactive') {
  const listener = (AppState.addEventListener as jest.Mock).mock.calls.at(-1)?.[1]
  act(() => {
    listener?.(state)
  })
}

describe('AppLayout — foreground session-reminder reschedule (AC4)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    layoutAuthState.userId = 'user-1'
    mockGetSession.mockResolvedValue(undefined)
    mockGetReminderTime.mockReturnValue(null)
    mockGetReminderNotificationId.mockReturnValue(null)
    mockGetReminderEnabled.mockReturnValue(true)
    mockScheduleSessionReminder.mockResolvedValue('notif-new')
    mockCancelSessionReminder.mockResolvedValue(undefined)
  })

  it('cancels the existing notification and reschedules when a stored time exists', async () => {
    mockGetReminderTime.mockReturnValue('08:00')
    mockGetReminderNotificationId.mockReturnValue('notif-old')

    render(<AppLayout />)
    emitAppStateChange('active')

    await waitFor(() => {
      expect(mockScheduleSessionReminder).toHaveBeenCalledWith('08:00', expect.any(Object))
    })
    expect(mockCancelSessionReminder).toHaveBeenCalledWith('notif-old')
    expect(mockSetReminderNotificationId).toHaveBeenCalledWith('notif-new')
    // Only the notification id is updated — the stored reminder time itself is untouched.
    expect(mockSetReminderTime).not.toHaveBeenCalled()
  })

  it('no-ops when no reminder time has been stored', async () => {
    mockGetReminderTime.mockReturnValue(null)

    render(<AppLayout />)
    emitAppStateChange('active')

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled()
    })
    expect(mockScheduleSessionReminder).not.toHaveBeenCalled()
    expect(mockCancelSessionReminder).not.toHaveBeenCalled()
  })

  it('no-ops when the reminder is disabled, even if a time is still stored', async () => {
    mockGetReminderEnabled.mockReturnValue(false)
    mockGetReminderTime.mockReturnValue('08:00')
    mockGetReminderNotificationId.mockReturnValue('notif-old')

    render(<AppLayout />)
    emitAppStateChange('active')

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled()
    })
    expect(mockScheduleSessionReminder).not.toHaveBeenCalled()
    expect(mockCancelSessionReminder).not.toHaveBeenCalled()
  })

  it('skips silently (no throw) when notification permission is not granted', async () => {
    mockGetReminderTime.mockReturnValue('08:00')
    mockScheduleSessionReminder.mockResolvedValue(null)

    render(<AppLayout />)
    expect(() => emitAppStateChange('active')).not.toThrow()

    await waitFor(() => {
      expect(mockClearReminderNotificationId).toHaveBeenCalled()
    })
    expect(mockSetReminderNotificationId).not.toHaveBeenCalled()
    expect(mockSetReminderTime).not.toHaveBeenCalled()
  })

  it('cancels the newly scheduled notification when the user changes mid-reschedule (race guard)', async () => {
    mockGetReminderTime.mockReturnValue('08:00')
    let resolveSchedule: (id: string | null) => void = () => {}
    mockScheduleSessionReminder.mockImplementation(
      () => new Promise<string | null>(resolve => { resolveSchedule = resolve })
    )

    const { rerender } = render(<AppLayout />)
    emitAppStateChange('active')

    await waitFor(() => {
      expect(mockScheduleSessionReminder).toHaveBeenCalled()
    })

    // Simulate a sign-out/sign-in-as-different-user race while the schedule call is in flight.
    layoutAuthState.userId = 'user-2'
    rerender(<AppLayout />)

    await act(async () => {
      resolveSchedule('notif-leaked')
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockCancelSessionReminder).toHaveBeenCalledWith('notif-leaked')
    expect(mockSetReminderNotificationId).not.toHaveBeenCalled()
  })
})

describe('AppLayout — Story 9.6 recovery-end error path', () => {
  const mockEnqueue = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockSessionRecoveryData = {
      sessionId: 'session-uuid-1',
      fearItemId: 'item-uuid-1',
      description: 'Test situation',
      preSuds: 5,
    }
    mockGetSession.mockResolvedValue(undefined)
    mockGetReminderEnabled.mockReturnValue(false)
    mockGetReminderTime.mockReturnValue(null)
    const { getAdapter } = require('../../src/sync/adapter')
    getAdapter.mockReturnValue({ enqueue: mockEnqueue })
  })

  afterEach(() => {
    mockSessionRecoveryData = null
  })

  it('shows recovery-end error text with accessibilityLiveRegion="polite" when enqueue rejects', async () => {
    mockEnqueue.mockRejectedValue(new Error('network'))
    const { getByLabelText, getByText } = render(<AppLayout />)
    await act(async () => { fireEvent.press(getByLabelText('session.recovery.end')) })
    await waitFor(() => {
      const errorText = getByText('session.recovery.endFailed')
      expect(errorText.props.accessibilityLiveRegion).toBe('polite')
    })
  })

  it('shows "try ending again" button when recovery-end enqueue rejects', async () => {
    mockEnqueue.mockRejectedValue(new Error('network'))
    const { getByLabelText } = render(<AppLayout />)
    await act(async () => { fireEvent.press(getByLabelText('session.recovery.end')) })
    await waitFor(() => {
      expect(getByLabelText('session.recovery.tryEnding')).toBeTruthy()
    })
  })

  it('does NOT clear MMKV when recovery-end enqueue fails', async () => {
    mockEnqueue.mockRejectedValue(new Error('network'))
    const { getByLabelText } = render(<AppLayout />)
    await act(async () => { fireEvent.press(getByLabelText('session.recovery.end')) })
    await waitFor(() => {
      expect(mockClearSessionInProgress).not.toHaveBeenCalled()
    })
  })
})

describe('AppLayout — Story 18.2 cross-device recovery fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSessionRecoveryData = null
    mockGetSession.mockResolvedValue(undefined)
    mockGetReminderEnabled.mockReturnValue(false)
    mockGetReminderTime.mockReturnValue(null)
    mockUseActiveSessionRecoveryFallback.mockReturnValue({ fallbackRecovery: null, isLoading: false })
  })

  afterEach(() => {
    mockSessionRecoveryData = null
  })

  it('enables the fallback hook (enabled=true) when not loading, authenticated, and no local recovery record exists', () => {
    render(<AppLayout />)
    // isLoading: false, isAuthenticated: true, sessionRecoveryData: null (per this file's mock) — all satisfied.
    expect(mockUseActiveSessionRecoveryFallback).toHaveBeenCalledWith(true)
  })

  it('disables the fallback hook (enabled=false) once a local recovery record is present', () => {
    mockSessionRecoveryData = { sessionId: 's1', fearItemId: null, description: '', preSuds: 4 }
    render(<AppLayout />)
    expect(mockUseActiveSessionRecoveryFallback).toHaveBeenCalledWith(false)
  })

  it('calls setSessionInProgress with the fallback hit when no local record exists (fresh session populates recovery state)', async () => {
    mockUseActiveSessionRecoveryFallback.mockReturnValue({
      fallbackRecovery: { sessionId: 'fallback-1', fearItemId: 'item-1', description: 'desc', preSuds: 3, startedAt: '2026-09-30T00:00:00.000Z' },
      isLoading: false,
    })
    render(<AppLayout />)
    await waitFor(() => {
      expect(mockSetSessionInProgress).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'fallback-1' })
      )
    })
  })

  it('does NOT call setSessionInProgress when a local recovery record already exists (fallback hit is stale/moot)', async () => {
    mockSessionRecoveryData = { sessionId: 'local-1', fearItemId: null, description: '', preSuds: 4 }
    mockUseActiveSessionRecoveryFallback.mockReturnValue({
      fallbackRecovery: { sessionId: 'fallback-1', fearItemId: null, description: '', preSuds: 3, startedAt: '2026-09-30T00:00:00.000Z' },
      isLoading: false,
    })
    render(<AppLayout />)
    await act(async () => {})
    expect(mockSetSessionInProgress).not.toHaveBeenCalled()
  })

  it('the auth/onboarding redirect gate fires on its own schedule, unaffected by the fallback query result', async () => {
    mockUseActiveSessionRecoveryFallback.mockReturnValue({
      fallbackRecovery: { sessionId: 'fallback-1', fearItemId: null, description: '', preSuds: 3, startedAt: '2026-09-30T00:00:00.000Z' },
      isLoading: false,
    })
    render(<AppLayout />)
    await act(async () => {})
    // isAuthenticated + isOnboardingComplete are both true in this mock, so the gate has
    // nothing to redirect to — it must stay that way regardless of the fallback hit.
    expect(mockRouterReplace).not.toHaveBeenCalled()
  })
})

describe('AppLayout — Story 18.2 Resume fires the shared resume signal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSessionRecoveryData = { sessionId: 'session-uuid-9', fearItemId: 'item-9', description: 'Test situation', preSuds: 5 }
    mockGetSession.mockResolvedValue(undefined)
    mockGetReminderEnabled.mockReturnValue(false)
    mockGetReminderTime.mockReturnValue(null)
    mockUseActiveSessionRecoveryFallback.mockReturnValue({ fallbackRecovery: null, isLoading: false })
  })

  afterEach(() => {
    mockSessionRecoveryData = null
  })

  it('pressing the real Resume button fires markSessionResumed for that sessionId', async () => {
    const { getByLabelText } = render(<AppLayout />)
    await act(async () => { fireEvent.press(getByLabelText('session.recovery.resume')) })
    expect(mockMarkSessionResumed).toHaveBeenCalledWith('session-uuid-9')
  })

  it('navigates to /session/active with the resumed sessionId', async () => {
    const { getByLabelText } = render(<AppLayout />)
    await act(async () => { fireEvent.press(getByLabelText('session.recovery.resume')) })
    expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining('sessionId=session-uuid-9'))
  })
})
