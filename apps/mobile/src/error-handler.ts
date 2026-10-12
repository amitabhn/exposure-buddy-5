import * as Sentry from '@sentry/react-native'
import type { DroppedWriteReport } from '@exposure-buddy/sync'

// Story 19.7: the payload is table, op, error code and constraint name only (see DroppedWriteReport),
// so no row values or free text reach Sentry.
export function reportDroppedWrite(report: DroppedWriteReport): void {
  try {
    const { level, ...tags } = report
    // eslint-disable-next-line i18next/no-literal-string
    Sentry.captureMessage('upload write dropped', { level, tags })
  } catch {
    // Reporting must never stall the upload queue.
  }
}

export function initErrorHandler(): void {
  if (typeof global === 'undefined' || !global.ErrorUtils) return

  try {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || undefined,
      enabled: !__DEV__ && !!process.env.EXPO_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
    })
  } catch {
    // Sentry init failure must not prevent global handler registration
  }

  const defaultHandler = global.ErrorUtils.getGlobalHandler()
  global.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    Sentry.captureException(error, { extra: { isFatal } })
    defaultHandler(error, isFatal)
  })
}
