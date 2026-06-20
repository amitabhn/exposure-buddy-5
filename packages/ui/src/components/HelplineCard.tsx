import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { color, tapTarget } from '../tokens/theme'

export interface HelplineCardProps {
  name: string
  displayNumber: string
  callLabel: string // pre-translated — packages/ui has no react-i18next dependency
  onCallPress: () => void
}

export const HelplineCard = React.forwardRef<
  React.ElementRef<typeof View>,
  HelplineCardProps
>(function HelplineCard({ name, displayNumber, callLabel, onCallPress }, ref) {
  return (
    <View ref={ref} style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.number}>{displayNumber}</Text>
      </View>
      <TouchableOpacity
        style={styles.callButton}
        onPress={onCallPress}
        accessibilityRole="button"
        accessibilityLabel={`${callLabel} ${name}: ${displayNumber}`}
      >
        <Text style={styles.callLabel}>{callLabel}</Text>
      </TouchableOpacity>
    </View>
  )
})

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: color.surface.secondary,
    marginVertical: 8,
    alignSelf: 'stretch',
  },
  info: { flex: 1, marginRight: 12 },
  name: { fontSize: 16, fontWeight: '600', color: color.content.primary },
  number: { fontSize: 14, color: color.content.secondary, marginTop: 4 },
  callButton: {
    minHeight: tapTarget.inTheMoment,
    paddingHorizontal: 20,
    borderRadius: tapTarget.inTheMoment / 2,
    backgroundColor: color.accent.courage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callLabel: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
})
