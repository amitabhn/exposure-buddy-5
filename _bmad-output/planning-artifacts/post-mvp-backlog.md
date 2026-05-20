# Exposure Buddy — Post-MVP Backlog

This document consolidates every item explicitly deferred during the MVP planning sessions (PRD, Architecture, UX Design Specification, and Epic/Story creation). Items are grouped by category. Priority and sequencing will be determined in a post-launch triage.

---

## 1. Core Product Features

### 1.1 Avoidance Detection (Home Screen State 5)
**What:** Detect when a user is repeatedly opening the app but not completing an exposure and surface a supportive avoidance-acknowledgement state on the home screen.
**Source:** Story 6.3; UX spec F5 decisions.
**Notes:** Three provisional classification signals from UX spec: (1) 3+ app opens on an active thread without debrief; (2) thread open > 6 hours without debrief; (3) user explicitly declares they didn't complete. All three thresholds flagged for post-MVP clinical review. State 5 transitions directly skip to state 6 logic in MVP (code comment in place).

### 1.2 Fear Ladder Drag-to-Reorder
**What:** Allow users to manually reorder fear ladder items by dragging after the ladder is created.
**Source:** Story 4.3; Epic 5 discussion.
**Notes:** Data model is already prepared — position field and atomic `reorder_positions` enqueue payload (`{ type: 'reorder_positions', itemAId, itemANewPosition, itemBId, itemBNewPosition, updatedAt }`) are documented in Story 4.3. A two-item swap-by-position edit affordance is the current fallback for MVP. Full drag is a UI-only add once the data layer is confirmed stable.

### 1.3 Maximum Fear Ladder Size Cap
**What:** Enforce an upper limit on the number of items a user can add to their courage ladder.
**Source:** UX spec F2 decisions ("No maximum ladder size MVP; post-MVP review").
**Notes:** Clinically informed limit TBD. May also include a prompt to split large ladders into sub-ladders for separate fear domains.

### 1.4 Ladder Commitment Ritual
**What:** A brief ritual screen or interaction after a user finalises their courage ladder — designed to increase commitment and motivation.
**Source:** UX spec F2 decisions ("Commitment ritual: removed from MVP; deferred post-MVP").
**Notes:** Clinically motivated. Copy and interaction design require clinical input. Should not be a generic gamification element.

### 1.5 Home Screen State 10 — Completed Ladder Experience
**What:** Full experience for when the user has completed all items on their courage ladder. MVP renders a one-line stub with no CTA.
**Source:** Story 6.2 (state 10 stub); UX spec ("Completed ladder state 10 outranks gap — post-MVP review").
**Notes:** Should include a meaningful celebration moment, reflection prompt, and a clear next-step (e.g., extend ladder, review journey, share milestone). Clinical input needed on what "completed" means for a social anxiety ladder and whether a formal discharge or re-assessment is appropriate.

### 1.6 Multi-Session Longitudinal SUDS Chart (Achievements Tab)
**What:** A longitudinal chart showing SUDS trends across multiple sessions for the same fear item, surfaced in the Achievements tab.
**Source:** UX spec F6 decisions ("`LongitudinalSudsChart` ... multi-session longitudinal view in Achievements tab is post-MVP").
**Notes:** Single-session SUDS arc (Branch A/B) is in MVP (Story 5.3). The longitudinal view requires session history storage already in place. The `LongitudinalSudsChart` component is the primary deliverable.

### 1.7 Breathing Coach — Technique Selection
**What:** Allow users to choose between breathing techniques — box breathing, 4-7-8, diaphragmatic, etc.
**Source:** Story 7.2; Cooper's answer ("technique preference will be taken post-MVP").
**Notes:** Box breathing (4-4-4-4) is the single MVP technique. A comment in `packages/core/src/config/breathingCoach.ts` documents this deferral and the constants to change when expanding. Requires UX design for technique picker and potentially clinical guidance on appropriate technique defaults.

### 1.8 Breathing Coach — User-Configurable Timer & Cycle Count
**What:** Let users set their preferred session duration (default 5 mins) and number of guided cycles before switching to passive (default 2).
**Source:** Story 7.2; Cooper's answer on configurability ("Keep configurability post-MVP").
**Notes:** Constants are compile-time in MVP (`BREATHING_TIMER_SECONDS = 300`, `BREATHING_GUIDED_CYCLES = 2`). Post-MVP: add a settings screen or inline pre-session config panel; persist preferences per user via `KV_KEYS.BREATHING_TIMER_SECONDS(userId)` and `KV_KEYS.BREATHING_GUIDED_CYCLES(userId)`.

### 1.9 Re-engagement Conversational Check-in (State 9)
**What:** A warm, empathetic conversational check-in before the re-baseline SUDS entry when a user returns after a gap.
**Source:** Story 6.4 ("conversational check-in deferred; direct SUDS-only path in MVP").
**Notes:** MVP shows a direct SUDS slider. Post-MVP version should feel like the app "notices" the gap and asks gently before jumping to assessment. Copy requires clinical tone review.

### 1.10 Gap Threshold Review (State 9 Trigger)
**What:** The 10-day gap threshold that triggers state 9 (re-baseline) is a product decision, not a clinically validated number.
**Source:** UX spec F5 decisions ("Gap threshold: 10 days (product decision; flagged for post-MVP review)").
**Notes:** Review with clinical advisor to determine if 10 days is appropriate or if it should be adaptive (e.g., shorter gap for early users, longer for established users).

### 1.11 Full Clinical Technique Routing (SUDS-Based Algorithmic)
**What:** Algorithmically route users to the most appropriate calming technique based on their SUDS level and session history, rather than user choice with a lightweight nudge.
**Source:** UX spec F3 decisions ("full clinical routing post-MVP"); Story 6.1.
**Notes:** MVP: user chooses technique; a contextual nudge is shown ("at a SUDS of X, most people start with Y"). Post-MVP: the algorithm selects or strongly recommends a technique based on SUDS, technique history, and clinical protocol. Requires clinical input on routing logic.

### 1.12 Minimum Session Duration Enforcement
**What:** Enforce a minimum time a user must remain in an active exposure before being allowed to complete the session.
**Source:** Epic 5 discussion; Cooper's decision to defer.
**Notes:** Clinically motivated — brief exposures (< 30–60s) may not allow the anxiety curve to peak and begin habituating. Threshold TBD with clinical advisor. MVP allows session completion at any time.

### 1.13 App Re-entry After Mid-Session App Kill
**What:** When a user force-quits or the app is backgrounded mid-exposure, next launch should return them to the active exposure screen with a Calm Me overlay rather than to the home screen.
**Source:** UX spec F4 ("App kill mid-session: session state server-persisted; re-entry returns to exposure state with Calm Me prompt overlaid").
**Notes:** Session state is already server-persisted (in place). The MVP re-entry lands on whatever screen routing evaluates to (typically home). Post-MVP: detect an in-progress `started` session on launch and route directly back to it with the Calm Me prompt. Re-entry copy "You're back. That took courage." flagged for clinical copy review before implementation.

### 1.14 SUDS Re-Baseline Audit Trail & Technique Routing Integration
**What:** The `suds_baselines` table (built in Story 6.4) records re-baseline values, but the integration with clinical technique routing and a full audit trail is post-MVP.
**Source:** UX spec F5 decisions ("SUDS re-baseline retroactively affects next session's technique routing; audit trail required for post-MVP clinical routing").
**Notes:** MVP reads the most recent `suds_baselines` value in the session start flow for context only. Post-MVP: connect re-baseline values to the clinical routing algorithm (item 1.11 above).

### 1.15 Remotely Updatable Helpline Configuration
**What:** Upgrade the static `packages/core/src/config/helplines.ts` config to a remotely updatable source — region-localised, modifiable without an app release.
**Source:** UX spec ("helplines from remotely updatable config (localised by region, not hardcoded)"); Story 7.5.
**Notes:** MVP: config file is the single point of truth; adding or changing a helpline requires an app release. Post-MVP: fetch from Supabase with local cache for offline fallback (satisfies NFR-OFFLINE-03). Consider locale detection for region-specific helplines at Phase 2 (non-India markets).

### 1.16 OTP Retry Limit During Authentication
**What:** Rate-limit OTP re-send attempts during phone number authentication.
**Source:** UX spec F1 decisions ("OTP: no retry limit MVP; flagged for post-MVP review").
**Notes:** MVP relies on Supabase Auth's default OTP behaviour. Post-MVP: enforce a retry limit (e.g., 3 attempts, 30-minute lockout) and display a user-facing countdown. Requires Supabase Auth configuration change and UI updates in Story 2.1.

### 1.17 Safety Behaviour Checklist — Post-Launch Clinical Review
**What:** The safety behaviour checklist (collected during onboarding or session setup) is implemented as a mandatory MVP item but flagged for post-launch clinical review of its scope, framing, and scoring.
**Source:** UX spec F1 decisions ("Safety behaviour checklist: mandatory MVP; flagged for post-MVP review").
**Notes:** The checklist is clinically motivated (identifying crutches that blunt exposure efficacy). Post-launch: review checklist items with a clinical advisor; adjust framing and item list as needed; determine whether scores should affect technique routing (links to item 1.11).

### 1.18 SPIN Re-Scoring at Week 4 and Week 8
**What:** Administer the mini-SPIN questionnaire again at Week 4 and Week 8 to measure anxiety reduction and adapt the user experience.
**Source:** PRD deferred scope.
**Notes:** MVP collects the mini-SPIN score only during onboarding. Post-MVP: schedule Week 4 and Week 8 re-assessments (push notification prompt + in-app questionnaire); delta scoring to show progress; may trigger intervention if anxiety increases.

### 1.19 User-Initiated Self-Service Data Export
**What:** Allow users to request and download their own data directly from app settings ("Settings → Privacy → Request my data") without going through the DPO operator.
**Source:** Story 3.5 decision record; Epic 3 privacy boundary.
**Notes:** MVP export is operator-initiated via the DPO panel (Story 3.4) on receipt of a user request. DPDPA Section 11 grants this right. Post-MVP: build the in-app export request flow, queue it to the DPO panel or auto-fulfil via Edge Function, and deliver the export as a downloadable package.

### 1.20 Consent Withdrawal Without Account Deletion (DPDPA Right-to-Object)
**What:** Allow users to withdraw data processing consent without deleting their account — distinct from account deletion (Story 2.4).
**Source:** Story 3.5 decision record.
**Notes:** MVP covers account deletion only. DPDPA Section 7 grants the right to withdraw consent. Post-MVP: build a consent withdrawal flow that revokes non-essential processing but preserves the account; clarify with legal what "withdrawal" means in the context of app functionality that depends on data processing.

### 1.21 Daily SUDS Check-In with Contextual Routing (FR-CHECKIN-01)
**What:** A daily in-app check-in capturing one SUDS rating (0–10) that routes to the appropriate support: ≥7 → somatic techniques, 4–6 → grounding, 1–3 → cognitive work or exposure.
**Source:** FR-CHECKIN-01; deferred from Epic 7 during final validation (no MVP story).
**Notes:** The routing thresholds are from the PRD. Check-in is the primary "gentle daily touchpoint" flow distinct from starting a full ERP session. Requires connection to FR-ADVERSE-02 (see item 1.22) and the full somatic/CBT suite (items 1.23–1.26) before check-in routing is clinically complete.

### 1.22 Check-In SUDS ≥8 Crisis Contacts (FR-ADVERSE-02)
**What:** When a daily check-in SUDS rating is ≥8, surface crisis resource contacts (iCall, Vandrevala Foundation, NIMHANS) inline on the routing screen alongside the technique recommendation, visible without any additional tap.
**Source:** FR-ADVERSE-02; deferred from Epic 7 during final validation (depends on FR-CHECKIN-01).
**Notes:** Contacts are already available on-device in `packages/core/src/config/helplines.ts`. Implementation requires only the inline placement on the check-in routing screen. Blocked by FR-CHECKIN-01 (item 1.21) being implemented first.

### 1.23 Thought Record — 6-Field Cognitive Tool (FR-CBT-01)
**What:** A structured thought record capturing: situation, automatic thought, emotion + intensity (0–10), evidence for the thought, evidence against the thought, and balanced thought.
**Source:** FR-CBT-01; deferred from Epic 7 during final validation (no MVP story).
**Notes:** Core CBT intervention. Can be surfaced from the check-in routing screen (score 1–3) or as a standalone technique from within the Calm Me toolkit. Requires its own data table and RLS policy. Copy and field prompts require clinical review.

### 1.24 Cognitive Distortion Library with Thought Tagging (FR-CBT-02)
**What:** A library of named cognitive distortion patterns with definitions; users can tag their automatic thoughts with one or more distortion types during thought record completion.
**Source:** FR-CBT-02; deferred from Epic 7 during final validation (no MVP story).
**Notes:** Companion to FR-CBT-01 (thought record). Distortion list (catastrophising, mind-reading, black-and-white thinking, etc.) requires clinical review and culturally-appropriate framing for India. Implemented as a tag selector within the thought record flow.

### 1.25 Behavioural Experiment Tool — 5-Field (FR-CBT-03)
**What:** A structured behavioural experiment tool capturing: hypothesis (anxious prediction), planned experiment, predicted outcome, actual outcome, revised belief rating (0–100%).
**Source:** FR-CBT-03; deferred from Epic 7 during final validation (no MVP story).
**Notes:** Distinct from the letter-to-self (which is pre/post-exposure narrative). The behavioural experiment is an active structured CBT technique for testing beliefs. Requires its own screen flow, data table, and RLS policy. Clinical review required for field labels and prompts.

### 1.26 Additional Somatic Techniques — 4-7-8, Bhramari, Nadi Shodhana, Body Scan (FR-SOM-01 remaining)
**What:** Full implementation of the remaining 4 somatic techniques required by FR-SOM-01: 4-7-8 breathing, Bhramari (humming breath), Nadi Shodhana (alternate nostril), and body scan — each with animated visual pacing and no audio requirement (FR-SOM-02).
**Source:** FR-SOM-01, FR-SOM-02; deferred from Epic 7 during final validation (MVP covers box breathing + 5-4-3-2-1 only).
**Notes:** Box breathing (Story 7.2) and 5-4-3-2-1 (Story 7.3) are the two MVP somatic techniques. The breathing coach config (`packages/core/src/config/breathingCoach.ts`) already documents the extension point for additional breathing patterns (item 1.7 above covers user-configurable timer/cycles). Each new technique needs its own animated visual guide (FR-SOM-02). Bhramari and Nadi Shodhana require audio-free visual pacing designs — Indian pranayama techniques with culturally resonant framing.

---

## 2. Phase 2 — Content & Therapeutic Tracks

These items are scoped to Phase 2 (Months 7–18, international markets or content expansion):

### 2.1 ACT Track
Values clarification, Leaves on a Stream, Committed Action exercises as a complementary therapeutic track alongside ERP.

### 2.2 Yoga / Philosophy Contextual Layering
Anchor system, ritual layer, progressive vocabulary inspired by Indian wellness traditions.

### 2.3 Community Features
Wins feed, accountability groups, peer support — requires moderation strategy and clinical governance.

### 2.4 Skill-Building Modules
Structured psychoeducation modules separate from the ERP session flow.

### 2.5 Therapist Portal (Phase 2)
Full therapist-facing UI for patient management, session review, and progress monitoring.
**Notes:** Schema and RLS are already HIPAA/GDPR-compatible by design (Stories 5.4, 5.5, ADR). The data layer requires no migration at Phase 2. The UI deliverable is the only remaining work.

### 2.6 Catch-Up Report (PDF / CSV Export for Therapists or Users)
Structured session history export for clinical handoff or personal record-keeping.

---

## 3. Clinical Governance & Sign-Off

### 3.1 mini-SPIN ≥6 Threshold — Clinical Sign-Off
**What:** The ≥6 threshold that triggers the full referral screen in onboarding is currently implemented per PRD but the clinical suitability for Indian urban adult wellness context (non-SaMD) is pending formal sign-off.
**Source:** PRD FR-ONBOARD-01; UX spec F1.
**Notes:** App access is granted at any score (the referral screen is advisory, not a gate). The sign-off may result in threshold adjustment (e.g., ≥8) or a change to the referral copy. Track with the clinical advisor engaged for the India launch.

### 3.2 Re-entry Copy Review — "You're back. That took courage."
**What:** The copy shown when a user re-opens the app after a mid-session exit is flagged for clinical tone review.
**Source:** UX spec F4 ("flagged for post-MVP copy review").
**Notes:** The copy must be warm and clinically grounded, not generic. Review alongside the broader copy audit for the re-entry state.

---

## 4. Security & Infrastructure

### 4.1 Field-Level Encryption for Fear Content
**What:** Encrypt `fear_ladder_items.description` (and potentially `pre_session_intention`, `post_session_reflection`) at rest using `pgcrypto`.
**Source:** Story 4.3 AC; ADR referenced therein.
**Notes:** MVP relies on Supabase at-rest disk encryption and RLS. Field-level encryption adds defence-in-depth but requires a key management strategy (key derivation, rotation, migration of existing rows). Documented in an ADR. Do not implement without first designing the key lifecycle — naive encryption that loses keys loses user data permanently.

### 4.2 HIPAA Infrastructure (Phase 2 — US Launch)
**What:** BAA with Supabase, audit logging, access controls, and data residency requirements for the US market.
**Source:** PRD Phase 2 scope; Architecture ADR.
**Notes:** Data model and RLS are HIPAA-compatible by design (ARC constraint enforced throughout). No schema migration required — infrastructure and compliance tooling are the Phase 2 deliverables.

### 4.3 EU / UK GDPR Compliance (Phase 2 — EU/UK Market Entry)
**What:** DPA/GDPR data mapping, EU data residency, right-to-erasure flow audit, lawful basis documentation.
**Source:** PRD Phase 2 scope.
**Notes:** DPDPA groundwork (Epic 3) reduces the delta. The main additions are data residency (EU Supabase region), lawful basis documentation for each processing activity, and a GDPR-compliant DPO designation.

### 4.4 Children's Data Handling Under DPDPA 2023
**What:** Parental consent flow for users under 18.
**Source:** Story 2.2 decision record.
**Notes:** MVP enforces 18+ via a self-declaration checkbox (Story 2.2). DPDPA 2023 Section 9 requires verifiable parental consent for processing data of minors. A parental consent flow is the post-MVP deliverable. Track alongside the mini-SPIN clinical sign-off (item 3.1) as both relate to user eligibility.

---

## 5. Monetisation

### 5.1 Pricing and Monetisation Mechanics
**What:** Freemium tier limits, subscription paywall, in-app purchase flow, pricing strategy for India (₹200–500/month).
**Source:** PRD deferred scope.
**Notes:** The PRD documents the target pricing range and LTV/CAC goal (LTV > 3× CAC). All features are currently ungated. Post-MVP: determine feature gating strategy, integrate payment provider (Razorpay for India), implement subscription management.

---

## 6. UX & Copy

### 6.1 State 10 vs. State 9 Priority Logic Review
**What:** When both the completed-ladder condition (state 10) and the re-engagement gap (state 9) apply simultaneously, state 10 should outrank state 9. The exact priority logic and UX are flagged for post-MVP review.
**Source:** UX spec F5 decisions.

### 6.2 Avoidance Classification Thresholds — Clinical Review
**What:** The three provisional avoidance signals (3+ app opens without debrief; thread open > 6 hours; user self-declaration) need clinical validation before the avoidance state (state 5) goes live.
**Source:** UX spec F5 decisions.

### 6.3 Technique Nudge Copy Review
**What:** The contextual nudge shown during technique selection ("at a SUDS of X, most people start with Y") is MVP copy and should be reviewed against clinical evidence before use at scale.
**Source:** UX spec F3 decisions ("full clinical routing post-MVP").

### 6.4 Calm Me Affirmation Rotation
**What:** The courage affirmation ("Your nervous system is doing exactly what it's supposed to do") is a single-entry array in MVP (`CALM_ME_AFFIRMATIONS` in `packages/core/src/config/calmMeConfig.ts`). Post-MVP: add multiple entries for rotation so repeat users don't see the same line every time.
**Source:** Story 7.1 party mode review (Sally); array structure already in place — post-MVP requires only adding entries.
**Notes:** Entries may be clinically reviewed and personalised over time (e.g., vary by SUDS level or session history).

### 6.5 Grounding Screen Distinct Framing Copy
**What:** The grounding screen (reached via mandatory Stop Exposure) and the Calm Me support screen (reached via FAB) share the same technique content but represent different emotional contracts. Post-MVP: give the grounding screen distinct framing copy ("let's pause and regroup so you can finish") vs. Calm Me ("you needed a moment, and that's okay").
**Source:** Story 7.5 party mode review (Sally); marked with a `// TODO post-MVP` comment in the grounding screen component.

---

## 7. Analytics & Instrumentation

*ARC-012 defers all analytics writes to Phase 2 — zero analytics events in MVP. Items below are ready to instrument once the analytics pipeline is in place.*

### 7.1 Calm Me Technique Selection Tracking
`track('calm_me_technique_selected', { technique: 'breathing' | '54321' | 'helplines', sessionContext: 'active' | 'non_session' })`

### 7.2 Helpline Access Tracking
`track('helpline_tapped', { helplineId: 'icall' | 'vandrevala' | 'nimhans' })`

### 7.3 Breathing Session Completion Rate
`track('breathing_session_ended', { completionType: 'timer_expired' | 'early_exit' | 'dismissed', elapsedSeconds: number })`

### 7.4 5-4-3-2-1 Completion Rate
`track('grounding_541_ended', { completionType: 'completed' | 'dismissed', stepsReached: number })`

### 7.5 Calm Me "I need to stop" Frequency
`track('calm_me_stop_selected', { debriefChoice: 'debrief_now' | 'not_now' })`

---

## 8. Notifications UX

### 8.1 Quiet Hours Gate for Post-Session Reflection Prompt
**What:** The 8.3 post-session notification fires ~3h after session completion. If the session ended at 11pm, the notification arrives at 2am. Add a quiet hours gate (e.g., 10pm–8am local time) that delays delivery to the next morning rather than waking the user.
**Source:** Story 8.3 party mode review (Sally); explicitly deferred from MVP scope.
**Notes:** Requires local time zone detection at Edge Function dispatch time. Can use the notification scheduling layer to delay to next morning window.

### 8.2 In-App Notification Preferences / Opt-Out
**What:** A user who granted notification permission once but now wants quiet cannot turn off notifications from within the app — they must use OS settings. Build an in-app notification preferences screen with per-notification-type toggles.
**Source:** Story 8 party mode review (John); explicitly deferred from MVP (OS settings only for MVP).
**Notes:** Types to toggle: daily reminder, post-session reflection prompt, re-engagement nudge. Store preferences in MMKV and/or Supabase.

### 8.3 First-Week Check-in Notification
**What:** A new user who completes one session and then goes quiet for 3–4 days receives no communication. A gentle "how's it going?" check-in for users in their first week who haven't yet established a practice pattern.
**Source:** Story 8 party mode review (Sally).
**Notes:** Distinct from re-engagement nudge (which requires 10+ days of silence). First-week check-in is a habit-formation nudge, not a re-activation nudge. Threshold and copy require clinical review.
