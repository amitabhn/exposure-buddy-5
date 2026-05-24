import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'

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
  })

  it('renders the Sign out button', () => {
    const { getByText } = render(<SettingsScreen />)
    expect(getByText('settings.signOut')).toBeTruthy()
  })

  it('pressing Sign out calls signOut', async () => {
    const { getByText } = render(<SettingsScreen />)
    await act(async () => {
      fireEvent.press(getByText('settings.signOut'))
    })
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('renders the Delete my account row', () => {
    const { getByText } = render(<SettingsScreen />)
    expect(getByText('settings.privacy.deleteAccount')).toBeTruthy()
  })

  it('pressing Delete my account opens the modal', () => {
    const { getByText, getByLabelText } = render(<SettingsScreen />)
    fireEvent.press(getByText('settings.privacy.deleteAccount'))
    expect(getByLabelText('confirm-delete')).toBeTruthy()
  })
})
