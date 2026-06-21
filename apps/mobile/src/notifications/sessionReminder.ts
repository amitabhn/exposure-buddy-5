import * as Notifications from 'expo-notifications'

function parseTime(time: string): { hour: number; minute: number } {
  const [hourStr = '0', minuteStr = '0'] = time.split(':')
  const hour = Math.min(23, Math.max(0, parseInt(hourStr, 10) || 0))
  const minute = Math.min(59, Math.max(0, parseInt(minuteStr, 10) || 0))
  return { hour, minute }
}

// Returns the scheduled notification's identifier, or null if permission is not granted
// (nothing is scheduled in that case).
export async function scheduleSessionReminder(
  time: string,
  content: { title: string; body: string }
): Promise<string | null> {
  let status: string
  try {
    status = (await Notifications.getPermissionsAsync()).status
  } catch (err) {
    console.warn('[sessionReminder] getPermissionsAsync threw:', err)
    return null
  }
  // eslint-disable-next-line i18next/no-literal-string
  if (status !== 'granted') return null

  const { hour, minute } = parseTime(time)

  return Notifications.scheduleNotificationAsync({
    content,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  })
}

// Best-effort cancellation — an already-fired or already-cancelled ID is the expected
// case; logged distinctly from a genuine cancellation failure so telemetry can tell them apart.
export async function cancelSessionReminder(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId)
  } catch (err) {
    console.warn('[sessionReminder] cancelScheduledNotificationAsync failed:', err)
  }
}
