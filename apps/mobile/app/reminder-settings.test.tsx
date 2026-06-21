import React from 'react'
import { Linking } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}))

const mockRouterBack = jest.fn()

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useRouter: () => ({ back: mockRouterBack }),
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
const mockGetReminderEnabled = jest.fn()
const mockSetReminderEnabled = jest.fn()
const reminderAuthState = { userId: 'user-1' }

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => ({
    userId: reminderAuthState.userId,
    getReminderTime: mockGetReminderTime,
    setReminderTime: mockSetReminderTime,
    getReminderNotificationId: mockGetReminderNotificationId,
    setReminderNotificationId: mockSetReminderNotificationId,
    clearReminderNotificationId: mockClearReminderNotificationId,
    getReminderEnabled: mockGetReminderEnabled,
    setReminderEnabled: mockSetReminderEnabled,
  }),
}))

const mockRegisterNow = jest.fn().mockResolvedValue(undefined)

jest.mock('../src/hooks/usePushRegistration', () => ({
  usePushRegistration: () => ({ registerNow: mockRegisterNow }),
}))

const mockScheduleSessionReminder = jest.fn()
const mockCancelSessionReminder = jest.fn()

const mockGetPermissionsAsync = jest.fn()
const mockRequestPermissionsAsync = jest.fn()

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
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
    mockGetReminderEnabled.mockReturnValue(false)
    mockScheduleSessionReminder.mockResolvedValue('notif-new')
    mockCancelSessionReminder.mockResolvedValue(undefined)
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockRegisterNow.mockResolvedValue(undefined)
    jest.spyOn(Linking, 'openSettings').mockResolvedValue()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('selects Disable by default when the reminder is not enabled', () => {
    mockGetReminderEnabled.mockReturnValue(false)
    const { getByLabelText } = render(<ReminderSettingsScreen />)
    expect(getByLabelText('reminderSettings.disableOption').props.accessibilityState.checked).toBe(true)
    expect(getByLabelText('reminderSettings.enableOption').props.accessibilityState.checked).toBe(false)
  })

  it('selects Enable by default when the reminder is already enabled', () => {
    mockGetReminderEnabled.mockReturnValue(true)
    const { getByLabelText } = render(<ReminderSettingsScreen />)
    expect(getByLabelText('reminderSettings.enableOption').props.accessibilityState.checked).toBe(true)
  })

  it('does not show the time picker while Disable is selected', () => {
    mockGetReminderEnabled.mockReturnValue(false)
    const { queryByLabelText } = render(<ReminderSettingsScreen />)
    expect(queryByLabelText('mock-date-time-picker')).toBeNull()
  })

  it('defaults the picker to 08:00 when Enable is selected and no time has been stored', () => {
    const { getByLabelText, getByText } = render(<ReminderSettingsScreen />)
    fireEvent.press(getByLabelText('reminderSettings.enableOption'))
    expect(getByText('08:00')).toBeTruthy()
  })

  it('shows the previously stored time when the reminder is already enabled', () => {
    mockGetReminderEnabled.mockReturnValue(true)
    mockGetReminderTime.mockReturnValue('19:30')
    const { getByText } = render(<ReminderSettingsScreen />)
    expect(getByText('19:30')).toBeTruthy()
  })

  describe('Save with Disable selected', () => {
    it('cancels the existing notification, marks disabled, clears the notification id, and navigates back', async () => {
      mockGetReminderEnabled.mockReturnValue(true)
      mockGetReminderNotificationId.mockReturnValue('notif-old')
      const { getByLabelText } = render(<ReminderSettingsScreen />)
      fireEvent.press(getByLabelText('reminderSettings.disableOption'))

      await act(async () => {
        fireEvent.press(getByLabelText('reminderSettings.saveButton'))
      })

      expect(mockCancelSessionReminder).toHaveBeenCalledWith('notif-old')
      expect(mockSetReminderEnabled).toHaveBeenCalledWith(false)
      expect(mockClearReminderNotificationId).toHaveBeenCalled()
      expect(mockScheduleSessionReminder).not.toHaveBeenCalled()
      expect(mockSetReminderTime).not.toHaveBeenCalled()
      expect(mockRouterBack).toHaveBeenCalledTimes(1)
    })

    it('is a no-op cancel when there is no existing notification id', async () => {
      mockGetReminderNotificationId.mockReturnValue(null)
      const { getByLabelText } = render(<ReminderSettingsScreen />)

      await act(async () => {
        fireEvent.press(getByLabelText('reminderSettings.saveButton'))
      })

      expect(mockCancelSessionReminder).not.toHaveBeenCalled()
      expect(mockSetReminderEnabled).toHaveBeenCalledWith(false)
      expect(mockRouterBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('Save with Enable selected', () => {
    function selectEnable(getByLabelText: (label: string) => unknown) {
      fireEvent.press(getByLabelText('reminderSettings.enableOption') as never)
    }

    it('schedules + persists time + notification id + marks enabled + navigates back when permission is already granted', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' })
      const { getByLabelText } = render(<ReminderSettingsScreen />)
      selectEnable(getByLabelText)

      await act(async () => {
        fireEvent.press(getByLabelText('reminderSettings.saveButton'))
      })

      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled()
      expect(mockScheduleSessionReminder).toHaveBeenCalledWith('08:00', expect.any(Object))
      expect(mockSetReminderTime).toHaveBeenCalledWith('08:00')
      expect(mockSetReminderEnabled).toHaveBeenCalledWith(true)
      expect(mockSetReminderNotificationId).toHaveBeenCalledWith('notif-new')
      expect(mockRegisterNow).toHaveBeenCalledTimes(1)
      expect(mockRouterBack).toHaveBeenCalledTimes(1)
    })

    it('requests permission when undetermined and proceeds on grant', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' })
      const { getByLabelText } = render(<ReminderSettingsScreen />)
      selectEnable(getByLabelText)

      await act(async () => {
        fireEvent.press(getByLabelText('reminderSettings.saveButton'))
      })

      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1)
      expect(mockScheduleSessionReminder).toHaveBeenCalledWith('08:00', expect.any(Object))
      expect(mockRouterBack).toHaveBeenCalledTimes(1)
    })

    it('blocks Save and shows inline guidance when permission remains denied', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' })
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' })
      const { getByLabelText, getByText } = render(<ReminderSettingsScreen />)
      selectEnable(getByLabelText)

      await act(async () => {
        fireEvent.press(getByLabelText('reminderSettings.saveButton'))
      })

      expect(mockScheduleSessionReminder).not.toHaveBeenCalled()
      expect(mockSetReminderTime).not.toHaveBeenCalled()
      expect(mockSetReminderEnabled).not.toHaveBeenCalled()
      expect(mockRouterBack).not.toHaveBeenCalled()
      expect(getByText('reminderSettings.permissionRequired')).toBeTruthy()
    })

    it('tapping Open Settings in the guidance box opens OS settings', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' })
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' })
      const { getByLabelText } = render(<ReminderSettingsScreen />)
      selectEnable(getByLabelText)

      await act(async () => {
        fireEvent.press(getByLabelText('reminderSettings.saveButton'))
      })

      fireEvent.press(getByLabelText('reminderSettings.openSettings'))
      expect(Linking.openSettings).toHaveBeenCalledTimes(1)
    })

    it('changing the time then saving cancels the old notification before scheduling the new one (AC3)', async () => {
      mockGetReminderEnabled.mockReturnValue(true)
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
      expect(mockRouterBack).toHaveBeenCalledTimes(1)
    })

    it('Save when scheduling itself fails persists the time, does not store a notification id, but still navigates back', async () => {
      mockScheduleSessionReminder.mockResolvedValue(null)

      const { getByLabelText } = render(<ReminderSettingsScreen />)
      selectEnable(getByLabelText)

      await act(async () => {
        fireEvent.press(getByLabelText('reminderSettings.saveButton'))
      })

      expect(mockSetReminderTime).toHaveBeenCalledWith('08:00')
      expect(mockSetReminderEnabled).toHaveBeenCalledWith(true)
      expect(mockSetReminderNotificationId).not.toHaveBeenCalled()
      expect(mockClearReminderNotificationId).toHaveBeenCalled()
      expect(mockRouterBack).toHaveBeenCalledTimes(1)
    })

    it('cancels the newly scheduled notification when the user changes mid-Save (race guard)', async () => {
      let resolveSchedule: (id: string | null) => void = () => {}
      mockScheduleSessionReminder.mockImplementation(
        () => new Promise<string | null>(resolve => { resolveSchedule = resolve })
      )

      const { getByLabelText, rerender } = render(<ReminderSettingsScreen />)
      fireEvent.press(getByLabelText('reminderSettings.enableOption'))

      await act(async () => {
        fireEvent.press(getByLabelText('reminderSettings.saveButton'))
        // Flush the permission-check await so scheduleSessionReminder has actually been
        // called (and resolveSchedule captured) before we simulate the user-switch race.
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(mockScheduleSessionReminder).toHaveBeenCalled()

      // Simulate a sign-out/sign-in-as-different-user race while the schedule call is in flight.
      reminderAuthState.userId = 'user-2'
      rerender(<ReminderSettingsScreen />)

      await act(async () => {
        resolveSchedule('notif-leaked')
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(mockCancelSessionReminder).toHaveBeenCalledWith('notif-leaked')
      expect(mockSetReminderNotificationId).not.toHaveBeenCalled()
      expect(mockSetReminderTime).not.toHaveBeenCalled()
      expect(mockSetReminderEnabled).not.toHaveBeenCalled()
      expect(mockRouterBack).not.toHaveBeenCalled()
    })
  })
})
