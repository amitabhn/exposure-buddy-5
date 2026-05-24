import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'

type Props = {
  ageConfirmed: boolean
  medicoLegalConfirmed: boolean
  onToggleAge: () => void
  onToggleMedicoLegal: () => void
}

export function SafetyCheckboxes({ ageConfirmed, medicoLegalConfirmed, onToggleAge, onToggleMedicoLegal }: Props) {
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>{t('auth.safety.consentIntro')}</Text>

      <TouchableOpacity
        style={styles.row}
        onPress={onToggleAge}
        accessibilityRole="checkbox"
        accessibilityLabel={t('auth.safety.ageConfirmation')}
        accessibilityState={{ checked: ageConfirmed }}
      >
        <View style={[styles.box, ageConfirmed && styles.boxChecked]}>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          {ageConfirmed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.label} accessible={false}>{t('auth.safety.ageConfirmation')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        onPress={onToggleMedicoLegal}
        accessibilityRole="checkbox"
        accessibilityLabel={t('auth.safety.medicoLegalDisclaimer')}
        accessibilityState={{ checked: medicoLegalConfirmed }}
      >
        <View style={[styles.box, medicoLegalConfirmed && styles.boxChecked]}>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          {medicoLegalConfirmed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.label} accessible={false}>{t('auth.safety.medicoLegalDisclaimer')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  intro: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44,
    marginBottom: 8,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
    flexShrink: 0,
  },
  boxChecked: {
    backgroundColor: '#2D6A5A',
    borderColor: '#2D6A5A',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
})
