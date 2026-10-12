import * as Sentry from '@sentry/react-native'
import { reportDroppedWrite } from './error-handler'

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}))

describe('reportDroppedWrite (Story 19.7)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends level as the Sentry level and the rest as tags', () => {
    reportDroppedWrite({ table: 'fear_ladder_items', op: 'PUT', code: '23505', constraint: 'uq_user_position', level: 'warning' })
    expect(Sentry.captureMessage).toHaveBeenCalledWith('upload write dropped', {
      level: 'warning',
      tags: { table: 'fear_ladder_items', op: 'PUT', code: '23505', constraint: 'uq_user_position' },
    })
  })

  it('never throws when Sentry throws', () => {
    const captureMessage = Sentry.captureMessage as jest.Mock
    captureMessage.mockImplementationOnce(() => {
      throw new Error('sentry down')
    })
    expect(() => reportDroppedWrite({ table: 't', op: 'DELETE', code: '42501', level: 'error' })).not.toThrow()
  })
})
