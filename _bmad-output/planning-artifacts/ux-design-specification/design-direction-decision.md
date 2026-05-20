# Design Direction Decision

## Design Directions Explored

Eight structural direction variations were generated and reviewed, exploring different layout approaches, navigation patterns, information densities, and visual hierarchies. Directions ranged from card-heavy dashboard layouts to minimal single-focus screens. The user identified a clear preference for a layout centred on companion voice and context-awareness rather than data density or feature grids.

## Chosen Direction

**Companion Voice + Context-Aware Home**

A single-column home screen that adapts its content, greeting, and primary CTA to the user's current clinical and emotional context. The screen does not present a static dashboard — it reads the user's state and responds to it. The layout hierarchy is fixed across all states; the content within it changes.

```
Greeting (contextual, personalised by name)
Illustration (register-matched SVG — preparing / grounding / reflecting)
Context card (what the app knows right now)
Highlighted CTA (one clear path forward)
Secondary options — Try a challenge · Relaxation technique · Read/other
Bottom nav — Home · Ladder · Achievements · Profile
🌊 Calm Me button — top-right, teal pill, always present
```

The home screen resolves to one of **10 discrete states** driven by a pure function `resolveHomeScreenState(ctx: HomeScreenContext): HomeScreenState`. The state determines which greeting, illustration, context card, and primary CTA render.

## Design Rationale

- **Companion voice over dashboard:** Users in social anxiety recovery need to feel met, not managed. A greeting and contextual card carry warmth that a metrics panel cannot.
- **Context-awareness over static layout:** The same screen layout at different emotional moments must communicate different things. A user mid-exposure needs a lifeline; a user returning after a week needs a gentle welcome back — not the same screen with different numbers.
- **Calm Me always present:** The home screen is opened *during* anxious moments as often as between them. Zero-navigate access to grounding is a safety requirement, not a nice-to-have. The button is always visible, always reachable one-handed.
- **Single CTA per state:** Multiple competing calls-to-action increase cognitive load precisely when users have the least capacity for it. One highlighted path forward, with lower-pressure secondary options below.
- **State-driven tone:** Each state has its own approved greeting and context card copy, tested for emotional safety. "Good to see you" for an avoidance-pattern user is a fundamentally different message to "Almost there, keep going!" for a progressing user.

## Implementation Approach

### Home Screen State Map

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

### State Priority Chain

The resolver applies states in this order (first match wins):

```
First-use
> Completed ladder
> WINDOW_EXPIRED
> Return after gap
> Post-exposure reflection
> Active — mid-exposure
> Active — avoidance pattern
> Active — progressing
> Morning
> Empty ladder
```

*Post-exposure reflection ranks above all Active sub-states — a pending debrief takes priority over prompting the next exposure.*

### Per-State Copy & Tone

| State | Greeting | Context card | Primary CTA |
|-------|----------|--------------|-------------|
| 4 — progressing | "Almost there, keep going!" | Committed (no countdown) | Continue / Start debrief |
| 5 — avoidance | "Good to see you." | "You don't have to do anything today. When you're ready, your ladder is here." | "Start debrief when ready" (soft) |
| 6 — mid-exposure | "You're doing it. That takes real courage." | Grounding prompt: "Name one thing you can see right now." No SUDS entry. | "I can keep going" (primary teal) / "I need to stop" (soft) |
| 8 — expired | — | "You started something real. Want to take a few minutes to reflect on it now?" | "Reflect now" |
| 10 — completed | "You did it." (DM Serif Display) | Two beats of breathing room; no CTA on first render | "What's next for you?" (fades in on scroll or after 3s) |

### Technical Decisions

**State resolution:**
- `resolveHomeScreenState(ctx: HomeScreenContext): HomeScreenState` — pure function, single entry point, no side effects
- `suds_data_insufficient` flag on `HomeScreenContext` — set when check-in count < 3; resolver falls through to `progressing` and suppresses all SUDS-derived display

**Avoidance pattern (state 5):**
- Threshold: 3 app opens on active thread without debrief tap — product default (not clinical); documented as a product assumption, configurable in a future settings pass
- "Avoidance" label is never shown in UI copy. State 5 delivers a different tone only. The detection label is for clinician dashboard and backend use exclusively.
- "One open" = `AppState` transition to `active` + minimum 3 seconds on screen. Immediate backgrounding excluded. Debounced foreground listener, async write.

**Post-exposure expiry:**
- Rule: next app open after 6 hours from exposure end (midnight boundary dropped — DST edge cases, implementation complexity, no meaningful UX benefit)
- `expires_at`: UTC epoch milliseconds stored as `bigint` in Supabase; set from server time at record creation; client never computes this value; `Date.now()` for comparison only

**`active-mid-exposure` exit:**
- Exits on explicit debrief tap only; timer-based exit is unreliable on iOS
- App kill / background mid-session → re-enters `mid-exposure` on next foreground (not `avoidance`)

**SUDS progressing threshold:**
- `SUDS_DELTA_THRESHOLD = 1.5` — average SUDS drop ≥ 1.5 across last 3 sessions counts as progressing
- This is a product placeholder; explicit sign-off required before implementation

**Completed ladder (state 10):**
- DM Serif Display for the celebration moment — confirmed
- Forward CTA ("What's next for you?") fades in on scroll or after 3 seconds; restrained by design

---
