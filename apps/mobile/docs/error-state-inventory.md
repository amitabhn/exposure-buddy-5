# Error State & Empty State Inventory

**Audit date:** 2026-06-24  
**Story:** 9.6 — Error State & Empty State UX Audit  
**ADR reference:** `_bmad-output/planning-artifacts/adrs/ADR-ERROR-STATES.md`  

This document is the durable audit record for the Story 9.6 error state audit. Every screen and component in scope is listed below with findings and actions taken. See ADR-ERROR-STATES.md for classification definitions and the Base Fallback Error State requirement.

**Classification key:**
| Label | Meaning | Action |
|---|---|---|
| P0 | App crash, unrecoverable state, or complete data loss with no user feedback | Fixed in this story |
| P1 | Silent failure, user stranded, or missing `accessibilityLiveRegion` on error/empty-state Text | Fixed in this story |
| P2 | Suboptimal copy, minor UX gap, or low-risk omission | Documented as "P2 — deferred" |
| OK | Already specific, calm, and actionable — no change needed | Documented as "OK" |

---

## Screens — `app/` directory

| Screen / Component | Error Surface | Current Copy (or "silent") | Classification | Action Taken |
|---|---|---|---|---|
| `app/_layout.tsx` | No React error boundary | N/A — native crash on unhandled render error | P0 | Fixed: added named `ErrorBoundary` export with hardcoded "The app encountered an error. Please close and reopen it." and `accessibilityLiveRegion="polite"`. Logs to Sentry. |
| `app/_layout.tsx` | PowerSync lifecycle errors | silent → Sentry breadcrumb | OK | Intentional — system-level, not user-facing. |
| `app/+not-found.tsx` | 404 navigation error | `error.screenNotFound` / `error.goHome` | OK | Already specific. Not a runtime error — navigation-only. |
| `app/privacy-notice.tsx` | No error surfaces | N/A | OK | Static content screen. No error surfaces. |
| `app/ladder.tsx` | emptyState Text | `ladder.emptyState` = "Your Courage Ladder is empty. Add your first situation to get started." | P1 | Fixed: added `accessibilityLiveRegion="polite"` to emptyState Text at line 217. |
| `app/ladder.tsx` | Edit enqueue failure | silent → `console.error` | P2 | P2 — deferred to Story 9.10. Optimistic update succeeds locally; server sync failure is silent. |
| `app/ladder.tsx` | Add enqueue failure | silent → `console.error` | P2 | P2 — deferred to Story 9.10. Optimistic update succeeds locally; server sync failure is silent. |
| `app/ladder.tsx` | Delete enqueue failure | silent → `console.error` | P2 | P2 — deferred to Story 9.10. Item may persist server-side. |
| `app/ladder.tsx` | Reorder enqueue failure | silent → `console.error` | P2 | P2 — deferred to Story 9.10. Optimistic reorder reverted; server not updated. |
| `app/reminder-settings.tsx` | permissionError Text | `reminderSettings.permissionRequired` (copy already specific) | P1 | Fixed: added `accessibilityLiveRegion="polite"` to permissionErrorText at line 225. |

---

## Auth screens — `app/(auth)/`

| Screen / Component | Error Surface | Current Copy (or "silent") | Classification | Action Taken |
|---|---|---|---|---|
| `app/(auth)/_layout.tsx` | No error surfaces | N/A | OK | Navigation wrapper only. No error surfaces. |
| `app/(auth)/sign-in.tsx` | errorKey Text | `auth.otp.sendError` / `auth.validation.*` / etc. (all specific) | P1 | Fixed: added `accessibilityLiveRegion="polite"` to errorKey Text at line 245. Copy already correct. |
| `app/(auth)/otp-verification.tsx` | errorKey Text | `auth.otp.expired`, `auth.otp.invalidCode`, `auth.otp.sendError` | P1 | Fixed: added `accessibilityLiveRegion="polite"` to errorKey Text at line 248. Copy already correct. |
| `app/(auth)/otp-verification.tsx` | consentError Text | `auth.safety.consentWriteFailed` = "We couldn't save your consent record. Please try again." | P1 | Fixed: added `accessibilityLiveRegion="polite"` to consentError Text at line 250. Copy already correct. |

---

## Onboarding screens — `app/(onboarding)/`

| Screen / Component | Error Surface | Current Copy (or "silent") | Classification | Action Taken |
|---|---|---|---|---|
| `app/(onboarding)/_layout.tsx` | No error surfaces | N/A | OK | Navigation/auth gate only. No error surfaces. |
| `app/(onboarding)/welcome.tsx` | Resume-failed alert | `onboarding.resumeFailed.toast` = "Couldn't restore your progress. Starting from step 1." | OK | Already specific, calm, actionable. Uses Alert.alert (platform modal). |
| `app/(onboarding)/assessment.tsx` | enqueue failure on calibration save | silent → `console.error`; `return` blocks navigation to ladder | P1 | Fixed: surface error Text + retry Pressable; removed navigation-blocking `return`. Added i18n keys `onboarding.assessment.saveFailed` / `onboarding.assessment.trySaving`. |
| `app/(onboarding)/ladder.tsx` | enqueue failure on fear item save | silent → `console.error`; early return | P1 | Fixed: surface error Text + retry Pressable. Added i18n keys `onboarding.fearLadder.saveFailed` / `onboarding.fearLadder.trySaving`. |
| `app/(onboarding)/crisis.tsx` | No error surfaces (stub screen) | N/A | OK | Stub screen. Clinical copy excluded per AC 4. Non-clinical error handling: none present. |
| `app/(onboarding)/complete.tsx` | No error surfaces | N/A | OK | Static completion screen. No async errors. |

---

## App screens — `app/(app)/`

| Screen / Component | Error Surface | Current Copy (or "silent") | Classification | Action Taken |
|---|---|---|---|---|
| `app/(app)/_layout.tsx` | Recovery-end enqueue failure | silent → `console.error`; MMKV cleared regardless | P1 | Fixed: gate MMKV clear on enqueue success; show `session.recovery.endFailed` error in modal with `session.recovery.tryEnding` retry button. |
| `app/(app)/index.tsx` | empty-ladder Text (home screen) | `ladder.emptyState` = "Your Courage Ladder is empty. Add your first situation to get started." | P1 | Fixed: added `accessibilityLiveRegion="polite"` to empty-ladder Text at line 125. Copy already correct. |
| `app/(app)/settings/index.tsx` | actionError Text | `settings.signOutError` / `settings.deleteAccountError` (both specific) | P1 | Fixed: added `accessibilityLiveRegion="polite"` to actionError Text at line 93. Copy already correct. |

---

## Session screens — `app/session/`

| Screen / Component | Error Surface | Current Copy (or "silent") | Classification | Action Taken |
|---|---|---|---|---|
| `app/session/_layout.tsx` | No error surfaces | N/A | OK | Navigation shell only. No error surfaces. |
| `app/session/intent.tsx` | enqueue failure on session start | silent → `console.error`; navigation blocked | P0 | Fixed: surface `session.intent.enqueueFailed` error Text + `session.intent.tryAgain` retry. |
| `app/session/pause.tsx` | No error surfaces | N/A | OK | Superseded screen (replaced by briefing.tsx in Story 6.1). No async operations. |
| `app/session/briefing.tsx` | No error surfaces | N/A | OK | Read-only display of session context. No async errors. |
| `app/session/active.tsx` | SUDS log enqueue failure | silent → `console.error` | P2 | P2 — user sees optimistic local update; local SUDS tracking preserved outside try block. Deferred to Story 9.10. |
| `app/session/active.tsx` | Session completion enqueue failure | silent → `console.error`; user returned to active screen with no message | P0 | Fixed: surface `session.active.completionFailed` error Text + `session.active.tryAgain` retry on main active screen. |
| `app/session/grounding.tsx` | Abandonment enqueue failure | silent → `console.error`; MMKV cleared + navigation continues regardless | P1 | Fixed: gate MMKV clear and navigation on enqueue success; show `session.grounding.abandonFailed` error + `session.grounding.tryAgain` retry. |
| `app/session/debrief.tsx` | Reflection submission failure | completely empty `catch {}` — no log, no user message | P1 | Fixed: add error state, surface `session.debrief.saveFailed` Text + `session.debrief.tryAgain` retry. |
| `app/session/abandoned.tsx` | No error surfaces | N/A | OK | Static completion screen. No async errors. |

---

## Calm Me screens — `app/calm-me/`

| Screen / Component | Error Surface | Current Copy (or "silent") | Classification | Action Taken |
|---|---|---|---|---|
| `app/calm-me/_layout.tsx` | No error surfaces | N/A | OK | Navigation shell only. |
| `app/calm-me/index.tsx` | Abandonment enqueue failure | silent → `console.error`; navigation continues regardless | P2 | P2 — navigation to debrief is unaffected; CalmMe screens must not show errors per ADR. Deferred to Story 9.10. |
| `app/calm-me/breathing.tsx` | No error surfaces | N/A | OK | Timer-based breathing exercise. No async operations. |
| `app/calm-me/grounding.tsx` | No error surfaces | N/A | OK | 5-4-3-2-1 grounding exercise. No async operations. |
| `app/calm-me/helplines.tsx` | Linking.openURL failure | silent → `console.error` | OK | Confirmed correct per ADR: `HelplineCard` has no error state — failure gracefully renders the empty variant. Excluded from scope per Dev Notes. |

---

## Components — `src/components/`

| Screen / Component | Error Surface | Current Copy (or "silent") | Classification | Action Taken |
|---|---|---|---|---|
| `src/components/auth/SafetyCheckboxes.tsx` | No error surfaces | N/A | OK | Checkbox UI only. No async operations. |
| `src/components/CalmMeFab.tsx` | No error surfaces | N/A | OK | Must never show loading/error state per ADR (`CalmMeButton` spec). |
| `src/components/settings/DeleteAccountModal.tsx` | No error surfaces | N/A | OK | Modal UI only; error is surfaced by parent settings/index.tsx via `actionError`. |
| `src/components/onboarding/FearItemForm.tsx` | No error surfaces | N/A | OK | Form UI only; error surfacing is parent's responsibility (handled in this story). |

---

## Pre-existing i18n keys confirmed OK — do NOT replace

| Key | Current value | Classification |
|---|---|---|
| `auth.otp.invalidCode` | "Invalid code. Please try again." | OK |
| `auth.otp.expired` | "Code has expired. Please request a new one." | OK |
| `auth.otp.sendError` | "Failed to send code. Please try again." | OK |
| `auth.safety.consentWriteFailed` | "We couldn't save your consent record. Please try again." | OK |
| `settings.signOutError` | "Sign out failed. Please try again." | OK |
| `settings.deleteAccountError` | "Failed to submit deletion request. Please try again." | OK |
| `ladder.emptyState` | "Your Courage Ladder is empty. Add your first situation to get started." | OK — specific; canonical differs slightly ("Tap 'Build your ladder'") but both acceptable; existing retained |
| `helplines.unavailable` | "Helpline information is not available in your region yet." | OK |
| `onboarding.resumeFailed.toast` | "Couldn't restore your progress. Starting from step 1." | OK |

---

## ADR component state matrix — post-MVP components

These components are not yet implemented. Each row is a pre-implementation gate: any story implementing one of these components **must** include a full error/empty/loading state spec before sprint sign-off.

| Component | Required states (per ADR) | Action Taken |
|---|---|---|
| `HomeStateCard` | error, success | Component not yet implemented. Error state required before implementation sprint. |
| `DragRankList` | loading, empty, error, success | Component not yet implemented. Error state required before implementation sprint. |
| `SudsArcChart` | loading, error, success (empty → `insufficient-data`) | Component not yet implemented. Error state required before implementation sprint. |
| `LetterToSelfEditor` | error, success | Component not yet implemented. Error state required before implementation sprint. |
| `LetterReveal` | loading, error, success | Component not yet implemented. Error state required before implementation sprint. |
| `AcknowledgementCard` | error, success | Component not yet implemented. Error state required before implementation sprint. |
