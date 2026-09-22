import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'

type GetAllByLabelText = ReturnType<typeof render>['getAllByLabelText']
type TestElement = ReturnType<GetAllByLabelText>[number]

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}))

const mockRouterReplace = jest.fn()
const mockRouterPush = jest.fn()
// A stable object reference, matching real expo-router's useRouter() — the
// isAuthenticated effect below depends on `router` in its deps array, and a
// fresh object per call would re-trigger it on every render (infinite loop).
const mockRouter = { replace: mockRouterReplace, push: mockRouterPush }

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}))

const mockSignUp = jest.fn()
const mockSignInWithPassword = jest.fn()
const mockSignInWithOtp = jest.fn()
const mockSignOut = jest.fn()
const mockRecordConsent = jest.fn()
const mockEmitAccountCreated = jest.fn()

type MockAuthState = {
  isAuthenticated: boolean
  authState: { userId: string | null; email: string | null; session: unknown }
  pendingDeletion: { userId: string } | null
  hasAuthedBefore: boolean
  signOut: () => Promise<void>
}

const authFixture: MockAuthState = {
  isAuthenticated: false,
  authState: { userId: null, email: null, session: null },
  pendingDeletion: null,
  hasAuthedBefore: false,
  signOut: () => mockSignOut(),
}

jest.mock('@exposure-buddy/supabase', () => ({
  createSupabaseClient: () => ({
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
    },
  }),
  useAuth: () => authFixture,
  ConsentRecordService: jest.fn().mockImplementation(() => ({
    recordConsent: (...args: unknown[]) => mockRecordConsent(...args),
  })),
}))

jest.mock('@exposure-buddy/core', () => ({
  emitAccountCreated: (...args: unknown[]) => mockEmitAccountCreated(...args),
  CONSENT_PURPOSE_ACCOUNT_CREATION: 'account-creation-v1',
  CONSENT_VERSION_CURRENT: '1.0',
}))

jest.mock('../../src/components/auth/SafetyCheckboxes', () => {
  const { View, TouchableOpacity, Text } = require('react-native')
  return {
    SafetyCheckboxes: ({
      ageConfirmed,
      medicoLegalConfirmed,
      onToggleAge,
      onToggleMedicoLegal,
    }: {
      ageConfirmed: boolean
      medicoLegalConfirmed: boolean
      onToggleAge: () => void
      onToggleMedicoLegal: () => void
    }) => (
      <View>
        <TouchableOpacity accessibilityLabel="age-checkbox" onPress={onToggleAge}>
          <Text>{String(ageConfirmed)}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="medico-checkbox" onPress={onToggleMedicoLegal}>
          <Text>{String(medicoLegalConfirmed)}</Text>
        </TouchableOpacity>
      </View>
    ),
  }
})

import SignInScreen from './sign-in'

function checkSafetyBoxes(getByLabelText: (label: string) => unknown) {
  fireEvent.press(getByLabelText('age-checkbox') as never)
  fireEvent.press(getByLabelText('medico-checkbox') as never)
}

// The identifier TextInput and the "Email address" tab share the same i18n label
// (both read auth.otp.emailLabel), so getByLabelText alone is ambiguous — filter
// getAllByLabelText's matches down to the actual TextInput.
function getIdentifierInput(getAllByLabelText: GetAllByLabelText): TestElement {
  const input = getAllByLabelText('auth.otp.emailLabel').find(el => el.type === 'TextInput')
  if (!input) throw new Error('identifier TextInput not found')
  return input
}

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    authFixture.isAuthenticated = false
    authFixture.authState = { userId: null, email: null, session: null }
    authFixture.pendingDeletion = null
    authFixture.hasAuthedBefore = false
    mockRecordConsent.mockResolvedValue(undefined)
    mockSignOut.mockResolvedValue(undefined)
  })

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_ENABLE_OTP_SIGNIN
  })

  it('renders all four mode x authMethod combinations', () => {
    process.env.EXPO_PUBLIC_ENABLE_OTP_SIGNIN = 'true'
    const { getByLabelText, getAllByLabelText, queryByLabelText, getByText } = render(<SignInScreen />)

    // Default: signup + password (INITIAL_STATE.authMethod is 'password')
    expect(getIdentifierInput(getAllByLabelText)).toBeTruthy()
    expect(getByLabelText('auth.password.label')).toBeTruthy()
    // Mode-switch footer must invite the OTHER mode, not repeat the current one.
    expect(getByText(/auth\.modeSwitch\.alreadyHaveAccount/)).toBeTruthy()
    expect(getByText(/auth\.mode\.signIn$/)).toBeTruthy()

    // signup + otp
    fireEvent.press(getByLabelText('auth.authMethod.switchToOtp'))
    expect(getIdentifierInput(getAllByLabelText)).toBeTruthy()
    expect(queryByLabelText('auth.password.label')).toBeNull()

    // signin + otp
    fireEvent.press(getByLabelText('auth.mode.signIn'))
    expect(getIdentifierInput(getAllByLabelText)).toBeTruthy()
    // Now in signin mode — footer must invite switching to signup, not repeat "sign in".
    expect(getByText(/auth\.modeSwitch\.newHere/)).toBeTruthy()
    expect(getByText(/auth\.mode\.createAccount$/)).toBeTruthy()

    // signin + password
    fireEvent.press(getByLabelText('auth.authMethod.switchToPassword'))
    expect(getByLabelText('auth.password.label')).toBeTruthy()
  })

  it('blocks password signup submit when the password is under 8 characters', async () => {
    const { getByLabelText, getAllByLabelText, getByText } = render(<SignInScreen />)
    fireEvent.changeText(getIdentifierInput(getAllByLabelText), 'user@test.com')
    fireEvent.changeText(getByLabelText('auth.password.label'), 'short')
    checkSafetyBoxes(getByLabelText)

    await act(async () => {
      fireEvent.press(getByLabelText('auth.password.submitSignUp'))
    })

    expect(getByText('auth.validation.passwordTooShort')).toBeTruthy()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('disables password signup submit until both safety checkboxes are checked, identically to OTP signup', () => {
    const { getByLabelText } = render(<SignInScreen />)
    const submit = getByLabelText('auth.password.submitSignUp')
    expect(submit.props.accessibilityState.disabled).toBe(true)

    checkSafetyBoxes(getByLabelText)
    expect(submit.props.accessibilityState.disabled).toBe(false)
  })

  it('writes the consent record and emits accountCreated before redirecting, in order, on a successful password signup', async () => {
    mockSignUp.mockResolvedValue({ data: { session: {} }, error: null })
    let resolveConsent: () => void = () => {}
    mockRecordConsent.mockImplementation(
      () => new Promise<void>(resolve => { resolveConsent = resolve })
    )

    const { getByLabelText, getAllByLabelText, rerender } = render(<SignInScreen />)
    fireEvent.changeText(getIdentifierInput(getAllByLabelText), 'new@test.com')
    fireEvent.changeText(getByLabelText('auth.password.label'), 'longenough1')
    checkSafetyBoxes(getByLabelText)

    await act(async () => {
      fireEvent.press(getByLabelText('auth.password.submitSignUp'))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockSignUp).toHaveBeenCalledWith({ email: 'new@test.com', password: 'longenough1' })

    // Simulate AuthProvider's onAuthStateChange flipping isAuthenticated after signUp resolves.
    authFixture.isAuthenticated = true
    authFixture.authState = { userId: 'user-99', email: 'new@test.com', session: {} }

    await act(async () => {
      rerender(<SignInScreen />)
    })

    expect(mockRecordConsent).toHaveBeenCalledTimes(1)
    expect(mockEmitAccountCreated).not.toHaveBeenCalled()
    expect(mockRouterReplace).not.toHaveBeenCalled()

    await act(async () => {
      resolveConsent()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockEmitAccountCreated).toHaveBeenCalledWith('user-99')
    expect(mockRouterReplace).toHaveBeenCalledWith('/(app)/')

    const consentOrder = mockRecordConsent.mock.invocationCallOrder[0]!
    const emitOrder = mockEmitAccountCreated.mock.invocationCallOrder[0]!
    const redirectOrder = mockRouterReplace.mock.invocationCallOrder[0]!
    expect(consentOrder).toBeLessThan(emitOrder)
    expect(emitOrder).toBeLessThan(redirectOrder)
  })

  it('surfaces an error and does not redirect when the consent write fails', async () => {
    mockSignUp.mockResolvedValue({ data: { session: {} }, error: null })
    mockRecordConsent.mockRejectedValue(new Error('network'))

    const { getByLabelText, getAllByLabelText, getByText, rerender } = render(<SignInScreen />)
    fireEvent.changeText(getIdentifierInput(getAllByLabelText), 'new@test.com')
    fireEvent.changeText(getByLabelText('auth.password.label'), 'longenough1')
    checkSafetyBoxes(getByLabelText)

    await act(async () => {
      fireEvent.press(getByLabelText('auth.password.submitSignUp'))
      await Promise.resolve()
    })

    authFixture.isAuthenticated = true
    authFixture.authState = { userId: 'user-99', email: 'new@test.com', session: {} }

    await act(async () => {
      rerender(<SignInScreen />)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(getByText('auth.safety.consentWriteFailed')).toBeTruthy()
    expect(mockRouterReplace).not.toHaveBeenCalled()
  })

  it('redirects on a successful password sign-in without writing a consent record', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })

    const { getByLabelText, getAllByLabelText, rerender } = render(<SignInScreen />)
    fireEvent.press(getByLabelText('auth.mode.signIn'))
    fireEvent.changeText(getIdentifierInput(getAllByLabelText), 'existing@test.com')
    fireEvent.changeText(getByLabelText('auth.password.label'), 'whatever1')

    await act(async () => {
      fireEvent.press(getByLabelText('auth.password.submitSignIn'))
      await Promise.resolve()
    })

    authFixture.isAuthenticated = true
    authFixture.authState = { userId: 'user-1', email: 'existing@test.com', session: {} }

    await act(async () => {
      rerender(<SignInScreen />)
    })

    expect(mockRecordConsent).not.toHaveBeenCalled()
    expect(mockRouterReplace).toHaveBeenCalledWith('/(app)/')
  })

  it('maps an invalid-credentials sign-in error to a plain-language message', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })

    const { getByLabelText, getAllByLabelText, getByText } = render(<SignInScreen />)
    fireEvent.press(getByLabelText('auth.mode.signIn'))
    fireEvent.changeText(getIdentifierInput(getAllByLabelText), 'existing@test.com')
    fireEvent.changeText(getByLabelText('auth.password.label'), 'whatever1')

    await act(async () => {
      fireEvent.press(getByLabelText('auth.password.submitSignIn'))
    })

    expect(getByText('auth.password.invalidCredentials')).toBeTruthy()
  })

  it('surfaces an error instead of hanging when signUp resolves with no session (duplicate identifier)', async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null })

    const { getByLabelText, getAllByLabelText, getByText } = render(<SignInScreen />)
    fireEvent.changeText(getIdentifierInput(getAllByLabelText), 'dupe@test.com')
    fireEvent.changeText(getByLabelText('auth.password.label'), 'longenough1')
    checkSafetyBoxes(getByLabelText)

    await act(async () => {
      fireEvent.press(getByLabelText('auth.password.submitSignUp'))
    })

    expect(getByText('auth.password.signUpUnavailable')).toBeTruthy()
    expect(mockRouterReplace).not.toHaveBeenCalled()
  })

  it('blocks and signs out a pendingDeletion account on password sign-in, matching otp-verification.tsx', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })

    const { getByLabelText, getAllByLabelText, getByText, rerender } = render(<SignInScreen />)
    fireEvent.press(getByLabelText('auth.mode.signIn'))
    fireEvent.changeText(getIdentifierInput(getAllByLabelText), 'deleted@test.com')
    fireEvent.changeText(getByLabelText('auth.password.label'), 'whatever1')

    await act(async () => {
      fireEvent.press(getByLabelText('auth.password.submitSignIn'))
      await Promise.resolve()
    })

    authFixture.isAuthenticated = true
    authFixture.authState = { userId: 'user-del', email: 'deleted@test.com', session: {} }
    authFixture.pendingDeletion = { userId: 'user-del' }

    await act(async () => {
      rerender(<SignInScreen />)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(getByText(/auth\.deletion\.accountPendingDeletion/)).toBeTruthy()
    expect(mockRouterReplace).not.toHaveBeenCalled()
  })

  describe('dev/test sign-in shortcut', () => {
    const originalSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL

    afterEach(() => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    })

    it('is hidden when EXPO_PUBLIC_SUPABASE_URL points at a hosted Supabase project', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://jhbtzsvlgglyfbrgmpsb.supabase.co'
      const { queryByText } = render(<SignInScreen />)
      expect(queryByText('DEV: Sign in as test user')).toBeNull()
    })

    it('is shown when EXPO_PUBLIC_SUPABASE_URL points at local Supabase', () => {
      process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
      const { queryByText } = render(<SignInScreen />)
      expect(queryByText('DEV: Sign in as test user')).toBeTruthy()
    })

    it('is hidden (fail closed) when EXPO_PUBLIC_SUPABASE_URL is unset', () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL
      const { queryByText } = render(<SignInScreen />)
      expect(queryByText('DEV: Sign in as test user')).toBeNull()
    })
  })

  describe('OTP sign-in gating', () => {
    it('"use a code instead" is absent when EXPO_PUBLIC_ENABLE_OTP_SIGNIN is unset', () => {
      const { queryByLabelText } = render(<SignInScreen />)
      expect(queryByLabelText('auth.authMethod.switchToOtp')).toBeNull()
    })

    it('"use a code instead" is present when EXPO_PUBLIC_ENABLE_OTP_SIGNIN is \'true\'', () => {
      process.env.EXPO_PUBLIC_ENABLE_OTP_SIGNIN = 'true'
      const { queryByLabelText } = render(<SignInScreen />)
      expect(queryByLabelText('auth.authMethod.switchToOtp')).toBeTruthy()
    })

    it('"use a code instead" is absent for any non-\'true\' value (strict equality, not truthy)', () => {
      process.env.EXPO_PUBLIC_ENABLE_OTP_SIGNIN = 'false'
      const { queryByLabelText } = render(<SignInScreen />)
      expect(queryByLabelText('auth.authMethod.switchToOtp')).toBeNull()
    })
  })
})
