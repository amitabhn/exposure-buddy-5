import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockRouterPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  // Deferred to a real effect (post-commit) rather than called synchronously during render —
  // this screen's focus callback calls setState, which would render-loop under the
  // call-immediately pattern used elsewhere (e.g. useFocusOnMount.test.tsx) where the
  // callback is side-effect-only.
  useFocusEffect: (cb: () => void) => { require('react').useEffect(cb) },
}))

const mockSignOut = jest.fn().mockResolvedValue(undefined)
const mockRequestAccountDeletion = jest.fn().mockResolvedValue(undefined)
const mockGetReminderTime = jest.fn()
const mockGetReminderEnabled = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    requestAccountDeletion: mockRequestAccountDeletion,
    authState: { userId: 'u1', session: {}, email: 'test@example.com' },
    isLoading: false,
    isAuthenticated: true,
    pendingDeletion: null,
    userId: 'u1',
    getReminderTime: mockGetReminderTime,
    getReminderEnabled: mockGetReminderEnabled,
  }),
}))

jest.mock('../../../src/components/settings/DeleteAccountModal', () => ({
  DeleteAccountModal: ({ visible, onConfirm, onCancel }: { visible: boolean; onConfirm: () => void; onCancel: () => void }) => {
    const { View, TouchableOpacity, Text } = require('react-native')
    if (!visible) return null
    return (
      <View>
        <TouchableOpacity onPress={onConfirm} accessibilityLabel="confirm-delete">
          <Text>{'confirm'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} accessibilityLabel="cancel-delete">
          <Text>{'cancel'}</Text>
        </TouchableOpacity>
      </View>
    )
  },
}))

import SettingsScreen from './index'

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetReminderTime.mockReturnValue(null)
    mockGetReminderEnabled.mockReturnValue(false)
  })

  it('renders the Sign out button', async () => {
    const { getByText } = render(<SettingsScreen />)
    await act(async () => {})
    expect(getByText('settings.signOut')).toBeTruthy()
  })

  it('pressing Sign out calls signOut', async () => {
    const { getByText } = render(<SettingsScreen />)
    await act(async () => {
      fireEvent.press(getByText('settings.signOut'))
    })
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('renders the Delete my account row', async () => {
    const { getByText } = render(<SettingsScreen />)
    await act(async () => {})
    expect(getByText('settings.privacy.deleteAccount')).toBeTruthy()
  })

  it('pressing Delete my account opens the modal', async () => {
    const { getByText, getByLabelText } = render(<SettingsScreen />)
    await act(async () => {})
    fireEvent.press(getByText('settings.privacy.deleteAccount'))
    expect(getByLabelText('confirm-delete')).toBeTruthy()
  })

  describe('Daily reminder row', () => {
    it('shows "Disabled" when no reminder is enabled', async () => {
      mockGetReminderEnabled.mockReturnValue(false)
      mockGetReminderTime.mockReturnValue(null)
      const { getByText } = render(<SettingsScreen />)
      await act(async () => {})
      expect(getByText('settings.reminders.disabledValue')).toBeTruthy()
    })

    it('shows "Disabled" when a time is stored but the reminder is not enabled', async () => {
      mockGetReminderEnabled.mockReturnValue(false)
      mockGetReminderTime.mockReturnValue('08:00')
      const { getByText } = render(<SettingsScreen />)
      await act(async () => {})
      expect(getByText('settings.reminders.disabledValue')).toBeTruthy()
    })

    it('shows the 12-hour formatted time when enabled', async () => {
      mockGetReminderEnabled.mockReturnValue(true)
      mockGetReminderTime.mockReturnValue('23:00')
      const { getByText } = render(<SettingsScreen />)
      await act(async () => {})
      expect(getByText('11:00 settings.reminders.pm')).toBeTruthy()
    })

    it('shows AM for morning hours', async () => {
      mockGetReminderEnabled.mockReturnValue(true)
      mockGetReminderTime.mockReturnValue('08:00')
      const { getByText } = render(<SettingsScreen />)
      await act(async () => {})
      expect(getByText('8:00 settings.reminders.am')).toBeTruthy()
    })

    it('falls back to "Disabled" when enabled but no time is stored', async () => {
      mockGetReminderEnabled.mockReturnValue(true)
      mockGetReminderTime.mockReturnValue(null)
      const { getByText } = render(<SettingsScreen />)
      await act(async () => {})
      expect(getByText('settings.reminders.disabledValue')).toBeTruthy()
    })

    it('pressing the row navigates to /reminder-settings', async () => {
      const { getByText } = render(<SettingsScreen />)
      await act(async () => {})
      fireEvent.press(getByText('settings.reminders.rowLabel'))
      expect(mockRouterPush).toHaveBeenCalledWith('/reminder-settings')
    })

    it('refreshes the displayed state on focus', async () => {
      mockGetReminderEnabled.mockReturnValue(false)
      const { getByText, rerender } = render(<SettingsScreen />)
      await act(async () => {})
      expect(getByText('settings.reminders.disabledValue')).toBeTruthy()

      mockGetReminderEnabled.mockReturnValue(true)
      mockGetReminderTime.mockReturnValue('19:30')
      await act(async () => {
        rerender(<SettingsScreen />)
      })
      expect(getByText('7:30 settings.reminders.pm')).toBeTruthy()
    })
  })
})
