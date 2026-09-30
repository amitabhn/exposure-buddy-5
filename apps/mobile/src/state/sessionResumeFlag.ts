// Story 18.2 — transient, unpersisted, module-scoped signal for the Resume →
// Insta-Calm-banner handoff. Two responsibilities live in this one file because they're
// both part of the same handoff:
//
//  1. A one-shot "was /session/active just reached via Resume" flag. `handleRecoveryResume`
//     ((app)/_layout.tsx) sets this SYNCHRONOUSLY, inline in the same event handler as its
//     router.push — never from a useEffect. A deferred effect fires after render/commit,
//     after ActiveScreen's lazy useState initializer has already consumed the flag during
//     its own initial render, so the banner would never show on a real Resume tap. Works for
//     both local- and fallback-derived resumes, since both flow through the same
//     sessionRecoveryData surface.
//
//  2. A reactive "is the resume banner currently visible" signal that session/active.tsx
//     publishes to on show/dismiss, and that CalmMeFab.tsx subscribes to (via
//     useSyncExternalStore) so it can suppress itself specifically while the banner is
//     visible, reappearing once dismissed. A plain module-level store, not React state or
//     context, since the two components are not in a parent/child relationship.

// ─── One-shot "reached via Resume" flag ──────────────────────────────────────────
let resumedSessionId: string | null = null

export function markSessionResumed(sessionId: string): void {
  resumedSessionId = sessionId
}

// Always clears the flag on any call, matched or not — a stale flag left by an aborted
// navigation can only ever re-fire for a later mount of the literal same sessionId, which
// is itself still a legitimate resume context, not an unrelated one.
export function consumeSessionResumedFlag(sessionId: string): boolean {
  const matched = resumedSessionId === sessionId
  resumedSessionId = null
  return matched
}

// ─── Reactive "resume banner visible" signal (useSyncExternalStore) ──────────────
let bannerVisible = false
const listeners = new Set<() => void>()

export function setResumeBannerVisible(visible: boolean): void {
  if (bannerVisible === visible) return
  bannerVisible = visible
  listeners.forEach((listener) => listener())
}

export function subscribeResumeBannerVisible(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getResumeBannerVisible(): boolean {
  return bannerVisible
}
