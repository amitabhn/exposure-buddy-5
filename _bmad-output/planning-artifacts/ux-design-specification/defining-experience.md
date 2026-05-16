# Defining Experience

## Defining Experience Statement

> "You build your courage ladder — a personal list of social situations you want to face, ranked from manageable to challenging. You face them one at a time. The app holds your thread before, during, and after. The ladder grows as you climb it."

## User Mental Model

Users arrive with a **to-do list** mental model — they know what they're avoiding and have a rough sense of what would be "easier" or "harder." The ERP hierarchy concept is clinically familiar but experientially foreign. The courage ladder must feel like an organically grown personal record, not a clinical instrument.

**What they bring:**
- A working sense of their own anxiety gradient — they know some situations are harder than others, even if never formally articulated
- Previous app failure experience — the shame of downloading and abandoning prior mental health apps is a live presence at first open
- Avoidance as identity — *"I'm just a shy person"* is the dominant self-narrative; the ladder must reframe avoidance as behaviour, not character

**Where confusion enters:**
- Abstract SUDS scales without anchoring language — first rating is a guess without context
- "Upcoming events" vs. "ongoing patterns" — first-situation prompt must honour both
- "What counts as an exposure?" — commitment-resistant users need a lower-threshold entry path

**Current solution failures:**
- Therapist homework sheets: effective but disconnected from real-time
- Generic anxiety apps: calming tools, no exposure structure
- Paper journals: private, no feedback loop

## Success Criteria

| Criterion | Notes |
|-----------|-------|
| First situation feels earned, not assigned | "Suggest" as fallback; guided first-situation prompt with corrected language |
| Full ladder view is satisfying, not clinical | A map of courage, not a checklist |
| "Let's do this" tap feels weighted | Ritual gravity; heavy haptic |
| Return after exposure feels received | Debrief is a conversation; five paths |
| Progress reads as narrative | *"You said this would be impossible. You've done it twice."* |
| SUDS slider makes intuitive sense on first use | Anchoring language shown before first interaction |
| Stuck users find a forward path | Alternative paths when avoidance pattern detected |
| Single-item ladder feels complete, not broken | Warmth state shown; drag-to-rank appears only at 2+ items |
| Commitment ritual feels intentional without a mantra | Mantra slot hidden (not empty) until set |

## Novel vs. Established Patterns

**Borrowing (familiar):** Drag-to-rank, free-form text entry, progress indicators, thread re-entry prompts.

**Inventing (no reference):**
- Conversational ladder building from the user's own intake language
- Courage ladder as narrative artifact — reads backwards at review to surface the gap between "impossible then" and "done now"
- "Let's do this" commitment ritual with emotional weight — distinct from a navigation tap
- Return debrief thread — app remembers context across a real-world gap and receives the user back
- Sub-exposure / "just observe" path — lower-commitment entry; assess for MVP inclusion in implementation sprint (≤1 sprint = include; otherwise post-MVP)

## Experience Mechanics

### Naming

The feature is named **"courage ladder"** throughout — never "fear ladder," never "exposure hierarchy." Every surface: copy, tooltips, progress readbacks.

### Adding Situations

**First situation (guided prompt):**
*"Think of one social moment that feels hard for you — it could be something coming up, or something you face regularly."*

- Includes both upcoming events and ambient/recurring anxiety
- Specific moment framing ("one social moment"), not category framing
- **"Suggest" button**: 3–5 templates drawn from the user's intake language (verbatim preferred; generic templates as fallback for sparse intake)
- All suggestions editable before acceptance — naming a situation carefully is therapeutic preparation

**Single-item ladder state:**
When only one situation exists, the ladder view shows a warmth state: *"Your first situation is on the ladder. Add a second to begin ranking."* Drag-to-rank appears only when 2+ situations exist.

**Ongoing addition:**
"+" always accessible throughout the app — not gated to a dedicated flow.

### Ranking

- **Pairwise comparative ranking** at entry: *"Is this easier or harder than [adjacent situation]?"*
- Maximum 3 comparisons per new addition (bisection algorithm) — prevents ranking fatigue
- Full **drag-to-rank view** available when 2+ situations exist
- `float rank_score` (fractional indexing) stored — not cardinal integers — to avoid row rewrites on edit/delete

### Commitment Ritual

Preparation screen:
- **Mantra**: hidden (slot not rendered) until the user has set one; appears progressively once set. The ritual feels intentional and complete without it on day 1.
- **SUDS prediction slider** — anchoring language shown before first interaction: *"0 = no anxiety, 10 = worst imaginable. Most people land between 4–7."* Displayed as inline tooltip or brief onboarding moment on first use.
- **Optional pre-exposure writing field** — unhurried; deliberate pause before the continue button activates
- **Deliberate pause** before "Let's do this" becomes active
- **Heavy haptic** on tap — distinct, weighted; marks the boundary between preparation and commitment

`situation_text_snapshot TEXT` — written at "Let's do this" tap. This is the canonical commit moment and the correct snapshot for historical narrative readback. Do not FK-join the mutable `situations` table for this purpose.

SUDS prediction written to Supabase at prep-screen exit (crash-safe — not at "Let's do this" tap).

**Sub-exposure / "Just observe" path (scope TBD at implementation sprint):**
A lower-commitment entry for commitment-resistant users — engages with the exposure situation without the full ritual. If ≤1 sprint effort at implementation, include in MVP. Otherwise post-MVP.

### Five Debrief Return Paths

1. **"I did it."** → *"Want to talk about it, or just rate it?"* — user controls depth of debrief
2. **"I tried."** → *"That took courage. Want to share how it went?"* — partial exposure; its own path, not dismissed
3. **"I decided to wait."** → *"That's okay. It'll be here when you're ready."* — flags deliberate avoidance to recommendation engine
4. **"Not yet"** → thread stays open; no pressure — circumstantial delay; clinically distinct from path 3
5. **"Rather not say"** → *"Got it. Your ladder is here whenever you're ready."* — explicit forward reference; thread closes; no second tap. Silently sets `welfare_flag = true` on the thread record. Recommendation engine next-day action: surface a low-pressure grounding technique, not a ladder challenge.

### Thread Management

- **48-hour thread window** from "Let's do this" tap (server-authoritative timestamp)
- **State machine:** `IDLE → PREPPING → COMMITTED → [RETURNED | WINDOW_EXPIRED | ABANDONED]`
  - `WINDOW_EXPIRED` = 48hr elapsed with no debrief (system-triggered)
  - `ABANDONED` = explicit user tap to close thread (user-triggered)
  - Recommendation engine treats both identically for MVP; states distinguished in data for future analysis
  - `WINDOW_EXPIRED` re-entry behaviour: deferred to post-MVP (TODO)
- Offline: client reads `expires_at` from last sync; reconcile on reconnect

### Prediction vs. Reality Reveal

**Success case** (actual SUDS < predicted): quiet recognition of the gap. Achievement message + motivational prompt + *"What would you like to try next?"*

**Hard case** (actual SUDS ≥ predicted) — sequence is clinically ordered:
1. **Grounding offer first**: 2–3 curated somatic/grounding exercises (breath-holding techniques excluded — contraindicated for panic disorder; somatic/grounding exercises first)
2. **Deliberate pause** — no auto-advance; user controls when to proceed
3. **Optional reflection**: SUDS rating tap → optional writing field
4. Neutral framing throughout: *"That was hard. And it's okay — there's no wrong result here. The important thing is you tried."*

Both cases include achievement message and motivational prompt.

### Rolling Average Anxiety Nudge

- Track rolling average SUDS with **exponential decay recency weighting** — half-life = 14 days; minimum 3 check-ins required before any nudge fires
- After gap > 7 days: prompt *"How are you feeling today?"* re-calibration check-in before surfacing any nudge — do not assume prior average is current
- **Clinical safety rule**: if recency-weighted average ≥ 6 AND no exposures completed in past 14 days → nudge switches to grounding technique or ladder downward review invitation; do not surface a new challenge
- **Standard path** (no stuck pattern, no high-average block): nudge with one ladder challenge near the recency-weighted average
- **Stuck pattern detection**: N = 3 app opens with active ladder + X = 7 days zero commitments → replace nudge with alternative path: technique session, psychoeducation revisit, or invitation to adjust ladder downward. Starting hypotheses; instrument and review at 6 weeks.

### Soft Readiness Signal

*"This one might be a good next step when you're ready."*

Completion-count framing removed entirely. A suggestion, never a gate.

### Week 4/8 Progress Readback

- **MVP**: structured report — completed situations, SUDS predicted vs. actual, outcomes
- **Post-MVP**: personal letter/narrative format — *"When you started, these felt impossible. Here's where you are now."*

### Data Contracts

- `situation_text_snapshot TEXT` — written at "Let's do this" tap; canonical snapshot for historical narrative readback; never FK-join mutable `situations` table
- `from_template BOOLEAN` + `template_id UUID FK` — template provenance tracking
- `welfare_flag BOOLEAN` — set on thread record when user selects "Rather not say"; informs next-day recommendation engine action

---
