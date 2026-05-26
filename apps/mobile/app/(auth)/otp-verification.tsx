import { useReducer, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { createSupabaseClient, useAuth } from '@exposure-buddy/supabase'
import { emitAccountCreated, ConsentRecordServiceStub, CONSENT_PURPOSE_ACCOUNT_CREATION, CONSENT_VERSION_CURRENT } from '@exposure-buddy/core'

type State = {
  code: string
  isLoading: boolean
  errorKey: string | null
  hasAttemptedSubmit: boolean
  consentError: string | null
}

type Action =
  | { type: 'SET_CODE'; payload: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESEND_START' }
  | { type: 'RESEND_DONE' }
  | { type: 'SET_CONSENT_ERROR'; payload: string }
  | { type: 'CLEAR_CONSENT_ERROR' }
  | { type: 'CONSENT_START' }
  | { type: 'CONSENT_DONE' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_CODE':
      return { ...state, code: action.payload, errorKey: null }
    case 'SUBMIT_START':
      return { ...state, isLoading: true, errorKey: null, hasAttemptedSubmit: true }
    case 'SUBMIT_ERROR':
      return { ...state, isLoading: false, errorKey: action.payload }
    case 'SUBMIT_SUCCESS':
      return { ...state, isLoading: false }
    case 'CLEAR_ERROR':
      return { ...state, errorKey: null }
    case 'RESEND_START':
      return { ...state, isLoading: true, errorKey: null }
    case 'RESEND_DONE':
      return { ...state, isLoading: false }
    case 'SET_CONSENT_ERROR':
      return { ...state, consentError: action.payload }
    case 'CLEAR_CONSENT_ERROR':
      return { ...state, consentError: null }
    case 'CONSENT_START':
      return { ...state, isLoading: true }
    case 'CONSENT_DONE':
      return { ...state, isLoading: false }
    default:
      return state
  }
}

// eslint-disable-next-line i18next/no-literal-string
type OtpErrorKind = 'expired' | 'invalid' | 'unknown'

function classifyOtpError(message: string, status?: number): OtpErrorKind {
  const lower = message.toLowerCase()
  // eslint-disable-next-line i18next/no-literal-string
  if (lower.includes('token has expired') || lower.includes('otp has expired') || status === 401) return 'expired'
  // eslint-disable-next-line i18next/no-literal-string
  if (lower.includes('token is invalid') || lower.includes('invalid otp') || lower.includes('otp is invalid')) return 'invalid'
  // eslint-disable-next-line i18next/no-literal-string
  return 'unknown'
}

const INITIAL_STATE: State = {
  code: '',
  isLoading: false,
  errorKey: null,
  hasAttemptedSubmit: false,
  consentError: null,
}

export default function OtpVerificationScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { identifier, identifierType, isNewAccount: isNewAccountParam } = useLocalSearchParams<{
    identifier: string
    identifierType: 'email' | 'phone'
    isNewAccount: string
  }>()
  const isNewAccount = isNewAccountParam === 'true'

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const { isAuthenticated, authState, pendingDeletion, signOut } = useAuth()
  const prevIsAuthenticated = useRef(false)

  // Redirect to sign-in if any required navigation params are missing (deep link, crash-recovery,
  // or routing contract violation). isNewAccount undefined means consent screen was bypassed.
  useEffect(() => {
    if (!identifier || !identifierType || isNewAccountParam === undefined) {
      if (isNewAccountParam === undefined) {
        console.warn('[OtpVerificationScreen] isNewAccount param missing — routing contract violation; redirecting to sign-in')
      }
      router.replace('/(auth)/sign-in')
    }
  // Mount-only guard: route params are stable after mount; redirect fires at most once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isAuthenticated && !prevIsAuthenticated.current) {
      if (pendingDeletion?.userId === authState.userId) {
        prevIsAuthenticated.current = false
        dispatch({ type: 'SUBMIT_ERROR', payload: 'auth.deletion.accountPendingDeletion' })
        ;(async () => {
          try {
            await signOut()
          } catch {
            // Sign-out failure: session may persist until network recovers;
            // the deletion guard re-engages on next isAuthenticated transition.
          }
        })()
        return
      }

      prevIsAuthenticated.current = true

      if (isNewAccount && authState.userId) {
        dispatch({ type: 'CONSENT_START' })
        const consentService = new ConsentRecordServiceStub()
        consentService
          .recordConsent({
            timestampUtc: new Date().toISOString(),
            purposeId: CONSENT_PURPOSE_ACCOUNT_CREATION,
            consentVersion: CONSENT_VERSION_CURRENT,
            withdrawalStatus: false,
          })
          .then(() => {
            emitAccountCreated(authState.userId!)
            router.replace('/(app)/')
          })
          .catch(() => {
            dispatch({ type: 'CONSENT_DONE' })
            dispatch({ type: 'SET_CONSENT_ERROR', payload: 'auth.safety.consentWriteFailed' })
            // prevIsAuthenticated stays true; user retries via manual button tap
          })
      } else {
        if (authState.userId) emitAccountCreated(authState.userId)
        router.replace('/(app)/')
      }
    }
  }, [isAuthenticated, authState.userId, isNewAccount, pendingDeletion, signOut, router])

  if (!identifier || !identifierType || isNewAccountParam === undefined) return null

  async function handleVerify() {
    // Retry consent write if already authenticated but consent failed
    if (isAuthenticated && state.consentError && isNewAccount) {
      dispatch({ type: 'CLEAR_CONSENT_ERROR' })
      dispatch({ type: 'CONSENT_START' })
      const consentService = new ConsentRecordServiceStub()
      consentService
        .recordConsent({
          timestampUtc: new Date().toISOString(),
          purposeId: CONSENT_PURPOSE_ACCOUNT_CREATION,
          consentVersion: CONSENT_VERSION_CURRENT,
          withdrawalStatus: false,
        })
        .then(() => {
          if (authState.userId) emitAccountCreated(authState.userId)
          router.replace('/(app)/')
        })
        .catch(() => {
          dispatch({ type: 'CONSENT_DONE' })
          dispatch({ type: 'SET_CONSENT_ERROR', payload: 'auth.safety.consentWriteFailed' })
        })
      return
    }

    if (!state.code.trim()) {
      dispatch({ type: 'SUBMIT_ERROR', payload: 'auth.otp.invalidCode' })
      return
    }

    dispatch({ type: 'SUBMIT_START' })

    try {
      const supabase = createSupabaseClient()
      const verifyOptions =
        // eslint-disable-next-line i18next/no-literal-string
        identifierType === 'email'
          // eslint-disable-next-line i18next/no-literal-string
          ? { email: identifier.trim(), token: state.code, type: 'email' as const }
          // eslint-disable-next-line i18next/no-literal-string
          : { phone: identifier.trim(), token: state.code, type: 'sms' as const }

      const { error } = await supabase.auth.verifyOtp(verifyOptions)

      if (error) {
        const kind = classifyOtpError(error.message, error.status)
        dispatch({
          type: 'SUBMIT_ERROR',
          // P3: 'unknown' maps to sendError, not invalidCode — rate limits and server errors
          // are not the user's fault and shouldn't instruct them to retry the same code
          payload: kind === 'expired' ? 'auth.otp.expired' : kind === 'invalid' ? 'auth.otp.invalidCode' : 'auth.otp.sendError',
        })
        return
      }

      dispatch({ type: 'SUBMIT_SUCCESS' })
      // Navigation handled reactively via isAuthenticated effect above
    } catch {
      dispatch({ type: 'SUBMIT_ERROR', payload: 'auth.otp.sendError' })
    }
  }

  async function handleResend() {
    dispatch({ type: 'RESEND_START' })
    try {
      const supabase = createSupabaseClient()
      const otpOptions =
        identifierType === 'email'
          ? { email: identifier.trim() }
          : { phone: identifier.trim() }
      await supabase.auth.signInWithOtp(otpOptions)
    } catch {
      // Resend best-effort — no error surfaced for MVP
    } finally {
      dispatch({ type: 'RESEND_DONE' })
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('common.appName')}</Text>
      <Text style={styles.subtitle}>{t('auth.otp.enterCode', { identifier })}</Text>

      <TextInput
        style={[styles.input, state.errorKey ? styles.inputError : null]}
        value={state.code}
        onChangeText={text => dispatch({ type: 'SET_CODE', payload: text })}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        editable={!state.isLoading}
        accessibilityLabel={t('auth.otp.codeLabel')}
        accessibilityHint={t('auth.otp.codeHint')}
      />

      {/* eslint-disable-next-line i18next/no-literal-string */}
      {state.errorKey ? <Text style={styles.errorText}>{t(state.errorKey, { dpoEmail: 'privacy@exposure-buddy.com' })}</Text> : null}

      {state.consentError ? <Text style={styles.errorText}>{t(state.consentError)}</Text> : null}

      <TouchableOpacity
        style={[styles.button, state.isLoading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={state.isLoading}
        accessibilityLabel={t('auth.otp.verify')}
        accessibilityHint={t('auth.otp.verifyHint')}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{t('auth.otp.verify')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResend}
        disabled={state.isLoading}
        accessibilityLabel={t('auth.otp.resend')}
        accessibilityHint={t('auth.otp.resendHint')}
        accessibilityRole="button"
      >
        <Text style={styles.resendText}>{t('auth.otp.resend')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    textAlign: 'center',
  },
  input: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    backgroundColor: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 8,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    alignSelf: 'stretch',
    fontSize: 13,
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
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
  resendButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  resendText: {
    color: '#6b7280',
    fontSize: 14,
  },
})
