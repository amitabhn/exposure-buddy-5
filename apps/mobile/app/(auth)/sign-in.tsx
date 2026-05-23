import { useReducer } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { createSupabaseClient } from '@exposure-buddy/supabase'

type IdentifierType = 'email' | 'phone'

type State = {
  identifier: string
  identifierType: IdentifierType
  isLoading: boolean
  errorKey: string | null
  hasAttemptedSubmit: boolean
}

type Action =
  | { type: 'SET_IDENTIFIER'; payload: string }
  | { type: 'SET_IDENTIFIER_TYPE'; payload: IdentifierType }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'CLEAR_ERROR' }

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
}

export default function SignInScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  async function handleSendCode() {
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
        params: { identifier: state.identifier, identifierType: state.identifierType },
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
    <View style={styles.container}>
      <Text style={styles.title}>{t('common.appName')}</Text>
      <Text style={styles.subtitle}>{t('auth.otp.sendCode')}</Text>

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

      {state.errorKey ? <Text style={styles.errorText}>{t(state.errorKey)}</Text> : null}

      <TouchableOpacity
        style={[styles.button, state.isLoading && styles.buttonDisabled]}
        onPress={handleSendCode}
        disabled={state.isLoading}
        accessibilityLabel={t('auth.otp.sendCode')}
        accessibilityHint={t('auth.otp.sendCodeHint')}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{t('auth.otp.sendCode')}</Text>
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
})
