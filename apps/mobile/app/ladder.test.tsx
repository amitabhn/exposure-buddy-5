import React from 'react'
import { AccessibilityInfo, Alert } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'

jest.mock('react-native-draggable-flatlist', () => {
  const MockReact = require('react')
  const { FlatList } = require('react-native')
  return {
    __esModule: true,
    default: ({ data, renderItem, keyExtractor }: any) => (
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={({ item, index }: any) =>
          renderItem({ item, drag: jest.fn(), isActive: false, getIndex: () => index })
        }
      />
    ),
    ScaleDecorator: ({ children }: any) => children,
  }
})

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockRouterPush = jest.fn()
const mockRouterReplace = jest.fn()

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
}))

const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('../src/hooks/useFearLadderItems', () => ({
  useFearLadderItems: jest.fn(),
}))

jest.mock('../src/hooks/useActiveExposureSession', () => ({
  useActiveExposureSession: jest.fn(),
}))

const mockEnqueue = jest.fn().mockResolvedValue(undefined)

jest.mock('../src/sync/adapter', () => ({
  getAdapter: jest.fn(() => ({ enqueue: mockEnqueue })),
}))

jest.mock('../src/components/navigation/BackButton', () => ({
  BackButton: () => null,
}))

const mockDetectCrisisKeywords = jest.fn<boolean, [string]>(() => false)

jest.mock('@exposure-buddy/core', () => ({
  detectCrisisKeywords: (text: string) => mockDetectCrisisKeywords(text),
}))

import { useFearLadderItems } from '../src/hooks/useFearLadderItems'
import { useActiveExposureSession } from '../src/hooks/useActiveExposureSession'
import LadderScreen from './ladder'

const mockUseFearLadderItems = useFearLadderItems as jest.Mock
const mockUseActiveExposureSession = useActiveExposureSession as jest.Mock

const baseItem = {
  id: 'item-1',
  description: 'Test situation',
  predictedSuds: 5,
  position: 1,
  status: 'pending',
}

describe('LadderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {})
    jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(42)
    mockUseAuth.mockReturnValue({ userId: 'user-123', sessionRecoveryData: null })
    mockUseFearLadderItems.mockReturnValue({ items: [], isLoading: false })
    mockUseActiveExposureSession.mockReturnValue({ activeSession: null, isLoading: false })
    mockDetectCrisisKeywords.mockReturnValue(false)
    mockEnqueue.mockResolvedValue(undefined)
    jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('renders empty state when no items', () => {
    const { getByText } = render(<LadderScreen />)
    expect(getByText('ladder.emptyState')).toBeTruthy()
  })

  it('renders items sorted by position', () => {
    const itemB = { id: 'b', description: 'Item B', predictedSuds: 7, position: 2, status: 'pending' }
    const itemA = { id: 'a', description: 'Item A', predictedSuds: 3, position: 1, status: 'pending' }
    mockUseFearLadderItems.mockReturnValue({ items: [itemB, itemA], isLoading: false })
    const { getAllByRole } = render(<LadderScreen />)
    const buttons = getAllByRole('button')
    const firstItemButton = buttons.find(b => b.props.accessibilityLabel?.includes('Item A'))
    const secondItemButton = buttons.find(b => b.props.accessibilityLabel?.includes('Item B'))
    expect(firstItemButton).toBeTruthy()
    expect(secondItemButton).toBeTruthy()
  })

  it('renders status labels for each item', () => {
    mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
    const { getByText } = render(<LadderScreen />)
    expect(getByText('ladder.statusPending', { exact: false })).toBeTruthy()
  })

  it('Add situation button is present', () => {
    const { getByRole } = render(<LadderScreen />)
    expect(getByRole('button', { name: 'ladder.addItem' })).toBeTruthy()
  })

  it('tapping Add situation opens form', () => {
    const { getByRole, getAllByText } = render(<LadderScreen />)
    fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
    expect(getAllByText('ladder.addItem').length).toBeGreaterThanOrEqual(1)
  })

  it('form save disabled when description empty', () => {
    const { getByRole } = render(<LadderScreen />)
    fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
    const saveButton = getByRole('button', { name: 'ladder.saveItem' })
    expect(saveButton.props.accessibilityState.disabled).toBe(true)
  })

  it('form save disabled when SUDS null', () => {
    const { getByRole, getByLabelText } = render(<LadderScreen />)
    fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
    fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'Some situation')
    const saveButton = getByRole('button', { name: 'ladder.saveItem' })
    expect(saveButton.props.accessibilityState.disabled).toBe(true)
  })

  it('cancel button closes form', () => {
    const { getByRole, queryByLabelText } = render(<LadderScreen />)
    fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
    fireEvent.press(getByRole('button', { name: 'ladder.cancel' }))
    expect(queryByLabelText('ladder.descriptionLabel')).toBeNull()
  })

  it('detectCrisisKeywords called on add submit and shows banner', async () => {
    mockDetectCrisisKeywords.mockReturnValue(true)
    const { getByRole, getByLabelText, getByText } = render(<LadderScreen />)
    fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
    fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'distressing situation')
    fireEvent.changeText(getByLabelText('ladder.sudsLabel'), '8')
    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'ladder.saveItem' }))
    })
    expect(mockDetectCrisisKeywords).toHaveBeenCalledWith('distressing situation')
    expect(getByText('ladder.crisis.banner')).toBeTruthy()
    expect(getByRole('button', { name: 'ladder.crisis.cta' })).toBeTruthy()
  })

  it('crisis CTA navigates to /calm-me', async () => {
    mockDetectCrisisKeywords.mockReturnValue(true)
    const { getByRole, getByLabelText } = render(<LadderScreen />)
    fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
    fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'distressing situation')
    fireEvent.changeText(getByLabelText('ladder.sudsLabel'), '8')
    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'ladder.saveItem' }))
    })
    fireEvent.press(getByRole('button', { name: 'ladder.crisis.cta' }))
    expect(mockRouterPush).toHaveBeenCalledWith('/calm-me')
  })

  it('crisis banner not shown when no crisis keyword', async () => {
    mockDetectCrisisKeywords.mockReturnValue(false)
    const { getByRole, getByLabelText, queryByText } = render(<LadderScreen />)
    fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
    fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'normal situation')
    fireEvent.changeText(getByLabelText('ladder.sudsLabel'), '3')
    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'ladder.saveItem' }))
    })
    expect(queryByText('ladder.crisis.banner')).toBeNull()
  })

  it('getAdapter().enqueue called on add submit', async () => {
    const { getByRole, getByLabelText } = render(<LadderScreen />)
    fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
    fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'test situation')
    fireEvent.changeText(getByLabelText('ladder.sudsLabel'), '3')
    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'ladder.saveItem' }))
    })
    expect(mockEnqueue).toHaveBeenCalledWith(
      'fear_ladder_items',
      'INSERT',
      expect.objectContaining({ description: 'test situation', predicted_suds: 3, status: 'pending' })
    )
  })

  it('getAdapter().enqueue called with UPDATE on edit submit', async () => {
    mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
    const { getAllByRole, getByLabelText } = render(<LadderScreen />)
    const itemButton = getAllByRole('button').find(b => b.props.accessibilityLabel?.includes('Test situation'))
    fireEvent.press(itemButton!)
    fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'Updated description')
    await act(async () => {
      const saveButton = getAllByRole('button').find(b => b.props.accessibilityLabel === 'ladder.saveItem')
      fireEvent.press(saveButton!)
    })
    expect(mockEnqueue).toHaveBeenCalledWith(
      'fear_ladder_items',
      'UPDATE',
      expect.objectContaining({ id: 'item-1', description: 'Updated description' })
    )
  })

  it('edit form shows existing description and suds', () => {
    mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
    const { getAllByRole, getByLabelText } = render(<LadderScreen />)
    const itemButton = getAllByRole('button').find(b => b.props.accessibilityLabel?.includes('Test situation'))
    fireEvent.press(itemButton!)
    expect(getByLabelText('ladder.descriptionLabel').props.value).toBe('Test situation')
    expect(getByLabelText('ladder.sudsLabel').props.value).toBe('5')
  })

  it('accessibility focus set on first item after 100ms', () => {
    mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
    render(<LadderScreen />)
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42)
  })

  it('accessibility focus set on Add button when empty', () => {
    mockUseFearLadderItems.mockReturnValue({ items: [], isLoading: false })
    render(<LadderScreen />)
    act(() => {
      jest.advanceTimersByTime(100)
    })
    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42)
  })

  describe('Remove item (Story 6.2-C)', () => {
    it('Remove button is not shown on the Add path', () => {
      const { queryByRole } = render(<LadderScreen />)
      fireEvent.press(queryByRole('button', { name: 'ladder.addItem' })!)
      expect(queryByRole('button', { name: 'ladder.removeItem' })).toBeNull()
    })

    it('Remove button is visible when editing an existing item', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { getAllByRole, getByRole } = render(<LadderScreen />)
      const itemButton = getAllByRole('button').find(b => b.props.accessibilityLabel?.includes('Test situation'))
      fireEvent.press(itemButton!)
      expect(getByRole('button', { name: 'ladder.removeItem' })).toBeTruthy()
    })

    it('tapping Remove opens the confirm alert with the gravity copy', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { getAllByRole, getByRole } = render(<LadderScreen />)
      const itemButton = getAllByRole('button').find(b => b.props.accessibilityLabel?.includes('Test situation'))
      fireEvent.press(itemButton!)
      fireEvent.press(getByRole('button', { name: 'ladder.removeItem' }))

      expect(Alert.alert).toHaveBeenCalledWith(
        'ladder.delete.confirmTitle',
        'ladder.delete.confirmMessage',
        expect.arrayContaining([
          expect.objectContaining({ text: 'ladder.cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'ladder.delete.confirmButton', style: 'destructive' }),
        ])
      )
    })

    it('confirming the alert calls enqueue with DELETE', async () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { getAllByRole, getByRole } = render(<LadderScreen />)
      const itemButton = getAllByRole('button').find(b => b.props.accessibilityLabel?.includes('Test situation'))
      fireEvent.press(itemButton!)
      fireEvent.press(getByRole('button', { name: 'ladder.removeItem' }))

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0]
      const buttons = alertCall[2] as { text: string; onPress?: () => void }[]
      const removeButton = buttons.find(b => b.text === 'ladder.delete.confirmButton')
      await act(async () => {
        removeButton!.onPress!()
      })

      expect(mockEnqueue).toHaveBeenCalledWith('fear_ladder_items', 'DELETE', { id: 'item-1' })
    })

    it('canceling the alert does not call enqueue', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { getAllByRole, getByRole } = render(<LadderScreen />)
      const itemButton = getAllByRole('button').find(b => b.props.accessibilityLabel?.includes('Test situation'))
      fireEvent.press(itemButton!)
      fireEvent.press(getByRole('button', { name: 'ladder.removeItem' }))

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0]
      const buttons = alertCall[2] as { text: string; onPress?: () => void }[]
      const cancelButton = buttons.find(b => b.text === 'ladder.cancel')
      expect(cancelButton!.onPress).toBeUndefined()
      expect(mockEnqueue).not.toHaveBeenCalled()
    })

    it('Remove button is disabled and guard text shown when an active session exists', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      mockUseActiveExposureSession.mockReturnValue({
        activeSession: { id: 's1', fearItemId: 'item-1', startedAt: '2026-01-01T00:00:00Z' },
        isLoading: false,
      })
      const { getAllByRole, getByRole, getByText } = render(<LadderScreen />)
      const itemButton = getAllByRole('button').find(b => b.props.accessibilityLabel?.includes('Test situation'))
      fireEvent.press(itemButton!)

      const removeButton = getByRole('button', { name: 'ladder.removeItem' })
      expect(removeButton.props.accessibilityState.disabled).toBe(true)
      expect(getByText('ladder.delete.guardMessage')).toBeTruthy()
    })

    it('Remove button is disabled and guard text shown while the active-session query is still loading (D8b)', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      mockUseActiveExposureSession.mockReturnValue({ activeSession: null, isLoading: true })
      const { getAllByRole, getByRole, getByText } = render(<LadderScreen />)
      const itemButton = getAllByRole('button').find(b => b.props.accessibilityLabel?.includes('Test situation'))
      fireEvent.press(itemButton!)

      const removeButton = getByRole('button', { name: 'ladder.removeItem' })
      expect(removeButton.props.accessibilityState.disabled).toBe(true)
      expect(getByText('ladder.delete.guardMessage')).toBeTruthy()
    })
  })

  describe('Start session button (T7.1 / T7.2)', () => {
    it('shows Start session button for a pending item', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { getByRole } = render(<LadderScreen />)
      expect(getByRole('button', { name: `ladder.startSession, ${baseItem.description}` })).toBeTruthy()
    })

    it('shows Start session button for a completed item', () => {
      const completedItem = { ...baseItem, status: 'completed' }
      mockUseFearLadderItems.mockReturnValue({ items: [completedItem], isLoading: false })
      const { getByRole } = render(<LadderScreen />)
      expect(getByRole('button', { name: `ladder.startSession, ${completedItem.description}` })).toBeTruthy()
    })

    it('pressing Start session navigates to /session/technique', () => {
      mockUseAuth.mockReturnValue({ userId: 'user-123', sessionRecoveryData: null })
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { getByRole } = render(<LadderScreen />)
      fireEvent.press(getByRole('button', { name: `ladder.startSession, ${baseItem.description}` }))
      expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining('/session/technique'))
      expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining(`fearItemId=${baseItem.id}`))
    })

    it('pressing Start session redirects to home when a session is already in progress (T7.2)', () => {
      mockUseAuth.mockReturnValue({ userId: 'user-123', sessionRecoveryData: { sessionId: 's1', fearItemId: 'item-1', preSuds: 5, description: 'test' } })
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { getByRole } = render(<LadderScreen />)
      fireEvent.press(getByRole('button', { name: `ladder.startSession, ${baseItem.description}` }))
      expect(mockRouterReplace).toHaveBeenCalledWith('/')
      expect(mockRouterPush).not.toHaveBeenCalled()
    })
  })
})
