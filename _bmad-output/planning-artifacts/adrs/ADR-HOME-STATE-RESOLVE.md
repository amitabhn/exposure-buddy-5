# ADR-HOME-STATE-RESOLVE — resolveHomeScreenState Specification

**Status:** Draft — for review  
**Owner:** Engineering lead + Product  
**Required before:** HomeStateCard implementation sprint

---

## Context

`HomeStateCard` renders one of 10 discrete home screen states. The spec requires that state resolution is handled by a pure function `resolveHomeScreenState(ctx: HomeScreenContext): HomeScreenState` living in `packages/core` — the component receives the resolved state as a prop and does not resolve internally.

The 10 states and their priority rules are currently scattered across six flow diagrams (F1–F6) with no canonical type definition, no explicit priority ordering, and no test case specification. This ADR formalises that contract.

---

## Decision

### HomeScreenContext Type

```typescript
type HomeScreenContext = {
  // Account state
  hasAccount: boolean;

  // Ladder state
  hasLadder: boolean;

  // Active thread state
  activeThread: {
    exists: boolean;
    openCount: number;          // app opens with thread open, no debrief
    openDurationHours: number;  // hours since thread opened without debrief
    userDeclaredIncomplete: boolean;
    windowExpiredAt: number | null; // UTC epoch ms; null if no debrief yet
  } | null;

  // Timing
  gapDays: number;              // days since last session; 0 if today
  ladderComplete: boolean;      // all ladder items have completed exposures

  // Current time for expiry comparison
  nowMs: number;                // Date.now() — injected, not read inside function
};
```

### HomeScreenState Enum

```typescript
type HomeScreenState =
  | 'first-use'        // State 1
  | 'empty-ladder'     // State 2
  | 'morning'          // State 3
  | 'progressing'      // State 4
  | 'avoidance'        // State 5
  | 'mid-exposure'     // State 6 — reserved; resolved by in-the-moment screen, not home
  | 'post-exposure'    // State 7
  | 'expired'          // State 8
  | 'return-after-gap' // State 9
  | 'completed';       // State 10
```

### Priority Ordering (highest priority first)

Resolution is first-match wins down this ordered list:

| Priority | State | Condition |
|----------|-------|-----------|
| 1 | `first-use` | `!ctx.hasAccount` |
| 2 | `completed` | `ctx.ladderComplete` |
| 3 | `empty-ladder` | `ctx.hasAccount && !ctx.hasLadder` |
| 4 | `post-exposure` | Active thread exists AND `windowExpiredAt` not null AND `nowMs < windowExpiredAt` |
| 5 | `expired` | Active thread exists AND `windowExpiredAt` not null AND `nowMs >= windowExpiredAt` |
| 6 | `return-after-gap` | `ctx.gapDays >= 10` (provisional threshold; post-MVP review) |
| 7 | `avoidance` | Active thread AND (`openCount >= 3` OR `openDurationHours >= 6` OR `userDeclaredIncomplete`) |
| 8 | `progressing` | Active thread AND `openCount < 3` AND `openDurationHours < 6` AND `!userDeclaredIncomplete` |
| 9 | `morning` | `ctx.hasLadder && !ctx.activeThread` |
| 10 | `empty-ladder` | Fallback — should not be reached if ladder check is correct at priority 3 |

**Notes:**
- `completed` outranks `return-after-gap` (state 10 outranks state 9 — per F5 decisions)
- `mid-exposure` (state 6) is never returned by this function — it is the in-the-moment mode, resolved by the active exposure screen, not the home screen
- `nowMs` is injected as a parameter to keep the function pure and deterministic under test

### Required Test Cases (minimum)

Before merge, the implementation must include tests covering:

1. **Happy path — first-use:** No account → `first-use`
2. **Happy path — morning:** Account, ladder, no active thread, gap < 10 days → `morning`
3. **Happy path — post-exposure:** Active thread, 6h window open, 2h elapsed → `post-exposure`
4. **Happy path — expired:** Active thread, 6h window, 7h elapsed → `expired`
5. **Happy path — avoidance (open count):** Active thread, openCount = 3 → `avoidance`
6. **Happy path — avoidance (duration):** Active thread, openDurationHours = 7 → `avoidance`
7. **Happy path — completed outranks gap:** ladderComplete = true, gapDays = 15 → `completed`
8. **Edge — gap threshold boundary:** gapDays = 9 → not `return-after-gap`; gapDays = 10 → `return-after-gap`
9. **Edge — avoidance duration boundary:** openDurationHours = 5.9 → not `avoidance` (openCount = 0); openDurationHours = 6.0 → `avoidance`
10. **Edge — no ladder:** Account, no ladder → `empty-ladder`

---

## Consequences

- `HomeScreenContext` becomes the single canonical source for home state input — any upstream data fetching must produce this shape
- The priority table supersedes scattered flow diagram descriptions on any conflict
- `nowMs` injection ensures the function is testable without mocking `Date.now()`
- `mid-exposure` exclusion from this function must be documented in code — future engineers will ask why it's missing

---

## Open Questions

- Provisional gap threshold (10 days) and avoidance duration (6 hours) are both flagged for post-MVP clinical review — the function signature supports changing these without structural change
- `return-after-gap` (priority 6) currently outranks `avoidance` (priority 7) — confirm this is clinically correct: a user returning after 10 days with an avoidance-pattern thread gets the re-engagement experience, not the avoidance experience
