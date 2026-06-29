# ADR-ERROR-STATES — Component Error State Specification

**Status:** Accepted  
**Accepted:** 2026-06-24 — Story 9.6 audit complete; findings documented in `apps/mobile/docs/error-state-inventory.md`.  
**Owner:** Lead designer + Engineering lead  
**Required before:** Any component spec is signed off for implementation  
**Finalized by:** Epic 9, Story 9.6 (Error State & Empty State UX Audit) — the audit's findings move this ADR to `Accepted`; Story 9.6 replaces lazy/unclassified uses of the Base Fallback copy below but does not remove the fallback itself

---

## Context

The UX design specification defines 11 MVP components. None currently specify error states. At runtime, any component can encounter: null/missing data, network fetch failures, invalid prop shapes, or timeout conditions. Without specified error states, engineers will make independent decisions — producing inconsistent UX and untestable code.

---

## Base Fallback Error State

All components that display async or server-sourced data must implement a base error state. The base error state is:

**Visual:** A neutral card or inline text, no error icon (avoids alarm in a clinical context)  
**Copy:** *"Something went wrong. Please try again."*  
**Action:** A single "Try again" tap target that retries the failed operation  
**Accessibility:** `accessibilityLiveRegion="polite"` on the error message; error must be announced without focus trap

The base fallback is the default. Components may override copy or visual treatment where the clinical context requires a different message (e.g., `SudsArcChart` with no data is not an error — it is an expected state).

---

## Required State Variants Per Component

Every component spec must define all applicable states before implementation sprint sign-off:

| State | Description |
|-------|-------------|
| `loading` | Data is being fetched; skeleton or spinner shown |
| `empty` | Fetch succeeded; no data to display (expected condition) |
| `error` | Fetch failed or data is invalid (unexpected condition) |
| `success` | Data available; normal render path |

Not all components require all four states. The following matrix defines which states each component must specify:

| Component | loading | empty | error | success |
|-----------|---------|-------|-------|---------|
| `HomeStateCard` | — | — | ✓ | ✓ |
| `LadderItemCard` | — | — | — | ✓ |
| `DragRankList` | ✓ | ✓ | ✓ | ✓ |
| `TechniqueCard` | — | — | — | ✓ |
| `CalmMeButton` | — | — | — | ✓ |
| `SudsArcChart` | ✓ | — | ✓ | ✓ |
| `LetterToSelfEditor` | — | — | ✓ | ✓ |
| `LetterReveal` | ✓ | — | ✓ | ✓ |
| `AcknowledgementCard` | — | — | ✓ | ✓ |
| `GroundingPrompt` | — | — | — | ✓ |
| `HelplineCard` | ✓ | ✓ | — | ✓ |

**Notes:**
- `HelplineCard` already specifies `loading` and `empty` — these are correct. It has no `error` state because failure gracefully renders `empty`.
- `SudsArcChart` has `insufficient-data` which maps to its `empty` concept — rename to `insufficient-data` in component spec for clinical accuracy.
- `GroundingPrompt` and `LadderItemCard` receive static or locally-held data — no async states required.
- `CalmMeButton` must never show a loading or error state — it must render instantly. If `useCalmMeStore` is unavailable, the button still renders and the overlay opens with default state.

---

## Action Item

Before each component enters its implementation sprint:

1. Designer adds error/empty/loading state to the component's visual spec
2. Engineer adds AC covering the error path: `given [failure condition] when [component renders] then [error state is shown]`
3. Test suite includes a test for the error path using `jest-native`

---

## App-Level Error Boundary

In addition to component-level error states, a top-level React error boundary must be implemented in `apps/mobile/app/_layout.tsx`. This is the last-resort catch for unexpected render errors not handled at the component level.

**Error boundary fallback UI:**
- Full-screen neutral screen
- Copy: *"The app encountered an error. Please close and reopen it."*
- No retry in the boundary itself — the restart instruction is the recovery path
- Error boundary catch events must be logged to crash analytics (Sentry or equivalent)

---

## Consequences

- Component specs require a design round for error states before implementation begins — factor into sprint planning timeline
- All error-path ACs require `jest-native` coverage before merge
- App-level error boundary is a Phase 1 requirement, not a post-MVP task
