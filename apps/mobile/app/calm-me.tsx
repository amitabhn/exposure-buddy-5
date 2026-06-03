import { View, Text, StyleSheet } from 'react-native'
import { Stack } from 'expo-router'

// Minimal stub — Epic 7 replaces this content.
export default function CalmMeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <Text>Calm Me — Epic 7</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center' } })
