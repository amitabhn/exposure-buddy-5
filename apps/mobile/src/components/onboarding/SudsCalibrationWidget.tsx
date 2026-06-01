import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { AccessiblePressable } from '@exposure-buddy/ui'

interface SudsCalibrationWidgetProps {
  value: number | null
  onChange: (v: number) => void
}

export function SudsCalibrationWidget({ value, onChange }: SudsCalibrationWidgetProps) {
  const { t } = useTranslation()

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('onboarding.assessment.calibrationLabel')}
    >
      <View style={styles.row}>
        {Array.from({ length: 11 }, (_, i) => (
          <AccessiblePressable
            key={i}
            onPress={() => onChange(i)}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === i }}
            accessibilityLabel={`${i} out of 10`}
            style={[styles.target, value === i && styles.targetSelected]}
          >
            <Text style={[styles.targetText, value === i && styles.targetTextSelected]}>
              {i}
            </Text>
          </AccessiblePressable>
        ))}
      </View>
      <View style={styles.anchors}>
        <Text style={styles.anchor}>{t('onboarding.assessment.sudsAnchor0')}</Text>
        <Text style={styles.anchor}>{t('onboarding.assessment.sudsAnchor5')}</Text>
        <Text style={styles.anchor}>{t('onboarding.assessment.sudsAnchor10')}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  target: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  targetSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  targetText: { fontSize: 13, color: '#374151' },
  targetTextSelected: { color: '#ffffff', fontWeight: '600' },
  anchors: { flexDirection: 'row', justifyContent: 'space-between' },
  anchor: { fontSize: 11, color: '#6b7280' },
})
