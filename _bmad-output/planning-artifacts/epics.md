---
stepsCompleted: ["step-01-validate-prerequisites"]
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture/index.md"
  - "_bmad-output/planning-artifacts/architecture/project-context-analysis.md"
  - "_bmad-output/planning-artifacts/architecture/starter-template-evaluation.md"
  - "_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md"
  - "_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md"
  - "_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md"
  - "_bmad-output/planning-artifacts/architecture/architecture-validation-results.md"
  - "_bmad-output/planning-artifacts/ux-design-specification/index.md"
  - "_bmad-output/planning-artifacts/ux-design-specification/component-strategy.md"
  - "_bmad-output/planning-artifacts/ux-design-specification/design-system-foundation.md"
  - "_bmad-output/planning-artifacts/ux-design-specification/responsive-design-accessibility.md"
  - "_bmad-output/planning-artifacts/ux-design-specification/visual-design-foundation.md"
  - "_bmad-output/planning-artifacts/ux-design-specification/user-journey-flows.md"
  - "_bmad-output/planning-artifacts/ux-design-specification/defining-experience.md"
  - "_bmad-output/planning-artifacts/ux-design-specification/ux-consistency-patterns.md"
  - "_bmad-output/planning-artifacts/adrs/ADR-RN-VERSION.md"
  - "_bmad-output/planning-artifacts/adrs/ADR-HOME-STATE-RESOLVE.md"
  - "_bmad-output/planning-artifacts/adrs/ADR-LADDER-SNAPSHOT.md"
  - "_bmad-output/planning-artifacts/adrs/ADR-ERROR-STATES.md"
  - "_bmad-output/planning-artifacts/adrs/ADR-DARK-MODE-NATIVEWIND.md"
  - "_bmad-output/planning-artifacts/adrs/ADR-CALMME-KEYBOARD.md"
  - "_bmad-output/planning-artifacts/adrs/ADR-ONBOARDING-BREATHING.md"
  - "_bmad-output/planning-artifacts/adrs/ADR-OFFLINE-DEGRADATION.md"
  - "_bmad-output/planning-artifacts/adrs/ADR-TECHNIQUE-SUDS-FALLBACK.md"
---

# exposure-buddy - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for exposure-buddy, decomposing the requirements from the PRD, UX Design Specification, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-AUTH-01: Users authenticate using email address or phone number; both paths use OTP verification
FR-AUTH-02: Logged-out users access all 3 preview challenges without authentication; challenge completions are stored on-device only (local storage, no backend record); on account creation, local completions are written to the user's account (re-assign, not copy); if the user already has a completion for a given challenge, the existing record is kept (first-completion-wins); anonymous progress is intentionally not retained across app reinstalls
FR-SAFE-01: Account creation presents two mandatory checkboxes before the creation action executes: (1) user is 18+ and (2) Exposure Buddy is a general health and wellness app and its content is not valid for medico-legal proceedings; account creation is disabled until both boxes are checked
FR-ONBOARD-01: Users complete the 3-question mini-SPIN questionnaire during onboarding (each item scored 0–4, maximum score 12); three-tier response based on score: (1) score 0–3 — no message, proceed to app; (2) score 4–5 — inline soft advisory shown, no tap required, user proceeds; (3) score ≥6 — full referral screen with iCall, Vandrevala Foundation, and NIMHANS contacts, explicit acknowledgement tap required before proceeding; full app access granted after acknowledgement at any score; ≥6 threshold pending clinical sign-off for Indian urban adult population in a wellness (non-SaMD) context
FR-ONBOARD-02: Users complete a 3–4 question conversational symptom check followed by a 15-item safety behaviour checklist; responses stored and used to personalise initial hierarchy template suggestions
FR-ONBOARD-03: Psychoeducation on the anxiety cycle presented inline immediately before the user's first exposure; avoidance explainer presented at the moment a safety behaviour item is selected — not as a front-loaded module
~~FR-GATE-01: REMOVED~~ — The exposure hierarchy is immediately accessible after onboarding; no prerequisite session required before building the courage ladder
FR-HIER-01: Users build a personalised exposure hierarchy by selecting from neutral templates; each item receives a SUDS rating (0–10) assigned by the user
FR-HIER-02: Users add custom hierarchy items beyond the template library; custom items receive the same SUDS rating and stall tracking as template items
FR-HIER-03: After 2 consecutive ERP sessions on the same hierarchy item with no measurable SUDS reduction between sessions, the system surfaces a stall prompt recommending the user step down to an easier item
FR-ERP-01: Each ERP session executes three sequential phases: pre-session briefing → active exposure with SUDS logging → structured debrief; users cannot skip or reorder phases
FR-ERP-02: During the active exposure phase, users log SUDS ratings (0–10) at self-initiated intervals; each log entry records timestamp and SUDS value
FR-ERP-03: The debrief screen renders a SUDS arc graph plotting entry score, all mid-session log entries, and exit score; the debrief prompts structured reflection on what happened and what was learned
FR-ERP-04: If a session is aborted during the active exposure phase, the partial attempt is logged without displaying a failed-session count, negative XP, or streak-reset language; all SUDS entries recorded before abort are retained
FR-CBT-01: The thought record captures six fields in sequence: situation, automatic thought, emotion and intensity rating (0–10), evidence for the thought, evidence against the thought, and balanced thought
FR-CBT-02: The cognitive distortion library presents named distortion patterns with definitions; users can tag their automatic thoughts with one or more distortion types during thought record completion
FR-CBT-03: The behavioural experiment tool captures five fields: hypothesis (anxious prediction), planned experiment, predicted outcome, actual outcome, and revised belief rating (0–100%)
FR-SOM-01: Users access six somatic techniques: 4-7-8 breathing, box breathing, Bhramari, Nadi Shodhana, 5-4-3-2-1 grounding, body scan
FR-SOM-02: Each somatic technique presents an animated visual guide pacing the user through the exercise; completion requires no audio output — the visual guide is sufficient
FR-CHECKIN-01: The daily check-in captures one SUDS-scale rating (0–10); score ≥7 routes to somatic techniques; score 4–6 routes to grounding; score 1–3 routes to cognitive work or exposure
FR-PROG-01: Users view a SUDS trend graph aggregating data from all completed ERP sessions; viewable in weekly and monthly time windows
FR-PROG-02: Users view a chronological exposure history log displaying each completed and partially-completed session, the SUDS arc, and the debrief outcome
FR-NOTIF-01: After 2 consecutive days of inactivity, one re-engagement notification sent using warm non-punitive language; if inactivity continues, a second sent on Day 5; no further automated notifications in that inactivity window
FR-NOTIF-02: Notification content contains no streak counters, missed-day counts, streak-reset warnings, or loss-framing constructs
FR-NOTIF-03: Users control notification delivery timing and can opt out of individual notification types from app settings; opt-out honoured immediately
FR-CRISIS-01: Hardcoded keyword pre-filter runs on user-entered text fields; detection triggers immediate in-app display of crisis resources (iCall +91-9152987821, Vandrevala Foundation 1860-2662-345, NIMHANS 080-46110007) — contacts are hardcoded strings that display without a network call
FR-CRISIS-02: Crisis keyword list covers English and Hindi; embedded in client binary; updated via app release only
FR-CRISIS-03: SOS panic button rendered persistently on all screens during an active ERP session; activating it launches a breathing coach and 5-4-3-2-1 grounding sequence in an overlay without terminating or navigating away from the session
FR-I18N-01: All user-facing strings externalised to a localisation layer; no UI string hardcoded in application code; English is the only content locale at MVP launch
FR-I18N-02: The layout system renders correctly in RTL mode; RTL support implemented at MVP even if no RTL language launches at MVP
FR-ANALYTICS-01: First-party analytics capture two Day 1 primary metrics: (1) core loop retention — % of Day 1 users who complete ≥1 ERP session within first 24 hours; (2) SUDS cadence — % of active ERP sessions with ≥2 SUDS log entries
FR-ANALYTICS-02: No user health data, session content, SUDS records, or PII transmitted to any third-party analytics, advertising, or data-broker service
FR-ANALYTICS-BOUNDARY-01: No analytics event writes occur in Phase 1 (MVP); all candidate Phase 1 events (SUDS ratings, session completions, step completions, abandonment status) are classified as clinical session data and stored in the session schema only; the analytics_events table exists in the Phase 1 migration as a schema stub with a CHECK constraint permitting zero event_name values at MVP; adding an event name requires a database migration with explicit approval from both the lead clinician (clinical necessity test) and data controller (DPDPA purpose limitation test); when Phase 2 analytics activate, raw SUDS values and session_id are classified as health data and prohibited in analytics_events — permitted analytics fields are limited to device context, UI interaction timing, and pseudonymous session_token (SHA-256(session_id), irreversible)
FR-SUDS-ANCHOR-01: The SUDS scale displays a static set of reference anchors on every interaction where a rating is collected (pre-exposure rating, in-session SUDS log, daily check-in, and debrief); static label set: 0 = completely calm, 2 = very mild, 4 = mild, 6 = moderate, 8 = severe, 10 = worst imaginable; anchors rendered as inline subtext visible at all times during rating entry — not behind a tooltip or expandable control
FR-ADVERSE-01: When a user logs a SUDS entry of ≥8 during an active ERP session, the app immediately presents a non-blocking grounding offer (banner or prompt) with the option to open the CalmMe overlay (breathing + 5-4-3-2-1 sequence); the offer does not terminate the session and is dismissible; when the debrief exit SUDS rating is ≥8, crisis resource contacts (iCall, Vandrevala Foundation, NIMHANS) are displayed inline on the debrief screen alongside standard debrief content
FR-ADVERSE-02: When a daily check-in SUDS rating is ≥8, crisis resource contacts (iCall, Vandrevala Foundation, NIMHANS) are displayed inline on the somatic technique routing screen alongside the technique recommendation; the contacts are visible without any additional tap or navigation
FR-DPO-01: A Data Protection Officer is appointed before India launch; the DPO's contact email is published in the in-app Privacy Notice and accessible from app settings without authentication
FR-DPO-02: Users submit data export requests from Settings → Privacy → Request my data; each request is logged in the dpo_audit_log table with timestamp, requesting user_id, and request type; export is delivered to the user's registered email within 72 hours of request
FR-DPO-03: Users submit account deletion requests from Settings → Privacy → Delete my account; deletion enters a 30-day soft-delete window during which the account is inaccessible to the user; after 30 days, all personal data is permanently deleted except records required for DPDPA 2023 compliance retention (consent records retained for account lifetime plus 2 years post-deletion)
FR-DPO-04: Every consent event (grant, withdrawal, version update) is written exclusively via the consent-record Edge Function; direct writes to consent tables from any other code path are prohibited; consent records store four mandatory fields: timestamp UTC, purpose ID, consent version, and withdrawal status
FR-DPO-05: The DPO operator panel (self-hosted HTML, operator-authenticated) provides: user lookup by email, consent record view, data export trigger, deletion trigger, and per-user audit log view; the panel operates independently of Supabase Studio and is not a Supabase account dependency
FR-DPO-06: All DPO actions (export triggered, deletion triggered, audit log accessed) are recorded in the append-only dpo_audit_log table with: action type, acting DPO user_id, target user_id, timestamp, and outcome; dpo_audit_log rows cannot be updated or deleted
FR-DPO-07: The DPO interface (Edge Functions: /dpo/erase-user, /dpo/export-user, /dpo/audit-log; and operator panel) must be deployed and verified before any personal data is processed in production; this is a hard go-live dependency

### NonFunctional Requirements

NFR-PERF-01: App loads to home screen in <3 seconds at 90th percentile on target device profile (mid-range Android, 2GB RAM, Android 10+, 4G); measured by synthetic device testing in CI before each release
NFR-PERF-02: ERP session SUDS log operations — from user tap to confirmed local write — complete in <500ms on target device profile
NFR-PERF-03: Daily check-in submission routes the user to the recommended technique screen in <1 second from tap on target device profile
NFR-OFFLINE-01: All three ERP session phases (pre-session briefing, active SUDS logging, debrief) function fully without data loss when the device has no network connectivity at any point during the session
NFR-OFFLINE-02: Session data logged during offline ERP sessions syncs automatically within 30 seconds of connectivity restoration; no user action required; no log entry lost
NFR-OFFLINE-03: Crisis resource contacts (iCall, Vandrevala Foundation, NIMHANS) stored on-device and display without a network call at all times
NFR-REL-01: Backend API achieves 99.5% uptime during India business hours (06:00–24:00 IST) as measured by uptime monitoring at 1-minute resolution
NFR-REL-02: If the app crashes during an active ERP session, all SUDS log entries recorded before the crash are recoverable on the first restart following the crash; no in-session data permanently lost
NFR-SEC-01: All user health data (anxiety ratings, SUDS records, session logs, symptom check responses, safety behaviour data) encrypted at rest using AES-256 and in transit using TLS 1.3 minimum
NFR-SEC-02: Row Level Security enforced on all database tables containing user health data; cross-user data access blocked at the database layer with no application-layer bypass permitted
NFR-SEC-03: DPDPA 2023 consent records store four required fields: timestamp (UTC), purpose ID, consent version, and withdrawal status; retained for account lifetime plus 2 years
NFR-SEC-04: The system activates HIPAA and GDPR compliance enforcement for Phase 2 markets without requiring migration of existing user data
NFR-SEC-05: A Data Protection Officer is appointed and their contact information published in the app's privacy notice before India launch
NFR-SEC-06: Crisis keyword detection runs entirely on-device using a hardcoded list; no user-entered text transmitted to any external service for crisis detection processing
NFR-DEVICE-01: All screens render without layout breakage and all FRs are met on mid-range Android devices with minimum 2GB RAM running Android 10+
NFR-DEVICE-02: All screens render without layout breakage and all FRs are met on iOS 16+ and on the last 2 major versions of Chrome, Firefox, and Safari
NFR-ACCESS-01: All interactive UI elements have accessible labels; minimum tap target 44×44 density-independent pixels; colour contrast ratios meet WCAG 2.1 Level AA (4.5:1 normal text, 3:1 large text and UI components)
NFR-SCALE-01: Backend supports 10,000 concurrent active users at India launch as validated by load testing completed before go-live

### Additional Requirements

- ARC-001: Turborepo monorepo initialized via `npx create-turbo@latest exposure-buddy --package-manager pnpm`; package structure: packages/core (pure TS, zero framework deps), packages/sync (PowerSync 1.34.0), packages/supabase, packages/ui (NativeWind 5.0.0-preview.3), apps/mobile (Expo SDK 54 / RN 0.81 / Expo Router v4), apps/web (Phase 2 placeholder with CI import gate)
- ARC-002: Firebase project created, `google-services.json` committed, Android package name locked — Story 1 pre-condition (notification channel taxonomy: crisis-alerts, reminders, check-ins)
- ARC-003: EAS Build profiles (development/preview/production) + `eas.json` configured and validated on a clean 2GB RAM Android device before sprint 2 — Story 1 deliverable
- ARC-004: MMKV + Expo SecureStore (Android Keystore API 23+) for encrypted local storage; startup dependency graph: MMKV key derivation → MMKV sync reads → PowerSync init → route decision
- ARC-005: PowerSync SyncAdapter interface (enqueue/flush/getPendingCount) in packages/sync; all durable writes go through adapter — never direct PowerSyncDatabase.execute() from apps; SUDS writes use client-generated UUIDs with ON CONFLICT DO NOTHING
- ARC-006: Dual-role RLS from day one — patient_access policies (active), clinician_access policies (stubbed, gated by therapist_patient.enabled = false DEFAULT)
- ARC-007: RLS policy test harness in packages/supabase/__tests__/rls/ — four-assertion minimum per policy: [+] own read, [-] cross-user read, [-] unauthenticated, [stub] clinician path returns empty
- ARC-008: DPO interface — three Supabase Edge Functions (/dpo/erase-user, /dpo/export-user, /dpo/audit-log) + append-only dpo_audit_log table + self-hosted HTML operator panel; go-live dependency
- ARC-009: DPDPA consent schema: consent_records + user_consent_status tables with policy_version, locale, consent_mechanism fields; all consent writes exclusively via supabase/functions/consent-record Edge Function
- ARC-010: Four ADRs resolved in planning phase — ADR documents must be authored before dependent stories enter sprint: ADR-ZUSTAND-PANEL (resolved: Zustand scoped to panel/overlay UI coordination only; clinical data reads via PowerSync reactive queries, never Zustand store); ADR-AUTH-TOKEN-PROVIDER (resolved: AuthTokenProvider interface in packages/core; DI via constructor; apps/mobile is composition root); ADR-NOTIFICATIONS (resolved: Expo Push Service → FCM/APNs; content-neutral payload with no health data; preferences synced via PowerSync; best-effort nudge); ADR-DPO-INTERFACE (resolved: in-app Data Rights screen + self-hosted HTML operator panel + 30-day soft-delete + append-only dpo_audit_log — see FR-DPO-01–07)
- ARC-011: packages/core import boundary CI gate — zero RN, Expo, or Supabase dependencies (even as devDeps); all violations fail build
- ARC-012: Analytics deferred to Phase 2 — zero analytics writes at MVP; all Phase 1 candidate events are clinical session data
- ARC-013: SDK dependency audit CI gate in GitHub Actions — flags new npm dependencies requiring explicit sign-off on transmitted data categories
- ARC-014: ExposureThread data model in packages/core with status state machine (preparing → active → pending_reflection → completed → expired); situation_text_snapshot stored at "Let's do this" tap; expires_at set server-side (UTC epoch ms bigint); welfare_flag BOOLEAN on thread record
- SPIKE-001: NativeWind v5 validation spike — 3-day time-box, hard blocker for all packages/ui component stories; acceptance criteria: (1) nativewind@5.0.0-preview.3 installs without dependency conflict on Expo SDK 54 / RN 0.81 monorepo; (2) CSS custom property resolution verified on a 2GB RAM Android 10+ device (Hermes engine); (3) accessibilityLabel, accessibilityRole, accessibilityHint, and aria-live props resolve correctly through NativeWind class-to-prop mapping on both iOS 16+ and Android 10+; (4) hot reload functions correctly with Expo Router v4; exit outcomes — PASS: proceed with NativeWind v5 for all packages/ui components; FALLBACK: StyleSheet-based components with explicit a11y props approved, ADR revision required, all UI component stories re-baselined before sprint entry

### UX Design Requirements

UX-DR1: Design token system authored in packages/ui/src/tokens/theme.ts before any component work — complete typed set: 8 semantic colour tokens, 3 motion presets (preparing: 200ms ease-out / grounding: 400ms ease-in-out / reflecting: 600ms ease-out), 4 haptic constants (breathingRhythm/dragConfirmation/commitmentTap/techniqueCompletion), spacing scale (4px base, 11 tokens), 9-token typography scale
UX-DR2: Three mode registers with distinct token surfaces: preparing (bg: #F5F7F6, motion: 200ms), grounding (unchanged bg, motion: 400ms, touch targets: 56×56px, zero network dependency), reflecting (bg: #FDF7ED, motion: 600ms, space-10 breathing room); mode register enforcement: grounding token imports must not appear inside any Context or Provider file
UX-DR3: Phase 0 NativeWind v5 validation spike — verify nativewind@5.0.0-preview.3 on 2GB RAM Android 10+ and iOS 16+: CSS custom property resolution on Android Hermes, accessibilityLabel/accessibilityRole/aria-live prop resolution, hot reload with Expo Router v4; document results; hard blocker triggers ADR revision
UX-DR4: Phase 0 library evaluation (react-native-reusables/rn-primitives + @gorhom/bottom-sheet) — written decision memo required, 1-day time-boxed, before any packages/ui component is built
UX-DR5: Three mode briefs written as pre-sprint-1 PM gate (preparation / in-the-moment / reflection); sprint 1 blocked until all three briefs exist and are signed off
UX-DR6: 11 MVP custom components built in two phases — Phase 1 core (HomeStateCard, LadderItemCard, DragRankList, TechniqueCard, CalmMeButton, SudsArcChart); Phase 2 loop completion (LetterToSelfEditor, LetterReveal, AcknowledgementCard, GroundingPrompt, HelplineCard); all built using design tokens only — raw Tailwind utility values prohibited in composed components
UX-DR7: resolveHomeScreenState(ctx: HomeScreenContext): HomeScreenState — pure function in packages/core implementing canonical priority ordering for all 10 home screen states; minimum 5 happy/sad path Vitest test cases required
UX-DR8: CalmMeButton persistent across all screens — zero navigation, instant render, no loading state, no network dependency; renders above all other JS-layer UI; rendering strategy ADR (root layout absolute position vs. @gorhom/portal) required before in-the-moment sprint
UX-DR9: "Courage ladder" naming throughout all user-facing copy — never "fear ladder" or "exposure hierarchy"; enforced in copy review gate on every PR touching user-visible strings
UX-DR10: SUDS scale anchoring text (light-weight subtext per value, 0–10 scale) displayed on every SUDS interaction: pre-exposure gate, in-session logging, re-calibration check-in, debrief; "0 = no anxiety, 10 = worst imaginable" on first interaction
UX-DR11: Five debrief return paths implemented with distinct copy and data outcomes: "I did it" (user controls debrief depth) / "I tried" (partial exposure path) / "I decided to wait" (flags deliberate avoidance to recommendation engine) / "Not yet" (circumstantial delay, no pressure) / "Rather not say" (sets welfare_flag = true, surfaces grounding technique next day — not a challenge)
UX-DR12: ExposureThread state machine (IDLE → PREPPING → COMMITTED → [RETURNED | WINDOW_EXPIRED | ABANDONED]) with 48hr server-authoritative window; situation_text_snapshot written at "Let's do this" tap (not at prep-screen exit); expires_at as UTC epoch ms bigint in Supabase; float rank_score for ladder item ordering (not cardinal integers)
UX-DR13: Prediction vs. reality reveal — letter-to-self written at pre-exposure with deliberate pause before continue button activates; hard-case sequence (actual SUDS ≥ predicted): grounding offer first → deliberate pause (no auto-advance) → optional reflection; no breath-holding techniques in hard-case grounding
UX-DR14: Pairwise comparative ranking for new ladder item placement (max 3 comparisons, bisection algorithm); drag-to-rank view available at 2+ items; single-item warmth state with "Add another" prompt; drag-to-rank hidden at 1 item
UX-DR15: AnimationContext at _layout.tsx root with live reduceMotionChanged listener (NOT boot-only); all animation durations collapse to 0ms when reduceMotion: true; animation default: reduced: true until provider confirms otherwise (fail-safe, not fail-open)
UX-DR16: Post-transition focus management — AccessibilityInfo.setAccessibilityFocus() on primary interactive element in useFocusEffect when reduceMotion: true; required for all in-the-moment screens; recommended for all mode transitions
UX-DR17: WCAG 2.1 AA colour contrast pre-sprint-1 audit gate — all token pairs tested at 4.5:1 (normal text) and 3:1 (large text/UI); known risk: accent.grounding (#8B6F47) on white must be verified or replaced; amber accent (#E8A84C) decorative-only on reflection background; written sign-off (designer + QA) before sprint 1
UX-DR18: In-the-moment home screen state 6 two-CTA layout — vertical stack at 375pt floor: primary CTA full-width teal, secondary CTA full-width below with soft styling; side-by-side is not viable at 375pt
UX-DR19: Touch targets by register — in-the-moment: 56×56px visual dimension (semantic token: tapTarget.inTheMoment: 56); preparation/reflection: 44×44pt iOS / 48dp Android; verified via visual dimension in PR review, not assumed from hitSlop
UX-DR20: VoiceOver/TalkBack 5-flow written pass on in-the-moment screens on physical devices (simulator insufficient for launch gate): (1) CalmMeButton → overlay focus; (2) GroundingPrompt step announcements; (3) preparation→in-the-moment focus on primary CTA; (4) same with reduceMotion: true; (5) CalmMe dismiss → focus returns to originating element
UX-DR21: Typography system — Inter (body system-wide) + DM Serif Display italic restricted to 4 surfaces only: score reveal, prediction vs. reality reveal, week 4/8 progress readback, pre-exposure write read-back; PR gate: no primary copy uses text-body-sm or smaller
UX-DR22: colorScheme="light" locked at app root; dark: NativeWind classes disabled; CI regression test asserting light-mode-only rendering (ADR-DARK-MODE-NATIVEWIND)
UX-DR23: SafeAreaProvider at root _layout.tsx — sprint-0 prerequisite (absence is a day-1 crash); ReducedMotionProvider context at _layout.tsx root — sprint-0 task
UX-DR24: HelplineCard data from remotely-updatable config (not hardcoded in binary); remote config system ADR required (Firebase Remote Config vs. Supabase table vs. bundled JSON fallback vs. Expo Updates config) before onboarding sprint
UX-DR25: In-the-moment and avoidance-moment screens require PM-signed tested prototype before implementation sprint — Figma prototype, React Native sketch, or paper walkthrough with a user who has social anxiety; PM owns gate decision
UX-DR26: Component data contracts — welfare_flag BOOLEAN on thread record; from_template BOOLEAN + template_id UUID FK on hierarchy items for template provenance; situation_text_snapshot TEXT stored at commit moment (never FK-join mutable situations table for historical narrative readback)
UX-DR27: Soft nudge at item 8 on fear ladder ("That's a solid ladder — most people find 10–15 items gives enough gradient"); dismissible; clinical framing not cheerleading; no maximum ladder size at MVP

### FR Coverage Map

_To be completed in Step 2 (epic design)_

## Epic List

_To be completed in Step 2 (epic design)_
