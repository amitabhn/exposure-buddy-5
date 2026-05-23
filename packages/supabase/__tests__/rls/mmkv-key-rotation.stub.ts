// MMKV key rotation edge case documentation (ARC-004)
// Full implementation deferred to Epic 9 hardening.
//
// This file is a typed design stub — not executable test code.
// It documents the known risk so that Epic 9 has a clear spec anchor.

export interface KeyRotationScenario {
  /** Human-readable name for the scenario */
  name: string
  /** Platform(s) affected */
  platforms: ('android' | 'ios')[]
  /** Trigger condition that causes the old key to become inaccessible */
  trigger: string
  /** Observed symptom when the mismatch is unhandled */
  symptom: string
  /** Planned mitigation for Epic 9 */
  mitigation: string
  /** Architecture reference */
  arcRef: string
}

export const ANDROID_REINSTALL_SCENARIO: KeyRotationScenario = {
  name: 'Android reinstall with backup-restore',
  platforms: ['android'],
  trigger:
    'User uninstalls and reinstalls the app. Android Backup & Restore (auto-backup) restores the ' +
    'MMKV data file (stored in app data) but does NOT restore the SecureStore entry ' +
    '(KeyStore-backed, excluded from auto-backup by default). The next cold start generates a ' +
    'new encryption key; the old MMKV file, encrypted with the lost key, cannot be opened.',
  symptom:
    'MMKV throws on open or silently returns null for all reads, causing AuthProvider to show ' +
    'signed-out state even though the user had an active session.',
  mitigation:
    'Epic 9: On MMKV open failure, detect the stale-file case, wipe the old MMKV store, ' +
    'generate a new key in SecureStore, re-initialise MMKV fresh, and trigger a silent ' +
    're-authentication via the stored Supabase refresh token (also backed up separately ' +
    'with allowBackup=false for the relevant SharedPreferences key).',
  arcRef: 'ARC-004',
}

export const KNOWN_KEY_ROTATION_SCENARIOS: KeyRotationScenario[] = [ANDROID_REINSTALL_SCENARIO]
