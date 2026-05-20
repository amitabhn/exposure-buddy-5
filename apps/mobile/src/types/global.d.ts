// React Native globals not in ES2022 lib
declare const __DEV__: boolean

declare namespace NodeJS {
  interface ProcessEnv {
    SENTRY_DSN?: string
    SUPABASE_URL?: string
    SUPABASE_ANON_KEY?: string
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
