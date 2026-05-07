---
title: "Feature & Milestone Tracker: Exposure Buddy"
status: "draft"
created: "2026-05-07"
updated: "2026-05-07"
note: "Comprehensive feature list for team organization. All features drawn from product spec, technical research, and market analysis. Organize phases and priorities as needed."
---

# Feature & Milestone Tracker: Exposure Buddy

---

## Phase 1 — MVP (Target: Months 1–6)

### Onboarding & Anxiety Profile
- [ ] Welcome flow explaining ERP therapy and how the app works
- [ ] Anxiety type assessment (social anxiety focus: public speaking, social situations, assertiveness, vulnerability)
- [ ] Symptom severity screening (mild / moderate / severe — for safety escalation gating)
- [ ] Personalized anxiety profile creation
- [ ] Safety screen: escalation prompt for severe/crisis presentations (directs to crisis resources)
- [ ] Account creation: email/social login, biometric re-auth gate for PHI access

### Exposure Hierarchy Builder
- [ ] Template library: pre-built social anxiety exposure hierarchies (speaking up in meetings, introducing yourself, making phone calls, eating in public, etc.)
- [ ] Custom challenge creation: user-defined exposures with difficulty rating (1–10 SUDS estimate)
- [ ] Hierarchy ladder UI: drag-and-drop ranking of challenges by difficulty
- [ ] Safety behavior identification: checklist of common avoidance behaviors per challenge type
- [ ] Challenge categorization: by social context (workplace, social, romantic, family, public)
- [ ] Difficulty tiers: Easy (1–3), Moderate (4–6), Difficult (7–10)

### ERP Session Flow
- [ ] Pre-session briefing screen: what to expect, rationale for exposure, safety behavior to resist
- [ ] Session timer with optional duration setting
- [ ] Real-time SUDS logger: 0–10 scale check-ins at configurable intervals (e.g., every 2 min)
- [ ] Anxiety arc visualization: live graph showing SUDS over session time
- [ ] Habituation prompt: contextual message when SUDS drops ("Your anxiety is dropping — this is habituation working")
- [ ] Post-session debrief: what happened, SUDS peak vs end, what the user learned
- [ ] Session completion celebration: reinforcement message + XP award
- [ ] Session abort flow: gentle exit with no-shame messaging, log partial attempt

### In-the-Moment SOS & Support
- [ ] SOS panic button: accessible from any screen during active session
- [ ] Breathing coach: 4-7-8 and box breathing with animated visual guide
- [ ] Grounding exercise: 5-4-3-2-1 sensory grounding with step-by-step prompts
- [ ] Cognitive reminder cards: pre-written coping statements user can personalize
- [ ] "Why this works" quick reference: brief psychoeducation available during session

### Progress Tracking & Gamification
- [ ] SUDS trend dashboard: weekly and monthly anxiety reduction graphs
- [ ] Exposure completion history: log of all completed sessions with SUDS data
- [ ] Streak counter: daily exposure streak with fire emoji milestone markers
- [ ] XP points system: +10 (lesson), +25 (exposure), +50 (difficult challenge)
- [ ] Level progression: named levels (e.g., "Anxiety Challenger" at 600 XP)
- [ ] Badge system: "Conversation Master," "Rejection Warrior," "Vulnerability Master," "7-Day Streak," "30-Day Streak," etc.
- [ ] Anonymous leaderboard: top 10 exposure completers (no names, exposure count only)
- [ ] Weekly summary: exposures completed, SUDS improvement, challenges faced

### Community & Accountability
- [ ] Anonymous wins feed: public feed of completed exposure descriptions (no identifying info)
- [ ] Small accountability groups: 4–6 users manually matched by exposure type
- [ ] Commitment partner matching: pair for a specific high-stakes challenge
- [ ] Group check-in: weekly group thread for accountability
- [ ] Community guidelines enforcement: reporting, moderation tools (basic)

### Basic Therapist Portal (MVP)
- [ ] Clinician account creation: free tier, email verification, license number (optional at MVP)
- [ ] Client linking: unique code for client to link their account to therapist
- [ ] Session progress export: PDF/CSV download of client's SUDS data and exposure history
- [ ] Session summary view: read-only view of client's recent sessions
- [ ] HIPAA-compliant data handling: therapist access audited, RLS policies enforced

### Notifications & Engagement
- [ ] Gentle daily reminder: user-controlled timing and frequency
- [ ] Streak at-risk nudge: notification when streak about to break (optional, user-controlled)
- [ ] New challenge suggestion: "Ready for your next exposure?" prompt
- [ ] Weekly progress digest: summary of the week's progress
- [ ] Notification opt-out: granular controls per notification type

### Monetization (MVP)
- [ ] Free tier: full exposure hierarchy builder, 1–2 sessions/week, basic progress tracking, community access
- [ ] Premium Individual ($4.99–9.99/mo): unlimited sessions, full SUDS analytics, offline access, advanced gamification
- [ ] Freemium paywall moment: triggered AFTER user completes first successful exposure (not during onboarding)
- [ ] 14-day free trial of premium
- [ ] In-app subscription management: upgrade, downgrade, cancellation

### Infrastructure & Compliance (MVP — non-negotiable)
- [ ] Supabase Team Plan + HIPAA add-on + BAA signed before any PHI accepted
- [ ] PostgreSQL Row Level Security: all PHI isolated at database engine level
- [ ] AES-256 encryption at rest; TLS 1.3 in transit
- [ ] HIPAA PHI audit log: all SELECT/INSERT/UPDATE/DELETE on PHI tables logged
- [ ] Offline-first architecture: Outbox Pattern for local SQLite writes, background sync queue
- [ ] CRDT conflict resolution: for concurrent offline/online writes
- [ ] Event sourcing: append-only `session_events` table (SessionStarted, ExposureStarted, SUDSLogged, ExposureEnded, SessionCompleted, SessionAborted)
- [ ] React Native (iOS + Android) + React web: cross-platform from day one
- [ ] CI/CD pipeline: GitHub Actions (unit tests → migration dryrun → staging → integration tests → prod deploy)
- [ ] Error tracking: Sentry (PHI scrubber configured, no PHI in error payloads)
- [ ] Product analytics: PostHog self-hosted (PHI-safe)
- [ ] Biometric re-authentication: gate for accessing PHI views (FaceID / fingerprint)

---

## Phase 2 — Growth (Target: Months 7–12)

### Full Therapist Dashboard
- [ ] Real-time session monitoring: live SUDS data during client active session
- [ ] Custom challenge assignment: create and assign specific exposures to clients
- [ ] Custom hierarchy building: therapist-designed exposure ladder for specific client
- [ ] Clinical review notes: add notes to client sessions (visible only to therapist)
- [ ] Client roster management: add/remove clients, view all client statuses
- [ ] Progress summary generation: auto-generate session prep notes
- [ ] Secure messaging: HIPAA-compliant in-app messaging between therapist and client
- [ ] Premium Therapist tier ($29–99/mo): up to 20 clients, all dashboard features, export tools

### Skill-Building Modules
- [ ] Conversation starters module: structured practice scenarios for initiating conversation
- [ ] Assertiveness training: boundary-setting, saying no, expressing needs — with practice exercises
- [ ] Workplace social skills: speaking in meetings, asking questions, receiving feedback
- [ ] Social skills for dating/relationships: asking someone out, vulnerability, conflict
- [ ] Public speaking primer: structured skill-building before exposure ladder
- [ ] Module completion tracking: progress through skill modules, linked to hierarchy

### Thought Reframing (CBT Core)
- [ ] Thought record form: situation → automatic thought → emotion → evidence for/against → balanced thought
- [ ] Common cognitive distortions library: fortune-telling, mind-reading, catastrophizing, etc.
- [ ] Reframing practice exercises: guided CBT worksheet flow
- [ ] Saved thought records: review past reframes, track thinking pattern changes
- [ ] Integration with session debrief: prompt for thought record after exposure

### Advanced Community Features
- [ ] Community challenge events: app-wide "challenge week" for specific exposure type
- [ ] Accountability partner matching improvements: algorithm by exposure type, severity, timezone
- [ ] Community milestone celebrations: group celebration when member hits major milestone
- [ ] Anonymous AMA threads: licensed therapist Q&A sessions within community

### Psychoeducation Library
- [ ] "How anxiety works" interactive module (anxiety cycle, fight/flight/freeze)
- [ ] "What is ERP?" explainer with clinical evidence summary
- [ ] "Safety behaviors explained" — why avoidance maintains anxiety
- [ ] "Understanding SUDS" — how to use the scale effectively
- [ ] "Habituation vs sensitization" — what to expect during exposures
- [ ] Articles library: curated clinical resources (licensed, cited)
- [ ] Progress-gated content: unlock advanced psychoeducation as user completes exposures

### Family / Support Network Tier
- [ ] Family member account: linked to primary user, view (not edit) progress
- [ ] Support person notifications: gentle updates on milestones reached
- [ ] Family tier pricing ($19.99/mo): primary + up to 3 support persons
- [ ] Support person guide: how to support someone doing ERP (psychoeducation for supporters)

---

## Phase 3 — Scale (Target: Year 2)

### AI Adaptive Pacing
- [ ] Exposure progression model: AI recommends next challenge based on SUDS history and completion patterns
- [ ] Adaptive difficulty: auto-adjusts hierarchy step timing based on habituation speed
- [ ] Personalized coaching messages: context-aware encouragement based on session data (not generic)
- [ ] Anxiety spike prediction: flag risk of session avoidance based on SUDS trajectory
- [ ] Note: Requires BAA with AI/LLM provider before sending any session content

### Biometric Integration
- [ ] Apple HealthKit integration: import heart rate, HRV during sessions
- [ ] Android Health Connect integration: equivalent Android health data
- [ ] Biometric + SUDS correlation: "your heart rate dropped 15% — habituation confirmed"
- [ ] Optional wearable display: show real-time HR during session (from paired wearable)
- [ ] Context-aware prompts based on physiological state

### Wearable SDK Integration (Phase 3+)
- [ ] Terra SDK integration: unified API for Garmin, Oura Ring, Fitbit, Whoop, Apple Watch
- [ ] Real-time sensor streaming: MQTT-over-WebSocket for 1–5Hz HR data during sessions
- [ ] Wearable-triggered SOS: detect elevated HR + no SUDS log → prompt support check-in

### B2B / Employer Wellness Channel
- [ ] Employer dashboard: aggregate (anonymized) team wellness metrics
- [ ] Employee invitation flow: employer distributes access codes
- [ ] B2B pricing: $2–6 PEPM (per employee per month) employer contract tier
- [ ] Usage reporting: HR-facing compliance and engagement reports (fully anonymized)
- [ ] EAP integration pathway: connect with Employee Assistance Programs
- [ ] Insurance / payer partnership pathway: PEPM contract model (NOCD/Cigna reference)

### India Market Launch
- [ ] Hindi language support: full UI and content translation
- [ ] Regional language support: Marathi, Tamil, Telugu (evaluate by demand)
- [ ] India-specific exposure content: workplace hierarchy, family dynamics, marriage pressure, joint family context
- [ ] Localized pricing: ₹200–500/month subscription tiers
- [ ] India payment methods: UPI, Paytm, credit/debit
- [ ] India-specific community: regional language groups, cultural context matching
- [ ] Corporate wellness partnerships: B2B India enterprise channel (fastest-growing segment)

### Clinical Outcomes & Research
- [ ] De-identified outcomes dataset: aggregate SUDS reduction, completion rates (IRB protocol required)
- [ ] Research partnership program: university collaboration for RCT studies
- [ ] Clinical outcomes publication: peer-reviewed evidence for payer reimbursement pathway
- [ ] Payer reimbursement application: CPT code exploration, insurer partnership outreach
- [ ] FDA regulatory review: assess De Novo pathway necessity as AI features expand

---

## Phase 4 — Expansion (Target: Year 3+)

### Condition Expansion Beyond Social Anxiety
- [ ] Panic disorder module: dedicated hierarchy + interoceptive exposure exercises
- [ ] Generalized anxiety disorder (GAD) module: worry exposure, uncertainty tolerance
- [ ] Specific phobias module: spiders, heights, flying — VR integration candidate
- [ ] OCD lite module: compulsion response prevention (distinct from NOCD's therapist model)
- [ ] PTSD support module (adjacent, evaluate carefully — higher clinical risk, regulatory scrutiny)

### Advanced Clinical Features
- [ ] Video role-play practice: recorded practice scenarios for high-anxiety social situations
- [ ] Location-based exposure suggestions: GPS-triggered "you're near a coffee shop — ready for your ordering challenge?"
- [ ] Crisis detection + escalation: real-time PHQ-9 / GAD-7 screening, auto-escalation to crisis text line if threshold breached
- [ ] Telehealth integration: in-app booking with partner therapist network
- [ ] Medication tracking (optional): log medication + correlate with SUDS trends (with clinician opt-in)

### Platform Expansion
- [ ] Web app full feature parity: all mobile features available on web
- [ ] Apple Watch companion app: quick SUDS log from wrist during exposure
- [ ] API for clinician EMR integration: export session data to Epic, Athena, etc. (HL7 FHIR format)

---

## Technical Milestones (Cross-Phase)

### MVP Technical Gates (Phase 1 — must complete before launch)
- [ ] HIPAA infrastructure in place: Supabase Team + BAA + RLS + audit log
- [ ] Offline sync verified: Outbox Pattern + CRDT tested for conflict scenarios
- [ ] Security audit: third-party penetration test + vulnerability assessment
- [ ] HIPAA breach response runbook: documented, tested, on-call rotation in place
- [ ] App Store submission: iOS App Store + Google Play Store listings
- [ ] Web deployment: React web app deployed to production domain

### Phase 2 Technical
- [ ] Database branching workflow: Supabase feature branch isolation for team development
- [ ] Advanced RLS: therapist permission policies (read client data, assign challenges, leave notes)
- [ ] CQRS read models: materialized views for therapist dashboard (`therapist_dashboard_client_snapshot`)
- [ ] Push notification infrastructure: FCM + APNs with user-controlled frequency settings
- [ ] Realtime WebSocket: Supabase Realtime for therapist live session monitoring

### Phase 3 Technical
- [ ] AI/LLM integration: BAA with AI provider, PHI-safe prompt architecture
- [ ] MQTT-over-WebSocket: HiveMQ/EMQX for wearable sensor stream (1–5Hz HR data)
- [ ] Wearable SDK: Terra SDK integration for unified wearable access
- [ ] Multi-language infrastructure: i18n framework, RTL support preparation
- [ ] Connection pool scaling: PgBouncer tuning for 5K+ DAU threshold

---

## Go-to-Market Milestones

### Pre-Launch
- [ ] Clinical advisory board: 2–3 licensed social anxiety / ERP specialists onboarded
- [ ] Clinical review of exposure hierarchy templates
- [ ] Beta program: 50–100 users from r/socialanxiety with structured feedback loop
- [ ] App Store Optimization: condition-specific keywords ("social anxiety app," "ERP therapy app")
- [ ] Therapist outreach: 10 pilot therapists using free portal before public launch
- [ ] Reddit presence: establish authentic presence in r/socialanxiety, r/anxiety before launch

### Launch (Month 6)
- [ ] Reddit launch post: r/socialanxiety (moderator-coordinated, not ad)
- [ ] Licensed therapist AMA on Reddit: launch week
- [ ] App Store launch: iOS + Android simultaneous
- [ ] Press outreach: mental health journalists, therapist bloggers, podcast outreach
- [ ] Kati Morton / YouTube therapist partnership outreach

### Post-Launch Growth
- [ ] 100 MAU → 1,000 MAU: Reddit community + ASO as primary channels
- [ ] 10 therapist referrers → 100: free portal + clinical outcome data sharing
- [ ] First clinical outcomes data: 8-week cohort analysis published (blog/preprint)
- [ ] Corporate wellness pilot: 1–2 employer pilot contracts
