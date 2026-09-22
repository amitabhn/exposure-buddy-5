import { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Application from 'expo-application'
import { useAuth } from '@exposure-buddy/supabase'
import { color } from '@exposure-buddy/ui'
import { DeleteAccountModal } from '../../../src/components/settings/DeleteAccountModal'
import { formatTimeForDisplay } from '../../../src/notifications/sessionReminder'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
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

  // expo-dev-client always provides real native values on dev/preview/production EAS builds;
  // only bare `expo start` under plain Expo Go can leave these null, which is not a
  // supported way to run this app — rendered as-is rather than special-cased.
  const appVariant = process.env.EXPO_PUBLIC_APP_VARIANT
  // Guard against unset/empty (e.g. local `expo start`, which sets no EXPO_PUBLIC_APP_VARIANT)
  // as well as 'production' — otherwise the suffix would render with an undefined variant name.
  const showVariant = Boolean(appVariant) && appVariant !== 'production'
  const variantSuffix = showVariant ? t('settings.about.variantSuffix', { variant: appVariant }) : ''
  const versionText =
    t('settings.about.versionLabel', {
      version: Application.nativeApplicationVersion,
      build: Application.nativeBuildVersion,
    }) + variantSuffix
  // The accessibility label uses its own comma-joined clause rather than reusing the
  // visual "·"-punctuated variantSuffix, so screen readers get spoken-language phrasing
  // distinct from the on-screen text (not just a spliced-in visual separator).
  const variantClause = showVariant ? `, ${appVariant}` : ''
  const versionAccessibilityLabel = t('settings.about.versionAccessibilityLabel', {
    version: Application.nativeApplicationVersion,
    build: Application.nativeBuildVersion,
    variantClause,
  })

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}>
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

      {actionError ? (
        <Text
          // eslint-disable-next-line i18next/no-literal-string
          accessibilityLiveRegion="polite"
          style={styles.errorText}
        >{actionError}</Text>
      ) : null}

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

      <View style={styles.row}>
        <Text style={styles.rowText} accessibilityLabel={versionAccessibilityLabel}>
          {versionText}
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  // Story 9.3 max-font-size walkthrough: at large text sizes this screen's rows no longer
  // fit in the viewport — without scrolling, "Delete my account" became completely
  // unreachable. flexGrow (not flex) on the ScrollView's content container.
  container: {
    flexGrow: 1,
    backgroundColor: color.surface.primary,
    paddingHorizontal: 24,
  },
  // paddingRight reserves space for the Calm Me FAB — see (app)/index.tsx's greeting style
  // for the same Story 9.3 max-font-size walkthrough finding.
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: color.content.primary,
    marginBottom: 32,
    paddingRight: 88,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: color.content.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.surface.secondary,
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    rowGap: 4,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowText: {
    fontSize: 16,
    color: color.content.primary,
  },
  rowValueText: {
    fontSize: 16,
    color: color.content.secondary,
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
