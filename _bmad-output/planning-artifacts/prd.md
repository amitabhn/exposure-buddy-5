---
stepsCompleted: ["step-01-init", "step-02-discovery"]
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
  complexity: "medium-high — clinical ERP protocol fidelity, crisis detection, tri-jurisdiction compliance trajectory, offline/connectivity design"
  projectContext: "greenfield"
  primaryFailureMode: "Mode 2 — user quits (avoidance)"
  complianceTrajectory:
    mvp: "DPDPA 2023 (India) — health data as special category, explicit granular consent, DPO required, 72-hour breach notification"
    phase2: "HIPAA (US) — Supabase BAA, RLS enforcement, PHI audit log, AES-256 + TLS 1.3; UK/EU GDPR — special category health data, data subject rights, supervisory authority notification"
    phase3: "EU AI Act — high-risk AI classification likely for mental health AI features; CDSCO SaMD monitoring for India"
    architectureNote: "MVP data model and RLS policies must be HIPAA-compatible and GDPR-compatible by design to avoid data layer rebuild at Phase 2"
mvpScope:
  in:
    - "Taste experience: 3 preview challenges; logged-in → home; logged-out → Sign In / Sign Up / Try a Challenge"
    - "Auth: email or phone + OTP"
    - "SPIN questionnaire (17-item): track assignment; mandatory referral screen for SPIN ≥ 40"
    - "Conversational symptom check (3–4 questions) + safety behaviour checklist (15-item)"
    - "Psychoeducation inline (not front-loaded): anxiety cycle before first exposure; avoidance explainer at safety behaviour selection"
    - "Exposure readiness gate: ≥1 prerequisite (thought record OR somatic session) before fear ladder unlocks"
    - "Exposure hierarchy builder: neutral templates, SUDS 0–10 per item, stall logic (2 stalls = step down)"
    - "ERP session flow: pre-session briefing → SUDS logging → debrief"
    - "CBT techniques: thought record, cognitive distortion library, behavioural experiment"
    - "Somatic techniques: 4-7-8, box breathing, Bhramari, Nadi Shodhana, 5-4-3-2-1 grounding, body scan"
    - "Daily check-in → technique routing: score ≥7 somatic first; 4–6 grounding; 1–3 cognitive/exposure"
    - "Progress tracking: SUDS trend graph, exposure history"
    - "Re-engagement notifications: Day 2 + Day 5; warm language; no streak/guilt"
    - "Crisis keyword detection: hardcoded pre-filter, English + Hindi, Tier 1/2, iCall/Vandrevala/NIMHANS hardcoded"
    - "SOS panic button: breathing coach + grounding, accessible mid-session"
    - "i18n architecture: English content only; framework supports Hindi, other Indian regional, and international languages"
    - "DPDPA 2023 compliance (non-negotiable)"
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
