# Executive Summary

## Project Vision

exposure-buddy is a clinically grounded mobile app for social anxiety — built around a 5-phase therapeutic journey (Intake → Psychoeducation → Technique Protocol → Exposure Practice → Review) using CBT, ACT, Somatic, and Yoga/Indian Philosophy frameworks. It targets a global audience of adults experiencing social anxiety, with Indian philosophy and yogic techniques as a distinctive therapeutic lens. English MVP with architecture designed for future language and locale expansion from day one.

## Target Users

Adults globally experiencing mild-to-severe social anxiety. Smartphone-native. Likely self-referred as a first step — using the app before or alongside professional therapy. Carry significant shame around anxiety; the product must consistently signal safety and non-judgment. The Indian philosophical framing (lok-bhaya, pranayama, mantra anchoring) resonates across cultures when integrated functionally into technique — not used as aesthetic decoration. User range spans: first-time help-seekers who are easily frightened off, experienced self-help users who need fast paths past content they already know, and international users who bring varied cultural relationships with expressing distress.

## Key Design Challenges

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

- **Pull, not push, for re-engagement** — Push permission only after first completed technique. In-app re-entry design is the primary mechanism; notifications are a fallback, not the strategy. Narrow exception: a welfare-framed permission ask is permitted at post-score-reveal or post-first-technique — scoped explicitly to a single welfare check-in for users who go N days without opening the app. This must be framed as care ("May we check in if we haven't heard from you?"), not as engagement ("Get reminders to practice"). Engagement notifications remain gated behind first completed technique.

## Design Opportunities

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

- **Welfare pause as third state** — Score 10 (or abandoned session) gets a distinct UX state: *"It sounds like today is really hard. You don't have to do anything right now. We're here when you're ready."* The welfare pause screen always displays a persistent, low-prominence crisis resource link — independent of keyword detection. The full crisis screen is keyword-triggered; the crisis link is always present at score 10. These are two distinct safety mechanisms and must not be conflated in implementation.

- **Cultural philosophy as functional USP** — Clinical mechanism always leads; cultural name follows. Every yogic/philosophy technique anchors in its clinical rationale before naming the tradition. Owned confidently in visual and copy language.

- **Experienced-user fast path** — Skips education, never clinical gates. Gates feel like achievements, not walls.

---
