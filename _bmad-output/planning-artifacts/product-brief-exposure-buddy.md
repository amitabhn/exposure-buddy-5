---
title: "Product Brief: Exposure Buddy"
status: "draft"
created: "2026-05-07"
updated: "2026-05-07"
inputs:
  - docs/ANXIETY_APP_PRODUCT_SPEC.md
  - _bmad-output/planning-artifacts/research/market-exposure-therapy-apps-anxiety-consumer-research-2026-05-05.md
  - _bmad-output/planning-artifacts/research/technical-react-native-vs-flutter-mobile-mental-health-app-research-2026-05-05.md
  - _bmad-output/planning-artifacts/research/technical-backend-architecture-real-time-anxiety-tracking-app-research-2026-05-05.md
---

# Product Brief: Exposure Buddy

## Executive Summary

The global treatment gap for mental health disorders is sharpest in high-growth, therapist-scarce markets where effective interventions remain cost-prohibitive, inaccessible, and heavily stigmatised. For the hundreds of millions managing social anxiety worldwide, the most effective treatment — Exposure Response Prevention (ERP) therapy — is out of reach for the vast majority. India illustrates the scale: 197 million people living with mental health disorders, fewer than 9,000 psychiatrists, and a treatment gap exceeding 80%.

Exposure Buddy is a cross-platform mobile and web app that puts self-directed ERP in users' hands: guiding them through graduated real-world exposures, tracking anxiety reduction in real time, and connecting users with accountability partners and optionally a verified therapist. It is the first consumer app to deliver a structured ERP protocol specifically for social anxiety — launching in India, designed for the cultural realities of urban Indian life.

The mental health app market in Asia-Pacific grows at 17.55% CAGR. No incumbent — not Amaha, not the government's Tele MANAS, not any international app — offers self-directed ERP for social anxiety. The MVP launches in India; Phase 1 delivers the India-specific compliance and localisation layer; Phase 2 expands to English-speaking international markets.

## The Problem

India's mental health treatment crisis is structural. With only ~0.7 psychiatrists per 100,000 people (WHO recommends 3), therapy is not just expensive — it is simply unavailable for most of the country. Social anxiety disorder, which affects an estimated 25–30 million Indians, goes largely unaddressed. The stigma of seeking help compounds the access problem: in joint family environments and hierarchical workplaces, admitting anxiety is perceived as weakness. People suffer silently.

The government's Tele MANAS helpline and NGO services like iCall offer free support, but neither provides the structured ERP protocol that clinical evidence identifies as the most effective intervention for anxiety. The apps that do exist — Amaha (India's largest mental health app), Wysa, and international wellness apps — offer CBT content, breathing exercises, and mood tracking. None deliver a graduated exposure hierarchy.

The cruelest irony is the avoidance paradox: the people who most need exposure therapy are most motivated to avoid it. Social anxiety drives avoidance of the very situations that, faced repeatedly, would resolve it. An app without scaffolding, accountability, and in-the-moment support will always lose to avoidance. This is why the category keeps failing, and why Exposure Buddy is built around the protocol that actually works — not generic wellness content.

## The Solution

Exposure Buddy guides users through the clinical ERP protocol at consumer scale, adapted for the Indian context:

**Exposure Hierarchy Builder** — Users construct a personalised anxiety ladder (easy → moderate → difficult challenges) based on their specific social triggers — speaking up in meetings, navigating family pressure, assertiveness with authority, social situations. Evidence-based templates cover India-specific cultural scenarios.

**Session Flow** — For each exposure: pre-session briefing (what to expect, why it works), real-time SUDS (Subjective Units of Distress Scale) logging during the challenge, and a structured debrief. Users see their anxiety arc — spike and then habituation — live on screen. This is the "aha moment": anxiety drops when you don't flee it.

**In-the-Moment SOS** — Panic support, breathing coach, and grounding exercises accessible mid-session. The app travels to the office meeting, the family function, the crowded local train.

**Progress Tracking & Streaks** — Visual SUDS trend graphs, exposure completion history, gamified streak mechanics, and milestone badges build identity as someone who faces fears rather than avoids them.

**Accountability Community** — Small anonymous groups (4–6 users) matched by exposure type. A public wins feed shares exposure completions without identifiable details. Community matched by cultural context (workplace anxiety, family situations, social settings).

**Therapist Portal** — A free dashboard for verified clinicians to assign custom challenges, view session progress, and export summaries for session prep. Therapist registration verified against NMC/state medical council database before access is granted.

**Sign-Up Safeguards** — On registration, users must affirmatively confirm two things: (1) they are 18 years of age or older, and (2) they acknowledge that Exposure Buddy is a general health and wellness app and its content is not valid for medico-legal purposes. Both are required checkboxes before account creation proceeds.

## What Makes This Different

**India-first, not India-adapted.** Most mental health apps are built for Western markets and localised as an afterthought. Exposure Buddy's exposure templates, community matching, and cultural framing are designed from the ground up for Indian users — joint family dynamics, workplace hierarchies, marriage pressure, and the specific forms social anxiety takes in Indian urban life.

**The only self-directed ERP app for social anxiety in India.** NOCD proved the ERP model at scale — 44% OCD symptom reduction — but is OCD-only, therapist-mediated, and US-focused. Amaha, India's largest mental health app, offers no ERP protocol. No consumer app has productised self-directed ERP for social anxiety in India. That is the white space.

**DPDPA-compliant, zero data brokers.** 92% of mental health apps transmit user data to third parties. Exposure Buddy does not. This is a core trust promise — *your anxiety data is yours alone* — built for a market where data privacy is an increasingly live concern. DPDPA 2023 compliance from day one, with explicit granular consent for every data purpose.

**Offline-first for real-world exposures.** Users do exposures in places with unreliable connectivity — local trains, markets, rural areas. The app works fully offline and syncs when connectivity returns. No session data is lost during an active exposure.

**Android-first.** Android represents ~95% of the Indian smartphone market. The app is optimised for mid-range Android devices and low-bandwidth connections, not just flagship iPhones.

## Who This Serves

**Urban Professional (ages 22–38) — India Launch Cohort:** Working in IT, finance, or services in Bangalore, Mumbai, Delhi, Hyderabad, or Pune. Experiences social anxiety in workplace settings — presenting to seniors, navigating hierarchy, asserting themselves in meetings — and in social situations shaped by family pressure and expectations. Smartphone-native. Discovers the app via Google Play Store or WhatsApp-driven peer recommendation.

**Secondary — The Therapy Adjunct User (ages 25–50):** Already working with a therapist or counsellor. Uses the app for between-session ERP homework. Lower acquisition cost, higher retention. In India, this segment is urban, educated, and often navigating dual pressures of career and family.

**Tertiary — The Student / Early-Career User (ages 18–26):** First-time mental health tool user. Dealing with college stress, social comparison, and anxiety about career or relationships. Attracted by peer community and gamification. High download volume, essential for community density.

**Underserved — The Post-Therapy Maintainer (ages 28–50):** Completed a course of ERP or CBT and needs ongoing support for relapse prevention. No competitor serves this segment — therapy ends, support disappears. High LTV, low churn.

## Competitive Landscape

No competitor currently occupies the self-directed ERP space for social anxiety in India:

| Competitor | Approach | Critical Gap |
|---|---|---|
| **Amaha** (India) | 500+ self-care activities, AI chatbot (Allie), therapist access, structured CBT/mindfulness courses | No ERP protocol; no graduated exposure hierarchy; India-focused but wellness-only |
| **Tele MANAS** (India, Govt) | Free government mental health helpline and app | Crisis support only; no structured therapy protocol; not scalable for self-directed ERP |
| **iCall** (India, NGO) | Free counselling via phone and chat | Counsellor-dependent; no self-directed app; no ERP |
| **Wysa** | AI chatbot CBT; 5M+ users; FDA Breakthrough Device Designation; India presence | Generic CBT only; no exposure hierarchy; no graduated ERP; not India-built |
| **Headspace** | Mindfulness + AI CBT module (April 2025); 40M+ users globally | No ERP; wellness positioning; not India-contextualised |
| **NOCD / Noto** | Therapist-mediated ERP for OCD; 44% symptom reduction; acquired Rebound Health (PTSD) Jan 2026 | OCD-only; therapist-mediated; US-focused; insurance-dependent |
| **Woebot** | AI CBT consumer chatbot; 2M+ downloads globally | **Shut down consumer app mid-2025** — vacated the space |
| **Sanvello** | CBT + mindfulness + peer community | No ERP; generic anxiety; no India contextualisation |
| **Bloom** | Social anxiety CBT exercises (Western market) | No India focus; no ERP hierarchy depth; limited scale |

**Strategic read:** Amaha is the most relevant India competitor but has no ERP capability and is focused on general wellness. The government's free services (Tele MANAS, iCall) define a price floor but not a feature ceiling — they create no direct competition for structured ERP. NOCD/Noto's global expansion is a medium-term risk if they enter India; their US-based therapist-mediated model is poorly suited to India's therapist scarcity, giving Exposure Buddy's self-directed approach a structural advantage.

Wysa is the strongest incumbent to watch: it has India presence, FDA validation, and a large user base. Its gap is the absence of ERP — if Wysa adds graduated exposure hierarchy, Exposure Buddy's India-native cultural design and structured protocol depth become the primary moats.

## Success Criteria

**Clinical outcomes:**
- ≥30–40% anxiety reduction (SUDS scores) at 8 weeks of active use
- >70% exposure completion rate per session — defined as: session initiated + exposure step completed + end-of-session SUDS logged
- Documented habituation arc (SUDS peaks and drops) on ≥80% of completed sessions

**Retention and engagement:**
- >60% 30-day retention (vs. 3–4% category average)
- <5% monthly churn for paid subscribers
- 2–4× conversion rate for users who complete one full exposure before paywall

**Phase 1 launch objectives (Year 1):**
- 10,000 MAU within 12 months of India launch
- 100+ active verified clinician users generating referrals within 12 months
- 1–2 corporate wellness pilot contracts (B2B India channel)

## Scope & Roadmap

**MVP — Core Platform:**
- Anxiety profile and personalised exposure hierarchy builder
- Full ERP session flow: briefing → real-world exposure → SUDS logging → debrief
- In-the-Moment SOS: panic support, breathing coach, grounding
- Progress tracking: SUDS trend graphs, streaks, milestone badges
- Sign-up safeguards: age confirmation (18+) and medico-legal disclaimer (required checkboxes)
- Cross-platform: Android + iOS + web (React Native + React)
- Security baseline: AES-256 at rest, TLS 1.3, RLS on all health data tables

**Phase 1 — India Launch:**
- DPDPA 2023-compliant infrastructure (explicit consent flows, DPO appointed)
- Hindi language support; English as primary content locale
- India-contextualised exposure templates (workplace hierarchy, family dynamics, social settings)
- India national crisis helplines hardcoded and available offline
- Android-primary optimisation: mid-range device performance (2GB RAM, Android 10+), low-bandwidth resilience

**Phase 2 — Global English Markets (Months 7–18):**
- US and international English launch
- HIPAA-compliant infrastructure layer added for US market
- Full therapist dashboard: real-time session monitoring, custom challenge assignment, clinical review notes
- Skill-building modules: conversation practice, assertiveness, boundary-setting
- Thought reframing (CBT cognitive restructuring)
- Premium Therapist tier (₹2,499–7,999/mo India; $29–99/mo US, up to 20 clients)
- Psychoeducation library
- Additional Indian language support (Marathi, Tamil, Telugu)

**Phase 3 — Scale (Year 2):**
- AI adaptive pacing (personalised hierarchy progression)
- Apple Health / Health Connect biometric integration
- B2B India employer wellness channel (₹150–400 PEPM)
- Clinical outcomes publication and payer/insurer partnership pathway
- Wearable integration (Terra SDK)

**Explicitly out of MVP:** Wearable SDK integration, AI personalization, location-based exposure suggestions, role-play video practice, advanced analytics, biometric integration.

## Regulatory & Compliance

### Phase 1 Launch Market — India

India has no direct HIPAA equivalent. The governing framework is the **Digital Personal Data Protection Act 2023 (DPDPA)** with DPDP Rules 2025 (full enforcement by May 2027). DISHA (the proposed sector-specific healthcare privacy law) was never enacted; its provisions were folded into DPDPA. Key obligations:

**Data protection (DPDPA 2023):**
- Health data (anxiety ratings, session logs, mental health history) is sensitive personal data requiring explicit, granular, documented consent for each processing purpose
- Consent must be freely given with an equally simple withdrawal mechanism; separate consent required for any third-party sharing (e.g., therapist data access)
- Breach notification: immediate report to the Data Protection Board + detailed 72-hour follow-up
- Honor data principal rights: access, correction, and erasure on request
- Appoint a Data Protection Officer (DPO) before India launch

**Sign-up safeguards (required at account creation):**
- **Age gate:** User must affirmatively check a box confirming they are 18 years of age or older. DPDPA 2023 requires verifiable parental consent for users under 18; the 18+ gate eliminates this obligation and reduces clinical risk.
- **Medico-legal disclaimer:** User must check a box acknowledging: *"I understand that Exposure Buddy is a general health and wellness app. Its content, session data, and reports are not intended for and are not valid for use in medico-legal proceedings."* Both checkboxes are mandatory; account creation is blocked without both.

**Medical device regulation (CDSCO):**
- General health apps that avoid diagnostic or therapeutic claims are not classified as medical devices under CDSCO Medical Devices Rules 2017 (confirmed by Draft Guidance on Medical Device Software, October 2025)
- Exposure Buddy's general health intended use keeps it outside CDSCO scope, provided no India-facing marketing claims constitute diagnosis or treatment of any named disorder

**Intended use (India):** Exposure Buddy is a general health app providing behavioural wellness tools and guided exercises for stress and anxiety management. It is not intended to diagnose, treat, cure, or prevent any medical condition.

**Therapist-linking (Telemedicine Practice Guidelines 2020):**
- Verify therapist registration against NMC or state medical council before portal access
- Display therapist name, qualifications, and registration number on platform
- Document informed consent before any data sharing between user and linked therapist

### US & International (Phase 2)

**Intended use (US):** Same general health framing as India — keeps the product outside FDA SaMD classification under current enforcement discretion. Revisit classification posture once RCT data is published; clinical evidence may support a formal Digital Therapeutic (DTx) pathway.

**HIPAA infrastructure:** Supabase Team Plan + HIPAA add-on with BAA in place before accepting any PHI from US users. PostgreSQL Row Level Security, AES-256 encryption at rest, TLS 1.3 in transit, full PHI audit log. This layer is added for Phase 2 US launch — India infrastructure runs DPDPA-compliant on the same Supabase stack.

The FDA's November 2025 Digital Health Advisory Committee signals a tightening regulatory environment for AI mental health devices. Apps with evidence-based protocols and proactive compliance built in will have an advantage as risk-stratified oversight expands globally.

## The Vision

In three years, Exposure Buddy is India's go-to app for self-directed anxiety management — a product that verified therapists recommend, corporate wellness programmes offer, and users return to across life stages. It is the bridge that closes the gap between "I can't afford therapy" and "I'm managing my anxiety," built for the country with the world's largest unaddressed mental health burden. With a proven India model and published outcome data, it expands globally: same ERP protocol, same trust infrastructure — localised for each market. It demonstrates that technology, built around evidence-based behavioural tools, can meet the scale and affordability the crisis demands.
