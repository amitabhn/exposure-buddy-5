import React from 'react'
import { Linking } from 'react-native'
import { render, fireEvent, act, waitFor } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockSignOut = jest.fn().mockResolvedValue(undefined)
const mockRequestAccountDeletion = jest.fn().mockResolvedValue(undefined)

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    requestAccountDeletion: mockRequestAccountDeletion,
    authState: { userId: 'u1', session: {}, email: 'test@example.com' },
    isLoading: false,
    isAuthenticated: true,
    pendingDeletion: null,
    userId: 'u1',
  }),
}))

const mockRegisterNow = jest.fn().mockResolvedValue(undefined)

jest.mock('../../../src/hooks/usePushRegistration', () => ({
  usePushRegistration: () => ({ registerNow: mockRegisterNow }),
}))

const mockGetPermissionsAsync = jest.fn()
const mockRequestPermissionsAsync = jest.fn()

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
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
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
    jest.spyOn(Linking, 'openSettings').mockResolvedValue()
  })

  afterEach(() => {
    jest.restoreAllMocks()
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

  describe('Enable reminders card', () => {
    it('renders the not-yet-requested state on mount', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
      const { findByText } = render(<SettingsScreen />)
      await act(async () => {})
      expect(await findByText('settings.reminders.notYetRequested')).toBeTruthy()
    })

    it('renders the enabled state when permission is already granted', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' })
      const { findByText } = render(<SettingsScreen />)
      await act(async () => {})
      expect(await findByText('settings.reminders.enabled')).toBeTruthy()
    })

    it('renders the disabled state when permission was previously denied', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' })
      const { findByText } = render(<SettingsScreen />)
      await act(async () => {})
      expect(await findByText('settings.reminders.disabled')).toBeTruthy()
    })

    it('falls back to not-yet-requested and logs when getPermissionsAsync returns an unexpected status', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      mockGetPermissionsAsync.mockResolvedValue({ status: 'provisional' })
      const { findByText } = render(<SettingsScreen />)
      await act(async () => {})
      expect(await findByText('settings.reminders.notYetRequested')).toBeTruthy()
      expect(warnSpy).toHaveBeenCalled()
    })

    it('falls back to not-yet-requested and logs when getPermissionsAsync throws', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      mockGetPermissionsAsync.mockRejectedValue(new Error('native module unavailable'))
      const { findByText } = render(<SettingsScreen />)
      await act(async () => {})
      expect(await findByText('settings.reminders.notYetRequested')).toBeTruthy()
      expect(warnSpy).toHaveBeenCalled()
    })

    it('tapping when not-yet-requested calls requestPermissionsAsync and registers on grant', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' })
      const { findByText } = render(<SettingsScreen />)
      await act(async () => {})
      const row = await findByText('settings.reminders.notYetRequested')

      await act(async () => {
        fireEvent.press(row)
      })

      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1)
      expect(mockRegisterNow).toHaveBeenCalledTimes(1)
      await waitFor(async () => {
        expect(await findByText('settings.reminders.enabled')).toBeTruthy()
      })
    })

    it('tapping when not-yet-requested and permission is denied does not register', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
      mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' })
      const { findByText } = render(<SettingsScreen />)
      await act(async () => {})
      const row = await findByText('settings.reminders.notYetRequested')

      await act(async () => {
        fireEvent.press(row)
      })

      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1)
      expect(mockRegisterNow).not.toHaveBeenCalled()
    })

    it('tapping when disabled opens OS settings via deep-link, not requestPermissionsAsync', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' })
      const { findByText } = render(<SettingsScreen />)
      await act(async () => {})
      const row = await findByText('settings.reminders.disabled')

      await act(async () => {
        fireEvent.press(row)
      })

      expect(Linking.openSettings).toHaveBeenCalledTimes(1)
      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled()
    })

    it('tapping when already enabled does not call requestPermissionsAsync or openSettings', async () => {
      mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' })
      const { findByText } = render(<SettingsScreen />)
      await act(async () => {})
      const row = await findByText('settings.reminders.enabled')

      await act(async () => {
        fireEvent.press(row)
      })

      expect(mockRequestPermissionsAsync).not.toHaveBeenCalled()
      expect(Linking.openSettings).not.toHaveBeenCalled()
    })
  })
})
