# UX Step 7 — Defining Core Experience: Session Notes

**Status:** In progress — Advanced Elicitation round 1 (User Persona Focus Group) completed. Awaiting user decision on findings before writing to document.

**Resume at:** Advanced Elicitation A/P/C menu — user was reviewing Persona Focus Group findings and needs to accept/reject/partial before proceeding to [C] Continue.

---

## Confirmed Defining Experience Statement

> "You build your courage ladder — a personal list of social situations you want to face, ranked from manageable to challenging. You face them one at a time. The app holds your thread before, during, and after. The ladder grows as you climb it."

---

## Confirmed Mechanics (Ready to Write to Document)

### 1. Naming
- Renamed "fear ladder" → **"courage ladder"** — optimistic reframe, shifts from what you're afraid of to what you're capable of.

### 2. Adding Situations
- **Free-form addition at any time** via "+" always accessible throughout the app (Model B).
- **"Suggest" button**: 3–5 generic templates; user edits to make their own.
- **Guided first-situation prompt** (first entry only): *"Think of one upcoming social moment, even small"* — specific moment, not a category. Note: "upcoming" language may exclude ambient/recurring anxiety — flagged for review below.

### 3. Ranking
- **Pairwise comparative ranking**: "Is this easier or harder than [adjacent situation]?"
- Maximum 3 comparisons per new addition (bisection algorithm).
- Full **drag-to-rank view** available when 2+ situations exist.
- Use `float rank_score` (fractional indexing) — not cardinal integers — to avoid row rewrites on edit/delete.

### 4. Five Debrief Return Paths
1. "I did it."
2. "I tried."
3. "I decided to wait." *(deliberate avoidance — flags to recommendation engine)*
4. "Not yet" *(circumstantial delay — distinct from above)*
5. "Rather not say" *(thread closes; warm, no second tap)*

### 5. Thread Management
- **48-hour thread window** from "Let's do this" tap (server-authoritative timestamp).
- Thread state machine: `IDLE → PREPPING → COMMITTED → [RETURNED | WINDOW_EXPIRED | ABANDONED]`
- `WINDOW_EXPIRED` behaviour: **deferred to post-MVP** (TODO).
- Offline: client reads `expires_at` from last sync; reconcile on reconnect.

### 6. Prediction vs. Reality Reveal (dedicated screen)
- **Success case** (actual < predicted): quiet recognition of the gap. Achievement message + motivational prompt + "What would you like to try next?"
- **Hard case** (actual ≥ predicted): neutral message — *"That was hard. And it's okay — there's no wrong result here. The important thing is you tried."* + 2–3 suggested grounding/relaxation exercises. Achievement message + motivational prompt.
- SUDS prediction written to Supabase at prep-screen exit (not at "Let's do this" tap) — crash-safe.

### 7. Rolling Average Anxiety Nudge
- Track rolling average SUDS from check-in data.
- When user opens app with **no active thread**, nudge with one ladder challenge near their current average anxiety level.
- **Flagged issue (see below):** rolling average may be stale after long gap; needs recency weighting.

### 8. Soft Readiness Signal (non-gate)
- *"You've completed 3 situations below this one. This might be your next step."*
- **Flagged issue (see below):** reads as implicit shame to stuck users.

### 9. Week 4/8 Progress Readback
- **MVP:** structured report (completed situations, SUDS predicted vs. actual, outcomes).
- **Post-MVP TODO:** rewrite as personal letter/narrative format.

### 10. Data Contracts
- `situation_text_snapshot TEXT` — stored at commit time; do not FK-join mutable `situations` table for historical narrative.
- `from_template BOOLEAN` + `template_id UUID FK` — template provenance flag.

### 11. Commitment Ritual
- Preparation screen: mantra (if set), SUDS prediction slider, optional pre-exposure writing field.
- Deliberate pause before "Let's do this" becomes active.
- **Heavy haptic** on tap — distinct, weighted.

---

## Success Criteria (Confirmed)

| Criterion | Notes |
|-----------|-------|
| First situation feels earned, not assigned | "Suggest" button as fallback; guided first-situation prompt |
| Full ladder view is satisfying, not clinical | A map of courage, not a checklist |
| "Let's do this" tap feels weighted | Ritual gravity, heavy haptic |
| Return after exposure feels received | Debrief is a conversation, five paths |
| Progress reads as narrative | "You said this would be impossible. You've done it twice." |

---

## Novel vs. Established Patterns

**Borrowing (familiar):** drag-to-rank, free-form text entry, progress indicators.

**Inventing (no reference):**
- Conversational ladder building from user's own language
- Courage ladder as narrative artifact (reads backwards at review)
- "Let's do this" commitment ritual with emotional weight
- Return debrief thread — app remembers context across a real-world gap

---

## Open Issues from Advanced Elicitation (User Persona Focus Group)

These emerged from the Persona Focus Group. **User has not yet accepted/rejected — pending decision at resume.**

| # | Gap | Source Persona | Severity | Proposed Resolution |
|---|-----|----------------|----------|---------------------|
| 1 | "Upcoming" in first-situation prompt excludes ambient/recurring anxiety | Aisha | Medium | Change to "Think of one social moment that feels hard for you — it could be something coming up, or something you face regularly." |
| 2 | SUDS slider needs anchoring language before first use | Aisha | High | Add inline tooltip or brief onboarding gate: "0 = no anxiety, 10 = worst imaginable. Most people land between 4–7." |
| 3 | "Rather not say" response needs enough warmth to ensure return | Aisha | Medium | Response: *"Got it. Your ladder is here whenever you're ready."* — explicit forward reference, not just closure. |
| 4 | Rolling average nudge is counterproductive for stuck/avoidance-pattern users | Dev | High | Detect stuck pattern (opened app N times, active ladder, zero commitments in X days); offer alternative path — technique session, psychoeducation revisit, or invitation to adjust ladder downward. |
| 5 | Soft readiness signal reads as implicit shame to stuck users | Dev | Medium | Reframe: *"This one might be a good next step when you're ready."* Remove the completion-count framing. |
| 6 | No lower-commitment entry path for the commitment-resistant | Dev | High | Add "Just observe" or sub-exposure option — a lighter commitment that doesn't require the full ritual. Post-MVP candidate unless easily scoped. |
| 7 | Rolling average is stale after long gap — needs recency weighting | Priya | High (clinical) | Weight recent check-ins more heavily; after gap > 7 days, prompt a brief re-calibration check-in before surfacing a nudge. |
| 8 | No re-calibration path for returning users whose baseline has shifted | Priya | High (clinical) | On return after gap > 7 days: offer a brief "How are you feeling today?" re-calibration before nudging. Do not assume prior average is current. |
| 9 | Grounding exercise suggestions must avoid contraindicated techniques | Priya | Medium | Curate the 2–3 suggested exercises; breathing exercises that involve breath-holding are contraindicated for some users (panic disorder). Use somatic/grounding first. |

---

## What to Do at Resume

1. Present the open issues table to Cooper and ask: accept all / accept partial / reject.
2. Incorporate accepted changes into the confirmed mechanics.
3. Offer A/P/C menu again.
4. On [C]: append the full Step 7 content to `ux-design-specification.md`, update frontmatter (`stepsCompleted: [1,2,3,4,5,6,7]`, remove `stepInProgress` and `stepInProgressNotes`).
