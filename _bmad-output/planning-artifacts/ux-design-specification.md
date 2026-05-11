---
stepsCompleted: [1, 2, 3, 4, 5, 6]
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

- **Pull, not push, for re-engagement** — Push permission only after first completed technique. In-app re-entry design is the primary mechanism; notifications are a fallback, not the strategy. Narrow exception: a welfare-framed permission ask is permitted at post-score-reveal or post-first-technique — scoped explicitly to a single welfare check-in for users who go N days without opening the app. This must be framed as care ("May we check in if we haven't heard from you?"), not as engagement ("Get reminders to practice"). Engagement notifications remain gated behind first completed technique.

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

- **Welfare pause as third state** — Score 10 (or abandoned session) gets a distinct UX state: *"It sounds like today is really hard. You don't have to do anything right now. We're here when you're ready."* The welfare pause screen always displays a persistent, low-prominence crisis resource link — independent of keyword detection. The full crisis screen is keyword-triggered; the crisis link is always present at score 10. These are two distinct safety mechanisms and must not be conflated in implementation.

- **Cultural philosophy as functional USP** — Clinical mechanism always leads; cultural name follows. Every yogic/philosophy technique anchors in its clinical rationale before naming the tradition. Owned confidently in visual and copy language.

- **Experienced-user fast path** — Skips education, never clinical gates. Gates feel like achievements, not walls.

---

## Core User Experience

### Defining Experience

The core of exposure-buddy is a loop that spans time and real-world action: users prepare in the app, face a feared situation in the world, and return to reflect. The app's job is to hold that thread — before, during, and after — with the right presence at each moment.

The most frequent interaction is the daily check-in: 60 seconds, 3 taps maximum from app open to completion. The most critical interaction is the pre-exposure → exposure → post-exposure debrief loop, where clinical change actually happens. The loop is the clinical goal and the design framework; single-mode use — check-in only, in-the-moment only, or reflection without a prior thread — is the statistical norm. Each mode must feel complete in itself, never like an interrupted sequence.

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
The pre-exposure prep screen ends with a deliberate **"Let's do this"** action — a distinct, intentional tap that marks the boundary between preparation and action, not a casual swipe or passive state change. The label is intentionally neutral in tone — accessible to users across the anxiety spectrum, neither projecting confidence nor passivity. The label is fixed for MVP; future versions may make this text dynamic based on user profile and situation type. On completion, the app shifts to in-the-moment standby: nav hidden, breathing room, quick-access panel prominent. An open thread is stored with the situation and timestamp. The app acknowledges the commitment with a brief moment of witness — not a silent state change. **Immediate second thoughts:** the in-the-moment standby screen includes a low-prominence exit affordance for users who change their mind in the seconds after tapping — no confirmation dialog, no explanation required. Returns to the preparation screen with the thread marked as not-yet-started.

**Any state → In-the-moment (always parallel, never gated):**
The in-the-moment quick-access layer is reachable from every screen via a persistent bottom panel element. It interrupts without replacing; on exit, the user returns exactly to where they were. This is the emergency path. It has no prerequisite and no gate. **Thread awareness:** when an open exposure thread exists, the in-the-moment layer surfaces a quiet ambient marker — *"You're heading to [situation]"* — so the user knows the app remembers. Not a prompt; does not appear when no thread is open. **Threadless micro-check-in:** when in-the-moment is invoked with no open thread (unplanned acute anxiety), a single optional prompt surfaces on exit — *"How are you feeling now? 1–10"* — closing the reflection loop for users who haven't yet built a ladder or committed to an exposure.

**In-the-moment → Reflection (thread memory, not automatic):**
On the next app open within the thread window, the app opens with a warm re-entry prompt: *"You were preparing for [situation]. How did it go?"* Four options:

- **"I did it."** → app asks: *"Want to talk about it, or just rate it?"* — giving the user control over depth of debrief
- **"I tried."** → app responds: *"That took courage. Want to share how it went?"* Partial exposure gets its own debrief path — not the full-completion flow, not dismissed as "not yet"
- **"I decided to wait."** → app responds: *"That's okay. It'll be here when you're ready."* Thread stays open. Clinically distinct from "Not yet" — flags deliberate avoidance to the recommendation engine rather than circumstantial delay. Multiple consecutive instances may prompt a gentle ladder review.
- **"Not yet"** → thread stays open; no pressure
- **"Rather not say"** → app responds: *"Got it. Take your time."* Thread closes. No second tap. No confirmation screen.

**Thread expiry:**
Thread window is **48 hours** from the "Let's do this" tap — long enough to survive a night's sleep and a full day of processing, reaching the morning-after reflection moment even for evening situations. After 48 hours without a debrief, the thread closes silently — no guilt message. If the user opens the app 3 or more days after an open thread expired, a light acknowledgement surfaces: *"It looks like some time has passed. No worries — your ladder is still here whenever you're ready."* The acknowledgement includes a single optional prompt — *"Did you end up going? Even a quick note helps."* — offering a brief retroactive debrief. Expired thread ≠ avoided exposure; this distinction matters for the recommendation engine. The prompt appears once, is fully dismissible, and does not reopen the thread.

**Concurrent threads:** A user may face multiple situations within a 48-hour window. The app enforces a single-active-thread rule: tapping "Let's do this" when a thread is already open prompts a single lightweight choice — *"You're still reflecting on [situation]. Close that first?"* — with one-tap resolution. The re-entry prompt always surfaces the most recently opened thread. Earlier threads queue and surface on subsequent app opens until resolved or expired. The single-active-thread rule is an MVP complexity constraint, not a clinical assertion — multiple simultaneous threads create ambiguous re-entry prompts, competing expiry timers, and unclear ladder position. Multi-thread support is a named future capability.

**6-week review gate:** The 48-hour window is a validated starting hypothesis, not fixed doctrine. Instrument thread completion rate and timing, silent expiry rate (segmented by time-of-day and day-of-week of the "Let's do this" tap), and 7/30-day retention for users with expired vs. completed threads. Review at 6 weeks with live data. Long-term direction is adaptive windowing anchored to tap time-of-day.

**Reflection → home:**
After debrief, the prediction vs. reality reveal appears as its own distinct screen — framed as curious, not comparative — before returning home. Home screen reflects updated ladder state and any celebration moment.

### Mode UI Signals

- **Preparation:** Full UI present. Navigation visible. Content-rich.
- **In-the-moment:** Stripped UI. Navigation hidden. Breathing room. Quick-access panel dominant. The app recedes — a tool in the hand, not a product to navigate.
- **Reflection:** Full UI returns. Soft warm tone. Progress elements surfaced. The app is a witness receiving what the user brings back.

### Effortless Interactions

- **Daily check-in:** 3 taps maximum from app open to completion
- **In-the-moment grounding — zero network dependency:** All assets pre-loaded on device boot. No network call on the critical path. Airplane mode = full functionality.
- **In-the-moment grounding — thumb-reachable:** Quick-access element in the bottom third of the screen — reachable in a natural one-handed hold on the smallest supported device. Minimum tap target 56×56px for all in-the-moment interactive elements; accommodates low-end and physically damaged screens common in the target demographic.
- **In-the-moment grounding — any screen, non-destructive:** Reachable from every screen without navigating away. Interrupts, doesn't replace. On exit, user returns exactly to where they were.
- **In-the-moment grounding — silent-mode primary:** Every technique fully functional with audio off. Breathing animation is the primary timing cue; audio is enhancement only.
- **In-the-moment grounding — accessible from cold install:** Available without intake, account setup, mantra, or fear ladder. Falls back to three universal techniques — must be explicitly specified before implementation (selection criteria: zero-instruction accessibility, no prior context required, proven efficacy at acute anxiety). Reachable in under 30 seconds from first install.
- **Crisis detection:** Completely invisible — pre-filters every message, zero user action
- **Mantra recall:** Shown automatically on the pre-exposure screen
- **Re-entry after a gap:** One orientation screen — where you are, what's next

### Critical Success Moments

- **The score reveal** — Narrative leads; number is context. User feels understood, not labelled.
- **The first completed exposure** — Received with weight, not processed like a form submission.
- **The first prediction vs. reality reveal** — The moment the user feels the app working. Framed as curious, not comparative.
- **The silent reroute** — A stall handled without announcement. Trust built by what the app doesn't say. Design constraint: silence is not blankness — the app must surface an updated forward path without labelling it a setback. The copy for this surface state is a required design deliverable before implementation.

### Experience Principles

1. **Clinical depth, human surface** — Clinically sophisticated; never feels like medical software.
2. **Three-mode presence** — Preparation, in-the-moment, and reflection each have a distinct visual and interaction register. The three modes are mobile-only by design.
3. **Progress delivered, not stored** — Insights reach the user at the right moment; they don't have to go looking for them.
4. **Safety gates are invisible unless they must speak** — Crisis detection and clinical gates run silently. When they do surface — welfare pause, severity gate — they are warm and non-clinical, never alarming.
5. **Earned access, never gatekeeping** — Clinical gates feel like achievements. Fast paths exist for informed users.
6. **Mobile-first, web-disciplined** — The design system has two layers: shared design language, separated interaction patterns. Web surfaces stay document-oriented. Mobile surfaces stay gesture-first.

---

## Desired Emotional Response

### Primary Emotional Goals

exposure-buddy is designed around a single emotional arc: users arrive feeling overwhelmed and unseen; they leave feeling transformed and quietly victorious. The product earns the right to that arc by being a trustworthy companion throughout — never a passive content library, never a clinical instrument.

**Understood and empowered** — the emotional baseline from first open. Users must feel the app *gets* what they're dealing with before they're asked to do anything hard.

**Companion trust** — the sustained emotional quality across the journey. The app is something users rely on, not something they consult. This is the feeling that differentiates exposure-buddy from every other anxiety app they downloaded and deleted.

**Victory and transformation** — the emotional destination. Not just relief, not just reduced symptoms — a felt sense of having done something genuinely hard and come out the other side different.

---

### Emotional Journey Mapping

**Discovery / First open (0–30 seconds)**
Relief that something like this exists. Curiosity about what it does differently. Cautious hope that this time might be different. All three simultaneously — the product should honour the complexity of that first moment rather than oversimplifying it into a single pitch.

**During the hard moments** (SPIN score reveal, first ladder view, referral screen)
Encouraged and informed. The user leaves these moments knowing more than they did, feeling that the app handled the moment well — not overwhelmed, not dismissed. Steady is the right word: the app holds its ground so the user doesn't have to.

**When something goes wrong** (stalled exposure, high SUDS, bad session)
The app stays present. Users in distress cannot self-optimise their way out — the emotional job of the app in these moments is to be the companion that hasn't left. "I'm still here" is the primary signal; "let's try again" is secondary and comes only when the user is ready.

**Returning after a break**
Warm welcome back. No guilt, no performance review. Forward-looking — the next step is visible and accessible without ceremony. All three tones simultaneously: warmth, acceptance, momentum.

**The ask to face something hard**
A firm but kind friend who genuinely understands what they're going through, and is quietly confident they can do it. Not cheerleading. Not clinical instruction. The app brings the same energy a good friend would: steady, honest, not minimising — and fundamentally believing in the person in front of it. *Note: the specific tone of this ask is a candidate for future personalisation by user profile.*

---

### Micro-Emotions

The app leans predominantly toward **confident, proud, and momentum-building** — but not uniformly. Deliberate pockets of patience matter.

| Moment | Primary Emotion | Texture |
|--------|-----------------|---------|
| Pre-exposure preparation | Quiet confidence | "You've prepared for this" |
| Technique in progress | Patient, unhurried | "Take all the time you need" |
| Completing an exposure | Pride — understated | Quiet recognition, not high-five |
| Score reveal | Steady, informed | Encouraged, not overwhelmed |
| Setback / stall | Companioned | "We're still here" |
| Re-entry after gap | Warm acceptance | No guilt, forward-looking |
| Mastery achievement | Surprised delight | Moment of unexpected recognition |
| First prediction vs. reality reveal | Curious wonder | Framed as discovery, not evaluation |

---

### Design Implications

**"Understood and empowered" → Precision copy at every trust-critical moment.** The emotional goal requires the words to be exactly right — not warm-but-vague, not clinical-but-accurate. Both. Score reveals, referral screens, and ladder introductions are where this is most load-bearing.

**"Companion trust" → Consistent presence, not intrusive helpfulness.** The app doesn't over-explain or over-prompt. It shows up reliably, holds state across sessions, and remembers what the user told it. Amnesia — the app forgetting context it should know — is the fastest way to break companion trust.

**"Victory and transformation" → Progress must be surfaced, not stored.** Longitudinal progress doesn't live in a tab. It appears at the right moment — re-entry, week 4 review, prediction vs. reality reveal — delivered as narrative, not metrics.

**"Firm but kind friend" → Consistent voice across all copy.** The app's emotional register should be stable. Not warmer in celebration, not cooler in clinical moments. The friend doesn't change personality based on what's happening — and neither does the app.

**"Take all the time you need" pockets → Deliberate pacing design.** Certain screens should have built-in patience: pre-exposure writing (unhurried pause before continue), technique sessions (no time pressure), post-bad-session (no forward nudge). These are explicit design states, not defaults.

**"Quietly confident" → Avoid projection.** The app believes in the user but doesn't project emotions onto them. "You can do this" is a tone, not a line. The copy never tells users how they feel — it reflects what it observes and offers what might help.

---

### Emotional Design Principles

1. **Arc over moment** — Every individual screen serves the larger emotional journey from understood → victorious. No screen is emotionally neutral.

2. **Companion, not coach** — The app is present and reliable, not directive. It offers; users choose. The voice is a friend who has done their research, not a clinician who has a protocol.

3. **Confidence as default, patience as punctuation** — The dominant register is forward-moving and capable. Deliberate pauses are placed at specific moments as punctuation — not as the baseline tone.

4. **Recognition over celebration** — Quiet, specific recognition of what just happened outweighs generic celebration. *"You predicted this would be hard. It was. And you did it anyway."* — not a confetti animation.

5. **Presence over reassurance** — When things go wrong, the emotional job is to stay present, not to reassure. Reassurance that rings false at a hard moment does more damage than silence.

6. **Earned transformation** — The sense of victory at the end of the journey is real because the hard moments were not minimised. The app's emotional honesty during difficulty is what makes the transformation feel true.

---

### Post-MVP Refinements (TBD)

The following areas were surfaced during design review and deferred to post-MVP:

- **Time-aware companion register** — "I'm still here" as a uniform response fails time-pressured pre-event distress (e.g., 8:47am before a presentation). The companion voice needs a stakes-calibrated register: grounding and action-oriented before an imminent event, present and witnessing after. Requires instrumentation to detect time-pressure context.

- **Shame-of-prior-failure as arrival state** — The first-open arc assumes cautious hope. The high-value returning user arrives carrying shame from prior failure. The copy needs to quietly dissolve the specific fear that avoidance is character, not behaviour — before the first question is asked.

- **Re-entry diagnostic branching** — "You were just busy" and "last time was hard" require different companion tones on re-entry. Route on behavioural data (last session length, reflection filed, mid-session abort) before prompting.

- **Witnessed vs. passive presence** — In the 20-minute window after a bad exposure, "I'm still here" is insufficient without specificity. The companion must reference what actually happened: *"You stayed 40 minutes longer than your last exposure. That's real."* Generic presence reads as absence.

- **Adversarial user state** — No current register for "this isn't working after 12 exposures." The companion voice for this moment is: stay curious, not defensive. "Yeah. It's slow. What happened at the last party?" — not reassurance, not preaching.

- **Non-completer emotional design** — 60–80% of users in this category drop off by week 4 without a dramatic incident. The arc has no emotional design for the quietly-sliding user. An *honest checkpoint* pattern is needed: "Here's what your data shows. Here's what we'd expect to see if this is working. You're the one who knows which is true."

- **Therapist-referred first-open arc** — Referred users arrive with a delegated, observed emotional posture — not self-chosen curiosity. A branching first-open tone that signals "you chose to be here" without asking directly.

- **Companion trust at monetisation touchpoints** — Renewal prompts landing during stall/gap periods, especially after a bad exposure, break the companion frame. Gate renewal communications against emotional state.

- **Proxy metrics for "steady"** — Instrument: predicted-vs-rated difficulty delta, re-entry latency after hard exposures, companion prompt dismissal rates correlated with completion rates.

- **Companion's honest limit** — No current design for the moment a user stops believing the product can help them. The companion needs a voice for: *"Some people need more than this app can provide"* — without abandoning them in that moment.

- **Cultural and shame-encoding variance** — "No guilt, forward-looking" encodes individualist recovery norms. Review re-entry copy for collectivist users (South Asian, East Asian, Latin American segments particularly relevant given Indian philosophy framing). Scope: do not actively harm; deep adaptation is a later phase.

- **Acute distress escalation path** — "Presence over reassurance" has no escalation mechanism. The companion needs to know when to step aside: *"I'm here, and I think you should call someone."* Requires clinical advisory and legal boundary definition before implementation.

---

## UX Pattern Analysis & Inspiration

> **Review status:** Saved for post-MVP review. Patterns are directionally correct but require validation against live user data, clinical referral channel stakeholder input, and avoidance-moment usability testing before being treated as settled design direction.

### Inspiring Products Analysis

**Calm — Relaxing UX, The Daily Series**

Calm solves two problems simultaneously. First, the ambient experience — typography, colour, sound, pacing — is itself the product before any content begins. The app feels like a decompression chamber: entering it is a calming act in itself. Second, the Daily series eliminates decision fatigue for returning users. One pre-selected action surfaces today. The container is familiar; the content refreshes. Users don't choose — they show up and the app has already prepared something for them.

*Critical distinction for exposure-buddy:* Calm's ambient entry works because the user's job is to receive — sit, listen, decompress. Exposure-buddy users are not passive recipients; they are being asked to approach something frightening. The adaptation is consequential: the entry must be warm and containing, but with quiet forward momentum — not "you're here, you're safe, breathe" (spa), but "you're here — let's see what today holds" (dojo). The act of opening is the threshold before the accomplishment, not the accomplishment itself.

**Apple Fitness — Gentle Nudges, Awards and Challenges**

Apple Fitness's achievement system is notable for what it doesn't do: it doesn't punish absence. Rings reset daily; closing them is an invitation, not an obligation. Awards mark real thresholds — first workout, longest streak — and feel genuinely earned. Challenges have a short time horizon that creates momentum without long-term pressure. Nudges are ambient: a notification, a ring percentage — never a guilt mechanism.

*Note:* The emotional register of Apple Fitness recognition is calibration-focused ("you did 5 workouts"). For exposure-buddy, recognition must also name the courage underneath the number: "You kept showing up when it was hard." Clinical warmth, not generic celebration.

**Wysa — Anonymity During Initial Steps**

Wysa's defining UX decision is to delay identity until after value has been delivered. Users can explore, engage, and begin a session before any account is required. This directly reduces the shame activation that occurs when a mental health app asks "who are you?" before it has earned the right to ask. The no-account state doesn't feel limited — it feels like a complete, safe first experience.

*Boundary for exposure-buddy:* The pre-identity value must be psychoeducation and light somatic tools — not exposure practice. Cold-install exposure without clinical calibration risks flooding the user and producing the conclusion that the therapy doesn't work. The value delivered before identity must be genuinely useful and genuinely safe.

---

### Transferable UX Patterns

**Containing Entry with Forward Momentum (adapted from Calm)**
The opening experience is warm and safe, but not passive. It holds the user without asking them to arrive already calm. The ambient register functions as the first therapeutic gesture — but its emotional quality is readiness, not relaxation. "You're here — let's see what today holds."

**Context-Sensitive Daily Action (adapted from Calm — Daily series)**
One pre-decided action is surfaced at home screen entry — no browsing, no menu, no decision. But the action is inferred from the user's phase in the journey, recency of engagement, and last session outcome — not a static daily default. Day 3 after a social failure surfaces differently from a recovery day. The framing and stakes of the action shift tonally across the 5-phase therapeutic journey. The decision is pre-made; the decision logic underneath is clinical.

**Threshold Recognition as Clinical Safety, Not Just UX (from Apple Fitness)**
Streak mechanics are a clinical contraindication for shame-sensitive populations, not merely a gamification preference to avoid. Missing a streak day triggers an abstinence violation effect — a collapse in self-efficacy that can be worse than never starting. Threshold recognition fires at real milestones; gaps don't erase progress. Recognition names the courage in the threshold, not just the completion.

**Ambient Progress at Re-entry Moments (from Apple Fitness)**
Longitudinal progress is delivered at the right moment — re-entry, week 4 and 8 review, prediction vs. reality reveal — not stored in an analytics tab for the user to find. Progress surfaces as narrative, not metrics.

**Value-Before-Identity Onboarding (from Wysa)**
Grounding tools are accessible from cold install — before intake, before account creation, before the fear ladder exists. Pre-identity value is scoped to psychoeducation and light somatic tools. The app earns trust through usefulness before asking anything personal.

**Discreet UI for Shared-Device Contexts (from Wysa)**
Particularly relevant for South Asian family structures and other collectivist user segments: the UI should not expose therapeutic content to casual device observers. Discreet exit affordances and non-revealing home screen states protect the user's privacy not just from the app, but from their environment.

---

### Original Patterns (No Reference App Provides These)

**Compassionate Re-entry Without Shame Activation**
Users who return after avoidance — a week gap, an abandoned exposure, a hard session they fled — are the highest-need users and the ones most likely to feel they have already failed. The re-entry experience must feel like a companion who stayed, not a system logging a return. No performance review. No count of missed days. A warm, specific acknowledgement of where they are, and one clear forward path.

**Avoidance-Moment UX**
The moment of maximum resistance — when the user needs to do an exposure and is looking for any reason not to — is not addressed by any reference app. Calm, Fitness, and Wysa all assume forward momentum. This moment must be designed from first principles: holding activation alongside safety, acknowledging that discomfort is the mechanism rather than a problem to be solved, and offering presence rather than an easy exit.

---

### Anti-Patterns to Avoid

- **Streak mechanics** — clinical contraindication (abstinence violation effect), not merely a gamification preference
- **Passive ambient entry** — risks making the act of opening the app feel like the accomplishment, feeding avoidance
- **Decision menus at entry** — forces choice when users are most depleted; one clear action, already decided
- **Identity gates before grounding tools** — activates shame before earning trust
- **Exposure practice before clinical calibration** — cold-install exposure risks flooding; pre-identity value must be light somatic tools and psychoeducation only
- **Generic celebratory tone at emotionally complex moments** — recognition must be quiet, specific, and courage-naming
- **Progress buried in analytics tabs** — longitudinal progress must be delivered at the right moment, not stored

---

### Design Inspiration Strategy

**Adopt directly:**
- Threshold recognition with courage-naming (Apple Fitness mechanics, clinical framing)
- Value-before-identity onboarding scoped to psychoeducation + light somatic tools (Wysa)
- Ambient progress delivery at re-entry and review moments (Apple Fitness)
- Discreet UI for shared-device contexts (Wysa)

**Adapt significantly:**
- Calm's ambient entry → containing + forward-momentum entry (dojo, not spa)
- Calm's pre-decided daily action → context-sensitive daily action inferred from phase, recency, and last session outcome
- Apple Fitness recognition → threshold recognition with courage-naming, not completion-counting

**Invent (no reference exists):**
- Compassionate re-entry without shame activation
- Avoidance-moment UX (activation held alongside safety; discomfort as mechanism)

**Avoid:**
- Streak mechanics (contraindication, not preference)
- Passive ambient entry
- Decision menus at home screen
- Identity gates before value
- Exposure before clinical calibration
- Generic celebration at emotionally complex moments

---

## Design System Foundation

> **Architecture constraint:** This section operates within ADR-001 (closed). NativeWind `5.0.0-preview.3`, Turborepo + pnpm, and the `packages/ui` boundary are resolved decisions — not open questions. No content here reopens those ADRs.

### Design System Choice

**NativeWind `5.0.0-preview.3` (Tailwind CSS v4) via `packages/ui`**

The design system is built on the styling architecture already resolved in the system architecture document. `packages/ui` is the shared component and token package. All design tokens, primitives, and composed clinical components live here. The two-layer design language is expressed through NativeWind v5 class conventions shared across platforms — with platform-specific interaction patterns handled at the component level.

| Layer | Location | Purpose |
|-------|----------|---------|
| Shared design language | `packages/ui/src/tokens/theme.ts` | Colour, typography, spacing, motion, haptics — typed TS constants mirroring CSS custom properties |
| Mobile primitives | `packages/ui/src/primitives/` — NativeWind v5 styled | Button, Text, Input, Card — gesture-first, accessible |
| Mobile composed | `packages/ui/src/composed/` | SudsScale, ProgressChart, CrisisCard — clinical UI compositions with mode-conditional behaviour |
| Web components | `apps/web` — Phase 2 placeholder | Web design system deferred; `apps/web` contains no active stack at MVP |

> **Phase 2 web transition:** When `apps/web` activates, `packages/ui/src/tokens/theme.ts` is the starting point for web token expression via Tailwind CSS v4. Do not backport mobile clinical component behaviour to web without a dedicated UX session.

**NativeWind v5 / Tailwind CSS v4 note:** NativeWind v5 uses a CSS-first configuration model — CSS custom properties rather than the `tailwind.config.js` JS object approach of v3. Token definitions, theme extensions, and class references must use the v5 API. Version pinned to exact: `nativewind@5.0.0-preview.3`. Review required at each preview bump before upgrading.

---

### Rationale for Selection

**Architecture-resolved, not design-system-chosen.** NativeWind v5 is a closed ADR decision. The design system's role is to document how to use it well — not whether to use it.

**Two-layer architecture expressed through NativeWind v5.** The shared design language (colour, typography, spacing, motion) is expressed as Tailwind class strings that work identically on mobile via NativeWind v5 and will work on web via Tailwind CSS v4 at Phase 2. Platform-specific layers handle where that abstraction breaks down.

**`packages/ui` import boundary (from architecture).** This package may import from `packages/core` (types only). Forbidden: `packages/sync`, `packages/supabase`, RN platform APIs. Enforced by `packages/ui/.eslintrc.js` in CI.

**Raw Tailwind bypass prohibited in composed components.** All colour and spacing values in `packages/ui/src/composed/` must reference design tokens — not raw Tailwind utility values (`bg-blue-500`, `p-4`). Raw utility values applied without token indirection violate the mode register system and produce clinical surfaces that look correct but feel wrong. This constraint is written into the spec now; a lint rule enforces it when the package is built.

**StyleSheet as escape hatch, not primary.** NativeWind v5 class resolution is the canonical styling path. `StyleSheet` is used for: animated components (Reanimated requires StyleSheet or worklet values), imperative style calculations, and edge cases where NativeWind v5 pre-release behaviour produces unexpected results on a specific platform. StyleSheet usage outside these cases is flagged in code review.

**rn-primitives + @gorhom/bottom-sheet evaluated in Phase 0.** Before building scratch components, evaluate `react-native-reusables` (rn-primitives, NativeWind-native, accessible) and `@gorhom/bottom-sheet` (Gesture Handler-based, Expo-compatible). Written decision memo required. Time-boxed to 1 day.

---

### Token Architecture

**Single source: `packages/ui/src/tokens/theme.ts`**

Tokens are typed TypeScript constants that serve two consumers: NativeWind v5 theme extensions (CSS custom properties → utility classes) and imperative TypeScript (animations, haptic timing, StyleSheet fallbacks).

```typescript
// packages/ui/src/tokens/theme.ts (illustrative structure)
export const color = {
  surface: { primary: 'var(--color-surface-primary)', ... },
  content: { primary: 'var(--color-content-primary)', ... },
  mode: {
    preparing: { background: 'var(--color-preparing-bg)', ... },
    grounding: { background: 'var(--color-grounding-bg)', ... },
    reflecting: { background: 'var(--color-reflecting-bg)', ... },
  },
} as const

export const motion = {
  preparing:  { duration: 200, easing: 'ease-out' },    // forward-leaning, slight urgency
  grounding:  { duration: 400, easing: 'ease-in-out' }, // anchoring stillness
  reflecting: { duration: 600, easing: 'ease-out' },    // unhurried, retrospective
} as const

export const haptic = {
  breathingRhythm:      'light',    // repeating during breathing exercise
  dragConfirmation:     'medium',   // fear ladder item placement
  commitmentTap:        'heavy',    // "Let's do this" — distinct, weighted
  techniqueCompletion:  'success',  // custom pattern on completion
} as const

export const spacing = { ... } as const
export const typography = { ... } as const
```

Motion preset values are locked to the clinical requirements: `motion.grounding` at 400ms ease-in-out reflects the anchoring quality of an in-the-moment intervention. These values are not aesthetic choices — they encode the mode register and must not be overridden at the component level without a design review.

Haptic constants are semantic labels mapping to `expo-haptics` impact levels. Tested on physical device — simulators do not support haptics.

---

### Composed Component Behavioural Contracts

Mode-conditional behaviour is specified here, not left to per-component engineering judgment.

| Component | In-the-moment register | Reflection register | Preparation register |
|-----------|----------------------|--------------------|--------------------|
| `CrisisCard` | **No mount animation.** Motion is contraindicated during dysregulation. Instant render only. | Gentle fade-in (`motion.reflecting`) | Not used in this register |
| `SudsScale` | **Reduced motion mandatory.** Haptic feedback on value change (`haptic.dragConfirmation`). No decorative animation. | Standard interaction, `motion.reflecting` | Standard interaction, `motion.preparing` |
| `ProgressChart` | Not used in this register | Full animation (`motion.reflecting`) | Summary view, `motion.preparing` |

**In-the-moment zero-network guarantee (design layer):** Composed components used in the in-the-moment register must not contain conditional rendering based on network state — no loading skeletons, no optimistic UI patterns, no connectivity-dependent branches. This is a design-layer guarantee, not solely an architecture-layer guarantee. Violation of this constraint in a PR is a blocking issue, not a comment.

**In-the-moment render budget:** The 2-second access requirement from anywhere in the app is a performance contract. Design system implications: in-the-moment components carry no lazy-loaded assets, no deferred fonts, no first-render network calls. Animation frame budget for the in-the-moment layer: 16ms/frame (60fps) on a 2GB RAM Android 10 device. If NativeWind v5 pre-release introduces jank on this surface, StyleSheet is the approved escape hatch — flag in code review with the performance reason.

---

### Implementation Approach

**Phase 0 — Pre-work (before any component in `packages/ui` is built)**

1. **NativeWind v5 validation:** Verify `nativewind@5.0.0-preview.3` on target devices (2GB RAM Android 10+, iOS 16+). Check: dark mode through native modals, CSS custom property resolution on Android, hot reload with Expo Router v4. Document results. Hard blocker → ADR revision, not a design system workaround.

2. **Library evaluation (1 day, time-boxed, written decision memo required):**
   - `react-native-reusables` / `rn-primitives` — adopt / reject / partial adopt with specific components
   - `@gorhom/bottom-sheet` — adopt / reject (fear ladder panel, detail sheets)
   - `react-native-gesture-handler` — confirm Expo SDK 54 compatibility

3. **`packages/ui/src/tokens/theme.ts` authored** — complete token set before any component work.

**Phase 1 — Mode design briefs (pre-sprint-1 gate, PM-owned)**

One-page director's brief per mode, written before any component is built. This is a writing task, not a design task — no designer required. Owned by the PM or founding team. Sprint 1 does not begin until all three briefs exist. The gate is enforced at sprint planning, not left to engineering judgment.

- **Preparation:** Warm, containing, quiet forward momentum. Dojo, not spa.
- **In-the-moment:** Stripped. Immediate. Zero overhead. The app recedes to a tool in the hand.
- **Reflection:** Unhurried. Retrospective. Slightly slower. The app witnesses.

Haptic language per mode specified here. Implementation via `expo-haptics`. Physical device testing required.

**Phase 2 — `packages/ui` components (clinical priority order)**

1. In-the-moment grounding tools — **prototype-gate** (see below)
2. Daily check-in primitives
3. Fear ladder / hierarchy components
4. Avoidance-moment screen — **prototype-gate** (see below)

**Prototype gates:** The in-the-moment and avoidance-moment screens cannot enter an implementation sprint without a tested prototype. The prototype does not require professional tooling — a Figma prototype, a React Native sketch, or even a paper walkthrough with a user who has social anxiety qualifies. The PM owns the gate decision: the PM signs off that the prototype has been tested and the interaction has been felt before code begins. This is not a bureaucratic step — it exists because these surfaces cannot be assembled from components correctly without first being experienced.

**Accessibility requirements belong in ticket acceptance criteria**, not only in PR checklists. Every ticket that produces an in-the-moment or composed component includes these as written AC:
- `accessibilityRole`, `accessibilityLabel`, `accessibilityState`, `accessibilityHint` set explicitly
- Minimum 44×44pt touch target
- VoiceOver/TalkBack reading order tested on physical device
- Haptic pattern specified and implemented
- Tested with audio off

The PR checklist is a secondary reminder, not the primary enforcement mechanism.

**Phase 3 — Web design system (Phase 2 project)**

`apps/web` activates at Phase 2. Web design system choice (shadcn/ui or otherwise) is a Phase 2 decision. `packages/ui/src/tokens/theme.ts` is the starting point for web token expression at that point.

---

### Failure Prevention

| Risk | Trigger | Prevention |
|------|---------|------------|
| NativeWind v5 pre-release regression | Preview bump | Pin to exact version; run Phase 0 validation before any upgrade; ADR revision if hard blocker |
| Raw Tailwind values bypass token system | Developer reaches for `bg-blue-500` in composed components | Written constraint in spec; lint rule at build time |
| Mode registers converge | No mode briefs before component work | Mode briefs are pre-sprint-1 gate; PM-owned; enforced at sprint planning |
| CrisisCard animated in in-the-moment | Animation added without mode-conditional check | Behavioural contracts table in this doc; PR checklist item: "mode register verified" |
| In-the-moment network dependency introduced | Loading state added to grounding component | Zero-network annotation is a blocking PR issue; no conditional network renders in in-the-moment components |
| Prototype gate bypassed | Timeline pressure | PM owns the gate; it is a sprint planning gate, not a code review gate — cannot be waived post-implementation |
| Haptic spec never shipped | Not in sprint | Haptic constants in `theme.ts` make it visible in the token file; AC on every in-the-moment component ticket |
| rn-primitives evaluation skipped | Sprint starts before Phase 0 | Named deliverable with 1-day time-box and required written memo |

---

### Contingency Paths

| Scenario | Trigger | Path |
|----------|---------|------|
| NativeWind v5 hard blocker on target device | Phase 0 validation fails | ADR revision required; StyleSheet + typed constants from `theme.ts` as fallback; architecture team sign-off before proceeding |
| rn-primitives partial coverage | Missing gesture / sheet patterns | Hybrid: rn-primitives for accessibility primitives; @gorhom/bottom-sheet for panels; from-scratch only for bespoke interactions |
| Haptic spec deprioritised | Not scoped into sprint | Haptic constants in `theme.ts` make it visible; component PR checklist enforces it as a merge gate |
| Designer joins post-MVP | Onboarding to undocumented system | `theme.ts` commented with the why behind each token value; mode briefs stored at `docs/design/modes/`; Phase 0 decision memos at `docs/design/adr/` |
| In-the-moment jank on 2GB RAM Android | NativeWind v5 frame budget exceeded | StyleSheet escape hatch approved for this surface; flag in code review with performance measurement |

