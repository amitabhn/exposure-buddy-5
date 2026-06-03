import { useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { detectCrisisKeywords } from '@exposure-buddy/core'
import { SudsCalibrationWidget } from './SudsCalibrationWidget'

interface FearItemFormProps {
  onSave: (description: string, predictedSuds: number) => void
  onCrisisDetected: () => void
}

export function FearItemForm({ onSave, onCrisisDetected }: FearItemFormProps) {
  const { t } = useTranslation()
  const [description, setDescription] = useState('')
  const [predictedSuds, setPredictedSuds] = useState<number | null>(null)
  const crisisCalledRef = useRef(false)

  function handleDescriptionChange(text: string) {
    setDescription(text)
    if (!crisisCalledRef.current && detectCrisisKeywords(text)) {
      crisisCalledRef.current = true
      onCrisisDetected()
    }
  }

  function handleSave() {
    if (!description.trim() || predictedSuds === null) return
    onSave(description.trim(), predictedSuds)
    setDescription('')
    setPredictedSuds(null)
    crisisCalledRef.current = false
  }

  const canSave = description.trim().length > 0 && predictedSuds !== null

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('onboarding.fearLadder.descriptionLabel')}</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={handleDescriptionChange}
        placeholder={t('onboarding.fearLadder.descriptionPlaceholder')}
        maxLength={200}
        multiline
        accessibilityLabel={t('onboarding.fearLadder.descriptionLabel')}
      />

      <Text style={styles.label}>{t('onboarding.fearLadder.predictedSudsLabel')}</Text>
      <SudsCalibrationWidget value={predictedSuds} onChange={setPredictedSuds} />

      <TouchableOpacity
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.fearLadder.addCta')}
        accessibilityState={{ disabled: !canSave }}
      >
        <Text style={styles.saveButtonText}>{t('onboarding.fearLadder.addCta')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  label: { fontSize: 14, color: '#374151', fontWeight: '500', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  saveButton: {
    alignSelf: 'stretch',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: { backgroundColor: '#d1d5db' },
  saveButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
})
