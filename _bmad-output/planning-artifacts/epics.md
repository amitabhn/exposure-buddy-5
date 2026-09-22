---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-epic-1", "step-03-epic-2", "step-03-epic-3", "step-03-epic-4", "step-03-epic-5", "step-03-epic-6", "step-03-epic-7", "step-03-epic-8", "step-03-epic-9"]
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
FR-ONBOARD-01: Users complete the 3-question mini-SPIN questionnaire during onboarding (each item scored 0–4, maximum score 12); three-tier response based on score: (1) score 0–3 — no message, proceed to app; (2) score 4–5 — inline soft advisory shown, no tap required, user proceeds; (3) score ≥6 — full referral screen with market-configured crisis resource contacts, explicit acknowledgement tap required before proceeding; full app access granted after acknowledgement at any score; ≥6 referral threshold requires clinical input before go-live in each launch market
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
FR-PROG-01: ~~Users view a SUDS trend graph aggregating data from all completed ERP sessions; viewable in weekly and monthly time windows~~ — **DEFERRED post-MVP (2026-06-21)** — see FR Coverage Map decision record
FR-PROG-02: ~~Users view a chronological exposure history log displaying each completed and partially-completed session, the SUDS arc, and the debrief outcome~~ — **DEFERRED post-MVP (2026-06-21)** — see FR Coverage Map decision record
FR-NOTIF-01: After 2 consecutive days of inactivity, one re-engagement notification sent using warm non-punitive language; if inactivity continues, a second sent on Day 5; no further automated notifications in that inactivity window
FR-NOTIF-02: Notification content contains no streak counters, missed-day counts, streak-reset warnings, or loss-framing constructs
FR-NOTIF-03: Users control notification delivery timing and can opt out of individual notification types from app settings; opt-out honoured immediately
FR-NOTIF-04: ~~A push notification is sent 3 hours after an exposure session is completed if the user has not yet submitted their post-session reflection and the 6-hour reflection window is still open; notification copy is non-punitive and frames the window as still available; once dispatched, the session is marked notified (window_notified_at) and no further window-close notifications are sent for that session; users with no registered push token are skipped without error~~ — **DEFERRED post-MVP (2026-06-15)** by Story 5.6 / Issue #36 — see FR Coverage Map decision record
FR-CRISIS-01: Hardcoded keyword pre-filter runs on user-entered text fields; detection triggers immediate in-app display of market-configured crisis resource contacts — contacts are hardcoded strings that display without a network call
FR-CRISIS-02: Crisis keyword list covers English and Hindi; embedded in client binary; updated via app release only
FR-CRISIS-03: SOS panic button rendered persistently on all screens during an active ERP session; activating it launches a breathing coach and 5-4-3-2-1 grounding sequence in an overlay without terminating or navigating away from the session
FR-I18N-01: All user-facing strings externalised to a localisation layer; no UI string hardcoded in application code; English is the only content locale at MVP launch
FR-I18N-02: The layout system renders correctly in RTL mode; RTL support implemented at MVP even if no RTL language launches at MVP
FR-ANALYTICS-01: First-party analytics capture two Day 1 primary metrics: (1) core loop retention — % of Day 1 users who complete ≥1 ERP session within first 24 hours; (2) SUDS cadence — % of active ERP sessions with ≥2 SUDS log entries
FR-ANALYTICS-02: No user health data, session content, SUDS records, or PII transmitted to any third-party analytics, advertising, or data-broker service
FR-ANALYTICS-BOUNDARY-01: No analytics event writes occur in Phase 1 (MVP); all candidate Phase 1 events (SUDS ratings, session completions, step completions, abandonment status) are classified as clinical session data and stored in the session schema only; the analytics_events table exists in the Phase 1 migration as a schema stub with a CHECK constraint permitting zero event_name values at MVP; adding an event name requires a database migration with explicit approval from both the lead clinician (clinical necessity test) and data controller (DPDPA purpose limitation test); when Phase 2 analytics activate, raw SUDS values and session_id are classified as health data and prohibited in analytics_events — permitted analytics fields are limited to device context, UI interaction timing, and pseudonymous session_token (SHA-256(session_id), irreversible)
FR-SUDS-ANCHOR-01: The SUDS scale displays a static set of reference anchors on every interaction where a rating is collected (pre-exposure rating, in-session SUDS log, daily check-in, and debrief); static label set: 0 = completely calm, 2 = very mild, 4 = mild, 6 = moderate, 8 = severe, 10 = worst imaginable; anchors rendered as inline subtext visible at all times during rating entry — not behind a tooltip or expandable control
FR-ADVERSE-01: When a user logs a SUDS entry of ≥8 during an active ERP session, the app immediately presents a non-blocking grounding offer (banner or prompt) with the option to open the CalmMe overlay (breathing + 5-4-3-2-1 sequence); the offer does not terminate the session and is dismissible; when the debrief exit SUDS rating is ≥8, market-configured crisis resource contacts are displayed inline on the debrief screen alongside standard debrief content
FR-ADVERSE-02: When a daily check-in SUDS rating is ≥8, market-configured crisis resource contacts are displayed inline on the somatic technique routing screen alongside the technique recommendation; the contacts are visible without any additional tap or navigation
FR-DPO-01: A Data Protection Officer is appointed before India launch; the DPO's contact email is published in the in-app Privacy Notice and accessible from app settings without authentication
FR-DPO-02: Users submit data export requests from Settings → Privacy → Request my data; each request is logged in the dpo_audit_log table with timestamp, requesting user_id, and request type; export is delivered to the user's registered email within 72 hours of request
FR-DPO-03: Users submit account deletion requests from Settings → Privacy → Delete my account; deletion enters a 30-day soft-delete window during which the account is inaccessible to the user; after 30 days, all personal data is permanently deleted except records required for DPDPA 2023 compliance retention (consent records retained for account lifetime plus 2 years post-deletion)
FR-DPO-04: Every consent event (grant, withdrawal, version update) is written exclusively via the consent-record Edge Function; direct writes to consent tables from any other code path are prohibited; consent records store four mandatory fields: timestamp UTC, purpose ID, consent version, and withdrawal status
FR-DPO-05: The DPO operator panel (self-hosted HTML, operator-authenticated) provides: user lookup by email, consent record view, data export trigger, deletion trigger, and per-user audit log view; the panel operates independently of Supabase Studio and is not a Supabase account dependency
FR-DPO-06: All DPO actions (export triggered, deletion triggered, audit log accessed) are recorded in the append-only dpo_audit_log table with: action type, acting DPO user_id, target user_id, timestamp, and outcome; dpo_audit_log rows cannot be updated or deleted
FR-DPO-07: The DPO interface (Edge Functions: /dpo/erase-user, /dpo/export-user, /dpo/audit-log; and operator panel) must be deployed and verified before any personal data is processed in production; this is a hard go-live dependency
FR-LADDER-01: Users view their complete fear hierarchy on a dedicated full-ladder screen, with each item showing description, predicted SUDS, and status indicator (pending / in_progress / completed); screen reachable from the home screen entry card
FR-LADDER-02: Users drag-and-reorder items on the full ladder screen; add new items and edit description/predicted SUDS of existing items post-onboarding; position managed via reorder, status managed by the session flow
FR-LADDER-03: Clinicians with an active therapist–patient relationship have read-only access to a patient's fear ladder items, exposure sessions, and SUDS readings; write operations remain patient-only; access enforced at the RLS layer via therapist_patient_relationships join
FR-HOME-01: Home screen in morning state (state 3) displays the lowest-position pending fear ladder item as today's challenge with a single primary CTA to start the session; state renders when onboarding is complete and no active exposure thread exists
FR-HOME-02: Home screen in progressing state (state 4) displays a context card acknowledging the active exposure thread and a CTA to re-enter the session; state renders when an exposure_sessions row with status = 'started' exists
FR-HOME-03: One active exposure thread per user per fear item enforced at the database layer via a partial unique index on exposure_sessions (user_id, fear_item_id) WHERE status = 'started'
FR-HOME-05: Home screen in re-engagement state (state 9) prompts a SUDS re-baseline when the user's most recent completed session was more than 10 days ago; state does not trigger for users who have never completed a session
FR-SESSION-04: Before each exposure session, users select a calming technique (somatic, breathing, or cognitive) from a technique picker; the technique previously used for the current fear item is pre-selected; selection is stored on the exposure_sessions record
FR-SESSION-05: A mandatory non-skippable pre-exposure briefing screen is shown after technique selection; the screen presents session context and reads back the user's pre-session intention letter if one was written; the session does not start until the user confirms readiness
FR-SESSION-06: When a user taps Stop Exposure mid-session, a grounding screen is shown that is mandatory and not skippable; the user must complete grounding and explicitly confirm stop before the session is marked abandoned; this screen is stubbed in Epic 5 and fully implemented in Epic 7
FR-LADDER-06: On re-engagement after a gap, the SUDS re-baseline value entered by the user is stored in a dedicated suds_baselines table linked to the fear item; the fear item's predicted_suds is not overwritten; the baseline is used to contextualise the next session's technique routing

### NonFunctional Requirements

NFR-PERF-01: App loads to home screen in <3 seconds at 90th percentile on target device profile (mid-range Android, 2GB RAM, Android 10+, 4G); measured by synthetic device testing in CI before each release
NFR-PERF-02: ERP session SUDS log operations — from user tap to confirmed local write — complete in <500ms on target device profile
NFR-PERF-03: Daily check-in submission routes the user to the recommended technique screen in <1 second from tap on target device profile
NFR-OFFLINE-01: All three ERP session phases (pre-session briefing, active SUDS logging, debrief) function fully without data loss when the device has no network connectivity at any point during the session
NFR-OFFLINE-02: Session data logged during offline ERP sessions syncs automatically within 30 seconds of connectivity restoration; no user action required; no log entry lost
NFR-OFFLINE-03: Crisis resource contacts stored on-device and display without a network call at all times
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

FR-AUTH-01: Epic 2 — OTP registration and login
FR-AUTH-02: POST-MVP — Preview challenges (unauthenticated taste experience) deferred; no MVP story. **Decision record (2026-05-23):** FR-AUTH-02 is an in-scope PRD feature deliberately deferred to post-MVP. Rationale: the preview challenge flow requires significant cross-cutting complexity — MMKV local storage per device, idempotency-keyed re-assignment on account creation, and full isolation gates from Epic 6 ERP session components. For a closed-beta or soft-launch cohort (invited users), acquisition via unauthenticated preview adds risk without proportionate clinical value. Unauthenticated users land directly on Sign In / Sign Up at MVP. Confirmed in post-MVP backlog. Logged in post-mvp-backlog.md.
FR-AUTH-04: Epic 10 — Password-based sign-up/sign-in as an alternative to OTP, email or phone identifier
FR-AUTH-05: Epic 10 — Forgot/reset-password deep-link flow, email-identifier only. **Decision record (2026-07-08):** Code-complete and tested, but gated behind `EXPO_PUBLIC_ENABLE_PASSWORD_RESET` (default off) for closed beta. Rationale: custom SMTP is not yet provisioned on the hosted Supabase project — a live "Forgot password?" tap would otherwise dead-end on a reset email that never arrives, which is worse than not offering the entry point at all. Trigger to flip on: custom SMTP + a verified sending domain (see `deferred-work.md`, "2026-07-04 — Password-based login"). Phone-identifier password accounts have no reset path — `resetPasswordForEmail` is email-only; deferred decision on whether to add an OTP-based reset for phone accounts.
FR-SAFE-01: Epic 2 — Two mandatory safety checkboxes at account creation
FR-ONBOARD-01: Epic 4 — mini-SPIN questionnaire with three-tier clinical routing
FR-ONBOARD-02: Epic 4 — Symptom check + 15-item safety behaviour checklist
FR-ONBOARD-03: Epic 4 — Inline psychoeducation and avoidance explainer
FR-HIER-01: Epics 4+5 — Initial fear ladder setup during onboarding (Story 4.3); full ladder screen with drag-to-reorder and post-onboarding item management (Story 5.1)
FR-HIER-02: Epics 4+5 — Custom item entry during onboarding (Story 4.3); add/edit items post-onboarding from full ladder screen (Story 5.1)
FR-HIER-03: Epic 5 — Stall detection and step-down prompt
FR-LADDER-01: Epic 5 — Full ladder screen view with status indicators (Story 5.1)
FR-LADDER-02: Epic 5 — Drag-and-reorder, add/edit items post-onboarding from full ladder screen (Story 5.1)
FR-LADDER-03: POST-MVP — Clinician read-only access via therapist_patient_relationships RLS deferred; Stories 5.4 and 5.5 have no MVP story. **Decision record (2026-05-23):** FR-LADDER-03 is an in-scope PRD feature deliberately deferred to post-MVP. Rationale: the therapist portal is explicitly Phase 2; zero clinicians will access the system at MVP. The stub `therapist_patient_relationships` table created in Story 4.3 is sufficient — Stories 5.4/5.5 add RLS policy updates and 15+ pgTAP assertions across 3 tables for a read path that has no active consumers. Phase 2 will activate the policies via migration. Confirmed in post-MVP backlog.
FR-ERP-01: Epic 5 — Three sequential ERP session phases (Story 5.2)
FR-ERP-02: Epic 5 — Self-initiated SUDS logging during active phase (Story 5.2)
FR-ERP-03: Epic 5 — Debrief with SUDS arc graph and structured reflection (Story 5.3)
FR-ERP-04: Epic 5 — Abort handling without negative framing (Story 5.2)
FR-CBT-01: POST-MVP — 6-field thought record deferred; no MVP story
FR-CBT-02: POST-MVP — Cognitive distortion library deferred; no MVP story
FR-CBT-03: POST-MVP — 5-field behavioural experiment deferred; no MVP story
FR-SOM-01: Epic 7 (partial MVP) — box breathing and 5-4-3-2-1 covered; 4-7-8, Bhramari, Nadi Shodhana, body scan POST-MVP. **Decision record (2026-05-19):** FR-SOM-01 is an in-scope PRD feature partially deferred. Rationale: box breathing and 5-4-3-2-1 grounding cover the two highest-prevalence use cases at MVP (pre-exposure grounding and mid-session crisis); the remaining four techniques (4-7-8, Bhramari, Nadi Shodhana, body scan) require distinct animated visual guides and culturally resonant framing for Indian pranayama techniques that increase scope beyond MVP timeline. The 2-technique set is clinically sufficient for the MVP ERP session and Calm Me flows. Deferring the remaining 4 also cascades to FR-CHECKIN-01 deferral — check-in routing to somatic techniques is incomplete until the full set exists. Confirmed in post-MVP backlog as item 1.26.
FR-SOM-02: Epic 7 (partial MVP) — visual-only pacing covered for box breathing and 5-4-3-2-1; remaining techniques POST-MVP (blocked by FR-SOM-01 remaining; see FR-SOM-01 decision record and backlog item 1.26)
FR-CHECKIN-01: POST-MVP — daily SUDS check-in deferred; no MVP story. **Decision record (2026-05-19):** FR-CHECKIN-01 is an in-scope PRD feature deliberately deferred to post-MVP. Rationale: the daily check-in depends on a complete somatic + CBT technique suite (FR-SOM-01 remaining, FR-CBT-01–03) to produce clinically meaningful routing; launching a check-in that can only route to box breathing and 5-4-3-2-1 is therapeutically incomplete. Confirmed in post-MVP backlog as item 1.21. FR-ADVERSE-02 (check-in crisis contacts) is blocked by this deferral (backlog item 1.22).
FR-PROG-01: POST-MVP — SUDS trend graph (weekly + monthly) deferred; no MVP story. **Decision record (2026-06-21):** FR-PROG-01 is an in-scope PRD feature deliberately deferred to post-MVP. Rationale: Story 8.5 (the Achievements tab — trend graph, session history log, and SUDS arc detail) was deferred in full to reduce MVP scope for the closed-beta cohort, alongside Stories 8.3/8.4. The underlying `suds_readings`/`exposure_sessions` data continues to be captured at MVP (Epic 5/6) — no data is lost, only the in-app visualisation is deferred. Confirmed in post-mvp-backlog.md as item 1.35. Logged in `_bmad-output/implementation-artifacts/deferred-work.md`. Story 8.5 marked DEFERRED.
FR-PROG-02: POST-MVP — Chronological exposure history log deferred; no MVP story. See FR-PROG-01 decision record (2026-06-21) — same Story 8.5 deferral covers both FRs.
FR-NOTIF-01: POST-MVP — Day 2 + Day 5 re-engagement push notifications deferred; no MVP story. **Decision record (2026-06-21):** FR-NOTIF-01 is an in-scope PRD feature deliberately deferred to post-MVP. Rationale: the cron-driven re-engagement Edge Function (two scheduled passes, idempotency tracking columns, push dispatch/prune handling) adds infrastructure and review surface that is not essential to validate the core ERP loop for a closed-beta cohort. Story 8.1's push token registration and shared `sendPushNotification` helper remain in place as the technical prerequisite for whenever this is picked back up. Confirmed in post-MVP backlog as item 1.34. Logged in `_bmad-output/implementation-artifacts/deferred-work.md`. Story 8.4 marked DEFERRED.
FR-NOTIF-02: Epic 8 — No punitive language or streak mechanics
FR-NOTIF-03: Epic 8 — User notification controls and opt-out
FR-NOTIF-04: POST-MVP — Window-close push notification at 3 hours post-session deferred; no MVP story. **Decision record (2026-06-15):** Story 5.6 / Issue #36 removed the home screen post-exposure reflection window (State 7) and the late-debrief gate (State 8). The window-close notification semantically depends on a 6-hour reflection window that the UI no longer presents — the notification copy ("the window is still available") loses its referent and the user-facing context the gate was meant to nudge no longer exists. Reflection is captured entirely on the debrief screen (FR-ERP-03) before the user reaches home. Confirmed in post-MVP backlog. Logged in `_bmad-output/implementation-artifacts/deferred-work.md`. Story 8.3 marked DEFERRED.
FR-CRISIS-01: Epic 3 — On-device crisis keyword detection (packages/core)
FR-CRISIS-02: Epic 3 — English + Hindi keyword list, binary-embedded
FR-CRISIS-03: Epic 7 — Persistent SOS/CalmMe overlay during active ERP session (initial grounding screen with affirmation + breathing prompt wired in Epic 5 Story 5.2; full technique picker with breathing coach, 5-4-3-2-1, and helplines added in Epic 7 Story 7.5)
FR-I18N-01: Epic 9 — Full locale coverage verification (infrastructure scaffolded in Epic 1)
FR-I18N-02: Epic 9 — RTL rendering verification (infrastructure scaffolded in Epic 1)
FR-ANALYTICS-01: Epic 8 — Day-1 metrics schema design (no live writes at MVP; events table stub from Epic 3)
FR-ANALYTICS-02: Epic 3 — No health data to third-party analytics services
FR-ANALYTICS-BOUNDARY-01: Epic 3 — Zero analytics event writes at MVP; analytics_events table schema stub only
FR-SUDS-ANCHOR-01: Epic 5 — Shared SudsArc/SudsArcChart component established in packages/ui (must be consumed by Epic 7 for all SUDS collection points; cross-epic dependency explicit in ACs)
FR-ADVERSE-01: Epic 5 — SUDS ≥8 grounding offer during session; exit SUDS ≥8 crisis contacts in debrief (Stories 5.2/5.3)
FR-ADVERSE-02: POST-MVP — daily check-in SUDS ≥8 crisis contacts deferred (depends on FR-CHECKIN-01)
FR-HOME-01: Epic 6 — Home screen morning state (state 3) today's challenge card and single primary CTA (Story 6.2)
FR-HOME-02: Epic 6 — Home screen progressing state (state 4) active thread context card and re-entry CTA (Story 6.3)
FR-HOME-03: Epic 6 — One active thread per user per fear item enforced via partial unique index (Story 6.2)
FR-HOME-05: POST-MVP — Home screen re-engagement state (state 9) SUDS re-baseline deferred; no MVP story. **Decision record (2026-05-23):** FR-HOME-05 is an in-scope PRD feature deliberately deferred to post-MVP. Rationale: the 10-day inactivity trigger will not fire for any user in the first weeks post-launch; the `suds_baselines` table and re-baseline query add schema and home-state-machine complexity for a condition that does not occur at launch. Home screen state machine falls through to state 3 (today's challenge) for returning users. Code comment to be added in the state machine: `// State 9 (re-engagement re-baseline) deferred post-MVP — falls through to state 3`. Confirmed in post-MVP backlog.
FR-SESSION-04: Epic 6 — Technique selection before each exposure session with last-used pre-selection and SUDS-based nudge (Story 6.1)
FR-SESSION-05: Epic 6 — Mandatory non-skippable pre-exposure briefing screen with intention letter read-back (Story 6.1)
FR-SESSION-06: Epics 5+7 — Mandatory non-skippable grounding screen on mid-session stop; initial implementation (affirmation + breathing prompt) in Epic 5 Story 5.2; enhanced with full technique picker in Epic 7 Story 7.5
FR-LADDER-06: POST-MVP — SUDS re-baseline on re-engagement deferred with FR-HOME-05 (Story 6.4). `suds_baselines` table not created at MVP; no baseline stored. Predicted_suds on fear_ladder_items remains the sole reference point at MVP. See FR-HOME-05 decision record (2026-05-23).
FR-DPO-01: Epic 3 — DPO appointed before India launch; contact in privacy notice
FR-DPO-02: Epic 3 — Data export request flow (Settings → Privacy → Request my data)
FR-DPO-03: Epic 3 — Account deletion (30-day soft-delete window)
FR-DPO-04: Epic 3 — All consent events via consent-record Edge Function exclusively
FR-DPO-05: Epic 3 — Self-hosted HTML DPO operator panel
FR-DPO-06: Epic 3 — Append-only dpo_audit_log with DPO actions
FR-DPO-07: Epic 3 — DPO interface deployed and verified before any personal data in production (hard go-live dependency)

**NFR Distribution:**

Design constraints (inform Epic 1):
- NFR-ACCESS-01: Accessibility infrastructure (Accessible* wrappers, a11y lint gate) in Epic 1; WCAG audit in Epic 9
- NFR-DEVICE-01, NFR-DEVICE-02: Target device profile informs Epic 1 design token decisions
- NFR-SEC-01: AES-256 / TLS 1.3 informs Epic 1 data layer and storage decisions

Implementation constraints (written in the epic introducing each feature):
- NFR-SEC-02: RLS written per epic as each table is introduced; Epic 9 is audit only
- NFR-SEC-03: DPDPA consent record fields — Epic 3
- NFR-OFFLINE-01, NFR-OFFLINE-02: Offline ERP session resilience — Epic 5 implementation constraint (ERP session core is in Epic 5, not Epic 6)
- NFR-OFFLINE-03: Crisis contacts on-device always — Epic 3 implementation constraint
- NFR-REL-02: Crash recovery for in-session SUDS entries — Epic 5 implementation constraint (SUDS logging is in Story 5.2)
- NFR-PERF-02: <500ms SUDS log write — Epic 5 implementation constraint (Story 5.2)
- NFR-PERF-03: <1s check-in routing — Epic 7 implementation constraint

Verification tasks (Epic 9):
- NFR-PERF-01: <3s cold start P90 — load test
- NFR-REL-01: 99.5% uptime — uptime monitoring verification
- NFR-SEC-04: HIPAA/GDPR activation path — Epic 9 verification
- NFR-SEC-05: DPO contact in privacy notice — Epic 9 verification
- NFR-SEC-06: On-device crisis detection — Epic 9 verification
- NFR-DEVICE-01, NFR-DEVICE-02: Device compatibility matrix — Epic 9
- NFR-SCALE-01: 10,000 concurrent users load test — Epic 9

## Epic List

### Epic 1: Project Foundation & Design System

All developers can build features with confidence: the Turborepo monorepo is live, the tech stack is validated (NativeWind v5 spike resolved or fallback ADR written, library evaluation complete), the design token system is authored, i18n and accessibility *infrastructure* is in place (so no dev agent ever writes a hardcoded string or an unlabelled component), the PowerSync SyncAdapter interface is scaffolded, the Supabase client and base user schema with first RLS policy are provisioned, and all CI gates are active.

**ARC coverage:** ARC-001, ARC-002, ARC-003, ARC-011, ARC-013, SPIKE-001
**UX-DR coverage:** UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR5, UX-DR15, UX-DR16, UX-DR17, UX-DR22, UX-DR23
**NFR design constraints:** NFR-ACCESS-01 (infrastructure), NFR-SEC-01 (storage/transport decisions)
**Planning note:** Epic 1 delivers zero user-visible features by design. This is an accepted planning decision for a greenfield project with a complex cross-platform stack; the NativeWind spike and library evaluations are hard blockers for all subsequent component work. Sprint 1 produces no shippable user feature — the team should communicate this expectation explicitly at kickoff.

**Epic 1 exit criteria additions (accepted from agent review):**
- `packages/core/src/i18n/` scaffolded: i18next + expo-localization, `t()` hook wired, key naming convention documented; no user-visible string ever authored as a literal from Epic 2 onwards
- `packages/ui` `Accessible*` wrapper components with `accessibilityLabel` as required prop; `eslint-plugin-react-native-a11y` CI gate active
- `packages/sync` `SyncAdapter` interface defined (`enqueue/flush/getPendingCount`); `PowerSyncSyncAdapter` stub implementation satisfying the interface; all Epic 2+ durable writes call `adapter.enqueue()`, never direct DB calls
- `packages/supabase` client initialised; Supabase project provisioned; base users table migration with patient_access RLS policy written

---

### Epic 2: Authentication & Account Safety

Users can register with both mandatory safety checkboxes, log in via OTP, and sign out or delete their account. Session management is live. **FR-AUTH-02 (preview challenges) is DEFERRED post-MVP** — unauthenticated users land on Sign In / Sign Up only.

**FRs covered:** FR-AUTH-01, FR-SAFE-01
**FRs deferred:** FR-AUTH-02 — see decision record in FR Coverage Map
**Architecture:** ARC-010 (ADR-AUTH-TOKEN-PROVIDER resolved)

**Story constraint for FR-AUTH-02:** Preview challenges must either (a) exclude all distress-signal input (no SUDS rating, no free-text reflection) or (b) include a lightweight crisis signposting display pre-auth. The implementation must be explicitly isolated from Epic 6 ERP session components (not reused/extended in Epic 6). This constraint must appear in the FR-AUTH-02 story acceptance criteria.

---

### Epic 3: DPDPA Compliance & Crisis Infrastructure

*(Can run in parallel with Epic 2 after Epic 1 completes — no UI dependency on Epic 2.)*

The crisis keyword detection engine is live in `packages/core` and available for all text-entry surfaces from Epic 4 onward. All DPDPA 2023 compliance infrastructure is deployed and verified before any personal data enters production: consent schema, DPO Edge Functions, self-hosted operator panel, data rights flows. Analytics zero-write boundary is enforced.

**FRs covered:** FR-CRISIS-01, FR-CRISIS-02, FR-DPO-01, FR-DPO-02, FR-DPO-03, FR-DPO-04, FR-DPO-05, FR-DPO-06, FR-DPO-07, FR-ANALYTICS-02, FR-ANALYTICS-BOUNDARY-01
**Architecture:** ARC-008, ARC-009, ARC-010 (ADR-DPO-INTERFACE resolved), ARC-012
**NFR implementation constraints:** NFR-OFFLINE-03 (crisis contacts on-device, no network call), NFR-SEC-03 (DPDPA consent record fields), NFR-SEC-06 (on-device detection, no text to external service)

---

### Epic 4: Onboarding & Clinical Assessment

New users complete the mini-SPIN questionnaire with three-tier clinical routing (referral screen at ≥6 pending clinical sign-off), the symptom check, and the 15-item safety behaviour checklist. Personalised hierarchy template suggestions are generated. Inline psychoeducation on the anxiety cycle precedes the first exposure; the avoidance explainer appears at safety behaviour item selection (not front-loaded).

**FRs covered:** FR-ONBOARD-01, FR-ONBOARD-02, FR-ONBOARD-03, FR-HIER-01 (partial — initial onboarding setup; full management in Epic 5), FR-HIER-02 (partial — initial onboarding setup; full management in Epic 5)

---

### Epic 5: Courage Ladder & Home Experience

Users build and manage their personalised exposure hierarchy: pairwise comparative ranking for new item placement (max 3 comparisons, bisection), drag-to-rank view, SUDS rating per item, custom items, stall detection (2 consecutive sessions with no SUDS reduction → step-down prompt). The home screen state machine (`resolveHomeScreenState`, 10 states) is live.

**FRs covered:** FR-HIER-01, FR-HIER-02, FR-HIER-03, FR-LADDER-01, FR-LADDER-02, FR-LADDER-03, FR-ERP-01, FR-ERP-02, FR-ERP-03, FR-ERP-04, FR-SUDS-ANCHOR-01, FR-ADVERSE-01
**UX-DR coverage:** UX-DR7, UX-DR9, UX-DR12, UX-DR14, UX-DR27
**Architecture:** ARC-014

**Home screen state machine note:** States that depend on Epic 7 data (daily check-in routing) and Epic 8 data (progress history) are implemented with stubbed inputs in Epic 5. Epic 5 acceptance criteria explicitly document which states are live vs. stubbed. Wiring of live data happens in the epic that introduces it. **State 9 (re-engagement re-baseline) is DEFERRED post-MVP** — `resolveHomeScreenState` must include `// State 9 (re-engagement re-baseline) deferred post-MVP — falls through to state 3` and must NOT reference or query `suds_baselines` (table does not exist at MVP). The gap-check branch is omitted; the function returns state 3 for all users with no active thread.

---

### Epic 6: ERP Session Surrounding Experience

Users select a calming technique and receive a mandatory pre-exposure briefing before entering a session. The home screen correctly reflects the user's current thread state across two states: morning ready (state 3) and session in progress (state 4). The ERP session core loop itself (session start, SUDS logging, debrief, home states 7/8) was implemented in Epic 5. **Story 6.4 (state 9 re-engagement re-baseline, `suds_baselines` table) is DEFERRED post-MVP.**

**FRs covered:** FR-SESSION-04, FR-SESSION-05, FR-HOME-01, FR-HOME-02, FR-HOME-03
**FRs deferred:** FR-HOME-05 (state 9), FR-LADDER-06 (suds_baselines) — see decision records in FR Coverage Map
**UX-DR coverage:** UX-DR8, UX-DR11, UX-DR13, UX-DR19, UX-DR20, UX-DR26

**SUDS anchor constraint:** The shared `SudsAnchorScale` component in `packages/ui` is produced in Epic 5 (FR-SUDS-ANCHOR-01). Epic 7 is required to consume this component for all SUDS collection points (check-in). This cross-epic dependency must appear in Epic 7 story acceptance criteria.

**RLS:** No new clinical data tables in this epic — technique selection and home screen states operate on session data tables introduced in Epic 5.

---

### Epic 7: Calm Me, Grounding & Crisis Support Toolkit

Users access the persistent Calm Me SOS overlay with courage affirmation and technique selection, a breathing coach (box breathing, 4-4-4-4 pattern), the 5-4-3-2-1 sensory grounding exercise, the helpline signpost screen (market-configured, config-driven via `packages/core/src/config/helplines.ts`), and the fully-implemented mandatory grounding screen for mid-session stops.

**FRs covered at MVP:** FR-CRISIS-03 (persistent SOS overlay during sessions), FR-SOM-01 (partial: box breathing + 5-4-3-2-1), FR-SOM-02 (partial: visual-only pacing for covered techniques)
**Post-MVP:** FR-CBT-01, FR-CBT-02, FR-CBT-03 (thought record, cognitive distortions, behavioural experiment), FR-SOM-01/FR-SOM-02 remaining techniques (4-7-8, Bhramari, Nadi Shodhana, body scan), FR-CHECKIN-01 (daily check-in), FR-ADVERSE-02 (check-in ≥8 crisis contacts)
**UX-DR coverage:** UX-DR6 (CalmMeButton, GroundingPrompt, HelplineCard), UX-DR8 (CalmMe persistent overlay), UX-DR24 (remotely-updatable helpline config)

**RLS:** No new clinical data tables in this epic — Calm Me and grounding are read-only UI paths using session state from Epic 5/6.

---

### Epic 8: Progress Tracking & Notifications

Push token registration and a daily local session reminder are in place. The Achievements tab (SUDS trend graph and session history log) and server-driven re-engagement/window-close notifications are all deferred post-MVP. User controls notification delivery timing and per-type opt-out for the notification types that did ship. Day-1 analytics metrics are documented and the instrumentation schema is ready for Phase 2 activation.

**FRs covered:** FR-NOTIF-02, FR-NOTIF-03, FR-ANALYTICS-01
**Post-MVP:** FR-PROG-01, FR-PROG-02 (Achievements tab — SUDS trend graph + session history) — deferred 2026-06-21, scope reduction for closed beta (Story 8.5); see PRD FR Coverage Map decision record. FR-NOTIF-01 (Day 2/Day 5 re-engagement notifications) — deferred 2026-06-21, scope reduction for closed beta; see PRD FR Coverage Map decision record. FR-NOTIF-04 (window-close push notification) — deferred 2026-06-15 by Story 5.6 / Issue #36; see PRD FR Coverage Map decision record
**UX-DR coverage:** UX-DR6 (SudsArcChart) — component shipped in Epic 5 and consumed by Epic 7; its Epic 8 consumer (Achievements tab) is deferred post-MVP
**Architecture:** ARC-010 (ADR-NOTIFICATIONS resolved)

**Home screen state machine wiring:** Epic 8 wires live progress and notification data into the home screen state machine stubs established in Epic 5.

---

### Epic 9: Platform Quality, Safety & Production Readiness

*(Verification and audit epic — all infrastructure and implementation constraints were addressed in the epic that introduced each feature. This epic proves the system meets its non-functional requirements under production conditions.)*

**MVP cut (Stories 9.1–9.8):** Accessibility audit, offline resilience, MMKV hygiene, E2E smoke suite, error/empty state UX, performance budget, haptic/sound degradation.

**Phase 1 India gate (Story 9.9):** i18n full locale coverage + Hindi activation, RTL rendering validation, 2G fallback on Indian networks, device compatibility matrix, load testing to 10,000 concurrent users.

**FRs covered:** FR-I18N-01, FR-I18N-02 *(Phase 1 gate — Story 9.9)*
**NFR verification:** NFR-PERF-01 (<3s cold start P90), NFR-OFFLINE-01–03 (edge cases), NFR-REL-01 (99.5% uptime), NFR-REL-02 (crash recovery), NFR-SEC-01–06 (audit), NFR-DEVICE-01–02, NFR-ACCESS-01 (full audit), NFR-SCALE-01 (load test) *(NFR-SCALE-01, NFR-DEVICE-01 India profile, and 2G offline testing are Phase 1 gate — Story 9.9)*
**Architecture:** ARC-004 (MMKV storage hardening), ARC-005 (PowerSync adapter full validation), ARC-012 (analytics boundary confirmation)

---

### Epic 10: Password-Based Login (Alternative Authentication Method)

*(Numbered 10 — the ADR-OFFLINE-DEGRADATION Decision 2 remediation trigger, previously reserving 10, moved to Epic 12 on 2026-07-09 and then to Epic 13 on 2026-07-30, swapping with the newly-created UI/UX Enhancements epic; see `deferred-work.md`. Password-based login and Epic 11 (Beta Feedback Collection) are both pre-beta must-haves and take the lower numbers ahead of that post-MVP placeholder. Implemented on branch `feature/password-based-login`, not yet merged to `main` as of this planning entry.)*

Users can create an account and sign in with an email or phone number **plus password**, as an alternative to the OTP-only flow shipped in Epic 2. A full forgot/reset-password flow (deep-link recovery, pure parser, new-password form) is code-complete and tested, but held behind a feature flag for closed beta until custom SMTP is provisioned. The hosted Supabase project is provisioned and migration-current in support of this epic, with a cross-user PII-erasure hole (found in migration 0007) closed along the way.

**FRs covered:** FR-AUTH-04, FR-AUTH-05 (flag-gated — see FR Coverage Map decision record)
**FRs deferred:** phone-identifier password reset (email-only `resetPasswordForEmail` limitation) — see FR Coverage Map / `deferred-work.md`
**Planning note:** FR-AUTH-05 ships code-complete but flag-gated OFF by default (`EXPO_PUBLIC_ENABLE_PASSWORD_RESET`); flip it only after custom SMTP + a verified sending domain are provisioned. Email confirmation on sign-up also remains OFF for the same SMTP reason — sign-up yields an immediate unverified session, an accepted closed-beta risk logged in `deferred-work.md`.

---

### Epic 11: Beta Feedback Collection

*(Pre-beta must-have, same tier as Epic 10. Epic 10 is claimed by Password-Based Login, not reserved for the ADR-OFFLINE-DEGRADATION Decision 2 remediation trigger — that reservation moved to Epic 12 on 2026-07-09, then to Epic 13 on 2026-07-30; see `deferred-work.md`.)*

Beta testers get a low-friction, first-party way to report bugs and impressions tagged to the exact screen they were on — replacing ad hoc channels (WhatsApp, email, third-party forms) with structured feedback that writes directly to Supabase infrastructure already provisioned for the project. The entry point is available on every screen, including mid-exposure-session, and is gated behind an env flag so it never ships to production/GA builds.

**FRs covered:** FR-BETA-01, FR-BETA-02
**Planning note:** Closed-beta scope only. Unlike the Calm Me SOS overlay, the feedback entry point is deliberately NOT suppressed during an active ERP session — product decision, since testers need to report issues in the moment they occur.

---

### Epic 12: UI/UX Enhancements & Polish

*(Numbered 12 as of 2026-07-30 — created the same day as Epic 13 (originally numbered 13), then swapped with the ADR-OFFLINE-DEGRADATION reservation so the reservation could hold the higher, still-inactive number and this living epic could take the lower one. See Epic 13's numbering history below for the full swap rationale. Open-ended and living, unlike every other epic in this document: it is seeded at creation with four placeholder stories for the screens named at kickoff (sign-in/sign-up, home, ladder, exposure flow) and is expected to grow additional stories over time as concrete UI/UX issues surface — primarily via Epic 11 beta feedback submissions, but also ad hoc product/design review. Placeholder stories carry no acceptance criteria yet; each is refined into concrete, testable ACs from real feedback before a dev agent picks it up.)*

Users get a progressively polished experience across the app's core screens, driven by real usage feedback rather than upfront speculation. This epic started with four placeholder stories — Story 12.1 (sign-in/sign-up), 12.2 (home), 12.3 (ladder), 12.4 (exposure flow) — and new stories are appended to this same epic as specific issues are identified, rather than opening a new epic per round of feedback.

**FRs covered:** FR-UXENH-01
**Planning note:** Stories in this epic are not ready-for-dev at creation — each starts as a placeholder in `sprint-status.yaml`'s `backlog` state until concrete feedback or design input gives it real acceptance criteria; this is a deliberate deviation from every other epic in this document, where stories carry full ACs at creation time. **Stories 12.1 (Sign-In/Sign-Up) and 12.2 (Home) were the first to leave placeholder state**, both on 2026-07-30, both from Claude Design redesign imports rather than beta feedback — see their entries below for the pattern later stories in this epic should follow. **Story 12.5 (Global Color Theme Unification) was added the same day**, outside the placeholder-first pattern — see its entry below for why it's scoped differently from 12.1–12.4.

---

### Epic 13 [Reserved, not yet planned]: ADR-OFFLINE-DEGRADATION Remediation (Post-MVP)

*(Not a planned epic — a reservation. This is the trigger condition named in ADR-OFFLINE-DEGRADATION Decision 2's "Accepted — deferred remediation" sub-status: the silent enqueue-failure remediation ships either at the next story that touches the sync mutation queue, or when this epic begins, whichever comes first. Story 9.1's review required this trigger be concrete, not "someday" — the reservation satisfies that by being a specific, named epic slot, without needing to hardcode a number everywhere it's referenced.)*

**This entry is the single source of truth for this reservation's current number.** Other documents (`deferred-work.md`, `ADR-OFFLINE-DEGRADATION.md`, Story 9.10's AC in this file, `sprint-status.yaml`) refer to it by name — "the ADR-OFFLINE-DEGRADATION remediation epic (see epics.md Epic List for its current number)" — rather than repeating a hardcoded number, so a future renumbering only requires editing this heading, not five scattered files.

**Numbering history:** reserved at Epic 10 pre-2026-07-09; moved to Epic 12 on 2026-07-09 when Epic 10 and Epic 11 were claimed by Password-Based Login and Beta Feedback Collection (both pre-beta must-haves, taking priority over a post-MVP placeholder). **Moved again to Epic 13 on 2026-07-30**, swapping with the newly-created Epic 12 (UI/UX Enhancements & Polish, created that same day originally as Epic 13): the living, already-active UI/UX epic took the lower number and this still-dormant reservation moved up one slot to make room.

---

### Epic 15: Auth Safety Hardening for Hosted-Backend Builds

*(Added 2026-09-22, discovered as a direct consequence of parallel beta-distribution work (tracked separately as Epic 14, on its own not-yet-merged branch): `apps/mobile/(auth)/sign-in.tsx`'s "Sign in as Dev user" shortcut (Story 10.1 Task 5, hardcoded `test1@test.com` / `DevTest123!` one-tap credentials) is gated on `__DEV__ || EXPO_PUBLIC_APP_VARIANT === 'preview'` — a condition with no awareness of which Supabase backend is configured. Both the EAS `preview` profile and, as of this session, local `.env.local` now point at the **hosted** Supabase project rather than a local/ephemeral instance, so the shortcut currently ships live, reachable by any beta tester or local dev, against a real backend. Epic 2 (Authentication & Account Safety) is already marked done, so this is scoped as its own epic rather than reopened there — see `create-story`'s standing rule against adding stories to a completed epic. Takes the next open number after Epic 13 (dormant reservation); may end up adjacent to Epic 14 once both branches merge, whichever lands first.)*

The dev/test sign-in shortcut never renders when the app is configured against the hosted Supabase project, regardless of `__DEV__` or build variant — closing an unintended credential-exposure path opened by pointing preview/dev builds at real infrastructure.

**FRs covered:** FR-DEVAUTH-01
**Scope note:** This epic hardens the shortcut's visibility condition AND rotates the hosted account's password (both folded into Story 15.1 as of 2026-09-22 — see finding below). It does not remove the shortcut itself (still valuable against a genuinely local/ephemeral Supabase instance) or audit for other `__DEV__`-gated affordances — a broader audit is a natural future story in this epic if more such gaps surface, but is not assumed or required by Story 15.1.

**Finding (2026-09-22, confirmed via Supabase MCP against the hosted project):** `test1@test.com` is a real, confirmed account on hosted Supabase — created 2026-05-26, has a password set, and was **signed in as recently as 2026-09-22 09:04 UTC** (the same day this shortcut's exposure was discovered). It currently has zero associated `fear_ladder_items`, `exposure_sessions`, or `consent_records` rows, so no personal/health data is exposed today — but the account is live and reachable by anyone who taps the shortcut or extracts the hardcoded credential from the shipped JS bundle (React Native bundles are not meaningfully obfuscated, so hiding the button alone does not stop a bundle-extraction attack — only the UI-visible path). This is why credential rotation, not just button-hiding, is now in scope.

---

## Epic 1: Project Foundation & Design System

All developers can build features with confidence: the Turborepo monorepo is live, the tech stack is validated (NativeWind v5 spike resolved or fallback ADR written, library evaluation complete), the design token system is authored with enforced typography restrictions, i18n and accessibility infrastructure is in place, motion and layout foundations are established, the PowerSync SyncAdapter interface is scaffolded, and the Supabase client with base user schema and first RLS policy are provisioned. CI gates, crash reporting, and environment secrets management are active before any feature work begins.

### Story 1.1: Monorepo Initialisation, Mobile App Shell & Build Pipeline

As a developer,
I want a validated Turborepo monorepo with Expo SDK 54 configured, EAS Build working end-to-end, crash reporting active, and environment secrets injected via EAS,
So that the entire team can develop, build, and release from a coherent repository with all CI gates and observability in place before any feature work begins.

**Acceptance Criteria:**

**Given** the repository is initialised
**When** `pnpm install` runs from the root
**Then** all packages build without errors: `packages/core`, `packages/sync` (stub), `packages/supabase` (stub), `packages/ui`, `apps/mobile`, `apps/web` (Phase 2 placeholder)

**Given** a developer imports any RN, Expo, or Supabase dependency into `packages/core`
**When** CI runs
**Then** the build fails immediately (ARC-011)

**Given** a new npm dependency is added anywhere in the monorepo
**When** the SDK dependency audit gate runs (ARC-013)
**Then** any dependency that may transmit data to third parties is flagged for explicit sign-off before merge

**Given** EAS Build profiles are configured (`development`/`preview`/`production` + `eas.json`)
**When** the `preview` profile is triggered
**Then** a runnable APK is produced on a 2GB RAM Android 10+ emulator; the app launches to the home screen within 10 seconds (ARC-003)

**Given** the app shell renders
**When** `app.json` is read by the CI gate
**Then** `userInterfaceStyle` equals `"light"`; the CI step exits non-zero if any other value is present (ADR-DARK-MODE-NATIVEWIND, UX-DR22)

**Given** apps/web placeholder exists
**When** any Phase 1 code attempts to import from `apps/web`
**Then** the CI import gate fails the build

**Given** the app is running on a real or emulated device
**When** a JavaScript exception is thrown or a native crash occurs
**Then** it is captured and reported via Sentry (or equivalent crash reporting SDK); Sentry DSN is injected via EAS environment variable, not committed to source control

**Given** the Supabase URL and anon key are required by `packages/supabase`
**When** any EAS build profile runs
**Then** secrets are resolved from EAS environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`); neither value appears in any committed file

---

### Story 1.2: UI Library Evaluation — rn-primitives & Bottom Sheet

As a developer,
I want a time-boxed written evaluation of `react-native-reusables/rn-primitives` and `@gorhom/bottom-sheet`,
So that CalmMeButton, modals, and reusable UI primitives are built on a documented, confirmed library choice before the NativeWind spike or any component work begins (UX-DR4).

**Acceptance Criteria:**

**Given** the evaluation is scoped to 1 day maximum
**When** it completes
**Then** a written decision memo exists at `docs/decisions/ui-library-evaluation.md` covering: (a) install conflict matrix for both libraries on Expo SDK 54 / RN 0.81 / NativeWind v5-preview; (b) bundle size delta; (c) accessibility prop passthrough verification for `AccessiblePressable` use-cases; (d) explicit `ADOPT` or `REJECT` per library with rationale

**Given** the memo is complete and a library is adopted
**When** it is installed in the monorepo
**Then** no Metro bundler warnings appear at cold start; `expo-doctor` exits 0 post-install

**Given** either library is rejected
**When** the memo is finalised
**Then** an alternative approach is documented with rationale; the decision is communicated before any component story depending on it enters a sprint

**Given** the evaluation covers `@gorhom/bottom-sheet`
**When** assessing its suitability
**Then** the memo explicitly addresses whether it can render above all JS-layer UI on both iOS and Android (requirement for CalmMeButton overlay — UX-DR8)

---

### Story 1.3: NativeWind v5 Validation Spike

As a developer,
I want a documented, decided validation spike for NativeWind v5 on the target device profile,
So that all future UI component work proceeds on a confirmed foundation — or a clear, costed fallback path is established — before any component is built (SPIKE-001, UX-DR3).

**Acceptance Criteria:**

**Given** `nativewind@5.0.0-preview.3` is installed on the Expo SDK 54 / RN 0.81 monorepo
**When** the spike runs on a 2GB RAM Android 10+ device (Hermes engine)
**Then** CSS custom property resolution works correctly — variables resolve to values, not stripped

**Given** a test component with `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, and `aria-live` props applied via NativeWind class-to-prop mapping
**When** rendered on iOS 16+ and Android 10+
**Then** all four props resolve correctly on both platforms

**Given** a component file is edited during a running dev build
**When** Expo Router v4 hot reload triggers
**Then** the updated component is visible within 2 seconds without a full app restart

**Given** the spike result is PASS
**When** the decision document is committed at `docs/spikes/nativewind-v5.md`
**Then** the document records the PASS result and confirms all `packages/ui` component stories proceed with NativeWind v5

**Given** the spike result is FALLBACK
**When** the decision document is committed
**Then** it records the FALLBACK result; includes a rough effort estimate for the fallback path across Epics 2–4; an ADR revision is written; StyleSheet-based components with explicit a11y props are adopted; all UI component stories across subsequent epics are formally revised before any sprint begins; no story depending on NativeWind v5 enters a sprint until re-baselined

---

### Story 1.4: Token System & Typography Architecture

As a developer,
I want a complete, typed design token system with enforced typography restrictions in `packages/ui`,
So that every UI component story uses semantic tokens exclusively — raw Tailwind utility values and off-spec DM Serif usage are rejected at compile time (UX-DR1, UX-DR21).

*Depends on: Story 1.2 decision memo (`docs/decisions/ui-library-evaluation.md`) present with final ADOPT/REJECT decisions.*

**Acceptance Criteria:**

**Given** `packages/ui/src/tokens/theme.ts` is authored
**When** a developer imports tokens
**Then** all of the following are exported with TypeScript types: 8 semantic colour tokens; 3 motion presets (preparing: 200ms ease-out, grounding: 400ms ease-in-out, reflecting: 600ms ease-out); 4 haptic constants (`breathingRhythm`, `dragConfirmation`, `commitmentTap`, `techniqueCompletion`); spacing scale (4px base, 11 tokens); 9-token typography scale (UX-DR1)

**Given** the DM Serif Display italic font is registered in the token system
**When** a component attempts to apply it
**Then** `dmSerif` is typed as `DmSerifSurface` — a TypeScript union type permitting only: `'score-reveal' | 'prediction-reality-reveal' | 'progress-readback' | 'pre-exposure-readback'`; any usage outside these four surfaces produces a TypeScript compilation error (UX-DR21)

**Given** the grounding mode token surfaces are defined
**When** a developer imports a grounding token
**Then** an ESLint `no-restricted-imports` rule (configured in root `.eslintrc`) rejects that import if the importing file matches `*Context.{ts,tsx}` or `*Provider.{ts,tsx}`; the rule is named `no-grounding-token-in-context` and documented in `packages/ui/README.md` (UX-DR2)

**Given** `packages/ui/src/tokens/theme.ts` is complete
**When** the WCAG 2.1 AA colour contrast audit runs on all token pairs
**Then** all text token pairs meet 4.5:1 (normal text) and 3:1 (large text and UI components); `accent.grounding` (#8B6F47) on white is verified or replaced; amber accent (#E8A84C) is confirmed decorative-only on the reflection background; written sign-off from designer + QA is committed to `docs/decisions/wcag-contrast-sign-off.md` before sprint 1 (UX-DR17)

---

### Story 1.5: Motion, Layout & Mode Foundations

As a developer,
I want `AnimationContext`, `ReducedMotionProvider`, `SafeAreaProvider`, the three mode briefs, and the CalmMeButton rendering strategy ADR in place at the app root,
So that every subsequent screen inherits correct motion behaviour, safe area handling, and CalmMe overlay can be positioned without architectural ambiguity (UX-DR2, UX-DR5, UX-DR8, UX-DR15, UX-DR23).

**Acceptance Criteria:**

**Given** `AnimationContext` is implemented at `apps/mobile/app/_layout.tsx`
**When** the OS `reduceMotion` accessibility setting changes while the app is foregrounded
**Then** `AccessibilityInfo.addEventListener('reduceMotionChanged', ...)` fires; the context value updates within one render cycle; a Jest unit test mocks the event and asserts the context update (UX-DR15)

**Given** `AnimationContext` default state before the provider has confirmed
**When** any animated component renders
**Then** it renders with `reduced: true` — fail-safe, not fail-open (UX-DR15)

**Given** all animated components
**When** `reduceMotion` is `true`
**Then** all animation durations collapse to 0ms; no component references a hardcoded duration value — all durations come from motion preset tokens from Story 1.4

**Given** `SafeAreaProvider` is at `apps/mobile/app/_layout.tsx`
**When** the app launches on iOS 16+ or Android 10+
**Then** safe area insets apply correctly (UX-DR23)

**Given** the three mode briefs are authored for preparation, in-the-moment, and reflection registers
**When** sprint 1 begins
**Then** all three briefs exist at `docs/ux/mode-briefs/` with PM sign-off documented; sprint 1 UI stories are blocked until sign-off is confirmed (UX-DR5)

**Given** the CalmMeButton requires rendering above all other JS-layer UI
**When** the CalmMeButton rendering strategy ADR is authored at `_bmad-output/planning-artifacts/adrs/ADR-CALMME-RENDER.md`
**Then** the ADR records a decided choice between root-layout absolute positioning and `@gorhom/portal`; the decision is informed by Story 1.2's `@gorhom/bottom-sheet` evaluation; the ADR is signed off before the in-the-moment sprint begins (UX-DR8)

---

### Story 1.6: Developer Infrastructure — i18n Scaffold & Accessibility Gates

As a developer,
I want i18n infrastructure, accessibility enforcement tooling, and post-transition focus management patterns active before the first screen is built,
So that no story from Epic 2 onwards can introduce a hardcoded string, an unlabelled interactive component, or broken screen-reader focus order without failing CI (FR-I18N-01 infra, NFR-ACCESS-01 infra, UX-DR16).

**Acceptance Criteria:**

**Given** `packages/core/src/i18n/` is scaffolded with i18next + expo-localization
**When** the `t()` hook is imported in any component
**Then** it resolves string keys from `packages/core/src/i18n/locales/en.json`; key naming convention is documented at `packages/core/src/i18n/README.md`; a Jest test validates all keys in `en.json` match the pattern `[namespace].[identifier]` (e.g. `auth.otp.phonePrompt`)

**Given** the i18n lint rule is active in CI
**When** a developer writes `<Text>Hello</Text>` or `<Text>{`Hello ${name}`}</Text>` (both raw literals and template literals with embedded strings)
**Then** CI rejects the commit; the rule covers both string literal and template literal forms in JSX

**Given** `AccessiblePressable` and `AccessibleText` are published in `packages/ui`
**When** `AccessiblePressable` is used
**Then** `accessibilityLabel` is a required, non-optional TypeScript prop; omitting it produces a compilation error; `AccessibleText` has correct semantic role defaults

**Given** `eslint-plugin-react-native-a11y` is active in CI
**When** any `Pressable` or `TouchableOpacity` is used without `accessibilityLabel`
**Then** CI fails the build

**Given** a screen transition occurs via Expo Router v4 navigation
**When** the new screen mounts
**Then** a navigation hook calls `AccessibilityInfo.setAccessibilityFocus()` on the primary interactive element; an integration test proves focus lands on the correct element after at least one representative transition (UX-DR16)

---

### Story 1.7: Data Foundation — Supabase, MMKV & PowerSync Adapter Scaffold

As a developer,
I want the Supabase project provisioned, MMKV encrypted local storage initialised, and the PowerSync SyncAdapter interface scaffolded,
So that all durable writes from Epic 2 onwards call `adapter.enqueue()` from day one — bypassing the sync layer with direct DB calls is impossible by architecture (ARC-004, ARC-005, ARC-006, ARC-007).

*Depends on: Story 1.1 merged to main.*

**Acceptance Criteria:**

**Given** the Supabase project is provisioned
**When** `packages/supabase` client is imported
**Then** the client initialises using `SUPABASE_URL` and `SUPABASE_ANON_KEY` from EAS environment variables; a base migration creates the `users` table

**Given** the `users` table RLS policy is written
**When** the RLS policy test harness runs via `supabase test db` using pgTAP (`packages/supabase/tests/rls/users.test.ts`)
**Then** four assertions pass: [+] own-row read succeeds for authenticated user, [−] cross-user row read is blocked, [−] unauthenticated read is blocked, [stub] clinician path returns empty (ARC-007)

**Given** MMKV startup sequence is configured (ARC-004)
**When** the app starts
**Then** key derivation completes → MMKV sync reads complete → PowerSync init completes → route decision executes (in that order); Expo SecureStore (Android Keystore API 23+) is used for sensitive auth tokens, not MMKV

**Given** `packages/sync` is scaffolded with the `SyncAdapter` interface
**When** any durable write is made in `apps/mobile`
**Then** it calls `adapter.enqueue()`, `adapter.flush()`, or `adapter.getPendingCount()`; a lint rule in `apps/mobile` rejects any direct call to `PowerSyncDatabase.execute()` from within `apps/mobile`; the carve-out allows `packages/sync` itself to call `execute()` internally (ARC-005)

**Given** `PowerSyncSyncAdapter` stub is implemented
**When** the adapter interface is called
**Then** the stub satisfies the `SyncAdapter` contract; actual PowerSync connection and conflict resolution is a no-op in this story (real sync wired in Epic 6)

**Given** MMKV is initialised on an Android device
**When** the app is reinstalled or a backup/restore operation occurs
**Then** a test stub exists at `packages/supabase/tests/rls/mmkv-key-rotation.stub.ts` documenting the key rotation edge case; full implementation deferred to Epic 9 device hardening

---

## Epic 2: Authentication & Account Safety

Users can register (with both mandatory safety checkboxes and required explanatory copy), log in via OTP, and sign out or delete their account. Auth session management is live. All Epic 3 dependencies (consent-record Edge Function, DPO infrastructure) are handled via typed stub interfaces with explicit production-gate criteria. **Story 2.3 (preview challenges) is DEFERRED post-MVP** — unauthenticated users land on Sign In / Sign Up only; the `onNewAccountCreated` event is emitted by Story 2.1 but has no subscriber at MVP.

### Story 2.1: OTP Authentication — Registration & Login

As a new or returning user,
I want to register or log in using my email address or phone number with OTP verification,
So that I have a secure, password-free account that protects my therapy data.

**Acceptance Criteria:**

**Given** an unauthenticated user enters a valid email address or phone number
**When** they tap "Send code"
**Then** a one-time passcode is dispatched via Supabase Auth; the UI shows a code-entry screen

**Given** a user enters the correct OTP
**When** they submit
**Then** a valid Supabase session is created; the access token is stored in Expo SecureStore under key `"supabase_access_token"`; the refresh token is stored under key `"supabase_refresh_token"`; the user is routed to the post-auth screen

**Given** a user enters an incorrect OTP
**When** they submit
**Then** `t('auth.otp.invalidCode')` is displayed; no session is created; the user can retry

**Given** an OTP expires before use
**When** the user attempts to submit
**Then** `t('auth.otp.expired')` is displayed; the user is prompted to request a new code

**Given** a returning authenticated user launches the app
**When** the MMKV startup sequence completes and valid tokens exist in SecureStore under `"supabase_access_token"` and `"supabase_refresh_token"`
**Then** the user is routed directly to the home screen without re-authenticating

**Given** the `AuthTokenProvider` interface is implemented in `packages/core`
**When** `apps/mobile` initialises auth
**Then** token provisioning uses constructor DI — `apps/mobile` is the composition root; no direct import of Supabase Auth SDK outside `packages/supabase`

**Given** a new account is successfully created
**When** the OTP is verified and the session established
**Then** an `onNewAccountCreated` event is emitted via `packages/core/src/events/accountCreated.ts`; this is the trigger for Story 2.3's preview completion re-assignment; ownership of the re-assignment logic lives in Story 2.3, not here

**Given** a `profiles` table is created in this story for user metadata
**When** the RLS policy test harness runs via `supabase test db` using pgTAP (`packages/supabase/tests/rls/profiles.test.ts`)
**Then** four assertions pass: [+] own-row read succeeds for authenticated user, [−] cross-user row read blocked, [−] unauthenticated read blocked, [stub] clinician path returns empty (ARC-006, ARC-007)

**Given** this story processes personal data on account creation
**When** assessing production readiness
**Then** this story is **not production-releasable** until Epic 3's `consent-record` Edge Function and DPO operator panel are both deployed and verified in production (FR-DPO-07 hard gate)

---

### Story 2.2: Account Creation Safety Checkboxes

As a new user creating an account,
I want to confirm my age and understand the app's wellness scope before my account is created,
So that I give informed, voluntary consent before any personal data is stored (FR-SAFE-01, FR-DPO-04).

*Depends on: Story 2.1 merged to main.*

**Acceptance Criteria:**

**Given** a user is on the account creation screen
**When** the screen renders
**Then** two checkboxes are displayed with required explanatory copy: above both checkboxes `t('auth.safety.consentIntro')` — a one-sentence explanation of why these confirmations are required; Checkbox 1: `t('auth.safety.ageConfirmation')` — "I confirm I am 18 years of age or older"; Checkbox 2: `t('auth.safety.medicoLegalDisclaimer')` — "I understand that Exposure Buddy is a general health and wellness app. Its content is not a substitute for professional medical advice and is not valid for medico-legal proceedings."; both checkboxes unchecked by default; "Create account" button disabled

**Given** either or both checkboxes are unchecked
**When** the user taps "Create account"
**Then** the action does not execute; the button remains disabled; no request is sent

**Given** both checkboxes are checked
**When** the user taps "Create account"
**Then** the button becomes active and account creation proceeds

**Given** account creation succeeds
**When** the consent event fires
**Then** `IConsentRecordService.recordConsent()` is called — interface at `packages/core/src/services/IConsentRecordService.ts` — with payload `{ timestampUtc: ISO8601, purposeId: 'account-creation-v1', consentVersion: '1.0', withdrawalStatus: false }`; pre-Epic-3 the `ConsentRecordServiceStub` at `packages/core/src/stubs/ConsentRecordServiceStub.ts` is injected — it logs the payload to console in dev and resolves immediately; direct writes to consent tables from any code path other than the `consent-record` Edge Function are prohibited (FR-DPO-04)

**Given** account creation succeeds but the consent-record write fails
**When** the error is returned
**Then** `t('auth.safety.consentWriteFailed')` is surfaced; the account creation is rolled back or the user is left in a fully recoverable retry state; no half-created account persists silently

**Given** this story's consent write is stubbed pending Epic 3
**When** assessing production readiness
**Then** this story is **not production-releasable** until Epic 3's `consent-record` Edge Function is deployed, verified, and `ConsentRecordServiceStub` is replaced with the live Edge Function call; if Epic 3 deploys the function before Story 2.2 merges, the stub is replaced with the live call as part of this story's completion criteria

---

### Story 2.3: Preview Challenges — Unauthenticated Access ~~[DEFERRED — post-MVP]~~

> **Status: DEFERRED — post-MVP (2026-05-23).** See FR-AUTH-02 decision record in FR Coverage Map. Unauthenticated users land on Sign In / Sign Up at MVP. No story to implement.

As a visitor exploring the app without an account,
I want to try 3 preview challenges before committing to registration,
So that I can experience the app's core value before sharing any personal information (FR-AUTH-02).

*Depends on: Story 2.1 merged to main (for `onNewAccountCreated` event interface and MMKV startup sequence).*

**Acceptance Criteria:**

**Given** preview challenge completions are stored locally
**When** a completion is recorded
**Then** it is written to MMKV under key `"preview_challenges"` with shape `PreviewChallengeCompletion[]` — type definition at `packages/core/src/types/PreviewChallenge.ts`, schema documented at `docs/architecture/data-schemas.md`; MMKV reads occur after key derivation completes per the ARC-004 startup sequence (key derivation → MMKV reads → PowerSync init → route decision)

**Given** 3 preview challenges are accessible without auth
**When** a clinical/product review gate runs before this story is marked done
**Then** each challenge is confirmed to contain: no SUDS rating input, no free-text reflection or journal fields, and no active distress-detection hooks from `packages/core`; all three are fixed read-only ERP-lite experiences

**Given** preview challenge components are implemented
**When** CI runs
**Then** no import from `packages/core/src/session/` or any Epic 6 session module is present in preview challenge files — enforced via `no-restricted-imports` ESLint rule; no `ExposureThread` state machine is instantiated

**Given** crisis keyword detection hooks exist in `packages/core`
**When** `AuthTokenProvider.getSession()` returns null
**Then** all keyword scan results are discarded with no outbound calls, no network requests, and no external logging; a unit test confirms this no-op behaviour

**Given** an unauthenticated user completes a preview challenge
**When** the completion screen renders
**Then** `t('auth.preview.localStorageDisclosure')` is displayed — informing the user that progress is saved on this device only and will be lost if the app is reinstalled without creating an account; visible without any tap

**Given — Branch A:** a user has one or more local preview completions and successfully creates an account
**When** the `onNewAccountCreated` event fires
**Then** `adapter.enqueue()` is called for each local completion with payload `{ challengeId, userId, completedAt, idempotencyKey: sha256(challengeId + userId) }`; after confirmed enqueue, MMKV `"preview_challenges"` is cleared; runs as background operation with no loading state shown; a unit test covers this branch

**Given — Branch B:** a user creates an account with no local preview completions
**When** the `onNewAccountCreated` event fires
**Then** no enqueue call is made; no empty payload sent; MMKV unchanged; a unit test covers this branch

**Given — Branch C:** a user creates an account and the server already has a completion record for the same `challengeId` + `userId`
**When** the server processes the enqueued record
**Then** the server-side record is kept (first-completion-wins); the enqueued record is discarded without error; the `idempotencyKey` (`sha256(challengeId + userId)`) prevents duplicate writes; a unit test covers this branch using a mock adapter

**Given** an authenticated user signs out
**When** sign-out completes
**Then** MMKV `"preview_challenges"` key is **not** cleared — preview completion data persists across sign-outs (device-scoped, not account-scoped; explicit design decision)

**Given** the app is uninstalled and reinstalled
**When** a previously unauthenticated user relaunches
**Then** prior preview completions are not present; no backup to iCloud or Google Drive (backup/sync explicitly disabled for this MMKV key)

---

### Story 2.4: Account Deletion & Session Sign-Out

As an authenticated user,
I want to sign out of my account and, if needed, request permanent deletion of my data,
So that I control my presence in the app and my data is handled per DPDPA 2023 (FR-DPO-03).

**Acceptance Criteria:**

**Given** an authenticated user taps "Sign out" in Settings
**When** sign-out executes
**Then** the Supabase session is terminated; Expo SecureStore keys `"supabase_access_token"` and `"supabase_refresh_token"` are **deleted** (not overwritten with null); MMKV `"preview_challenges"` key is not cleared; the user is routed to the unauthenticated home screen

**Given** an authenticated user navigates to Settings → Privacy → Delete my account
**When** the confirmation dialog renders
**Then** the dialog displays all of the following via `t()` keys: what happens (all personal data permanently deleted after 30 days); what is retained (consent records per DPDPA 2023 — account lifetime + 2 years post-deletion); what the 30-day window means (account is inaccessible during window; user cannot log back in or cancel once confirmed); DPO contact email from the privacy notice (FR-DPO-01)

**Given** the user confirms deletion
**When** the request is submitted
**Then** `IDpoService.requestErasure(userId)` is called — interface at `packages/core/src/services/IDpoService.ts`; pre-Epic-3 the `DpoServiceStub` at `packages/core/src/stubs/DpoServiceStub.ts` is injected — it writes a `pending_deletion_request` record to MMKV under key `"pending_deletion_request"` with `{ userId, requestedAt: ISO8601, status: 'pending' }` (audit trail exists pre-Epic-3); the user is signed out (SecureStore keys deleted); the user is routed to the unauthenticated home screen

**Given** a user attempts to log in with an account in the 30-day soft-delete window
**When** they submit their OTP
**Then** login is rejected; `t('auth.deletion.accountPendingDeletion')` is displayed informing them their account is scheduled for deletion; they are not routed into the app

**Given** the deletion request has been submitted and Epic 3's `/dpo/erase-user` is deployed
**When** the DPO audit log is checked
**Then** a log entry exists in `dpo_audit_log` via `/dpo/erase-user` Edge Function containing: action type, acting user_id (self-requested), target user_id, timestamp, outcome (FR-DPO-06, ARC-008)

---

## Epic 3: DPDPA Compliance & Crisis Safety Foundation

Crisis keyword detection and DPDPA 2023 infrastructure — consent recording, DPO data-rights Edge Functions with tamper-proof audit log, DPO operator panel with per-operator JWT auth, and Privacy Notice — are all live. FR-DPO-07 (hard production gate) is satisfied only when Stories 3.3 AND 3.4 are both complete and verified in production. Stories 2.1 and 2.2 become production-releasable after that conjunction is met.

### Story 3.1: Crisis Keyword Detection Engine

As a user experiencing distress,
I want the app to detect crisis signals in my typed input,
So that I receive immediate access to safety resources when I need them most (FR-CRISIS-01).

**Acceptance Criteria:**

**Given** `packages/core/src/crisis/keywordDetector.ts` is implemented
**When** `detectCrisisKeywords(text: string): boolean` is called
**Then** it returns `true` when the text contains any keyword from the hardcoded EN+HI list stored as a TypeScript const at `packages/core/src/crisis/keywords.ts`; the function has zero imports from `packages/supabase`, `packages/sync`, or any RN/Expo module; CI enforces this via the `packages/core` pure-TS import boundary (ARC-003)

**Given** a unit test suite at `packages/core/src/__tests__/crisis/keywordDetector.test.ts`
**When** tests run
**Then** all branches pass: EN keyword match returns `true`; HI keyword match returns `true`; mixed EN+HI text with a keyword returns `true`; text with no keywords returns `false`; empty string returns `false`; EN keyword match is case-insensitive

**Given** the function is called in any context
**When** a keyword is detected
**Then** the function returns the boolean result only; all actions triggered by detection (outbound calls, Supabase logging) are the responsibility of callers — the detector is stateless with zero network calls; a unit test confirms no network module is imported

**Given** the crisis detection module is complete
**When** CI runs
**Then** `packages/core` has zero runtime dependencies on `packages/supabase`, `packages/sync`, or any Expo/RN module (enforced by existing CI boundary check from ARC-003)

---

### Story 3.2: DPDPA Consent Schema & Consent-Record Edge Function

As the system,
I want consent records written exclusively via the `/consent-record` Edge Function,
So that DPDPA 2023 compliance is enforced at the infrastructure layer and no application code path can bypass it (FR-DPO-04).

*Depends on: Story 2.2 merged to main (`IConsentRecordService` interface and stub in place).*

**Acceptance Criteria:**

**Given** a `consent_records` table is created via migration
**When** the schema is inspected
**Then** the table contains: `id` (uuid PK), `user_id` (FK to `auth.users`), `timestamp_utc` (timestamptz NOT NULL), `purpose_id` (text NOT NULL), `consent_version` (text NOT NULL), `withdrawal_status` (boolean NOT NULL DEFAULT false), `created_at` (timestamptz DEFAULT now()); a `user_consent_status` view aggregates the latest consent record per user per purpose

**Given** RLS is applied to `consent_records`
**When** the RLS policy test harness runs via `supabase test db` using pgTAP (`packages/supabase/tests/rls/consent_records.test.ts`)
**Then** four assertions pass: [+] authenticated user can read their own consent records; [−] cross-user read is blocked; [−] unauthenticated read is blocked; [−] direct INSERT from a non-service-role context is blocked — all inserts are only permitted via the Edge Function's service_role context

**Given** the `/consent-record` Edge Function is deployed
**When** `IConsentRecordService.recordConsent(payload)` is called with `{ timestampUtc, purposeId, consentVersion, withdrawalStatus }`
**Then** the Edge Function writes a row to `consent_records`; validates all required fields are present; returns 200 on success; returns 400 with an error body on validation failure

**Given** Story 2.2's `ConsentRecordServiceStub` is live in the codebase
**When** this story is complete and the Edge Function is deployed
**Then** `ConsentRecordServiceStub` is replaced with a live `ConsentRecordService` implementation that calls `/consent-record`; the `IConsentRecordService` interface contract is unchanged; the DI binding in `apps/mobile` is updated to inject the live service

---

### Story 3.3: DPO Edge Functions & Audit Log

As a DPO operator,
I want erasure, export, and audit functions available via Edge Functions with a tamper-proof audit log,
So that DPDPA data subject rights can be processed with a complete, append-only record of every action (FR-DPO-05, FR-DPO-06, ARC-008).

*Depends on: Story 3.2 merged to main.*

**Acceptance Criteria:**

**Given** a `dpo_audit_log` table is created via migration
**When** the schema is inspected
**Then** the table contains: `id` (uuid PK), `action_type` (text NOT NULL — `'erasure' | 'export' | 'audit_view'`), `acting_operator_id` (text NOT NULL — JWT `sub` claim), `target_user_id` (uuid NOT NULL), `timestamp_utc` (timestamptz NOT NULL DEFAULT now()), `outcome` (text NOT NULL — `'success' | 'failure'`), `metadata` (jsonb)

**Given** the `dpo_audit_log_immutability_trigger` is created via migration at `packages/supabase/migrations/[timestamp]_dpo_audit_log_immutability.sql`
**When** any UPDATE or DELETE is attempted on `dpo_audit_log` — by any role including service_role
**Then** the trigger fires BEFORE the operation and raises: `'dpo_audit_log is append-only'`; the operation is aborted; this is the primary enforcement mechanism (service_role bypasses RLS but not BEFORE triggers — both enforcement layers are active)

**Given** RLS is applied to `dpo_audit_log`
**When** the RLS policy test harness runs (`packages/supabase/tests/rls/dpo_audit_log.test.ts`)
**Then** four assertions pass: [+] `dpo_operator` role can INSERT via Edge Function; [−] authenticated non-operator user cannot INSERT; [−] unauthenticated cannot INSERT; [−] UPDATE attempt raises the immutability trigger exception

**Given** the `/dpo/erase-user` Edge Function is deployed
**When** an erasure request is processed
**Then** the user's personal data is soft-deleted (user record marked deleted, PII columns nulled per erasure spec); consent records in `consent_records` are explicitly excluded from erasure — retained for account lifetime + 2 years post-deletion (DPDPA 2023 requirement); the MMKV `pending_deletion_request` entry written by Story 2.4 is resolved; a `dpo_audit_log` row is written with `action_type: 'erasure'`, `acting_operator_id` from JWT `sub`, `target_user_id`, and outcome

**Given** the `/dpo/export-user` Edge Function is deployed
**When** an export request is processed
**Then** the function compiles all exportable personal data (profile data, consent records, session metadata — excludes internal system fields); a `dpo_audit_log` row is written with `action_type: 'export'`, `acting_operator_id` from JWT `sub`, and outcome

**Given** the `/dpo/audit-log` Edge Function is deployed
**When** a read request is made
**Then** the function returns paginated `dpo_audit_log` entries; a `dpo_audit_log` row with `action_type: 'audit_view'` is written for every read (read access is itself audited); read is restricted to the `dpo_operator` role

**Given** this story is complete
**When** assessing production readiness
**Then** this story alone does not satisfy FR-DPO-07; both Story 3.3 AND Story 3.4 must be complete and verified in production before Stories 2.1 and 2.2 are production-releasable

---

### Story 3.4: DPO Operator Panel

As a DPO operator,
I want a secure web panel to process data subject rights requests and review the audit log,
So that DPDPA obligations are fulfilled with per-operator accountability and a JWT-attributed audit trail for every action (FR-DPO-07, FR-DPO-08).

*Depends on: Story 3.3 merged to main.*

**Acceptance Criteria:**

**Given** a `dpo_operators` table is created via migration
**When** the schema is inspected
**Then** the table contains: `id` (uuid PK), `email` (text UNIQUE NOT NULL), `name` (text NOT NULL), `active` (boolean NOT NULL DEFAULT true), `created_at` (timestamptz DEFAULT now()); rows are managed via seeding script — no self-registration path exists

**Given** a DPO operator submits valid credentials on the panel login page
**When** authentication executes
**Then** a Supabase custom JWT is issued with a `dpo_operator` role claim and `sub` set to the operator's `dpo_operators.id`; token expiry is ≤8 hours; the token is stored in an httpOnly cookie (not localStorage — XSS mitigation); login failure returns 401 with no disclosure of whether email or password was incorrect

**Given** an authenticated DPO operator performs any rights action (erasure or export)
**When** the action completes
**Then** the JWT `sub` claim is written to `acting_operator_id` in the `dpo_audit_log` entry; every rights action is attributable to a specific named individual — not a shared credential (DPDPA Section 9(6) traceability)

**Given** an authenticated operator views the panel dashboard
**When** the panel renders
**Then** three sections are displayed: (1) pending erasure requests (users with `pending_deletion_request` status), (2) pending export requests, (3) paginated audit log viewer (read-only); each action has a confirmation step before executing

**Given** a DPO operator taps "Log out"
**When** logout executes
**Then** the httpOnly cookie is cleared; the operator is redirected to the login page

**Given** both Story 3.3 and Story 3.4 are complete and verified in production
**When** assessing production readiness
**Then** FR-DPO-07 is satisfied; Stories 2.1 and 2.2 are production-releasable; this is the hard go-live gate

---

### Story 3.5: DPO Appointment, Privacy Notice & Analytics Boundary

As a user or regulator,
I want to access the Privacy Notice before creating an account and know who the DPO is,
So that informed consent is possible and DPDPA accountability obligations are met (FR-DPO-01, FR-DPO-02).

*Depends on: Story 3.4 merged to main (DPO identity established before Privacy Notice can name them).*  
*Depends on (documentation): The following ADRs must exist and be accepted before this story can be marked complete:*
- *`adrs/ADR-DPDPA-CHILDRENS-DATA.md` — children's data handling and 18+ self-declaration gate*
- *`adrs/ADR-DPDPA-EXPORT-DEFERRAL.md` — operator-initiated export at MVP; self-service export deferred*
- *`adrs/ADR-DPDPA-WITHDRAWAL-DEFERRAL.md` — consent withdrawal-without-deletion deferred; account deletion is MVP withdrawal mechanism*

**Acceptance Criteria:**

**Given** the Privacy Notice screen exists
**When** an unauthenticated user navigates to it (accessible via link on the account creation screen and as a standalone deep-linkable route)
**Then** the screen renders without requiring auth; it displays: app name, data controller identity, DPO name and contact email (`t('legal.dpo.contactEmail')`), list of data processing purposes, retention periods, DPDPA rights summary, and last-updated date; all strings are via `t()` keys with EN+HI translations

**Given** a user taps "Privacy Policy" or "Privacy Notice" on any auth screen
**When** navigation executes
**Then** the Privacy Notice screen opens without triggering an auth redirect; the back button returns them to the originating screen

**Given** an `analytics_events` table schema stub is created via migration
**When** the schema is inspected
**Then** a CHECK constraint limits `event_type` to an approved list (e.g., `'screen_view'`, `'feature_used'`, `'error'`); any attempt to insert an unapproved event type is rejected at the database layer; no health or session data fields are present in the stub schema; full analytics implementation is deferred to Epic 9

**Given** the children's data decision must be documented before production
**When** this story is marked complete
**Then** an ADR exists documenting: the 18+ requirement is enforced by Story 2.2's self-declaration checkbox; no parental consent flow is in MVP; children's data handling under DPDPA 2023 is explicitly deferred with reasoning recorded

**Given** the user-facing export request UI is deferred post-MVP
**When** this story is marked complete
**Then** a decision record exists: MVP export is operator-initiated via the DPO panel (Story 3.4) on receipt of a user's request; user-initiated self-service export ("Settings → Privacy → Request my data") is backlogged as a post-MVP feature

**Given** the consent withdrawal (non-deletion) flow is deferred post-MVP
**When** this story is marked complete
**Then** a decision record exists: DPDPA withdrawal-without-deletion is backlogged; MVP covers full account deletion only (Story 2.4); the DPDPA right-to-object obligation is noted in the backlog item

---

## Epic 4: User Onboarding & Psychoeducation

New users complete a structured onboarding flow — psychoeducation, SUDs calibration, and initial fear ladder setup with move up/down reordering — arriving at the home screen with a populated Courage Ladder stub. The full Courage Ladder screen (Epic 5) extends the foundation built here.

### Story 4.1: Onboarding Flow Shell & Navigation

As a newly registered user,
I want to be guided through a structured onboarding sequence after creating my account,
So that I understand the app and arrive at my Courage Ladder prepared (FR-ONBOARD-01).

**Acceptance Criteria:**

**Given** `packages/core/src/constants/kvKeys.ts` is created
**When** any code needs to reference an MMKV key
**Then** it imports from `KV_KEYS` — the file exports user-scoped key functions (e.g. `ONBOARDING_PROGRESS: (userId: string) => \`onboarding:progress:${userId}\``) and device-scoped constants (e.g. `PREVIEW_CHALLENGES: 'preview_challenges'`) with inline comments documenting scope intent; `PREVIEW_CHALLENGES: 'preview_challenges'` is added as a device-scoped forward-reference constant in this story even though Story 2.3 is deferred — Story 2.4 sign-out logic references it (the `preview_challenges` key must not be cleared on sign-out, per Story 2.4 AC); keys from Story 2.4 are added as device-scoped constants; raw MMKV key string literals outside this file are prohibited via a lint rule in `apps/mobile`

**Given** a user successfully completes OTP registration (Story 2.1)
**When** the auth session is established
**Then** the app checks `KV_KEYS.ONBOARDING_COMPLETE(userId)`; if not set, routes to `(onboarding)/welcome`; if set, routes to the home screen; this check runs after key derivation in the MMKV startup sequence (ARC-004)

**Given** the onboarding route group `(onboarding)/` is scaffolded via Expo Router
**When** the user is in onboarding
**Then** a step progress indicator shows current step and total (e.g. "Step 2 of 4"); back navigation is available on all steps except the first; all strings are via `t()` keys with EN+HI translations

**Given** a user is mid-onboarding and closes the app
**When** they relaunch
**Then** `KV_KEYS.ONBOARDING_PROGRESS(userId)` is read; the app resumes at the first incomplete step; any fear items already enqueued in Story 4.3 are loaded from the local PowerSync cache — not lost

**Given** the MMKV read of `KV_KEYS.ONBOARDING_PROGRESS(userId)` fails on resume
**When** the error occurs
**Then** the app defaults to step 1; a non-blocking toast displays `t('onboarding.resumeFailed.toast')`; no crash; fear items already enqueued remain in the PowerSync queue unaffected

**Given** the onboarding complete flag is already written
**When** the user relaunches at any future time
**Then** the app routes directly past onboarding to the home screen

---

### Story 4.2: Fear Ladder Introduction & SUDs Calibration

As a new user,
I want to understand what a fear ladder is and practise using the distress scale,
So that I can engage meaningfully with my first exposure session (FR-ONBOARD-02, FR-ONBOARD-03).

*Depends on: Story 4.1 merged to main.*

**Acceptance Criteria:**

**Given** the user reaches the psychoeducation step
**When** the screen renders
**Then** it displays plain-language content covering: what a fear ladder is, why ERP works, and what "courage" means in this context; all content is via `t()` keys with EN+HI translations

**Given** the SUDs calibration widget renders
**When** the user interacts with it
**Then** a slider or tap-target presents values 0–10 with anchor labels at 0 ("No distress"), 5 ("Moderate"), and 10 ("Extreme distress"); the widget has `accessibilityRole="slider"`, announces the current value to screen readers, and is operable via `AccessiblePressable`

**Given** the user submits a rating for the provided practice scenario
**When** the calibration completes
**Then** the calibration value is stored in MMKV under `KV_KEYS.SUDS_CALIBRATION(userId)` AND enqueued via `adapter.enqueue()` to `user_onboarding_metadata`; table schema: `id` (uuid PK), `user_id` (FK `auth.users`), `suds_calibration_value` (int NOT NULL), `completed_at` (timestamptz), `created_at` (timestamptz DEFAULT now())

**Given** RLS is applied to `user_onboarding_metadata`
**When** the RLS policy test harness runs (`packages/supabase/tests/rls/user_onboarding_metadata.test.ts`)
**Then** four assertions pass: [+] own-row SELECT and INSERT succeed for authenticated user; [−] cross-user SELECT is blocked; [−] unauthenticated access is blocked; [−] DELETE is explicitly denied for all roles

**Given** the psychoeducation screen is visible
**When** it renders
**Then** a persistent "Feeling overwhelmed?" link is visible without any user action, displaying `t('onboarding.overwhelmed.cta')`; tapping it opens the crisis resources screen; `detectCrisisKeywords()` is NOT called on this screen — the practice scenario is app-provided, not user-typed

---

### Story 4.3: Initial Fear Ladder Setup

As a new user,
I want to add my feared situations and arrange them from least to most anxiety-provoking,
So that my Courage Ladder starts from where I actually am (FR-HIER-01, FR-HIER-02).

*Depends on: Story 4.2 merged to main.*

**Acceptance Criteria:**

**Given** the fear ladder setup step renders
**When** the user adds a fear item
**Then** each item requires: description (text, required, max 200 chars) and predicted SUDs (0–10, required); on save, the item is persisted immediately via `adapter.enqueue()` to `fear_ladder_items`; `position` is assigned as the next sequential integer for that user

**Given** the `fear_ladder_items` table is created via migration
**When** the schema is inspected
**Then** the table contains: `id` (uuid PK), `user_id` (FK `auth.users`), `description` (text NOT NULL), `predicted_suds` (int NOT NULL), `actual_suds` (int NULLABLE — Epic 5 populates on session completion), `position` (int NOT NULL), `status` (text NOT NULL DEFAULT `'pending'` — CHECK (`status` IN (`'pending'`, `'in_progress'`, `'completed'`))), `created_at` (timestamptz DEFAULT now()), `updated_at` (timestamptz DEFAULT now())

**Given** fear item descriptions contain sensitive personal content
**When** the encryption decision is assessed
**Then** descriptions are stored unencrypted at rest, relying on Supabase at-rest disk encryption and RLS for access control; field-level encryption via `pgcrypto` is explicitly backlogged as a post-MVP security enhancement; this decision is documented in an ADR

**Given** a stub `therapist_patient_relationships` table is created via migration
**When** the schema is inspected
**Then** the table contains: `id` (uuid PK), `therapist_user_id` (uuid NOT NULL), `patient_user_id` (uuid NOT NULL), `active` (boolean NOT NULL DEFAULT true), `created_at` (timestamptz DEFAULT now()); no data is seeded; this stub exists solely to unblock Epic 5 `fear_ladder_items` RLS from adding a clinician read policy without retroactive migration

**Given** RLS is applied to `fear_ladder_items`
**When** the RLS policy test harness runs (`packages/supabase/tests/rls/fear_ladder_items.test.ts`)
**Then** four assertions pass: [+] own-row SELECT and INSERT succeed for authenticated user; [−] cross-user SELECT is blocked; [−] unauthenticated access is blocked; [stub] clinician path returns empty — documented as a placeholder; Epic 5 replaces this with a `therapist_patient_relationships` join-based policy

**Given** the user taps "Move up" or "Move down" on an item
**When** the swap executes
**Then** it is modelled as a single atomic `reorder_positions` enqueue: one `adapter.enqueue()` call with payload `{ type: 'reorder_positions', itemAId, itemANewPosition, itemBId, itemBNewPosition, updatedAt }`; a single enqueue prevents half-applied swaps on mid-operation app crash; drag-to-reorder is explicitly deferred to Epic 5

**Given** the user has fewer than 3 items and attempts to proceed
**When** they tap the "Next" button
**Then** the button remains disabled AND `t('onboarding.fearLadder.minimumItems')` is shown as inline helper text below the item list — not as a toast or modal; both the disabled state and the helper text are visible simultaneously

**Given** the user has 8 or more items and has not dismissed the nudge
**When** the list renders
**Then** a dismissible advisory banner is shown (`t('onboarding.fearLadder.ladderNudge')`) with a "Got it" button (`t('onboarding.fearLadder.ladderNudgeDismiss')`); the form and "Add another" button remain accessible; there is no maximum item count (per UX-DR27)

**Given** the user types into the description field
**When** `detectCrisisKeywords(description)` returns `true`
**Then** `t('onboarding.crisisDetected.banner')` is shown with a link to crisis resources; the item save is NOT blocked; `KV_KEYS.CRISIS_FLAGGED_IN_ONBOARDING(userId)` is written to MMKV (`true`) — Story 4.4 reads this to adjust completion screen tone

---

### Story 4.4: Onboarding Completion & Home Screen Entry

As a user who has finished onboarding,
I want to land on a meaningful home screen that shows my Courage Ladder,
So that I feel motivated and know exactly what to do next (FR-ONBOARD-01).

*Depends on: Story 4.3 merged to main.*

**Acceptance Criteria:**

**Given** the user completes the final onboarding step and `KV_KEYS.CRISIS_FLAGGED_IN_ONBOARDING(userId)` is NOT set
**When** the completion screen renders
**Then** it displays: `t('onboarding.complete.title')` (celebratory heading), count of fear items added, `t('onboarding.complete.encouragement')` (affirming copy), and a "Start your journey" CTA — the emotional payoff moment acknowledging the user's effort

**Given** the user completes the final onboarding step and `KV_KEYS.CRISIS_FLAGGED_IN_ONBOARDING(userId)` IS set
**When** the completion screen renders
**Then** it displays `t('onboarding.complete.titleSoft')` (calm, non-celebratory heading), `t('onboarding.complete.encouragementSoft')` (supportive, not congratulatory copy), the "Start your journey" CTA, and the persistent "Feeling overwhelmed?" link; no festive visual treatment

**Given** the user taps "Start your journey"
**When** navigation executes
**Then** `KV_KEYS.ONBOARDING_COMPLETE(userId)` is written to MMKV; the user is routed to the home screen; `AccessibilityInfo.setAccessibilityFocus()` is called on the home screen's first interactive element on transition (UX-DR16)

**Given** the home screen renders for the first time after onboarding completion
**When** `KV_KEYS.FIRST_HOME_VISIT_SEEN(userId)` is not set
**Then** `t('home.readyToStart')` is displayed; `KV_KEYS.FIRST_HOME_VISIT_SEEN(userId)` is written to MMKV before render completes

**Given** the home screen renders on all subsequent visits
**When** `KV_KEYS.FIRST_HOME_VISIT_SEEN(userId)` is already set
**Then** `t('home.welcomeBack')` is displayed; EN+HI translations present for both strings

**Given** the home screen renders
**When** the screen loads
**Then** `CourageLadderEntryCard` is rendered — TypeScript interface at `packages/ui/src/components/CourageLadderEntryCard.tsx`: `interface CourageLadderEntryCardProps { ladderItemCount: number; lowestPendingItem: FearLadderItemSummary | null; onPress: () => void; }` where `FearLadderItemSummary = { id: string; description: string; predictedSuds: number; position: number }`; `lowestPendingItem` is resolved by a pure TS selector in `packages/core` — the selector queries `fear_ladder_items` filtered to `status = 'pending'`, sorted by `position` ascending, returning the first result; full ladder list screen is Epic 5

**Given** `CalmMeButton` is rendered on the home screen
**When** the home screen is visible
**Then** the button is visible without scrolling (UX-DR04); tapping it opens the calm-me resources screen (stub — full implementation Epic 7)

---

## Epic 5: Courage Ladder

Users view their full fear hierarchy, run ERP exposure sessions with pre/post intention tracking, and receive a therapist-informed debrief. Session data syncs offline-first. On debrief submit the user is routed directly to the home screen default state (ladder visible, Start CTA). Clinician read access goes live. `actual_suds` is renamed to `peak_suds`. *(Story 5.6 — 2026-06-15 — removed the original 6-hour post-session reflection window and home screen states 7/8 per Issue #36.)*

### Story 5.1: Full Courage Ladder Screen

As a user,
I want to see my complete fear hierarchy and manage its order,
So that I can choose my next exposure with full context (FR-LADDER-01, FR-LADDER-02).

*Depends on: Story 4.4 merged to main.*

**Acceptance Criteria:**

**Given** the full ladder screen is navigated to (replacing the `CourageLadderEntryCard` stub)
**When** the screen renders
**Then** all `fear_ladder_items` for the authenticated user are shown, sorted by `position` ascending; each item displays description, predicted SUDs, and a `status` visual indicator (`pending` / `in_progress` / `completed`); reachable from `CourageLadderEntryCard.onPress()`

**Given** the user long-presses an item to drag-reorder
**When** the drag completes
**Then** the new positions are persisted via a single atomic `reorder_positions` enqueue: `adapter.enqueue({ type: 'reorder_positions', itemAId, itemANewPosition, itemBId, itemBNewPosition, updatedAt })`; this replaces the move up/down buttons from Story 4.3 — the PowerSync handler is unchanged as both write the same enqueue shape

**Given** the user taps "Add item"
**When** the form submits
**Then** a new `fear_ladder_items` row is enqueued with the next sequential `position`; `detectCrisisKeywords(description)` is called — banner shown on detection per Story 4.3 pattern

**Given** the user taps an existing item to edit
**When** the form submits
**Then** only `description` and `predicted_suds` are editable post-onboarding; `position` is managed via reorder; `status` is managed by the session flow

**Given** the screen is entered via navigation
**When** the transition completes
**Then** `AccessibilityInfo.setAccessibilityFocus()` lands on the first ladder item or "Add item" button if empty (UX-DR16)

---

### Story 5.2: ERP Session — Start & SUDs Entry

As a user,
I want to start an exposure session from a ladder rung and record my distress level in real time,
So that I can track my anxiety arc during the exposure (FR-ERP-01, FR-ERP-02).

*Depends on: Story 5.1 merged to main.*

**Acceptance Criteria:**

**Given** the `fear_ladder_items.actual_suds` column exists from Story 4.3
**When** the migration `[timestamp]_rename_actual_suds_to_peak_suds.sql` runs
**Then** the column is renamed to `peak_suds` (nullable int); `sync-rules.yaml` is updated to reflect the rename; the PowerSync client-side schema in `packages/core` (or `packages/sync`) is updated to use `peak_suds`; a full dev resync is documented as required; CI fails if `actual_suds` is referenced anywhere in the codebase post-migration

**Given** the `exposure_sessions` table is created via migration
**When** the schema is inspected
**Then** the table contains: `id` (uuid PK), `user_id` (FK `auth.users`), `fear_item_id` (FK `fear_ladder_items`), `session_type` (text NOT NULL DEFAULT `'erp'` — CHECK (`session_type` IN (`'erp'`))), `status` (text NOT NULL DEFAULT `'started'` — CHECK (`status` IN (`'started'`, `'completed'`, `'abandoned'`))), `pre_session_intention` (text NULLABLE), `post_session_reflection` (text NULLABLE), `started_at` (timestamptz DEFAULT now()), `ended_at` (timestamptz NULLABLE — always present in enqueue payload on session end; null only for in-progress sessions), `expires_at` (bigint NULLABLE — UTC epoch ms; set by DB trigger only, never by client), `created_at` (timestamptz DEFAULT now())

**Given** a `set_session_expires_at` trigger is created via `[timestamp]_set_session_expires_at_trigger.sql`
**When** `exposure_sessions.status` changes to `'completed'`
**Then** the trigger fires AFTER UPDATE and sets `expires_at = EXTRACT(EPOCH FROM now())::bigint * 1000 + 21600000` (now + 6 hours in epoch ms); `expires_at` is never computed client-side — server-authoritative per UX spec

**Given** the `suds_readings` table is created via migration
**When** the schema is inspected
**Then** the table contains: `id` (uuid PK), `session_id` (FK `exposure_sessions`), `suds_value` (int NOT NULL — CHECK 0–10), `recorded_at` (timestamptz DEFAULT now()); `user_id` is explicitly NOT present; a composite index exists on `exposure_sessions(user_id, id)` for RLS subquery performance

**Given** RLS is applied to `exposure_sessions` and `suds_readings`
**When** the policy test harnesses run (`packages/supabase/tests/rls/exposure_sessions.test.ts`, `suds_readings.test.ts`)
**Then** four assertions pass for each: [+] own-row read/write; [−] cross-user blocked; [−] unauthenticated blocked; [stub] clinician returns empty (placeholder for Story 5.4); `suds_readings` RLS policy: `session_id IN (SELECT id FROM exposure_sessions WHERE user_id = auth.uid())`

**Given** `SessionStateMachine` is implemented in `packages/core/src/session/SessionStateMachine.ts`
**When** the module is inspected
**Then** it defines states: `idle | pre_session | active | grounding | completed | abandoned`; legal transitions: `idle → pre_session`, `pre_session → active`, `active → grounding`, `active → completed`, `grounding → active` (resume), `grounding → abandoned`; transition guard: `active → completed` requires at least one `suds_readings` entry logged; the machine accepts `SessionEvent` discriminated unions, returns `SessionState` snapshots, has zero side effects and zero imports from `packages/supabase`, `packages/sync`, or any RN/Expo module; CI enforces the `packages/core` boundary (ARC-003)

**Given** the app launches and finds `exposure_sessions WHERE status = 'started' AND user_id = auth.uid()`
**When** an orphaned session exists
**Then** a recovery modal renders: `t('session.recovery.title')` with Resume (returns to session screen) or End (marks `abandoned`, sets `ended_at`, restores `fear_ladder_items.status` to `pending`)

**Given** a user taps a ladder rung to start a session
**When** the session flow begins
**Then** pre-exposure SUDs is mandatory and gates session start; an `exposure_sessions` row is enqueued with `status: 'started'`; `fear_ladder_items.status` is updated to `'in_progress'`; the `SessionStateMachine` transitions `idle → pre_session → active`; the pre-session intention screen (letter-to-self) is shown — recommended for predicted SUDs ≥ 7, optional otherwise; if written, stored in MMKV under `KV_KEYS.SESSION_INTENTION(sessionId)` until completion enqueue; a deliberate pause screen precedes "Continue" and is not skippable (UX spec)

**Given** the user taps "Stop Exposure" mid-session
**When** the stop affordance triggers
**Then** the `SessionStateMachine` transitions `active → grounding`; a grounding screen renders — mandatory, not skippable (UX spec); the grounding screen is a complete initial implementation: courage affirmation `t('session.grounding.affirmation')` and guided breathing prompt `t('session.grounding.breathingPrompt')` — this is a clinically sufficient grounding experience at MVP; Epic 7 Story 7.5 enhances it by adding a full technique picker (breathing coach, 5-4-3-2-1, helplines) once those components exist; no `// STUB` or `// TODO` comments in the grounding screen file — it ships as complete; after grounding the user chooses Resume (`grounding → active`) or Confirm Stop (`grounding → abandoned`)

**Given** the user confirms stop after grounding
**When** abandonment executes
**Then** `exposure_sessions.status` is enqueued as `'abandoned'`; `ended_at` is included in the payload (client-computed ISO timestamp); `fear_ladder_items.status` is enqueued back to `'pending'` as a single enqueue with a `last_write_wins` timestamp guard (`updatedAt: Date.now()`) to prevent conflict with prior `in_progress` writes; `t('session.abandoned.message')` is shown — copy to be written by product, companioned tone; `CalmMeButton` accessible throughout (UX-DR04)

---

### Story 5.3: ERP Session — Completion, Debrief & Home State

As a user who has completed an exposure session,
I want a meaningful debrief and a home screen that reflects what just happened,
So that I feel recognised and know what to do in the next 6 hours (FR-ERP-03).

*Depends on: Story 5.2 merged to main.*

**Acceptance Criteria:**

**Given** the user completes an exposure session
**When** the completion enqueue executes
**Then** a final `suds_readings` entry is recorded (two-point minimum: pre-exposure + debrief); `exposure_sessions.status` is enqueued as `'completed'`; `ended_at` is in the enqueue payload (client-computed ISO timestamp); `expires_at` is set server-side by the `set_session_expires_at` trigger on sync — never client-computed; `fear_ladder_items.peak_suds` is set to the maximum `suds_value` across all session readings; `fear_ladder_items.status` is enqueued as `'completed'` with a `last_write_wins` timestamp guard (`updatedAt: Date.now()`) — ladder advances unconditionally regardless of SUDs outcome (UX spec)

**Given** `pre_session_intention` was written — Branch A
**When** the debrief screen renders
**Then** the prediction vs. reality reveal uses `DmSerifSurface: 'prediction-reality-reveal'`; the user's letter is read back; the SUDS arc is always shown after the reveal regardless of outcome (UX-DR11); `post_session_reflection` field is presented with label `t('session.debrief.reflectionPrompt')` and placeholder `t('session.debrief.reflectionPlaceholder')` — copy to be written by product; max 500 chars

**Given** no `pre_session_intention` AND `peak_suds` < pre-session SUDs (improvement) — Branch B
**When** the debrief screen renders
**Then** acknowledgement card `t('session.debrief.acknowledgement')` is shown — copy to be written by product; SUDS arc (habituation visible) is shown; `post_session_reflection` field presented

**Given** no `pre_session_intention` AND `peak_suds` ≥ pre-session SUDs (no improvement) — Branch C
**When** the debrief screen renders
**Then** acknowledgement card `t('session.debrief.acknowledgementNoImprovement')` is shown — copy to be written by product, companioned tone; SUDS arc is NOT shown (UX spec); `post_session_reflection` field presented; `CalmMeButton` accessible (UX-DR04)

**Given** the user submits `post_session_reflection`
**When** submission executes
**Then** `exposure_sessions.post_session_reflection` is enqueued; the user is routed to the home screen default state (state 3 equivalent — ladder visible with Start CTA). *(Story 5.6 — 2026-06-15: original ACs 7 and 8 specifying State 7 and State 8 were removed per Issue #36.)*

---

### Story 5.4: Clinician Access — Schema & RLS Policies ~~[DEFERRED — post-MVP]~~

> **Status: DEFERRED — post-MVP (2026-05-23).** See FR-LADDER-03 decision record in FR Coverage Map. Stub `therapist_patient_relationships` table from Story 4.3 is sufficient. RLS policies will be activated via Phase 2 migration. No story to implement.

As a clinician,
I want read access to my patients' fear ladders and session data,
So that I can monitor therapeutic progress safely (FR-LADDER-03).

*Depends on: Story 5.3 merged to main. Story 5.5 must run sequentially after this story — do not parallelise.*

**Acceptance Criteria:**

**Given** `therapist_patient_relationships` is promoted from stub to live
**When** the table is inspected
**Then** it contains the Story 4.3 stub schema plus a UNIQUE constraint on `(therapist_user_id, patient_user_id)`; new rows are insertable only via service-role seeding script `packages/supabase/scripts/seed-therapist-relationships.ts` — no patient or therapist can self-insert via application code

**Given** `fear_ladder_items` RLS is updated
**When** an authenticated clinician reads a patient's items
**Then** the policy grants read via: `EXISTS (SELECT 1 FROM therapist_patient_relationships WHERE therapist_user_id = auth.uid() AND patient_user_id = fear_ladder_items.user_id AND active = true)`; INSERT/UPDATE/DELETE remain patient-only

**Given** `exposure_sessions` RLS is updated
**When** an authenticated clinician reads a patient's sessions
**Then** the same `therapist_patient_relationships` join pattern grants read-only access; write operations remain patient-only

**Given** `suds_readings` RLS is updated
**When** an authenticated clinician reads a patient's readings
**Then** read access via two-hop join: `session_id IN (SELECT id FROM exposure_sessions WHERE user_id IN (SELECT patient_user_id FROM therapist_patient_relationships WHERE therapist_user_id = auth.uid() AND active = true))`

---

### Story 5.5: Clinician Access — pgTAP Coverage ~~[DEFERRED — post-MVP]~~

> **Status: DEFERRED — post-MVP (2026-05-23).** Depends on Story 5.4, which is deferred. See FR-LADDER-03 decision record in FR Coverage Map. No story to implement.

As the development team,
I want complete pgTAP coverage for all clinician read policies,
So that the access boundary is continuously verified (FR-LADDER-03).

*Depends on: Story 5.4 merged to main (sequential — do not parallelise).*

**Acceptance Criteria:**

**Given** pgTAP harnesses are updated for all three tables
**When** `supabase test db` runs
**Then** for `fear_ladder_items.test.ts`: the stub assertion is replaced with a real [+] clinician with active relationship reads patient items; for `exposure_sessions.test.ts`: [+] own-row, [−] cross-user, [−] unauthenticated, [+] clinician with active relationship; for `suds_readings.test.ts`: [+] own-row, [−] cross-user, [−] unauthenticated, [+] clinician via two-hop join

**Given** a negative boundary assertion is required
**When** pgTAP runs for each table
**Then** a fifth assertion passes: [−] a clinician WITHOUT an active `therapist_patient_relationships` entry for the target patient cannot read that patient's data — relationship is required, not just the role

---

## Epic 6: ERP Session Depth

Enable users to engage meaningfully with their exposure sessions — from selecting a calming technique before entry, through a clearly presented active session, to a nuanced post-session debrief — and ensure the home screen reflects their current thread state accurately (states 3, 4, and 9).

### Story 6.1: Technique Selection & Pre-Exposure Briefing

As a user preparing to begin an exposure session,
I want to choose a calming technique and receive a brief orientation before I start,
So that I enter the exposure feeling prepared and grounded (FR-SESSION-04, FR-SESSION-05).

**Acceptance Criteria:**

**Given** a user taps "Start today's challenge" from state 3
**When** the technique selection screen loads
**Then** three technique options are displayed — somatic, breathing, cognitive — each with a one-sentence description; the technique previously used for this fear item (if any) is pre-selected; the user may change the selection before proceeding

**Given** the user selects a technique and taps "Continue"
**When** the pre-exposure briefing screen renders
**Then** a mandatory briefing screen is shown summarising what the session involves; a `DmSerifSurface` `'pre-exposure-readback'` component renders the user's pre-session intention (from `KV_KEYS.SESSION_INTENTION`) if present; the user must tap "I'm ready" (or equivalent CTA) before the session starts — there is no skip affordance

**Given** the user confirms readiness
**When** the session record is created
**Then** `exposure_sessions.technique` is set to the selected value (`'somatic'`, `'breathing'`, or `'cognitive'`); the column accepts `NULL` for sessions created by earlier stories (no migration needed — column already nullable); if a session is completed without a technique value, the debrief branch logic treats `technique = NULL` gracefully (no crash)

**Given** the `exposure_sessions` table does not yet have the `technique` column
**When** the migration runs
**Then** `ALTER TABLE exposure_sessions ADD COLUMN technique text NULLABLE CHECK (technique IN ('somatic', 'breathing', 'cognitive'))` executes successfully; `sync-rules.yaml` and PowerSync client schema include `technique`; existing rows default to `NULL`

---

### Story 6.2: Home Screen Morning State (State 3)

As a user who has completed onboarding and has no active exposure thread,
I want a home screen that surfaces today's challenge clearly,
So that I know exactly what to do next without hunting through the app (FR-HOME-01, FR-HOME-03, UX-DR-14).

**Acceptance Criteria:**

**Given** onboarding is complete (`KV_KEYS.ONBOARDING_COMPLETE` truthy) and no `exposure_sessions` row with `status = 'started'` exists for this user
**When** the home screen mounts
**Then** state 3 renders — "today's challenge" card shows the lowest-`position` pending `fear_ladder_items` entry; the card renders using `CourageLadderEntryCard` with `lowestPendingItem` populated; the CTA reads `t('home.state3.cta')` (canonical English: "Start today's challenge")

**Given** the today's challenge selector runs
**When** `packages/core` computes the item to surface
**Then** a pure TypeScript selector (zero side-effects, no RN/Expo deps) returns the `FearLadderItemSummary` for the lowest-`position` item with `status = 'pending'`; if no pending items remain the selector returns `null` and the home screen renders a ladder-complete stub (state 10 placeholder — one sentence, no CTA)

**Given** a partial unique index must enforce one active thread per user per fear item
**When** the migration for this story runs
**Then** `CREATE UNIQUE INDEX uq_active_thread ON exposure_sessions (user_id, fear_item_id) WHERE status = 'started'` executes successfully; attempting to insert a second `status = 'started'` row for the same `(user_id, fear_item_id)` raises a unique-constraint violation

**Given** all user-facing strings are i18n-gated
**When** the state 3 screen renders
**Then** every visible string uses `t()` from i18next; no raw string literals appear in the component; CI lint passes

**Given** `PowerSyncProvider` has not yet been wired into the app root and `useFearLadderItems` still returns `[]`
**When** this story is implemented
**Then** `PowerSyncProvider` is added to `apps/mobile/app/_layout.tsx` wrapping the root navigator; `useFearLadderItems` is replaced with a real `usePowerSyncQuery` call against the local PowerSync SQLite `fear_ladder_items` table; `exposure_sessions` active-thread check uses `usePowerSyncQuery` (not a direct Supabase call); `PowerSyncSyncAdapter` is replaced with the real durable outbox connector; `packages/sync/src/schema.ts` `user_onboarding_metadata` table gains `id: column.text` (deferred from 4-2-D5); the `reorder_positions` enqueue convention inconsistency between `(onboarding)/ladder.tsx` (UPDATE envelope) and `ladder.tsx` (operation string) is reconciled in the upload handler — both paths produce the same two-row position UPDATE at the server; after this story the ladder screen renders real `fear_ladder_items` data for authenticated users

**Given** `fear_ladder_items.status` is currently typed as `string` with no permitted values defined (4-4-D3)
**When** this story wires real data and implements the selector
**Then** the migration for this story adds `CHECK (status IN ('pending', 'completed'))` to the `fear_ladder_items` table; `packages/core/src/types/fearLadder.ts` exports `FearLadderItemStatus = 'pending' | 'completed'`; `FearLadderItem.status` is typed as `FearLadderItemStatus` (not `string`); `resolveLowestPendingItem` in `packages/core/src/selectors/fearLadder.ts` references the typed value; the sort tiebreaker for equal `position` values is resolved by adding a secondary sort on `id ASC` so ordering is deterministic regardless of engine (4-4-CR-D1); `CourageLadderEntryCard` clamps `predictedSuds` to `[0, 10]` before rendering the "Anxiety: X/10" label (4-4-CR-D4)

**Given** concurrent writes from multiple devices can produce duplicate position integers on `fear_ladder_items` (4-3-D5)
**When** the migration for this story runs
**Then** `ALTER TABLE fear_ladder_items ADD CONSTRAINT uq_user_position UNIQUE (user_id, position) DEFERRABLE INITIALLY DEFERRED` executes successfully; the constraint is deferrable so bulk reorder swaps within a single transaction can temporarily violate uniqueness without a constraint error; the PowerSync upload handler wraps `reorder_positions` operations in a single deferred transaction

**Given** the user has real `fear_ladder_items` data and needs to correct or remove an entry
**When** the user opens the edit form for a ladder item (5-1-D6)
**Then** a "Remove item" destructive action is visible within the edit modal; tapping it shows a confirmation alert with `t('ladder.delete.confirm')` (canonical English: "Remove this item from your ladder?") and two options — "Remove" (destructive) and "Cancel"; on confirm the item is removed from local state optimistically and a `delete` operation is enqueued to the outbox; if the enqueue fails, local state is rolled back and an error message is shown; on next sync the row is hard-deleted from Supabase (RLS-gated to `user_id = auth.uid()`); swipe-to-delete is not required — the in-modal button is the sole delete affordance at this story

**Dev Notes:**

- **Story 5.6 (2026-06-15, Issue #36)** removed home screen States 7 (post-exposure reflection window) and 8 (expired gate). The countdown-interval AC that was previously in this story (refresh `resolveHomeScreenState` on a 60s timer) was deleted because there is no longer a countdown to refresh. This story's `resolveHomeScreenState` wiring should target the full 8-state machine defined in `ADR-HOME-STATE-RESOLVE.md` (not the trivial `() => 'default'` stub left by Story 5.6). See `_bmad-output/implementation-artifacts/5-6-remove-home-states-7-and-8.md` for full context.

---

### Story 6.3: Home Screen Progressing State (State 4)

As a user who has an active exposure thread in progress,
I want the home screen to acknowledge my ongoing session and invite me to continue,
So that I can re-enter the session without confusion (FR-HOME-02, UX-DR-14).

*State 5 (avoidance detection) is explicitly deferred post-MVP. State 9 (re-engagement re-baseline) is also deferred post-MVP (Story 6.4). This story covers state 4 only. The state machine must include `// State 9 (re-engagement re-baseline) deferred post-MVP — falls through to state 3` alongside the existing state 5 comment.*

**Acceptance Criteria:**

**Given** at least one `exposure_sessions` row with `status = 'started'` exists for this user
**When** the home screen mounts
**Then** state 4 renders — a context card shows the fear item description; supporting copy reads `t('home.state4.context')` (canonical English: "You have an exposure in progress"); the CTA navigates back into the active session screen

**Given** the session has an `expires_at` timestamp
**When** state 4 renders
**Then** `expires_at` is NOT displayed to the user in any form; no raw epoch or human-readable timestamp appears on the home screen for an active session

**Given** state 5 (avoidance) is deferred
**When** the home screen evaluates which state to show
**Then** the state machine does NOT evaluate avoidance heuristics; a code comment reads `// State 5 (avoidance detection) deferred post-MVP`; the state transitions directly from state 4 logic to state 6 logic (no gap)

**Given** all user-facing strings are i18n-gated
**When** the state 4 screen renders
**Then** every visible string uses `t()`; no raw string literals appear in the component; CI lint passes

---

### Story 6.4: Re-engagement After Gap (State 9) ~~[DEFERRED — post-MVP]~~

> **Status: DEFERRED — post-MVP (2026-05-23).** See FR-HOME-05 and FR-LADDER-06 decision records in FR Coverage Map. The `suds_baselines` table is not created. State 9 is not evaluated — the state machine falls through to state 3. No story to implement.

As a returning user who has not engaged with the app for more than 10 days,
I want a gentle re-baseline check before resuming my ladder,
So that my SUDS target remains calibrated to my current anxiety level (FR-HOME-05, FR-LADDER-06, UX-DR-15).

**Acceptance Criteria:**

**Given** the user's most recent `exposure_sessions.completed_at` is more than 10 days ago (or no completed sessions exist)
**When** the home screen evaluates state
**Then** state 9 renders; welcome copy reads `t('home.state9.welcome')` (canonical English: "Good to see you back. Let's see where things are at."); the user is prompted to enter a current SUDS value for their next ladder item

**Given** the `suds_baselines` table does not yet exist
**When** the migration runs
**Then** the following DDL executes successfully:
```sql
CREATE TABLE suds_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fear_item_id uuid NOT NULL REFERENCES fear_ladder_items(id) ON DELETE CASCADE,
  session_id uuid NULLABLE REFERENCES exposure_sessions(id) ON DELETE SET NULL,
  value int NOT NULL CHECK (value BETWEEN 0 AND 10),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_suds_baseline ON suds_baselines (user_id, fear_item_id, recorded_at);
CREATE INDEX idx_suds_baselines_lookup ON suds_baselines (user_id, fear_item_id, recorded_at DESC);
```

**Given** the user submits a re-baseline SUDS value
**When** the value is persisted
**Then** a new `suds_baselines` row is inserted with `session_id = NULL` (no active session at this point); `fear_ladder_items.predicted_suds` is NOT overwritten; the new baseline value is stored only in `suds_baselines` and surfaced in the session start flow for context

**Given** the gap check returns no completed sessions (null case)
**When** the home screen evaluates state
**Then** the null case falls through to state 3 (today's challenge); state 9 is NOT triggered for a user who has never completed a session

**Given** all user-facing strings are i18n-gated
**When** the state 9 screen renders
**Then** every visible string uses `t()`; no raw string literals appear; CI lint passes

---

## Epic 7: Support Toolkit

Enable users to access calming support from anywhere in the app — a global Calm Me button surfaces a courage affirmation, a breathing coach (guided then passive), a 5-4-3-2-1 grounding exercise, and crisis helplines. The grounding screen from Story 5.2 (affirmation + breathing prompt, fully shippable) is enhanced with a full technique picker and fully wired to the `SessionStateMachine`.

### Story 7.1: Calm Me Shell, Courage Affirmation & Action Decision Routing

As a user experiencing distress at any point in the app,
I want a persistent Calm Me button that immediately surfaces a calming support screen,
So that I can access grounding tools without navigating away or losing my session context (FR-CALM-01, UX-DR-17).

**Acceptance Criteria:**

**Given** the app is running on any screen
**When** the `CalmMeButton` component is mounted in the root layout
**Then** it is always visible and tappable; it is mounted in `apps/mobile/app/_layout.tsx` outside the `<Stack />` or `<Slot />` so it persists across all route transitions; `CalmMeButton` in `packages/ui/src/components/CalmMeButton.tsx` is navigation-agnostic and accepts an `onPress` prop — the layout wires the navigation action via `router.push()` or equivalent; no navigation logic lives inside `packages/ui`

**Given** the Calm Me modal is already open
**When** the root layout evaluates whether to show the FAB
**Then** the `CalmMeButton` is hidden or disabled; tapping the FAB cannot stack a second Calm Me modal on top of an open one

**Given** `packages/core/src/config/calmMeConfig.ts` does not yet exist
**When** this story is implemented
**Then** the file is created and exports:
```typescript
export const CALM_ME_AFFIRMATIONS: string[] = [
  'calmMe.affirmation.1', // canonical: "Your nervous system is doing exactly what it's supposed to do"
];
// Post-MVP: add entries to enable rotation; component renders t(CALM_ME_AFFIRMATIONS[0]) at MVP
```
The component renders `t(CALM_ME_AFFIRMATIONS[0])`; the array structure is in place so post-MVP rotation requires only adding entries

**Given** the Calm Me modal opens
**When** it renders in any context
**Then** an Exit icon (✕) is visible in the top-right of the modal; tapping it closes the modal and returns the user to the screen they came from with no state change; this affordance is present in both session and non-session contexts

**Given** the user opens Calm Me and `SessionStateMachine.state !== 'active'` (non-session context)
**When** the support screen renders
**Then** it shows: (1) courage affirmation `t(CALM_ME_AFFIRMATIONS[0])`; (2) technique picker with three navigation targets — Breathing, 5-4-3-2-1, Helplines (stubbed at this stage, filled by Stories 7.2–7.4); (3) NO action footer — no CTAs below the technique picker; the Exit icon is the only dismiss affordance

**Given** the user opens Calm Me and `SessionStateMachine.state === 'active'` (in-session context)
**When** the support screen renders
**Then** it shows: (1) courage affirmation; (2) technique picker; (3) action footer with `t('calmMe.keepGoing')` (canonical: "I can keep going") and `t('calmMe.needToStop')` (canonical: "I need to stop")

**Given** the user taps `t('calmMe.keepGoing')` while in an active session
**When** the action is processed
**Then** the modal closes with a brief fade transition (≤ 300 ms) before returning the user to the active exposure screen; no `SessionStateMachine` transition occurs; the fade is the only UI acknowledgement — no copy, no toast

**Given** the user taps `t('calmMe.needToStop')` while `SessionStateMachine.state === 'active'`
**When** the action is processed
**Then** an immediate inline modal appears with `t('calmMe.debriefNow')` (canonical: "Debrief now?") and two options: Yes → navigates to the debrief screen (Story 5.3 handles session status transition and debrief logic); Not now → navigates to home screen default state (ladder visible, Start CTA). *(Story 5.6 — 2026-06-15: original "post-exposure state 7 (6h window)" destination removed per Issue #36.)*

**Given** `packages/core/src/config/helplines.ts` does not yet exist
**When** this story is implemented
**Then** the file is created and exports:
```typescript
export interface Helpline {
  id: string;
  name: string;
  number: string;      // dialable, for tel: URI
  displayNumber: string; // formatted for display
}
export const HELPLINES: Helpline[] = [
  { id: 'telemanas',  name: 'Tele MANAS',            number: '18008914416', displayNumber: '1800-891-4416' },
  { id: 'kiran',      name: 'KIRAN',                 number: '18005990019', displayNumber: '1800-599-0019' },
  { id: 'icall',      name: 'iCall',                 number: '9152987821',  displayNumber: '9152987821'    },
  { id: 'vandrevala', name: 'Vandrevala Foundation',  number: '9999666555',  displayNumber: '9999-666-555'  },
  { id: 'aasra',      name: 'AASRA',                 number: '02227546669', displayNumber: '+91-22-27546669' },
];
```
This file contains only data and types — no `Linking` import, no RN dependencies; ARC-003 is satisfied; Story 7.4 wires it to the UI

**Given** all user-facing strings are i18n-gated
**When** the support screen renders
**Then** every visible string uses `t()`; no raw string literals in component JSX; CI lint passes

---

### Story 7.2: Breathing Coach

As a user who has opened the Calm Me support screen,
I want a structured breathing exercise that guides me through the first two cycles then lets me breathe along passively,
So that I can calm my nervous system with minimal cognitive load (FR-CALM-02, UX-DR-18).

**Acceptance Criteria:**

**Given** `packages/core/src/config/breathingCoach.ts` does not yet exist
**When** this story is implemented
**Then** the file is created:
```typescript
export const BREATHING_GUIDED_CYCLES = 2;
export const BREATHING_TIMER_SECONDS = 300; // total session duration from first inhale, guided + passive
export const BREATHING_PATTERN = { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 } as const;
// Post-MVP: technique selection (4-7-8, diaphragmatic) and user-configurable timer/cycles
```
No magic numbers appear inline in the component; all values imported from this file

**Given** phase-transition logic must be independently testable
**When** a dev agent implements the breathing hook
**Then** a `useBreathingPhase` hook (or equivalent) drives phase transitions from `BREATHING_PATTERN` constants without depending on animation state; unit test: `GIVEN phase index n WHEN elapsed ticks reach BREATHING_PATTERN[n].duration THEN phase advances to n+1`; the animation is a consequence of phase state, not a test criterion

**Given** the user taps the Breathing target on the support screen
**When** the breathing coach screen loads
**Then** the guided phase begins immediately; a session timer starts counting down from `BREATHING_TIMER_SECONDS` (300 s) and is displayed as MM:SS; guided cycle 1 of `BREATHING_GUIDED_CYCLES` starts

**Given** the guided phase is active
**When** each stage runs
**Then** the circular animated indicator and text prompts cycle: `t('breathing.inhale')` (canonical: "Breathe in...") for 4 s, during which the ring grows to its peak size → `t('breathing.holdIn')` (canonical: "Hold...") for 4 s, during which the ring stays constant at peak size → `t('breathing.exhale')` (canonical: "Breathe out...") for 4 s, during which the ring shrinks back to its rest size → `t('breathing.holdOut')` (canonical: "Hold...") for 4 s, during which the ring stays constant at rest size; one cycle = 16 s

**Given** `BREATHING_GUIDED_CYCLES` guided cycles have completed
**When** the next cycle begins
**Then** the screen transitions automatically to the passive phase: the cycling text prompts continue identically (instructions remain visible for the whole session, guided and passive alike — never hidden); the animated ring continues looping with the same 4-4-4-4 timing; a `t('breathing.passiveReady')` (canonical: "I'm ready") CTA becomes visible — the user may tap it at any point during the passive phase to end the session early

**Given** the session timer reaches zero during the passive phase
**When** the countdown hits 00:00
**Then** the session ends gracefully; a brief `t('breathing.sessionComplete')` (canonical: "Session complete") message appears for 1–2 s; the user is then returned to the Calm Me support screen; no abrupt cut

**Given** the user taps `t('breathing.passiveReady')` before the timer expires
**When** the early-exit action is processed
**Then** the session ends immediately; the user is returned to the Calm Me support screen; remaining timer value is discarded

**Given** the user taps the back/dismiss affordance during the guided phase
**When** dismissal is handled
**Then** the user is returned to the support screen; no error or warning shown; the session is treated as incomplete

---

### Story 7.3: 5-4-3-2-1 Sensory Grounding Exercise

As a user who has opened the Calm Me support screen,
I want a step-through sensory awareness exercise to anchor me in the present moment,
So that I can interrupt an anxiety spiral without needing to think about what to do next (FR-CALM-03, UX-DR-19).

**Acceptance Criteria:**

**Given** the user taps the 5-4-3-2-1 target on the support screen
**When** the exercise screen loads
**Then** step 1 of 5 is shown: `t('grounding541.see')` (canonical: "Notice 5 things you can see around you"); a step counter shows "1 / 5"; a single `t('grounding541.gotIt')` (canonical: "Got it") CTA is visible; this is pure tap-through — no text input, no validation logic; the user advances solely by tapping the CTA

**Given** the user taps "Got it" on steps 1 through 4
**When** each step advances
**Then** step 2: `t('grounding541.hear')` (canonical: "Notice 4 sounds you can hear"); step 3: `t('grounding541.touch')` (canonical: "Notice 3 things you can touch or feel"); step 4: `t('grounding541.smell')` (canonical: "Notice 2 things you can smell"); step counter updates on each advance

**Given** the user is on step 5
**When** the step renders
**Then** the prompt reads `t('grounding541.taste')` (canonical: "Notice 1 thing you can taste"); the step counter shows "5 / 5"; the CTA reads `t('grounding541.doneFinal')` (canonical: "I'm done") — distinct from the "Got it" used on steps 1–4 — so the completion intent is unambiguous

**Given** the user taps "I'm done" on step 5
**When** the final step is acknowledged
**Then** a completion view renders: `t('grounding541.complete')` (canonical: "Well done. You just brought yourself back to the present."); two CTAs: `t('grounding541.done')` (canonical: "Done") → returns to support screen; `t('grounding541.again')` (canonical: "Go again") → resets to step 1 with step counter back to "1 / 5"

**Given** the user taps the back/dismiss affordance at any step before completion
**When** dismissal is handled
**Then** the user is returned to the support screen; no error or warning shown

**Given** all user-facing strings are i18n-gated
**When** the exercise screen renders
**Then** every visible string uses `t()`; no raw string literals in component JSX; CI lint passes

---

### Story 7.4: Helpline Signpost

As a user in crisis or seeking additional support,
I want a screen showing crisis helpline contacts with one-tap calling,
So that I can reach human support immediately, even offline (FR-CRISIS-01, NFR-OFFLINE-03).

**Acceptance Criteria:**

**Given** the user taps the Helplines target on the support screen
**When** the helpline screen loads
**Then** an intro line renders: `t('helplines.intro')` (canonical: "Talking to someone helps. These services are free and confidential."); below it, one card per entry in `HELPLINES` from `packages/core/src/config/helplines.ts` renders with the entry's `name`, `displayNumber`, and a `t('helplines.call')` (canonical: "Call") button; the `Helpline` type is imported from `helplines.ts` — no inline type redefinition

**Given** `HELPLINES` is empty
**When** the helplines screen renders
**Then** a fallback message renders instead of an empty list: `t('helplines.unavailable')` (canonical: "Helpline information is not available in your region yet."); no crash, no blank list

**Given** the user taps the "Call" button on any helpline card
**When** the tap is handled
**Then** `Linking.openURL('tel:' + entry.number)` is called; if `Linking.openURL` throws, the error is caught, `console.error` logs the failure, and no error surface is shown to the user — the UI remains unchanged

**Given** the device has no network connection
**When** the helpline screen renders
**Then** all helpline cards are visible and the "Call" buttons are functional; no network call is made to render this screen; NFR-OFFLINE-03 is satisfied

**Given** no helpline data is hardcoded in the component
**When** the component is read
**Then** `HELPLINES` and `Helpline` are imported solely from `packages/core/src/config/helplines.ts`; updating that file is the only change required to modify any helpline entry

---

### Story 7.5: Grounding Screen — Full Technique Picker

As a user who has tapped "Stop Exposure" during an active session,
I want a fully implemented grounding screen with breathing, 5-4-3-2-1, and helplines available,
So that I can calm myself before deciding whether to continue or end the session (FR-SESSION-06, UX-DR-19).

**Acceptance Criteria:**

**Given** the initial grounding screen from Story 5.2 exists (courage affirmation + breathing prompt + 2 CTAs)
**When** this story is implemented
**Then** the grounding screen is enhanced with a full technique picker as described below; the affirmation and action footer from Story 5.2 are retained; the breathing prompt text is replaced by the interactive technique picker

**Given** the user reaches the grounding screen via the "Stop Exposure" affordance
**When** the screen renders
**Then** it shows: (1) courage affirmation `t(CALM_ME_AFFIRMATIONS[0])` from `packages/core/src/config/calmMeConfig.ts`; (2) technique picker — Breathing (navigates to Story 7.2 breathing coach), 5-4-3-2-1 (navigates to Story 7.3 exercise), Helplines (navigates to Story 7.4 screen); (3) action footer; this screen reuses the same technique components built in Stories 7.2–7.4 — it is not a duplicate implementation
**And** a code comment marks the intro copy for post-MVP review: `// TODO post-MVP: consider distinct framing copy for grounding vs. Calm Me contexts`

**Given** the grounding screen action footer
**When** it renders
**Then** two CTAs are shown: `t('grounding.keepGoing')` (canonical: "I can keep going") and `t('grounding.stopSession')` (canonical: "I need to stop this session")

**Given** the user taps "I can keep going"
**When** the action is processed
**Then** `SessionStateMachine.transition('grounding → active')` is called; the user is navigated back to the active exposure screen; SUDS logging resumes

**Given** the user taps "I need to stop this session"
**When** the action is processed
**Then** `SessionStateMachine.transition('grounding → abandoned')` is called; `adapter.enqueue()` is called with the session-end write payload as defined in Story 5.3; the user is navigated to the debrief screen

**Given** the grounding screen is mandatory
**When** the user attempts to navigate away without choosing an action
**Then** Android hardware back button is intercepted and produces no navigation; iOS swipe-back gesture is disabled (`gestureEnabled: false`); header back button is hidden (`headerBackVisible: false`); there is no affordance to bypass this screen

**Given** `packages/core/src/session/__tests__/SessionStateMachine.test.ts` exists from earlier epics
**When** the test suite runs
**Then** the existing file is extended (not duplicated) with assertions for both transitions: `grounding → active` results in `machine.state === 'active'`; `grounding → abandoned` results in `machine.state === 'abandoned'`; attempting either transition from a state other than `grounding` throws a typed error

---

## Epic 8: Notifications & Achievements Tab

Surface session completion and re-engagement nudges via Expo push and local notifications, and deliver an Achievements tab where users can review their SUDS arc and session history.

> **Note (2026-06-21):** The Achievements tab (Story 8.5) is deferred post-MVP, alongside the server-driven notification stories (8.3, 8.4) deferred earlier. Only Story 8.1 (push token registration) and Story 8.2 (daily local reminder) ship at MVP. See each story's status note and the FR-PROG-01/FR-PROG-02 decision record in the FR Coverage Map.

### Story 8.1: Push Token Registration & Shared Push Helper

As a user who wants to receive session reminders,
I want the app to register my device for push notifications and store my token securely,
So that the server can dispatch notifications to me (technical prerequisite for FR-NOTIF-01, FR-NOTIF-02, FR-NOTIF-03, FR-NOTIF-04 — no FR is directly implemented here; FR-NOTIF-01 would have been implemented in Story 8.4, now deferred post-MVP — see FR Coverage Map).

**Acceptance Criteria:**

**Given** the `device_push_tokens` table does not yet exist
**When** this story is implemented
**Then** the following migration is applied:
```sql
CREATE TABLE device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_push_token ON device_push_tokens (token);
```

**Given** the RLS policy for `device_push_tokens`
**When** the policy is applied
**Then** authenticated users may INSERT and SELECT their own rows only; no client-side UPDATE or DELETE is permitted; `service_role` is used by Edge Functions for token pruning

**Given** a user grants push permission and a token is obtained via `Notifications.getExpoPushTokenAsync()`
**When** the token is registered
**Then** the app calls `supabase.from('device_push_tokens').upsert({ token, platform, user_id, last_seen_at: new Date().toISOString() }, { onConflict: 'token' })`; `last_seen_at` and `user_id` are updated on conflict; no duplicate rows are created

**Given** the app is foregrounded after a token was previously registered
**When** `Notifications.getExpoPushTokenAsync()` returns a token
**Then** the upsert is re-executed to refresh `last_seen_at`; this is idempotent and produces no visible side effect

**Given** the shared push helper `supabase/functions/_shared/expoPush.ts`
**When** it is implemented
**Then** it exports:
```typescript
export type PushResult =
  | { ok: true }
  | { ok: false; signal: 'PruneToken' | 'RetryLater' | 'Unknown' };
export async function sendPushNotification(
  token: string,
  title: string,
  body: string
): Promise<PushResult>
```
requests to the Expo Push API are batched in chunks of ≤100 (the Expo batch limit); `DeviceNotRegistered` and `InvalidCredentials` ticket errors return `{ ok: false, signal: 'PruneToken' }`; network errors return `{ ok: false, signal: 'RetryLater' }`

**Given** a `PruneToken` signal is returned by `sendPushNotification`
**When** the calling Edge Function handles the result
**Then** it deletes the token row from `device_push_tokens` using `service_role`; no further notification attempt is made for that token in the same cron run

**Given** the "Enable reminders" card in the Settings screen
**When** it renders
**Then** it shows the current permission state (enabled / disabled / not-yet-requested); tapping it calls `Notifications.requestPermissionsAsync()` if not yet granted, or opens the OS settings deep-link if previously denied; the card label updates to reflect the current state after the user returns to the app

---

### Story 8.2: Daily Local Session Reminder

> **Amended 2026-06-21.** Implemented as drafted below, then redesigned post-"done" around user-supplied mockups: Settings now shows a single "Daily reminder" row (value: "Disabled" or a 12-hour time), and the destination screen is a Disable/Enable radio choice rather than a bare time picker. The trigger type was also corrected from `CalendarTrigger` (iOS-only) to `DailyTriggerInput` (cross-platform) during original implementation. The ACs below have been updated in place to reflect current behavior; full rationale, dev notes, and a "Known gap" list live in `_bmad-output/implementation-artifacts/8-2-daily-local-session-reminder.md`, which remains the authoritative as-built reference.

As a user who sets a preferred reminder time,
I want the app to send me a daily local notification at that time,
So that I am prompted to complete my daily exposure session (FR-NOTIF-03).

**Acceptance Criteria:**

**Given** the user has not previously configured a reminder (or has chosen "Disable")
**When** the Settings screen renders
**Then** the "Daily reminder" row shows "Disabled"; tapping it opens a screen with "Disable"/"Enable" radio options (the time picker shown only under "Enable") and a Save button; no notification is scheduled until Save is pressed with "Enable" selected

**Given** the user selects "Enable", picks a time, and presses Save, and OS notification permission is granted (already, or after being requested)
**When** the save action completes
**Then** `Notifications.scheduleNotificationAsync` is called with a `DailyTriggerInput` for the chosen time, repeating daily; the returned notification ID is stored in `KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId)`; the chosen time (HH:mm string) is stored in `KV_KEYS.SESSION_REMINDER_TIME(userId)`; `KV_KEYS.SESSION_REMINDER_ENABLED(userId)` is set to `true`; the screen navigates back to Settings with no confirmation message (silent by design)

**Given** the user re-saves with "Enable" selected and a (possibly unchanged) time
**When** the save action completes
**Then** the previously scheduled notification (ID from `KV_KEYS.SESSION_REMINDER_NOTIFICATION_ID(userId)`) is cancelled via `Notifications.cancelScheduledNotificationAsync` before the new one is scheduled; no orphaned notifications remain (best-effort)

**Given** the app is foregrounded (which covers the device timezone changing, e.g. travel) and the reminder is enabled (`KV_KEYS.SESSION_REMINDER_ENABLED(userId)` is `true`)
**When** `KV_KEYS.SESSION_REMINDER_TIME(userId)` contains a saved time
**Then** the existing notification is cancelled and rescheduled using the same HH:mm time in the new timezone; if the reminder is not enabled, this no-ops even if a time is still stored

**Given** the user selects "Disable" and presses Save
**When** the save action completes
**Then** any existing scheduled notification is cancelled, `KV_KEYS.SESSION_REMINDER_ENABLED(userId)` is set to `false`, and the stored notification ID is cleared; the stored time is left untouched (restored if the user re-enables later) but is not displayed anywhere while disabled; Settings then shows "Disabled"

**Given** the user selects "Enable" and presses Save, and notification permission is still not granted after being requested
**When** the save action completes
**Then** Save is blocked — nothing is scheduled or persisted, the screen does not navigate back — and inline guidance plus an "Open Settings" action is shown instead; no error is thrown

**Given** the Settings "Daily reminder" row, with the reminder enabled and a time stored
**When** the row renders
**Then** the value is shown in 12-hour clock format with AM/PM (e.g. "11:00 PM"), not the raw 24-hour stored string

**Given** `packages/core/src/constants/kvKeys.ts`
**When** this story is implemented
**Then** the following entries are added (user-scoped factory functions, consistent with the existing `KV_KEYS` pattern):
```typescript
SESSION_REMINDER_TIME: (userId: string) => `notifications:reminder_time:${userId}`,
SESSION_REMINDER_NOTIFICATION_ID: (userId: string) => `notifications:reminder_id:${userId}`,
SESSION_REMINDER_ENABLED: (userId: string) => `notifications:reminder_enabled:${userId}`,
```

---

### Story 8.3: Window-Close Notification (Edge Function) ~~[DEFERRED — post-MVP]~~

> **Status: DEFERRED — post-MVP (2026-06-15).** Story 5.6 / Issue #36 removed home screen States 7 and 8 (post-exposure reflection window + late-debrief gate). The window-close notification semantically depends on the 6-hour reflection window that the UI no longer presents — the notification copy loses its referent. See PRD FR Coverage Map decision record for `FR-NOTIF-04`. No MVP story.

As a user who completed an exposure session but hasn't written their reflection yet,
I want a notification 3 hours after completing my session reminding me the reflection window is still open,
So that I have a final nudge before the 6-hour window closes (FR-NOTIF-04).

**Acceptance Criteria:**

**Given** the `window_notified_at` column does not yet exist on `exposure_sessions`
**When** this story is implemented
**Then** the following migration is applied:
```sql
ALTER TABLE exposure_sessions ADD COLUMN window_notified_at timestamptz NULLABLE;
CREATE INDEX idx_sessions_window_notify ON exposure_sessions (status, completed_at)
  WHERE window_notified_at IS NULL;
```

**Given** the Edge Function `supabase/functions/notify-window-close/index.ts`
**When** triggered by pg_cron every 15 minutes
**Then** it executes the following query to find eligible sessions:
```sql
SELECT es.id, es.user_id, es.completed_at
FROM exposure_sessions es
WHERE
  es.status = 'completed'
  AND es.window_notified_at IS NULL
  AND es.completed_at + INTERVAL '3 hours' <= NOW()
  AND es.expires_at > EXTRACT(EPOCH FROM NOW()) * 1000
ORDER BY es.completed_at ASC
LIMIT 500;
```
there is no lower-bound time filter — any session that has passed the 3-hour mark and whose window has not yet expired is eligible regardless of when the cron last ran

**Given** an eligible session is found and the user has a registered push token
**When** `sendPushNotification` is called (from `supabase/functions/_shared/expoPush.ts`)
**Then** on `{ ok: true }`, `window_notified_at` is set to `NOW()` for that session ID; `window_notified_at` is only written after a successful dispatch — never before

**Given** an eligible session is found but the user has no registered push token
**When** the function processes that session
**Then** `window_notified_at` is NOT set; the session remains eligible on the next cron run; no error is logged for this case

**Given** `sendPushNotification` returns `{ ok: false, signal: 'PruneToken' }`
**When** the Edge Function handles the result
**Then** the token row is deleted from `device_push_tokens`; `window_notified_at` is NOT set for that session; the session remains eligible if the user re-registers a token before `expires_at`

**Given** the user taps the window-close notification
**When** the deep link is resolved
**Then** the user is navigated to the Achievements tab; the tap destination is the Achievements tab (not the Home screen or a session-specific debrief screen)

**Given** the cron job definition
**When** it is registered
**Then** it runs every 15 minutes: `SELECT cron.schedule('notify-window-close', '*/15 * * * *', $$SELECT net.http_post(...)$$)`

---

### Story 8.4: Re-engagement Notifications — Day 2 & Day 5 (Edge Function) ~~[DEFERRED — post-MVP]~~

> **Status: DEFERRED — post-MVP (2026-06-21).** See FR-NOTIF-01 decision record in FR Coverage Map. No MVP story.

As a user who has been away from the app,
I want warm notifications on day 2 and day 5 of inactivity — with no further nudges after that,
So that I am gently invited back without guilt or pressure (FR-NOTIF-01).

**Acceptance Criteria:**

**Given** the re-engagement tracking columns do not yet exist on `user_onboarding_metadata`
**When** this story is implemented
**Then** the following migration is applied:
```sql
ALTER TABLE user_onboarding_metadata
  ADD COLUMN re_engagement_day2_notified_at timestamptz NULLABLE,
  ADD COLUMN re_engagement_day5_notified_at timestamptz NULLABLE;
```

**Given** the Edge Function `supabase/functions/notify-re-engagement/index.ts`
**When** triggered by pg_cron every hour
**Then** it runs two sequential passes per invocation — a Day 2 pass and a Day 5 pass; the function is idempotent: re-triggering within the same inactivity window cannot send duplicate notifications

**Given** the Day 2 pass
**When** executed
**Then** it queries for users whose last completed session is ≥2 days ago and whose Day 2 notification has not yet been sent for this inactivity window:
```sql
SELECT uom.user_id
FROM user_onboarding_metadata uom
WHERE EXISTS (
  SELECT 1 FROM exposure_sessions es
  WHERE es.user_id = uom.user_id AND es.status = 'completed'
)
AND (
  SELECT MAX(es.completed_at) FROM exposure_sessions es
  WHERE es.user_id = uom.user_id AND es.status = 'completed'
) < NOW() - INTERVAL '2 days'
AND (
  uom.re_engagement_day2_notified_at IS NULL
  OR uom.re_engagement_day2_notified_at < (
    SELECT MAX(es.completed_at) FROM exposure_sessions es
    WHERE es.user_id = uom.user_id AND es.status = 'completed'
  )
)
LIMIT 500;
```
on `{ ok: true }` from `sendPushNotification`, `re_engagement_day2_notified_at` is set to `NOW()`

**Given** the Day 5 pass
**When** executed
**Then** it queries for users whose last completed session is ≥5 days ago, whose Day 2 notification was already sent for this window, and whose Day 5 notification has not yet been sent:
```sql
SELECT uom.user_id
FROM user_onboarding_metadata uom
WHERE EXISTS (
  SELECT 1 FROM exposure_sessions es
  WHERE es.user_id = uom.user_id AND es.status = 'completed'
)
AND (
  SELECT MAX(es.completed_at) FROM exposure_sessions es
  WHERE es.user_id = uom.user_id AND es.status = 'completed'
) < NOW() - INTERVAL '5 days'
AND uom.re_engagement_day2_notified_at IS NOT NULL
AND uom.re_engagement_day2_notified_at > (
  SELECT MAX(es.completed_at) FROM exposure_sessions es
  WHERE es.user_id = uom.user_id AND es.status = 'completed'
)
AND (
  uom.re_engagement_day5_notified_at IS NULL
  OR uom.re_engagement_day5_notified_at < (
    SELECT MAX(es.completed_at) FROM exposure_sessions es
    WHERE es.user_id = uom.user_id AND es.status = 'completed'
  )
)
LIMIT 500;
```
on `{ ok: true }` from `sendPushNotification`, `re_engagement_day5_notified_at` is set to `NOW()`; after this, no further automated re-engagement notifications are sent for this inactivity window (FR-NOTIF-01 cap)

**Given** a user is found in either pass and has a registered push token
**When** `sendPushNotification` is called (from `supabase/functions/_shared/expoPush.ts`)
**Then** on `{ ok: false, signal: 'PruneToken' }`, the token row is deleted from `device_push_tokens` and the notification column is NOT set; on `{ ok: false, signal: 'RetryLater' }`, the column is NOT set and the user remains eligible on the next hourly run

**Given** a user is found in either pass but has no registered push token
**When** the function processes that user
**Then** neither column is set; the user remains eligible on subsequent runs if they re-register a token before day 2 or day 5 passes respectively

**Given** a user completes a new session after receiving one or both re-engagement notifications
**When** the next cron run evaluates that user
**Then** the `completed_at > re_engagement_day2_notified_at` comparison automatically treats the prior notifications as belonging to the previous window; both Day 2 and Day 5 become eligible again for the new inactivity period; no explicit column reset is required

**Given** the cron job definition
**When** it is registered
**Then** it runs every hour: `SELECT cron.schedule('notify-re-engagement', '0 * * * *', $$SELECT net.http_post(...)$$)`

---

### Story 8.5: Achievements Tab — SUDS Trend, Session History & Arc ~~[DEFERRED — post-MVP]~~

> **Status: DEFERRED — post-MVP (2026-06-21).** See FR-PROG-01/FR-PROG-02 decision record in FR Coverage Map. No MVP story. Scope reduction for the closed-beta cohort, alongside Stories 8.3 and 8.4. The underlying `suds_readings`/`exposure_sessions` data is captured regardless (Epic 5/6) — only the in-app visualisation (trend graph, history log, arc detail, and the "Progress" tab itself) is deferred. When this is picked back up: the `SudsArcChart` component (`packages/ui`, Epic 5) is already built and consumed by the debrief screen; no new migration is required for the trend graph or history log, but `situation_text_snapshot` referenced in the original AC text does not exist in the schema (neither Supabase nor PowerSync) — resolve via a live join to `fear_ladder_items.description` with a null-safe fallback, or a new migration, before implementing.

As a user who has completed one or more exposure sessions,
I want an Achievements tab with a SUDS trend graph across all my sessions and a full session history log,
So that I can observe my habituation pattern over time and review individual sessions (FR-PROG-01, FR-PROG-02).

**Acceptance Criteria:**

**Given** the Achievements tab does not yet exist in the bottom navigation
**When** this story is implemented
**Then** a "Progress" tab is added to the tab bar; the tab is accessible from all main screens; the tab icon uses a suitable symbol from the approved icon set

**Given** the user navigates to the Achievements tab
**When** the screen renders
**Then** the screen has three distinct sections in order: (1) SUDS trend graph (FR-PROG-01); (2) session history log (FR-PROG-02); (3) most-recent session SUDS arc detail; each section renders independently — a missing data condition in one section does not collapse the others

**Given** the SUDS trend graph section (FR-PROG-01)
**When** it renders with at least one completed session
**Then** the graph plots pre-exposure SUDS for each completed session on the x-axis (session date) and y-axis (SUDS 0–10); the graph supports two time window filters: **Weekly** (last 7 days) and **Monthly** (last 30 days); the active filter is a segmented control above the graph; the graph renders using the `SudsArc` / `SudsArcChart` component from `packages/ui` established in Epic 5; data is aggregated from `suds_readings` joined to `exposure_sessions` via `session_id`

**Given** the weekly/monthly filter
**When** the user switches between them
**Then** the graph re-renders with the filtered data set; no network call is made — data is read from the PowerSync local replica via `useQuery`; the transition uses the `preparing` motion preset (200ms ease-out)

**Given** the session history log section (FR-PROG-02)
**When** it renders
**Then** it displays a chronological list of sessions ordered most-recent first; both `status = 'completed'` and `status = 'abandoned'` sessions are included — partial/abandoned sessions are shown with a distinct visual treatment (e.g. muted styling, `t('progress.session.partial')` label) without any negative framing (FR-NOTIF-02 tone constraint applies here too); sessions with `status = 'started'` (currently in progress) are excluded; each row shows: courage ladder item name (from `situation_text_snapshot`), session date, pre-exposure SUDS, and debrief SUDS (or "—" for abandoned)

**Given** the user taps a session row in the history log
**When** the session detail view opens
**Then** the full SUDS arc for that session is shown (pre-exposure + all mid-session log entries + debrief SUDS); the debrief outcome (`post_session_reflection` if present) is shown; no edit affordance is provided — this is a read-only historical view

**Given** the user has no completed or abandoned sessions yet
**When** the Achievements tab renders
**Then** an empty state is shown with copy `t('progress.emptyState')` (canonical: "Complete your first session to see your progress here"); no error state is shown; the trend graph and history sections are not rendered

**Given** the device is offline
**When** the Achievements tab renders
**Then** all data is read from the PowerSync local replica via `useQuery`; no network request is made; the tab renders fully without a connectivity check; NFR-OFFLINE-03 is satisfied

**Given** the window-close notification tap (Story 8.3)
**When** the deep link resolves
**Then** the user is navigated to this Achievements tab; the tab is the canonical destination for all notification taps in Epic 8

---

## Epic 9: Quality & Production Readiness

Verify and harden the MVP before India launch: offline degradation policy, accessibility, storage hygiene, performance on low-end devices, graceful audio/haptic degradation, humane error copy, and a CI-gated E2E smoke suite.

### Story 9.1: PowerSync Schema Sync & Offline Degradation ADR

As a developer maintaining the offline-first architecture,
I want the PowerSync schema verified against the live Supabase schema and the offline degradation policy documented in a finalized ADR,
So that every dev agent knows the authoritative offline behaviour contract before implementing or testing offline paths (NFR-OFFLINE-01, NFR-OFFLINE-02).

**Acceptance Criteria:**

**Given** the PowerSync sync configuration file (`apps/mobile/powersync.config.ts` or equivalent)
**When** this story is implemented
**Then** every table and column referenced in the PowerSync schema matches the current Supabase migration state; any discrepancy is treated as a blocking defect and resolved before the story closes; a checklist comment in the config file lists the verified tables: `users`, `user_onboarding_metadata`, `fear_ladder_items`, `exposure_sessions`, `suds_readings`; **`suds_baselines` is excluded** — table is not created at MVP (Story 6.4 deferred); **`device_push_tokens` is excluded** — it is written directly via the `packages/supabase` push-tokens Edge Function client, not synced through PowerSync

**Given** ADR-OFFLINE-DEGRADATION is referenced in architecture documentation but its content is not yet finalized
**When** this story is implemented
**Then** `_bmad-output/planning-artifacts/adrs/ADR-OFFLINE-DEGRADATION.md` is created (or updated if a stub exists) with the following decisions: (1) which writes are queued offline via `adapter.enqueue()` and which are rejected; (2) what the user sees when a queued write cannot sync within the session window; (3) how session state is recovered on app re-foreground after a kill mid-session; (4) the sync conflict resolution policy (last-write-wins vs. server-authoritative); the ADR status field is set to `Accepted`

**Given** the PowerSync schema and ADR are finalized
**When** a CI run executes
**Then** a schema-drift check step is present that fails the build if the PowerSync schema references tables or columns not present in the migration history; the step runs on every PR touching `supabase/migrations/` or the PowerSync config file

---

### Story 9.2: Offline Session Recovery Integration Tests

As a developer verifying the offline-first session loop,
I want integration tests that prove session writes are preserved and recoverable when the network drops mid-session,
So that the offline degradation guarantees documented in ADR-OFFLINE-DEGRADATION are machine-verified, not just asserted (NFR-OFFLINE-01, NFR-REL-02).

**Acceptance Criteria:**

**Given** Story 9.1 is complete and ADR-OFFLINE-DEGRADATION is accepted
**When** this story is implemented
**Then** integration tests cover all three offline failure scenarios from F3/F4: (1) network drops during active exposure — `adapter.enqueue()` calls succeed locally; session state remains `active`; queue count increments; (2) app is backgrounded mid-session and re-foregrounded — session state is recovered from MMKV; the correct home screen state is restored; no data is lost; (3) app is killed mid-session and re-launched — session state is recovered from the PowerSync local replica; `SessionStateMachine` re-enters the correct state on hydration

**Given** the integration test harness
**When** offline scenarios are simulated
**Then** network connectivity is mocked at the PowerSync adapter layer — not via OS-level airplane mode (which is flaky in CI); the mock is contained to `packages/core` or test utilities and does not pollute `apps/mobile` source files

**Given** all three offline scenario tests pass
**When** the CI pipeline runs
**Then** the test suite is gated in CI alongside existing unit tests; failures in offline recovery tests block merge to `main`

**Given** the `SessionStateMachine` states in `packages/core/src/session/SessionStateMachine.ts`
**When** this story is implemented
**Then** if the offline recovery scenarios require a new state or transition, it is added to `SessionStateMachine.ts` and covered by tests in the existing `SessionStateMachine.test.ts` file before the integration tests reference it; no integration test depends on a `SessionStateMachine` state that does not yet exist

---

### Story 9.3: Accessibility Audit & P0/P1 Remediation

As a user with a visual impairment or who relies on screen reader or large text settings,
I want every interactive element and content region in the app to be correctly labelled and navigable,
So that Exposure Buddy is usable regardless of accessibility need (NFR-ACCESS-01).

**Acceptance Criteria:**

**Given** the full app screen inventory across all epics
**When** the accessibility audit is conducted
**Then** every screen is reviewed against a checklist that includes: (1) all interactive elements have `accessibilityLabel` set to non-empty, meaningful text; (2) all interactive elements have `accessibilityRole` set appropriately (`button`, `link`, `header`, `text`, `image`); (3) `accessibilityHint` is present wherever the action outcome is non-obvious; (4) focus order follows the visual reading order; (5) `Text` components that display dynamic values use `accessibilityLiveRegion` where appropriate; the audit produces a findings list categorised as P0 (broken or missing — blocks screen reader use), P1 (degraded experience), or P2 (nice-to-have)

**Given** the audit findings list is produced
**When** this story is considered complete
**Then** all P0 and P1 findings are resolved; P2 findings are added to the post-MVP backlog; no P0 or P1 open findings remain at story close

**Given** dynamic type scaling is in scope
**When** device font size is set to the largest accessible size (iOS: Accessibility → Larger Text at maximum; Android: Display → Font size at largest)
**Then** all text in the app is readable and no text is clipped, overlapping, or hidden; NativeWind responsive text utilities are used to handle scaling; no text sizes are hardcoded in pixels that bypass system font scaling

**Given** the Calm Me button and SUDS slider — the two highest-consequence interactive elements in the app
**When** a screen reader is active
**Then** the Calm Me button announces its label and role before any other interactive element regardless of visual position; the SUDS slider announces its current value, minimum, maximum, and the light-weight subtext for the selected value via `accessibilityValue`

---

### Story 9.4: MMKV Key Hygiene & Storage Audit

As a developer maintaining client-side storage,
I want a lint rule that prevents raw MMKV string literals and a verified audit showing all sensitive fields use Expo SecureStore,
So that key collisions, data corruption, and unencrypted sensitive storage are structurally prevented (ARC-004, NFR-SEC-01).

**Acceptance Criteria:**

**Given** there is no shared `packages/eslint-config` package — ESLint rules are defined per-package in each package's own `.eslintrc.js` (`apps/mobile/.eslintrc.js`, `apps/web/.eslintrc.js`, `packages/ui/.eslintrc.js`)
**When** this story is implemented
**Then** a custom ESLint rule named `no-raw-mmkv-key` is added and enabled as `error` in the `.eslintrc.js` of every package that calls MMKV's `.set()`, `.getString()`, `.contains()`, `.delete()` — currently `apps/mobile` and `packages/supabase`; `packages/supabase` does not yet have its own `.eslintrc.js` and one is added as part of this story; the rule flags any call where the key argument is a string literal rather than a reference to a `KV_KEYS.*` factory function output

**Given** the lint rule is added
**When** `pnpm lint` runs against the current codebase
**Then** zero violations are reported; if pre-existing raw string literals are found during implementation, they are migrated to `KV_KEYS.*` factory functions before the story closes

**Given** the SecureStore audit
**When** the audit is conducted
**Then** a grep for `SecureStore.setItemAsync` and `SecureStore.getItemAsync` across `apps/mobile` produces a list of all stored keys; each key is reviewed: (a) PII (email, phone, OTP tokens) — must use SecureStore; (b) session state and KV cached values — MMKV acceptable; (c) Supabase auth tokens — must use Supabase's own secure storage integration, not a custom SecureStore call; any misclassified storage is corrected before the story closes

**Given** the lint rule is in CI
**When** any future PR introduces a raw MMKV string literal
**Then** CI fails with the `no-raw-mmkv-key` rule error; the violation must be resolved before merge

---

### Story 9.5: E2E Smoke Test Suite — Maestro

As a developer releasing to production,
I want a CI-gated Maestro smoke suite covering the critical therapy loop,
So that a regression in the core user path is caught before it reaches users (NFR-QUALITY-01).

**Acceptance Criteria:**

**Given** Maestro is not yet configured in the project
**When** this story is implemented
**Then** `apps/mobile/.maestro/` directory is created; Maestro is added to CI (`pnpm ci:e2e` or equivalent); the CI step runs against a pre-built Expo custom dev client — not Expo Go — to ensure the production module graph is exercised

**Given** the critical path flows
**When** the smoke suite runs
**Then** the following YAML flow files exist and pass: (1) `onboarding.yaml` — app launch through account creation, SPIN questionnaire, symptom check, safety behaviour checklist, psychoeducation, to hierarchy builder unlock; (2) `ladder-build.yaml` — add at least one fear item with SUDS rating, reach the "Start today's challenge" home state; (3) `exposure-loop.yaml` — start session, select technique, begin exposure, log a SUDS reading, complete exposure, reach debrief screen; (4) `debrief.yaml` — complete debrief, verify session saved and home screen reflects the completed session (Story 8.5's Achievements tab is deferred post-MVP — no longer a valid verification point); (5) `backgrounded-recovery.yaml` — start exposure, send app to background, re-foreground, verify session state is recovered and Calm Me prompt is overlaid

**Given** the backgrounded-recovery flow
**When** the flow runs
**Then** the Calm Me button is present and tappable after re-foreground; the session status remains `active` as evidenced by the session continuing without a "Something went wrong" state; no error toast is shown

**Given** network state during the smoke suite
**When** flows run in CI
**Then** all flows run with network connectivity; offline path testing is covered by integration tests in Story 9.2 — not by Maestro; no flow simulates airplane mode or network drops

**Given** a flow fails in CI
**When** the pipeline result is reviewed
**Then** Maestro produces a recording and screenshot at the point of failure; the CI artifact is retained for 7 days; the failed flow name and failing step are visible in the CI summary

---

### Story 9.6: Error State & Empty State UX Audit

As a user experiencing an error or using the app for the first time,
I want every error message and empty state to be specific, calm, and actionable,
So that I am never alarmed or left confused at a high-anxiety moment (see ADR-ERROR-STATES).

**Acceptance Criteria:**

**Given** the full screen inventory across all epics
**When** the error state audit is conducted
**Then** every error surface is catalogued; "error surface" includes: API/network error toasts, failed sync states, auth errors, empty states (no sessions, no ladder items, no progress data), and loading failure states; the catalogue is documented as comments in the relevant components or in `apps/mobile/docs/error-state-inventory.md`

**Given** any existing generic error copy used in place of a classifiable, specific failure ("Something went wrong", "Error", "Failed", "Try again" without context, used where the underlying cause is known)
**When** found during the audit
**Then** it is replaced with specific, calm, actionable copy following this pattern: state what happened in plain language, state the user's data status (lost / safe / will sync), state what to do next; canonical replacements:
- Offline write failure: "We couldn't save your session right now. It's stored on your device and will sync automatically."
- Auth network error: "Couldn't connect to sign you in. Check your connection and try again."
- Hierarchy empty state: "Your ladder is empty. Tap 'Build your ladder' to get started."
- ~~Achievements tab empty state: "Complete your first session to see your progress here."~~ — N/A for MVP; Story 8.5 (Achievements tab) deferred post-MVP 2026-06-21. Retained as reference copy for when the tab ships.

**Given** `ADR-ERROR-STATES.md`'s defined Base Fallback Error State ("Something went wrong. Please try again." with a single "Try again" retry action)
**When** the audit encounters this exact copy used as the last-resort fallback for a genuinely unclassified or unexpected failure (per the component's `error` state in the ADR's state-variant matrix) — not as a lazy substitute for a knowable cause
**Then** it is retained as-is; this story does not contradict or remove the ADR-approved base fallback, it only eliminates uses of generic copy where a more specific cause is determinable; this story's audit findings are used to move `ADR-ERROR-STATES.md` from `Draft — for review` to `Accepted` once the designer/engineering lead sign off

**Given** the SPIN referral screen and any clinical advisory copy
**When** reviewed in this audit
**Then** they are explicitly excluded from generic error copy replacement — clinical copy is owned by the decisions locked in Epic 2; this story does not alter clinical copy

**Given** all updated error and empty states
**When** a screen reader reads an error state
**Then** the error message is announced via `accessibilityLiveRegion="polite"` (or `"assertive"` for blocking errors); the message is not communicated only via colour or icon

---

### Story 9.7: Performance Budget — Low-End Device Validation

As a user on a low-end Android device,
I want the app to feel responsive during exposure sessions,
So that micro-frictions do not compound anxiety during a vulnerable moment (NFR-PERF-01).

**Acceptance Criteria:**

**Given** the performance budget targets
**When** this story is implemented
**Then** the following budgets are defined and documented in `apps/mobile/docs/performance-budget.md`: (1) cold start to interactive: ≤2 seconds on the reference device profile; (2) frame rate during the active exposure screen (SUDS slider interaction, session timer tick): ≥55 fps; (3) Calm Me button tap-to-screen latency: ≤200ms; ~~(4) Achievements tab initial render with 10 sessions of data: ≤1 second~~ — N/A for MVP; Story 8.5 (Achievements tab) deferred post-MVP 2026-06-21

**Given** the reference device profile
**When** performance is measured
**Then** the reference profile is Android, 2GB RAM, Snapdragon 439 or equivalent (Redmi 9A / Samsung Galaxy M02 tier); iOS performance at this tier is expected to be sufficient and is not the primary validation target for MVP; the Android reference is tested via an emulator with 2× CPU throttle if a physical device is not available

**Given** measurement tooling
**When** performance is measured
**Then** React Native's built-in Performance Monitor is used for frame rate; cold start is measured via `adb shell am start -W` or equivalent; Flashlight CLI (`@perf-tools/flashlight`) is used if available; manual stopwatch measurement is acceptable as a fallback with results documented

**Given** the performance audit results
**When** a budget violation is found
**Then** violations in cold start and Calm Me tap-latency targets are P0 blockers — the story does not close until they are resolved; frame rate below 45fps during SUDS slider interaction is P0; frame rate between 45–55fps is P1 and may be deferred to post-MVP with explicit sign-off; a `// PERF` comment is added to any component where a workaround is applied

---

### Story 9.8: Haptic & Sound Degradation Audit

As a user doing an exposure in a public setting with my phone on silent,
I want the app's timed and guided experiences to remain fully usable without audio,
So that I can use the app discreetly without losing any therapeutic feedback (FR-SOM-02; UX spec design principle "silent-mode primary" — `ux-design-specification/core-user-experience.md`).

**Acceptance Criteria:**

**Given** the full inventory of app features that use audio or haptics
**When** the audit is conducted
**Then** the following features are in scope: (1) breathing coach guided cycles (inhale/hold/exhale cues); (2) exposure session timer ticks; (3) Calm Me entry and grounding affirmation; (4) any completion or achievement moment; the inventory is documented as a checklist comment in the relevant components

**Given** any feature that uses audio to convey state or timing
**When** the device is on silent (system mute active)
**Then** the feature remains fully functional without audio; audio cues are paired with a visual fallback that conveys the same information — e.g. the breathing coach shows an animated circle expand/contract with text label; no feature requires audio to be usable

**Given** haptic feedback in the app
**When** it is used
**Then** haptics are additive feedback, not primary state communication; haptic intensity follows: `ImpactFeedbackStyle.Light` for confirmations, `ImpactFeedbackStyle.Medium` for session milestones; all haptic calls are wrapped in a try-catch — `Haptics.impactAsync()` throws on devices without haptic hardware and must not crash the app

**Given** Android and iOS platform differences in haptic APIs
**When** haptic feedback is implemented
**Then** `expo-haptics` is used exclusively — no direct platform haptic calls; no `react-native-haptic-feedback` or direct `UIImpactFeedbackGenerator` references exist in the codebase

**Given** the breathing coach specifically
**When** the device is on silent
**Then** the 4-4-4-4 box breathing cycle is communicated entirely through the animated visual (circle scale, background colour shift, and text label "Breathe in" / "Hold" / "Breathe out"); audio is an enhancement, not a requirement; a manual test on a muted device is documented in the story close-out checklist

---

### Story 9.9: i18n Coverage, Hindi Activation & Phase 1 India Launch Verification ⚑ Phase 1 Gate

> **Phase 1 gate — must complete before India launch; not required for the initial MVP cut.**

As a developer closing out the India launch,
I want locale coverage verified end-to-end, Hindi activated, RTL rendering validated, the India device profile confirmed, and load testing passed,
So that every Phase 1 India-specific launch requirement is machine-verified before any Indian user reaches the app (FR-I18N-01, FR-I18N-02, NFR-SCALE-01, NFR-DEVICE-01).

**Acceptance Criteria:**

**Given** the full app source tree
**When** the i18n coverage audit runs
**Then** a script (or CI step) confirms no user-facing string is hardcoded — every visible string in `apps/mobile` routes through a `t()` call or is a `tel:` / `mailto:` URI literal in crisis contacts; any violation is a P0 blocker; the audit covers all screens introduced in Epics 2–9

**Given** `apps/mobile/src/i18n/locales/en.json` and `apps/mobile/src/i18n/locales/hi.json`
**When** this story is implemented
**Then** `hi.json` contains a translation for every key present in `en.json`; no key is missing or has an English placeholder value; the existing Jest key-structure test in `apps/mobile/src/i18n/i18n.test.ts` (Story 1.6) is extended to assert key parity between `en.json` and `hi.json`; the Hindi locale is activated in the app's i18n configuration (not just scaffolded as a stub)

**Given** the app is running with the Hindi locale active
**When** any screen is rendered
**Then** all strings render in Devanagari script without layout overflow, clipping, or broken wrapping; the SUDS slider labels, session phase headers, debrief copy, onboarding prompts, and Calm Me affirmation are all verified; a manual walkthrough of the core ERP session flow in Hindi is documented in the story close-out checklist

**Given** RTL layout support is implemented (scaffolded in Story 1.6)
**When** the device locale is set to an RTL language (e.g. Arabic for test purposes)
**Then** all screens render with correct RTL mirroring — navigation arrows reverse, text alignment flips, and no element overflows its container; the RTL audit covers the home screen, hierarchy builder, ERP session flow, debrief, and Calm Me overlay

**Given** the India device reference profile (Android, 2GB RAM, Snapdragon 439 or equivalent — Redmi 9A / Samsung Galaxy M02 tier)
**When** the device compatibility matrix is completed
**Then** all functional requirements pass on this profile with no regressions against the performance budgets established in Story 9.7; the compatibility matrix is documented in `apps/mobile/docs/device-compatibility.md`; testing may use an emulator with 2× CPU throttle if a physical device is unavailable

**Given** network conditions on Indian mobile networks
**When** the 2G fallback scenario is tested
**Then** all three ERP session phases (pre-session briefing, active SUDS logging, debrief) complete without data loss when network is throttled to 2G (≤50 kbps downstream) or dropped entirely during an active session; the sync queue drains correctly when connectivity is restored; crisis resource contacts render without a network call; this test extends the offline integration tests from Story 9.2 with the 2G throttle condition

**Given** the production backend
**When** the load test runs
**Then** a load test simulating 10,000 concurrent active users is executed against the production (or production-equivalent staging) backend; all API endpoints used in the core ERP session loop respond within NFR-PERF-02 targets (SUDS log write ≤500ms P95) under load; no errors exceed 0.1% error rate; results are documented in `apps/mobile/docs/load-test-results.md`; the load test must complete and pass before the India launch date is confirmed

---

### Story 9.10: Silent Enqueue-Failure Remediation — User-Visible Error/Retry UI

As a user whose offline write (a SUDS reading, a session state change, a ladder edit) fails to enqueue,
I want to be told clearly that something didn't save and given a way to retry,
So that I never mistake a silent failure for a successful action, especially mid-exposure when trust in the app matters most (NFR-OFFLINE-01, NFR-REL-02).

**Acceptance Criteria:**

**Given** `ADR-OFFLINE-DEGRADATION.md` Decision 2's tracked follow-up ("the next story that touches the sync mutation queue, or before the ADR-OFFLINE-DEGRADATION remediation epic begins, whichever comes first" — see the Epic List reservation above for its current number)
**When** this story is implemented
**Then** it is treated as satisfying that trigger condition; Story 9.2 (offline recovery integration tests) explicitly declined to implement this remediation and deferred it here

**Given** the full set of `adapter.enqueue()` call sites in `apps/mobile`
**When** this story's audit runs
**Then** every silent-failure call site is catalogued, not just the two documented in `ADR-OFFLINE-DEGRADATION.md` Decision 2 — that list (`assessment.tsx:handleNext`, `grounding.tsx`) is known incomplete as of this story's creation; re-run the audit against current source rather than trusting the ADR's list verbatim

**Given** a cataloged silent-failure call site
**When** the triage is performed
**Then** each site is classified by clinical stakes per the ADR's existing F3–F6 scope table (e.g. SUDS logging during active exposure and Calm Me abandonment are high-stakes; non-session ladder edits are lower-stakes); remediation is prioritized accordingly, highest-stakes sites first

**Given** a remediated call site
**When** an `enqueue()` call throws
**Then** the user sees a clear, calm, actionable message (reusing the canonical copy pattern established in Story 9.6: "We couldn't save your session right now. It's stored on your device and will sync automatically." — adapted per call site) and, where the action is meaningfully retryable, a retry affordance; this story may implement the message-only path ahead of Story 9.6 if 9.6 has not yet landed, using the same canonical copy so the two stories don't diverge

**Given** the existing `Alert.alert()` pattern used for the analogous MMKV-read-failure case in `apps/mobile/app/(onboarding)/welcome.tsx`
**When** this story selects a UI mechanism for the error message
**Then** it either reuses that established pattern or documents why a different mechanism (toast/banner) was chosen instead — there is no existing toast/banner component in the codebase today, so introducing one is itself a decision this story must make explicit, not assume

**Given** all remediated call sites
**When** the story closes
**Then** `deferred-work.md` entries `4-2-D2`, `4-2-D4`, and `5-2-W15` are updated or closed to reflect what was actually remediated vs. what remains deferred (if anything)

---

## Epic 10: Password-Based Login (Alternative Authentication Method)

Give users a password-based alternative to the OTP-only sign-up/sign-in shipped in Epic 2, plus a self-serve forgot/reset-password flow — built to be complete and tested, but held behind a feature flag for closed beta until custom SMTP is live.

### Story 10.1: Password-Based Sign-Up & Sign-In (Email + Phone)

As a user who doesn't want to wait for an OTP every time,
I want to create an account and sign in using an email or phone number plus a password,
So that I have a faster alternative to OTP verification (FR-AUTH-04).

**Acceptance Criteria:**

**Given** the existing OTP-only sign-in screen (`apps/mobile/app/(auth)/sign-in.tsx`)
**When** this story is implemented
**Then** the screen gains OTP / Password tabs for both the email and phone identifier paths; password sign-up enforces an 8-character client-side minimum length; Supabase Auth's built-in password grant handles verification server-side

**Given** a user signs up with password auth
**When** the account is created
**Then** the same two mandatory safety checkboxes (FR-SAFE-01) gate the creation action, identical to the OTP sign-up path — no safety-check bypass exists for the password path

**Given** password sign-in for an existing account
**When** the user submits valid credentials
**Then** a session is established identically to the OTP path (same session storage, same `auth.hasAuthedBefore` MMKV flag per FR-AUTH-03)

---

### Story 10.2: Hosted Supabase Provisioning & Auth Hardening

As a developer preparing the password-auth epic for a real beta,
I want the hosted Supabase project fully migration-current and hardened against the cross-user PII-erasure hole found in migration 0007,
So that password-based accounts run on production-shaped infrastructure with no known auth-adjacent security gaps (NFR-SEC-01, NFR-SEC-06).

**Acceptance Criteria:**

**Given** the hosted Supabase project "Exposure Buddy" (`jhbtzsvlgglyfbrgmpsb`, ap-northeast-1)
**When** this story is implemented
**Then** it is linked in `supabase/config.toml`, migrations are backfilled to match local (0004–0030), and the `exposure-buddy://reset-password` redirect URL is registered in the dashboard

**Given** `perform_user_erasure` and `fear_ladder_items_delete_audit` were found to have public EXECUTE grants (a cross-user PII-erasure hole introduced in migration 0007)
**When** this story is implemented
**Then** migration `0030_revoke_definer_function_execute.sql` revokes public EXECUTE on both functions

**Given** leaked-password protection (HaveIBeenPwned check) requires a Supabase Pro-plan feature
**When** this story is implemented on the Free-plan hosted project
**Then** the feature is deferred, not silently skipped — tracked in `deferred-work.md` with the trigger "enable when upgraded to Pro"; client-side 8-character minimum length remains the only password-strength check at MVP

---

### Story 10.3: Forgot / Reset Password Flow (Flag-Gated)

As a user who has forgotten their password,
I want to request a reset link and set a new password from a deep link,
So that I'm not permanently locked out of a password-based account (FR-AUTH-05).

**Acceptance Criteria:**

**Given** a user on the sign-in screen's password tab
**When** the "Forgot password?" link is tapped
**Then** it navigates to `(auth)/forgot-password.tsx`, which accepts an email identifier only (phone-identifier password accounts have no reset path — documented gap, not a bug; see `deferred-work.md`) and calls `resetPasswordForEmail`

**Given** a recovery email is delivered
**When** the user taps the deep link
**Then** `exposure-buddy://reset-password` is parsed by the pure function `packages/core/src/auth/recovery-url.ts` (unit-tested, handles both the implicit `#access_token` and PKCE `?code` redirect shapes) and routes to `(auth)/reset-password.tsx`, where `updateUser` sets the new password

**Given** custom SMTP is not yet provisioned on the hosted Supabase project
**When** the app is built for closed beta
**Then** the "Forgot password?" link and the flow it leads to are gated behind `EXPO_PUBLIC_ENABLE_PASSWORD_RESET === 'true'` (default off in `global.d.ts`); the screens, parser, and tests remain in the codebase, unhidden from source, ready to flip on once SMTP is live

**Given** the flag is later flipped on
**When** an on-device build is tested
**Then** one manual E2E pass verifies both redirect shapes against the live hosted project before the flag ships to any real beta tester — not yet performed as of this planning entry; tracked in `deferred-work.md`

---

### Story 10.4: Fix Non-Functional `perform_user_erasure()` (NOT NULL Constraint Bug)

As a DPO fulfilling a DPDPA erasure request,
I want `perform_user_erasure()` to actually succeed when called,
So that the "right to erasure" feature works end-to-end instead of failing on every invocation (DPDPA 2023 §5 completeness requirement).

**Acceptance Criteria:**

**Given** `public.users.email` has been `TEXT NOT NULL` since migration `0001_users.sql`, and `perform_user_erasure()` (migration `0007`) unconditionally sets `email = NULL`
**When** this story is implemented
**Then** a new migration relaxes the `NOT NULL` constraint on `public.users.email` (matching migration `0005`'s documented intent — "email and auth identity are nulled alongside `deleted_at` being set") so the erasure `UPDATE` no longer violates a constraint

**Given** `supabase/functions/dpo-erase-user/index.ts` calls `perform_user_erasure` via `service_role` RPC as the real DPO-panel erasure path
**When** the fix is applied
**Then** a real erasure call against a seeded test user succeeds end-to-end — `email` is `NULL` and `deleted_at` is set — confirmed with an automated test, not ad hoc verification

**Given** Story 10.2's EXECUTE-privilege regression test (`packages/supabase/__tests__/rls/perform_user_erasure.test.ts`) only asserts grant-level correctness, not functional success (deliberately scoped that way while this bug was open)
**When** this story is implemented
**Then** that test file is extended with an assertion that the `service_role` erasure call fully succeeds, closing the coverage gap that let this bug go undetected since migration 0007

**Given** the hosted "Exposure Buddy" project (`jhbtzsvlgglyfbrgmpsb`) runs the same schema (migrations 0001–0030 applied)
**When** this story is implemented
**Then** the fix is applied and confirmed working on the hosted project too, not just locally

**Source:** `_bmad-output/implementation-artifacts/deferred-work.md` — "URGENT — perform_user_erasure() is currently non-functional (discovered 2026-07-28)", found during Story 10.2's code review.

---

### Story 10.5: Re-Erasure Idempotency Guard for `perform_user_erasure()`

As a DPO reviewing the erasure audit log,
I want a second erasure attempt against an already-erased user to be rejected instead of silently "succeeding" again,
So that the audit trail stays trustworthy and re-erasure can't mask an operator mistake or a scripting bug (DPDPA 2023 §5 completeness requirement; FR-DPO-06 audit-log integrity).

**Acceptance Criteria:**

**Given** `perform_user_erasure()` (migration `0007`) currently runs its `UPDATE ... SET email = NULL, deleted_at = now()` unconditionally whenever the target row exists
**When** this story is implemented
**Then** a new migration adds a guard so that, if the target row's `deleted_at` is already non-null, the function raises a distinct `erasure_already_erased` exception instead of re-running the update — mirroring the existing `erasure_target_not_found` guard's convention, and placed in the `SECURITY DEFINER` function body so it protects every caller, not just one Edge Function

**Given** `supabase/functions/dpo-erase-user/index.ts` already pattern-matches `erasure_target_not_found` to special-case the not-found path
**When** this story is implemented
**Then** it gains an analogous `erasure_already_erased` branch that writes a `dpo_audit_log` entry with `outcome: 'failure'` and returns HTTP 400 — never a second indistinguishable `outcome: 'success'` entry for a re-erasure attempt

**Given** the existing `service_role` regression test in `packages/supabase/__tests__/rls/perform_user_erasure.test.ts` already exercises a full successful erasure
**When** this story is implemented
**Then** a new test calls the RPC a second time against the same already-erased user and asserts the call is rejected and `deleted_at` is unchanged from its first-erasure value

**Given** the migration changes a DPDPA-critical `SECURITY DEFINER` function
**When** this story is implemented
**Then** it is applied and confirmed on both the local stack and the hosted project (`jhbtzsvlgglyfbrgmpsb`)

**Source:** `_bmad-output/implementation-artifacts/deferred-work.md` — "Re-erasure of an already-erased user now silently 'succeeds'", found during Story 10.4's code review.

---

## Epic 11: Beta Feedback Collection

Give beta testers a low-friction, first-party way to report bugs and impressions tied to the exact screen they were on. Feedback writes directly to Supabase — no third-party form or feedback SaaS is introduced, avoiding an additional DPDPA data-processor disclosure during closed beta.

### Story 11.1: Feedback Table, RLS & Storage Bucket

As a developer building the beta feedback pipeline,
I want a Supabase table and storage bucket dedicated to feedback submissions with RLS policies that only allow authenticated users to insert their own rows,
So that feedback data is captured securely in first-party infrastructure with no read/write access beyond what's needed (FR-BETA-02).

**Acceptance Criteria:**

**Given** no `feedback` table exists yet
**When** this story is implemented
**Then** a migration under `supabase/migrations/` creates a `feedback` table with columns: `id` (uuid, pk, default `gen_random_uuid()`), `user_id` (uuid, fk to `users`, not null), `screen_route` (text, not null), `category` (text, constrained via check to `bug` | `confusing` | `suggestion` | `praise`), `message` (text, not null), `screenshot_path` (text, nullable), `app_version` (text, not null), `created_at` (timestamptz, not null, default `now()`)

**Given** the `feedback` table
**When** RLS policies are written
**Then** authenticated users can `INSERT` a row only where `user_id = auth.uid()`; no `SELECT`, `UPDATE`, or `DELETE` policy is granted to the `authenticated` role — feedback is write-only from the client, matching the audit-log pattern established in migration `0027_fear_ladder_items_delete_audit.sql`

**Given** the optional screenshot attachment
**When** this story is implemented
**Then** a private Supabase Storage bucket `feedback-screenshots` is created with a storage RLS policy scoping uploads to objects whose path is prefixed with the uploading user's `auth.uid()`; no public read access is granted; no `SELECT` policy is granted to the `authenticated` role beyond the uploader's own prefix

**Given** `database.types.ts` is regenerated after the migration
**When** `packages/supabase` is updated
**Then** the `feedback` table and its generated types are available to `packages/supabase` consumers per ARC-011 boundary rules; `database.types.ts` continues to be imported only from within `packages/supabase`, unchanged by this story

---

### Story 11.2: In-App Feedback Capture — Entry Point, Screen Auto-Capture & Submission

As a beta tester,
I want a persistent feedback button available on every screen — including mid-exposure-session — that opens a lightweight form pre-tagged with the screen I'm on,
So that I can report an issue or impression in the moment without losing my place or routing through an external form (FR-BETA-01).

**Acceptance Criteria:**

**Given** the app is built with `EXPO_PUBLIC_ENABLE_BETA_FEEDBACK=true`
**When** any screen renders, including `app/session/active.tsx` and the other session-flow screens
**Then** a persistent `FeedbackFab` is mounted in `app/_layout.tsx` before `<Stack>`, following the same ordering pattern as `CalmMeFab`, so it is not suppressed on any route and remains visible and tappable throughout an active ERP session — the feedback entry point is deliberately NOT hidden during sessions, unlike the Calm Me suppression logic considered during planning

**Given** the flag is unset or `false`
**When** the app builds for production/GA
**Then** `FeedbackFab` does not render and no feedback-related code path is reachable from the UI — this is a beta-only feature with no production surface area

**Given** the tester taps the feedback button
**When** the feedback modal opens, reusing the existing RN `Modal` pattern from `DeleteAccountModal.tsx` rather than introducing a new bottom-sheet dependency
**Then** the current route is auto-captured via `usePathname()` and displayed read-only in the form; category chips (Bug / Confusing / Suggestion / Praise) and a free-text message field are shown; the submit action is disabled until a category is selected and the message is non-empty

**Given** the free-text message field
**When** the tester types their feedback
**Then** the existing crisis keyword pre-filter (`detectCrisisKeywords` in `packages/core/src/crisis/keywordDetector.ts`) runs on the text before submission, consistent with FR-CRISIS-01's requirement that the pre-filter cover all user-entered text fields; a detected keyword surfaces the standard crisis resources display without blocking the tester from also submitting their feedback

**Given** the optional screenshot toggle is enabled
**When** the tester attaches a screenshot
**Then** the current screen is captured via `react-native-view-shot`, uploaded to the `feedback-screenshots` bucket under a path prefixed with the tester's `auth.uid()`, and the returned storage path is included in the feedback row's `screenshot_path`

**Given** a completed form
**When** the tester submits
**Then** a row is inserted into the `feedback` table via the `packages/supabase` client with `screen_route`, `category`, `message`, `app_version` (read from Expo config, not hardcoded), and `screenshot_path` (if attached); a confirmation toast/alert dismisses the modal; no navigation occurs and the tester's prior screen state is preserved

---

## Epic 12: UI/UX Enhancements & Polish

*(Created 2026-07-30, originally numbered Epic 13; renumbered to 12 the same day when swapped with the ADR-OFFLINE-DEGRADATION reservation — see Epic 13's Epic List entry for the swap rationale.)*

A living backlog of screen-level UI/UX improvements driven by real usage feedback (Epic 11) and ad hoc product/design review, rather than a fixed, fully-scoped set of stories decided upfront. Seeded with four placeholder stories at creation (2026-07-30); more are appended to this epic as specific issues are identified — this epic's story list is expected to keep growing.

> **Placeholder convention for this epic:** Each story below marks a screen in scope, not a ready-for-dev spec. Acceptance criteria are written when a concrete issue (a beta feedback submission, a design review note, a specific usability complaint) is identified for that screen, at which point the story is updated in place — a fifth, sixth, etc. story is added only when the new issue targets a screen not already covered by 12.1–12.4.

### Story 12.1: Sign-In/Sign-Up Screen — UI/UX Enhancements

**Status: done.** Source: Claude Design project "Exposure Buddy" (`Sign In Options.dc.html`, plus a dedicated `design_handoff_sign_in/` folder with a high-fidelity `1c-sign-in.html` reference and a written `README.md` handoff spec), imported via the `claude_design` MCP. Screen in scope: `apps/mobile/app/(auth)/sign-in.tsx` (combined sign-in/sign-up screen). `otp-verification.tsx` was out of scope — the handoff only redesigns the identifier/password entry screen, not the OTP code-entry step.

**Given** the handoff README states this is "a visual/layout simplification only" and lists every existing reducer field, action, and validation function `sign-in.tsx` must keep unchanged
**When** this story is implemented
**Then** the `State`/`Action`/`reducer`, `validateIdentifier`/`validatePassword`, all error-classification functions, the `isAuthenticated` redirect effect, the DPDPA consent-write retry logic, and the `__DEV__`/preview test-user shortcut are all byte-for-byte unchanged — only the JSX render tree and `StyleSheet` are touched

**Given** the current screen renders three stacked tab rows (mode: create-account/sign-in; identifier type: email/phone; auth method: password/OTP) styled in the pre-redesign near-black/gray palette
**When** this story is implemented
**Then** the three tab rows are consolidated per the handoff spec into: one pill switch for identifier type only (`#EBF0EE` track, active pill `color.accent.courage`), and two inline text links replacing the other two tab rows — "use a code instead" / "use a password instead" (toggles `authMethod`, shown one at a time depending on current method) and a bottom "New here? **Create an account**" / "Already have an account? **Sign in**" line (toggles `mode`). All three toggles dispatch the exact same actions (`SET_IDENTIFIER_TYPE`, `SET_AUTH_METHOD`, `SET_MODE`) the old tabs did, gated by the same `isAuthMethodOrModeLocked` guard

**Given** the screen title is currently a single `common.appName` line plus a separate subtitle line
**When** this story is implemented
**Then** the title becomes mode-variant — `auth.welcomeSignup` ("Welcome to\n{{appName}}", 30px/36px/700) for signup mode, `auth.welcomeSignin` ("Welcome back") for signin mode — and the separate subtitle line is removed entirely, matching the handoff mock exactly. Personalizing further (e.g. a returning user's name) is out of scope — not shown in the handoff mock

**Given** the identifier field currently uses a bordered box and a translated-label placeholder ("Email address"/"Phone number")
**When** this story is implemented
**Then** it becomes an underlined field (`border-bottom: 1.5px solid color.content.primary`) with example-format placeholders (`auth.identifierType.emailPlaceholder` "you@email.com", `auth.identifierType.phonePlaceholder` "+91 98765 43210") — the field's `accessibilityLabel` keeps using the existing `auth.otp.emailLabel`/`phoneLabel` keys unchanged, so screen readers still announce "Email address"/"Phone number", not the terse placeholder text

**Given** the password field currently uses the same bordered-box style with `auth.password.label` as its placeholder (screen readers would read the masked value's placeholder, not a stable label)
**When** this story is implemented
**Then** an uppercase `auth.password.label` caption renders above the field (styled via `textTransform: 'uppercase'`, copy unchanged — same pattern as Story 12.2's home-screen labels) and the `TextInput` itself has no placeholder; the inline auth-method link sits in the same row, right-aligned

**Given** the primary submit button currently reads only the branch-specific label (`auth.otp.sendCode` / `auth.password.submitSignUp` / `auth.password.submitSignIn`) with no visual affordance beyond color
**When** this story is implemented
**Then** the button is restyled to the handoff's green pill (`color.accent.courage`, `16px` radius) with a trailing "→" glyph (`eslint-disable-next-line i18next/no-literal-string` — decorative, language-agnostic, not translatable copy) — **the branch-specific label logic is unchanged**; the handoff README's "Continue" mockup label was illustrative, not a mandate to collapse three distinct translation keys into one generic label (explicit per the README: "keep translation keys")

**Given** the screen currently centers all content vertically as one block (`justifyContent: 'center'`)
**When** this story is implemented
**Then** the layout becomes top-anchored — content flows from the top, and a `flex: 1` spacer between the last input/error block and the submit button pushes the button + footer links to the bottom of the screen, matching the handoff's `padding: 44px 28px 28px 28px` layout; this follows the existing `flexGrow: 1` ScrollView content-container pattern already used elsewhere in this codebase (`session/briefing.tsx`)

**Given** the redesign's palette includes two values with no equivalent in `packages/ui`'s 8 semantic tokens — the screen background `#FDFBF7` (distinct from `color.surface.primary` `#F5F7F6`) and a muted footer-link color `#9AAEA7` (distinct from `color.content.secondary` `#4A6B62`)
**When** this story is implemented
**Then** both are kept as documented raw hex values with an inline comment explaining the gap, following the same precedent Story 12.2 established for `#F1E4CC` — no new semantic token is added unilaterally by an implementation story

**Given** project convention requires every user-facing string to use `t()` and the removed tab rows leave several i18n keys with zero remaining call sites
**When** this story adds `auth.welcomeSignup`, `auth.welcomeSignin`, `auth.identifierType.*` (4 keys), `auth.modeSwitch.*` (2 keys), and `auth.authMethod.useCodeInstead`/`usePasswordInstead`/`switchToOtp`/`switchToOtpHint`/`switchToPassword`/`switchToPasswordHint`
**Then** all are added to both `en.json` and `hi.json` (English copy duplicated in `hi.json` per the established convention); `auth.authMethod.password`/`otp`/`passwordAccessibilityLabel` and `auth.password.screenSubtitle` are deleted from `en.json` (their only call sites) — `hi.json` never had an `auth.mode`/`auth.otp`/`auth.password`/`auth.authMethod` section to begin with (a pre-existing gap, not touched by this story)

**Given** `apps/mobile/app/(auth)/sign-in.test.tsx`'s existing 9 tests drive the screen exclusively through `getByLabelText`/`getByText` against the old tab structure, including a now-nonexistent `auth.authMethod.passwordAccessibilityLabel` key pressed as a no-op reset at the start of 8 of the 9 tests (redundant even before this story — `INITIAL_STATE.authMethod` is already `'password'`)
**When** this story is implemented
**Then** those 8 now-redundant press calls are removed (not replaced — the initial render already satisfies the state they were resetting to) and the one test that exercises all four mode×authMethod combinations is rewritten to drive the two new inline links (`auth.authMethod.switchToOtp`/`switchToPassword`) and the mode-switch button (whose `accessibilityLabel` is the target mode's label — `auth.mode.signIn` when currently signup, `auth.mode.createAccount` when currently signin, so the same label strings the old always-visible tabs used still resolve correctly against the new single toggle). No functional test coverage is lost — every existing assertion (validation, consent-write ordering, error classification, pendingDeletion guard) is preserved verbatim

### Story 12.2: Home Screen — UI/UX Enhancements

**Status: done.** Source: Claude Design project "Exposure Buddy" (`Home - Redesign.dc.html`, compared against `Home - Current.dc.html` recreating the as-shipped screen), imported via the `claude_design` MCP. Screen in scope: `apps/mobile/app/(app)/index.tsx` (home screen state machine — 'morning', 'empty-ladder', 'completed', 'progressing' — see Epic 5/6/8 for how these states are populated).

**Given** the redesign mockup and the as-shipped screen were compared directly
**When** the palette is mapped
**Then** every colour in the redesign (`#F5F7F6`, `#EBF0EE`, `#1A2E2A`, `#4A6B62`, `#2D6A5A`, `#E8A84C` decorative-only, `#FDF7ED`) maps exactly onto the 8 semantic tokens already defined in `packages/ui/src/tokens/theme.ts` (Story 1.4) — the Home screen was simply never migrated onto those tokens. No new tokens are introduced; the one exception is the completed-state card's border colour (`#F1E4CC`, a warm companion to `color.reflect.background` with no existing token), kept as a documented raw hex — the same pattern this story's own `CalmMeButton.tsx` change now demonstrates in reverse (its shadow colour is migrated from raw hex onto a token, since a token was available for it, unlike `#F1E4CC`)

**Given** the container background is `#ffffff` with 24px horizontal padding today
**When** this story is implemented
**Then** `styles.container` uses `color.surface.primary` and `spacing[5]` (20px) horizontal padding, matching the redesign

**Given** the greeting is a single line today (`home.welcomeBack` / `home.readyToStart`)
**When** this story is implemented
**Then** a second line renders below it using two new keys, `home.subGreetingWelcomeBack` ("Ready for your next step?") and `home.subGreetingReadyToStart` ("One small step is all it takes to start."), selected by the same `seenOnMount.current` check already driving the greeting. Personalising the greeting with the user's name (shown as "Priya" in the mockup) is explicitly deferred — `profiles.display_name` has no existing read hook, and wiring one up is a data-layer addition out of scope for a visual-polish story, not a rejected idea

**Given** the redesign shows a ladder-completion progress bar ("Your ladder" / "N of M steps climbed" / a filled track) that does not exist today
**When** this story is implemented
**Then** a new component `LadderProgressBar` (`packages/ui/src/components/LadderProgressBar.tsx`, exported from `packages/ui/src/index.ts`) renders this row, taking pre-translated `label`/`progressLabel` strings plus `completed`/`total` numbers (packages/ui has no `react-i18next` dependency, per the existing `HelplineCard` precedent); `apps/mobile/app/(app)/index.tsx` computes `completed`/`total` from the already-fetched `items` array (`items.filter(i => i.status === 'completed').length` / `items.length`) — no new query. The bar renders whenever `homeState !== 'empty-ladder'` (a 0-item ladder has nothing to show progress on); it is absent only in the empty-ladder state

**Given** `CourageLadderEntryCard` (`packages/ui/src/components/CourageLadderEntryCard.tsx`) renders the 'morning' state today as a plain bordered card with description + "Anxiety: N/10" text and no button
**When** this story is implemented
**Then** the card is restyled to the redesign's "Your next step" treatment: an uppercase section label, the pending item's description at `typography.h2`, a pill-shaped SUDS badge (a decorative dot in `color.accent.progress` + "Anxiety N/10" text), and an explicit "Start this step" CTA button — all inside the same single pressable card (tapping anywhere still navigates to `/ladder`; the CTA is a visual affordance, not a second independently-focusable pressable, to avoid complicating the existing `cardRef` accessibility-focus contract from Story 6.2-B). The `ladderItemCount` prop is removed (it only drove the never-reached-in-production `lowestPendingItem === null` fallback branch's text choice, which the caller now resolves directly); `nextStepLabel`, `ctaLabel`, `sudsPrefix`, `sudsSuffix`, and `fallbackLabel` (all pre-translated) are added. **The SUDS clamp (`Math.min(10, Math.max(0, Math.round(predictedSuds)))`) stays inside the component**, computed from `sudsPrefix`/`sudsSuffix` split around the clamped number rather than a single pre-formatted string — preserving Story 6.2-B AC5's defense-in-depth-at-the-render-boundary guarantee and its existing clamp test coverage in `apps/mobile/src/components/CourageLadderEntryCard.test.tsx`, rather than relocating the safety check to the caller where it would lose direct test coverage

**Given** the empty-ladder, completed, and progressing states render generic bordered-card placeholder text today (`ladder.emptyState`, `home.state10.message`/`state10.addMore`, `home.state4.context`/`state4.cta`)
**When** this story is implemented
**Then** each state gets the redesign's warmer, purpose-built treatment, replacing the old i18n keys with new ones (old keys removed, not kept as dead aliases):
- **Empty** (`home.emptyState.*`): centred card, `color.surface.secondary` background, headline "Every climb starts with one step", subtext "Add a situation that makes you anxious — we'll help you work up to it.", CTA "Add your first situation" → `/ladder`. The `accessibilityLiveRegion="polite"` behaviour on the headline text (Story 9.3 audit fix) is preserved
- **Completed** (`home.completedState.*`): warm card, `color.reflect.background` + `#F1E4CC` border, headline "You've reached the top of your ladder", subtext "Every situation you set out to face — faced. That's real progress.", CTA "Add another challenge" → `/ladder`
- **Progressing** (`home.progressingState.*`): `color.accent.courage` filled card, uppercase "Session in progress" label with a decorative dot, the in-progress item's description in white, CTA "Continue where you left off" — the CTA/card press still routes through the existing `progressingTarget` logic (grounding-aware recovery routing, Story 9.2) unchanged

**Given** the global Calm Me FAB (`CalmMeButton`, `packages/ui/src/components/CalmMeButton.tsx`, mounted app-wide via `CalmMeFab.tsx`) appears in the redesign mockup as a pill with "INSTA CALM" text beside the icon, not the current plain 56×56 circular icon button
**When** this story is implemented
**Then** `CalmMeButton` is restyled to a 48px-tall pill (`radius.card`, white background, 2px `color.accent.courage` border) with a new required `label` prop (pre-translated, a literal `"\n"` renders the stacked "INSTA\nCALM" two-line text) rendered beside the existing `IconCalmMe.png` icon; `accessibilityLabel`/`accessibilityHint` are unchanged. **This is a deliberate cross-cutting change** — `CalmMeButton` renders on every screen, not just Home, since the mockup redesigns the button as it appears on the Home screen; `apps/mobile/src/components/CalmMeFab.tsx` passes the new `label` prop via a new `calmMe.fabLabel` key. No other screen's layout assumes the old 56×56 circular footprint, so this does not block Stories 12.1/12.3/12.4

**Given** project convention requires every user-facing string to use `t()` (CI lint enforced) and Hindi entries duplicate English copy pending Story 9.9 localisation (Story 6.2-B AC6 precedent)
**When** this story adds/renames the `home.subGreeting*`, `home.yourLadderLabel`, `home.progressLabel`, `home.nextStepLabel`, `home.nextStep.*`, `home.emptyState.*`, `home.completedState.*`, `home.progressingState.*`, and `calmMe.fabLabel` keys
**Then** all are added to both `apps/mobile/src/i18n/locales/en.json` and `hi.json`; the removed keys (`home.state4.*`, `home.state10.*`) are deleted from both files, not left as orphans; no raw string literals appear in any changed component

**Given** `apps/mobile/app/(app)/index.test.tsx` and the dedicated `packages/ui` component tests hosted in `apps/mobile/src/components/` (`CalmMeButton.test.tsx`, `CourageLadderEntryCard.test.tsx` — per that directory's own comment, apps/mobile is "the only package with `@testing-library/react-native` set up") assert on the old copy/props
**When** this story is implemented
**Then** all three files are updated: the `@exposure-buddy/ui` jest mock in `index.test.tsx` is extended to re-export the real `color`/`radius`/`spacing`/`typography` tokens (via `jest.requireActual`) alongside lightweight `CourageLadderEntryCard`/`LadderProgressBar` stubs (index.tsx's own `StyleSheet.create()` dereferences those tokens at module load and would throw on `undefined` otherwise); renamed-key assertions are updated; new tests cover progress-bar visibility per state and the empty state's absence of it; `CalmMeButton.test.tsx` and `CourageLadderEntryCard.test.tsx` pass the new required props (`label`; `nextStepLabel`/`ctaLabel`/`sudsPrefix`/`sudsSuffix`/`fallbackLabel`) and assert the clamped `"Anxiety N/10"` text (no colon, per the redesign copy) renders as a single concatenated `Text` node. `pnpm turbo typecheck lint test` passes clean across all affected packages (`@exposure-buddy/ui`, `exposure-buddy-mobile`)

---

**Amendment (2026-07-31):** the Claude Design mockup was re-fetched and had grown since the ACs above were implemented — it now includes three new in-mockup sub-views (a pre-session SUDS check, a relaxation-technique list, a simplified ladder list), each navigable from two new Home-screen elements. Rather than build three new duplicate screens, the amendment below translates the mockup's navigation *intent* onto the app's real existing screens, per explicit product direction — this is a deliberate, confirmed deviation from the mockup's literal inline-view structure, not an oversight.

**Given** the mockup adds two always-visible buttons below the state-specific card — "Your Ladder" and "Practice Relaxation" — each opening a new inline sub-view in the mockup's own local state
**When** this amendment is implemented
**Then** the two buttons are added to `apps/mobile/app/(app)/index.tsx` as a `styles.actionRow` (flex row, `spacing[3]` gap, `spacing[6]` margin-top) below the state-specific card, rendered unconditionally in every home state (matching the mockup's placement, outside every `sc-if` block); "Your Ladder" navigates to the existing `/ladder` screen. **"Practice Relaxation" was refined a second time within this same amendment** (explicit follow-up direction, same day) to open the existing session flow's technique-picker (`/session/technique`) for the lowest pending item, rather than the Calm Me hub (`/calm-me`) — letting the user browse/select a technique without committing past that screen. No new screens are built either way. New keys `home.actions.yourLadder`/`practiceRelaxation` added to both locale files

**Given** the mockup changes the "Start this step" CTA from navigating nowhere on its own (the whole `CourageLadderEntryCard` was one pressable going to `/ladder`) to an explicit `onClick` that opens the new inline pre-session SUDS-check view
**When** this amendment is implemented
**Then** `CourageLadderEntryCard`'s `onPress` (still the whole card — no internal restructuring into separately-tappable zones) is changed to jump directly into the existing session flow, skipping the ladder-screen detour. **Refined a second time within this same amendment**: rather than landing on the technique-picker (`/session/technique`), "Start this step" skips technique selection entirely and jumps straight to the pre-exposure intention/SUDS-check screen, `/session/intent` — `intent.tsx`'s `technique` param is optional and defaults to `null` when omitted, so this is safe. Both this and "Practice Relaxation" share a `buildSessionRoute(path)` helper taking the target path, using the same query-param contract `apps/mobile/app/ladder.tsx`'s own "Start session" button already uses (`fearItemId`, a freshly generated `sessionId` per tap, `description`, `predictedSuds`) via a local `generateUUID()` helper (same pure-JS v4 pattern already duplicated in `ladder.tsx` and `session/intent.tsx`). When `resolveLowestPendingItem` returns `null` (the defensive, not-actively-reached fallback branch — see the original AC above), both handlers fall back to `/ladder` instead, since there is no item to start a session for

**Given** every existing test in `index.test.tsx` mocks `resolveLowestPendingItem` to always return `null`, meaning the new real-item routing branches had zero test coverage before this amendment
**When** this amendment is implemented
**Then** `resolveLowestPendingItem`'s mock is made per-test-overridable (matching the existing pattern for `resolveHomeScreenState`); new tests cover both branches of the "Start this step" handler (fallback to `/ladder`, and the real-item path to `/session/intent` asserted via a regex match against the generated UUID) and both branches of "Practice Relaxation" (fallback to `/ladder`, real-item path to `/session/technique`), plus rendering across all four home states for both action buttons. `pnpm turbo typecheck lint test` passes clean (19/19 tasks, 400/400 mobile Jest tests)

### Story 12.3: Ladder Screen — UI/UX Enhancements ~~[PARTIAL — visual redesign implemented 2026-08-04, 3 logic-bug ACs still open]~~

> **Status: PARTIAL.** Screen in scope: `apps/mobile/app/ladder.tsx` (post-onboarding full courage ladder screen; the onboarding-time ladder at `apps/mobile/app/(onboarding)/ladder.tsx` is a distinct screen and out of scope here unless feedback specifically names it).
>
> **Visual/component redesign implemented 2026-08-04** — sourced from the "Exposure Buddy" Claude Design project's `Home - Redesign.dc.html`, specifically its `showLadder` inline sub-view (the same file Story 12.2 pulled the Home screen from; no separate "Ladder" mockup file exists in that project). Changes: native iOS header replaced with a custom inline header (chevron + title, matching the mockup and the no-native-chrome precedent set by Stories 12.1/12.2); row cards restyled to white/bordered per the mockup with the drag handle moved to the left; a new Done/To-do status pill replaces the old inline status text; SUDS meta line reuses the `sudsPrefix`/`sudsSuffix` i18n pattern already established by `home.nextStep` (Story 12.2); screen title copy changed from "Your Courage Ladder" to "Your Ladder" to match the mockup and existing `home.actions.yourLadder` wording; edit-modal sheet restyled (white background, lighter input borders, token-based radii). Three raw-hex colours (`#E3EAE7`, `#9AAEA7`, `#B8863A`) have no equivalent in `packages/ui`'s 8 semantic tokens and are used with the same documented-deviation convention Story 12.1 established for `#9AAEA7` in `sign-in.tsx`. The mockup's own Edit-situation sub-view shows read-only display fields and no Start-session affordance; the real screen keeps its editable `TextInput`s, Cancel/Save/Remove actions, and the Start-session button (relocated into the edit modal in a prior pass this same day) unchanged — only visual language was brought in line with the mockup, not interaction structure. `pnpm turbo typecheck lint test` green (401/401 mobile Jest tests, no regressions).
>
> **Still open** — the three ACs below (drafted earlier the same day from `deferred-work.md` Story 5.1 / Story 6.2-A findings) are logic/robustness fixes, not visual changes, and were deliberately left untouched by the redesign pass above so the visual diff stayed reviewable on its own. They do not require a Claude Design mockup and are ready for scoping into a dev-story.

**Given** `handleSubmit`'s add and edit paths optimistically update local `items` state via `setItems` before awaiting `getAdapter().enqueue(...)`, and the `catch` block only `console.error`s on failure with no rollback or user-facing feedback (`apps/mobile/app/ladder.tsx:78-127`)
**When** this story is implemented
**Then** the prior `items` array is snapshotted before each optimistic update and restored in the `catch` block if `enqueue` throws, for both the add and edit paths; the user sees an error message (reusing the existing `saveFailed`/`tryAgain` retry pattern already established in `session/debrief.tsx`) instead of a silently orphaned "ghost" item that only gets corrected by the next PowerSync sync

**Given** `openEditForm` sets `predictedSuds` directly from `item.predictedSuds` (`apps/mobile/app/ladder.tsx:64-69`) with no range/integer clamp — unlike the form's own SUDS `TextInput.onChangeText` handler, which already parses and clamps typed input to an integer 0–10
**When** this story is implemented
**Then** `openEditForm` clamps `item.predictedSuds` to an integer in `[0, 10]` before setting form state, so a non-integer or out-of-range value arriving via a future sync conflict cannot round-trip through the edit form unmodified

**Given** the accessibility-focus-on-mount effect (`apps/mobile/app/ladder.tsx:38-47`) fires `AccessibilityInfo.setAccessibilityFocus` after a fixed 100ms `setTimeout`, which reliably targets the empty-state add button but races `DraggableFlatList`'s virtualized layout when real items exist, so focus can silently fail to land on the first item
**When** this story is implemented
**Then** the focus trigger is replaced with a layout-driven signal (e.g. `onLayout` on the first row, or a retry-until-ref-exists check) instead of a fixed timer, and the fix is verified on-device with VoiceOver (iOS) and TalkBack (Android) — not just by static inspection — since timing-based accessibility bugs frequently appear fixed in code but still fail in the real screen-reader runtime

### Story 12.4: Exposure Flow — UI/UX Enhancements ~~[PLACEHOLDER — scope TBD]~~

> **Status: PLACEHOLDER — not ready for dev-story pickup.** Screens in scope: `apps/mobile/app/session/` — `intent.tsx`, `briefing.tsx`, `technique.tsx`, `active.tsx`, `pause.tsx`, `grounding.tsx`, `debrief.tsx`, `abandoned.tsx` (the full ERP session flow). Acceptance criteria to be written once specific feedback or design review input is available, scoped to the specific screen(s) named by that feedback (FR-UXENH-01).

### Story 12.5: Global Color Theme Unification (Palette-Only)

**Status: done.** Unlike 12.1–12.4, this story did not start as a screen-scoped placeholder waiting on a Claude Design mockup — it was requested directly as a cross-cutting consistency pass: bring every remaining screen's colours onto the `packages/ui` semantic token palette already established by Stories 12.1 (Sign-In) and 12.2 (Home), without waiting for each screen's own dedicated redesign.

**Given** Stories 12.3 (Ladder) and 12.4 (Exposure Flow) are still open placeholders reserving `apps/mobile/app/ladder.tsx` and `apps/mobile/app/session/*.tsx` for their own future full UX redesigns (layout, copy, and component changes, sourced from a dedicated Claude Design mockup, matching the depth of Stories 12.1/12.2)
**When** this story's scope is defined
**Then** this story is explicitly **palette-only** — it changes colour values alone (raw hex → `packages/ui` tokens) with zero changes to layout, copy, component structure, or interaction logic on any screen, including the ones 12.3/12.4 will later touch more deeply. This story does not close or supersede 12.3/12.4; a future full redesign of Ladder or the session flow is still expected and may re-touch the same files this story changes

**Given** a repo-wide survey found 21 screen files still using the pre-redesign palette (`#111827`, `#374151`, `#6b7280`, `#d1d5db`, `#f9fafb`/`#f3f4f6`, `#e5e7eb`, `#ffffff` backgrounds, and one leftover accent blue `#1d4ed8`), totaling roughly 175 individual colour declarations
**When** this story is implemented
**Then** every one of the following files is migrated per the mapping table below: `apps/mobile/app/ladder.tsx`, `apps/mobile/app/(onboarding)/{assessment,complete,ladder,welcome}.tsx`, `apps/mobile/app/(auth)/otp-verification.tsx`, `apps/mobile/app/(app)/settings/index.tsx`, `apps/mobile/app/privacy-notice.tsx`, `apps/mobile/app/reminder-settings.tsx`, `apps/mobile/app/calm-me/{index,breathing,grounding,helplines}.tsx`, `apps/mobile/app/session/{intent,briefing,technique,active,pause,grounding,debrief,abandoned}.tsx`

**Given** `packages/ui/src/tokens/theme.ts`'s 8 semantic colour tokens and the precedent already set by Stories 12.1/12.2 for what stays raw hex
**When** each file's colours are migrated
**Then** the following mapping is applied uniformly (deviations only where a specific site's visual role genuinely doesn't fit — documented inline if so):
- `#ffffff` screen/container background → `color.surface.primary`; `#ffffff` used as text-on-a-dark-background (e.g. button labels on an accent-filled pill) is left unchanged — it's already correct
- `#111827` (primary text, headings) → `color.content.primary`
- `#374151` (body/label text) and `#6b7280` (secondary/meta text) → both collapse onto `color.content.secondary` — the old 3-tier grey system had no equivalent to the token system's 2 content tiers; Stories 12.1/12.2 already made this same collapse
- `#f9fafb` / `#f3f4f6` (card fills) and `#e5e7eb` (borders) → `color.surface.secondary`; bordered cards are converted to borderless filled cards where that matches the Home/Sign-in visual language already shipped, rather than keeping a border in a new colour
- `#d1d5db` (input/divider borders) → `color.content.primary` for text-input underlines (matching the Story 12.1 pattern), `color.surface.secondary` elsewhere
- `#1d4ed8` (leftover pre-redesign accent blue, `apps/mobile/app/ladder.tsx`'s "Start session" button) → `color.accent.courage` — the same brand green used for every other primary action across the redesigned screens
- `#9ca3af` (disabled-state grey) and `#ef4444` (validation error red) are **left unchanged** — both are established, deliberate exceptions from Story 12.1 (see its AC and Dev Notes), not part of the 8-token palette
- Crisis-banner and destructive/success semantic colours (`#991b1b`, `#fef2f2`, `#fecaca`, `#b91c1c`, `#166534`, `#f0fdfa`, `#f0fdf4`, `#dc2626`, `#bbf7d0`, `#0f766e`, `#0d9488`) are **out of scope and left unchanged** — these are safety/status-semantic colours (crisis keyword banner, destructive delete action, completed/success states), not general UI palette, and this story does not touch semantic-meaning colours, only the general UI palette

**Given** every screen listed above has existing test coverage and none of their underlying logic changes
**When** this story is implemented
**Then** no test file needs functional changes — colour values are not asserted by any existing test (confirmed by grep: no test in this diff's scope asserts on a `StyleSheet` colour value or inline style). `pnpm turbo typecheck lint test` passes with zero test changes required, proving the change is colour-only as scoped

---

## Epic 15: Auth Safety Hardening for Hosted-Backend Builds

*(Added 2026-09-22. See Epic List entry above for the discovery context — the dev/test sign-in shortcut's visibility condition has no awareness of which Supabase backend is configured, and both the EAS `preview` profile and local `.env.local` now point at the hosted project. Discovered via parallel beta-distribution work tracked separately as Epic 14, on its own not-yet-merged branch.)*

**FR-DEVAUTH-01:** The dev/test one-tap sign-in shortcut on the sign-in screen never renders when the app is configured against a non-local (hosted) Supabase backend, regardless of `__DEV__` or `EXPO_PUBLIC_APP_VARIANT`.

### Story 15.1: Hide Dev Sign-In Shortcut When Pointed at Hosted Supabase

**Status: backlog.** Screen in scope: `apps/mobile/app/(auth)/sign-in.tsx` (the "DEV: Sign in as test user" `TouchableOpacity`, lines ~606-634 as of this story's creation).

**Given** the shortcut button today is gated solely on `(__DEV__ || process.env.EXPO_PUBLIC_APP_VARIANT === 'preview')`, with no check of which Supabase backend is configured, and both the EAS `preview` build profile and, as of 2026-09-22, local `.env.local` now set `EXPO_PUBLIC_SUPABASE_URL` to the hosted project (`https://jhbtzsvlgglyfbrgmpsb.supabase.co`)
**When** this story is implemented
**Then** a new local helper (e.g. `isLocalSupabaseUrl(url: string | undefined): boolean`) is added in `sign-in.tsx`, returning `true` only for known local/loopback hosts — `127.0.0.1` (local dev) and `10.0.2.2` (Android emulator, per the `e2e` build profile's `EXPO_PUBLIC_SUPABASE_URL` in `eas.json`) — and `false` for everything else, including any `*.supabase.co` hostname or an unset/empty URL (fail closed — an unset URL must NOT show the shortcut)

**Given** the button's current render condition is `(__DEV__ || variant === 'preview') ? <Button/> : null`
**When** this story is implemented
**Then** the condition becomes `(__DEV__ || variant === 'preview') && isLocalSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL) ? <Button/> : null` — the existing `__DEV__`/variant gate is preserved (unchanged behavior for genuinely local dev/preview builds against a local Supabase instance), and the new hosted-URL check is an additional, unconditional AND — never bypassable by either of the existing conditions alone

**Given** the shortcut's `onPress` handler signs in with hardcoded credentials (`test1@test.com` / `DevTest123!`) against whatever `createSupabaseClient()` resolves to at call time
**When** this story is implemented
**Then** no code change is made to the `onPress` handler itself, the hardcoded credential string, or the `createSupabaseClient()` call — this story only changes whether the button renders in code, not what it does when pressed; the credential itself is handled operationally (see the next AC), not by editing the source string, since the same string must keep working against a local Supabase instance

**Given** the finding above confirms `test1@test.com` is a real, active hosted account, and hiding the button (the ACs above) only stops the in-app UI path — the credential remains extractable from the shipped JS bundle and usable directly against the hosted Auth REST endpoint with the (also-embedded) anon key
**When** this story is implemented
**Then** the hosted account's password is rotated directly on the hosted Supabase project (via dashboard or the Supabase Management API/MCP — NOT a code change, since the hardcoded client string must stay `DevTest123!` for the local-Supabase case to keep working) to a value that is not `DevTest123!` and is not committed anywhere in the repo. This is the step that actually closes the bundle-extraction path, independent of and faster than the code fix above — it should be done as soon as this story is picked up, not gated on the code PR merging. Removing the shortcut or the account entirely remains out of scope (see Epic 15's scope note) — rotation, not removal, is the chosen fix, since the account has zero associated personal/health data today and the shortcut has ongoing local-dev value

**Given** `apps/mobile/app/(auth)/sign-in.test.tsx` has no existing coverage of this button (confirmed: no test currently asserts on `DEV:`, `test1@test.com`, `__DEV__`, or `EXPO_PUBLIC_APP_VARIANT`) — meaning it has always rendered unconditionally in the Jest environment (`__DEV__` defaults to `true` under the RN Jest preset) with zero regression risk visible in CI today
**When** this story is implemented
**Then** new tests are added asserting: (a) the button is absent when `EXPO_PUBLIC_SUPABASE_URL` is mocked as the hosted URL (`https://jhbtzsvlgglyfbrgmpsb.supabase.co` or any other `*.supabase.co` value), regardless of `EXPO_PUBLIC_APP_VARIANT`; (b) the button is present when `EXPO_PUBLIC_SUPABASE_URL` is mocked as `http://127.0.0.1:54321` (matching today's already-passing implicit behavior, so this is a regression guard, not new functionality); (c) the button is absent when `EXPO_PUBLIC_SUPABASE_URL` is unset/undefined (fail-closed case). `pnpm turbo typecheck lint test` passes clean

**Given** this fix closes a live exposure — right now, any local `expo start` dev build reads `.env.local`'s hosted `EXPO_PUBLIC_SUPABASE_URL` and would show this shortcut, and the already-distributed 2026-09-22 `preview` APK build (`bbd44f6d-afe2-4c41-8ef6-44cfb4963746`) has it live against the hosted project
**When** this story is picked up
**Then** the dev-story agent should flag in its completion notes that a NEW preview build should be cut and redistributed to already-invited testers once this story ships, since the existing distributed APK remains exposed until replaced — this is a deployment/communication follow-up, not a code AC, but must not be silently dropped
