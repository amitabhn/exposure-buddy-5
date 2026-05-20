# ADR-TECHNIQUE-SUDS-FALLBACK — TechniqueCard Fallback for Absent SUDS Data

**Status:** Draft — proposed fallback, requires product sign-off  
**Owner:** Product  
**Required before:** TechniqueCard implementation sprint

---

## Context

`TechniqueCard` displays a SUDS-based nudge text on technique selection screens: *"at a SUDS of X, most people start here."* This text is conditional on the user having a current SUDS reading.

Missing SUDS data is not an edge case — it is the guaranteed state for:
- Every first-session user (no pre-exposure SUDS logged yet)
- Users who skipped the pre-exposure gate
- Users accessing technique selection from a state where no current-session SUDS exists

The component spec currently has no `insufficient-data` state variant. Without a defined fallback, the `recommended` state will either show nothing, show stale data, or throw a render error.

---

## Proposed Fallback Behaviour

### When SUDS data is absent

Display the `without-nudge` variant: hide the nudge text entirely. All techniques are shown with equal visual weight — no `recommended` state, no nudge text. The technique selection is presented as a free choice.

**Copy change:** The section heading changes from *"Here's where to start"* (implies a recommendation is coming) to *"Choose a technique"* (neutral, non-directive).

**Rationale:**
- A user on their first session has no SUDS context — showing equal-weight options is clinically honest
- Showing a false "most people start here" nudge without SUDS data would be misleading
- The `without-nudge` variant is already specified in the component — no new UI state required

### What is not done

- No error state shown — absence of SUDS is a normal first-session condition, not a failure
- No prompt to take a SUDS reading from within this component — if SUDS is required before technique selection, the routing logic upstream should enforce it (not the component)

---

## Component State Update

Add `insufficient-data` as an explicit state to `TechniqueCard`:

| State | Trigger | Renders |
|-------|---------|---------|
| `default` | SUDS data present, this technique not recommended | Standard card, no nudge |
| `recommended` | SUDS data present, SUDS matches this technique's range | Nudge text visible |
| `selected` | User has tapped this card | Teal border + fill |
| `disabled` | Technique unavailable for current context | Greyed out |
| `insufficient-data` | No current-session SUDS data | Same as `default`; heading becomes "Choose a technique" |

---

## Routing Consideration

The `resolveHomeScreenState` function and the exposure routing logic should gate technique selection on a SUDS reading having been taken in the current session. If the gate is working correctly, `TechniqueCard` in `insufficient-data` state should appear only on first session before the gate has fired. If it appears frequently after that, it indicates a routing bug — not a TechniqueCard design issue.

---

## Decision

[ ] Accept proposed fallback (without-nudge variant, neutral heading)  
[ ] Alternative: _______________  

**Decided by:** _______________  
**Date:** _______________
