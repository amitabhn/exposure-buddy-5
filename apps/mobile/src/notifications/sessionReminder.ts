import * as Notifications from 'expo-notifications'

// Fallback used when a stored/incoming time string isn't a parseable "HH:mm" pair —
// distinct from a legitimate "00:00" (midnight), which parses cleanly and is left alone.
export const DEFAULT_TIME = '08:00'
const DEFAULT_HOUR = 8
const DEFAULT_MINUTE = 0

export function parseTime(time: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = time.split(':')
  const parsedHour = hourStr === undefined ? NaN : parseInt(hourStr, 10)
  const parsedMinute = minuteStr === undefined ? NaN : parseInt(minuteStr, 10)
  const hour = Number.isNaN(parsedHour) ? DEFAULT_HOUR : Math.min(23, Math.max(0, parsedHour))
  const minute = Number.isNaN(parsedMinute) ? DEFAULT_MINUTE : Math.min(59, Math.max(0, parsedMinute))
  return { hour, minute }
}

// Returns the scheduled notification's identifier, or null if permission is not granted
// or scheduling otherwise fails (nothing is scheduled in that case).
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

  try {
    return await Notifications.scheduleNotificationAsync({
      content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    })
  } catch (err) {
    console.warn('[sessionReminder] scheduleNotificationAsync failed:', err)
    return null
  }
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

// Renders a stored "HH:mm" time as a 12-hour clock with AM/PM, e.g. "08:00" -> "8:00 AM".
// amLabel/pmLabel are caller-supplied (via t()) rather than hardcoded so the period
// marker stays translatable.
export function formatTimeForDisplay(time: string, amLabel: string, pmLabel: string): string {
  const { hour, minute } = parseTime(time)
  const period = hour < 12 ? amLabel : pmLabel
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  const mm = String(minute).padStart(2, '0')
  return `${displayHour}:${mm} ${period}`
}
