# ADR-OFFLINE-DEGRADATION — Offline Degradation Policy

**Status:** Shell — policy definition required  
**Owner:** Engineering lead  
**Required before:** F3 and F4 implementation sprints

---

## Context

The UX design specification requires an offline degradation policy before F3 (core exposure loop) and F4 (mid-exposure crisis / Calm Me) implementation begins. The policy must define what the app does when network is unavailable, to ensure clinical safety during high-stakes moments.

Current spec commitment: "Calm Me and grounding techniques functional without network; session state server-persisted with local cache."

This ADR defines what "functional without network" means concretely for each affected flow.

---

## Scope

Flows requiring offline policy before implementation:

| Flow | Offline risk | Clinical stakes |
|------|-------------|-----------------|
| F3 — Core exposure loop | SUDS logging may fail; session state may not persist | Medium — user can continue, data may be lost |
| F4 — Calm Me / crisis | Grounding techniques must render | **High** — user may be in acute anxiety |
| F5 — Re-engagement | Re-calibration check-in may fail | Low — user can still navigate home |
| F6 — Post-exposure reflection | Debrief save may fail | Medium — data loss risk |

---

## Policy Decisions Required

### 1. Minimum offline capability (hard requirements)

The following must work without network — no exceptions:

- [ ] `CalmMeButton` tap → `CalmMeOverlay` renders
- [ ] `GroundingPrompt` (5-4-3-2-1) renders all 5 steps
- [ ] `BreathingCoach` renders (Phase 2 — confirm offline by Phase 2 sprint)
- [ ] All static onboarding screens render

### 2. SUDS logging offline behaviour

When user logs SUDS with no network:

- [ ] **Option A:** Queue locally, sync on reconnect; show "saved locally" indicator
- [ ] **Option B:** Show error toast "Couldn't save — try again"; block advancement
- [ ] **Option C:** Save to local state only; accept potential loss; no user indication

Recommendation: Option A (local queue with sync). Avoids blocking the user mid-exposure.

### 3. Session state offline behaviour

When session state cannot be confirmed with server:

- [ ] Read from last local cache; show degraded indicator
- [ ] Block session start with "check your connection" screen
- [ ] Proceed silently from cache; reconcile on reconnect

### 4. Reconnection reconciliation

On network restore:

- [ ] Define conflict resolution: server wins? client wins? manual merge?
- [ ] Define what happens to queued SUDS data if session was also modified server-side

### 5. F4 crisis screens offline guarantee

Define specific guarantee: Calm Me must function for X minutes without network after last successful sync. Define what "function" means if `HelplineCard` remote config is unavailable (bundled fallback? omit gracefully?).

---

## Related Decisions

- `HelplineCard` remote config fallback: see `ADR-HELPLINE-CONFIG`
- Session state persistence: Supabase local-first or optimistic writes required

---

## Status

This is a shell ADR. The policy decisions above must be answered before F3/F4 sprint planning. Engineering lead owns the first draft; clinical review required for any decision that affects the F4 crisis flow.
