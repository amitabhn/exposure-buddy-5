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
  // DEPRECATED 2026-06-15 (Story 5.6) — no longer written. AuthProvider deletes this
  // key on every SIGNED_IN to clean up stale data from the State 7/8 era. Safe to
  // remove from KV_KEYS entirely after one release cycle.
  SESSION_DEBRIEF_PENDING:      (userId: string) => `session:debrief_pending:${userId}`,
  // ── Device-scoped (constants) ────────────────────────────────────────────
  // Forward-reference for Story 2.3 (deferred). Story 2.4 sign-out clears
  // all user-scoped MMKV keys but MUST NOT clear this key.
  PREVIEW_CHALLENGES: 'preview_challenges',
} as const

// Total number of onboarding steps — used by OnboardingStepIndicator and
// any screen that renders the step indicator.
export const ONBOARDING_STEP_COUNT = 4
