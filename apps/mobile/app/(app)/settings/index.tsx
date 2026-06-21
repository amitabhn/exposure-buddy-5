import { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { DeleteAccountModal } from '../../../src/components/settings/DeleteAccountModal'
import { formatTimeForDisplay } from '../../../src/notifications/sessionReminder'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { signOut, requestAccountDeletion, getReminderTime, getReminderEnabled } = useAuth()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState<string | null>(null)

  // Re-reads the saved reminder state whenever this screen regains focus (e.g. returning
  // from reminder-settings.tsx after Save) — getReminderEnabled/getReminderTime aren't reactive.
  useFocusEffect(
    useCallback(() => {
      setReminderEnabled(getReminderEnabled())
      setReminderTime(getReminderTime())
    }, [getReminderEnabled, getReminderTime]),
  )

  // useFocusEffect only re-fires on a genuine navigation-focus transition, not when these
  // getters' identity changes — AuthProvider recreates them on every render and
  // authState.userId hydrates asynchronously after mount, so the very first focus can
  // fire before MMKV/userId are ready. This catches that case once AuthProvider settles.
  useEffect(() => {
    setReminderEnabled(getReminderEnabled())
    setReminderTime(getReminderTime())
  }, [getReminderEnabled, getReminderTime])

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

  const reminderValue =
    reminderEnabled && reminderTime
      ? formatTimeForDisplay(reminderTime, t('settings.reminders.am'), t('settings.reminders.pm'))
      : t('settings.reminders.disabledValue')

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.title')}</Text>

      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push('/reminder-settings')}
        accessibilityRole="link"
        accessibilityLabel={`${t('settings.reminders.rowLabel')} ${reminderValue}`}
      >
        <View style={styles.rowBetween}>
          <Text style={styles.rowText}>{t('settings.reminders.rowLabel')}</Text>
          <Text style={styles.rowValueText}>{reminderValue}</Text>
        </View>
      </TouchableOpacity>

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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowText: {
    fontSize: 16,
    color: '#111827',
  },
  rowValueText: {
    fontSize: 16,
    color: '#6b7280',
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
