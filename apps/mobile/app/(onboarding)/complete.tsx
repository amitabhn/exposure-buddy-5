import { View, Text, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

// Minimal stub — Story 4.4 replaces this content.
export default function CompleteScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <Text>Step 4 — Story 4.4</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } })
