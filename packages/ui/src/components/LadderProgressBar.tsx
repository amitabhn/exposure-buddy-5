import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { color, radius, spacing, typography } from '../tokens/theme'

export interface LadderProgressBarProps {
  completed: number
  total: number
  label: string // pre-translated section label (e.g. "Your ladder") — packages/ui has no react-i18next dependency
  progressLabel: string // pre-translated, pre-formatted fraction text (e.g. "5 of 12 steps climbed")
}

export function LadderProgressBar({ completed, total, label, progressLabel }: LadderProgressBarProps) {
  const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((completed / total) * 100))) : 0
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.progressLabel}>{progressLabel}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: spacing[5] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing[1] + 2 },
  label: {
    ...typography.caption,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: color.content.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progressLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.accent.courage },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: color.surface.secondary, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.accent.courage, borderRadius: radius.pill },
})
