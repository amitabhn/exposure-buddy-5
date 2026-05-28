// User-scoped: key includes userId so multiple accounts on one device don't collide.
// Device-scoped: key is a static string; must survive sign-out.
export const KV_KEYS = {
  // ── User-scoped (functions) ──────────────────────────────────────────────
  ONBOARDING_COMPLETE:          (userId: string) => `onboarding:complete:${userId}`,
  ONBOARDING_PROGRESS:          (userId: string) => `onboarding:progress:${userId}`,
  SUDS_CALIBRATION:             (userId: string) => `suds:calibration:${userId}`,
  CRISIS_FLAGGED_IN_ONBOARDING: (userId: string) => `onboarding:crisis:${userId}`,
  // ── Device-scoped (constants) ────────────────────────────────────────────
  // Forward-reference for Story 2.3 (deferred). Story 2.4 sign-out clears
  // all user-scoped MMKV keys but MUST NOT clear this key.
  PREVIEW_CHALLENGES: 'preview_challenges',
} as const

// Total number of onboarding steps — used by OnboardingStepIndicator and
// any screen that renders the step indicator.
export const ONBOARDING_STEP_COUNT = 4
