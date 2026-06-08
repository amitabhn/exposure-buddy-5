import React, { useState } from 'react'
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native'

export interface SudsArcChartProps {
  readings: number[]          // SUDS values 0–10, chronological order
  accessibilityLabel?: string
}

const CHART_HEIGHT = 80
const DOT_SIZE = 10
const LINE_THICKNESS = 2

// Axis: SUDS 10 = top, SUDS 0 = bottom
function topOffset(suds: number): number {
  return ((10 - suds) / 10) * (CHART_HEIGHT - DOT_SIZE)
}

function dotColor(i: number, total: number): string {
  if (i === 0) return '#9ca3af'            // pre-exposure: neutral grey
  if (i === total - 1) return '#0f766e'    // exit: dark teal
  return '#5eead4'                          // mid-session: light teal
}

export function SudsArcChart({ readings, accessibilityLabel }: SudsArcChartProps) {
  const [containerWidth, setContainerWidth] = useState(0)

  if (readings.length === 0) return null

  function handleLayout(e: LayoutChangeEvent) {
    setContainerWidth(e.nativeEvent.layout.width)
  }

  function leftOffset(i: number): number {
    if (readings.length === 1 || containerWidth === 0) return containerWidth / 2
    // Constrain dot centres to [DOT_SIZE/2 … containerWidth-DOT_SIZE/2] so the
    // first and last dots don't clip at the container edges.
    const usable = containerWidth - DOT_SIZE
    return DOT_SIZE / 2 + (i / (readings.length - 1)) * usable
  }

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      {containerWidth > 0 && readings.map((suds, i) => {
        const dotTop = topOffset(suds)
        const dotLeft = leftOffset(i)

        let lineElement: React.ReactNode = null
        if (i < readings.length - 1) {
          const nextSuds = readings[i + 1]!
          const nextLeft = leftOffset(i + 1)
          const dx = nextLeft - dotLeft
          const dy = topOffset(nextSuds) - dotTop
          const length = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx) * (180 / Math.PI)
          lineElement = (
            <View
              key={`line-${i}`}
              style={[
                styles.line,
                {
                  top: dotTop + DOT_SIZE / 2 - LINE_THICKNESS / 2,
                  left: dotLeft,
                  width: length,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          )
        }

        return (
          <React.Fragment key={i}>
            {lineElement}
            <View
              style={[
                styles.dot,
                {
                  top: dotTop,
                  left: dotLeft - DOT_SIZE / 2,
                  backgroundColor: dotColor(i, readings.length),
                },
              ]}
            />
          </React.Fragment>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: CHART_HEIGHT,
    position: 'relative',
    marginVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  line: {
    position: 'absolute',
    height: LINE_THICKNESS,
    backgroundColor: '#5eead4',
    transformOrigin: 'left center',
  },
})
