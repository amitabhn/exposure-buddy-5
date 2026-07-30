import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { FearLadderItemSummary } from '@exposure-buddy/core'
import { color, radius, spacing, typography } from '../tokens/theme'

export interface CourageLadderEntryCardProps {
  lowestPendingItem: FearLadderItemSummary | null
  onPress: () => void
  accessibilityLabel: string
  nextStepLabel: string // pre-translated section label (e.g. "Your next step") — packages/ui has no react-i18next dependency
  ctaLabel: string // pre-translated CTA button copy (e.g. "Start this step")
  // sudsPrefix/sudsSuffix (not a single pre-formatted string): the SUDS number is clamped
  // here, not by the caller — defense-in-depth at the render boundary (Story 6.2-B AC5).
  // Split around the number so the clamp can stay internal while the surrounding copy is
  // still fully pre-translated.
  sudsPrefix: string // pre-translated text before the clamped SUDS number (e.g. "Anxiety ")
  sudsSuffix: string // pre-translated text after the clamped SUDS number (e.g. "/10")
  fallbackLabel: string // pre-translated placeholder shown when there is no lowestPendingItem
}

export const CourageLadderEntryCard = React.forwardRef<
  React.ElementRef<typeof TouchableOpacity>,
  CourageLadderEntryCardProps
>(function CourageLadderEntryCard(
  { lowestPendingItem, onPress, accessibilityLabel, nextStepLabel, ctaLabel, sudsPrefix, sudsSuffix, fallbackLabel },
  ref
) {
  return (
    <TouchableOpacity
      ref={ref}
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {lowestPendingItem ? (
        <View style={styles.content}>
          <Text style={styles.label}>{nextStepLabel}</Text>
          <Text style={styles.description}>{lowestPendingItem.description}</Text>
          <View style={styles.sudsBadge}>
            <View style={styles.sudsDot} />
            <Text style={styles.sudsText}>
              {sudsPrefix}
              {Math.min(10, Math.max(0, Math.round(lowestPendingItem.predictedSuds)))}
              {sudsSuffix}
            </Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.placeholder}>{fallbackLabel}</Text>
      )}
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface.secondary,
    borderRadius: radius.card,
    padding: spacing[5],
    marginTop: spacing[5],
    alignSelf: 'stretch',
  },
  content: { gap: spacing[3] },
  label: {
    ...typography.caption,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: color.content.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  description: { ...typography.h2, color: color.content.primary },
  sudsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[2],
    backgroundColor: '#ffffff',
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
  },
  sudsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.accent.progress },
  sudsText: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: color.content.secondary },
  cta: {
    marginTop: spacing[1],
    backgroundColor: color.accent.courage,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', color: '#ffffff' },
  placeholder: { ...typography.body, color: color.content.secondary, textAlign: 'center' },
})
