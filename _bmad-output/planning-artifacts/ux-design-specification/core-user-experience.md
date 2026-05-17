# Core User Experience

## Defining Experience

The core of exposure-buddy is a loop that spans time and real-world action: users prepare in the app, face a feared situation in the world, and return to reflect. The app's job is to hold that thread — before, during, and after — with the right presence at each moment.

The most frequent interaction is the daily check-in: 60 seconds, 3 taps maximum from app open to completion. The most critical interaction is the pre-exposure → exposure → post-exposure debrief loop, where clinical change actually happens. The loop is the clinical goal and the design framework; single-mode use — check-in only, in-the-moment only, or reflection without a prior thread — is the statistical norm. Each mode must feel complete in itself, never like an interrupted sequence.

## Three Usage Modes

**Preparation mode** — Before an exposure or technique session. Unhurried, intentional, supportive. Users are building readiness; the experience should feel like a ritual, not a checklist.

**In-the-moment mode** — During a real-world exposure. Instantaneous, one-tap, zero cognitive load required. Grounding tools, breathing exercises, and mantra recall must be reachable in under 2 seconds from anywhere in the app.

**Reflection mode** — After an exposure or session. Emotionally resonant, unhurried, narrative. The app receives what the user brings back from the world.

## Platform Strategy

**Mobile (primary — all three clinical modes):** iOS + Android via React Native + Expo. Touch-first. Offline-capable for all critical features: grounding tools, crisis helplines, fear ladder, mantra, and check-in history. Preparation mode, in-the-moment mode, and reflection mode are mobile-only — they require gesture interaction, haptics, local state continuity, and sub-2-second responsiveness that a shared web surface would compromise.

**Web (Day 1 — document-oriented surfaces only):** Onboarding on desktop, therapist summary dashboard, account management, and longer-form psychoeducation content. Document-oriented, low-interaction, tolerant of network latency. Web does not port the clinical modes.

**Architectural seam (non-negotiable):** Separate packages and explicit platform targets in the router config from day one. "Mobile-only" must be a defensible technical position, not a preference overrideable when someone asks "how hard can it be?"

**Two-layer design system:**

- **Layer 1 — Design language (fully shared):** Colour, typography, spacing scale, motion principles, emotional tone. Brand consistency across all surfaces.
- **Layer 2 — Interaction patterns (strictly separated):** Mobile interaction patterns owned by the mobile experience; web patterns owned by the web experience. They reference Layer 1 but share no components. No universal button.

**In-the-moment layer — zero web influence:** Pure React Native with no web polyfill dependencies. Grounding tool state cached locally on device boot. This surface is reviewed through one criterion only: *is this fast enough for a user at peak anxiety?*

**Accessibility gate:** In-the-moment components require explicit accessibility labels, VoiceOver/TalkBack reading order, and screen reader testing as a launch gate — not a post-launch audit. The breathing animation needs a live region announcing timing cues.

## Mode Transitions

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

## Mode UI Signals

- **Preparation:** Full UI present. Navigation visible. Content-rich.
- **In-the-moment:** Stripped UI. Navigation hidden. Breathing room. Quick-access panel dominant. The app recedes — a tool in the hand, not a product to navigate.
- **Reflection:** Full UI returns. Soft warm tone. Progress elements surfaced. The app is a witness receiving what the user brings back.

## Effortless Interactions

- **Daily check-in:** 3 taps maximum from app open to completion
- **In-the-moment grounding — zero network dependency:** All assets pre-loaded on device boot. No network call on the critical path. Airplane mode = full functionality.
- **In-the-moment grounding — thumb-reachable:** Quick-access element in the bottom third of the screen — reachable in a natural one-handed hold on the smallest supported device. Minimum tap target 56×56px for all in-the-moment interactive elements; accommodates low-end and physically damaged screens common in the target demographic.
- **In-the-moment grounding — any screen, non-destructive:** Reachable from every screen without navigating away. Interrupts, doesn't replace. On exit, user returns exactly to where they were.
- **In-the-moment grounding — silent-mode primary:** Every technique fully functional with audio off. Breathing animation is the primary timing cue; audio is enhancement only.
- **In-the-moment grounding — accessible from cold install:** Available without intake, account setup, mantra, or fear ladder. Falls back to three universal techniques — must be explicitly specified before implementation (selection criteria: zero-instruction accessibility, no prior context required, proven efficacy at acute anxiety). Reachable in under 30 seconds from first install.
- **Crisis detection:** Completely invisible — pre-filters every message, zero user action
- **Mantra recall:** Shown automatically on the pre-exposure screen
- **Re-entry after a gap:** One orientation screen — where you are, what's next

## Critical Success Moments

- **The score reveal** — Narrative leads; number is context. User feels understood, not labelled.
- **The first completed exposure** — Received with weight, not processed like a form submission.
- **The first prediction vs. reality reveal** — The moment the user feels the app working. Framed as curious, not comparative.
- **The silent reroute** — A stall handled without announcement. Trust built by what the app doesn't say. Design constraint: silence is not blankness — the app must surface an updated forward path without labelling it a setback. The copy for this surface state is a required design deliverable before implementation.

## Experience Principles

1. **Clinical depth, human surface** — Clinically sophisticated; never feels like medical software.
2. **Three-mode presence** — Preparation, in-the-moment, and reflection each have a distinct visual and interaction register. The three modes are mobile-only by design.
3. **Progress delivered, not stored** — Insights reach the user at the right moment; they don't have to go looking for them.
4. **Safety gates are invisible unless they must speak** — Crisis detection and clinical gates run silently. When they do surface — welfare pause, severity gate — they are warm and non-clinical, never alarming.
5. **Earned access, never gatekeeping** — Clinical gates feel like achievements. Fast paths exist for informed users.
6. **Mobile-first, web-disciplined** — The design system has two layers: shared design language, separated interaction patterns. Web surfaces stay document-oriented. Mobile surfaces stay gesture-first.

---
