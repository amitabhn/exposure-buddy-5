import { View, Text, StyleSheet } from 'react-native'

// Minimal stub — Epic 5 replaces this with the real crisis resources screen.
export default function CrisisScreen() {
  return (
    <View style={styles.container}>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <Text>Crisis Resources — Epic 5</Text>
    </View>
  )
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } })
