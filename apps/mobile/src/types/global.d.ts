// React Native globals not in ES2022 lib
declare const __DEV__: boolean

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SENTRY_DSN?: string
    EXPO_PUBLIC_SUPABASE_URL?: string
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string
    EXPO_PUBLIC_APP_VARIANT?: string
    EXPO_PUBLIC_POWERSYNC_URL?: string
    EXPO_PUBLIC_FETCH_TIMEOUT_MS?: string
  }
}

declare const process: {
  env: NodeJS.ProcessEnv
}

type ErrorHandler = (error: Error, isFatal?: boolean) => void

declare const global: {
  ErrorUtils: {
    getGlobalHandler: () => ErrorHandler
    setGlobalHandler: (handler: ErrorHandler) => void
  }
  [key: string]: unknown
}
