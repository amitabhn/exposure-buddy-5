# UX Step 10 — User Journey Flows: Session Notes

**Status:** Party Mode review complete. 9 gaps + 1 ambiguity identified. Awaiting resolution before [C].

**Branch:** `docs/ux-design-step-10`

**Resume at:** Work through party mode gap list with Cooper, then select [C] to append flows to `ux-design-specification.md`.

---

## Six Flows — Final Locked Versions

### F1 — First-Use Onboarding

```mermaid
flowchart TD
    A[App first open — logged out] --> B[Home — logged-out state]
    B --> C{Entry choice}
    C -->|Try a challenge| D[Preview challenge 1 of 3\nno account required]
    D --> E{Continue?}
    E -->|Next challenge| F[Previews 2–3]
    E -->|Create account| G
    F --> F2{All 3 done?}
    F2 -->|No| D
    F2 -->|Yes| F3[Conversion nudge — sign up to save progress\nPreviews visible in Achievements after account creation]
    F3 --> G
    C -->|Create account| G
    G[Create account] --> H[Email or phone + OTP verification]
    H --> I{OTP valid?}
    I -->|No — resend + retry\nno limit MVP| H
    I -->|Yes| J[SPIN questionnaire — 17 items]
    J --> K{SPIN score}
    K -->|≥ 40| L[Mandatory referral screen]
    L --> M[User acknowledges — continues]
    K -->|< 40| N
    M --> N[Conversational symptom check — 3–4 questions]
    N --> O[Safety behaviour checklist — 15 items\nmandatory MVP]
    O --> P[Inline psychoeducation — anxiety cycle\npresented immediately before first exposure]
    P --> Q{Readiness prerequisite}
    Q -->|Thought record| R[Complete thought record]
    Q -->|Somatic session| S[Complete somatic session]
    R --> T[Hierarchy builder unlocks automatically]
    S --> T
    T --> U[Home — First-use state 1\nPrimary CTA: Build your ladder]
```

**Locked decisions:**
- Previews anonymous; completed previews persist in Achievements post-account creation
- OTP retry: no limit MVP; flagged for post-MVP review
- Safety behaviour checklist: mandatory MVP; flagged for post-MVP review
- SPIN ≥40: mandatory acknowledgement, not a block — user explicitly continues

---

### F2 — Fear Ladder Building

```mermaid
flowchart TD
    A[Hierarchy builder unlocked] --> B[First situation introduced\nfrom user's own intake language]
    B --> C{User wants to edit\nsituation name?}
    C -->|Yes — therapeutic naming| D[Edit name — deliberate, private]
    C -->|Accept as-is| E
    D --> E[Assign SUDS rating 0–10]
    E --> F[First item placed on ladder\nminimum 1 item — commitment ritual unlocks]
    F --> G[Full drag-and-rank view appears\nonly after first item placed]
    G --> H{Add more situations?}
    H -->|Yes — no maximum MVP| I{Intake data available?}
    I -->|Yes — rich intake| J[Next situation from intake language\none at a time]
    I -->|No — sparse intake| K[Generic fallback suggestion\neditable before acceptance]
    J --> C
    K --> C
    H -->|Done| L[Review and reorder — drag-and-rank\nsame view used for later edits]
    L --> M[Commitment ritual]
    M --> N[Ladder saved]
    N --> O[Home — Morning state 3\nPrimary CTA: Start today's challenge]
```

**Locked decisions:**
- Minimum 1 item to unlock commitment ritual
- Drag-and-rank view used for later edits outside the builder
- No maximum ladder size MVP; post-MVP review

---

### F3 — Core Exposure Loop

```mermaid
flowchart TD
    A[Home — Morning state 3\nPrimary CTA: Start today's challenge] --> B[Check-in — SUDS rating]
    B --> C[User selects technique\nuser-choice MVP; SUDS-based routing post-MVP]
    C --> D{Technique type}
    D -->|Somatic| E[Somatic session]
    D -->|Breathing / pranayama| F[Breathing coach]
    D -->|Cognitive| G[Thought record]
    E --> H[Pre-exposure briefing\nwhat to expect]
    F --> H
    G --> H
    H --> I{Write prediction?\nletter to self — optional}
    I -->|Yes| J[Write prediction\ndeliberate pause before continue]
    I -->|Skip| K
    J --> K[Begin exposure — real world]
    K --> L{SUDS log\nuser-triggered}
    L -->|Log SUDS| L
    L -->|Calm Me tapped| M[Mid-exposure crisis — F4]
    M -->|I can keep going| L
    M -->|I need to stop| N[Stopped early — partial session logged]
    L -->|Exposure complete| O[Debrief]
    N --> O
    O --> P{Prediction written?}
    P -->|Yes| Q[Prediction vs. reality reveal\nletter to self — read back]
    P -->|No| R
    Q --> R[SUDS arc — habituation visible]
    R --> S[Ladder item advances automatically]
    S --> T[Home — Post-exposure reflection state 7]
```

**Locked decisions:**
- Letter to self is optional
- Technique routing is user-choice MVP; SUDS-based routing post-MVP
- SUDS logging is user-triggered
- Stopped-early sessions reach debrief; partial session data preserved
- Ladder item advances automatically after debrief

---

### F4 — Mid-Exposure Crisis (SOS / Calm Me)

```mermaid
flowchart TD
    A[Any screen] --> B[🌊 Calm Me tapped\ntop-right, always present]
    B --> C[Support screen — state 6]
    C --> D[Courage affirmation\nYou are doing it. That takes real courage.]
    D --> E{Choose grounding technique}
    E -->|Breathing coach| F[Breathing coach session]
    E -->|5-4-3-2-1| G[Name one thing you can see right now\n→ hear → touch → smell → taste]
    F --> H{Ready?}
    G --> H
    H -->|I can keep going| I{Was in active exposure?}
    I -->|Yes| J[Return to exposure — SUDS logging continues]
    I -->|No| K[Return to previous screen]
    H -->|I need to stop| L{Was in active exposure?}
    L -->|No| K
    L -->|Yes — stays in app| M[Immediate modal: Debrief now?]
    M -->|Yes| N[Debrief screen]
    M -->|Not now| O[Home — Post-exposure state 7\n6h expiry window starts]
    N --> O
    L -->|Yes — app killed / backgrounded| P[Session flagged mid-exposure\nnot avoidance]
    P --> Q[Next app foreground\nRe-enters mid-exposure state 6]
    Q --> C
```

**Locked decisions:**
- Calm Me accessible from any screen — zero-navigation safety requirement
- Grounding prompt ("Name one thing you can see") shown only within 5-4-3-2-1, not as standalone
- Debrief offer after "I need to stop" is immediate modal, not routed screen
- App kill → re-enters mid-exposure state 6 on next foreground (not avoidance)

---

### F5 — Return After Gap / Re-engagement

```mermaid
flowchart TD
    A[App opened\ngap > 7 days detected] --> B{State 10 — ladder complete?}
    B -->|Yes| C[Home — Completed ladder state 10\nstate 10 outranks gap — post-MVP review]
    B -->|No| D[Home — Return after gap state 9]
    D --> E[Context card: warm welcome back\nno guilt language]
    E --> F[Primary CTA: re-calibration check-in]
    F --> G{Check-in style}
    G -->|Conversational| H[Short check-in — 3–4 questions]
    G -->|Skip to rating| I[Direct SUDS rating]
    H --> J[SUDS re-baseline\nretroactively updates technique routing]
    I --> J
    J --> K{Active thread exists?}
    K -->|No active thread| L[Home — Morning state 3]
    L --> M[Primary CTA: Start today's challenge]
    K -->|Yes — thread open| N{Thread state}
    N -->|< 3 opens without debrief\nprogressing| O[Home — Progressing state 4]
    N -->|3+ opens without debrief\navoidance pattern| P[Home — Avoidance state 5]
    N -->|WINDOW_EXPIRED\nno debrief| Q[Home — Expired state 8]
    O --> R[Primary CTA: Continue / Start debrief]
    P --> S[Soft CTA: Start debrief when ready]
    Q --> T[CTA: Reflect now]
    R --> U[Core exposure loop — F3]
    S --> V[Debrief screen]
    T --> V
    M --> U
```

**Locked decisions:**
- State 10 (completed ladder) outranks state 9 (gap) — flagged for post-MVP review
- Re-calibration is short conversational check-in with option to skip to direct SUDS
- SUDS re-baseline retroactively affects next session's technique routing
- 7-day gap threshold (product decision — needs explicit sign-off, see party mode below)

---

### F6 — Post-Exposure Reflection & Expiry

```mermaid
flowchart TD
    A[Debrief complete] --> B[expires_at set\nUTC epoch ms — server-side only\nbigint in Supabase]
    B --> C[Home — Post-exposure reflection state 7]
    C --> D{Letter to self written?}
    D -->|Yes| E[Primary CTA: See how it played out\nContext card teases prediction]
    D -->|No| F[Acknowledgement card\nYou did something genuinely hard today.]
    E --> G[Prediction vs. reality reveal\nletter to self — read back]
    F --> H{SUDS score improved?}
    H -->|Yes| I[SUDS arc — habituation visible]
    H -->|No improvement| J[Acknowledgement only\nno arc shown]
    I --> K[Prompt: Add notes about today]
    J --> K
    G --> L[SUDS arc]
    L --> K
    K --> M{6h window still open?}
    M -->|Yes — user completes notes| N[Thread resolved\nLadder item advances automatically]
    M -->|After 6h — first open past expiry| O[Home — Window expired state 8]
    N --> P{Last ladder item?}
    P -->|No| Q[Home — Morning state 3]
    P -->|Yes| R[Home — Completed ladder state 10]
    O --> S[Context card: You started something real.\nWant to take a few minutes to reflect on it now?]
    S --> T[Primary CTA: Reflect now]
    T --> U[Late debrief screen]
    U --> V[Same no-letter path: acknowledgement + arc if improved + notes]
    V --> N
```

**Locked decisions:**
- Letter written → reveal is primary CTA
- No letter → acknowledgement card + SUDS arc if score improved + notes prompt
- No-letter path is first-class, not a fallback
- expires_at: UTC epoch ms, server-set at debrief completion, bigint in Supabase
- State 8 copy omits expiry reference — "You started something real"
- Late debrief offered indefinitely
- SUDS arc and reveal accessible post-thread from session history / ladder item detail
- Ladder advance is unconditional on debrief completion (needs explicit confirmation — see F6-GAP-2)

---

## Party Mode Review Findings

### Sally (UX) — Key Concerns

1. **F1 SPIN copy**: Referral acknowledgement tone is undefined — must feel like "we see you're carrying a lot," not a liability waiver. Copy needs to be written before spec locks.
2. **F2 no-max UX debt**: Soft friction nudge (around item 8–10) should be designed now even if no hard cap. Compulsive item-adding is a real avoidance pattern.
3. **F3 technique selection guardrail**: User-choice without guidance risks self-escalation. Even a single contextual nudge ("at a SUDS of 8, most people start here") would make the choice feel collaborative.
4. **F4 app-kill re-entry copy**: The emotional contract for re-entering state 6 after killing the app in distress is unwritten. Must be authored before spec locks.
5. **F5 skip-path anchor**: Direct SUDS without context is a number floating in space. A single anchoring line ("last time you rated this a 7") would solve it.
6. **F6 no-letter experience**: Must be designed as a first-class experience, not consolation prize. Some users will never write the letter.

### John (PM) — Key Concerns

1. **F1 preview count**: Why 3? No evidence cited. 1 may convert better; 3 may exhaust an anxious user.
2. **F1 SPIN acknowledgement purpose**: Liability shield or therapeutic intervention? If shield, own it. If intervention, a checkbox doesn't change behaviour.
3. **F2 no item cap**: Known avoidance behaviour. Soft cap at ~12 should be MVP, not post-MVP.
4. **F3 technique selection**: Clinical routing should be MVP, not post-MVP. User-choice bakes avoidance into the architecture.
5. **F4 mid-exposure state timeout**: No timeout defined for state 6 re-entry. User returns 3 hours later — state 6 may not reflect their reality.
6. **F5 7-day threshold**: Who set this and why? For weekly-exposure users, fires every session.
7. **F6 acknowledgement when abandoned early**: "You did something genuinely hard today" fires even after 30-second abandonment. Risk of reinforcing avoidance with warmth.

### Winston (Architect) — Key Concerns

1. **F1 anonymous persistence strategy**: Device token vs. local storage. Must decide before data model is specced.
2. **F1 SPIN "mandatory" precision**: Can the user lie or skip? If yes, mandatory is cosmetic. If no, requires legal review.
3. **F3 SUDS arc rendering**: Irregular time series (user-triggered). Chart component must handle 0–N data points gracefully.
4. **F3 session end paths**: 4 paths to debrief (natural, user stop, Calm Me stop, app kill) — different data completeness. Debrief and ladder advance logic needs to know which path was taken.
5. **F4 Calm Me mechanism**: "Any screen" is an architecture constraint — overlay, FAB, or deep-link. Each has trade-offs. Must be decided at architecture layer.
6. **F4 session state persistence**: App-kill re-entry requires durable session state write on session start or state transition. Local vs. server-side source of truth must be defined, especially for offline.
7. **F5 retroactive SUDS write**: Write must happen at a defined moment (confirmation, not on each input). Will need audit trail for post-MVP clinical routing.
8. **F6 expires_at clock start**: Server at session creation or at debrief completion? Delayed debrief could collapse the 6h window. Must be unambiguous.
9. **F6 state 8 trigger mechanism**: Client-side poll on foreground, local notification, or server push? Each has battery/reliability trade-offs.
10. **Cross-cutting offline**: No offline policy stated in any flow. F3 and F4 minimum need explicit degradation policy.

### Amelia (Engineer) — Gap List

| Flow | ID | Issue |
|------|-----|-------|
| F1 | `F1-GAP-1` | SPIN referral acknowledgement UI undefined — modal, screen, or checkbox? Dismiss behaviour undefined. Untestable. |
| F1 | `F1-GAP-2` | Preview → Achievements save trigger undefined. Per challenge or on account creation? Device cleared before account = achievements lost. |
| F2 | `F2-GAP-1` | Drag-and-rank with 1 item — a list of one has no rank. Guard state or component spec needed. |
| F3 | `F3-GAP-1` | Zero SUDS logs → flat arc at debrief. Is flat arc valid? Minimum log count before debrief unlocks: undefined. |
| F3 | `F3-GAP-2` | Stopped-early path — is F4 "I need to stop" the *only* route? If yes, state explicitly. If no, define the UI affordance. |
| F4 | `F4-GAP-1` | App-kill re-entry lands on state 6 (Calm Me), not the exposure. Intentional? If yes, document rationale or it will be "fixed." |
| F4 | `F4-AMB-1` | "Active" flag ownership — local or server-side? If local and process killed, flag is gone. Coupled with F4-GAP-1. |
| F5 | `F5-GAP-1` | "Avoidance" thread state classification trigger undefined — time-based? User-declared? Untestable without a trigger. |
| F6 | `F6-GAP-1` | expires_at UTC vs. local device display. Timezone-crossing mid-window not handled explicitly. Epoch authoritative: confirm and state. |
| F6 | `F6-GAP-2` | Ladder auto-advance on late debrief — is advance unconditional regardless of SUDS delta? Confirm. |

**Priority:** F4-GAP-1 + F4-AMB-1 (coupled, safety-critical) → F6-GAP-2 (core progression mechanic).

---

## What to Do at Resume

1. Work through the gap list with Cooper — resolve each item as a spec decision or defer with explicit rationale
2. Address John's three sharp questions: F3 routing rationale, F2 cap rationale, F5 7-day threshold ownership
3. Address Sally's two unwritten things: SPIN referral copy tone, F4 app-kill re-entry copy
4. Once gaps resolved → select [C] → append flows to `ux-design-specification.md`, update `stepsCompleted: [1..10]`, load step-11-component-strategy.md
