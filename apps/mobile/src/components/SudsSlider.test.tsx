import React from 'react'
import { AccessibilityInfo } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import Slider from '@react-native-community/slider'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { value?: number; word?: string }) =>
      key === 'session.suds.valueText' ? `${opts?.value} out of 10, ${opts?.word}` : key,
  }),
}))

import { SudsSlider } from './SudsSlider'

describe('SudsSlider', () => {
  let announce: jest.SpyInstance
  beforeEach(() => {
    announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
    announce.mockClear()
  })
  afterEach(() => jest.restoreAllMocks())

  it('shows a dash and the drag hint when unset', () => {
    const { getByText } = render(<SudsSlider value={null} onChange={jest.fn()} />)
    expect(getByText('-')).toBeTruthy()
    expect(getByText('session.suds.dragHint')).toBeTruthy()
  })

  it('renders the three legend labels', () => {
    const { getByText } = render(<SudsSlider value={null} onChange={jest.fn()} />)
    expect(getByText('onboarding.assessment.sudsAnchor0')).toBeTruthy()
    expect(getByText('onboarding.assessment.sudsAnchor5')).toBeTruthy()
    expect(getByText('onboarding.assessment.sudsAnchor10')).toBeTruthy()
  })

  it.each([
    [0, 'onboarding.assessment.sudsAnchor0'],
    [2, 'session.suds.wordVeryMild'],
    [4, 'session.suds.wordMild'],
    [6, 'onboarding.assessment.sudsAnchor5'],
    [8, 'session.suds.wordHigh'],
    [9, 'session.suds.wordVeryHigh'],
    [10, 'onboarding.assessment.sudsAnchor10'],
  ])('value %i shows its word', (v, key) => {
    const { getAllByText } = render(<SudsSlider value={v} onChange={jest.fn()} />)
    // the word appears in the readout (and again in the legend for 0, 5 and 10)
    expect(getAllByText(key).length).toBeGreaterThan(0)
  })

  it('first + or − from unset sets 5', () => {
    const onChange = jest.fn()
    const { getByLabelText, rerender } = render(<SudsSlider value={null} onChange={onChange} />)
    fireEvent.press(getByLabelText('session.suds.increase'))
    expect(onChange).toHaveBeenLastCalledWith(5)
    rerender(<SudsSlider value={null} onChange={onChange} />)
    fireEvent.press(getByLabelText('session.suds.decrease'))
    expect(onChange).toHaveBeenLastCalledWith(5)
  })

  it('steps by one and stops at the limits', () => {
    const onChange = jest.fn()
    const { getByLabelText, rerender } = render(<SudsSlider value={4} onChange={onChange} />)
    fireEvent.press(getByLabelText('session.suds.increase'))
    expect(onChange).toHaveBeenLastCalledWith(5)
    fireEvent.press(getByLabelText('session.suds.decrease'))
    expect(onChange).toHaveBeenLastCalledWith(3)

    onChange.mockClear()
    rerender(<SudsSlider value={0} onChange={onChange} />)
    fireEvent.press(getByLabelText('session.suds.decrease'))
    rerender(<SudsSlider value={10} onChange={onChange} />)
    fireEvent.press(getByLabelText('session.suds.increase'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('reports a release without moving via onSlidingComplete', () => {
    const onChange = jest.fn()
    const { UNSAFE_getByType } = render(<SudsSlider value={null} onChange={onChange} />)
    UNSAFE_getByType(Slider).props.onSlidingComplete(5)
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('reports drag values via onValueChange', () => {
    const onChange = jest.fn()
    const { UNSAFE_getByType } = render(<SudsSlider value={null} onChange={onChange} />)
    UNSAFE_getByType(Slider).props.onValueChange(7)
    expect(onChange).toHaveBeenCalledWith(7)
  })

  it('exposes one adjustable wrapper with the spoken value, and hides the native slider', () => {
    const { getByRole, UNSAFE_getByType } = render(<SudsSlider value={7} onChange={jest.fn()} />)
    const adj = getByRole('adjustable')
    expect(adj.props.accessibilityValue).toEqual({ min: 0, max: 10, now: 7, text: '7 out of 10, session.suds.wordHigh' })
    expect(UNSAFE_getByType(Slider).parent!.parent!.props.accessibilityElementsHidden).toBe(true)
  })

  it('says "Not set" when unset', () => {
    const { getByRole } = render(<SudsSlider value={null} onChange={jest.fn()} />)
    expect(getByRole('adjustable').props.accessibilityValue.text).toBe('session.suds.notSet')
  })

  it('screen-reader increment/decrement from unset sets 5, otherwise steps by one, with no extra announcement', () => {
    const onChange = jest.fn()
    const { getByRole, rerender } = render(<SudsSlider value={null} onChange={onChange} />)
    fireEvent(getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } })
    expect(onChange).toHaveBeenLastCalledWith(5)
    rerender(<SudsSlider value={null} onChange={onChange} />)
    fireEvent(getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } })
    expect(onChange).toHaveBeenLastCalledWith(5)
    rerender(<SudsSlider value={6} onChange={onChange} />)
    fireEvent(getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } })
    expect(onChange).toHaveBeenLastCalledWith(5)
    expect(announce).not.toHaveBeenCalled()
  })

  it('announces the new rating once per − / + press, and not when the button is disabled', () => {
    const { getByLabelText, rerender } = render(<SudsSlider value={4} onChange={jest.fn()} />)
    fireEvent.press(getByLabelText('session.suds.increase'))
    expect(announce).toHaveBeenCalledTimes(1)
    expect(announce).toHaveBeenLastCalledWith('5 out of 10, onboarding.assessment.sudsAnchor5')
    fireEvent.press(getByLabelText('session.suds.decrease'))
    expect(announce).toHaveBeenCalledTimes(2)
    expect(announce).toHaveBeenLastCalledWith('3 out of 10, session.suds.wordMild')

    announce.mockClear()
    rerender(<SudsSlider value={0} onChange={jest.fn()} />)
    fireEvent.press(getByLabelText('session.suds.decrease'))
    rerender(<SudsSlider value={10} onChange={jest.fn()} />)
    fireEvent.press(getByLabelText('session.suds.increase'))
    expect(announce).not.toHaveBeenCalled()
  })
})
