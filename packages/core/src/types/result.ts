// ARC-001: zero imports from react-native, expo-*, or @supabase/*
export type AppError = {
  code: string
  message: string
  context?: { [key: string]: string | number | undefined }
}

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }
