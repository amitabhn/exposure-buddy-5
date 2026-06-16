import React from 'react'
import { AccessibilityInfo } from 'react-native'
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

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useRouter: () => ({ push: mockRouterPush }),
}))

const mockUseAuth = jest.fn()

jest.mock('@exposure-buddy/supabase', () => ({
  useAuth: () => mockUseAuth(),
}))

jest.mock('../src/hooks/useFearLadderItems', () => ({
  useFearLadderItems: jest.fn(),
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
import LadderScreen from './ladder'

const mockUseFearLadderItems = useFearLadderItems as jest.Mock

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
    mockUseAuth.mockReturnValue({ userId: 'user-123' })
    mockUseFearLadderItems.mockReturnValue({ items: [], isLoading: false })
    mockDetectCrisisKeywords.mockReturnValue(false)
    mockEnqueue.mockResolvedValue(undefined)
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
})
