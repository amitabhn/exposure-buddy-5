import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { FearLadderItemSummary } from '@exposure-buddy/core'

export interface CourageLadderEntryCardProps {
  ladderItemCount: number
  lowestPendingItem: FearLadderItemSummary | null
  onPress: () => void
}

export const CourageLadderEntryCard = React.forwardRef<
  React.ElementRef<typeof TouchableOpacity>,
  CourageLadderEntryCardProps
>(function CourageLadderEntryCard({ ladderItemCount, lowestPendingItem, onPress }, ref) {
  return (
    <TouchableOpacity
      ref={ref}
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
    >
      {lowestPendingItem ? (
        <View>
          <Text style={styles.description}>{lowestPendingItem.description}</Text>
          <Text style={styles.suds}>
            Anxiety: {Math.min(10, Math.max(0, Math.round(lowestPendingItem.predictedSuds)))}/10
          </Text>
        </View>
      ) : (
        <Text style={styles.placeholder}>
          {ladderItemCount === 0 ? 'Add your first situation to get started.' : 'No pending items'}
        </Text>
      )}
    </TouchableOpacity>
  )
})

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
    marginVertical: 16,
    alignSelf: 'stretch',
  },
  description: { fontSize: 16, color: '#111827', fontWeight: '600' },
  suds: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  placeholder: { fontSize: 15, color: '#9ca3af', textAlign: 'center' },
})
