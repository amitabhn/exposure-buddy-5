---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-exposure-buddy.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/milestone-features-exposure-buddy.md
  - docs/ANXIETY_APP_PRODUCT_SPEC.md
  - docs/social_anxiety_flow_v2.xlsx
---

# UX Design Specification exposure-buddy

**Author:** Cooper
**Date:** 2026-05-08

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

exposure-buddy is a clinically grounded mobile app for social anxiety — built around a 5-phase therapeutic journey (Intake → Psychoeducation → Technique Protocol → Exposure Practice → Review) using CBT, ACT, Somatic, and Yoga/Indian Philosophy frameworks. It targets a global audience of adults experiencing social anxiety, with Indian philosophy and yogic techniques as a distinctive therapeutic lens. English MVP with architecture designed for future language and locale expansion from day one.

### Target Users

Adults globally experiencing mild-to-severe social anxiety. Smartphone-native. Likely self-referred as a first step — using the app before or alongside professional therapy. Carry significant shame around anxiety; the product must consistently signal safety and non-judgment. The Indian philosophical framing (lok-bhaya, pranayama, mantra anchoring) resonates across cultures when integrated functionally into technique — not used as aesthetic decoration. User range spans: first-time help-seekers who are easily frightened off, experienced self-help users who need fast paths past content they already know, and international users who bring varied cultural relationships with expressing distress.

### Key Design Challenges

- **Two parallel trust mechanisms** — At high-stakes moments (score reveals, severity gates, referral screens) users read carefully; copy must be precise and human. Across all other surfaces, trust is built through frictionless momentum — a flow so smooth the user never stops long enough to feel self-conscious. Both must be designed explicitly; neither substitutes for the other.

- **Score reveal as narrative, not number** — The SPIN score reveal leads with a plain-language summary of what the score means for this specific user. The number is secondary in visual hierarchy — context, not headline. Prototype with real anxious users before shipping.

- **Fear ladder: threshold, not locked door** — The readiness gate (D4) handles the clinical constraint. The UX challenge is making it feel like a natural, earned threshold — not a paternalistic barrier — so informed users move through quickly and anxious users feel prepared rather than blocked.

- **Fear ladder entry: conversation, not form** — Introduce one situation at a time from the user's own intake language. Full drag-and-rank view arrives after the first item is placed. Each AI question during ladder building has a legible clinical reason.

- **Situation naming as therapeutic act** — Ladder suggestions from intake are editable before acceptance. The act of naming a situation carefully is part of exposure preparation, not admin. Generic suggestions serve only as fallback for sparse intake responses.

- **Maintaining therapeutic alliance after a severity gate** — Post SPIN ≥40 referral acknowledgement, the app makes unambiguously clear it remains present and useful. A distinct interaction to design for, not a screen to design around.

- **Humanising the EX-3 stall protocol** — Silent rerouting, not announced failure. Replace "step back" with "spend more time here" across all copy. The ladder metaphor stays; the setback vocabulary changes entirely.

- **Technique mastery layer** — Once a technique has been used proficiently N times, it graduates to quick-access and the recommendation engine introduces something new. Time-based and mastery-based diversification prevents chronically elevated scores from trapping users in somatic-only monotony.

- **Progress must be delivered, not stored** — Design friction into the prediction vs. reality reveal; surface longitudinal progress at re-entry moments, not buried in a tab.

- **Localisation-ready from day one** — English MVP, but abstract beyond string length and directionality: date formats, number formatting, cultural norms around expressing distress.

- **Clinical scaffolding as invisible infrastructure** — No gamification, no streaks, enforced consistently across every surface.

- **Pull, not push, for re-engagement** — Push permission only after first completed technique. In-app re-entry design is the primary mechanism; notifications are a fallback, not the strategy.

### Design Opportunities

- **Prediction vs. reality reveal as product hero moment** — Letter-to-self format: written before the exposure, read after. Pre-exposure writing gets its own dedicated screen with a deliberate pause before the continue button — unhurried, private. Design both success case (anxiety overestimated) and recovery case (anxiety confirmed) with equal care.

- **Fear ladder as therapeutic hero** — Drag-to-rank ERP hierarchy, introduced conversationally one situation at a time. Sequenced as an earned achievement. Setback language throughout: "spend more time here," never "step back."

- **Fear ladder as progress narrative** — At week 4 and 8 review, read back the user's own situation descriptions: *"When you started, these felt impossible. Here's where you are now."* The ladder becomes a record of courage, not just a clinical instrument.

- **Personalised ladder suggestions from user's own language** — The user's verbatim intake descriptions are the primary source for ladder suggestions — not a generic pre-populated list. Suggestions are editable before acceptance. Generic situations serve only as fallback for sparse intake responses.

- **Transparent and specific recommendation logic** — Surface the actual rule: "Your check-in score was 7, so we're starting with breathing." Never generic. The rule-based engine's specificity is the trust signal; opacity destroys it.

- **Technique before assessment — with explicit framing** — Lead with a single 2-minute breathing exercise before intake, framed openly: "Before we learn about you, let's give you something useful right now." Earns trust before asking questions; framing prevents the manipulative read.

- **Adaptive SPIN sequencing** — Start with 3 highest-signal questions; continue to all 17 only if early answers suggest moderate-to-severe range. Mild users get shorter intake without losing clinical accuracy where it matters.

- **Structured debrief with optional open text** — Keep minimal structured capture (SUDS slider + outcome tap) as core debrief. Open text field is optional elaboration — not a replacement. Prevents NLP misread from breaking trust.

- **Acknowledging courage independently of outcome** — Post-exposure debrief always recognises showing up, regardless of SUDS delta: *"You predicted this would be hard. It was. And you did it anyway."*

- **Technique mastery as quick-access graduation** — Proficiently used techniques move to a quick-access panel; the engine teaches something new. Mastery is celebrated, not ignored.

- **Therapist summary card, not just export** — Session data designed as a 90-second structured summary card readable before a clinical session, alongside raw export. Positions exposure-buddy as a therapeutic co-pilot from day one.

- **Crisis detection as emotional attunement** — Keyword system at lower sensitivity detects unusual session distress and offers a quiet welfare check without triggering the full crisis screen.

- **Welfare pause as third state** — Score 10 (or abandoned session) gets a distinct UX state: *"It sounds like today is really hard. You don't have to do anything right now. We're here when you're ready."*

- **Cultural philosophy as functional USP** — Clinical mechanism always leads; cultural name follows. Every yogic/philosophy technique anchors in its clinical rationale before naming the tradition. Owned confidently in visual and copy language.

- **Experienced-user fast path** — Skips education, never clinical gates. Gates feel like achievements, not walls.

---

## Core User Experience

### Defining Experience

The core of exposure-buddy is a loop that spans time and real-world action: users prepare in the app, face a feared situation in the world, and return to reflect. The app's job is to hold that thread — before, during, and after — with the right presence at each moment.

The most frequent interaction is the daily check-in: 60 seconds, 3 taps maximum from app open to completion. The most critical interaction is the pre-exposure → exposure → post-exposure debrief loop, where clinical change actually happens.

### Three Usage Modes

**Preparation mode** — Before an exposure or technique session. Unhurried, intentional, supportive. Users are building readiness; the experience should feel like a ritual, not a checklist.

**In-the-moment mode** — During a real-world exposure. Instantaneous, one-tap, zero cognitive load required. Grounding tools, breathing exercises, and mantra recall must be reachable in under 2 seconds from anywhere in the app.

**Reflection mode** — After an exposure or session. Emotionally resonant, unhurried, narrative. The app receives what the user brings back from the world.

### Platform Strategy

**Mobile (primary — all three clinical modes):** iOS + Android via React Native + Expo. Touch-first. Offline-capable for all critical features: grounding tools, crisis helplines, fear ladder, mantra, and check-in history. Preparation mode, in-the-moment mode, and reflection mode are mobile-only — they require gesture interaction, haptics, local state continuity, and sub-2-second responsiveness that a shared web surface would compromise.

**Web (Day 1 — document-oriented surfaces only):** Onboarding on desktop, therapist summary dashboard, account management, and longer-form psychoeducation content. Document-oriented, low-interaction, tolerant of network latency. Web does not port the clinical modes.

**Architectural seam (non-negotiable):** Separate packages and explicit platform targets in the router config from day one. "Mobile-only" must be a defensible technical position, not a preference overrideable when someone asks "how hard can it be?"

**Two-layer design system:**

- **Layer 1 — Design language (fully shared):** Colour, typography, spacing scale, motion principles, emotional tone. Brand consistency across all surfaces.
- **Layer 2 — Interaction patterns (strictly separated):** Mobile interaction patterns owned by the mobile experience; web patterns owned by the web experience. They reference Layer 1 but share no components. No universal button.

**In-the-moment layer — zero web influence:** Pure React Native with no web polyfill dependencies. Grounding tool state cached locally on device boot. This surface is reviewed through one criterion only: *is this fast enough for a user at peak anxiety?*

**Accessibility gate:** In-the-moment components require explicit accessibility labels, VoiceOver/TalkBack reading order, and screen reader testing as a launch gate — not a post-launch audit. The breathing animation needs a live region announcing timing cues.

### Mode Transitions

The three modes map to real-world events that happen outside the app. Transitions are handled through three distinct mechanisms — never a single enforced sequence:

**Preparation → In-the-moment (explicit commitment):**
The pre-exposure prep screen ends with a deliberate **"I'm going now"** action — a therapeutic act of commitment, not merely a UI button. The label is fixed for MVP; future versions may make this text dynamic based on user profile and situation type. On completion, the app shifts to in-the-moment standby: nav hidden, breathing room, quick-access panel prominent. An open thread is stored with the situation and timestamp. The app acknowledges the commitment with a brief moment of witness — not a silent state change.

**Any state → In-the-moment (always parallel, never gated):**
The in-the-moment quick-access layer is reachable from every screen via a persistent bottom panel element. It interrupts without replacing; on exit, the user returns exactly to where they were. This is the emergency path. It has no prerequisite and no gate.

**In-the-moment → Reflection (thread memory, not automatic):**
On the next app open within the thread window, the app opens with a warm re-entry prompt: *"You were preparing for [situation]. How did it go?"* Three options:

- **"I did it."** → app asks: *"Want to talk about it, or just rate it?"* — giving the user control over depth of debrief
- **"Not yet"** → thread stays open; no pressure
- **"Rather not say"** → app responds: *"Got it. Take your time."* Thread closes. No second tap. No confirmation screen.

**Thread expiry:**
Thread window is **32 hours** from the "I'm going now" tap — long enough to survive a night's sleep and catch the morning-after reflection moment, short enough to stay emotionally relevant. After 32 hours without a debrief, the thread closes silently — no guilt message. If the user opens the app 3 or more days after an open thread expired, a light acknowledgement surfaces: *"It looks like some time has passed. No worries — your ladder is still here whenever you're ready."*

**6-week review gate:** The 32-hour window is a validated starting hypothesis, not fixed doctrine. Instrument thread completion rate and timing, silent expiry rate (segmented by time-of-day and day-of-week of the "I'm going now" tap), and 7/30-day retention for users with expired vs. completed threads. Review at 6 weeks with live data. Long-term direction is adaptive windowing anchored to tap time-of-day.

**Reflection → home:**
After debrief, the prediction vs. reality reveal appears as its own distinct screen — framed as curious, not comparative — before returning home. Home screen reflects updated ladder state and any celebration moment.

### Mode UI Signals

- **Preparation:** Full UI present. Navigation visible. Content-rich.
- **In-the-moment:** Stripped UI. Navigation hidden. Breathing room. Quick-access panel dominant. The app recedes — a tool in the hand, not a product to navigate.
- **Reflection:** Full UI returns. Soft warm tone. Progress elements surfaced. The app is a witness receiving what the user brings back.

### Effortless Interactions

- **Daily check-in:** 3 taps maximum from app open to completion
- **In-the-moment grounding — zero network dependency:** All assets pre-loaded on device boot. No network call on the critical path. Airplane mode = full functionality.
- **In-the-moment grounding — thumb-reachable:** Quick-access element in the bottom third of the screen — reachable in a natural one-handed hold on the smallest supported device.
- **In-the-moment grounding — any screen, non-destructive:** Reachable from every screen without navigating away. Interrupts, doesn't replace. On exit, user returns exactly to where they were.
- **In-the-moment grounding — silent-mode primary:** Every technique fully functional with audio off. Breathing animation is the primary timing cue; audio is enhancement only.
- **In-the-moment grounding — accessible from cold install:** Available without intake, account setup, mantra, or fear ladder. Falls back to universal three techniques. Reachable in under 30 seconds from first install.
- **Crisis detection:** Completely invisible — pre-filters every message, zero user action
- **Mantra recall:** Shown automatically on the pre-exposure screen
- **Re-entry after a gap:** One orientation screen — where you are, what's next

### Critical Success Moments

- **The score reveal** — Narrative leads; number is context. User feels understood, not labelled.
- **The first completed exposure** — Received with weight, not processed like a form submission.
- **The first prediction vs. reality reveal** — The moment the user feels the app working. Framed as curious, not comparative.
- **The silent reroute** — A stall handled without announcement. Trust built by what the app doesn't say.

### Experience Principles

1. **Clinical depth, human surface** — Clinically sophisticated; never feels like medical software.
2. **Three-mode presence** — Preparation, in-the-moment, and reflection each have a distinct visual and interaction register. The three modes are mobile-only by design.
3. **Progress delivered, not stored** — Insights reach the user at the right moment; they don't have to go looking for them.
4. **Safety always on, always invisible** — Crisis detection and clinical gates run silently. Safety never interrupts unless it must.
5. **Earned access, never gatekeeping** — Clinical gates feel like achievements. Fast paths exist for informed users.
6. **Mobile-first, web-disciplined** — The design system has two layers: shared design language, separated interaction patterns. Web surfaces stay document-oriented. Mobile surfaces stay gesture-first.
