import { View, Text, StyleSheet } from 'react-native'

// Placeholder — OTP authentication implemented in Story 2.1
export default function SignInScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exposure Buddy</Text>
      <Text style={styles.subtitle}>Sign in — Story 2.1</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666' },
})
