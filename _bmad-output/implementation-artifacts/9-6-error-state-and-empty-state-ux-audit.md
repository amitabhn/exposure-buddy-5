# Story 9.6: Error State & Empty State UX Audit

Status: ready-for-dev <!-- spec review complete 2026-06-24; all findings resolved -->

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user experiencing an error or using the app for the first time,
I want every error message and empty state to be specific, calm, and actionable,
so that I am never alarmed or left confused at a high-anxiety moment (see ADR-ERROR-STATES).

## Acceptance Criteria

1. **Given** the full screen inventory across all epics **When** the error state audit is conducted **Then** every error surface is catalogued; "error surface" includes: API/network error toasts, failed sync/enqueue states, auth errors, empty states (no sessions, no ladder items, no progress data), and loading failure states; the catalogue is documented in `apps/mobile/docs/error-state-inventory.md` as a table with columns: Screen/Component, Error Surface, Current Copy (or "silent"), Classification (P0/P1/P2/OK), and Action Taken.

2. **Given** any existing generic error copy used in place of a classifiable, specific failure ("Something went wrong", "Error", "Failed", "Try again" without context, used where the underlying cause is known) **When** found during the audit **Then** it is replaced with specific, calm, actionable copy following this pattern: state what happened in plain language, state the user's data status (lost / safe / will sync), state what to do next; canonical replacements:
   - Offline/sync write failure: "We couldn't save your session right now. It's stored on your device and will sync automatically."
   - Auth network error: "Couldn't connect to sign you in. Check your connection and try again."
   - Hierarchy empty state: "Your ladder is empty. Tap 'Build your ladder' to get started." — **Pre-audit note:** existing `en.json` key `ladder.emptyState` reads "Your Courage Ladder is empty. Add your first situation to get started." — this is already specific; audit should decide whether to align to the canonical wording or retain the existing (both are acceptable; document the decision).
   - ~~Achievements tab empty state~~ — N/A for MVP; Story 8.5 deferred post-MVP.

3. **Given** `ADR-ERROR-STATES.md`'s defined Base Fallback Error State ("Something went wrong. Please try again." with a single "Try again" retry action) **When** the audit encounters this exact copy used as the last-resort fallback for a genuinely unclassified or unexpected failure **Then** it is retained as-is; this story only eliminates generic copy where a more specific cause is determinable; **upon story close**, this story's audit findings are used to move `ADR-ERROR-STATES.md` status from `Draft — for review` to `Accepted`.

4. **Given** the SPIN referral screen and any clinical advisory copy **When** reviewed in this audit **Then** they are explicitly excluded from generic error copy replacement — clinical copy is owned by decisions locked in Epic 2; this story does not alter clinical copy or crisis banner copy.

5. **Given** all updated error and empty states **When** a screen reader reads an error state **Then** the error message `<Text>` node (not a wrapping `<View>`) has `accessibilityLiveRegion="polite"` (or `"assertive"` for blocking errors that prevent all further interaction); the message is not communicated solely via colour or icon; **pre-audit finding:** zero uses of `accessibilityLiveRegion` exist in the repo today — every error `<Text>` node added or updated by this story must include it.

6. **Given** `ADR-ERROR-STATES.md`'s requirement for an App-Level Error Boundary **When** this story is implemented **Then** `apps/mobile/app/_layout.tsx` exports a named `ErrorBoundary` function (Expo Router v6 pattern — see Dev Notes); the boundary renders a full-screen neutral view with the **hardcoded** English copy "The app encountered an error. Please close and reopen it." (do NOT use `t()` — the i18n provider may not be initialized at crash time; see Dev Notes); and no retry button (the error boundary is an explicit ADR exception to the Base Fallback retry requirement — no retry is correct and intentional); the boundary logs to Sentry via `Sentry.captureException(error)` in a `useEffect([error])` (Sentry is already imported in `_layout.tsx`). No new `en.json` key is added for the boundary.

## Tasks / Subtasks

- [ ] **Task 1 — Audit all error surfaces and produce inventory (AC: 1)**
  - [ ] 1.1 Read every screen file under `apps/mobile/app/` (see Dev Notes § Screen inventory checklist for the full list of files). For each file record: does it have any error or empty states? What is the current copy or handling (UI message vs. silent console.error)?
  - [ ] 1.2 Check each component in `apps/mobile/src/components/` for inline error handling.
  - [ ] 1.3 Check i18n copy in `apps/mobile/src/i18n/locales/en.json` for any keys matching `error`, `failed`, `try again` patterns.
  - [ ] 1.4 Create `apps/mobile/docs/error-state-inventory.md` with the completed table (Screen/Component | Error Surface | Current Copy or "silent" | Classification P0/P1/P2/OK | Action Taken).
  - [ ] 1.5 **Pre-identified findings to include in the inventory** (confirmed during story creation + spec review — do not re-discover):
    - `app/(onboarding)/ladder.tsx:79` — `enqueue('fear_ladder_items', 'INSERT', ...)` catch silently logs to console (`// TODO(Epic 6): surface error toast and retry path`); no user-visible error. **Classification: P1** — user adds a ladder item thinking it saved; silent failure means data loss with no feedback.
    - `app/(onboarding)/assessment.tsx:42` — `enqueue('user_onboarding_metadata', 'INSERT', ...)` catch silently logs (catch is at line 42; TODO comment is at line 44). **Classification: P1** — calibration value lost silently; additionally the `return` in the catch blocks `router.replace('/(onboarding)/ladder')` from firing, stranding the user on the assessment screen with no explanation.
    - `app/_layout.tsx` — No React error boundary exists. **Classification: P0** — ADR-ERROR-STATES.md explicitly requires one here; unhandled render errors crash the app with a bare native crash screen.
    - `app/(auth)/otp-verification.tsx:248,250` — `errorText` `Text` nodes lack `accessibilityLiveRegion`. **Classification: P1** — screen reader users miss error announcements.
    - `app/(app)/settings/index.tsx` (the `actionError` Text) — lacks `accessibilityLiveRegion`. **Classification: P1**.
    - `app/ladder.tsx:217` (emptyState Text) — lacks `accessibilityLiveRegion`. **Classification: P1** — though the empty state copy is already good, it should be announced on appearance.
    - `app/(app)/_layout.tsx:147` — recovery-end `enqueue('fear_ladder_items', 'UPDATE', ...)` catch silently logs; ladder item may remain stuck in `in_progress` status server-side. **Classification: P1**.
    - `app/session/intent.tsx:123` — session-start `enqueue()` catch silently logs; `return` in catch blocks `router.push` so user is stranded on the intent screen with no explanation. **Classification: P0**.
    - `app/session/active.tsx:142` — session-completion `enqueue()` catch silently logs; `return` in catch strands user on the active screen with no recovery path. **Classification: P0**.
    - `app/session/debrief.tsx:111` — reflection submission has a completely empty `catch` block (no log, no message); user stuck on debrief screen. **Classification: P1**.
    - `app/session/grounding.tsx:55` — abandonment `enqueue()` catch silently logs; MMKV is cleared (session cannot be recovered) but server-side status update is dropped. **Classification: P1**.
    - `app/(auth)/sign-in.tsx:245` — `errorKey` Text node lacks `accessibilityLiveRegion`. **Classification: P1**.
    - `app/reminder-settings.tsx:225` — `permissionError` Text node lacks `accessibilityLiveRegion`. **Classification: P1**.
    - `app/(app)/index.tsx:125` — home-screen empty-ladder Text (same `ladder.emptyState` i18n key as `app/ladder.tsx:217` but a separate rendering) lacks `accessibilityLiveRegion`. **Classification: P1**.

- [ ] **Task 2 — Remediate silent-failure error surfaces (AC: 2)**
  - [ ] 2.1 In `app/(onboarding)/ladder.tsx`: after the `catch` block at line ~79, surface a user-visible error message. Use a local `useState<string | null>` for an error string; render a `<Text accessibilityLiveRegion="polite" ...>{errorMessage}</Text>` near the add-item form. Also add a `<Pressable>` "Try saving again" button that re-attempts the `enqueue()` call (ADR Base Fallback requires a retry tap target). Add i18n keys: `onboarding.fearLadder.saveFailed` = "We couldn't save that situation. It's stored on your device and will sync when you reconnect." and `onboarding.fearLadder.trySaving` = "Try saving again". Remove or replace the TODO comment.
  - [ ] 2.2 In `app/(onboarding)/assessment.tsx`: after the `catch` block at line ~42 (note: line 42 is the catch; line 44 is the TODO comment), surface a user-visible error message. Same pattern as 2.1 — include both the error `<Text>` and a `<Pressable>` retry button. **Additional gap:** the `return` inside this catch block also prevents `router.replace('/(onboarding)/ladder')` from firing — the user is stranded on the assessment screen. The retry path must either succeed (and navigate) or make clear the user is stuck. Add i18n keys: `onboarding.assessment.saveFailed` = "We couldn't save your calibration score. It's stored on your device and will sync when you reconnect." and `onboarding.assessment.trySaving` = "Try saving again". Remove or replace the TODO comment.
  - [ ] 2.3 Audit any other silent console-error-only failures found in Task 1.2; add user-visible copy + retry affordance for each P0/P1 finding.

- [ ] **Task 3 — Add `accessibilityLiveRegion` to all error Text nodes (AC: 5)**
  - [ ] 3.1 `app/(auth)/otp-verification.tsx:248` — add `accessibilityLiveRegion="polite"` to the `errorKey` error `Text` node.
  - [ ] 3.2 `app/(auth)/otp-verification.tsx:250` — add `accessibilityLiveRegion="polite"` to the `consentError` error `Text` node.
  - [ ] 3.3 `app/(app)/settings/index.tsx` — add `accessibilityLiveRegion="polite"` to the `actionError` `Text` node.
  - [ ] 3.4 `app/ladder.tsx:217` — add `accessibilityLiveRegion="polite"` to the emptyState `Text` node (empty states may appear dynamically and should be announced).
  - [ ] 3.5 `app/(auth)/sign-in.tsx:245` — add `accessibilityLiveRegion="polite"` to the `errorKey` error `Text` node.
  - [ ] 3.6 `app/reminder-settings.tsx:225` — add `accessibilityLiveRegion="polite"` to the `permissionError` `Text` node.
  - [ ] 3.7 `app/(app)/index.tsx:125` — add `accessibilityLiveRegion="polite"` to the home-screen empty-ladder `Text` node (same `ladder.emptyState` key as ladder.tsx:217 but a separate rendering).
  - [ ] 3.8 Any new error Text nodes added in Task 2 must also have `accessibilityLiveRegion="polite"` — verify all are covered.
  - [ ] 3.9 Verify no error state communicates solely via colour or icon — confirm each has readable text content.

- [ ] **Task 4 — Implement App-Level Error Boundary (AC: 6)**
  - [ ] 4.1 Add the `ErrorBoundary` named export to `apps/mobile/app/_layout.tsx` using the Expo Router v6 pattern (see Dev Notes § Error Boundary implementation). The boundary must: render a full-screen view; display the hardcoded English string "The app encountered an error. Please close and reopen it." directly — do NOT use `t()` or `useTranslation()`; call `Sentry.captureException(error)` in a `useEffect([error])`; have no retry button; add `accessibilityLiveRegion="polite"` to the message `<Text>` node; destructure only `{ error }` from `ErrorBoundaryProps` (do not include `retry` — unused prop triggers lint).
  - [ ] ~~4.2 Add i18n key~~ — **DROPPED** (D1 resolution): the boundary uses hardcoded English; no `errors.boundary` key is added to `en.json`. The existing `"error"` (singular) key for `+not-found.tsx` is unaffected.
  - [ ] 4.3 Verify the boundary renders by temporarily throwing in `RootLayout` (e.g. `throw new Error('test')` at top of the function), confirming the boundary screen appears rather than a bare native crash. Revert the throw after verification — confirm revert with `grep -r 'throw new Error' apps/mobile/app/_layout.tsx` (must return no results). Record the result in Completion Notes.

- [ ] **Task 5 — jest-native tests for all newly-surfaced error paths (ADR requirement)**
  - [ ] 5.1 For each error path added or modified in Tasks 2–4, write one jest-native test that: renders the screen/component with the relevant hook returning an error, asserts the error message text is present, and asserts `accessibilityLiveRegion="polite"` is set on the error `<Text>`. Minimum: one test per newly-added error state (ladder.tsx, assessment.tsx, intent.tsx, active.tsx, debrief.tsx, grounding.tsx, (app)/_layout.tsx recovery path, sign-in.tsx, reminder-settings.tsx).
  - [ ] 5.2 For the ErrorBoundary (Task 4), write a test that renders a component that throws inside the boundary and asserts the fallback copy is displayed.
  - [ ] 5.3 Run `pnpm turbo test` and confirm all new tests pass before marking this task complete.

- [ ] **Task 6 — Update ADR-ERROR-STATES.md to Accepted (AC: 3)**
  - **Must not be completed until Task 7 (Validation) passes.**
  - [ ] 6.1 Update the `**Status:**` line in `_bmad-output/planning-artifacts/adrs/ADR-ERROR-STATES.md` from `Draft — for review` to `Accepted`.
  - [ ] 6.2 Add a one-line note below the status indicating the audit date: `**Accepted:** 2026-{date} — Story 9.6 audit complete; findings documented in \`apps/mobile/docs/error-state-inventory.md\`.`

- [ ] **Task 7 — Validation (AC: 1–6)**
  - [ ] 7.1 Run `pnpm turbo typecheck lint test` repo-wide; confirm all packages green.
  - [ ] 7.2 Manually verify the error boundary renders (from Task 4.3 — confirm it has been reverted before running this step; verify with `grep -r 'throw new Error' apps/mobile/app/_layout.tsx` returning no results).
  - [ ] 7.3 Verify `apps/mobile/docs/error-state-inventory.md` has a row for every file in the screen inventory checklist (or an explicit "no error surfaces" notation per file).
  - [ ] 7.4 Confirm `ADR-ERROR-STATES.md` status is `Accepted`.
  - [ ] 7.5 Grep the repo for `accessibilityLiveRegion` — confirm all error/empty-state `Text` nodes added or modified by this story have it.

### Review Findings

- [x] [Review][Decision] AC 6 i18n contradiction — **Resolved (a)**: AC 6 corrected to hardcoded English; Task 4.2 dropped; no `errors.boundary` en.json key.
- [x] [Review][Decision] Missing jest-native tests — **Resolved (a)**: Task 5 added for jest-native error-path tests.
- [x] [Review][Decision] ADR component state matrix absent from scope — **Resolved (b)**: inventory rows added to Dev Notes; deferred-work gate entries for all 6 components.
- [x] [Review][Decision] Missing retry tap target in Task 2 — **Resolved (a)**: Task 2.1/2.2 updated to include Pressable retry affordance; copy updated with data-status clause.
- [x] [Review][Patch] assessment.tsx catch line stale + navigation-blocking — **Applied**: Task 1.5 and Dev Notes table corrected to line 42; navigation-blocking consequence documented.
- [x] [Review][Patch] Five missed session-screen silent enqueue failures — **Applied**: all five added to Task 1.5 pre-identified list and Dev Notes table; File List updated.
- [x] [Review][Patch] Three missed accessibilityLiveRegion gaps — **Applied**: sign-in.tsx, reminder-settings.tsx, (app)/index.tsx added to Task 3 (as 3.5–3.7) and File List.
- [x] [Review][Patch] Error boundary `<Text>` needs accessibilityLiveRegion — **Applied**: added to Task 4.1 and Dev Notes code sample.
- [x] [Review][Patch] Task 6 ordering risk — **Applied**: "Must not be completed until Task 7 passes" added to Task 6.
- [x] [Review][Patch] P0/P1/P2/OK never defined — **Applied**: classification definitions table added to Dev Notes.
- [x] [Review][Patch] P2 action undefined — **Applied**: P2 action guidance added to classification table.
- [x] [Review][Patch] Task 2 copy omits data-status clause — **Applied**: copy updated to "It's stored on your device and will sync when you reconnect" in Tasks 2.1/2.2.
- [x] [Review][Patch] AC 3/AC 6 retry contradiction — **Applied**: parenthetical added to AC 6 ("explicit ADR exception...").
- [x] [Review][Patch] AC 5 "container" vs `<Text>` node — **Applied**: AC 5 updated to read "`<Text>` node".
- [x] [Review][Patch] Task 6.2 revert verification vague — **Applied**: explicit grep command added to Task 4.3 and Task 7.2.
- [x] [Review][Patch] AC 1 completeness criterion subjective — **Applied**: Task 7.3 updated to require row-per-file completeness check.
- [x] [Review][Patch] AC 4 crisis.tsx scope ambiguity — **Applied**: mixed-scope file guidance added to Excluded from scope section.
- [x] [Review][Patch] ErrorBoundaryProps retry prop lint — **Applied**: destructure `{ error }` only note added to Task 4.1.
- [x] [Review][Defer] Error Text render position underspecified for Task 2 ("near the add-item form") — developer judgment call at implementation time, not a spec defect. [deferred, pre-existing]

## Dev Notes

### Pre-identified error surface gaps (confirmed before story creation)

These were confirmed by reading the actual source files — the dev agent should not re-discover them from scratch:

| File | Line | Current State | Gap | Class |
|---|---|---|---|---|
| `app/(onboarding)/ladder.tsx` | 79 | `catch` → `console.error` + early return; TODO comment | No user-visible error on `enqueue()` failure | P1 |
| `app/(onboarding)/assessment.tsx` | 42 | `catch` → `console.error` + early return; TODO at 44; `return` blocks navigation | No user-visible error; user stranded on screen | P1 |
| `app/_layout.tsx` | — | No `ErrorBoundary` export | ADR requires one; unhandled render errors produce native crash | P0 |
| `app/(auth)/otp-verification.tsx` | 248, 250 | `<Text style={styles.errorText}>` | Missing `accessibilityLiveRegion="polite"` | P1 |
| `app/(app)/settings/index.tsx` | `actionError` Text | Inline `<Text style={styles.errorText}>` | Missing `accessibilityLiveRegion="polite"` | P1 |
| `app/ladder.tsx` | 217 | `<Text style={styles.emptyState}>` | Missing `accessibilityLiveRegion="polite"` | P1 |
| `app/(app)/_layout.tsx` | ~147 | `catch` → `console.error` | Recovery-end enqueue silent fail | P1 |
| `app/session/intent.tsx` | ~123 | `catch` → `console.error`; `return` blocks navigation | User stranded on intent screen | P0 |
| `app/session/active.tsx` | ~142 | `catch` → `console.error`; `return` blocks navigation | User stranded after session-completion attempt | P0 |
| `app/session/debrief.tsx` | ~111 | Empty `catch {}` | Reflection lost silently; user stuck | P1 |
| `app/session/grounding.tsx` | ~55 | `catch` → `console.error`; MMKV already cleared | Session orphaned server-side | P1 |
| `app/(auth)/sign-in.tsx` | 245 | `<Text style={styles.errorText}>` | Missing `accessibilityLiveRegion="polite"` | P1 |
| `app/reminder-settings.tsx` | 225 | `<Text style={styles.permissionErrorText}>` | Missing `accessibilityLiveRegion="polite"` | P1 |
| `app/(app)/index.tsx` | 125 | `<Text style={styles.placeholder}>` (same key as ladder.tsx:217) | Missing `accessibilityLiveRegion="polite"` | P1 |

### Existing copy that is already correct — do NOT replace

These are already specific, calm, and actionable. The audit should classify them as OK:

| Key | Current value | Classification |
|---|---|---|
| `auth.otp.invalidCode` | "Invalid code. Please try again." | OK — specific |
| `auth.otp.expired` | "Code has expired. Please request a new one." | OK — specific |
| `auth.otp.sendError` | "Failed to send code. Please try again." | OK — specific |
| `auth.safety.consentWriteFailed` | "We couldn't save your consent record. Please try again." | OK — specific |
| `settings.signOutError` | "Sign out failed. Please try again." | OK — reasonably specific |
| `settings.deleteAccountError` | "Failed to submit deletion request. Please try again." | OK — specific |
| `ladder.emptyState` | "Your Courage Ladder is empty. Add your first situation to get started." | OK — specific; epics canonical differs slightly ("Tap 'Build your ladder'") but both are acceptable; document in inventory and keep existing unless a deliberate copy change is preferred |
| `helplines.unavailable` | "Helpline information is not available in your region yet." | OK — specific empty state |
| `onboarding.resumeFailed.toast` | "Couldn't restore your progress. Starting from step 1." | OK — specific |

### Classification definitions (P0 / P1 / P2 / OK)

Used throughout this story's inventory and pre-identified findings:

| Label | Meaning | Action |
|---|---|---|
| **P0** | App crash, unrecoverable state, or complete data loss with no user feedback | Fix in this story |
| **P1** | Silent failure, user stranded, or missing `accessibilityLiveRegion` on an error/empty-state `Text` node | Fix in this story |
| **P2** | Suboptimal copy, minor UX gap, or low-risk omission | Document in inventory as "P2 — deferred" in Action Taken; do not fix unless trivially co-located with a P0/P1 fix |
| **OK** | Already specific, calm, and actionable — no change needed | Document in inventory as "OK" in Action Taken |

### ADR component state matrix — not-yet-implemented components

The ADR's Required State Variants table mandates error states for six named components before each enters its implementation sprint. None are implemented yet — they are post-MVP. Include the following rows in `apps/mobile/docs/error-state-inventory.md` with the notation below. These rows serve as pre-implementation gates: any story implementing one of these components **must** include a full error/empty/loading state spec before sprint sign-off.

| Component | Required states (per ADR) | Action Taken |
|---|---|---|
| `HomeStateCard` | error, success | Component not yet implemented. Error state required before implementation sprint. |
| `DragRankList` | loading, empty, error, success | Component not yet implemented. Error state required before implementation sprint. |
| `SudsArcChart` | loading, error, success (empty → `insufficient-data`) | Component not yet implemented. Error state required before implementation sprint. |
| `LetterToSelfEditor` | error, success | Component not yet implemented. Error state required before implementation sprint. |
| `LetterReveal` | loading, error, success | Component not yet implemented. Error state required before implementation sprint. |
| `AcknowledgementCard` | error, success | Component not yet implemented. Error state required before implementation sprint. |

### Excluded from scope

- **Clinical copy**: Crisis banners (`onboarding.crisisDetected.banner`, `ladder.crisis.banner`, `session.debrief.crisisHeading`) — owned by Epic 2; do not alter.
- **`app/calm-me/helplines.tsx` call failure**: `Linking.openURL` failure only logs to console. Per ADR-ERROR-STATES.md the `HelplineCard` has no `error` state — failure gracefully renders the `empty` variant (the list stays visible). This is correct; no user-visible error needed for a `tel:` link failure.
- **`error.notFoundTitle`/`error.screenNotFound`/`error.goHome`**: These are for the `+not-found.tsx` route (404 screen), not runtime errors. Keep as-is.
- **Mixed-scope files**: If a file (e.g. `app/(onboarding)/crisis.tsx`) contains both clinical copy (excluded) and non-clinical error handling (in-scope), apply the audit to the non-clinical portions only and annotate the inventory row: "Clinical copy excluded per AC 4; non-clinical error handling audited."

### Error Boundary implementation — Expo Router v6 pattern

Expo Router v6 (used in this project: `"expo-router": "~6.0.23"`) supports a named `ErrorBoundary` export from any layout or route file. The runtime wraps it in a class component internally, so this function component pattern works:

```tsx
import type { ErrorBoundaryProps } from 'expo-router'
import * as Sentry from '@sentry/react-native'
import { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  // Do NOT use useTranslation() here — the i18n provider may not be available
  // if the crash occurs before the i18n side-effect runs. Use the hardcoded
  // English string directly; this is the last-resort fallback, not a localised UI.
  return (
    <View style={errorBoundaryStyles.container}>
      <Text accessibilityLiveRegion="polite" style={errorBoundaryStyles.message}>
        The app encountered an error. Please close and reopen it.
      </Text>
    </View>
  )
}

const errorBoundaryStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#ffffff' },
  message: { fontSize: 16, color: '#111827', textAlign: 'center', lineHeight: 24 },
})
```

**Important:** Place the `ErrorBoundary` export **before** `RootLayout` in the file, or as a named export alongside the default export — both work with Expo Router v6. The boundary does not need to import `t()` since it must work even if `i18n` failed to initialise.

The ADR says no retry button — this is an explicit ADR exception to the Base Fallback retry requirement. Destructure only `{ error }` from `ErrorBoundaryProps`; do not include `retry` in the destructuring (unused prop triggers lint violations).

Sentry is already imported in `_layout.tsx` (`import * as Sentry from '@sentry/react-native'`) and initialised via `initErrorHandler()` at module scope before React renders.

### Inventory doc format

`apps/mobile/docs/error-state-inventory.md` should use this table:

```
| Screen / Component | Error Surface | Current Copy (or "silent") | Classification | Action Taken |
```

Precede the table with a short preamble noting the audit date, the story, and a reference to ADR-ERROR-STATES.md. The document is the audit record — it is a durable artefact analogous to `docs/accessibility-audit.md` from Story 9.3.

### Screen inventory checklist (all files to read in Task 1.1)

```
app/_layout.tsx                         ← error boundary gap (pre-confirmed)
app/+not-found.tsx                      ← 404 only, likely OK
app/(auth)/_layout.tsx                  ← auth gate; check for null/loading states
app/(auth)/sign-in.tsx                  ← check error handling
app/(auth)/otp-verification.tsx         ← accessibilityLiveRegion gap (pre-confirmed)
app/(onboarding)/_layout.tsx
app/(onboarding)/welcome.tsx
app/(onboarding)/assessment.tsx         ← silent fail (pre-confirmed)
app/(onboarding)/ladder.tsx             ← silent fail (pre-confirmed)
app/(onboarding)/crisis.tsx
app/(onboarding)/complete.tsx
app/(app)/_layout.tsx                   ← session recovery modal; check error display
app/(app)/index.tsx                     ← home screen empty-ladder state
app/(app)/settings/index.tsx            ← actionError Text gap (pre-confirmed)
app/ladder.tsx                          ← emptyState Text gap (pre-confirmed)
app/calm-me/_layout.tsx
app/calm-me/index.tsx                   ← CalmMe root; must never show error (ADR)
app/calm-me/breathing.tsx
app/calm-me/grounding.tsx
app/calm-me/helplines.tsx               ← call failure; confirmed OK (silent per ADR)
app/session/_layout.tsx
app/session/intent.tsx                  ← enqueue for intent; check error path
app/session/pause.tsx
app/session/technique.tsx
app/session/briefing.tsx
app/session/active.tsx                  ← SUDS log enqueue; check error path
app/session/grounding.tsx
app/session/debrief.tsx                 ← enqueue for debrief; check error path
app/session/abandoned.tsx
app/privacy-notice.tsx
app/reminder-settings.tsx
src/components/auth/SafetyCheckboxes.tsx
src/components/CalmMeFab.tsx            ← must never show loading/error (ADR)
src/components/settings/DeleteAccountModal.tsx
src/components/onboarding/FearItemForm.tsx
```

### `accessibilityLiveRegion` usage note

`accessibilityLiveRegion` is a React Native `View` and `Text` prop (not just `View`). On iOS it maps to `UIAccessibilityTraitUpdatesFrequently`; on Android it maps to `android:accessibilityLiveRegion`. Use `"polite"` for non-blocking error messages that appear below/beside an input. Use `"assertive"` only for modal-blocking errors that replace the entire screen (very rare).

The prop can be placed directly on the `<Text>` component:
```tsx
<Text accessibilityLiveRegion="polite" style={styles.errorText}>{message}</Text>
```

### i18n key conventions

- New keys follow the existing nesting pattern: `section.subsection.keyName` in camelCase.
- `en.json` already has `"error"` (singular, for `+not-found.tsx`). Add `"errors"` (plural) as a new top-level key for the boundary message to avoid confusion.
- For onboarding save failures, add under the existing `"onboarding"` → `"fearLadder"` and `"assessment"` subsections respectively.

### No project-context.md

No `project-context.md` file was found in this repo — this is expected and consistent with prior Epic 9 stories.

### Previous story (9.4) relevance

Story 9.4 (MMKV Key Hygiene) added `packages/supabase/.eslintrc.js` and updated `implementation-patterns-consistency-rules.md`. This story does not touch packages/supabase or lint configuration — the only carry-over is the standard validation command: `pnpm turbo typecheck lint test`.

Story 9.5 (E2E Smoke Suite — Maestro) is still in `backlog` status (no story file exists yet) and has no bearing on this story.

### What success looks like

- `apps/mobile/docs/error-state-inventory.md` exists with complete table.
- Every P0 and P1 finding is resolved (either by code change or documented rationale for retention).
- P2 findings are documented in the inventory with "P2 — deferred" in Action Taken.
- `accessibilityLiveRegion="polite"` present on every error/empty-state `Text` in the audit scope.
- An `ErrorBoundary` export exists in `_layout.tsx` and has been manually verified.
- `ADR-ERROR-STATES.md` status is `Accepted`.
- `pnpm turbo typecheck lint test` green.

### References

- [Source: `_bmad-output/planning-artifacts/adrs/ADR-ERROR-STATES.md`] — Component Error State Specification; state-variant matrix; base fallback; error boundary requirement; moves to Accepted at story close
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 9.6`] — Acceptance criteria, canonical replacement copy
- [Source: `apps/mobile/src/i18n/locales/en.json`] — Complete i18n copy; existing keys that are already correct
- [Source: `apps/mobile/app/(onboarding)/ladder.tsx:79`] — Silent enqueue failure (P1 gap)
- [Source: `apps/mobile/app/(onboarding)/assessment.tsx:44`] — Silent enqueue failure (P1 gap)
- [Source: `apps/mobile/app/_layout.tsx`] — Error boundary missing (P0 gap); Sentry already imported here
- [Source: `apps/mobile/app/(auth)/otp-verification.tsx:248,250`] — Missing `accessibilityLiveRegion`
- [Source: `apps/mobile/app/(app)/settings/index.tsx`] — Missing `accessibilityLiveRegion` on `actionError`
- [Source: `apps/mobile/app/ladder.tsx:217`] — Missing `accessibilityLiveRegion` on emptyState
- [Source: `apps/mobile/src/error-handler.ts`] — Sentry initialisation pattern; already wired before React renders
- [Source: `apps/mobile/docs/accessibility-audit.md`] — Precedent for durable audit doc format (Story 9.3)
- [Source: `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`] — Naming, structure, i18n patterns

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6) — story context generated by create-story workflow; implementation agent model recorded here on dev-story run.

### Debug Log References

### Completion Notes List

### File List

- New: `apps/mobile/docs/error-state-inventory.md`
- Modified: `apps/mobile/app/_layout.tsx` (add `ErrorBoundary` export — hardcoded English, no i18n)
- Modified: `apps/mobile/src/i18n/locales/en.json` (add `onboarding.fearLadder.saveFailed`, `onboarding.fearLadder.trySaving`, `onboarding.assessment.saveFailed`, `onboarding.assessment.trySaving` — **no** `errors.boundary` key)
- Modified: `apps/mobile/app/(onboarding)/ladder.tsx` (surface error Text + retry Pressable on enqueue failure)
- Modified: `apps/mobile/app/(onboarding)/assessment.tsx` (surface error Text + retry Pressable on enqueue failure; fix navigation-blocking return)
- Modified: `apps/mobile/app/(auth)/sign-in.tsx` (add `accessibilityLiveRegion` to errorKey Text)
- Modified: `apps/mobile/app/(auth)/otp-verification.tsx` (add `accessibilityLiveRegion` to error Text nodes)
- Modified: `apps/mobile/app/(app)/_layout.tsx` (surface error on recovery-end enqueue failure)
- Modified: `apps/mobile/app/(app)/index.tsx` (add `accessibilityLiveRegion` to home-screen empty-ladder Text)
- Modified: `apps/mobile/app/(app)/settings/index.tsx` (add `accessibilityLiveRegion` to actionError Text)
- Modified: `apps/mobile/app/ladder.tsx` (add `accessibilityLiveRegion` to emptyState Text)
- Modified: `apps/mobile/app/session/intent.tsx` (surface error + fix navigation-blocking return on enqueue failure)
- Modified: `apps/mobile/app/session/active.tsx` (surface error + fix navigation-blocking return on enqueue failure)
- Modified: `apps/mobile/app/session/debrief.tsx` (surface error on reflection submission failure)
- Modified: `apps/mobile/app/session/grounding.tsx` (surface error on abandonment enqueue failure)
- Modified: `apps/mobile/app/reminder-settings.tsx` (add `accessibilityLiveRegion` to permissionError Text)
- Modified: `_bmad-output/planning-artifacts/adrs/ADR-ERROR-STATES.md` (status → Accepted)
- Potentially modified: additional screen files where Task 1 audit finds further P0/P1 gaps

## Change Log

| Date | Change |
|---|---|
| 2026-06-24 | Story 9.6 created via create-story workflow. Pre-audit analysis confirmed: 6 concrete gaps (2 silent enqueue failures in onboarding, missing error boundary in _layout.tsx, missing accessibilityLiveRegion on 3 error Text nodes); 0 instances of accessibilityLiveRegion anywhere in the repo; ADR-ERROR-STATES.md still in Draft status. Existing copy for OTP errors, settings actions, ladder empty state, helplines unavailable all confirmed correct — marked as OK in Dev Notes to prevent unnecessary churn. |
| 2026-06-24 | Pre-dev spec review complete (3-layer adversarial: Blind Hunter + Edge Case Hunter + Acceptance Auditor). 4 decisions resolved via party-mode roundtable; 14 patches applied to spec; 1 deferred. Key changes: 8 additional P0/P1 gaps added to pre-identified list (5 session-screen silent enqueue failures, 3 missed accessibilityLiveRegion nodes); Task 4.2 (en.json errors.boundary key) dropped; Task 5 added for jest-native tests; Tasks renumbered (old 5→6, old 6→7); retry Pressable added to Task 2.1/2.2; copy updated with data-status clause; ADR component matrix inventoried as post-MVP gate rows; classification table added to Dev Notes. |
