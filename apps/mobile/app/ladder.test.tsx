import React from 'react'
import { AccessibilityInfo, Alert } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'

// `mock` prefix lets the hoisted factory reference it; tests call the screen's onDragEnd through it
const mockListMounts = { count: 0 }
const mockDragEnd: { current: ((e: { data: any[]; from: number; to: number }) => void) | null } = { current: null }

jest.mock('react-native-draggable-flatlist', () => {
  const MockReact = require('react')
  const { FlatList } = require('react-native')
  function MockDraggableFlatList({ data, renderItem, keyExtractor, onDragEnd }: any) {
    MockReact.useEffect(() => { mockListMounts.count += 1 }, [])
    mockDragEnd.current = onDragEnd
    return (
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={({ item, index }: any) =>
          renderItem({ item, drag: jest.fn(), isActive: false, getIndex: () => index })
        }
      />
    )
  }
  return {
    __esModule: true,
    default: MockDraggableFlatList,
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

// Auto-fires the 'transitionEnd' listener synchronously by default so every existing test
// (none of which are testing transition timing itself) behaves as if the screen transition
// already completed. Tests that specifically cover the transition gate (Story 12.3 AC-B3)
// override this per-test via mockAddListener.mockImplementation(...).
const mockAddListener = jest.fn((event: string, callback: (e: { data: { closing: boolean } }) => void) => {
  if (event === 'transitionEnd') callback({ data: { closing: false } })
  return jest.fn()
})

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
  useNavigation: () => ({ addListener: mockAddListener }),
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

// SudsSlider is covered by its own suite; here a text field stands in so the form logic stays testable.
jest.mock('../src/components/SudsSlider', () => {
  const { TextInput } = require('react-native')
  return {
    SudsSlider: ({ value, onChange }: { value: number | null; onChange: (v: number) => void }) => (
      <TextInput
        accessibilityLabel="ladder.sudsLabel"
        value={value !== null ? String(value) : ''}
        onChangeText={(v: string) => {
          const n = parseInt(v, 10)
          if (!isNaN(n) && n >= 0 && n <= 10) onChange(n)
        }}
      />
    ),
  }
})

jest.mock('../src/components/navigation/BackButton', () => ({
  BackButton: () => null,
}))

const mockDetectCrisisKeywords = jest.fn<boolean, [string]>(() => false)

jest.mock('@exposure-buddy/core', () => ({
  sortLadderForDisplay: jest.requireActual('../../../packages/core/src/selectors/fearLadder').sortLadderForDisplay,
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

// Matches the item row's accessibilityLabel by its leading "<description>," segment rather
// than a bare substring — `.includes()` would also match a button whose label merely contains
// `description` as a substring of a longer, unrelated description.
function findItemButton(getAllByRole: ReturnType<typeof render>['getAllByRole'], description: string) {
  return getAllByRole('button').find(b => b.props.accessibilityLabel?.startsWith(`${description},`))
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
    const firstItemButton = buttons.find(b => b.props.accessibilityLabel?.startsWith('Item A,'))
    const secondItemButton = buttons.find(b => b.props.accessibilityLabel?.startsWith('Item B,'))
    expect(firstItemButton).toBeTruthy()
    expect(secondItemButton).toBeTruthy()
  })

  describe('completed items (Story 19.3)', () => {
    const mk = (id: string, position: number, status: string) =>
      ({ id, description: `Item ${id}`, predictedSuds: 5, position, status })
    const mixed = [mk('1', 1, 'completed'), mk('2', 2, 'pending'), mk('3', 3, 'completed'), mk('4', 4, 'pending')]
    const labels = (getAllByRole: ReturnType<typeof render>['getAllByRole']) =>
      getAllByRole('button')
        .map(b => b.props.accessibilityLabel as string | undefined)
        .filter((l): l is string => !!l && l.startsWith('Item '))
        .map(l => l.slice(0, 6))

    it('shows unfinished items first, completed after', () => {
      mockUseFearLadderItems.mockReturnValue({ items: mixed, isLoading: false })
      const { getAllByRole } = render(<LadderScreen />)
      expect(labels(getAllByRole)).toEqual(['Item 2', 'Item 4', 'Item 1', 'Item 3'])
    })

    it('marks completed rows with a check mark and the Done status, announced in the label', () => {
      mockUseFearLadderItems.mockReturnValue({ items: mixed, isLoading: false })
      const { getAllByRole, getAllByText } = render(<LadderScreen />)
      expect(getAllByText(/✓/)).toHaveLength(2)
      expect(findItemButton(getAllByRole, 'Item 1')?.props.accessibilityLabel).toContain('ladder.statusCompleted')
      expect(findItemButton(getAllByRole, 'Item 2')?.props.accessibilityLabel).not.toContain('ladder.statusCompleted')
    })

    it('tapping a completed item opens the edit sheet with Start session', () => {
      mockUseFearLadderItems.mockReturnValue({ items: mixed, isLoading: false })
      const { getAllByRole, getByRole } = render(<LadderScreen />)
      fireEvent.press(findItemButton(getAllByRole, 'Item 1')!)
      expect(getByRole('button', { name: 'ladder.startSession, Item 1' })).toBeTruthy()
    })

    it('dragging within the unfinished group reuses that group\'s own positions', () => {
      mockUseFearLadderItems.mockReturnValue({ items: mixed, isLoading: false })
      const { getAllByRole } = render(<LadderScreen />)
      // display order: 2, 4, 1, 3 -> drag Item 2 below Item 4
      act(() => { mockDragEnd.current!({ data: [mixed[3]!, mixed[1]!, mixed[0]!, mixed[2]!], from: 0, to: 1 }) })
      expect(mockEnqueue).toHaveBeenCalledWith('fear_ladder_items', 'reorder_positions', expect.objectContaining({
        itemAId: '2', itemANewPosition: 4, itemBId: '4', itemBNewPosition: 2,
      }))
      // optimistic update: the unfinished rows swap, completed rows stay put
      expect(labels(getAllByRole)).toEqual(['Item 4', 'Item 2', 'Item 1', 'Item 3'])
    })

    it('dragging within the completed group reuses that group\'s own positions', () => {
      mockUseFearLadderItems.mockReturnValue({ items: mixed, isLoading: false })
      const { getAllByRole } = render(<LadderScreen />)
      // drag Item 1 (display index 2) below Item 3 (index 3)
      act(() => { mockDragEnd.current!({ data: [mixed[1]!, mixed[3]!, mixed[2]!, mixed[0]!], from: 2, to: 3 }) })
      expect(mockEnqueue).toHaveBeenCalledWith('fear_ladder_items', 'reorder_positions', expect.objectContaining({
        itemAId: '1', itemANewPosition: 3, itemBId: '3', itemBNewPosition: 1,
      }))
      expect(labels(getAllByRole)).toEqual(['Item 2', 'Item 4', 'Item 3', 'Item 1'])
    })

    it('dragging works when every item is completed (group starts at index 0)', () => {
      const allDone = [mk('1', 1, 'completed'), mk('2', 2, 'completed')]
      mockUseFearLadderItems.mockReturnValue({ items: allDone, isLoading: false })
      const { getAllByRole } = render(<LadderScreen />)
      act(() => { mockDragEnd.current!({ data: [allDone[1]!, allDone[0]!], from: 0, to: 1 }) })
      expect(mockEnqueue).toHaveBeenCalledWith('fear_ladder_items', 'reorder_positions', expect.objectContaining({
        itemAId: '1', itemANewPosition: 2, itemBId: '2', itemBNewPosition: 1,
      }))
      expect(labels(getAllByRole)).toEqual(['Item 2', 'Item 1'])
    })

    it('ignores a drop across the group boundary', () => {
      mockUseFearLadderItems.mockReturnValue({ items: mixed, isLoading: false })
      const { getAllByRole } = render(<LadderScreen />)
      const before = mockListMounts.count
      act(() => { mockDragEnd.current!({ data: [mixed[3]!, mixed[0]!, mixed[1]!, mixed[2]!], from: 1, to: 2 }) })
      expect(mockEnqueue).not.toHaveBeenCalled()
      expect(labels(getAllByRole)).toEqual(['Item 2', 'Item 4', 'Item 1', 'Item 3'])
      // the real list keeps its dropped order until remounted, so a rejected drop must remount it
      expect(mockListMounts.count).toBe(before + 1)
    })
  })

  describe('multi-slot drag (Story 19.6)', () => {
    const mk = (id: string, position: number, status = 'pending') =>
      ({ id, description: `Item ${id}`, predictedSuds: 5, position, status })
    const four = [mk('1', 1), mk('2', 2), mk('3', 3), mk('4', 4)]
    const labels = (getAllByRole: ReturnType<typeof render>['getAllByRole']) =>
      getAllByRole('button')
        .map(b => b.props.accessibilityLabel as string | undefined)
        .filter((l): l is string => !!l && l.startsWith('Item '))
        .map(l => l.slice(5, 6))
    const payloads = () => mockEnqueue.mock.calls.map(call => call[2])
    // Replays the enqueued swaps over the starting positions, as the server would apply them.
    const replay = (items: { id: string; position: number }[]) => {
      const positions = new Map(items.map(i => [i.id, i.position]))
      for (const p of payloads()) {
        positions.set(p.itemAId, p.itemANewPosition)
        positions.set(p.itemBId, p.itemBNewPosition)
      }
      return [...positions.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)
    }

    it('a 2-slot drag down enqueues two adjacent swaps in order', async () => {
      mockUseFearLadderItems.mockReturnValue({ items: four, isLoading: false })
      const { getAllByRole } = render(<LadderScreen />)
      await act(async () => { mockDragEnd.current!({ data: [four[1]!, four[2]!, four[0]!, four[3]!], from: 0, to: 2 }) })
      expect(payloads()).toEqual([
        expect.objectContaining({ itemAId: '1', itemANewPosition: 2, itemBId: '2', itemBNewPosition: 1 }),
        expect.objectContaining({ itemAId: '1', itemANewPosition: 3, itemBId: '3', itemBNewPosition: 2 }),
      ])
      expect(labels(getAllByRole)).toEqual(['2', '3', '1', '4'])
      expect(replay(four)).toEqual(['2', '3', '1', '4'])
    })

    it('a 2-slot drag up enqueues two adjacent swaps in order', async () => {
      mockUseFearLadderItems.mockReturnValue({ items: four, isLoading: false })
      const { getAllByRole } = render(<LadderScreen />)
      await act(async () => { mockDragEnd.current!({ data: [four[0]!, four[3]!, four[1]!, four[2]!], from: 3, to: 1 }) })
      expect(payloads()).toEqual([
        expect.objectContaining({ itemAId: '4', itemANewPosition: 3, itemBId: '3', itemBNewPosition: 4 }),
        expect.objectContaining({ itemAId: '4', itemANewPosition: 2, itemBId: '2', itemBNewPosition: 3 }),
      ])
      expect(labels(getAllByRole)).toEqual(['1', '4', '2', '3'])
      expect(replay(four)).toEqual(['1', '4', '2', '3'])
    })

    it('a full-length drag reproduces the optimistic order on the server, with gaps in stored positions', async () => {
      const gapped = [mk('1', 2), mk('2', 5), mk('3', 6), mk('4', 9)]
      mockUseFearLadderItems.mockReturnValue({ items: gapped, isLoading: false })
      const { getAllByRole } = render(<LadderScreen />)
      await act(async () => { mockDragEnd.current!({ data: [gapped[3]!, gapped[0]!, gapped[1]!, gapped[2]!], from: 3, to: 0 }) })
      expect(payloads()).toHaveLength(3)
      expect(labels(getAllByRole)).toEqual(['4', '1', '2', '3'])
      expect(replay(gapped)).toEqual(['4', '1', '2', '3'])
    })

    it('a multi-slot drag inside the completed group never mentions an unfinished item', async () => {
      const items = [mk('1', 1, 'completed'), mk('2', 2, 'completed'), mk('3', 3, 'completed'), mk('4', 4)]
      mockUseFearLadderItems.mockReturnValue({ items, isLoading: false })
      const { getAllByRole } = render(<LadderScreen />)
      // display order: 4, 1, 2, 3 -> drag Item 3 (index 3) up to index 1
      await act(async () => { mockDragEnd.current!({ data: [items[3]!, items[2]!, items[0]!, items[1]!], from: 3, to: 1 }) })
      expect(payloads()).toHaveLength(2)
      for (const p of payloads()) {
        expect(p.itemAId).not.toBe('4')
        expect(p.itemBId).not.toBe('4')
      }
      expect(labels(getAllByRole)).toEqual(['4', '3', '1', '2'])
      expect(replay(items)).toEqual(['3', '1', '2', '4'])
    })

    it('a failed enqueue stops the chain and logs the existing message', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockEnqueue.mockRejectedValueOnce(new Error('sqlite busy'))
      mockUseFearLadderItems.mockReturnValue({ items: four, isLoading: false })
      render(<LadderScreen />)
      await act(async () => { mockDragEnd.current!({ data: [four[1]!, four[2]!, four[0]!, four[3]!], from: 0, to: 2 }) })
      expect(mockEnqueue).toHaveBeenCalledTimes(1)
      expect(consoleError).toHaveBeenCalledWith('[LadderScreen] reorder enqueue failed:', expect.any(Error))
    })

    it('two back-to-back drags enqueue all of the first chain before any of the second', async () => {
      let releaseFirst: () => void = () => {}
      mockEnqueue.mockImplementationOnce(() => new Promise<void>(resolve => { releaseFirst = resolve }))
      mockUseFearLadderItems.mockReturnValue({ items: four, isLoading: false })
      render(<LadderScreen />)
      // drag 1: Item 1 two slots down (2 swaps); its first enqueue is still pending
      act(() => { mockDragEnd.current!({ data: [four[1]!, four[2]!, four[0]!, four[3]!], from: 0, to: 2 }) })
      // drag 2 (on the optimistic order 2,3,1,4): Item 4 one slot up (1 swap)
      act(() => { mockDragEnd.current!({ data: [four[1]!, four[2]!, four[3]!, four[0]!], from: 3, to: 2 }) })
      expect(mockEnqueue).toHaveBeenCalledTimes(1)
      await act(async () => { releaseFirst() })
      expect(mockEnqueue).toHaveBeenCalledTimes(3)
      expect(payloads().map(p => [p.itemAId, p.itemBId])).toEqual([['1', '2'], ['1', '3'], ['4', '1']])
    })
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

  it('adds a new item after the highest stored position, even with a gap from deletions', async () => {
    mockUseFearLadderItems.mockReturnValue({
      items: [
        { id: 'a', description: 'Item A', predictedSuds: 3, position: 1, status: 'pending' },
        { id: 'c', description: 'Item C', predictedSuds: 5, position: 3, status: 'pending' },
      ],
      isLoading: false,
    })
    const { getByRole, getByLabelText } = render(<LadderScreen />)
    fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
    fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'New situation')
    fireEvent.changeText(getByLabelText('ladder.sudsLabel'), '6')
    await act(async () => {
      fireEvent.press(getByRole('button', { name: 'ladder.saveItem' }))
    })
    expect(mockEnqueue).toHaveBeenCalledWith('fear_ladder_items', 'INSERT', expect.objectContaining({ position: 4 }))
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
    const itemButton = findItemButton(getAllByRole, 'Test situation')
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
    const itemButton = findItemButton(getAllByRole, 'Test situation')
    fireEvent.press(itemButton!)
    expect(getByLabelText('ladder.descriptionLabel').props.value).toBe('Test situation')
    expect(getByLabelText('ladder.sudsLabel').props.value).toBe('5')
  })

  it('accessibility focus set on first item once loaded', () => {
    mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
    render(<LadderScreen />)
    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42)
  })

  it('accessibility focus set on Add button when empty', () => {
    mockUseFearLadderItems.mockReturnValue({ items: [], isLoading: false })
    render(<LadderScreen />)
    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42)
  })

  describe('Accessibility focus timing fix (Story 12.3 AC-B3)', () => {
    it('does not set focus while ladder items are still loading, and focuses the first item once loading completes', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [], isLoading: true })
      const { rerender } = render(<LadderScreen />)
      expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled()

      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      rerender(<LadderScreen />)

      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42)
    })

    it('retries focus placement until the ref resolves to a native tag (bounded retry-until-ref-exists)', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const findNodeHandleSpy = jest.spyOn(require('react-native'), 'findNodeHandle')
      findNodeHandleSpy.mockReturnValueOnce(null).mockReturnValueOnce(null).mockReturnValue(42)

      render(<LadderScreen />)
      expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(16)
      })
      expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(16)
      })
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42)
    })

    it('only sets focus once even though items.length can change again after the initial placement', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { rerender } = render(<LadderScreen />)
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(1)

      const secondItem = { id: 'b', description: 'Item B', predictedSuds: 4, position: 2, status: 'pending' }
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem, secondItem], isLoading: false })
      rerender(<LadderScreen />)

      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(1)
    })

    it('re-triggers focus when items go from empty to non-empty after the Add button was already focused', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [], isLoading: false })
      const { rerender } = render(<LadderScreen />)
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(1)

      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      rerender(<LadderScreen />)

      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(2)
    })

    it('re-triggers focus when the last item is removed after the first item was already focused', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { rerender } = render(<LadderScreen />)
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(1)

      mockUseFearLadderItems.mockReturnValue({ items: [], isLoading: false })
      rerender(<LadderScreen />)

      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(2)
    })

    it('logs an error when the focus retry loop exhausts all attempts without resolving a target', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(null)

      render(<LadderScreen />)
      act(() => {
        jest.advanceTimersByTime(16 * 10)
      })

      expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('accessibility focus retry exhausted'))
    })

    describe('Screen-transition gate (root-caused 2026-09-21 via on-device VoiceOver/TalkBack testing)', () => {
      // On-device testing found focus landing on the header back button on both platforms even
      // though the ref-resolved AccessibilityInfo.setAccessibilityFocus call fired correctly —
      // the OS's own automatic screen-change focus fires when the native push transition
      // finishes, which is later than the retry loop's ~160ms window, so it silently overrides
      // our earlier call. These tests cover the fix: waiting for 'transitionEnd' first.
      let capturedTransitionEndCallback: ((e: { data: { closing: boolean } }) => void) | null

      beforeEach(() => {
        capturedTransitionEndCallback = null
        mockAddListener.mockImplementation((event: string, callback: (e: { data: { closing: boolean } }) => void) => {
          if (event === 'transitionEnd') capturedTransitionEndCallback = callback
          return jest.fn()
        })
      })

      it('does not set focus until the screen transition completes, even once loading and layout are ready', () => {
        mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
        render(<LadderScreen />)
        expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled()

        act(() => {
          capturedTransitionEndCallback?.({ data: { closing: false } })
        })

        expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42)
      })

      it('ignores a transitionEnd event where closing is true (screen being popped, not pushed in)', () => {
        mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
        render(<LadderScreen />)

        act(() => {
          capturedTransitionEndCallback?.({ data: { closing: true } })
        })
        expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled()

        act(() => {
          capturedTransitionEndCallback?.({ data: { closing: false } })
        })
        expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42)
      })

      it('falls back to setting focus after a fixed delay if transitionEnd never fires', () => {
        mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
        render(<LadderScreen />)
        expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled()

        act(() => {
          jest.advanceTimersByTime(500)
        })

        expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(42)
      })
    })
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
      const itemButton = findItemButton(getAllByRole, 'Test situation')
      fireEvent.press(itemButton!)
      expect(getByRole('button', { name: 'ladder.removeItem' })).toBeTruthy()
    })

    it('tapping Remove opens the confirm alert with the gravity copy', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { getAllByRole, getByRole } = render(<LadderScreen />)
      const itemButton = findItemButton(getAllByRole, 'Test situation')
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
      const itemButton = findItemButton(getAllByRole, 'Test situation')
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
      const itemButton = findItemButton(getAllByRole, 'Test situation')
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
      const itemButton = findItemButton(getAllByRole, 'Test situation')
      fireEvent.press(itemButton!)

      const removeButton = getByRole('button', { name: 'ladder.removeItem' })
      expect(removeButton.props.accessibilityState.disabled).toBe(true)
      expect(getByText('ladder.delete.guardMessage')).toBeTruthy()
    })

    it('Remove button is disabled and guard text shown while the active-session query is still loading (D8b)', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      mockUseActiveExposureSession.mockReturnValue({ activeSession: null, isLoading: true })
      const { getAllByRole, getByRole, getByText } = render(<LadderScreen />)
      const itemButton = findItemButton(getAllByRole, 'Test situation')
      fireEvent.press(itemButton!)

      const removeButton = getByRole('button', { name: 'ladder.removeItem' })
      expect(removeButton.props.accessibilityState.disabled).toBe(true)
      expect(getByText('ladder.delete.guardMessage')).toBeTruthy()
    })
  })

  describe('Start session button (T7.1 / T7.2) — moved into edit modal', () => {
    function openEditModal(getAllByRole: ReturnType<typeof render>['getAllByRole'], description: string) {
      fireEvent.press(findItemButton(getAllByRole, description)!)
    }

    it('Start session button is not shown on the Add path', () => {
      const { getByRole, queryByRole } = render(<LadderScreen />)
      fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
      expect(queryByRole('button', { name: /ladder\.startSession/ })).toBeNull()
    })

    it('shows Start session button when editing a pending item', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { getAllByRole, getByRole } = render(<LadderScreen />)
      openEditModal(getAllByRole, baseItem.description)
      expect(getByRole('button', { name: `ladder.startSession, ${baseItem.description}` })).toBeTruthy()
    })

    it('shows Start session button when editing a completed item', () => {
      const completedItem = { ...baseItem, status: 'completed' }
      mockUseFearLadderItems.mockReturnValue({ items: [completedItem], isLoading: false })
      const { getAllByRole, getByRole } = render(<LadderScreen />)
      openEditModal(getAllByRole, completedItem.description)
      expect(getByRole('button', { name: `ladder.startSession, ${completedItem.description}` })).toBeTruthy()
    })

    it('pressing Start session navigates to /session/technique and closes the edit modal', () => {
      mockUseAuth.mockReturnValue({ userId: 'user-123', sessionRecoveryData: null })
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { getAllByRole, getByRole, queryByRole } = render(<LadderScreen />)
      openEditModal(getAllByRole, baseItem.description)
      fireEvent.press(getByRole('button', { name: `ladder.startSession, ${baseItem.description}` }))
      expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining('/session/technique'))
      expect(mockRouterPush).toHaveBeenCalledWith(expect.stringContaining(`fearItemId=${baseItem.id}`))
      expect(queryByRole('button', { name: /ladder\.startSession/ })).toBeNull()
    })

    it('pressing Start session redirects to home when a session is already in progress (T7.2) and closes the edit modal', () => {
      mockUseAuth.mockReturnValue({ userId: 'user-123', sessionRecoveryData: { sessionId: 's1', fearItemId: 'item-1', preSuds: 5, description: 'test' } })
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { getAllByRole, getByRole, queryByRole } = render(<LadderScreen />)
      openEditModal(getAllByRole, baseItem.description)
      fireEvent.press(getByRole('button', { name: `ladder.startSession, ${baseItem.description}` }))
      expect(mockRouterReplace).toHaveBeenCalledWith('/')
      expect(mockRouterPush).not.toHaveBeenCalled()
      expect(queryByRole('button', { name: /ladder\.startSession/ })).toBeNull()
    })
  })

  describe('SUDS clamp on edit-open (Story 12.3 AC-B2)', () => {
    it('clamps a predictedSuds above 10 down to 10 when opening the edit form', () => {
      const item = { ...baseItem, predictedSuds: 12 }
      mockUseFearLadderItems.mockReturnValue({ items: [item], isLoading: false })
      const { getAllByRole, getByLabelText } = render(<LadderScreen />)
      const itemButton = findItemButton(getAllByRole, 'Test situation')
      fireEvent.press(itemButton!)
      expect(getByLabelText('ladder.sudsLabel').props.value).toBe('10')
    })

    it('clamps a predictedSuds below 0 up to 0 when opening the edit form', () => {
      const item = { ...baseItem, predictedSuds: -3 }
      mockUseFearLadderItems.mockReturnValue({ items: [item], isLoading: false })
      const { getAllByRole, getByLabelText } = render(<LadderScreen />)
      const itemButton = findItemButton(getAllByRole, 'Test situation')
      fireEvent.press(itemButton!)
      expect(getByLabelText('ladder.sudsLabel').props.value).toBe('0')
    })

    it('rounds a non-integer predictedSuds when opening the edit form', () => {
      const item = { ...baseItem, predictedSuds: 7.6 }
      mockUseFearLadderItems.mockReturnValue({ items: [item], isLoading: false })
      const { getAllByRole, getByLabelText } = render(<LadderScreen />)
      const itemButton = findItemButton(getAllByRole, 'Test situation')
      fireEvent.press(itemButton!)
      expect(getByLabelText('ladder.sudsLabel').props.value).toBe('8')
    })

    it('leaves an already-valid integer predictedSuds unchanged', () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      const { getAllByRole, getByLabelText } = render(<LadderScreen />)
      const itemButton = findItemButton(getAllByRole, 'Test situation')
      fireEvent.press(itemButton!)
      expect(getByLabelText('ladder.sudsLabel').props.value).toBe('5')
    })

    it('clamps a NaN predictedSuds to 0 when opening the edit form', () => {
      const item = { ...baseItem, predictedSuds: NaN }
      mockUseFearLadderItems.mockReturnValue({ items: [item], isLoading: false })
      const { getAllByRole, getByLabelText } = render(<LadderScreen />)
      const itemButton = findItemButton(getAllByRole, 'Test situation')
      fireEvent.press(itemButton!)
      expect(getByLabelText('ladder.sudsLabel').props.value).toBe('0')
    })

    it('list row displays and announces a clamped SUDS value, not the raw out-of-range stored value', () => {
      const item = { ...baseItem, predictedSuds: 15 }
      mockUseFearLadderItems.mockReturnValue({ items: [item], isLoading: false })
      const { getAllByRole } = render(<LadderScreen />)
      const itemButton = findItemButton(getAllByRole, 'Test situation')
      expect(itemButton!.props.accessibilityLabel).toContain('10')
      expect(itemButton!.props.accessibilityLabel).not.toContain('15')
    })
  })

  describe('Optimistic-update rollback + retry (Story 12.3 AC-B1)', () => {
    it('enqueue failure on add rolls back the optimistic item, shows error+retry, and keeps Save enabled', async () => {
      mockEnqueue.mockRejectedValueOnce(new Error('boom'))
      const { getByRole, getByLabelText, getByText, queryByText } = render(<LadderScreen />)
      fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
      fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'test situation')
      fireEvent.changeText(getByLabelText('ladder.sudsLabel'), '3')
      await act(async () => {
        fireEvent.press(getByRole('button', { name: 'ladder.saveItem' }))
      })

      expect(getByText('ladder.saveFailed')).toBeTruthy()
      expect(queryByText('test situation')).toBeNull() // rolled back — not left as a ghost item in the list
      const saveButton = getByRole('button', { name: 'ladder.saveItem' })
      expect(saveButton.props.accessibilityState.disabled).toBe(false)
      expect(getByRole('button', { name: 'ladder.tryAgain' })).toBeTruthy()
    })

    it('enqueue failure on edit rolls back and shows error+retry, form stays open with the attempted edit', async () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      mockEnqueue.mockRejectedValueOnce(new Error('boom'))
      const { getAllByRole, getByLabelText, getByText } = render(<LadderScreen />)
      const itemButton = findItemButton(getAllByRole, 'Test situation')
      fireEvent.press(itemButton!)
      fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'Updated description')
      await act(async () => {
        const saveButton = getAllByRole('button').find(b => b.props.accessibilityLabel === 'ladder.saveItem')
        fireEvent.press(saveButton!)
      })

      expect(getByText('ladder.saveFailed')).toBeTruthy()
      expect(getByLabelText('ladder.descriptionLabel').props.value).toBe('Updated description')
    })

    it('retrying a failed edit re-enqueues the same item id and sends further edits made before the retry', async () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      mockEnqueue.mockRejectedValueOnce(new Error('boom'))
      const { getAllByRole, getByLabelText } = render(<LadderScreen />)
      fireEvent.press(findItemButton(getAllByRole, baseItem.description)!)
      fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'Updated description')
      await act(async () => {
        const saveButton = getAllByRole('button').find(b => b.props.accessibilityLabel === 'ladder.saveItem')
        fireEvent.press(saveButton!)
      })
      const firstCallPayload = mockEnqueue.mock.calls[0][2] as { id: string }

      fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'Updated description v2')
      await act(async () => {
        const retryButton = getAllByRole('button').find(b => b.props.accessibilityLabel === 'ladder.tryAgain')
        fireEvent.press(retryButton!)
      })

      expect(mockEnqueue).toHaveBeenCalledTimes(2)
      const secondCallPayload = mockEnqueue.mock.calls[1][2] as { id: string; description: string }
      expect(secondCallPayload.id).toBe(firstCallPayload.id)
      expect(secondCallPayload.description).toBe('Updated description v2')
    })

    it('retrying a failed add re-enqueues with the same generated id, not a new one', async () => {
      mockEnqueue.mockRejectedValueOnce(new Error('boom'))
      const { getByRole, getByLabelText } = render(<LadderScreen />)
      fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
      fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'test situation')
      fireEvent.changeText(getByLabelText('ladder.sudsLabel'), '3')
      await act(async () => {
        fireEvent.press(getByRole('button', { name: 'ladder.saveItem' }))
      })
      const firstCallPayload = mockEnqueue.mock.calls[0][2] as { id: string }

      await act(async () => {
        fireEvent.press(getByRole('button', { name: 'ladder.tryAgain' }))
      })

      expect(mockEnqueue).toHaveBeenCalledTimes(2)
      const secondCallPayload = mockEnqueue.mock.calls[1][2] as { id: string }
      expect(secondCallPayload.id).toBe(firstCallPayload.id)
    })

    it('retrying a failed add recomputes position from the current list length rather than reusing a stale value', async () => {
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem], isLoading: false })
      mockEnqueue.mockRejectedValueOnce(new Error('boom'))
      const { getByRole, getByLabelText, rerender } = render(<LadderScreen />)
      fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
      fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'test situation')
      fireEvent.changeText(getByLabelText('ladder.sudsLabel'), '3')
      await act(async () => {
        fireEvent.press(getByRole('button', { name: 'ladder.saveItem' }))
      })
      const firstCallPayload = mockEnqueue.mock.calls[0][2] as { position: number }
      expect(firstCallPayload.position).toBe(2) // baseItem occupies position 1

      // A second item syncs in from elsewhere while the form is still showing the error
      const syncedItem = { id: 'synced', description: 'Synced item', predictedSuds: 2, position: 2, status: 'pending' }
      mockUseFearLadderItems.mockReturnValue({ items: [baseItem, syncedItem], isLoading: false })
      rerender(<LadderScreen />)

      await act(async () => {
        fireEvent.press(getByRole('button', { name: 'ladder.tryAgain' }))
      })

      const secondCallPayload = mockEnqueue.mock.calls[1][2] as { position: number }
      expect(secondCallPayload.position).toBe(3)
    })

    it('a successful retry after a failed add clears the error and closes the form', async () => {
      mockEnqueue.mockRejectedValueOnce(new Error('boom'))
      const { getByRole, getByLabelText, queryByText, queryByLabelText } = render(<LadderScreen />)
      fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
      fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'test situation')
      fireEvent.changeText(getByLabelText('ladder.sudsLabel'), '3')
      await act(async () => {
        fireEvent.press(getByRole('button', { name: 'ladder.saveItem' }))
      })

      await act(async () => {
        fireEvent.press(getByRole('button', { name: 'ladder.tryAgain' }))
      })

      expect(queryByText('ladder.saveFailed')).toBeNull()
      expect(queryByLabelText('ladder.descriptionLabel')).toBeNull()
    })

    it('canceling after a failed add clears the pending item so a fresh add does not reuse its id', async () => {
      mockEnqueue.mockRejectedValueOnce(new Error('boom'))
      const { getByRole, getByLabelText } = render(<LadderScreen />)
      fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
      fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'test situation')
      fireEvent.changeText(getByLabelText('ladder.sudsLabel'), '3')
      await act(async () => {
        fireEvent.press(getByRole('button', { name: 'ladder.saveItem' }))
      })
      const firstCallPayload = mockEnqueue.mock.calls[0][2] as { id: string }

      fireEvent.press(getByRole('button', { name: 'ladder.cancel' }))

      fireEvent.press(getByRole('button', { name: 'ladder.addItem' }))
      fireEvent.changeText(getByLabelText('ladder.descriptionLabel'), 'another situation')
      fireEvent.changeText(getByLabelText('ladder.sudsLabel'), '4')
      await act(async () => {
        fireEvent.press(getByRole('button', { name: 'ladder.saveItem' }))
      })

      const secondCallPayload = mockEnqueue.mock.calls[1][2] as { id: string }
      expect(secondCallPayload.id).not.toBe(firstCallPayload.id)
    })
  })
})
