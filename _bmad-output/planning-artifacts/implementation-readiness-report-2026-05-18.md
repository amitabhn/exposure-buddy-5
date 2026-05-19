---
stepsCompleted: ["step-01-document-discovery", "step-02-prd-analysis", "step-03-epic-coverage-validation", "step-04-ux-alignment", "step-05-epic-quality-review", "step-06-final-assessment"]
documentsSelected:
  prd: "_bmad-output/planning-artifacts/prd.md"
  architecture: "_bmad-output/planning-artifacts/architecture/"
  epics: "_bmad-output/planning-artifacts/epics.md"
  ux: "_bmad-output/planning-artifacts/ux-design-specification/"
---

# Implementation Readiness Assessment Report

**Date:** 2026-05-18
**Project:** exposure-buddy

---

## PRD Analysis

### Functional Requirements

FR-AUTH-01: Users authenticate using email address or phone number; both paths use OTP verification
FR-AUTH-02: Logged-out users access all 3 preview challenges without authentication; progress from preview challenges is not persisted unless the user creates an account
FR-SAFE-01: Account creation presents two mandatory checkboxes (18+ confirmation; medico-legal disclaimer); account creation action is disabled until both boxes are checked
FR-ONBOARD-01: Users complete 3-item mini-SPIN questionnaire; 3-tier response — score 0–3 no message; score 4–5 inline soft advisory; score ≥6 full referral screen with iCall/Vandrevala/NIMHANS contacts + explicit acknowledgement tap required; full app access granted at any score
FR-ONBOARD-02: Users complete a 3–4 question conversational symptom check followed by a 15-item safety behaviour checklist; responses stored and used for initial hierarchy template personalisation
FR-ONBOARD-03: Psychoeducation on anxiety cycle presented inline immediately before first exposure; avoidance explainer presented at moment a safety behaviour item is selected
FR-HIER-01: Users build a personalised exposure hierarchy by selecting from neutral templates; each item receives a SUDS rating (0–10) assigned by the user
FR-HIER-02: Users add custom hierarchy items beyond the template library; custom items receive the same SUDS rating and stall tracking as template items
FR-HIER-03: After 2 consecutive ERP sessions on the same hierarchy item with no measurable SUDS reduction, system surfaces a stall prompt recommending the user step down
FR-ERP-01: Each ERP session executes three sequential phases: pre-session briefing → active exposure with SUDS logging → structured debrief; users cannot skip or reorder phases
FR-ERP-02: During active exposure phase, users log SUDS ratings (0–10) at self-initiated intervals; each log entry records timestamp and SUDS value
FR-ERP-03: Debrief screen renders a SUDS arc graph (entry score, mid-session entries, exit score); prompts structured reflection on what happened and what was learned
FR-ERP-04: Aborted sessions logged without negative framing (no failed-session count, no streak-reset language); all SUDS entries recorded before abort are retained in progress history
FR-CBT-01: Thought record captures 6 fields in sequence: situation, automatic thought, emotion + intensity (0–10), evidence supporting thought, evidence against thought, balanced thought
FR-CBT-02: Cognitive distortion library presents named patterns with definitions; users tag automatic thoughts with one or more distortion types during thought record completion
FR-CBT-03: Behavioural experiment tool captures 5 fields: hypothesis, planned experiment, predicted outcome, actual outcome, revised belief rating (0–100%)
FR-SOM-01: Users access six somatic techniques: 4-7-8 breathing, box breathing, Bhramari, Nadi Shodhana, 5-4-3-2-1 grounding, body scan
FR-SOM-02: Each somatic technique presents an animated visual guide pacing the user through the exercise; completion requires no audio output
FR-CHECKIN-01: Daily check-in captures one SUDS-scale rating (0–10); score ≥7 routes to somatic techniques; score 4–6 routes to grounding; score 1–3 routes to cognitive work or exposure
FR-PROG-01: Users view a SUDS trend graph aggregating data from all completed ERP sessions; viewable in weekly and monthly time windows
FR-PROG-02: Users view a chronological exposure history log displaying each completed and partially-completed session, the SUDS arc, and debrief outcome
FR-NOTIF-01: After 2 consecutive days of inactivity, one re-engagement notification sent; second notification on Day 5 if still inactive; no further automated notifications in that window
FR-NOTIF-02: Notification content contains no streak counters, missed-day counts, streak-reset warnings, or loss-framing constructs
FR-NOTIF-03: Users control notification delivery timing and can opt out of individual notification types from app settings; opt-out honoured immediately
FR-CRISIS-01: Hardcoded keyword pre-filter runs on user-entered text; detection triggers display of Tier 1/2 crisis resources (iCall, Vandrevala Foundation, NIMHANS) as hardcoded strings available offline
FR-CRISIS-02: Crisis keyword list covers English and Hindi; embedded in client; updated via app release not remote configuration
FR-CRISIS-03: SOS panic button rendered persistently on all screens during active ERP session; activating launches breathing coach + 5-4-3-2-1 grounding overlay without terminating or navigating away from session
FR-I18N-01: All user-facing strings externalised to localisation layer; no UI string hardcoded in code; English only at MVP launch
FR-I18N-02: Layout system renders correctly in RTL mode; RTL implemented at MVP
FR-ANALYTICS-01: First-party analytics capture two Day 1 metrics: (1) core loop retention — % of Day 1 users completing ≥1 ERP session within 24 hours; (2) SUDS cadence — % of active ERP sessions with ≥2 SUDS log entries
FR-ANALYTICS-02: No user health data, session content, SUDS records, or PII transmitted to any third-party analytics, advertising, or data-broker service

**Total FRs: 31**

---

### Non-Functional Requirements

NFR-PERF-01: App loads to home screen in under 3 seconds at P90 on target device profile (mid-range Android, 2GB RAM, Android 10+, 4G); measured by synthetic device testing in CI before each release
NFR-PERF-02: ERP session SUDS log operations — tap to confirmed local write — complete in under 500ms on target device profile; measured by instrumented performance testing
NFR-PERF-03: Daily check-in submission routes user to recommended technique screen in under 1 second from tap on target device profile
NFR-OFFLINE-01: All three ERP session phases (pre-session briefing, active SUDS logging, debrief) function fully without data loss when device has no network connectivity at any point during session
NFR-OFFLINE-02: Session data logged during offline ERP sessions syncs automatically within 30 seconds of connectivity restoration; no user action required; no log entry lost
NFR-OFFLINE-03: Crisis resource contacts (iCall, Vandrevala Foundation, NIMHANS) stored on-device and display without a network call at all times
NFR-REL-01: Backend API achieves 99.5% uptime during India business hours (06:00–24:00 IST) as measured by uptime monitoring at 1-minute resolution
NFR-REL-02: If app crashes during active ERP session, all SUDS log entries recorded before crash are recoverable on first restart; no in-session data permanently lost
NFR-SEC-01: All user health data encrypted at rest (AES-256) and in transit (TLS 1.3 minimum)
NFR-SEC-02: Row Level Security enforced on all database tables containing user health data; cross-user data access blocked at database layer; no application-layer bypass permitted
NFR-SEC-03: DPDPA 2023 consent records store four fields: UTC timestamp, purpose ID, consent version, withdrawal status; retained for account lifetime plus 2 years; included in data principal access requests
NFR-SEC-04: System activates HIPAA and GDPR compliance enforcement for Phase 2 markets without requiring migration of existing user data
NFR-SEC-05: DPO appointed and contact information published in app's privacy notice before India launch
NFR-SEC-06: Crisis keyword detection runs entirely on-device using hardcoded list; no user-entered text transmitted to any external service for detection
NFR-DEVICE-01: All screens render without layout breakage and all FRs are met on mid-range Android (minimum 2GB RAM, Android 10+)
NFR-DEVICE-02: All screens render without layout breakage and all FRs are met on iOS 16+ and last 2 major versions of Chrome, Firefox, and Safari
NFR-ACCESS-01: All interactive UI elements have accessible labels; minimum tap target 44×44dp; colour contrast meets WCAG 2.1 Level AA (4.5:1 normal text; 3:1 large text and UI components)
NFR-SCALE-01: Backend supports 10,000 concurrent active users at India launch as validated by load testing completed before go-live

**Total NFRs: 17**

---

### Additional Requirements / Constraints

- **DPDPA 2023 domain requirements:** Explicit granular consent per processing purpose; withdrawal equally simple; separate consent for therapist data access at linking moment; consent records retained account lifetime + 2 years; data principal rights (access, correction, erasure) fulfilled within 72 hours; breach notification to Data Protection Board within 72 hours; DPO appointed before India launch
- **CDSCO:** General health intended use; no marketing claim constituting diagnosis or treatment of a named disorder
- **App Store compliance:** Google Play mental health policy requires crisis resources; Apple App Store Rule 5.1.1 satisfied by medico-legal disclaimer + intended-use declaration + crisis resources
- **Architecture constraint:** MVP data model and RLS policies must be HIPAA-compatible and GDPR-compatible by design to avoid schema rebuild at Phase 2 (non-negotiable — noted explicitly in PRD)
- **Sign-up flow constraint:** Notification permission requested only after first full ERP session completed (not at launch or account creation)
- **Push notification fallback:** In-app nudges serve as fallback if OS-level permission denied; no further OS permission prompts after denial
- **Analytics constraint:** First-party only; no health data to any third-party service (privacy moat)
- **i18n constraint:** RTL implemented at MVP even with no RTL locale launching

### PRD Completeness Assessment

The PRD is well-structured and thorough. Requirements are clearly numbered with IDs, making traceability straightforward. Key strengths:
- Clear FR/NFR labelling throughout
- Explicit scope boundary between MVP, Phase 2, and Phase 3
- Domain compliance requirements clearly articulated (DPDPA 2023, HIPAA-forward design)
- Architectural constraints documented inline (HIPAA-compatible by design, offline-first)
- Notable: FR-GATE-01 is explicitly REMOVED with rationale — clean documentation of a design pivot

---

## Epic Coverage Validation

### Coverage Matrix

| FR | PRD Summary | Epic Coverage | Status |
|---|---|---|---|
| FR-AUTH-01 | OTP auth via email or phone | Epic 2, Story 2.1 | ✓ Covered |
| FR-AUTH-02 | 3 preview challenges without auth; local-only | Epic 2, Story 2.3 | ✓ Covered |
| FR-SAFE-01 | Two mandatory checkboxes at account creation | Epic 2, Story 2.2 | ✓ Covered |
| FR-ONBOARD-01 | 3-item mini-SPIN with 3-tier clinical routing | Epic 4, Stories 4.1/4.4 | ✓ Covered |
| FR-ONBOARD-02 | Symptom check (3–4 Q) + 15-item safety behaviour checklist | Epic 4, Stories 4.2/4.3 | ✓ Covered |
| FR-ONBOARD-03 | Inline psychoeducation before first exposure; avoidance explainer at selection | Epic 4, Story 4.3 | ✓ Covered |
| FR-HIER-01 | Hierarchy builder from neutral templates; SUDS per item | Epic 5, Story 5.1 | ✓ Covered |
| FR-HIER-02 | Custom hierarchy items | Epic 5, Story 5.1 | ✓ Covered |
| FR-HIER-03 | Stall detection (2 sessions no SUDS reduction → step-down prompt) | Epic 5, Story 5.1 | ✓ Covered |
| FR-ERP-01 | 3 sequential ERP phases; cannot skip or reorder | Epic 5 Stories 5.2/5.3 + Epic 6 depth | ⚠️ Covered — coverage map mislabels as Epic 6 only; implementation spans Epics 5+6 |
| FR-ERP-02 | Self-initiated SUDS logging during active phase | Epic 5, Story 5.2 | ⚠️ Covered — coverage map says Epic 6; implementation is Epic 5 |
| FR-ERP-03 | Debrief with SUDS arc graph + structured reflection | Epic 5, Story 5.3 | ⚠️ Covered — coverage map says Epic 6; implementation is Epic 5 |
| FR-ERP-04 | Aborted session logged without negative framing | Epic 5, Story 5.2 | ⚠️ Covered — coverage map says Epic 6; implementation is Epic 5 |
| FR-CBT-01 | Thought record (6 fields) | **POST-MVP — no MVP story** | ❌ DEFERRED (PRD: in-scope MVP) |
| FR-CBT-02 | Cognitive distortion library with tagging | **POST-MVP — no MVP story** | ❌ DEFERRED (PRD: in-scope MVP) |
| FR-CBT-03 | Behavioural experiment tool (5 fields) | **POST-MVP — no MVP story** | ❌ DEFERRED (PRD: in-scope MVP) |
| FR-SOM-01 | 6 somatic techniques: 4-7-8, box, Bhramari, Nadi Shodhana, 5-4-3-2-1, body scan | Epic 7 (partial): box breathing + 5-4-3-2-1 only; 4 techniques POST-MVP | ⚠️ PARTIAL (PRD: all 6 in-scope MVP) |
| FR-SOM-02 | Animated visual guide for each technique; no audio required | Epic 7 (partial): visual pacing for covered techniques only | ⚠️ PARTIAL (PRD: all 6 in-scope MVP) |
| FR-CHECKIN-01 | Daily check-in SUDS routing (≥7 somatic; 4–6 grounding; 1–3 cognitive/exposure) | **POST-MVP — no MVP story** | ❌ DEFERRED (PRD: in-scope MVP) |
| FR-PROG-01 | SUDS trend graph weekly + monthly | Epic 8, Story 8.5 | ✓ Covered |
| FR-PROG-02 | Chronological exposure history log | Epic 8, Story 8.5 | ✓ Covered |
| FR-NOTIF-01 | Day 2 + Day 5 re-engagement notifications; no further automated notifications | Epic 8, Stories 8.1 + 8.4 | ✓ Covered |
| FR-NOTIF-02 | No streak counters or loss-framing in notifications | Epic 8, Story 8.4 (constraint) | ✓ Covered |
| FR-NOTIF-03 | User controls notification timing + opt-out; immediate | Epic 8, Stories 8.1 + 8.2 | ✓ Covered |
| FR-CRISIS-01 | On-device keyword detection → crisis resources displayed offline | Epic 3 Story 3.1 + Epic 7 Story 7.4 | ✓ Covered |
| FR-CRISIS-02 | Keyword list: English + Hindi; embedded in binary; app release only | Epic 3, Story 3.1 | ✓ Covered |
| FR-CRISIS-03 | SOS panic button persistent during active ERP session; overlay, no session termination | Epic 7, Story 7.1 (broader: persistent all screens) | ✓ Covered (exceeds PRD scope: persistent on all screens, not just session) |
| FR-I18N-01 | All strings externalised; English only at MVP | Epic 1 scaffold + Epic 9 verification | ✓ Covered |
| FR-I18N-02 | RTL rendering at MVP even without RTL locale | Epic 1 scaffold + Epic 9 verification | ✓ Covered |
| FR-ANALYTICS-01 | First-party Day 1 metrics (core loop retention + SUDS cadence) | Epic 8, Story 8.5 (schema only; no live writes per BOUNDARY-01) | ✓ Covered |
| FR-ANALYTICS-02 | Zero health data to third-party services | Epic 3, Story 3.5 | ✓ Covered |

**Epics-Added FRs (not in PRD — additions by the epic design team):**

| FR | Description | Coverage | Status |
|---|---|---|---|
| FR-ANALYTICS-BOUNDARY-01 | Zero analytics writes at MVP; events table stub only | Epic 3, Story 3.5 | ✓ Covered |
| FR-SUDS-ANCHOR-01 | Static SUDS anchors on every rating interaction | Epic 6 (shared component) | ✓ Covered |
| FR-ADVERSE-01 | SUDS ≥8 during session → grounding offer; exit SUDS ≥8 → crisis contacts in debrief | Epic 5, Stories 5.2/5.3 | ✓ Covered |
| FR-ADVERSE-02 | Check-in SUDS ≥8 → crisis contacts on routing screen | POST-MVP (depends on FR-CHECKIN-01) | ⚠️ Deferred with FR-CHECKIN-01 |
| FR-DPO-01 | DPO appointed + contact in privacy notice before India launch | Epic 3, Story 3.5 | ✓ Covered |
| FR-DPO-02 | Data export request flow (Settings → Privacy → Request my data) | Epic 3 Story 3.5: **MVP is operator-mediated; self-service deferred** | ⚠️ PARTIAL — PRD intent partially met; self-service path deferred |
| FR-DPO-03 | Account deletion (30-day soft-delete) | Epic 2 Story 2.4 + Epic 3 Story 3.3 | ✓ Covered |
| FR-DPO-04 | All consent events exclusively via consent-record Edge Function | Epic 3, Story 3.2 | ✓ Covered |
| FR-DPO-05 | Self-hosted HTML DPO operator panel | Epic 3, Story 3.4 | ✓ Covered |
| FR-DPO-06 | Append-only dpo_audit_log with all DPO actions | Epic 3, Story 3.3 | ✓ Covered |
| FR-DPO-07 | DPO interface verified before any personal data in production (hard gate) | Epic 3, Stories 3.3 + 3.4 | ✓ Covered |

---

### Missing Requirements

#### Critical: PRD MVP Scope Deferred Without Formal Change Control

**FR-CBT-01:** Thought record (6-field sequence)
- **Impact:** The PRD explicitly lists CBT techniques as in-scope MVP. No story exists. No product decision record of the deferral is visible in the epics document beyond the coverage map annotation "POST-MVP — no MVP story."
- **Recommendation:** Either (a) create stories in a new epic or add to an existing epic, or (b) document a formal scope-change decision record that Cooper has approved deferring CBT techniques to post-MVP.

**FR-CBT-02:** Cognitive distortion library
- **Impact:** Same as FR-CBT-01. Named individually in the PRD as a required MVP feature.
- **Recommendation:** Same as FR-CBT-01.

**FR-CBT-03:** Behavioural experiment tool (5-field sequence)
- **Impact:** Same as FR-CBT-01.
- **Recommendation:** Same as FR-CBT-01.

**FR-CHECKIN-01:** Daily check-in with SUDS-based routing
- **Impact:** The daily check-in is a cornerstone of the PRD's core loop and Day 1 metrics. The routing logic (≥7 somatic; 4–6 grounding; 1–3 cognitive/exposure) underpins the re-engagement model and the technique library's value. Deferring it removes a significant part of the daily habit loop from MVP.
- **Impact downstream:** FR-ADVERSE-02 (check-in ≥8 crisis contacts) is also deferred as a consequence.
- **Recommendation:** The deferral of FR-CHECKIN-01 appears to be a significant product scope decision. A formal scope-change sign-off from the PM is required, with the impact on the Day 1 retention metric (which depends on the habit loop) documented.

#### Important: Partial Scope Reductions

**FR-SOM-01 / FR-SOM-02:** Only 2 of 6 somatic techniques at MVP
- PRD in-scope: 4-7-8 breathing, box breathing, Bhramari, Nadi Shodhana, 5-4-3-2-1 grounding, body scan
- MVP implementation: box breathing + 5-4-3-2-1 grounding only
- **Impact:** Users whose clinical profile suggests Bhramari (breath-hold anxiety reduction) or body scan (anxiety localisation) will not have access to their most appropriate tools at launch.
- **Recommendation:** Document rationale (likely scope and timeline). Note: The check-in routing (FR-CHECKIN-01) would route users to somatic techniques — this creates a gap where routing destinations don't exist.

#### Documentation Quality Issues

**Coverage Map vs. Story Alignment:**
- The FR Coverage Map states FR-ERP-01, FR-ERP-02, FR-ERP-03, FR-ERP-04 are in **Epic 6**, but Epic 5 Stories 5.2 and 5.3 are the primary implementations of these FRs. Epic 6 extends the experience (technique selection, home states 3/4/9) but the core ERP session is Epic 5. The coverage map should be updated to reflect "Epic 5 (core) + Epic 6 (depth)."

**Orphaned FR References in Stories:**
- Story 4.3 references **FR-ONBOARD-04** — this FR does not exist in the PRD, the requirements inventory, or the coverage map. Likely a documentation error (should be FR-ONBOARD-02 or FR-ONBOARD-03).
- Story 4.2 references **FR-PSYCH-01** — does not exist in the coverage map. A psychoeducation requirement is covered by FR-ONBOARD-03 in the PRD. This is likely an informal label used during story writing.
- Epic 6 stories use internal labels (FR-SESSION-04/05/06, FR-HOME-01/02/03/05, FR-LADDER-06) that don't appear in the coverage map. These represent real requirements discovered during design but are not traced back to PRD requirements.

**Notification FR label confusion:**
- Story 8.1 header claims FR-NOTIF-01 (re-engagement notifications) but the story implements push token registration infrastructure. FR-NOTIF-01 actual coverage is Story 8.4.
- Story 8.2 header claims FR-NOTIF-02 but implements a daily reminder feature not in the PRD. The PRD FR-NOTIF-02 (no streak mechanics) is a constraint on Story 8.4.

---

### Notable Additions (Not in PRD — Positive Findings)

- **Story 8.2 (Daily Local Session Reminder):** A user-set daily reminder at a chosen time. Not in the PRD but addresses the habit-formation goal.
- **Story 8.3 (Window-Close Notification):** 3-hour post-session nudge to complete reflection. Adds retention touchpoint not in the PRD.
- **FR-SUDS-ANCHOR-01:** Static reference anchors on every SUDS interaction. Improves clinical validity.
- **FR-ADVERSE-01:** SUDS ≥8 grounding offer mid-session is a significant clinical safety improvement not in the PRD.
- **Clinician access stubs (Stories 5.4/5.5):** Phase 2 therapist portal infrastructure is being pre-built in MVP schema. Smart forward compatibility.

---

### Coverage Statistics

| Metric | Count |
|---|---|
| Total PRD FRs | 31 |
| Fully covered in MVP stories | 21 |
| Covered with documentation issues (FR-ERP-01–04) | 4 |
| Partially covered (scope reduction) | 2 (FR-SOM-01/02) |
| Deferred POST-MVP (PRD says in-scope) | **4 (FR-CBT-01/02/03, FR-CHECKIN-01)** |
| **Coverage rate (excluding deferred)** | **87.1% (27/31)** |
| **Formal MVP coverage** | **67.7% (21/31) fully clean** |

---

## UX Alignment Assessment

### UX Document Status

**Found** — UX Design Specification exists as a sharded document (13 files) in `ux-design-specification/`. Comprehensive, well-structured, covering flows F1–F6, component strategy, design tokens, accessibility, and responsive design.

---

### Critical Alignment Issues

**⛔ CRITICAL: UX Flow F1 still contains removed readiness gate (FR-GATE-01)**
- UX F1 flow shows: "Q{Readiness prerequisite} → Thought record OR Somatic session → Hierarchy builder unlocks automatically"
- The PRD explicitly states FR-GATE-01 is REMOVED: "Hierarchy immediately accessible after onboarding; no prerequisite session required"
- The epics requirements inventory also shows FR-GATE-01 as REMOVED
- **Risk:** A developer implementing from the UX spec would build the wrong flow — blocking the hierarchy builder behind a readiness gate that the product has decided to remove. This is a divergence that will cause implementation error if the UX document is used as a reference.
- **Action required:** UX flow F1 must be updated to remove the readiness gate branch before implementation of Epic 4 (Onboarding) begins.

**⛔ CRITICAL: UX uses full 17-item SPIN; PRD and epics use 3-item mini-SPIN**
- UX Flow F1: "SPIN questionnaire — 17 items" with threshold "SPIN score ≥40"
- PRD (FR-ONBOARD-01) and Epics (FR-ONBOARD-01 requirements inventory): 3-item mini-SPIN, max score 12, threshold ≥6 (pending clinical sign-off for Indian context)
- **Risk:** A developer implementing from the UX spec would build a 17-item instrument with a threshold of 40 — fundamentally different clinical experience from the 3-item instrument the product has specified. This directly affects Epic 4 onboarding stories.
- **Action required:** UX flow F1 must be updated to reflect 3-item mini-SPIN with ≥6 threshold before Epic 4 implementation.

---

### Important Alignment Issues

**⚠️ Preview challenge persistence: UX assumes server token; epics use MMKV local storage**
- UX Flow F1 decisions note: "Anonymous previews use a server-issued device token on first launch; completions merge into real account on creation"
- Epics Story 2.3: Completions stored in MMKV under `"preview_challenges"` key; transferred via `adapter.enqueue()` on account creation (local storage only; no server token in the anonymous state)
- **Risk:** Minor — these are implementation details below the UX layer, but the UX decision note could mislead developers. The actual architecture (Epic 2 / ARC-005) has authoritative guidance.
- **Action required:** Update UX flow F1 decision note to reflect local MMKV storage approach, or note "implementation detail per Architecture ARC-005."

**⚠️ Avoidance State 5 fully documented in UX but explicitly deferred in epics**
- UX Flow F5 includes state 5 (avoidance detection) with detailed logic: 3+ opens without debrief, thread open >6 hours, user declares avoidance
- Epic 6 Story 6.3 explicitly defers state 5 post-MVP; a code comment is required in the state machine
- **Risk:** Low — UX documentation of future states is appropriate. The risk is that a developer reads the UX spec and implements state 5 without realising it's deferred.
- **Action required:** Add a visible deferral note to the UX flow F5 avoidance state indicating "Post-MVP — Epic 6 Story 6.3 explicitly defers this state."

**⚠️ Tab naming inconsistency: "Achievements" (UX) vs. "Progress" (Epics)**
- UX Longitudinal SUDS View section references the "Achievements tab" as the home for longitudinal progress data
- Epics Story 8.5 implements a "Progress tab"
- **Risk:** Naming inconsistency between planning documents could cause confusion during implementation. The UX mentions `LongitudinalSudsChart` as a post-MVP component; the MVP implementation in Story 8.5 uses `SudsArcChart` in a Progress tab.
- **Action required:** Confirm canonical tab name ("Progress") with the product team; update UX document to match.

**⚠️ SUDS anchor label specificity mismatch**
- UX flows consistently reference "light-weight subtext per value" but do not define the specific anchor text
- FR-SUDS-ANCHOR-01 (epics) defines exact labels: 0=completely calm, 2=very mild, 4=mild, 6=moderate, 8=severe, 10=worst imaginable
- UX F5 mentions "0 = no anxiety, 10 = worst imaginable" — different wording from FR-SUDS-ANCHOR-01 (0="completely calm" not "no anxiety")
- **Risk:** Minor copy inconsistency. The clinical validation of the exact anchor labels needs to be confirmed.
- **Action required:** Confirm canonical anchor labels with the clinical advisor; align UX and FR-SUDS-ANCHOR-01 wording.

---

### Good Alignment (Confirmed)

- **AnimationContext + ReducedMotionProvider** at root: UX specification matches Epic 1 Stories 1.4/1.5 and UX-DRs 15/23 exactly
- **CalmMeButton persistent across all screens**: UX requirement (F4, Component Strategy) matches Epic 7 Story 7.1 and UX-DR8 — architecture confirms this requires an ADR on rendering strategy (Story 1.5)
- **`resolveHomeScreenState()` pure function in `packages/core`**: UX Component Strategy matches UX-DR7 and Epic 5 story ACs
- **`ExposureThread` state machine + `expires_at` as server-authoritative bigint**: Aligned across UX flows F3/F6, epics ARC-014, UX-DR12, and architecture
- **WCAG 2.1 AA compliance**: UX Responsive Design section formally commits to WCAG 2.1 AA, matching NFR-ACCESS-01
- **Touch targets**: UX specifies 44×44pt (standard) and 56×56px (in-the-moment), which meets and exceeds NFR-ACCESS-01's 44×44dp minimum
- **NativeWind v5 validation spike**: UX Phase 0 requirements (UX-DR3) match SPIKE-001 in epics — validated before any component work
- **Design token system**: UX token architecture (8 colour tokens, motion presets, haptic constants) fully reflected in Epic 1 Story 1.4 ACs
- **DM Serif restricted to 4 surfaces**: UX typography contract (UX-DR21) is enforced via TypeScript union type in Story 1.4 — strong alignment
- **Offline resilience**: UX flow optimization principles ("Calm Me and grounding without network; session state server-persisted with local cache") match NFR-OFFLINE-01 through NFR-OFFLINE-03
- **Five debrief return paths** (UX-DR11, defining-experience.md): Fully reflected in Epic 5 Story 5.3 ACs
- **Prediction vs. reality reveal** (UX-DR13): Reflected in Epic 5 Story 5.3 and Epic 6 Story 6.1

---

### Summary Warnings

| Issue | Severity | Action |
|---|---|---|
| UX Flow F1 still shows removed readiness gate | 🔴 Critical | Update UX before Epic 4 implementation |
| UX uses 17-item SPIN; PRD/epics use 3-item mini-SPIN | 🔴 Critical | Update UX F1 before Epic 4 implementation |
| Preview challenge architecture (server token vs MMKV) | 🟡 Important | Clarify in UX decision notes |
| State 5 (avoidance) detailed in UX but deferred in epics | 🟡 Important | Add deferral note to UX flow |
| "Achievements" tab (UX) vs. "Progress" tab (epics) | 🟡 Important | Confirm canonical name; update UX |
| SUDS anchor label wording mismatch | 🟢 Minor | Confirm with clinical advisor |

---

## Epic Quality Review

### Epic Structure Validation

| Epic | Title | User Value? | Independence | Rating |
|---|---|---|---|---|
| Epic 1 | Project Foundation & Design System | ⚠️ Technical enabler | Standalone | 🟡 Acceptable (complex stack justifies it) |
| Epic 2 | Authentication & Account Safety | ✓ Clear user value | Needs Epic 1 | ✓ Good |
| Epic 3 | DPDPA Compliance & Crisis Safety | ⚠️ Compliance + safety | Can run parallel to E2 | 🟡 Acceptable |
| Epic 4 | User Onboarding & Psychoeducation | ✓ Clear user value | Needs Epics 1-3 | ✓ Good |
| Epic 5 | Courage Ladder | ⚠️ Scope mismatch | Needs Epics 1-4 | 🔴 Issue: epic contains ERP session stories |
| Epic 6 | ERP Session Depth | ⚠️ Scope mismatch | Needs Epic 5 | 🔴 Issue: FR coverage map says core ERP is here, but it's in Epic 5 |
| Epic 7 | Support Toolkit | ✓ Clear user value | Needs Epics 5-6 | ✓ Good |
| Epic 8 | Notifications & Progress Tab | ✓ Clear user value | Needs Epics 5-7 | ✓ Good |
| Epic 9 | Platform Quality & Production Readiness | ⚠️ Technical/audit | Needs all prior epics | 🟡 Acceptable as pre-launch gate |

---

### Critical Violations

**🔴 Epic 5 scope mismatch: "Courage Ladder" contains ERP session implementation**

The epic is named "Courage Ladder & Home Experience" and its coverage map entry lists only FR-HIER-01, FR-HIER-02, FR-HIER-03. However, the actual stories within Epic 5 implement the ERP session core loop:

- **Story 5.2:** ERP Session — Start & SUDS Entry (implements FR-ERP-01, FR-ERP-02)
- **Story 5.3:** ERP Session — Completion, Debrief & Home State (implements FR-ERP-03)
- **Story 5.4/5.5:** Clinician Access Schema & pgTAP Coverage (technical/compliance stories — no user value label)

The FR Coverage Map simultaneously says FR-ERP-01 through FR-ERP-04 are in **Epic 6**, creating a documentation conflict. A developer reading the coverage map would look in Epic 6 for the ERP session implementation, but it lives in Epic 5.

**Impact:** Developers will be confused about which epic owns the ERP session. Sprint planning will be inaccurate if the coverage map is used to scope Epic 6.

**Remediation:** Either (a) move Stories 5.2/5.3 into Epic 6, or (b) update the coverage map to show FR-ERP-01–04 as "Epic 5 (core) + Epic 6 (depth)" and rename Epic 5 to "Courage Ladder, ERP Session & Clinician Access."

**🔴 Epic 5 Stories 5.4/5.5 have no user value — they are pure technical compliance stories**

Stories 5.4 ("Clinician Access — Schema & RLS Policies") and 5.5 ("Clinician Access — pgTAP Coverage") deliver zero user-visible functionality. They implement Phase 2 infrastructure (therapist read access) during MVP. The justification is valid (avoid retroactive schema migration), but these stories should be clearly labelled as technical prerequisites, not user stories, and their user story format ("As a clinician...") is misleading since clinician functionality is Phase 2.

**Remediation:** Label these clearly as "Technical Infrastructure Stories" or consolidate them into a named technical story within Epic 3 (which already handles RLS and compliance infrastructure).

**🔴 Stories 8.2 and 8.3 add PRD-out-of-scope features with no FR reference**

- **Story 8.2 (Daily Local Session Reminder):** Implements a user-set daily notification time — a feature not present in the PRD's notification requirements (FR-NOTIF-01 covers only inactivity-triggered Day 2/5 notifications). The story header claims FR-NOTIF-02, but FR-NOTIF-02 is the "no streak mechanics" constraint — not a daily reminder.
- **Story 8.3 (Window-Close Notification):** A 3-hour post-session notification to complete reflection — not in the PRD's notification scope.

Both are valuable features, but they are undocumented scope additions with incorrect or missing FR mappings. This means they are untracked against product requirements and could be cut or kept without visibility into the impact on PRD coverage.

**Remediation:** Either add these to the PRD as new FRs with product owner approval, or explicitly label them as "backlog additions approved outside PRD scope" with a named decision owner.

---

### Major Issues

**🟠 Story 4.2 references FR-PSYCH-01 (does not exist)**

Story 4.2 "Fear Ladder Introduction & SUDs Calibration" references "FR-ONBOARD-02, FR-PSYCH-01" in its title line. FR-PSYCH-01 does not appear in the requirements inventory, the PRD, or the FR Coverage Map. The psychoeducation requirement is FR-ONBOARD-03. This is a documentation error that could cause a story to appear untraced.

**🟠 Story 4.3 references FR-ONBOARD-04 (does not exist)**

Story 4.3 "Initial Fear Ladder Setup" references "FR-ONBOARD-03, FR-ONBOARD-04." FR-ONBOARD-04 does not exist anywhere in the requirements inventory. The story correctly covers FR-ONBOARD-02 (safety behaviour checklist personalises template suggestions) and FR-ONBOARD-03 (inline psychoeducation), but the FR-ONBOARD-04 reference is an error.

**🟠 Epic 6 stories use undocumented internal FR labels**

Epic 6 stories reference FR-SESSION-04, FR-SESSION-05, FR-SESSION-06, FR-HOME-01, FR-HOME-02, FR-HOME-03, FR-HOME-05, FR-LADDER-06. None of these appear in the FR Coverage Map, the PRD FR list, or the epics requirements inventory. These represent real requirements that were identified during epic design but were never formally registered in the requirements inventory. This breaks traceability from story to PRD.

**Remediation:** Add these as "Implementation-Discovered Requirements" to the requirements inventory with brief descriptions, or trace them back to the closest PRD requirement they implement.

**🟠 Story 5.1 references FR-LADDER-01 and FR-LADDER-02 (not in coverage map)**

Story 5.1 "Full Courage Ladder Screen" claims to implement FR-LADDER-01 and FR-LADDER-02. These are not in the requirements inventory or coverage map. They likely correspond to FR-HIER-01 (template selection) and FR-HIER-02 (custom items) but the label mismatch breaks traceability.

**🟠 Story 5.4 references FR-LADDER-03 (not in coverage map)**

Same pattern — FR-LADDER-03 is used for clinician read access but doesn't appear in requirements inventory. There is no PRD FR for therapist read access (therapist portal is Phase 2).

**🟠 Story 7.5 creates planned technical debt against Story 5.2**

Story 7.5 explicitly replaces the grounding screen stub created in Story 5.2. This is intentional and documented ("The stub grounding screen from Story 5.2 exists — all STUB and TODO comments must be removed"). However, it means Story 5.2 deliberately ships incomplete code to production that Story 7.5 must fix. This is an anti-pattern in story design — stories should be complete and shippable when merged.

**Risk:** If Epic 7 is delayed or descoped, the stub grounding screen remains in production indefinitely. Story 5.2 is documented as depending on Epic 7 to be complete.

**Remediation:** Story 5.2 could implement a minimal but non-stub grounding screen (courage affirmation + basic breathing prompt) that satisfies the immediate session flow. Story 7.5 could then enhance it rather than replace stubs.

---

### Minor Concerns

**🟡 Epic 1 (7 stories) is all technical — no story delivers user-visible value**

All 7 stories in Epic 1 are developer infrastructure (monorepo, library evaluation, NativeWind spike, token system, motion foundations, i18n scaffold, Supabase scaffold). No end user can benefit from Epic 1 alone. This is acceptable for a greenfield project with a complex tech stack, but it should be acknowledged as a planning decision: the team accepts that Sprint 1 produces zero user-visible output.

**🟡 Epic 9 (8 stories) is a pure quality/audit epic**

All 8 stories verify non-functional requirements — no new features. Acceptable as a pre-launch hardening sprint, but again the team should expect that Sprint 9 produces no new user features.

**🟡 Story 5.1 has sequential dependency on Story 5.5 (unusual pattern)**

The note "Story 5.5 must run sequentially after Story 5.4 — do not parallelise" is unusual. Sequential enforcement between stories within an epic is appropriate here (pgTAP tests depend on the RLS policies existing), but it should be clearly marked in sprint planning.

**🟡 Stories 3.5 documentation decisions (deferred self-service export, withdrawal flow)**

Story 3.5 documents three explicit deferrals as "decision records exist" — but requires those decision records to exist as acceptance criteria. If these ADRs are missing, the story cannot close. This is a correct design but creates hidden dependencies on documentation artifacts.

---

### Best Practices Compliance Summary

| Criterion | Status |
|---|---|
| Epics deliver user value | ⚠️ 6/9 clearly user-centric; Epics 1, 3, 9 are technical/compliance |
| Epic independence maintained | ✓ Dependencies are properly documented and follow sequential logic |
| Stories appropriately sized | ✓ Well-sized throughout; no "setup all models" anti-patterns |
| No unclaimed forward dependencies | ⚠️ Production-gate pattern on Epic 3 from Epic 2 is documented but creates release risk |
| Database tables created when needed | ✓ Good — exception is `therapist_patient_relationships` stub in Story 4.3 (justified) |
| Clear acceptance criteria (BDD format) | ✓ Excellent — Given/When/Then throughout; specific, testable, with error conditions |
| FR traceability maintained | ❌ Multiple broken FR references (FR-PSYCH-01, FR-ONBOARD-04, FR-LADDER-01/02/03, FR-SESSION-*, FR-HOME-*) |
| Greenfield setup complete | ✓ Epic 1 Story 1.1 covers monorepo, CI/CD, EAS Build, secrets |
| Stub pattern for cross-epic dependencies | ✓ Consistently used and documented (ConsentRecordServiceStub, DpoServiceStub) |

---

## Summary and Recommendations

### Overall Readiness Status

## ⚠️ NEEDS WORK — Proceed with Epics 1–3; Epic 4 is BLOCKED

The technical planning quality for exposure-buddy is genuinely strong. The architecture decisions are well-reasoned, the acceptance criteria are precise and testable, the compliance infrastructure is thoughtfully designed, and the cross-epic dependency management is mature. This is better than most projects at this stage.

However, **Epic 4 (Onboarding) cannot begin implementation** until two critical UX-PRD misalignments are corrected. And four MVP-scoped features are being silently deferred without formal scope-change records. These are the risks that could cause rework or missed requirements in the field.

---

### Critical Issues Requiring Immediate Action

**Before Epic 4 implementation (BLOCKING):**

1. **Update UX Flow F1: Remove the readiness gate**
   The UX specification still shows a readiness prerequisite (thought record OR somatic session required to unlock the hierarchy builder) that the PRD explicitly removed as FR-GATE-01. Any developer following the UX spec will implement the wrong onboarding flow. **Fix: Update `user-journey-flows.md` F1 to reflect immediate hierarchy access after onboarding.**

2. **Update UX Flow F1: Change SPIN to 3-item mini-SPIN**
   The UX shows "SPIN questionnaire — 17 items" with threshold ≥40. The PRD and epics specify a 3-item mini-SPIN with max score 12 and threshold ≥6 (pending clinical sign-off). These are fundamentally different clinical instruments. **Fix: Update F1 flowchart to show 3-item mini-SPIN, score 0–12, thresholds 0–3/4–5/≥6.**

**Before implementation kickoff (DECISION REQUIRED):**

3. **Formally approve scope deferral of FR-CBT-01, FR-CBT-02, FR-CBT-03 (CBT techniques)**
   The PRD explicitly scopes thought record, cognitive distortion library, and behavioural experiment as MVP features. The epics defer them to post-MVP with no formal decision record. A PM sign-off is required confirming: which release these move to, the impact on "CBT techniques" product positioning, and whether this reduces the Day 1 retention metric proposition.

4. **Formally approve scope deferral of FR-CHECKIN-01 (daily check-in with routing)**
   The daily check-in is a cornerstone of the PRD's core habit loop and the SUDS cadence Day 1 metric. Deferring it means the Day 1 metric "% of active sessions with ≥2 SUDS log entries" cannot be triggered by check-in routing — it only fires within ERP sessions. A PM sign-off is required with explicit acknowledgement of the metric impact.

---

### Recommended Next Steps

**Immediate (before Sprint 1):**
1. Update `ux-design-specification/user-journey-flows.md` F1 and F2 to remove the readiness gate and replace 17-item SPIN with 3-item mini-SPIN (UX designer action)
2. Obtain PM written sign-off on CBT and daily check-in deferrals; add decision records to `_bmad-output/planning-artifacts/tmp/` or as ADRs
3. Clarify and document canonical tab name: "Progress" (Epics) or "Achievements" (UX). Update the losing document.

**Before Epic 4 sprint planning:**
4. Fix orphaned FR references in stories: FR-PSYCH-01 → FR-ONBOARD-03 in Story 4.2; FR-ONBOARD-04 → FR-ONBOARD-02 in Story 4.3
5. Add UX flow F5 deferral note for Avoidance State 5 ("Post-MVP — see Epic 6 Story 6.3")

**Before Epic 5 sprint planning:**
6. Resolve the Epic 5/6 scope confusion: either move Stories 5.2/5.3 into Epic 6, or update the FR Coverage Map to correctly attribute FR-ERP-01–04 to "Epics 5+6." Also clarify the label of Stories 5.4/5.5 as "Technical Infrastructure" not user stories.
7. Register undocumented internal FRs from Epic 6 (FR-SESSION-*, FR-HOME-*, FR-LADDER-*) in the requirements inventory, or trace them to parent PRD requirements.

**Before Epic 7 sprint planning:**
8. Reconsider Story 5.2's grounding stub — consider implementing a minimal but shippable grounding screen in Story 5.2 so it doesn't ship deliberate stub code. Story 7.5 can then enhance it rather than replace stubs.

**Before Epic 8 sprint planning:**
9. Add formal FR entries for Story 8.2 (daily local reminder) and Story 8.3 (window-close notification) to the requirements inventory, or document them as PM-approved backlog additions outside PRD scope.

---

### Finding Summary

| Category | Critical | Important | Minor |
|---|---|---|---|
| UX ↔ PRD Misalignment | 2 | 3 | 1 |
| Epic Coverage (deferred scope) | 2 | 2 | 0 |
| Traceability (broken FR refs) | 0 | 5 | 2 |
| Epic Structure / Quality | 2 | 4 | 3 |
| **Total** | **6** | **14** | **6** |

**26 total issues across 4 categories.** Six are critical and must be addressed before the affected epics begin implementation. The remainder are documentation quality issues that should be resolved during sprint planning.

---

### What the Team Got Right

To close on an honest note — this project is in better shape than average:

- **Architecture documentation is exceptional.** 9 ADRs authored pre-implementation, architecture sharded and indexed, startup dependency graph documented, RLS policy test harness specified in ACs.
- **Acceptance criteria quality is the highest I've seen.** Given/When/Then throughout, with TypeScript types, function names, SQL constraints, and edge cases embedded in the ACs. Developers can implement from these without ambiguity.
- **Compliance design is serious.** DPDPA 2023 enforcement is pre-production-gated with a hard go-live dependency (FR-DPO-07). HIPAA-forward schema design from day one. The consent-record Edge Function architecture prevents application-layer bypass.
- **Clinical safety is first-class.** FR-ADVERSE-01 (SUDS ≥8 grounding offer mid-session), FR-CRISIS-01–03 (on-device keyword detection, offline crisis contacts, persistent SOS overlay), and the non-punitive language constraints on notifications are all well-specified.
- **Offline-first design is thorough.** The PowerSync adapter pattern, startup dependency ordering, and crash recovery specifications are production-grade.

The 26 issues are fixable. Fix the 6 critical ones before implementation begins.

---

*Assessment generated: 2026-05-18*
*Assessed by: Implementation Readiness workflow (bmad-check-implementation-readiness)*
*Report file: `_bmad-output/planning-artifacts/implementation-readiness-report-2026-05-18.md`*
