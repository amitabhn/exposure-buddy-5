import { View, Text, StyleSheet } from 'react-native'

// Home screen placeholder — full implementation in Epic 5/6
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exposure Buddy</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  title: { fontSize: 24, fontWeight: '600' },
})
