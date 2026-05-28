import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@exposure-buddy/supabase'
import { DeleteAccountModal } from '../../../src/components/settings/DeleteAccountModal'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const { signOut, requestAccountDeletion } = useAuth()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

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
