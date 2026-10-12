import type { AbstractPowerSyncDatabase } from '@powersync/react-native'

export const STALL_MS = 20_000
const CHECK_MS = 5_000

// After the network drops, PowerSync's stream can sit on a hung connection attempt and never
// report connected again, even once the network is back (Story 19.7 device repro). Uploads then
// never resume: the upload loop only wakes on a local write or a fresh stream line. Calling
// connect() again aborts the hung attempt and starts a new one. Reconnect once the stream has
// been disconnected for STALL_MS; offline retries fail fast, so repeating this is harmless.
// Does nothing when EXPO_PUBLIC_POWERSYNC_URL is unset.
export function watchStalledConnection(
  db: AbstractPowerSyncDatabase,
  reconnect: () => void,
  now: () => number = Date.now,
): () => void {
  // Same gate as fetchCredentials: with no PowerSync endpoint (CI, local dev) the stream is never
  // meant to connect, so "disconnected" is not a stall.
  if (!process.env['EXPO_PUBLIC_POWERSYNC_URL']) return () => {}
  let disconnectedSince: number | null = null
  const timer = setInterval(() => {
    if (db.currentStatus?.connected) {
      disconnectedSince = null
      return
    }
    const t = now()
    if (disconnectedSince === null) disconnectedSince = t
    if (t - disconnectedSince >= STALL_MS) {
      disconnectedSince = t
      reconnect()
    }
  }, CHECK_MS)
  return () => clearInterval(timer)
}
