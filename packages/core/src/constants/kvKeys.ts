// User-scoped: key includes userId so multiple accounts on one device don't collide.
// Device-scoped: key is a static string; must survive sign-out.
export const KV_KEYS = {
  // ── User-scoped (functions) ──────────────────────────────────────────────
  ONBOARDING_COMPLETE:          (userId: string) => `onboarding:complete:${userId}`,
  ONBOARDING_PROGRESS:          (userId: string) => `onboarding:progress:${userId}`,
  SUDS_CALIBRATION:             (userId: string) => `suds:calibration:${userId}`,
  CRISIS_FLAGGED_IN_ONBOARDING: (userId: string) => `onboarding:crisis:${userId}`,
  FIRST_HOME_VISIT_SEEN:        (userId: string) => `first_home_visit_seen:${userId}`,
  // JSON-serialised SessionRecoveryData blob { sessionId, fearItemId, preSuds, description }.
  // Read via JSON.parse with try/catch; corrupt key = clear and ignore. (Story 5.2+)
  SESSION_IN_PROGRESS:          (userId: string) => `session:in_progress:${userId}`,
  // Optional intention text written in intent.tsx; cleared on abandonment and completion.
  SESSION_INTENTION:            (sessionId: string) => `session:intention:${sessionId}`,
  // Epoch-ms timestamp, written once on entering session/grounding.tsx (active→grounding),
  // cleared on normal exit (resume or stop). A flag stuck by an abnormal exit (kill mid-grounding,
  // crash) self-clears via staleness-window expiry on hydration — see isGroundingSignalFresh
  // in erp/session-state-machine.ts — rather than relying on the clear call being reliable. (Story 9.2)
  GROUNDING_ACTIVE:             (userId: string) => `session:grounding_active:${userId}`,
  // DEPRECATED 2026-06-15 (Story 5.6) — no longer written. AuthProvider deletes this
  // key on every SIGNED_IN to clean up stale data from the State 7/8 era. Safe to
  // remove from KV_KEYS entirely after one release cycle.
  SESSION_DEBRIEF_PENDING:      (userId: string) => `session:debrief_pending:${userId}`,
  // Two-arg key: preference is per-user per-fear-item (not per-session), so sessionId would be wrong here.
  // Retained across sign-out (parallels SUDS_CALIBRATION policy); subject to DPDPA erasure on account deletion.
  SESSION_LAST_TECHNIQUE:       (userId: string, fearItemId: string) => `session:last_technique:${userId}:${fearItemId}`,
  // Daily reminder time as an "HH:mm" 24-hour string (e.g. "08:00"), not a Date. (Story 8.2)
  SESSION_REMINDER_TIME:        (userId: string) => `notifications:reminder_time:${userId}`,
  SESSION_REMINDER_NOTIFICATION_ID: (userId: string) => `notifications:reminder_id:${userId}`,
  // User's explicit enable/disable choice for the daily reminder — independent of OS
  // notification permission and of the stored time (time is retained when disabled so
  // re-enabling restores the last-picked value). (Story 8.2)
  SESSION_REMINDER_ENABLED:     (userId: string) => `notifications:reminder_enabled:${userId}`,
  // Pending account-erasure record (PendingDeletionRecord). Scoped by userId so a stale
  // record left by one account can never surface for a different account signing in on
  // the same device. (Story 9.4)
  PENDING_DELETION_REQUEST:     (userId: string) => `account:pending_deletion:${userId}`,
  // ── Device-scoped (constants) ────────────────────────────────────────────
  // Forward-reference for Story 2.3 (deferred). Story 2.4 sign-out clears
  // all user-scoped MMKV keys but MUST NOT clear this key.
  PREVIEW_CHALLENGES: 'preview_challenges',
} as const

// Total number of onboarding steps — used by OnboardingStepIndicator and
// any screen that renders the step indicator.
export const ONBOARDING_STEP_COUNT = 4
