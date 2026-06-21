import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, AppState, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Notifications from 'expo-notifications'
import { useAuth } from '@exposure-buddy/supabase'
import { DeleteAccountModal } from '../../../src/components/settings/DeleteAccountModal'
import { usePushRegistrationContext } from '../../../src/contexts/PushRegistrationContext'

type ReminderPermissionState = 'not-yet-requested' | 'enabled' | 'disabled'

// Internal state-machine identifiers, not user-facing text — the displayed labels are
// looked up via t() calls below.
const REMINDER_STATE_I18N_KEY: Record<ReminderPermissionState, string> = {
  // eslint-disable-next-line i18next/no-literal-string
  'not-yet-requested': 'notYetRequested',
  // eslint-disable-next-line i18next/no-literal-string
  enabled: 'enabled',
  // eslint-disable-next-line i18next/no-literal-string
  disabled: 'disabled',
}

function derivePermissionState(status: string | undefined): ReminderPermissionState {
  // eslint-disable-next-line i18next/no-literal-string
  if (status === 'granted') return 'enabled'
  // eslint-disable-next-line i18next/no-literal-string
  if (status === 'denied') return 'disabled'
  // eslint-disable-next-line i18next/no-literal-string
  if (status === 'undetermined') return 'not-yet-requested'
  // Unexpected status (or none) — treat as not-yet-requested and surface for diagnosis,
  // but never crash the Settings screen (AC7).
  if (status !== undefined) {
    console.warn('[SettingsScreen] unexpected push permission status:', status)
  }
  // eslint-disable-next-line i18next/no-literal-string
  return 'not-yet-requested'
}

export default function SettingsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { signOut, requestAccountDeletion } = useAuth()
  const { registerNow } = usePushRegistrationContext()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  // eslint-disable-next-line i18next/no-literal-string
  const [reminderState, setReminderState] = useState<ReminderPermissionState>('not-yet-requested')

  const refreshReminderState = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync()
      setReminderState(derivePermissionState(status))
    } catch (err) {
      console.warn('[SettingsScreen] getPermissionsAsync threw:', err)
      // eslint-disable-next-line i18next/no-literal-string
      setReminderState('not-yet-requested')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      await refreshReminderState()
      if (cancelled) return
    }
    run()
    return () => {
      cancelled = true
    }
  }, [refreshReminderState])

  useEffect(() => {
    // Re-evaluates permission state on foreground — covers both the app-switcher return
    // path and the Linking.openSettings() deep-link return path (Task 5.4); no separate
    // handler needed for the latter since both resolve through the same 'active' event.
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refreshReminderState()
    })
    return () => sub.remove()
  }, [refreshReminderState])

  const isHandlingReminderPressRef = useRef(false)

  async function handleReminderPress() {
    if (isHandlingReminderPressRef.current) return
    isHandlingReminderPressRef.current = true
    try {
      if (reminderState === 'disabled') {
        Linking.openSettings()
        return
      }
      if (reminderState === 'not-yet-requested') {
        const { status } = await Notifications.requestPermissionsAsync()
        setReminderState(derivePermissionState(status))
        if (status === 'granted') {
          await registerNow()
        }
      }
    } finally {
      isHandlingReminderPressRef.current = false
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true)
    setActionError(null)
    try {
      await signOut()
    } catch {
      setActionError(t('settings.signOutError'))
    } finally {
      setIsSigningOut(false)
    }
  }

  async function handleConfirmDelete() {
    setIsDeletingAccount(true)
    setActionError(null)
    try {
      await requestAccountDeletion()
    } catch {
      setActionError(t('settings.deleteAccountError'))
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <TouchableOpacity
        style={[styles.row, isSigningOut && styles.rowDisabled]}
        onPress={handleSignOut}
        disabled={isSigningOut}
        accessibilityRole="button"
        accessibilityLabel={t('settings.signOut')}
      >
        <Text style={styles.rowText}>{t('settings.signOut')}</Text>
      </TouchableOpacity>

      {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

      <Text style={styles.sectionTitle}>{t('settings.reminders.title')}</Text>

      <TouchableOpacity
        style={styles.row}
        onPress={handleReminderPress}
        accessibilityRole="button"
        accessibilityLabel={t(`settings.reminders.${REMINDER_STATE_I18N_KEY[reminderState]}`)}
      >
        <Text style={styles.rowText}>{t(`settings.reminders.${REMINDER_STATE_I18N_KEY[reminderState]}`)}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push('/reminder-settings')}
        accessibilityRole="link"
        accessibilityLabel={t('settings.reminders.manageTime')}
      >
        <Text style={styles.rowText}>{t('settings.reminders.manageTime')}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('settings.privacy.title')}</Text>

      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push('/privacy-notice')}
        accessibilityRole="link"
        accessibilityLabel={t('settings.privacy.privacyNotice')}
        accessibilityHint={t('legal.privacyNotice.accessibilityHint')}
      >
        <Text style={styles.rowText}>{t('settings.privacy.privacyNotice')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.row, isDeletingAccount && styles.rowDisabled]}
        onPress={() => setShowDeleteModal(true)}
        disabled={isDeletingAccount}
        accessibilityRole="button"
        accessibilityLabel={t('settings.privacy.deleteAccount')}
      >
        <Text style={[styles.rowText, styles.destructiveText]}>{t('settings.privacy.deleteAccount')}</Text>
      </TouchableOpacity>

      <DeleteAccountModal
        visible={showDeleteModal}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isDeletingAccount}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowText: {
    fontSize: 16,
    color: '#111827',
  },
  destructiveText: {
    color: '#ef4444',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 8,
  },
})
