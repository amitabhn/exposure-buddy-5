import React from 'react'
import { AppState } from 'react-native'
import { render, act, waitFor } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock('expo-router', () => ({
  Tabs: Object.assign(
    ({ children }: { children: React.ReactNode }) => children,
    { Screen: () => null },
  ),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons')

const mockGetSession = jest.fn()

const mockGetReminderTime = jest.fn()
const mockGetReminderNotificationId = jest.fn()
const mockSetReminderNotificationId = jest.fn()
const mockClearReminderNotificationId = jest.fn()
const mockSetReminderTime = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    isOnboardingComplete: true,
    isStorageDegraded: false,
    sessionRecoveryData: null,
    clearSessionInProgress: jest.fn(),
    clearSessionIntention: jest.fn(),
    userId: 'user-1',
    getReminderTime: mockGetReminderTime,
    getReminderNotificationId: mockGetReminderNotificationId,
    setReminderNotificationId: mockSetReminderNotificationId,
    clearReminderNotificationId: mockClearReminderNotificationId,
    setReminderTime: mockSetReminderTime,
  }),
  createSupabaseClient: () => ({ auth: { getSession: mockGetSession } }),
}))

jest.mock('../../src/sync/adapter', () => ({
  getAdapter: jest.fn(() => ({ enqueue: jest.fn().mockResolvedValue(undefined) })),
}))

jest.mock('../../src/contexts/PushRegistrationContext', () => ({
  PushRegistrationProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const mockScheduleSessionReminder = jest.fn()
const mockCancelSessionReminder = jest.fn()

jest.mock('../../src/notifications/sessionReminder', () => ({
  scheduleSessionReminder: (...args: unknown[]) => mockScheduleSessionReminder(...args),
  cancelSessionReminder: (...args: unknown[]) => mockCancelSessionReminder(...args),
}))

import AppLayout from './_layout'

function emitAppStateChange(state: 'active' | 'background' | 'inactive') {
  const listener = (AppState.addEventListener as jest.Mock).mock.calls.at(-1)?.[1]
  act(() => {
    listener?.(state)
  })
}

describe('AppLayout — foreground session-reminder reschedule (AC4)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue(undefined)
    mockGetReminderTime.mockReturnValue(null)
    mockGetReminderNotificationId.mockReturnValue(null)
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
})
