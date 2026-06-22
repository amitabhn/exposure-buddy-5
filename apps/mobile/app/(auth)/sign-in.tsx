import { useReducer, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { createSupabaseClient, useAuth } from '@exposure-buddy/supabase'
import { SafetyCheckboxes } from '../../src/components/auth/SafetyCheckboxes'

type IdentifierType = 'email' | 'phone'
// eslint-disable-next-line i18next/no-literal-string
type Mode = 'signin' | 'signup'

type State = {
  identifier: string
  identifierType: IdentifierType
  isLoading: boolean
  errorKey: string | null
  hasAttemptedSubmit: boolean
  mode: Mode
  ageConfirmed: boolean
  medicoLegalConfirmed: boolean
}

type Action =
  | { type: 'SET_IDENTIFIER'; payload: string }
  | { type: 'SET_IDENTIFIER_TYPE'; payload: IdentifierType }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_MODE'; payload: Mode }
  | { type: 'TOGGLE_AGE' }
  | { type: 'TOGGLE_MEDICO_LEGAL' }

function validateIdentifier(identifier: string, identifierType: IdentifierType): string | null {
  // eslint-disable-next-line i18next/no-literal-string
  if (!identifier.trim()) return identifierType === 'email' ? 'auth.validation.emailRequired' : 'auth.validation.phoneRequired'
  // eslint-disable-next-line i18next/no-literal-string
  if (identifierType === 'email' && !identifier.includes('@')) return 'auth.validation.invalidEmail'
  // eslint-disable-next-line i18next/no-literal-string
  if (identifierType === 'phone' && !identifier.startsWith('+')) return 'auth.validation.invalidPhone'
  return null
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_IDENTIFIER':
      return {
        ...state,
        identifier: action.payload,
        errorKey: state.hasAttemptedSubmit
          ? validateIdentifier(action.payload, state.identifierType)
          : null,
      }
    case 'SET_IDENTIFIER_TYPE':
      return { ...state, identifierType: action.payload, identifier: '', errorKey: null }
    case 'SUBMIT_START':
      return { ...state, isLoading: true, errorKey: null, hasAttemptedSubmit: true }
    case 'SUBMIT_ERROR':
      return { ...state, isLoading: false, errorKey: action.payload }
    case 'SUBMIT_SUCCESS':
      return { ...state, isLoading: false }
    case 'CLEAR_ERROR':
      return { ...state, errorKey: null }
    case 'SET_MODE':
      return { ...state, mode: action.payload, ageConfirmed: false, medicoLegalConfirmed: false, hasAttemptedSubmit: false, errorKey: null }
    case 'TOGGLE_AGE':
      return { ...state, ageConfirmed: !state.ageConfirmed }
    case 'TOGGLE_MEDICO_LEGAL':
      return { ...state, medicoLegalConfirmed: !state.medicoLegalConfirmed }
    default:
      return state
  }
}

const INITIAL_STATE: State = {
  identifier: '',
  identifierType: 'email',
  isLoading: false,
  errorKey: null,
  hasAttemptedSubmit: false,
  mode: 'signup',
  ageConfirmed: false,
  medicoLegalConfirmed: false,
}

export default function SignInScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isAuthenticated, hasAuthedBefore } = useAuth()
  // Returning user (has signed in on this device before): default to "Sign in".
  // Fresh install: default to "Create account". Lazy initializer reads the flag
  // once on mount — AuthProvider has resolved it by the time the auth gate
  // routes us here, so no flash.
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (initial): State => ({
    ...initial,
    // eslint-disable-next-line i18next/no-literal-string
    mode: hasAuthedBefore ? 'signin' : 'signup',
  }))

  // If we land on sign-in while already authenticated (e.g. dev password sign-in
  // or returning user), redirect to home. Mirrors the redirect in otp-verification.
  useEffect(() => {
    if (isAuthenticated) router.replace('/(app)/')
  }, [isAuthenticated, router])

  const checkboxesIncomplete = state.mode === 'signup' && (!state.ageConfirmed || !state.medicoLegalConfirmed)
  const isSendDisabled = state.isLoading || checkboxesIncomplete

  async function handleSendCode() {
    if (isSendDisabled) return
    const validationErrorKey = validateIdentifier(state.identifier, state.identifierType)
    if (validationErrorKey) {
      dispatch({ type: 'SUBMIT_ERROR', payload: validationErrorKey })
      return
    }

    dispatch({ type: 'SUBMIT_START' })

    try {
      const supabase = createSupabaseClient()
      const otpOptions =
        state.identifierType === 'email'
          ? { email: state.identifier.trim() }
          : { phone: state.identifier.trim() }

      const { error } = await supabase.auth.signInWithOtp(otpOptions)

      if (error) {
        dispatch({ type: 'SUBMIT_ERROR', payload: 'auth.otp.sendError' })
        return
      }

      dispatch({ type: 'SUBMIT_SUCCESS' })
      router.push({
        pathname: '/(auth)/otp-verification',
        params: {
          identifier: state.identifier,
          identifierType: state.identifierType,
          isNewAccount: state.mode === 'signup' ? 'true' : 'false',
        },
      })
    } catch {
      dispatch({ type: 'SUBMIT_ERROR', payload: 'auth.otp.sendError' })
    }
  }

  function handleBlur() {
    if (state.hasAttemptedSubmit) {
      const errorKey = validateIdentifier(state.identifier, state.identifierType)
      if (errorKey) dispatch({ type: 'SUBMIT_ERROR', payload: errorKey })
    }
  }

  const inputHint =
    state.identifierType === 'email'
      ? t('auth.otp.emailInputHint')
      : t('auth.otp.phoneInputHint')

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('common.appName')}</Text>
      <Text style={styles.subtitle}>{t('auth.otp.sendCode')}</Text>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, state.mode === 'signup' && styles.tabActive]}
          onPress={() => dispatch({ type: 'SET_MODE', payload: 'signup' })}
          accessibilityRole="tab"
          accessibilityLabel={t('auth.mode.createAccount')}
          accessibilityState={{ selected: state.mode === 'signup' }}
        >
          <Text style={[styles.tabText, state.mode === 'signup' && styles.tabTextActive]}>
            {t('auth.mode.createAccount')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, state.mode === 'signin' && styles.tabActive]}
          onPress={() => dispatch({ type: 'SET_MODE', payload: 'signin' })}
          accessibilityRole="tab"
          accessibilityLabel={t('auth.mode.signIn')}
          accessibilityState={{ selected: state.mode === 'signin' }}
        >
          <Text style={[styles.tabText, state.mode === 'signin' && styles.tabTextActive]}>
            {t('auth.mode.signIn')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, state.identifierType === 'email' && styles.tabActive]}
          onPress={() => dispatch({ type: 'SET_IDENTIFIER_TYPE', payload: 'email' })}
          accessibilityLabel={t('auth.otp.emailLabel')}
          accessibilityRole="tab"
          accessibilityState={{ selected: state.identifierType === 'email' }}
        >
          <Text style={[styles.tabText, state.identifierType === 'email' && styles.tabTextActive]}>
            {t('auth.otp.emailLabel')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, state.identifierType === 'phone' && styles.tabActive]}
          onPress={() => dispatch({ type: 'SET_IDENTIFIER_TYPE', payload: 'phone' })}
          accessibilityLabel={t('auth.otp.phoneLabel')}
          accessibilityRole="tab"
          accessibilityState={{ selected: state.identifierType === 'phone' }}
        >
          <Text style={[styles.tabText, state.identifierType === 'phone' && styles.tabTextActive]}>
            {t('auth.otp.phoneLabel')}
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles.input, state.errorKey ? styles.inputError : null]}
        value={state.identifier}
        onChangeText={text => dispatch({ type: 'SET_IDENTIFIER', payload: text })}
        onBlur={handleBlur}
        placeholder={
          state.identifierType === 'email'
            ? t('auth.otp.emailLabel')
            : t('auth.otp.phoneLabel')
        }
        keyboardType={state.identifierType === 'email' ? 'email-address' : 'phone-pad'}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!state.isLoading}
        accessibilityLabel={
          state.identifierType === 'email'
            ? t('auth.otp.emailLabel')
            : t('auth.otp.phoneLabel')
        }
        accessibilityHint={inputHint}
      />

      {state.mode === 'signup' && (
        <SafetyCheckboxes
          ageConfirmed={state.ageConfirmed}
          medicoLegalConfirmed={state.medicoLegalConfirmed}
          onToggleAge={() => dispatch({ type: 'TOGGLE_AGE' })}
          onToggleMedicoLegal={() => dispatch({ type: 'TOGGLE_MEDICO_LEGAL' })}
        />
      )}

      {state.errorKey ? <Text style={styles.errorText}>{t(state.errorKey)}</Text> : null}

      <TouchableOpacity
        style={[styles.button, isSendDisabled && styles.buttonDisabled]}
        onPress={handleSendCode}
        disabled={isSendDisabled}
        accessibilityLabel={t('auth.otp.sendCode')}
        accessibilityHint={t('auth.otp.sendCodeHint')}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{t('auth.otp.sendCode')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.privacyLink}
        onPress={() => router.push('/privacy-notice')}
        accessibilityRole="link"
        accessibilityLabel={t('legal.privacyNotice.title')}
        accessibilityHint={t('legal.privacyNotice.accessibilityHint')}
      >
        <Text style={styles.privacyLinkText}>{t('legal.privacyNotice.title')}</Text>
      </TouchableOpacity>

      {(__DEV__ || process.env.EXPO_PUBLIC_APP_VARIANT === 'preview') ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#6b7280', marginTop: 8 }]}
          onPress={async () => {
            const { error } = await createSupabaseClient().auth.signInWithPassword({
              // eslint-disable-next-line i18next/no-literal-string
              email: 'test1@test.com',
              // eslint-disable-next-line i18next/no-literal-string
              password: 'DevTest123!',
            })
            if (error) dispatch({ type: 'SUBMIT_ERROR', payload: 'auth.otp.sendError' })
          }}
          accessibilityRole="button"
        >
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Text style={styles.buttonText}>DEV: Sign in as test user</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  // Story 9.3 max-font-size walkthrough: see session/briefing.tsx for the flexGrow fix pattern.
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 32,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  tabActive: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    alignSelf: 'stretch',
    fontSize: 13,
    color: '#ef4444',
    marginBottom: 12,
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyLink: {
    marginTop: 24,
    alignSelf: 'center',
  },
  privacyLinkText: {
    fontSize: 13,
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
})
