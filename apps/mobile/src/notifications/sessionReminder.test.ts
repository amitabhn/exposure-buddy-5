import { scheduleSessionReminder, cancelSessionReminder } from './sessionReminder'

const mockGetPermissionsAsync = jest.fn()
const mockScheduleNotificationAsync = jest.fn()
const mockCancelScheduledNotificationAsync = jest.fn()

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) => mockCancelScheduledNotificationAsync(...args),
  SchedulableTriggerInputTypes: { DAILY: 'daily', CALENDAR: 'calendar' },
}))

describe('scheduleSessionReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('schedules a DAILY trigger with the correct hour/minute when permission is granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockScheduleNotificationAsync.mockResolvedValue('notif-id-1')

    const result = await scheduleSessionReminder('08:30', { title: 't', body: 'b' })

    expect(result).toBe('notif-id-1')
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 't', body: 'b' },
      trigger: { type: 'daily', hour: 8, minute: 30 },
    })
  })

  it('returns null and does not schedule when permission is not granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' })

    const result = await scheduleSessionReminder('08:30', { title: 't', body: 'b' })

    expect(result).toBeNull()
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled()
  })

  it('returns null and does not throw when permission was never requested', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' })

    const result = await scheduleSessionReminder('08:30', { title: 't', body: 'b' })

    expect(result).toBeNull()
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled()
  })

  it('returns null without throwing when getPermissionsAsync itself rejects', async () => {
    mockGetPermissionsAsync.mockRejectedValue(new Error('native module unavailable'))

    const result = await scheduleSessionReminder('08:30', { title: 't', body: 'b' })

    expect(result).toBeNull()
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled()
  })

  it('clamps an out-of-range hour/minute rather than throwing', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockScheduleNotificationAsync.mockResolvedValue('notif-id-2')

    await scheduleSessionReminder('99:99', { title: 't', body: 'b' })

    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 't', body: 'b' },
      trigger: { type: 'daily', hour: 23, minute: 59 },
    })
  })
})

describe('cancelSessionReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls cancelScheduledNotificationAsync with the given id', async () => {
    mockCancelScheduledNotificationAsync.mockResolvedValue(undefined)

    await cancelSessionReminder('notif-id-1')

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-id-1')
  })

  it('swallows a rejected cancellation without throwing', async () => {
    mockCancelScheduledNotificationAsync.mockRejectedValue(new Error('already cancelled'))

    await expect(cancelSessionReminder('notif-id-1')).resolves.toBeUndefined()
  })
})
