import { useReducer, useEffect, useRef, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { createSupabaseClient, useAuth, ConsentRecordService } from '@exposure-buddy/supabase'
import { emitAccountCreated, CONSENT_PURPOSE_ACCOUNT_CREATION, CONSENT_VERSION_CURRENT } from '@exposure-buddy/core'
import { color, radius, spacing, typography } from '@exposure-buddy/ui'
import { SafetyCheckboxes } from '../../src/components/auth/SafetyCheckboxes'
import { DPO_EMAIL } from '../../src/constants/legal'

type IdentifierType = 'email' | 'phone'
// eslint-disable-next-line i18next/no-literal-string
type Mode = 'signin' | 'signup'
// eslint-disable-next-line i18next/no-literal-string
type AuthMethod = 'otp' | 'password'

type State = {
  identifier: string
  identifierType: IdentifierType
  password: string
  isLoading: boolean
  errorKey: string | null
  hasAttemptedSubmit: boolean
  mode: Mode
  authMethod: AuthMethod
  ageConfirmed: boolean
  medicoLegalConfirmed: boolean
  // True from the moment a password signup's signUp() call is dispatched until its
  // consent write completes (or the flow is abandoned via a mode/method switch).
  // Distinct from authMethod, which stays 'password' for both signup and signin —
  // this is the only way the isAuthenticated effect can tell them apart.
  isPasswordSignupPending: boolean
  consentError: string | null
}

type Action =
  | { type: 'SET_IDENTIFIER'; payload: string }
  | { type: 'SET_IDENTIFIER_TYPE'; payload: IdentifierType }
  | { type: 'SET_PASSWORD'; payload: string }
  | { type: 'SET_AUTH_METHOD'; payload: AuthMethod }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_MODE'; payload: Mode }
  | { type: 'TOGGLE_AGE' }
  | { type: 'TOGGLE_MEDICO_LEGAL' }
  | { type: 'PASSWORD_SIGNUP_PENDING' }
  | { type: 'PASSWORD_SIGNUP_CONSUMED' }
  | { type: 'SET_CONSENT_ERROR'; payload: string }
  | { type: 'CLEAR_CONSENT_ERROR' }
  | { type: 'CONSENT_START' }
  | { type: 'CONSENT_DONE' }

function validateIdentifier(identifier: string, identifierType: IdentifierType): string | null {
  // eslint-disable-next-line i18next/no-literal-string
  if (!identifier.trim()) return identifierType === 'email' ? 'auth.validation.emailRequired' : 'auth.validation.phoneRequired'
  // eslint-disable-next-line i18next/no-literal-string
  if (identifierType === 'email' && !identifier.includes('@')) return 'auth.validation.invalidEmail'
  // eslint-disable-next-line i18next/no-literal-string
  if (identifierType === 'phone' && !identifier.startsWith('+')) return 'auth.validation.invalidPhone'
  return null
}

function validatePassword(password: string, mode: Mode): string | null {
  // eslint-disable-next-line i18next/no-literal-string
  if (!password) return 'auth.validation.passwordRequired'
  // 8-char minimum is a signup-only rule; existing accounts may pre-date it.
  // eslint-disable-next-line i18next/no-literal-string
  if (mode === 'signup' && password.length < 8) return 'auth.validation.passwordTooShort'
  return null
}

// eslint-disable-next-line i18next/no-literal-string
const IDENTIFIER_VALIDATION_ERROR_KEYS = new Set([
  'auth.validation.emailRequired',
  'auth.validation.phoneRequired',
  'auth.validation.invalidEmail',
  'auth.validation.invalidPhone',
])

// eslint-disable-next-line i18next/no-literal-string
const PASSWORD_VALIDATION_ERROR_KEYS = new Set([
  'auth.validation.passwordRequired',
  'auth.validation.passwordTooShort',
])

function isRateLimitedError(message: string): boolean {
  const lower = message.toLowerCase()
  // eslint-disable-next-line i18next/no-literal-string
  return lower.includes('rate limit') || lower.includes('security purposes')
}

// Gates the dev/test sign-in shortcut (Story 15.2) — true only for known local/loopback
// Supabase hosts, so the shortcut never renders against a real hosted backend regardless
// of __DEV__ or build variant. Fails closed: an unset/empty URL returns false.
function isLocalSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false
  // eslint-disable-next-line i18next/no-literal-string
  return url.includes('127.0.0.1') || url.includes('10.0.2.2')
}

function classifyPasswordSignInError(message: string): string {
  // eslint-disable-next-line i18next/no-literal-string
  if (isRateLimitedError(message)) return 'auth.password.rateLimited'
  const lower = message.toLowerCase()
  // eslint-disable-next-line i18next/no-literal-string
  if (lower.includes('invalid login credentials')) return 'auth.password.invalidCredentials'
  // eslint-disable-next-line i18next/no-literal-string
  return 'auth.password.signInError'
}

function classifyPasswordSignUpError(message: string): string {
  // eslint-disable-next-line i18next/no-literal-string
  if (isRateLimitedError(message)) return 'auth.password.rateLimited'
  // Supabase's email-enumeration protection means signUp() never throws for a
  // duplicate, confirmed identifier — it resolves with no error and no session
  // instead (handled separately via the !data.session check below). Any error
  // thrown here is a genuine failure (network, rate-limit, etc.), not a duplicate.
  // eslint-disable-next-line i18next/no-literal-string
  return 'auth.password.signUpError'
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
      return {
        ...state,
        identifierType: action.payload,
        identifier: '',
        errorKey: null,
        password: '',
        isPasswordSignupPending: false,
        consentError: null,
      }
    case 'SET_PASSWORD':
      return {
        ...state,
        password: action.payload,
        errorKey: state.hasAttemptedSubmit ? validatePassword(action.payload, state.mode) : null,
      }
    case 'SET_AUTH_METHOD':
      return {
        ...state,
        authMethod: action.payload,
        password: '',
        errorKey: null,
        hasAttemptedSubmit: false,
        isPasswordSignupPending: false,
        consentError: null,
      }
    case 'SUBMIT_START':
      return { ...state, isLoading: true, errorKey: null, hasAttemptedSubmit: true }
    case 'SUBMIT_ERROR':
      // No session was (or ever will be) established on this path, so any pending
      // password-signup consent tracking from an earlier attempt is stale — clear it.
      return { ...state, isLoading: false, errorKey: action.payload, isPasswordSignupPending: false }
    case 'SUBMIT_SUCCESS':
      return { ...state, isLoading: false }
    case 'CLEAR_ERROR':
      return { ...state, errorKey: null }
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        ageConfirmed: false,
        medicoLegalConfirmed: false,
        hasAttemptedSubmit: false,
        errorKey: null,
        isPasswordSignupPending: false,
        consentError: null,
      }
    case 'TOGGLE_AGE':
      return { ...state, ageConfirmed: !state.ageConfirmed }
    case 'TOGGLE_MEDICO_LEGAL':
      return { ...state, medicoLegalConfirmed: !state.medicoLegalConfirmed }
    case 'PASSWORD_SIGNUP_PENDING':
      return { ...state, isPasswordSignupPending: true }
    case 'PASSWORD_SIGNUP_CONSUMED':
      return { ...state, isPasswordSignupPending: false }
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

const INITIAL_STATE: State = {
  identifier: '',
  identifierType: 'email',
  password: '',
  isLoading: false,
  errorKey: null,
  hasAttemptedSubmit: false,
  mode: 'signup',
  authMethod: 'password',
  ageConfirmed: false,
  medicoLegalConfirmed: false,
  isPasswordSignupPending: false,
  consentError: null,
}

export default function SignInScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isAuthenticated, hasAuthedBefore, authState, pendingDeletion, signOut } = useAuth()
  // Returning user (has signed in on this device before): default to "Sign in".
  // Fresh install: default to "Create account". Lazy initializer reads the flag
  // once on mount — AuthProvider has resolved it by the time the auth gate
  // routes us here, so no flash.
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (initial): State => ({
    ...initial,
    // eslint-disable-next-line i18next/no-literal-string
    mode: hasAuthedBefore ? 'signin' : 'signup',
  }))

  // Guards the isAuthenticated transition below from re-entering on every render
  // (reducer/state updates are not synchronous enough to block a second effect
  // invocation before the update commits — a ref read/write can). Mirrors
  // otp-verification.tsx's prevIsAuthenticated pattern.
  const prevIsAuthenticated = useRef(false)

  // Shared by the isAuthenticated effect below and handlePasswordSubmit's retry
  // branch — a single consent-write implementation avoids the two copies drifting
  // (e.g. one asserting authState.userId non-null, the other checking it).
  const writePasswordSignupConsent = useCallback(() => {
    dispatch({ type: 'CONSENT_START' })
    const consentService = new ConsentRecordService()
    consentService
      .recordConsent({
        timestampUtc: new Date().toISOString(),
        purposeId: CONSENT_PURPOSE_ACCOUNT_CREATION,
        consentVersion: CONSENT_VERSION_CURRENT,
        withdrawalStatus: false,
      })
      .then(() => {
        if (authState.userId) emitAccountCreated(authState.userId)
        dispatch({ type: 'PASSWORD_SIGNUP_CONSUMED' })
        router.replace('/(app)/')
      })
      .catch(() => {
        dispatch({ type: 'CONSENT_DONE' })
        dispatch({ type: 'SET_CONSENT_ERROR', payload: 'auth.safety.consentWriteFailed' })
        // prevIsAuthenticated stays true; isPasswordSignupPending stays true —
        // user retries via handlePasswordSubmit, which detects this combination.
      })
  }, [authState.userId, router])

  // Fires once when isAuthenticated flips true — covers a returning user's password
  // sign-in, the dev test-user button, and (critically) a just-completed password
  // signup, for which the DPDPA consent record must be written and emitAccountCreated
  // fired BEFORE redirecting — see Story 10.1 Dev Notes: Consent Recording Race.
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

      if (state.isPasswordSignupPending && authState.userId) {
        writePasswordSignupConsent()
      } else {
        router.replace('/(app)/')
      }
    }
  }, [isAuthenticated, authState.userId, pendingDeletion, signOut, router, state.isPasswordSignupPending, writePasswordSignupConsent])

  const checkboxesIncomplete = state.mode === 'signup' && (!state.ageConfirmed || !state.medicoLegalConfirmed)
  const isActionDisabled = state.isLoading || checkboxesIncomplete

  // Blocks tab/mode switching while a password-signup submit or consent-write is
  // in flight or awaiting retry — abandoning mid-flight is how the DPDPA consent
  // write gets silently skipped (Story 10.1 code review, Decision 1). The full
  // fix (server-verified consent status at app entry) is a separate follow-up
  // story; this closes the two paths reachable from this screen.
  const isAuthMethodOrModeLocked = state.isLoading || state.isPasswordSignupPending

  // Once signup already succeeded and only the consent write needs retrying, the
  // safety checkboxes are no longer meaningful — don't let them block the retry.
  const isConsentRetryPending = isAuthenticated && !!state.consentError && state.isPasswordSignupPending
  const isSubmitDisabled = isConsentRetryPending ? state.isLoading : isActionDisabled

  const isIdentifierFieldError = state.errorKey !== null && IDENTIFIER_VALIDATION_ERROR_KEYS.has(state.errorKey)
  const isPasswordFieldError = state.errorKey !== null && PASSWORD_VALIDATION_ERROR_KEYS.has(state.errorKey)

  async function handleSendCode() {
    if (isActionDisabled) return
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

  async function handlePasswordSubmit() {
    // Retry consent write after a prior failure, instead of re-attempting signUp
    // against an account that already has an active session.
    if (isAuthenticated && state.consentError && state.isPasswordSignupPending) {
      dispatch({ type: 'CLEAR_CONSENT_ERROR' })
      writePasswordSignupConsent()
      return
    }

    if (isActionDisabled) return

    const identifierErrorKey = validateIdentifier(state.identifier, state.identifierType)
    const passwordErrorKey = validatePassword(state.password, state.mode)
    const validationErrorKey = identifierErrorKey ?? passwordErrorKey
    if (validationErrorKey) {
      dispatch({ type: 'SUBMIT_ERROR', payload: validationErrorKey })
      return
    }

    dispatch({ type: 'SUBMIT_START' })

    try {
      const supabase = createSupabaseClient()
      const credentials =
        state.identifierType === 'email'
          ? { email: state.identifier.trim(), password: state.password }
          : { phone: state.identifier.trim(), password: state.password }

      if (state.mode === 'signup') {
        // Must be set BEFORE calling signUp(): AuthProvider's onAuthStateChange
        // listener can fire (flipping isAuthenticated) before this await returns,
        // and the isAuthenticated effect above needs this flag committed first.
        dispatch({ type: 'PASSWORD_SIGNUP_PENDING' })
        const { data, error } = await supabase.auth.signUp(credentials)

        if (error) {
          dispatch({ type: 'SUBMIT_ERROR', payload: classifyPasswordSignUpError(error.message) })
          return
        }

        // Supabase's email-enumeration protection: signUp() for an already-registered,
        // confirmed identifier resolves with no error and no session. Surface an error
        // instead of leaving the submit button stuck in a loading state indefinitely.
        if (!data.session) {
          dispatch({ type: 'SUBMIT_ERROR', payload: 'auth.password.signUpUnavailable' })
          return
        }

        dispatch({ type: 'SUBMIT_SUCCESS' })
        // Consent write + redirect handled reactively via the isAuthenticated effect above.
      } else {
        const { error } = await supabase.auth.signInWithPassword(credentials)

        if (error) {
          dispatch({ type: 'SUBMIT_ERROR', payload: classifyPasswordSignInError(error.message) })
          return
        }

        dispatch({ type: 'SUBMIT_SUCCESS' })
        // Navigation (incl. pendingDeletion guard) handled reactively via the effect above.
      }
    } catch {
      dispatch({
        type: 'SUBMIT_ERROR',
        payload: state.mode === 'signup' ? 'auth.password.signUpError' : 'auth.password.signInError',
      })
    }
  }

  function handleBlur() {
    if (state.hasAttemptedSubmit) {
      const errorKey = validateIdentifier(state.identifier, state.identifierType)
      if (errorKey) dispatch({ type: 'SUBMIT_ERROR', payload: errorKey })
    }
  }

  function handlePasswordBlur() {
    if (state.hasAttemptedSubmit) {
      const errorKey = validatePassword(state.password, state.mode)
      if (errorKey) dispatch({ type: 'SUBMIT_ERROR', payload: errorKey })
    }
  }

  const inputHint =
    state.identifierType === 'email'
      ? t('auth.otp.emailInputHint')
      : t('auth.otp.phoneInputHint')

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {state.mode === 'signup'
          ? t('auth.welcomeSignup', { appName: t('common.appName') })
          : t('auth.welcomeSignin')}
      </Text>

      <View style={styles.identifierTypeSwitch}>
        <TouchableOpacity
          style={[styles.identifierPill, state.identifierType === 'email' && styles.identifierPillActive]}
          onPress={() => { if (!isAuthMethodOrModeLocked) dispatch({ type: 'SET_IDENTIFIER_TYPE', payload: 'email' }) }}
          accessibilityRole="tab"
          accessibilityLabel={t('auth.otp.emailLabel')}
          accessibilityState={{ selected: state.identifierType === 'email', disabled: isAuthMethodOrModeLocked }}
        >
          <Text style={[styles.identifierPillText, state.identifierType === 'email' && styles.identifierPillTextActive]}>
            {t('auth.identifierType.emailShort')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.identifierPill, state.identifierType === 'phone' && styles.identifierPillActive]}
          onPress={() => { if (!isAuthMethodOrModeLocked) dispatch({ type: 'SET_IDENTIFIER_TYPE', payload: 'phone' }) }}
          accessibilityRole="tab"
          accessibilityLabel={t('auth.otp.phoneLabel')}
          accessibilityState={{ selected: state.identifierType === 'phone', disabled: isAuthMethodOrModeLocked }}
        >
          <Text style={[styles.identifierPillText, state.identifierType === 'phone' && styles.identifierPillTextActive]}>
            {t('auth.identifierType.phoneShort')}
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles.input, isIdentifierFieldError ? styles.inputError : null]}
        value={state.identifier}
        onChangeText={text => dispatch({ type: 'SET_IDENTIFIER', payload: text })}
        onBlur={handleBlur}
        placeholder={
          state.identifierType === 'email'
            ? t('auth.identifierType.emailPlaceholder')
            : t('auth.identifierType.phonePlaceholder')
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

      {state.authMethod === 'password' ? (
        <>
          <Text style={styles.fieldLabel}>{t('auth.password.label')}</Text>
          <View style={[styles.passwordRow, isPasswordFieldError ? styles.inputError : null]}>
            <TextInput
              style={styles.passwordInput}
              value={state.password}
              onChangeText={text => dispatch({ type: 'SET_PASSWORD', payload: text })}
              onBlur={handlePasswordBlur}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!state.isLoading}
              accessibilityLabel={t('auth.password.label')}
              accessibilityHint={t('auth.password.hint')}
            />
            <TouchableOpacity
              onPress={() => { if (!isAuthMethodOrModeLocked) dispatch({ type: 'SET_AUTH_METHOD', payload: 'otp' }) }}
              accessibilityRole="button"
              accessibilityLabel={t('auth.authMethod.switchToOtp')}
              accessibilityHint={t('auth.authMethod.switchToOtpHint')}
              accessibilityState={{ disabled: isAuthMethodOrModeLocked }}
            >
              <Text style={styles.inlineLink}>{t('auth.authMethod.useCodeInstead')}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.authMethodSwitchRow}>
          <TouchableOpacity
            onPress={() => { if (!isAuthMethodOrModeLocked) dispatch({ type: 'SET_AUTH_METHOD', payload: 'password' }) }}
            accessibilityRole="button"
            accessibilityLabel={t('auth.authMethod.switchToPassword')}
            accessibilityHint={t('auth.authMethod.switchToPasswordHint')}
            accessibilityState={{ disabled: isAuthMethodOrModeLocked }}
          >
            <Text style={styles.inlineLink}>{t('auth.authMethod.usePasswordInstead')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {state.mode === 'signup' && (
        <SafetyCheckboxes
          ageConfirmed={state.ageConfirmed}
          medicoLegalConfirmed={state.medicoLegalConfirmed}
          onToggleAge={() => dispatch({ type: 'TOGGLE_AGE' })}
          onToggleMedicoLegal={() => dispatch({ type: 'TOGGLE_MEDICO_LEGAL' })}
        />
      )}

      {state.errorKey ? (
        <Text
          // eslint-disable-next-line i18next/no-literal-string
          accessibilityLiveRegion="polite"
          style={styles.errorText}
        >{t(
          state.errorKey,
          state.errorKey === 'auth.deletion.accountPendingDeletion' ? { dpoEmail: DPO_EMAIL } : undefined
        )}</Text>
      ) : null}

      {state.consentError ? (
        <Text
          // eslint-disable-next-line i18next/no-literal-string
          accessibilityLiveRegion="polite"
          style={styles.errorText}
        >{t(state.consentError)}</Text>
      ) : null}

      <View style={styles.spacer} />

      <TouchableOpacity
        style={[styles.button, isSubmitDisabled && styles.buttonDisabled]}
        onPress={state.authMethod === 'otp' ? handleSendCode : handlePasswordSubmit}
        disabled={isSubmitDisabled}
        accessibilityLabel={
          state.authMethod === 'otp'
            ? t('auth.otp.sendCode')
            : t(state.mode === 'signup' ? 'auth.password.submitSignUp' : 'auth.password.submitSignIn')
        }
        accessibilityHint={
          state.authMethod === 'otp' ? t('auth.otp.sendCodeHint') : t('auth.password.submitHint')
        }
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>
          {state.authMethod === 'otp'
            ? t('auth.otp.sendCode')
            : t(state.mode === 'signup' ? 'auth.password.submitSignUp' : 'auth.password.submitSignIn')}
        </Text>
        {/* Decorative, language-agnostic glyph — not user-facing copy that needs translation */}
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <Text style={styles.buttonArrow}>→</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.modeSwitchRow}
        onPress={() => {
          if (!isAuthMethodOrModeLocked) dispatch({ type: 'SET_MODE', payload: state.mode === 'signup' ? 'signin' : 'signup' })
        }}
        accessibilityRole="button"
        accessibilityLabel={state.mode === 'signup' ? t('auth.mode.signIn') : t('auth.mode.createAccount')}
        accessibilityHint={state.mode === 'signup' ? t('auth.modeSwitch.toSignInHint') : t('auth.modeSwitch.toSignUpHint')}
        accessibilityState={{ disabled: isAuthMethodOrModeLocked }}
      >
        <Text style={styles.modeSwitchText}>
          {state.mode === 'signup' ? t('auth.modeSwitch.alreadyHaveAccount') : t('auth.modeSwitch.newHere')}{' '}
          <Text style={styles.modeSwitchLink}>
            {state.mode === 'signup' ? t('auth.mode.signIn') : t('auth.mode.createAccount')}
          </Text>
        </Text>
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

      {(__DEV__ || process.env.EXPO_PUBLIC_APP_VARIANT === 'preview') &&
      isLocalSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL) ? (
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: '#6b7280', marginTop: 8 },
            state.isLoading && styles.buttonDisabled,
          ]}
          disabled={state.isLoading}
          onPress={async () => {
            // Fixed one-tap test credentials — kept alongside the general password form
            // above as a faster dev/preview shortcut (Story 10.1 Task 5). Always signs
            // in to a pre-existing, already-consented account, so it must never set
            // isPasswordSignupPending, and is subject to the same pendingDeletion guard
            // as any other isAuthenticated transition above (not bypassed).
            dispatch({ type: 'SUBMIT_START' })
            const { error } = await createSupabaseClient().auth.signInWithPassword({
              // eslint-disable-next-line i18next/no-literal-string
              email: 'test1@test.com',
              // eslint-disable-next-line i18next/no-literal-string
              password: 'DevTest123!',
            })
            if (error) dispatch({ type: 'SUBMIT_ERROR', payload: 'auth.password.signInError' })
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
    paddingHorizontal: 28,
    paddingTop: 44,
    paddingBottom: 28,
    // #FDFBF7 has no equivalent in packages/ui's 8 semantic tokens (closest is
    // color.surface.primary #F5F7F6) — kept as a documented raw hex, same precedent
    // as Story 12.2's completed-card border.
    backgroundColor: '#FDFBF7',
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: color.content.primary,
    marginBottom: spacing[8],
  },
  identifierTypeSwitch: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: color.surface.secondary,
    borderRadius: 24,
    padding: 4,
    marginBottom: spacing[7],
  },
  identifierPill: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
  },
  identifierPillActive: {
    backgroundColor: color.accent.courage,
  },
  identifierPillText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: color.content.secondary,
  },
  identifierPillTextActive: {
    color: '#ffffff',
  },
  input: {
    alignSelf: 'stretch',
    borderBottomWidth: 1.5,
    borderBottomColor: color.content.primary,
    paddingBottom: 10,
    fontSize: 18,
    color: color.content.primary,
    backgroundColor: 'transparent',
    marginBottom: spacing[7],
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    color: color.content.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing[1] + 2,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomColor: color.content.primary,
    paddingBottom: 10,
    marginBottom: spacing[8],
  },
  passwordInput: {
    flex: 1,
    fontSize: 18,
    color: color.content.primary,
    backgroundColor: 'transparent',
    padding: 0,
  },
  authMethodSwitchRow: {
    alignSelf: 'flex-end',
    marginBottom: spacing[8],
  },
  inlineLink: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    color: color.accent.courage,
  },
  inputError: {
    borderBottomColor: '#ef4444',
  },
  errorText: {
    alignSelf: 'stretch',
    fontSize: 13,
    color: '#ef4444',
    marginBottom: spacing[3],
  },
  spacer: { flex: 1 },
  button: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: color.accent.courage,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: spacing[6],
    marginBottom: spacing[5],
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  buttonArrow: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  modeSwitchRow: {
    alignSelf: 'center',
  },
  modeSwitchText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    // #9AAEA7 (muted footer-link colour) has no equivalent in packages/ui's 8 semantic
    // tokens — kept as a documented raw hex, same precedent as the screen background above.
    color: '#9AAEA7',
    textAlign: 'center',
  },
  modeSwitchLink: {
    color: color.accent.courage,
    fontWeight: '600',
  },
  privacyLink: {
    marginTop: spacing[3] + 2,
    alignSelf: 'center',
  },
  privacyLinkText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    // #9AAEA7 — same documented token gap as modeSwitchText above
    color: '#9AAEA7',
    textDecorationLine: 'underline',
  },
})
