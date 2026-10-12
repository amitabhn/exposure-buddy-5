import React from 'react'
import { act, render } from '@testing-library/react-native'

// Story 19.8: the native splash is held until auth has a definite answer, and PowerSync
// connects only for a confirmed session.

const mockHideAsync = jest.fn().mockResolvedValue(undefined)
const mockConnect = jest.fn().mockResolvedValue(undefined)
let mockAuth: { userId: string | null; isLoading: boolean; isSessionConfirmed: boolean } = {
  userId: null,
  isLoading: true,
  isSessionConfirmed: false,
}

jest.mock('@sentry/react-native', () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn() }))
jest.mock('../src/error-handler', () => ({ initErrorHandler: jest.fn(), reportDroppedWrite: jest.fn() }))
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: (...a: unknown[]) => mockHideAsync(...a),
}))
jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }))
jest.mock('@expo-google-fonts/inter', () => ({}))
jest.mock('@expo-google-fonts/dm-serif-display', () => ({}))
jest.mock('expo-router', () => ({
  Stack: Object.assign(({ children }: { children: React.ReactNode }) => <>{children}</>, { Screen: () => null }),
  DefaultTheme: {},
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
jest.mock('@rn-primitives/portal', () => ({ PortalHost: () => null }))
jest.mock('../src/components/navigation/BackButton', () => ({ BackButton: () => null }))
jest.mock('../src/components/CalmMeFab', () => ({ CalmMeFab: () => null }))
jest.mock('../src/i18n', () => ({ __esModule: true, default: { t: (k: string) => k } }))
jest.mock('../src/contexts/AnimationContext', () => ({
  ReducedMotionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
jest.mock('@exposure-buddy/supabase', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  initSession: jest.fn(() => Promise.resolve({})),
  useAuth: () => mockAuth,
  createSupabaseClient: jest.fn(),
}))
jest.mock('@exposure-buddy/sync', () => ({
  PowerSyncContext: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
  getPowerSyncDatabase: jest.fn(() => ({ connect: mockConnect, disconnectAndClear: jest.fn() })),
  createPowerSyncDatabase: jest.fn(() => ({ connect: jest.fn(), disconnectAndClear: jest.fn() })),
  PowerSyncSyncAdapter: jest.fn(),
  SupabasePowerSyncConnector: jest.fn(),
  initAdapter: jest.fn(),
  watchStalledConnection: jest.fn(() => jest.fn()),
}))

import RootLayout from './_layout'

beforeEach(() => {
  mockHideAsync.mockClear()
  mockConnect.mockClear()
})

describe('RootLayout splash hold (Story 19.8)', () => {
  it('does not hide the splash while auth is loading', async () => {
    mockAuth = { userId: null, isLoading: true, isSessionConfirmed: false }
    render(<RootLayout />)
    await act(async () => {})
    expect(mockHideAsync).not.toHaveBeenCalled()
  })

  it('hides the splash once auth has resolved', async () => {
    mockAuth = { userId: null, isLoading: true, isSessionConfirmed: false }
    const { rerender } = render(<RootLayout />)
    await act(async () => {})
    mockAuth = { userId: 'user-1', isLoading: false, isSessionConfirmed: false }
    rerender(<RootLayout />)
    await act(async () => {})
    expect(mockHideAsync).toHaveBeenCalled()
  })
})

describe('PowerSyncConnectionManager gating (Story 19.8)', () => {
  it('leaves PowerSync disconnected for a stored-but-unconfirmed session', async () => {
    mockAuth = { userId: 'user-1', isLoading: false, isSessionConfirmed: false }
    render(<RootLayout />)
    await act(async () => {})
    expect(mockConnect).not.toHaveBeenCalled()
  })

  it('connects once the session is confirmed', async () => {
    mockAuth = { userId: 'user-2', isLoading: false, isSessionConfirmed: false }
    const { rerender } = render(<RootLayout />)
    await act(async () => {})
    expect(mockConnect).not.toHaveBeenCalled()
    mockAuth = { userId: 'user-2', isLoading: false, isSessionConfirmed: true }
    rerender(<RootLayout />)
    await act(async () => {})
    expect(mockConnect).toHaveBeenCalledTimes(1)
  })

  it('connects straight away for a confirmed session', async () => {
    mockAuth = { userId: 'user-3', isLoading: false, isSessionConfirmed: true }
    render(<RootLayout />)
    await act(async () => {})
    expect(mockConnect).toHaveBeenCalledTimes(1)
  })
})
