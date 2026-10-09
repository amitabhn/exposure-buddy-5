// Story 19.5 Gate spike. DEV-ONLY: renders nothing in release builds.
// Remove (with its Implementation Notes entry) once the Gate result is recorded
// and SudsSlider has replaced it. Hardcoded English on purpose; not shipped copy.
/* eslint-disable i18next/no-literal-string */
import React, { useState } from 'react'
import { AccessibilityInfo, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Slider from '@react-native-community/slider'

const THUMB = 44

function SpikeSlider({ label }: { label: string }): React.ReactElement {
  const [value, setValue] = useState<number | null>(null)
  const [width, setWidth] = useState(0)
  const shown = value ?? 5
  const set = (v: number) => setValue(Math.max(0, Math.min(10, Math.round(v))))
  // The − / + buttons keep screen-reader focus on themselves, so the new rating must be spoken
  // explicitly. The slider's own adjust action needs no call: its accessibilityValue is re-read.
  const step = (v: number) => {
    set(v)
    AccessibilityInfo.announceForAccessibility(`${Math.max(0, Math.min(10, v))} out of 10`)
  }

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.readout}>{value === null ? '-' : String(value)}</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.step, (value ?? 5) <= 0 && styles.disabled]}
          disabled={value !== null && value <= 0}
          onPress={() => step(value === null ? 5 : value - 1)}
          accessibilityRole="button"
          accessibilityLabel="Decrease"
        >
          <Text style={styles.stepText}>-</Text>
        </Pressable>
        <View
          style={styles.track}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Distress rating"
          accessibilityValue={{ min: 0, max: 10, now: shown, text: value === null ? 'Not set' : `${value} out of 10` }}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'increment') set(value === null ? 5 : value + 1)
            if (e.nativeEvent.actionName === 'decrement') set(value === null ? 5 : value - 1)
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ height: THUMB }}
          >
            <Slider
              style={{ height: THUMB, width: '100%' }}
              minimumValue={0}
              maximumValue={10}
              step={1}
              value={shown}
              minimumTrackTintColor={value === null ? '#9ca3af' : '#111827'}
              maximumTrackTintColor="#d1d5db"
              thumbTintColor={value === null ? '#9ca3af' : '#111827'}
              onValueChange={set}
              onSlidingComplete={set}
            />
          </View>
          {/* Ticks: inset by half a thumb on each side, which is the native travel on both platforms (verify on device). */}
          <View style={[styles.ticks, { width }]} pointerEvents="none">
            {Array.from({ length: 11 }, (_, i) => (
              <View key={i} style={styles.tick} />
            ))}
          </View>
        </View>
        <Pressable
          style={[styles.step, value === 10 && styles.disabled]}
          disabled={value === 10}
          onPress={() => step(value === null ? 5 : value + 1)}
          accessibilityRole="button"
          accessibilityLabel="Increase"
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  )
}

const FILLER = Array.from({ length: 12 }, (_, i) => i)

export default function SpikeSliderScreen(): React.ReactElement | null {
  const [modal, setModal] = useState<'none' | 'full' | 'sheet'>('none')
  if (!__DEV__) return null

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Slider spike ({Platform.OS})</Text>
      <SpikeSlider label="Inline" />
      <Pressable style={styles.btn} onPress={() => setModal('full')}>
        <Text style={styles.btnText}>Open Modal + tall ScrollView</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={() => setModal('sheet')}>
        <Text style={styles.btnText}>Open pageSheet Modal (iOS dismiss check)</Text>
      </Pressable>

      <Modal
        visible={modal !== 'none'}
        transparent={modal === 'full'}
        animationType="slide"
        presentationStyle={modal === 'sheet' ? 'pageSheet' : undefined}
        onRequestClose={() => setModal('none')}
      >
        <View style={modal === 'full' ? styles.backdrop : styles.sheet}>
          <View style={modal === 'full' ? styles.card : styles.sheetBody}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {FILLER.map((i) => (
                <Text key={i} style={styles.filler}>Filler line {i + 1} (content must overflow the viewport)</Text>
              ))}
              <SpikeSlider label="In Modal ScrollView" />
              {FILLER.map((i) => (
                <Text key={`b${i}`} style={styles.filler}>More filler {i + 1}</Text>
              ))}
              <Pressable style={styles.btn} onPress={() => setModal('none')}>
                <Text style={styles.btnText}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 64, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  block: { marginVertical: 16 },
  label: { fontSize: 14, color: '#6b7280' },
  readout: { fontSize: 32, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 24 },
  disabled: { opacity: 0.35 },
  track: { flex: 1, justifyContent: 'center' },
  ticks: { position: 'absolute', left: 0, top: THUMB / 2 + 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: THUMB / 2 },
  tick: { width: 2, height: 8, backgroundColor: '#6b7280' },
  btn: { padding: 14, borderRadius: 8, backgroundColor: '#111827', marginVertical: 8 },
  btnText: { color: '#fff', textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '80%' },
  sheet: { flex: 1, backgroundColor: '#fff' },
  sheetBody: { flex: 1 },
  filler: { fontSize: 16, paddingVertical: 10 },
})
