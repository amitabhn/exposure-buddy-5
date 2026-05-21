import * as Sentry from '@sentry/react-native'

export function initErrorHandler(): void {
  if (typeof global === 'undefined' || !global.ErrorUtils) return

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || undefined,
      enabled: !__DEV__ && !!process.env.SENTRY_DSN,
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
