import { View, Text, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

// Minimal stub — Story 4.3 replaces this content.
export default function LadderScreen() {
  return (
    <>
      {/* Reached via router.replace — suppress back button so users cannot return to assessment after completing it */}
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <Text>Step 3 — Story 4.3</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } })
