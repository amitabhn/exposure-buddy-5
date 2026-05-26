import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'

interface DeleteAccountModalProps {
  visible: boolean
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}

// eslint-disable-next-line i18next/no-literal-string
const DPO_EMAIL = 'privacy@exposure-buddy.com'
// eslint-disable-next-line i18next/no-literal-string
const ANIMATION_TYPE = 'fade' as const

export function DeleteAccountModal({ visible, onConfirm, onCancel, isLoading }: DeleteAccountModalProps) {
  const { t } = useTranslation()

  return (
    <Modal visible={visible} transparent animationType={ANIMATION_TYPE} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{t('settings.deletion.dialogTitle')}</Text>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.bodyText}>{t('settings.deletion.whatHappens')}</Text>
            <Text style={styles.bodyText}>{t('settings.deletion.whatRetained')}</Text>
            <Text style={styles.bodyText}>{t('settings.deletion.windowMeaning')}</Text>
            <Text style={styles.bodyText}>{t('settings.deletion.dpoContact', { dpoEmail: DPO_EMAIL })}</Text>
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={t('settings.deletion.cancelButton')}
            >
              <Text style={styles.cancelText}>{t('settings.deletion.cancelButton')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteButton, isLoading && styles.deleteButtonDisabled]}
              onPress={onConfirm}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={t('settings.deletion.confirmButton')}
            >
              <Text style={styles.deleteText}>{t('settings.deletion.confirmButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  body: {
    marginBottom: 24,
  },
  bodyText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
})
