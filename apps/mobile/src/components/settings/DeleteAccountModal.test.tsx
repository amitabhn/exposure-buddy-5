import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, _opts?: object) => key,
  }),
}))

import { DeleteAccountModal } from './DeleteAccountModal'

describe('DeleteAccountModal', () => {
  const defaultProps = {
    visible: true,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    isLoading: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all four DPDPA copy keys when visible', () => {
    const { getByText } = render(<DeleteAccountModal {...defaultProps} />)
    expect(getByText('settings.deletion.whatHappens')).toBeTruthy()
    expect(getByText('settings.deletion.whatRetained')).toBeTruthy()
    expect(getByText('settings.deletion.windowMeaning')).toBeTruthy()
    expect(getByText('settings.deletion.dpoContact')).toBeTruthy()
  })

  it('calls onConfirm when delete button is pressed', () => {
    const onConfirm = jest.fn()
    const { getAllByRole } = render(<DeleteAccountModal {...defaultProps} onConfirm={onConfirm} />)
    const buttons = getAllByRole('button')
    const deleteBtn = buttons.find(b => b.props.accessibilityLabel === 'settings.deletion.confirmButton')
    expect(deleteBtn).toBeTruthy()
    fireEvent.press(deleteBtn!)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn()
    const { getAllByRole } = render(<DeleteAccountModal {...defaultProps} onCancel={onCancel} />)
    const buttons = getAllByRole('button')
    const cancelBtn = buttons.find(b => b.props.accessibilityLabel === 'settings.deletion.cancelButton')
    expect(cancelBtn).toBeTruthy()
    fireEvent.press(cancelBtn!)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('delete button is disabled when isLoading is true', () => {
    const { getAllByRole } = render(<DeleteAccountModal {...defaultProps} isLoading={true} />)
    const buttons = getAllByRole('button')
    const deleteBtn = buttons.find(b => b.props.accessibilityLabel === 'settings.deletion.confirmButton')
    expect(deleteBtn).toBeTruthy()
    expect(deleteBtn!.props.accessibilityState?.disabled).toBe(true)
  })

  it('cancel button has correct accessibilityRole and label', () => {
    const { getAllByRole } = render(<DeleteAccountModal {...defaultProps} />)
    const buttons = getAllByRole('button')
    const cancelBtn = buttons.find(b => b.props.accessibilityLabel === 'settings.deletion.cancelButton')
    expect(cancelBtn).toBeTruthy()
    expect(cancelBtn!.props.accessibilityRole).toBe('button')
  })

  it('delete button has correct accessibilityRole and label', () => {
    const { getAllByRole } = render(<DeleteAccountModal {...defaultProps} />)
    const buttons = getAllByRole('button')
    const deleteBtn = buttons.find(b => b.props.accessibilityLabel === 'settings.deletion.confirmButton')
    expect(deleteBtn).toBeTruthy()
    expect(deleteBtn!.props.accessibilityRole).toBe('button')
  })
})
