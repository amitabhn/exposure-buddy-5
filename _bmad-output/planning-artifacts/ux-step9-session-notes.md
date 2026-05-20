# UX Step 9 — Design Directions: Session Notes

**Status:** Advanced Elicitation in progress. Cross-Functional War Room (method 2) complete — all findings accepted. Returning to elicitation menu.

**Branch:** `docs/ux-design-step-9`

**Resume at:** Advanced Elicitation menu — present 1–5/r/a/x. On [x], present full Step 9 content for A/P/C menu.

---

## Design Artifacts

- `_bmad-output/planning-artifacts/ux-design-directions.html` — 8 structural direction variations (generated at step start, not the chosen direction)
- `_bmad-output/planning-artifacts/ux-home-screen.html` — **chosen direction** — 4 context states with all feedback applied (current mockup)

---

## Chosen Direction (Current State)

**Companion Voice + Context-Aware Home**

Single-column home screen. Layout hierarchy per state:
```
Greeting (contextual)
Illustration (register-matched SVG)
Context card (what the app knows)
Highlighted CTA (one clear path forward)
Secondary options — Try a challenge · Relaxation technique · Read/other
Bottom nav — Home · Ladder · Achievements · Profile
🌊 Calm Me button — top-right, teal pill, always present
```

### Confirmed Decisions (Locked)
- Greeting: personalised by name + date/eyebrow
- Deadline ("31 hrs left") removed from home screen entirely — exists as data, not surfaced
- Active Thread greeting (state 4 — progressing): **"Almost there, keep going!"**
- Calm Me button: top-right, 🌊 icon, teal pill, always present across all 10 states — users open the app during anxious moments, zero-navigate access is a safety requirement
- SUDS display rule: plain language first + numbers inline (e.g. "7/10") + 0–10 comparison bar
- Post-exposure expiry: **6h only** (midnight boundary dropped — DST risk, Winston + John + Amelia all aligned)
- Re-calibration threshold: gap > 7 days triggers check-in as primary CTA
- Single active thread at a time (MVP constraint)
- 3-open avoidance threshold: product default (not clinical basis). Documented as product assumption. Configurable in future pass.
- State 5 visibility: user sees a **different home screen** (different tone/greeting), but the word "avoidance" or any detection label is **never shown in UI copy**. Backend/clinician use only.
- `expires_at`: UTC epoch milliseconds, stored as `bigint` in Supabase, set from server time only — client never computes this value
- SUDS null-path: < 3 check-ins → suppress SUDS-derived states, fall through to `progressing`, add `suds_data_insufficient` flag to `HomeScreenContext`
- SUDS progressing threshold: `SUDS_DELTA_THRESHOLD = 1.5` (average drop ≥ 1.5 across last 3 sessions) — product placeholder, needs explicit sign-off before implementation
- `active-mid-exposure` exit: explicit debrief tap only (no timer); app kill mid-session re-enters `mid-exposure` on next foreground (not `avoidance`)
- "One open" definition: `AppState` transition to `active` + minimum 3 seconds on screen. Immediate backgrounding excluded. Debounced foreground listener, async write.

---

## Home Screen State Map (10 States)

| # | State | Trigger |
|---|-------|---------|
| 1 | First-use | No completed exposures |
| 2 | Empty ladder | Ladder has zero items |
| 3 | Morning | Default; gap ≤ 7 days; ≥ 1 prior exposure; ladder has items |
| 4 | Active thread — progressing | Thread open; < 3 opens without debrief |
| 5 | Active thread — avoidance pattern | Thread open; 3+ opens without debrief |
| 6 | Active thread — mid-exposure support | Thread open; user tapped "Get support right now" |
| 7 | Post-exposure (reflection) | Debrief complete; within expiry window |
| 8 | Window expired without debrief | WINDOW_EXPIRED reached; thread unresolved |
| 9 | Return after gap | Gap > 7 days |
| 10 | Completed ladder | All ladder items in completed state |

**Note:** State count was documented as "9 states" — corrected to 10.

### State Priority Chain (Amelia correction accepted)
```
First-use > Completed ladder > WINDOW_EXPIRED > Return after gap >
Post-exposure reflection > Active (mid-exposure > avoidance > progressing) >
Morning/Empty
```
*Post-exposure reflection ranks above Active sub-states — pending debrief takes priority over next exposure prompt.*

### Per-State Copy & Tone Decisions

| State | Greeting | Context card / tone | Primary CTA |
|-------|----------|---------------------|-------------|
| 4 — progressing | "Almost there, keep going!" | Committed label, no countdown | Start debrief / Continue |
| 5 — avoidance | "Good to see you." | "You don't have to do anything today. When you're ready, your ladder is here." | "Start debrief when ready" (soft) |
| 6 — mid-exposure | "You're doing it. That takes real courage." | Grounding prompt: "Name one thing you can see right now." No SUDS entry. | "I can keep going" (primary teal) / "I need to stop" (soft) |
| 8 — expired | — | "You started something real. Want to take a few minutes to reflect on it now?" | "Reflect now" |
| 10 — completed | "You did it." (DM Serif Display) | Two beats breathing room before CTA visible | "What's next for you?" (fades in on scroll or after 3s) |

---

## Advanced Elicitation Findings (Applied)

### From User Persona Focus Group
| # | Finding | Resolution |
|---|---------|------------|
| 1 | Morning insight card has no fallback for < 3 exposures | New user sees warm onboarding text; insight card activates after first exposure |
| 2 | "Almost there, keep going!" may feel ironic for stuck users | Avoidance state (state 5) gets different greeting: "Good to see you." |
| 3 | Countdown "31 hrs left" increases guilt for avoidance-pattern users | Countdown removed from home screen entirely |
| 4 | Morning CTA always pushes a challenge — no lower-pressure entry | Avoidance pattern morning: challenge CTA moves to secondary; grounding is primary |
| 5 | Post-exposure state needs defined expiry | Expires at: next open after 6h (midnight boundary dropped) |
| 6 | SUDS plain-language hides numbers Priya wants | Both shown: "You expected it to feel quite hard — 7/10. It actually felt like 5/10." |
| 7 | Re-calibration threshold not defined | Gap > 7 days triggers check-in |
| 8 | Design assumes single active thread | MVP: one COMMITTED state at a time. Constraint documented. |

### From What If Scenarios
| # | Finding | Resolution |
|---|---------|------------|
| S1 | Empty ladder state | New state (state 2); CTA prompts first addition |
| S2 | Mid-exposure app open | Active thread primary CTA → "Get support right now"; debrief secondary |
| S3 | Completed ladder | Milestone state (state 10); celebration first, forward CTA as invitation |
| S4 | WINDOW_EXPIRED without debrief | Context card: "You started something real. Want to reflect now?" |
| S5 | Offline | All states render from local cache; Calm Me always functional without network |

### From Cross-Functional War Room (John + Sally + Amelia)
| # | Item | Resolution |
|---|------|------------|
| W1 | 3-open avoidance threshold | Product default (not clinical). Document as product assumption. Configurable future pass. |
| W2 | State 5 visibility | User-facing different screen + tone. "Avoidance" label never shown in UI. Clinician/backend only. |
| W3 | State 5 copy | Greeting: "Good to see you." Card: "You don't have to do anything today. When you're ready, your ladder is here." |
| W4 | State 6 mid-exposure handoff | Dedicated support screen: courage affirmation + single grounding prompt + two CTAs. No SUDS entry. |
| W5 | State 8 tone | "You started something real. Want to take a few minutes to reflect on it now?" — no expiry reference. |
| W6 | State 10 celebration | "You did it." DM Serif Display confirmed. Breathing room. Forward CTA fades in. |
| W7 | Priority chain | Post-exposure reflection moves above Active sub-states (Amelia correction). |
| W8 | SUDS null-path | < 3 check-ins → fall through to progressing. `suds_data_insufficient` flag added. |
| W9 | SUDS threshold | `SUDS_DELTA_THRESHOLD = 1.5` placeholder. Needs explicit product sign-off. |
| W10 | mid-exposure exit | Debrief tap only. App kill → re-enters mid-exposure on next foreground. |
| W11 | `expires_at` format | UTC epoch ms as `bigint`. Server-set only. |
| W12 | "One open" definition | `AppState` active + 3s minimum on screen. Immediate backgrounding excluded. |
| W13 | Midnight boundary | Dropped. 6h-only rule. All three aligned. |

---

## Party Mode — Round 1 Findings (Resolved)

### Orchestrator Notes (All Resolved)
- **John vs Sally tension on Calm Me:** RESOLVED — Calm Me stays on home screen, always present. Users open during anxious moments. Zero-navigate access is a safety requirement.
- **John vs Sally on state 5 visibility:** RESOLVED — State 5 is user-facing (different screen/tone), but "avoidance" label never appears in UI copy. Compatible positions.

---

## Before Spec Lock — Open Items

- [x] Fix state count (9 → 10) in all documentation ✅
- [x] Specify avoidance pattern (state 5) greeting and tone explicitly ✅
- [x] Specify mid-exposure handoff experience ✅
- [x] Specify window expired card visual weight and tone ✅
- [x] Completed ladder: confirm DM Serif Display + breathing room ✅
- [x] Resolve 3-open threshold ✅ (product default, not clinical)
- [x] Resolve avoidance detection: user UI or clinician dashboard ✅
- [x] Resolve Amelia's 6 sprint-0 blockers ✅ (all resolved above)
- [x] Resolve Winston's midnight vs 6h expiry ✅ (6h-only adopted)
- [ ] **SUDS progressing threshold: explicit product sign-off on 1.5** (placeholder in place)

---

## What to Do at Resume

1. Advanced Elicitation menu active — present 1–5/r/a/x
2. On [x]: present full Step 9 content for A/P/C menu
3. On [C]: append Step 9 to `ux-design-specification.md`, update frontmatter `stepsCompleted: [1..9]`, load step-10-user-journeys.md
