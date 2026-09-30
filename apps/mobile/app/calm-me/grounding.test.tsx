import React from 'react'
import { AccessibilityInfo } from 'react-native'
import { render, fireEvent, act } from '@testing-library/react-native'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}))

// Matches the fieldLabel key's interpolation shape produced by the mocked t() above —
// used to look up a given step's field by its accessible label.
function fieldLabel(index: number, count: number): string {
  return `grounding541.fieldLabel:${JSON.stringify({ index, count })}`
}

const mockRouterBack = jest.fn()

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: mockRouterBack }),
}))

const mockUseAnimation = jest.fn()

jest.mock('../../src/contexts/AnimationContext', () => ({
  useAnimation: () => mockUseAnimation(),
}))

import GroundingScreen from './grounding'

function advanceToStep5(getByText: (text: string) => unknown) {
  for (let i = 0; i < 4; i++) {
    fireEvent.press(getByText('grounding541.gotIt') as never)
  }
}

describe('GroundingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAnimation.mockReturnValue({ reduced: false })
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('AC #1: step 1 shows "1 / 5", the "see" prompt, and the "Got it" CTA', () => {
    const { getByText } = render(<GroundingScreen />)
    expect(getByText('1 / 5')).toBeTruthy()
    expect(getByText('grounding541.see')).toBeTruthy()
    expect(getByText('grounding541.gotIt')).toBeTruthy()
  })

  it('AC #2: "Got it" advances hear → touch → smell → taste in order, counter updating each time', () => {
    const { getByText } = render(<GroundingScreen />)

    fireEvent.press(getByText('grounding541.gotIt'))
    expect(getByText('2 / 5')).toBeTruthy()
    expect(getByText('grounding541.hear')).toBeTruthy()

    fireEvent.press(getByText('grounding541.gotIt'))
    expect(getByText('3 / 5')).toBeTruthy()
    expect(getByText('grounding541.touch')).toBeTruthy()

    fireEvent.press(getByText('grounding541.gotIt'))
    expect(getByText('4 / 5')).toBeTruthy()
    expect(getByText('grounding541.smell')).toBeTruthy()

    fireEvent.press(getByText('grounding541.gotIt'))
    expect(getByText('5 / 5')).toBeTruthy()
    expect(getByText('grounding541.taste')).toBeTruthy()
  })

  it('AC #3: step 5 shows "5 / 5" and "I\'m done" CTA, not "Got it"', () => {
    const { getByText, queryByText } = render(<GroundingScreen />)
    advanceToStep5(getByText)
    expect(getByText('5 / 5')).toBeTruthy()
    expect(getByText('grounding541.doneFinal')).toBeTruthy()
    expect(queryByText('grounding541.gotIt')).toBeNull()
  })

  it('AC #4: tapping "I\'m done" renders the completion message and both Done/Go again CTAs', () => {
    const { getByText } = render(<GroundingScreen />)
    advanceToStep5(getByText)
    fireEvent.press(getByText('grounding541.doneFinal'))

    expect(getByText('grounding541.complete')).toBeTruthy()
    expect(getByText('grounding541.done')).toBeTruthy()
    expect(getByText('grounding541.again')).toBeTruthy()
  })

  it('AC #4: "Done" on the completion view calls router.back()', () => {
    const { getByText } = render(<GroundingScreen />)
    advanceToStep5(getByText)
    fireEvent.press(getByText('grounding541.doneFinal'))
    fireEvent.press(getByText('grounding541.done'))

    expect(mockRouterBack).toHaveBeenCalledTimes(1)
  })

  it('AC #4: "Go again" resets to step 1 without navigating', () => {
    const { getByText, queryByText } = render(<GroundingScreen />)
    advanceToStep5(getByText)
    fireEvent.press(getByText('grounding541.doneFinal'))
    fireEvent.press(getByText('grounding541.again'))

    expect(getByText('1 / 5')).toBeTruthy()
    expect(getByText('grounding541.see')).toBeTruthy()
    expect(queryByText('grounding541.complete')).toBeNull()
    expect(mockRouterBack).not.toHaveBeenCalled()
  })

  it('AC #5: the top-left Back button at any pre-completion step calls router.back() with no error', () => {
    const { getByLabelText } = render(<GroundingScreen />)
    fireEvent.press(getByLabelText('calmMe.back'))
    expect(mockRouterBack).toHaveBeenCalledTimes(1)
  })

  it('AC #5: Back button mid step-transition unmounts cleanly with no crash, even while the cross-fade is in flight', () => {
    const { getByText, getByLabelText, unmount } = render(<GroundingScreen />)
    fireEvent.press(getByText('grounding541.gotIt')) // starts a transition (cross-fade in flight)

    expect(() => {
      fireEvent.press(getByLabelText('calmMe.back'))
      unmount()
    }).not.toThrow()
    expect(mockRouterBack).toHaveBeenCalledTimes(1)
  })

  it('AC #7: announces "Step n of 5. ..." on mount and each step advance, then the completion message', () => {
    const { getByText } = render(<GroundingScreen />)
    const announce = AccessibilityInfo.announceForAccessibility as jest.Mock

    expect(announce).toHaveBeenCalledTimes(1)
    expect(announce).toHaveBeenLastCalledWith('Step 1 of 5. grounding541.see')

    fireEvent.press(getByText('grounding541.gotIt'))
    expect(announce).toHaveBeenCalledTimes(2)
    expect(announce).toHaveBeenLastCalledWith('Step 2 of 5. grounding541.hear')

    fireEvent.press(getByText('grounding541.gotIt'))
    fireEvent.press(getByText('grounding541.gotIt'))
    fireEvent.press(getByText('grounding541.gotIt'))
    expect(announce).toHaveBeenCalledTimes(5)
    expect(announce).toHaveBeenLastCalledWith('Step 5 of 5. grounding541.taste')

    fireEvent.press(getByText('grounding541.doneFinal'))
    expect(announce).toHaveBeenCalledTimes(6)
    expect(announce).toHaveBeenLastCalledWith('grounding541.complete')
  })

  it('AC #11: the CTA has a minimum height of 56, not a fixed square', () => {
    const { getByLabelText } = render(<GroundingScreen />)
    const button = getByLabelText('grounding541.gotIt')
    expect(button).toHaveStyle({ minHeight: 56 })
    expect(button.props.hitSlop).toEqual({ top: 8, bottom: 8, left: 8, right: 8 })
  })

  it('AC #8/#10: with reduced motion, stepping still functions correctly end-to-end', () => {
    mockUseAnimation.mockReturnValue({ reduced: true })
    const { getByText } = render(<GroundingScreen />)

    expect(getByText('1 / 5')).toBeTruthy()

    advanceToStep5(getByText)
    expect(getByText('5 / 5')).toBeTruthy()
    expect(getByText('grounding541.taste')).toBeTruthy()

    fireEvent.press(getByText('grounding541.doneFinal'))
    expect(getByText('grounding541.complete')).toBeTruthy()
  })

  it('Double-tap guard: two synchronous taps on "Got it" advance only one step', () => {
    const { getByText, queryByText } = render(<GroundingScreen />)
    const button = getByText('grounding541.gotIt')

    act(() => {
      fireEvent.press(button)
      fireEvent.press(button)
    })

    expect(queryByText('2 / 5')).toBeTruthy()
    expect(queryByText('3 / 5')).toBeNull()
  })

  it('Double-tap guard: two synchronous taps on the completion view\'s "Done" call onComplete/router.back() only once', () => {
    const { getByText } = render(<GroundingScreen />)
    advanceToStep5(getByText)
    fireEvent.press(getByText('grounding541.doneFinal'))

    const doneButton = getByText('grounding541.done')
    act(() => {
      fireEvent.press(doneButton)
      fireEvent.press(doneButton)
    })

    expect(mockRouterBack).toHaveBeenCalledTimes(1)
  })

  it('Double-tap guard: releases after a transition completes, so a later separate "Done" press still navigates', () => {
    const { getByText, getByLabelText } = render(<GroundingScreen />)
    advanceToStep5(getByText)
    fireEvent.press(getByText('grounding541.doneFinal'))

    fireEvent.press(getByLabelText('grounding541.done'))
    expect(mockRouterBack).toHaveBeenCalledTimes(1)

    // A second, separate (non-rapid) press should still be honored — the guard must not
    // stay permanently locked after the first "Done" tap (handleDone changes neither
    // stepIndex nor complete, so the unlock can't depend on those alone).
    fireEvent.press(getByLabelText('grounding541.done'))
    expect(mockRouterBack).toHaveBeenCalledTimes(2)
  })

  it('Story 18.6: step 1 renders exactly 5 optional labeled fields beneath the prompt', () => {
    const { getAllByPlaceholderText, getByLabelText } = render(<GroundingScreen />)

    expect(getAllByPlaceholderText('grounding541.fieldPlaceholder')).toHaveLength(5)
    for (let i = 1; i <= 5; i++) {
      expect(getByLabelText(fieldLabel(i, 5))).toBeTruthy()
    }
  })

  it('Story 18.6: each step shows fields sized to its own count (4, 3, 2, then 1)', () => {
    const { getByText, getAllByPlaceholderText, getByLabelText } = render(<GroundingScreen />)

    fireEvent.press(getByText('grounding541.gotIt')) // -> step 2 ("hear"), count 4
    expect(getAllByPlaceholderText('grounding541.fieldPlaceholder')).toHaveLength(4)
    expect(getByLabelText(fieldLabel(4, 4))).toBeTruthy()

    fireEvent.press(getByText('grounding541.gotIt')) // -> step 3 ("touch"), count 3
    expect(getAllByPlaceholderText('grounding541.fieldPlaceholder')).toHaveLength(3)

    fireEvent.press(getByText('grounding541.gotIt')) // -> step 4 ("smell"), count 2
    expect(getAllByPlaceholderText('grounding541.fieldPlaceholder')).toHaveLength(2)

    fireEvent.press(getByText('grounding541.gotIt')) // -> step 5 ("taste"), count 1
    expect(getAllByPlaceholderText('grounding541.fieldPlaceholder')).toHaveLength(1)
    expect(getByLabelText(fieldLabel(1, 1))).toBeTruthy()
  })

  it('Story 18.6: typing into some fields and leaving others empty does not gate "Got it"', () => {
    const { getByText, getByLabelText } = render(<GroundingScreen />)

    fireEvent.changeText(getByLabelText(fieldLabel(1, 5)), 'the lamp')
    fireEvent.changeText(getByLabelText(fieldLabel(2, 5)), 'my hands')
    // Fields 3, 4, 5 left empty.

    fireEvent.press(getByText('grounding541.gotIt'))
    expect(getByText('2 / 5')).toBeTruthy()
    expect(getByText('grounding541.hear')).toBeTruthy()
  })

  it('Story 18.6: typing into every field still allows "I\'m done" to complete the exercise', () => {
    const { getByText, getByLabelText } = render(<GroundingScreen />)
    fireEvent.changeText(getByLabelText(fieldLabel(1, 5)), 'a')

    for (let i = 0; i < 4; i++) {
      fireEvent.press(getByText('grounding541.gotIt'))
    }
    fireEvent.changeText(getByLabelText(fieldLabel(1, 1)), 'sweetness')
    fireEvent.press(getByText('grounding541.doneFinal'))

    expect(getByText('grounding541.complete')).toBeTruthy()
  })

  it('Story 18.6: field values do not survive a step change — new step renders empty fields', () => {
    const { getByText, getByLabelText } = render(<GroundingScreen />)

    const firstField = getByLabelText(fieldLabel(1, 5))
    fireEvent.changeText(firstField, 'the lamp')
    expect(firstField.props.value).toBe('the lamp')

    fireEvent.press(getByText('grounding541.gotIt')) // -> step 2 ("hear")
    const nextStepField = getByLabelText(fieldLabel(1, 4))
    expect(nextStepField.props.value).toBe('')
  })

  it('Story 18.6: field values do not survive "Go again" resetting back to step 1', () => {
    const { getByText, getByLabelText } = render(<GroundingScreen />)

    for (let i = 0; i < 4; i++) {
      fireEvent.press(getByText('grounding541.gotIt'))
    }
    fireEvent.changeText(getByLabelText(fieldLabel(1, 1)), 'sweetness')
    fireEvent.press(getByText('grounding541.doneFinal'))
    fireEvent.press(getByText('grounding541.again'))

    const resetField = getByLabelText(fieldLabel(1, 5))
    expect(resetField.props.value).toBe('')
  })
})
