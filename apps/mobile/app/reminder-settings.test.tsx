import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}))

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}))

jest.mock('../src/components/navigation/BackButton', () => ({
  BackButton: () => null,
}))

jest.mock('@react-native-community/datetimepicker', () => {
  const { TouchableOpacity, Text } = require('react-native')
  return {
    __esModule: true,
    default: ({ value, onChange }: { value: Date; onChange: (e: unknown, d?: Date) => void }) => {
      const hh = String(value.getHours()).padStart(2, '0')
      const mm = String(value.getMinutes()).padStart(2, '0')
      return (
        <TouchableOpacity
          accessibilityLabel="mock-date-time-picker"
          onPress={() => {
            const updated = new Date(value)
            updated.setHours(19, 30, 0, 0)
            onChange({}, updated)
          }}
        >
          <Text>{`${hh}:${mm}`}</Text>
        </TouchableOpacity>
      )
    },
  }
})

const mockGetReminderTime = jest.fn()
const mockSetReminderTime = jest.fn()
const mockGetReminderNotificationId = jest.fn()
const mockSetReminderNotificationId = jest.fn()
const mockClearReminderNotificationId = jest.fn()
const reminderAuthState = { userId: 'user-1' }

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => ({
    userId: reminderAuthState.userId,
    getReminderTime: mockGetReminderTime,
    setReminderTime: mockSetReminderTime,
    getReminderNotificationId: mockGetReminderNotificationId,
    setReminderNotificationId: mockSetReminderNotificationId,
    clearReminderNotificationId: mockClearReminderNotificationId,
  }),
}))

const mockScheduleSessionReminder = jest.fn()
const mockCancelSessionReminder = jest.fn()

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily', CALENDAR: 'calendar' },
}))

jest.mock('../src/notifications/sessionReminder', () => ({
  ...jest.requireActual('../src/notifications/sessionReminder'),
  scheduleSessionReminder: (...args: unknown[]) => mockScheduleSessionReminder(...args),
  cancelSessionReminder: (...args: unknown[]) => mockCancelSessionReminder(...args),
}))

import ReminderSettingsScreen from './reminder-settings'

describe('ReminderSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    reminderAuthState.userId = 'user-1'
    mockGetReminderTime.mockReturnValue(null)
    mockGetReminderNotificationId.mockReturnValue(null)
    mockScheduleSessionReminder.mockResolvedValue('notif-new')
    mockCancelSessionReminder.mockResolvedValue(undefined)
  })

  it('defaults the picker to 08:00 when no time has been stored', () => {
    const { getByText } = render(<ReminderSettingsScreen />)
    expect(getByText('08:00')).toBeTruthy()
  })

  it('shows the previously stored time on mount', () => {
    mockGetReminderTime.mockReturnValue('19:30')
    const { getByText } = render(<ReminderSettingsScreen />)
    expect(getByText('19:30')).toBeTruthy()
  })

  it('Save schedules + persists time + notification id + shows confirmation', async () => {
    const { getByLabelText, getByText } = render(<ReminderSettingsScreen />)

    await act(async () => {
      fireEvent.press(getByLabelText('reminderSettings.saveButton'))
    })

    expect(mockScheduleSessionReminder).toHaveBeenCalledWith('08:00', expect.any(Object))
    expect(mockSetReminderTime).toHaveBeenCalledWith('08:00')
    expect(mockSetReminderNotificationId).toHaveBeenCalledWith('notif-new')
    expect(getByText('notifications.reminderSet:{"time":"08:00"}')).toBeTruthy()
  })

  it('changing the time then saving cancels the old notification before scheduling the new one (AC3)', async () => {
    mockGetReminderTime.mockReturnValue('08:00')
    mockGetReminderNotificationId.mockReturnValue('notif-old')
    const callOrder: string[] = []
    mockCancelSessionReminder.mockImplementation(async () => { callOrder.push('cancel') })
    mockScheduleSessionReminder.mockImplementation(async () => { callOrder.push('schedule'); return 'notif-new' })

    const { getByLabelText } = render(<ReminderSettingsScreen />)

    fireEvent.press(getByLabelText('mock-date-time-picker'))

    await act(async () => {
      fireEvent.press(getByLabelText('reminderSettings.saveButton'))
    })

    expect(mockCancelSessionReminder).toHaveBeenCalledWith('notif-old')
    expect(mockScheduleSessionReminder).toHaveBeenCalledWith('19:30', expect.any(Object))
    expect(callOrder).toEqual(['cancel', 'schedule'])
    expect(mockSetReminderTime).toHaveBeenCalledWith('19:30')
  })

  it('Save while permission is revoked persists the time but does not store a notification id or show confirmation', async () => {
    mockScheduleSessionReminder.mockResolvedValue(null)

    const { getByLabelText, queryByText } = render(<ReminderSettingsScreen />)

    await act(async () => {
      fireEvent.press(getByLabelText('reminderSettings.saveButton'))
    })

    expect(mockSetReminderTime).toHaveBeenCalledWith('08:00')
    expect(mockSetReminderNotificationId).not.toHaveBeenCalled()
    expect(mockClearReminderNotificationId).toHaveBeenCalled()
    expect(queryByText(/notifications.reminderSet/)).toBeNull()
  })

  it('Save when permission was never requested behaves identically to a revoked permission', async () => {
    // scheduleSessionReminder's status !== 'granted' check covers both 'undetermined' and
    // 'denied' identically — from the screen's perspective both resolve to a null result.
    mockScheduleSessionReminder.mockResolvedValue(null)

    const { getByLabelText, queryByText } = render(<ReminderSettingsScreen />)

    await act(async () => {
      fireEvent.press(getByLabelText('reminderSettings.saveButton'))
    })

    expect(mockSetReminderTime).toHaveBeenCalledWith('08:00')
    expect(mockSetReminderNotificationId).not.toHaveBeenCalled()
    expect(mockClearReminderNotificationId).toHaveBeenCalled()
    expect(queryByText(/notifications.reminderSet/)).toBeNull()
  })

  it('cancels the newly scheduled notification when the user changes mid-Save (race guard)', async () => {
    let resolveSchedule: (id: string | null) => void = () => {}
    mockScheduleSessionReminder.mockImplementation(
      () => new Promise<string | null>(resolve => { resolveSchedule = resolve })
    )

    const { getByLabelText, rerender } = render(<ReminderSettingsScreen />)
    fireEvent.press(getByLabelText('reminderSettings.saveButton'))

    // Simulate a sign-out/sign-in-as-different-user race while the schedule call is in flight.
    reminderAuthState.userId = 'user-2'
    rerender(<ReminderSettingsScreen />)

    await act(async () => {
      resolveSchedule('notif-leaked')
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockCancelSessionReminder).toHaveBeenCalledWith('notif-leaked')
    expect(mockSetReminderNotificationId).not.toHaveBeenCalled()
    expect(mockSetReminderTime).not.toHaveBeenCalled()
  })
})
