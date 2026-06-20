import { act, renderHook, waitFor } from '@testing-library/react-native'
import { AppState } from 'react-native'
import { usePushRegistration } from './usePushRegistration'

const mockGetPermissionsAsync = jest.fn()
const mockGetExpoPushTokenAsync = jest.fn()
const mockRegisterPushToken = jest.fn()

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  getExpoPushTokenAsync: (...args: unknown[]) => mockGetExpoPushTokenAsync(...args),
}))

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
}))

jest.mock('@exposure-buddy/supabase', () => ({
  registerPushToken: (...args: unknown[]) => mockRegisterPushToken(...args),
}))

function emitAppStateChange(state: 'active' | 'background' | 'inactive') {
  const listener = (AppState.addEventListener as jest.Mock).mock.calls.at(-1)?.[1]
  act(() => {
    listener?.(state)
  })
}

describe('usePushRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' })
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'expo-token-abc' })
    mockRegisterPushToken.mockResolvedValue(undefined)
  })

  it('does nothing when userId is not provided', async () => {
    renderHook(() => usePushRegistration(undefined))
    await waitFor(() => {
      expect(mockGetPermissionsAsync).not.toHaveBeenCalled()
    })
  })

  it('registers the token on mount when permission is granted', async () => {
    renderHook(() => usePushRegistration('user-1'))

    await waitFor(() => {
      expect(mockRegisterPushToken).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'expo-token-abc', userId: 'user-1' }),
      )
    })
  })

  it('does not register when permission is not granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
    renderHook(() => usePushRegistration('user-1'))

    await waitFor(() => {
      expect(mockGetPermissionsAsync).toHaveBeenCalled()
    })
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled()
    expect(mockRegisterPushToken).not.toHaveBeenCalled()
  })

  it('re-registers on foreground if a token was already registered this session (AC4)', async () => {
    renderHook(() => usePushRegistration('user-1'))

    await waitFor(() => {
      expect(mockRegisterPushToken).toHaveBeenCalledTimes(1)
    })

    emitAppStateChange('active')

    await waitFor(() => {
      expect(mockRegisterPushToken).toHaveBeenCalledTimes(2)
    })
  })

  it('does not register on foreground if no token was registered yet this session', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
    renderHook(() => usePushRegistration('user-1'))

    await waitFor(() => {
      expect(mockGetPermissionsAsync).toHaveBeenCalledTimes(1)
    })

    emitAppStateChange('active')

    // Give any stray async work a tick, then assert no registration occurred
    await waitFor(() => {
      expect(mockGetPermissionsAsync).toHaveBeenCalledTimes(1)
    })
    expect(mockRegisterPushToken).not.toHaveBeenCalled()
  })

  it('cleans up the AppState listener on unmount', () => {
    const removeSpy = jest.fn()
    ;(AppState.addEventListener as jest.Mock).mockReturnValue({ remove: removeSpy })

    const { unmount } = renderHook(() => usePushRegistration('user-1'))
    unmount()

    expect(removeSpy).toHaveBeenCalled()
  })

  it('exposes a registerNow function that can be triggered immediately (Settings card flow)', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' })
    const { result } = renderHook(() => usePushRegistration('user-1'))

    await waitFor(() => {
      expect(mockGetPermissionsAsync).toHaveBeenCalledTimes(1)
    })

    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' })
    await act(async () => {
      await result.current.registerNow()
    })

    expect(mockRegisterPushToken).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'expo-token-abc', userId: 'user-1' }),
    )
  })
})
