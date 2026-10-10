// i18n keys, accessibility action names and colours below are identifiers, not copy.
/* eslint-disable i18next/no-literal-string */
import React, { useState } from 'react'
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native'
import Slider from '@react-native-community/slider'
import { useTranslation } from 'react-i18next'

interface SudsSliderProps {
  /** `null` means unset: thumb parked at 5 in a muted tint, readout shows a dash. */
  value: number | null
  onChange: (v: number) => void
}

const MIN = 0
const MAX = 10
const UNSET_PARK = 5
const THUMB = 44
const STEP_BUTTON = 52
const TICK_COUNT = MAX - MIN + 1

const ACTIVE = '#111827'
const MUTED = '#9ca3af'

/** 0 No distress, 1–2 Very mild, 3–4 Mild, 5–6 Moderate, 7–8 High, 9 Very high, 10 Extreme distress. */
function wordKey(v: number): string {
  if (v <= 0) return 'onboarding.assessment.sudsAnchor0'
  if (v <= 2) return 'session.suds.wordVeryMild'
  if (v <= 4) return 'session.suds.wordMild'
  if (v <= 6) return 'onboarding.assessment.sudsAnchor5'
  if (v <= 8) return 'session.suds.wordHigh'
  if (v === 9) return 'session.suds.wordVeryHigh'
  return 'onboarding.assessment.sudsAnchor10'
}

function clamp(v: number): number {
  return Math.max(MIN, Math.min(MAX, Math.round(v)))
}

export function SudsSlider({ value, onChange }: SudsSliderProps): React.ReactElement {
  const { t } = useTranslation()
  const [trackWidth, setTrackWidth] = useState(0)
  const isUnset = value === null
  const shown = value ?? UNSET_PARK
  const tint = isUnset ? MUTED : ACTIVE

  const spoken = (v: number) => t('session.suds.valueText', { value: v, word: t(wordKey(v)) })

  // The − / + buttons keep screen-reader focus on themselves, so the new rating is spoken
  // explicitly. The slider's own adjust action needs no call: its accessibilityValue is re-read.
  const press = (delta: number) => {
    const next = isUnset ? UNSET_PARK : clamp(shown + delta)
    onChange(next)
    AccessibilityInfo.announceForAccessibility(spoken(next))
  }

  const adjust = (delta: number) => onChange(isUnset ? UNSET_PARK : clamp(shown + delta))

  return (
    <View>
      <View style={styles.row}>
        <Pressable
          style={[styles.stepButton, !isUnset && shown <= MIN && styles.stepDisabled]}
          disabled={!isUnset && shown <= MIN}
          onPress={() => press(-1)}
          accessibilityRole="button"
          accessibilityLabel={t('session.suds.decrease')}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>

        <View style={styles.readoutBlock}>
          <Text style={[styles.readoutNumber, isUnset && styles.readoutMuted]}>
            {isUnset ? '-' : String(value)}
          </Text>
          <Text style={styles.readoutWord}>{isUnset ? t('session.suds.dragHint') : t(wordKey(shown))}</Text>
        </View>

        <Pressable
          style={[styles.stepButton, !isUnset && shown >= MAX && styles.stepDisabled]}
          disabled={!isUnset && shown >= MAX}
          onPress={() => press(1)}
          accessibilityRole="button"
          accessibilityLabel={t('session.suds.increase')}
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>

      <View
        style={styles.track}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('session.suds.label')}
        accessibilityValue={{
          min: MIN,
          max: MAX,
          ...(isUnset ? {} : { now: shown }),
          text: isUnset ? t('session.suds.notSet') : spoken(shown),
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') adjust(1)
          if (e.nativeEvent.actionName === 'decrement') adjust(-1)
        }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ height: THUMB }}
        >
          <Slider
            style={{ height: THUMB, width: '100%' }}
            minimumValue={MIN}
            maximumValue={MAX}
            step={1}
            value={shown}
            minimumTrackTintColor={tint}
            maximumTrackTintColor="#d1d5db"
            thumbTintColor={tint}
            // A native slider does not fire onValueChange when the value is unchanged, so a
            // grab-and-release of the parked thumb is reported by onSlidingComplete.
            onValueChange={(v) => onChange(clamp(v))}
            onSlidingComplete={(v) => onChange(clamp(v))}
          />
        </View>
        {/* Ticks inset by half a thumb on each side: the native thumb travel on both platforms. */}
        <View style={[styles.ticks, { width: trackWidth }]} pointerEvents="none">
          {Array.from({ length: TICK_COUNT }, (_, i) => (
            <View key={i} style={styles.tick} />
          ))}
        </View>
      </View>

      <View style={styles.legend}>
        <Text style={[styles.legendLabel, styles.legendStart]}>{t('onboarding.assessment.sudsAnchor0')}</Text>
        <Text style={[styles.legendLabel, styles.legendMiddle]}>{t('onboarding.assessment.sudsAnchor5')}</Text>
        <Text style={[styles.legendLabel, styles.legendEnd]}>{t('onboarding.assessment.sudsAnchor10')}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  readoutBlock: { flex: 1, alignItems: 'center' },
  readoutNumber: { fontSize: 36, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: ACTIVE },
  readoutMuted: { color: MUTED },
  readoutWord: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stepButton: {
    width: STEP_BUTTON,
    height: STEP_BUTTON,
    borderRadius: STEP_BUTTON / 2,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.35 },
  stepText: { fontSize: 26, color: ACTIVE },
  track: { marginTop: 8, justifyContent: 'center' },
  ticks: {
    position: 'absolute',
    left: 0,
    top: THUMB / 2 + 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: THUMB / 2,
  },
  tick: { width: 2, height: 8, backgroundColor: '#6b7280' },
  legend: { flexDirection: 'row', gap: 16, paddingHorizontal: 8, marginTop: 4 },
  legendLabel: { flex: 1, fontSize: 12, color: '#6b7280' },
  legendStart: { textAlign: 'left' },
  legendMiddle: { textAlign: 'center' },
  legendEnd: { textAlign: 'right' },
})
