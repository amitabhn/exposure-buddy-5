import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'

interface SudsScaleProps {
  value: number | null
  onChange: (v: number) => void
}

const ANCHOR_KEYS: Record<number, string> = {
  0: 'session.suds.anchor0',
  2: 'session.suds.anchor2',
  4: 'session.suds.anchor4',
  6: 'session.suds.anchor6',
  8: 'session.suds.anchor8',
  10: 'session.suds.anchor10',
}

export function SudsScale({ value, onChange }: SudsScaleProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      {Array.from({ length: 11 }, (_, i) => i).map((v) => {
        const isSelected = value === v
        const anchorKey = ANCHOR_KEYS[v]
        return (
          <TouchableOpacity
            key={v}
            style={[styles.button, isSelected && styles.buttonSelected]}
            onPress={() => onChange(v)}
            accessibilityRole="button"
            accessibilityLabel={anchorKey ? t(anchorKey) : String(v)}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.number, isSelected && styles.numberSelected]}>{v}</Text>
            {anchorKey && (
              <Text style={[styles.anchor, isSelected && styles.anchorSelected]} numberOfLines={2}>
                {t(anchorKey).replace(/^\d+ — /, '')}
              </Text>
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  button: {
    width: 56,
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  buttonSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  number: { fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#111827' },
  numberSelected: { color: '#ffffff' },
  anchor: { fontSize: 9, color: '#6b7280', textAlign: 'center', marginTop: 2, lineHeight: 12 },
  anchorSelected: { color: '#d1d5db' },
})
