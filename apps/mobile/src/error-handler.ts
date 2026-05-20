import * as Sentry from '@sentry/react-native'

export function initErrorHandler(): void {
  Sentry.init({
    dsn: process.env.SENTRY_DSN ?? '',
    enabled: !__DEV__,
    tracesSampleRate: 0.1,
  })

  const defaultHandler = global.ErrorUtils.getGlobalHandler()
  global.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    Sentry.captureException(error, { extra: { isFatal } })
    defaultHandler(error, isFatal)
  })
}
