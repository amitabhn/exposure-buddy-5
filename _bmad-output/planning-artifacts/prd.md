---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-e-01-discovery", "step-e-02-review", "step-e-03-edit"]
lastEdited: "2026-06-07"
editHistory:
  - date: "2026-05-07"
    changes: "Added all 9 BMAD body sections: Executive Summary, Success Criteria, Product Scope, User Journeys, Domain Requirements, Innovation Analysis, Project-Type Requirements, Functional Requirements, Non-Functional Requirements"
  - date: "2026-06-07"
    changes: "Reframed India from primary market to example/launch market; removed cost objective from Executive Summary and Success Criteria; split MVP section into MVP (core platform) and Phase 1 (India launch) — India-specific compliance and localisation items moved to Phase 1"
inputDocuments:
  - "_bmad-output/planning-artifacts/product-brief-exposure-buddy.md"
  - "_bmad-output/planning-artifacts/milestone-features-exposure-buddy.md"
  - "_bmad-output/planning-artifacts/research/market-exposure-therapy-apps-anxiety-consumer-research-2026-05-05.md"
  - "_bmad-output/planning-artifacts/research/technical-react-native-vs-flutter-mobile-mental-health-app-research-2026-05-05.md"
  - "_bmad-output/planning-artifacts/research/technical-backend-architecture-real-time-anxiety-tracking-app-research-2026-05-05.md"
  - "docs/ANXIETY_APP_PRODUCT_SPEC.md"
  - "docs/social_anxiety_flow_v2.xlsx"
briefCount: 1
researchCount: 3
brainstormingCount: 0
projectDocsCount: 2
workflowType: 'prd'
classification:
  projectType: "three-surface cross-platform app (RN Android-primary, RN iOS, React web)"
  domain: "DTx-adjacent consumer wellness, SaMD-risk-aware, regulated digital mental health"
  complexity: "medium-high — structured graduated-challenge protocol fidelity, crisis detection, tri-jurisdiction compliance trajectory, offline/connectivity design"
  projectContext: "greenfield"
  primaryFailureMode: "Mode 2 — user quits (avoidance)"
  complianceTrajectory:
    mvp: "Platform security baseline — AES-256 at rest, TLS 1.3 in transit, RLS on all health data tables; on-device crisis detection; first-party analytics only"
    phase1: "DPDPA 2023 (India) — health data as special category, explicit granular consent, DPO required, 72-hour breach notification"
    phase2: "HIPAA (US) — Supabase BAA, RLS enforcement, PHI audit log, AES-256 + TLS 1.3; UK/EU GDPR — special category health data, data subject rights, supervisory authority notification"
    phase3: "EU AI Act — high-risk AI classification likely for mental health AI features; CDSCO SaMD monitoring for India"
    architectureNote: "MVP data model and RLS policies must be HIPAA-compatible and GDPR-compatible by design to avoid data layer rebuild at Phase 2"
mvpScope:
  in:
    - "Taste experience: 3 preview challenges; logged-in → home; logged-out → Sign In / Sign Up / Try a Challenge"
    - "Auth: email or phone + OTP"
    - "mini-SPIN questionnaire (3-item): 3-tier response — score 0–3 no message; score 4–5 inline soft advisory; score ≥6 full referral screen (crisis resource contacts) with acknowledgement required"
    - "Conversational symptom check (3–4 questions) + safety behaviour checklist (15-item)"
    - "Psychoeducation inline (not front-loaded): anxiety cycle before first exposure; avoidance explainer at safety behaviour selection"
    - "Exposure readiness gate: REMOVED — hierarchy immediately accessible after onboarding; no prerequisite session required"
    - "Exposure hierarchy builder: neutral templates, SUDS 0–10 per item, stall logic (2 stalls = step down)"
    - "ERP session flow: pre-session briefing → SUDS logging → debrief"
    - "CBT techniques: thought record, cognitive distortion library, behavioural experiment"
    - "Somatic techniques: 4-7-8, box breathing, Bhramari, Nadi Shodhana, 5-4-3-2-1 grounding, body scan"
    - "Daily check-in → technique routing: score ≥7 somatic first; 4–6 grounding; 1–3 cognitive/exposure"
    - "Progress tracking: SUDS trend graph, exposure history"
    - "Re-engagement notifications: Day 2 + Day 5; warm language; no streak/guilt"
    - "Crisis keyword detection: hardcoded pre-filter, English, Tier 1/2, generic crisis resource contacts hardcoded"
    - "SOS panic button: breathing coach + grounding, accessible mid-session"
    - "i18n architecture: English content only; framework supports additional locales without code changes"
    - "Security baseline: AES-256 at rest, TLS 1.3, RLS on all health data tables, first-party analytics only"
    - "Platform: React Native (Android-primary, iOS) + React web, mid-range device optimised"
    - "First-party analytics: core loop retention + SUDS cadence as Day 1 metrics"
  deferred:
    - "ACT track (values clarification, Leaves on a Stream, Committed Action) → Phase 2"
    - "Yoga/Philosophy contextual layering (anchor system, ritual layer, progressive vocabulary) → Phase 2"
    - "SPIN re-scoring at Week 4 + Week 8 → Phase 2"
    - "Community features (wins feed, accountability groups) → Phase 2"
    - "Therapist portal → Phase 2"
    - "Catch-up report (PDF/CSV export) → Phase 2"
    - "Gamification (XP, levels, badges) → evaluate as retention blocker"
    - "Skill-building modules → Phase 2"
    - "HIPAA infrastructure → Phase 2 (US launch)"
    - "EU/UK GDPR compliance → Phase 2 (EU/UK market entry)"
    - "EU AI Act compliance → Phase 3 (AI features)"
    - "Corporate wellness module → Phase 3"
    - "Pricing/monetization mechanics → post-MVP"
---

# Product Requirements Document - Exposure Buddy

**Author:** Cooper
**Date:** 2026-05-07

## Executive Summary

The global treatment gap for mental health disorders is sharpest in high-growth, therapist-scarce markets where effective interventions remain cost-prohibitive, inaccessible, and heavily stigmatised. For the hundreds of millions managing social anxiety worldwide, the most effective intervention — Exposure and Response Prevention (ERP) therapy — is out of reach for the vast majority. India illustrates the scale: 197 million people living with mental health disorders, fewer than 9,000 psychiatrists, a treatment gap exceeding 80%, and an estimated 25–30 million managing social anxiety — yet no structured self-help app exists specifically for facing and overcoming social fears.

Exposure Buddy is a cross-platform mobile and web self-help app that helps users gradually face and overcome the situations and fears they've been avoiding. It is not a therapy app and is not a substitute for professional medical care or any form of therapy. The app guides users through personalised, graduated real-world challenges with structured pre-challenge briefing, real-time SUDS (Subjective Units of Distress Scale) logging, and debrief — making progress visible in live data.

The mental health app market in Asia-Pacific grows at 17.55% CAGR. No incumbent offers a structured self-help app for facing and overcoming social fears. The MVP delivers the core ERP platform; Phase 1 launches in India with market-specific compliance and localisation; Phase 2 expands to English-speaking international markets (Months 7–18).

## Success Criteria

**Clinical Outcomes (primary validation metrics):**
- ≥30% reduction in mean SUDS scores for active users at 8 weeks of use
- >70% exposure completion rate per session (session initiated + exposure step completed + end-of-session SUDS logged)
- Habituation arc documented (SUDS peaks then drops within session) on ≥80% of completed sessions

**Retention and Engagement:**
- >60% 30-day retention (category average: 3–4%)
- <5% monthly churn for paid subscribers
- 2–4× conversion rate for users who complete one full exposure before paywall vs. those who do not

**Phase 1 Launch Objectives (Year 1):**
- 10,000 MAU within 12 months of India launch
- 100+ active verified clinician accounts generating referrals within 12 months
- 1–2 signed corporate wellness pilot contracts (B2B India channel)

**Day 1 Leading Indicators:**
- Core loop retention: % of Day 1 users who complete at least one ERP session
- SUDS cadence: % of active sessions with ≥2 SUDS log entries

## Product Scope

### MVP — Core Platform

**In scope:**
- Taste experience: 3 preview challenges accessible without authentication; logged-in users route to home; logged-out users route to Sign In / Sign Up / Try a Challenge
- Authentication: email or phone number verified by OTP
- mini-SPIN questionnaire (3-item, 0–4 per item, max 12): 3-tier response — score 0–3 no message; score 4–5 inline soft advisory (no tap required); score ≥6 full referral screen with crisis resource contacts and explicit acknowledgement tap required before proceeding; full app access granted at any score
- Conversational symptom check (3–4 questions) + 15-item safety behaviour checklist
- Psychoeducation inline, not front-loaded: anxiety cycle presented immediately before the user's first exposure; avoidance explainer presented at the moment a safety behaviour is selected
- Exposure readiness gate: REMOVED — the exposure hierarchy is immediately accessible after onboarding; no prerequisite session required before building the courage ladder
- Exposure hierarchy builder: neutral templates, SUDS rating 0–10 per item, stall logic — 2 consecutive stalled sessions on the same step triggers a prompt to step down
- ERP session flow: pre-session briefing → real-time SUDS logging → structured debrief
- CBT techniques: thought record, cognitive distortion library, behavioural experiment
- Somatic techniques: 4-7-8 breathing, box breathing, Bhramari, Nadi Shodhana, 5-4-3-2-1 grounding, body scan
- Daily check-in with technique routing: score ≥7 → somatic techniques first; score 4–6 → grounding; score 1–3 → cognitive work or exposure
- Progress tracking: SUDS trend graph, chronological exposure history log
- Re-engagement notifications: sent on Day 2 and Day 5 of inactivity using warm, non-punitive language; no streak counters, loss-framing, or guilt mechanics
- Crisis keyword detection: hardcoded pre-filter covering English; triggers display of Tier 1/2 crisis resources — hardcoded and available offline; market-specific helpline numbers configured per launch market
- SOS panic button: accessible from any screen during an active session; launches breathing coach and grounding sequence without navigating away from session context
- i18n architecture: English content at launch; localisation framework supports additional locales without code changes; RTL layout support implemented at MVP even if no RTL language launches at MVP
- Sign-up safeguards: two mandatory checkbox confirmations at account creation — (1) user is 18+ and (2) user acknowledges Exposure Buddy is a general health and wellness app and its content is not valid for medico-legal proceedings; account creation is blocked without both
- Platform: React Native (Android + iOS) + React web; optimised for mid-range devices
- First-party analytics: core loop retention and SUDS cadence captured as Day 1 primary metrics; no health data transmitted to third-party analytics services
- Security baseline: AES-256 at rest, TLS 1.3 in transit, RLS on all health data tables

**Deferred:**
- ACT track (values clarification, Leaves on a Stream, Committed Action) → Phase 2
- Yoga/Philosophy contextual layering → Phase 2
- SPIN re-scoring at Week 4 and Week 8 → Phase 2
- Community features (wins feed, accountability groups) → Phase 2
- Therapist portal → Phase 2
- Catch-up report (PDF/CSV export) → Phase 2
- Gamification (XP, levels, badges) → evaluate as retention blocker before enabling
- Skill-building modules → Phase 2
- HIPAA infrastructure → Phase 2 (US launch)
- EU/UK GDPR compliance → Phase 2 (EU/UK market entry)
- EU AI Act compliance → Phase 3 (AI features)
- Corporate wellness module → Phase 3
- Pricing and monetisation mechanics → post-MVP

### Phase 1 — India Launch

**In scope (additions to MVP core platform):**
- DPDPA 2023 compliance: non-negotiable before India go-live; includes DPO appointment, granular consent flows, 72-hour breach notification, and data principal rights
- India crisis resources — national helplines hardcoded and offline-available: Tele MANAS 14416 / 1800-891-4416 (govt, toll-free, 24×7); KIRAN 1800-599-0019 (govt, toll-free, 24×7); iCall 9152987821 (Mon–Sat 10 AM–8 PM); Vandrevala Foundation 9999-666-555 (24×7); AASRA +91-22-27546669 (24×7)
- Crisis keyword detection extended to Hindi (Devanagari script); English + Hindi list embedded in client binary
- mini-SPIN ≥6 referral threshold: clinical input required
- i18n: Hindi locale activated; framework ready for Indian regional languages (Marathi, Tamil, Telugu) in Phase 2
- Platform profile validated for India's market: Android-primary (2GB RAM, Android 10+, 4G with intermittent drops); all core ERP flows pass performance NFRs on this profile
- Backend SLA scoped to India business hours (06:00–24:00 IST)
- Load testing to 10,000 concurrent active users completed before India go-live

### Phase 2 — Global English Markets (Months 7–18)
- US and international English launch
- HIPAA-compliant infrastructure layer: Supabase BAA, RLS enforcement, PHI audit log, AES-256 at rest + TLS 1.3 in transit
- Full therapist dashboard: real-time session monitoring, custom challenge assignment, clinical review notes
- ACT track, skill-building modules, psychoeducation library
- Premium Therapist tier: ₹2,499–7,999/month India; $29–99/month US, up to 20 clients
- SPIN re-scoring at Week 4 and Week 8
- Community features: anonymous wins feed, small accountability groups (4–6 users matched by exposure type)
- Additional Indian language support (Marathi, Tamil, Telugu)
- EU/UK GDPR compliance layer

### Phase 3 — Scale (Year 2+)
- AI adaptive pacing (personalised hierarchy progression based on SUDS trajectory)
- Apple Health / Health Connect biometric integration
- B2B India employer wellness channel (₹150–400 per employee per month)
- Corporate wellness module
- EU AI Act compliance (high-risk AI classification for mental health AI features)
- Clinical outcomes publication; payer and insurer partnership pathway
- Wearable integration (Terra SDK)

## User Journeys

### JU-01: Urban Professional (ages 22–38)

**Goal:** Manage social anxiety in workplace and social settings (meetings, hierarchy, family pressure)
**Entry point:** Google Play Store search or WhatsApp peer recommendation

1. Discovers app → taps "Try a Challenge" (logged-out taste experience — 1 of 3 preview challenges, no account required)
2. Converts: creates account via email or phone + OTP
3. Onboarding: completes 3-item mini-SPIN questionnaire; score 0–3 proceeds silently; score 4–5 sees inline soft advisory; score ≥6 sees full referral screen and acknowledges before proceeding
4. Completes 3–4 question conversational symptom check → 15-item safety behaviour checklist
5. Receives inline psychoeducation on the anxiety cycle — presented immediately before first exposure is introduced, not as a front-loaded module
6. Hierarchy builder immediately accessible — no prerequisite session required
7. Builds personalised courage ladder: selects India-contextualised templates (speaking up in meetings, navigating hierarchy, assertiveness with authority figures), assigns SUDS rating 0–10 to each item
8. Returns daily: completes check-in → routed to technique type based on score → initiates ERP session or technique
9. ERP session: reads pre-session briefing → enters real-world exposure situation → logs SUDS at intervals → completes debrief → views SUDS arc confirming habituation
10. If anxiety spikes mid-session: taps SOS → breathing coach or 5-4-3-2-1 grounding, accessible without leaving session
11. If inactive 2+ days: receives warm re-engagement notification (Day 2, then Day 5 if still inactive)
12. Reviews SUDS trend graph weekly to observe anxiety reduction trajectory
13. **Success state:** ≥30% SUDS reduction at 8 weeks; converts to paid subscriber

### JU-03: Student / Early-Career User (Tertiary — ages 18–26)

**Goal:** First mental health tool; reduce social anxiety in academic and early-career settings
**Entry point:** WhatsApp peer recommendation or campus community share

1. Discovers via peer share → opens app → completes all 3 preview challenges without creating an account
2. Creates account → completes onboarding → begins daily check-in and technique routing
3. Completes first full ERP session → key conversion moment (users who complete one exposure before hitting paywall convert at 2–4× the rate of those who do not)
4. If inactive after account creation: receives Day 2 warm notification; Day 5 if still inactive
5. **Success state:** Completes first exposure before paywall; 30-day retention >60%

### JU-04: Post-Therapy Maintainer (Underserved — ages 28–50)

**Goal:** Maintain ERP/CBT gains from prior therapy; prevent relapse without active therapist support
**Entry point:** Targeted search using ERP or CBT terminology

1. Discovers via search (familiar with ERP terminology) → recognises protocol in app description → creates account
2. SPIN score typically moderate; onboarding proceeds without referral gate
3. Hierarchy builder immediately accessible — proceeds directly given prior CBT familiarity
4. Uses app for periodic maintenance exposures at self-directed pace; no therapist link required
5. Monitors SUDS trend graph for early signs of relapse (upward SUDS trend across sessions)
6. **Success state:** Sustained SUDS control across 90 days; <5% monthly churn (highest LTV segment)

### Phase 2 User Journeys

> These journeys require the therapist portal, which is deferred to Phase 2. Included here for roadmap context only — no MVP FRs support these flows.

#### JU-02: Therapy Adjunct User (Secondary — ages 25–50)

**Goal:** Structured between-session ERP homework aligned with active clinical treatment
**Entry point:** Therapist recommendation or in-session referral
**Requires:** Therapist portal (Phase 2)

1. Therapist creates free clinician account; registration verified against NMC or state council before portal access is granted
2. Therapist provides user with unique linking code; user links account after confirming informed consent for data sharing
3. User completes onboarding; SPIN referral screen applies at ≥40 unless therapist has documented clinical justification to proceed
4. Therapist assigns specific challenges from portal view
5. User completes assigned exposures; SUDS data and debrief notes sync to therapist's read-only session view
6. Pre-session auto-summary generated before each upcoming therapy appointment
7. **Success state:** Therapist confirms app-driven progress in sessions; user achieves ≥30% SUDS reduction at 8 weeks

## Domain Requirements

### Phase 1 Launch Market — India

**Governing framework:** Digital Personal Data Protection Act 2023 (DPDPA 2023); DPDP Rules 2025 target full enforcement by May 2027.

Health data (anxiety ratings, SUDS records, session logs, symptom check responses, safety behaviour data) is sensitive personal data under DPDPA 2023.

**Consent requirements:**
- Explicit, granular, documented consent is required for each processing purpose before data is collected
- Consent must be freely given; withdrawal must be equally simple and immediately effective
- Separate consent is required for therapist-linked data access; this consent is obtained at the moment of account linking, not at registration
- Consent records must capture: timestamp, purpose ID, consent version, and withdrawal status; retained for account lifetime plus 2 years

**Sign-up safeguards (mandatory — account creation blocked without both):**
- Age gate: required checkbox confirming user is 18 years of age or older; eliminates the DPDPA 2023 obligation for verifiable parental consent for under-18 users
- Medico-legal disclaimer: required checkbox confirming: *"I understand that Exposure Buddy is a general health and wellness app. Its content, session data, and reports are not intended for and are not valid for use in medico-legal proceedings."*

**Data principal rights:**
- Users exercise access, correction, and erasure rights on request; requests fulfilled within 72 hours of receipt

**Breach notification:**
- Immediate report to the Data Protection Board upon discovery of a qualifying breach; detailed follow-up notification within 72 hours

**Data Protection Officer:**
- A DPO must be appointed before India launch; DPO contact must be published in the app's privacy notice

**Intended use declaration (India):**
Exposure Buddy is a general health app providing behavioural wellness tools and guided exercises for stress and anxiety management. It does not diagnose, treat, cure, or prevent any medical condition.

**CDSCO (Medical Devices Rules 2017):**
- General health intended use keeps the product outside CDSCO SaMD classification; no India-facing marketing claim may constitute diagnosis or treatment of a named disorder

**Telemedicine Practice Guidelines 2020 — Therapist Portal (Phase 2):**
- Therapist registration verified against NMC or state medical council before portal access is granted
- Therapist name, qualifications, and registration number displayed on the platform
- Informed consent documented before any user↔therapist data sharing occurs

### Phase 2 — US Market (HIPAA)

- Supabase BAA must be in place before any PHI is accepted from US users
- PHI encrypted at rest using AES-256; encrypted in transit using TLS 1.3 minimum
- Full PHI audit log with user-level and field-level access tracking
- PostgreSQL Row Level Security enforced on all PHI-containing tables
- **Architecture constraint:** MVP data model and RLS policies must be HIPAA-compatible by design — no schema migration permitted at Phase 2 US launch

### Phase 2 — EU/UK Market (GDPR)

- Health data treated as special category under Article 9; explicit consent required for each processing purpose
- Data subject rights honoured: access, rectification, erasure, portability
- Qualifying breaches reported to the relevant supervisory authority within 72 hours

### Phase 3 — EU AI Act

- Mental health AI features are likely classified as high-risk; compliance architecture must be designed for this classification before any Phase 3 AI features are deployed

## Innovation Analysis

### Market Gap

No competitor occupies the self-directed ERP space for social anxiety in India:

| Competitor | Positioning | Critical Gap |
|---|---|---|
| Amaha (India) | 500+ self-care activities, AI chatbot (Allie), therapist access | No ERP protocol; no graduated exposure hierarchy |
| Tele MANAS (India, Gov) | Free government mental health helpline | Crisis support only; no structured self-directed protocol |
| iCall (India, NGO) | Free counsellor-mediated phone and chat | Counsellor-dependent; no self-directed app; no ERP |
| Wysa | AI chatbot CBT; 5M+ users; FDA Breakthrough Device Designation | Generic CBT only; no exposure hierarchy; not India-built |
| Headspace | Mindfulness + AI CBT module (April 2025); 40M+ users globally | No ERP; wellness positioning; not India-contextualised |
| NOCD / Noto | Therapist-mediated ERP; 44% OCD symptom reduction | OCD-only; therapist-mediated; US-focused; insurance-dependent |
| Woebot | AI CBT consumer chatbot | Consumer app shut down mid-2025 — space vacated |
| Sanvello | CBT + mindfulness + peer community | No ERP; generic anxiety; no India contextualisation |
| Bloom | Social anxiety CBT exercises | Western market only; no ERP hierarchy depth |

### Differentiation

**Protocol depth:** The only consumer app with a structured ERP protocol for social anxiety. NOCD proved the ERP model at scale (44% OCD symptom reduction in a therapist-mediated context); no app has productised self-directed ERP for social anxiety.

**India-native design:** Exposure templates, community matching, and psychoeducation are built for Indian users — joint family dynamics, workplace hierarchies, marriage pressure, and the specific social anxiety presentations of urban Indian life. Not adapted from Western content.

**Privacy moat:** 92% of mental health apps transmit user data to third parties. Exposure Buddy does not. DPDPA 2023 compliance and zero-data-broker architecture are a core trust differentiator in a market where health data privacy is an active concern.

**Offline-first for real exposures:** Users complete exposures in environments with unreliable connectivity — local trains, markets, rural areas. Full offline functionality with automatic sync eliminates session data loss as a friction point.

**Android-first for India's market reality:** Android represents ~95% of India's smartphone market. Mid-range device and low-bandwidth optimisation are structural requirements, not afterthoughts.

**Primary strategic risk:** Wysa holds India presence, FDA validation, and a large user base. If Wysa adds a graduated exposure hierarchy, cultural design depth and ERP protocol fidelity become the primary moats. NOCD/Noto global expansion is a medium-term risk; their therapist-mediated, insurance-dependent US model is structurally disadvantaged in India's therapist-scarce environment.

## Project-Type Requirements

### Cross-Platform (Three-Surface)

- **Android (primary):** React Native; target profile — 2GB RAM minimum, Android 10+, 4G or intermittent connectivity; all features must meet performance NFRs on this profile
- **iOS:** React Native; iOS 16+ support; feature parity with Android except where platform capability differs
- **Web:** React; last 2 major versions of Chrome, Firefox, and Safari; responsive layout for desktop and tablet

### Offline-First Architecture

- All core ERP session flows — pre-session briefing, real-time SUDS logging at all intervals, debrief — must function without network connectivity
- Session data written to local storage during active exposure; automatic background sync within 30 seconds of connectivity restoration; no user action required
- Crisis resource contacts stored locally and displayed without a network call

### Internationalisation

- MVP launches English content only
- All user-facing strings externalised to a localisation layer from day one; no hardcoded UI strings permitted in code
- Layout system supports RTL rendering for future locale additions; RTL is implemented at MVP even if no RTL language launches at MVP

### Device and Connectivity Targets

- Primary target: mid-range Android, 2GB RAM, Android 10+, 4G with intermittent drops
- App renders and functions without degradation under 4G or lower-bandwidth conditions for all core ERP flows
- No feature requires persistent connectivity during an active ERP session

### Crisis Safety Infrastructure

- Crisis keyword detection operates entirely on-device using a hardcoded keyword list; no user-entered text is sent to any external service for crisis detection
- Crisis resource contacts are hardcoded strings — not fetched from a remote configuration — ensuring availability without connectivity
- SOS panic button rendered in a persistent UI layer accessible from any screen during an active session without a screen navigation event

### Device Permissions

- **Push notifications:** Device push token registration and the permission-request flow are implemented (Story 8.1); FR-NOTIF-01 (the original driver for this permission) is deferred post-MVP — see FR Coverage Map — so no MVP feature currently consumes the registered token. Local notifications (the daily reminder, FR-NOTIF-03 / Story 8.2) use the same OS permission family but do not require server push
- **Local storage:** Required for offline session data persistence (NFR-OFFLINE-01/02) and on-device crisis resource availability (NFR-OFFLINE-03); no permission prompt is required on Android or iOS for standard app local storage; this access is granted implicitly at install

### App Store Compliance

- **Google Play (Android):** Mental health app content policy requires inclusion of crisis support resources for apps addressing mental health — market-configured crisis contacts satisfy this requirement; no unsubstantiated health claims ("treats", "cures", "diagnoses" anxiety) may appear in store listing, app description, or in-app copy; intended-use declaration in Domain Requirements governs all claim language
- **Apple App Store (iOS):** Rule 5.1.1 (health/medical) requires apps that offer health-related services to clearly disclose scope and limitations; the medico-legal disclaimer (FR-SAFE-01) and intended-use declaration satisfy this requirement; apps in the mental health category must provide crisis resources — satisfied by FR-CRISIS-01; the 18+ age gate (FR-SAFE-01) satisfies age-rating requirements

## Functional Requirements

### Authentication

- **FR-AUTH-01:** Users authenticate using email address or phone number; both paths use OTP verification
- **FR-AUTH-02:** Logged-out users access all 3 preview challenges without authentication; progress from preview challenges is not persisted unless the user creates an account
- **FR-AUTH-03:** The sign-in screen defaults to the **Create account** tab on a device that has never had a successful sign-in, and to the **Sign in** tab on any device where at least one successful sign-in has previously occurred. The "device has authed before" state is persisted in encrypted MMKV under key `auth.hasAuthedBefore`; it survives Sign out (so a returning user lands on Sign in after signing out) and is cleared only on app reinstall (which rotates the MMKV encryption key)
- **FR-AUTH-04:** Users authenticate using email address or phone number with a password, as an alternative to OTP verification; account creation via the password path is gated by the same mandatory safety checkboxes (FR-SAFE-01) as the OTP path
- **FR-AUTH-05:** Users with an email-identifier password account can request a password-reset email and set a new password via a deep link, without needing account recovery support. *(Gated behind `EXPO_PUBLIC_ENABLE_PASSWORD_RESET`, default off, until custom SMTP is provisioned — see FR Coverage Map decision record. Phone-identifier password accounts have no reset path at MVP — documented gap.)*

### Sign-Up Safeguards

- **FR-SAFE-01:** Account creation presents two mandatory checkboxes before the creation action executes: (1) confirmation that the user is 18 years of age or older; (2) confirmation that Exposure Buddy is a general health and wellness app and its content is not valid for medico-legal proceedings. The account creation action is disabled until both boxes are checked

### Onboarding

- **FR-ONBOARD-01:** Users complete the 3-item mini-SPIN questionnaire during onboarding (each item scored 0–4, maximum score 12); three-tier response: score 0–3 — no message, proceed to app; score 4–5 — inline soft advisory shown, no tap required, user proceeds; score ≥6 — full referral screen with market-configured crisis resource contacts, explicit acknowledgement tap required before proceeding; full app access granted after acknowledgement at any score; ≥6 referral threshold requires clinical input before go-live in each launch market
- **FR-ONBOARD-02:** Users complete a 3–4 question conversational symptom check followed by a 15-item safety behaviour checklist during onboarding; responses are stored and used to personalise the initial hierarchy template suggestions
- **FR-ONBOARD-03:** Psychoeducation on the anxiety cycle is presented inline immediately before the user's first exposure is introduced; the avoidance explainer is presented at the moment a safety behaviour item is selected — not as a standalone front-loaded module

### Exposure Readiness Gate

- ~~**FR-GATE-01:** The exposure hierarchy is locked until the user completes at least one qualifying prerequisite: one complete thought record session or one complete somatic technique session; gate lifts automatically on completion without user action~~ **REMOVED** — The exposure hierarchy is immediately accessible after onboarding; no prerequisite session is required before building the courage ladder.

### Exposure Hierarchy

- **FR-HIER-01:** Users build a personalised exposure hierarchy by selecting from neutral templates; each item receives a SUDS rating (0–10) assigned by the user
- **FR-HIER-02:** Users add custom hierarchy items beyond the available template library; custom items receive the same SUDS rating and stall tracking as template items
- **FR-HIER-03:** After 2 consecutive ERP sessions on the same hierarchy item with no measurable SUDS reduction between sessions, the system surfaces a stall prompt recommending the user step down to an easier item

### ERP Session Flow

- **FR-ERP-01:** Each ERP session executes three sequential phases: pre-session briefing → active exposure with SUDS logging → structured debrief; users cannot skip or reorder phases
- **FR-ERP-02:** During the active exposure phase, users log SUDS ratings (0–10 scale) at self-initiated intervals; each log entry records timestamp and SUDS value
- **FR-ERP-03:** The debrief screen renders a SUDS arc graph plotting entry score, all mid-session log entries, and exit score; the debrief prompts structured reflection on what happened and what was learned
- **FR-ERP-04:** If a session is aborted during the active exposure phase, the partial attempt is logged without displaying a failed-session count, negative XP, or streak-reset language; the acknowledgement message confirms partial data was saved; all SUDS entries recorded before abort are retained in progress history

### CBT Techniques

- **FR-CBT-01:** The thought record captures six fields in sequence: situation, automatic thought, emotion and intensity rating (0–10), evidence supporting the thought, evidence against the thought, and balanced thought
- **FR-CBT-02:** The cognitive distortion library presents named distortion patterns with definitions; users can tag their automatic thoughts with one or more distortion types during thought record completion
- **FR-CBT-03:** The behavioural experiment tool captures five fields: hypothesis (the anxious prediction), planned experiment, predicted outcome, actual outcome after the experiment, and revised belief rating (0–100%)

### Somatic Techniques

- **FR-SOM-01:** Users access six somatic techniques: 4-7-8 breathing, box breathing, Bhramari, Nadi Shodhana, 5-4-3-2-1 grounding, body scan
- **FR-SOM-02:** Each somatic technique presents an animated visual guide pacing the user through the exercise; completion of any technique requires no audio output — the visual guide is sufficient

### Daily Check-In and Routing

- **FR-CHECKIN-01:** The daily check-in captures one SUDS-scale rating (0–10) from the user; score ≥7 routes to somatic techniques as the primary recommendation; score 4–6 routes to grounding techniques; score 1–3 routes to cognitive work or exposure as the primary recommendation

### Progress Tracking

<!-- FR-PROG-01 (SUDS trend graph, weekly/monthly) and FR-PROG-02 (chronological exposure history log) were previously listed here; deferred post-MVP 2026-06-21, scope reduction for closed beta (Story 8.5, the Achievements tab). See the FR Coverage Map entry in epics.md for the full decision record. The underlying session/SUDS data continues to be captured at MVP — only the in-app visualisation is deferred. -->

### Re-Engagement Notifications

- **FR-NOTIF-02:** Notification content contains no streak counters, missed-day counts, streak-reset warnings, or loss-framing constructs ("you're about to lose", "don't break your streak")
- **FR-NOTIF-03:** Users control notification delivery timing and can opt out of individual notification types from app settings; opt-out is honoured immediately
<!-- FR-NOTIF-01 (Day 2/Day 5 re-engagement push notifications) was previously listed here; deferred post-MVP 2026-06-21, scope reduction for closed beta (Story 8.4). See the FR Coverage Map entry for the full decision record. -->
<!-- FR-NOTIF-04 (window-close push at 3h post-session) was previously listed here; deferred post-MVP 2026-06-15 alongside removal of home States 7 and 8 (Story 5.6 / Issue #36). See the FR Coverage Map entry for the full decision record. -->


### Crisis Detection and Safety

- **FR-CRISIS-01:** A hardcoded keyword pre-filter runs on user-entered text fields; detection of a crisis keyword triggers an immediate in-app display of Tier 1 and Tier 2 crisis resources; contacts are market-configured hardcoded strings that display without a network call
- **FR-CRISIS-02:** The crisis keyword list covers English and Hindi; the list is embedded in the client and updated via app release, not remote configuration
- **FR-CRISIS-03:** An SOS panic button is rendered persistently on all screens during an active ERP session; activating it launches a breathing coach and 5-4-3-2-1 grounding sequence in an overlay that does not terminate or navigate away from the active session

### Internationalisation

- **FR-I18N-01:** All user-facing strings are externalised to a localisation layer; no UI string is hardcoded in application code; English is the only content locale at MVP launch
- **FR-I18N-02:** The layout system renders correctly in RTL mode; RTL support is implemented at MVP even if no RTL language launches at MVP

### Analytics

- **FR-ANALYTICS-01:** First-party analytics capture two Day 1 primary metrics: (1) core loop retention — percentage of Day 1 users who complete at least one ERP session within their first 24 hours; (2) SUDS cadence — percentage of active ERP sessions containing ≥2 SUDS log entries
- **FR-ANALYTICS-02:** No user health data, session content, SUDS records, or personally identifiable information is transmitted to any third-party analytics, advertising, or data-broker service

## Non-Functional Requirements

### Performance

- **NFR-PERF-01:** The app loads to the home screen in under 3 seconds at the 90th percentile on the target device profile (mid-range Android, 2GB RAM, Android 10+, 4G) as measured by synthetic device testing in CI before each release
- **NFR-PERF-02:** ERP session SUDS log operations — from user tap to confirmed local write — complete in under 500ms on the target device profile as measured by instrumented performance testing
- **NFR-PERF-03:** Daily check-in submission routes the user to the recommended technique screen in under 1 second from tap on the target device profile

### Offline Reliability

- **NFR-OFFLINE-01:** All three ERP session phases (pre-session briefing, active SUDS logging, debrief) function fully and without data loss when the device has no network connectivity at any point during the session
- **NFR-OFFLINE-02:** Session data logged during offline ERP sessions syncs automatically within 30 seconds of connectivity restoration; no user action is required to initiate sync; no log entry is lost
- **NFR-OFFLINE-03:** Crisis resource contacts are stored on-device and display without a network call at all times

### Reliability

- **NFR-REL-01:** The backend API achieves 99.5% uptime during the primary business hours of the active launch market as measured by uptime monitoring at 1-minute resolution; Phase 1 India scope: 06:00–24:00 IST
- **NFR-REL-02:** If the app crashes during an active ERP session, all SUDS log entries recorded before the crash are recoverable on the first restart following the crash; no in-session data is permanently lost

### Security and Compliance

- **NFR-SEC-01:** All user health data (anxiety ratings, SUDS records, session logs, symptom check responses, safety behaviour checklist data) is encrypted at rest using AES-256 and in transit using TLS 1.3 minimum
- **NFR-SEC-02:** Row Level Security is enforced on all database tables containing user health data; cross-user data access is blocked at the database layer with no application-layer bypass permitted
- **NFR-SEC-03:** DPDPA 2023 consent records store four required fields: timestamp (UTC), purpose ID, consent version, and withdrawal status; records are retained for account lifetime plus 2 years and are included in data principal access requests
- **NFR-SEC-04:** The system activates HIPAA and GDPR compliance enforcement for Phase 2 markets without requiring migration of existing user data
- **NFR-SEC-05:** A Data Protection Officer is appointed and their contact information is published in the app's privacy notice before India launch
- **NFR-SEC-06:** Crisis keyword detection runs entirely on-device using a hardcoded list; no user-entered text is transmitted to any external service for crisis detection processing

### Device and Platform Compatibility

- **NFR-DEVICE-01:** All screens render without layout breakage and all functional requirements are met on mid-range Android devices with minimum 2GB RAM running Android 10+
- **NFR-DEVICE-02:** All screens render without layout breakage and all functional requirements are met on iOS 16+ and on the last 2 major versions of Chrome, Firefox, and Safari

### Accessibility

- **NFR-ACCESS-01:** All interactive UI elements have accessible labels; minimum tap target size is 44×44 density-independent pixels; colour contrast ratios meet WCAG 2.1 Level AA — 4.5:1 for normal text, 3:1 for large text and UI components

### Scalability

- **NFR-SCALE-01:** The backend supports 10,000 concurrent active users at India launch as validated by load testing completed before go-live
