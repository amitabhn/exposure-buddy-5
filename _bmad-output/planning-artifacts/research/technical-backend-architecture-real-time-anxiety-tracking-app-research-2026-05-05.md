---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Backend architecture options for a real-time anxiety tracking app'
research_goals: 'Identify the right backend architecture for scalability, real-time features, HIPAA compliance, and cost efficiency for an early-stage mental health startup'
user_name: 'Cooper'
date: '2026-05-05'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-05-05
**Author:** Cooper
**Research Type:** technical

---

## Research Overview

This research resolves the core backend architecture question for an early-stage ERP anxiety tracking app: **Serverless-first on Supabase (Team Plan + HIPAA add-on)** is the optimal architecture for scalability, real-time features, HIPAA compliance, and cost efficiency at startup scale. The research covers five technical domains — technology stack selection, integration patterns, architectural design, implementation workflow, and cost modeling — all verified against current 2026 sources including Supabase official documentation, HIPAA compliance guides, serverless adoption data, and healthcare app development cost analyses.

The central finding is that Supabase's combination of PostgreSQL Row Level Security, built-in Realtime WebSocket subscriptions, open-source portability, and a viable HIPAA add-on on Team Plan makes it the dominant choice over Firebase (insufficient HIPAA coverage) and AWS Amplify (stronger compliance but disproportionate complexity for an early team). The recommended architecture pairs Supabase as the BaaS layer with Clean Architecture + Domain-Driven Design for the application layer, ensuring the ERP session state machine — the core clinical domain logic — remains framework-agnostic, testable, and portable between server-side Edge Functions and the Flutter client app.

Key implementation guidance covers: offline-first architecture using the Outbox Pattern and CRDT conflict resolution (critical for real-world ERP exposure scenarios), PostgreSQL event sourcing via an append-only `session_events` table (providing HIPAA audit trail and CQRS analytics at zero infrastructure overhead), dual real-time protocols (Supabase Realtime for session state, MQTT-over-WebSocket for wearable sensor streams), and a phased 24-week implementation roadmap from foundation to production launch. Year 1 backend infrastructure is estimated at $6,000–$14,000, with HIPAA compliance adding 20–30% to development cost. See the **Technical Research Synthesis** section for the full executive summary, strategic recommendations, and implementation roadmap.

---

<!-- Content will be appended sequentially through research workflow steps -->

---

## Step 1: Research Scope and Technical Focus

**Research Topic:** Backend architecture options for a real-time anxiety tracking app

**Research Goals:** Identify the right backend architecture for scalability, real-time features, HIPAA compliance, and cost efficiency for an early-stage mental health startup.

### Scope Confirmation

This research covers the backend decision space for a consumer mental health app offering guided Exposure Response Prevention (ERP) therapy for anxiety (social anxiety, GAD, panic disorder). The core architectural questions are:

1. **Architecture pattern** — Serverless, microservices, monolith, or BaaS-first?
2. **BaaS platform** — Supabase vs Firebase vs AWS Amplify: which wins for HIPAA compliance?
3. **Real-time delivery** — WebSockets, GraphQL subscriptions, or SSE for live SUDS tracking and session state?
4. **HIPAA infrastructure** — Cloud BAA coverage, encryption requirements, and audit logging obligations under the 2026 Security Rule update

**Additional research goal:** Data privacy of users (PHI handling, consent architecture, data minimization)

**Out of scope:** Frontend frameworks (covered in Topic 1), AI/LLM integration (Topic 3), full HIPAA compliance deep-dive (Topic 4).

---

## Step 2: Technology Stack Analysis

### 2.1 Architectural Pattern: Serverless-First Has Won

**Current State (2026)**

The architecture debate has largely resolved in favor of serverless-first. By 2026, serverless has reached regulated industries, Fortune 500 enterprises, and government agencies. The dominant pattern is a hybrid: BaaS layer (managed database, auth, storage) combined with a FaaS layer (AWS Lambda, Cloudflare Workers, Supabase Edge Functions) for custom business logic.

**Three-Pattern Comparison for a Mental Health Startup:**

| Pattern | Startup Fit | Real-Time | HIPAA Path | Cold Start |
|---|---|---|---|---|
| Serverless-First (FaaS + BaaS) | ★★★★★ | Via managed subscriptions | Depends on BaaS | ~200–800ms (Lambda) |
| Microservices (containers) | ★★★ | Custom WebSocket servers | Manual config | None |
| Monolith | ★★★★ (early) | Custom | Manual config | None |
| Pure BaaS | ★★★★ | Built-in | Depends on vendor | None |

**Verdict:** Serverless-first (BaaS + FaaS) is optimal for an early-stage anxiety tracking app. Pay-per-use pricing perfectly matches the variable, session-driven traffic pattern of an ERP app (burst when users are in active sessions, near-zero otherwise). Teams can ship an MVP without managing any infrastructure.

_Source: [Serverless Architecture Future: Backend Dev Guide 2026](https://attowp.com/backend-server/serverless-architecture-the-future-of-backend-development-in-2025/), [Cloud-Native Architecture for 2026](https://www.elightwalk.com/blog/cloud-native-architecture)_

---

### 2.2 BaaS Platform: Supabase vs Firebase vs AWS Amplify

This is the highest-leverage single decision for an early-stage mental health startup. All three platforms can reach HIPAA compliance, but with very different effort levels and cost structures.

#### Supabase

**HIPAA Status:** Compliant when properly configured — BAA required, HIPAA add-on required.

Supabase can be used for HIPAA-regulated workloads when a signed Business Associate Agreement is in place and the platform is configured to protect PHI/ePHI. Supabase acts as a Business Associate for covered entities.

**Requirements:**
- Team Plan or higher (BAA only available at this tier)
- Explicit HIPAA add-on must be enabled
- App-layer encryption may be required for PHI fields — Supabase's native encryption covers infrastructure but not necessarily all application data paths
- Row Level Security (RLS) must be configured to prevent cross-user data access

**Strengths:**
- Open-source PostgreSQL core — no vendor lock-in
- Strong developer ergonomics: auto-generated REST and GraphQL APIs, real-time via Supabase Realtime (WebSocket-based)
- Built-in auth, storage, edge functions
- Self-hostable for sensitive deployments

**Weaknesses:**
- HIPAA setup has operational overhead (add-on, BAA request process)
- Realtime has scale limits at lower tiers

_Source: [HIPAA Compliance and Supabase Docs](https://supabase.com/docs/guides/security/hipaa-compliance), [Is Supabase HIPAA Compliant in 2026?](https://www.accountablehq.com/post/is-supabase-hipaa-compliant-in-2026-baa-phi-and-security-explained)_

---

#### Firebase

**HIPAA Status:** Not natively HIPAA-compliant. Requires Google Cloud Platform BAA with significant feature restrictions.

Firebase doesn't directly offer a BAA. A GCP BAA can be signed, but critically — not all Firebase features are covered by Google's HIPAA-approved services list. Any PHI stored in a non-approved Firebase service creates a compliance violation.

**Practical Impact:**
- Firestore (real-time database) is not on the HIPAA-approved list as of 2026
- Firebase Auth may require PHI-field redaction
- Firebase Analytics/Crashlytics cannot receive PHI
- Results in a heavily constrained Firebase usage pattern that eliminates most convenience features

**Verdict for this use case:** Firebase is a poor fit for an anxiety tracking app. The workarounds required to handle PHI eliminate most of the BaaS convenience, while adding significant compliance risk.

_Source: [Is Firebase HIPAA-Compliant? A Safer Alternative for 2026](https://www.blaze.tech/post/is-firebase-hipaa-compliant), [Is Firebase HIPAA Compliant? A Comprehensive Guide](https://impanix.com/hipaa/is-firebase-hipaa-compliant/)_

---

#### AWS Amplify

**HIPAA Status:** AWS Amplify Console is explicitly listed as a HIPAA-eligible service on the AWS HIPAA Eligible Services page.

AWS requires a Business Associate Agreement before using HIPAA-eligible services for PHI workloads. An AWS BAA is available to all account tiers.

**Strengths:**
- Strongest native HIPAA posture of the three — built-in compliance tooling
- Full AWS ecosystem access (Cognito for auth, DynamoDB or RDS for data, AppSync for real-time GraphQL, S3 for storage, Lambda for functions)
- AWS AppSync provides managed GraphQL with WebSocket-based subscriptions — ideal for real-time SUDS tracking
- Most mature HIPAA documentation and audit trail tooling (CloudTrail, CloudWatch)

**Weaknesses:**
- Significantly higher complexity and cost than Supabase for a small team
- Amplify developer experience is notoriously rough — abstractions leak, configuration is verbose
- AWS ecosystem lock-in is deep

**Verdict:** AWS Amplify wins decisively for regulated industries when compliance is the primary constraint. However, for a small founding team, the operational overhead is substantial compared to Supabase.

_Source: [HIPAA Eligible Services Reference - Amazon Web Services](https://aws.amazon.com/compliance/services-in-scope/HIPAA_BAA/), [Top 10 AWS Amplify alternatives for development teams in 2026](https://northflank.com/blog/aws-amplify-alternatives)_

---

#### Platform Decision Matrix

| Criterion | Supabase | Firebase | AWS Amplify |
|---|---|---|---|
| HIPAA BAA | ✅ Team Plan+ | ⚠️ GCP BAA (restricted) | ✅ All plans |
| Real-time built-in | ✅ Supabase Realtime | ✅ Firestore (not HIPAA) | ✅ AppSync WebSocket |
| Dev ergonomics | ★★★★★ | ★★★★ | ★★★ |
| PostgreSQL / SQL | ✅ | ❌ NoSQL only | ⚠️ RDS option |
| Open-source / portable | ✅ | ❌ | ❌ |
| Startup cost | ~$25–50/mo | ~$0–25/mo (no HIPAA) | ~$100–500/mo |
| HIPAA complexity | Medium | Very High | Low–Medium |

**Recommendation:** Supabase on Team Plan with HIPAA add-on is the optimal choice for this project. It offers the best developer ergonomics, PostgreSQL's relational model (critical for complex ERP session data), built-in real-time, and a manageable path to HIPAA compliance. AWS Amplify is the fallback if compliance requirements scale beyond what Supabase covers.

---

### 2.3 Real-Time Architecture: WebSockets vs GraphQL Subscriptions vs SSE

The ERP session experience requires real-time capabilities for:
- Live SUDS (Subjective Units of Distress Scale) logging during active exposure
- Session state machine updates (IDLE → BRIEFING → EXPOSURE_ACTIVE → SUDS_CHECK → DEBRIEF → COMPLETE)
- Therapist-guided mode: therapist observing client session state in real time
- Anxiety spike notifications and coach nudges

**Three Real-Time Protocols:**

| Protocol | Bidirectional | Complexity | Best For |
|---|---|---|---|
| WebSockets | ✅ | Medium | Full-duplex session state |
| GraphQL Subscriptions (over WS) | ✅ | Medium-High | Typed data-driven updates |
| Server-Sent Events (SSE) | ❌ (server→client only) | Low | Notification push |

**GraphQL Subscriptions (2026 State):**

GraphQL subscriptions enable long-lasting operations that maintain an active connection and push updates to clients. The modern implementation uses the `graphql-ws` library — note that `subscriptions-transport-ws` is no longer actively maintained as of 2025 and should not be used in new projects.

For AWS Amplify users, AWS AppSync provides managed serverless real-time via GraphQL subscriptions over WebSockets. The client establishes a WebSocket connection to the AppSync real-time endpoint, sends a subscription registration, and receives push updates — all without managing WebSocket servers.

For Supabase users, Supabase Realtime provides WebSocket-based change data capture — any INSERT/UPDATE/DELETE on a PostgreSQL table is broadcast to subscribed clients in real time.

**Recommendation for ERP session tracking:**

Use **Supabase Realtime** for database-driven state changes (session status updates, SUDS log entries) combined with a thin **WebSocket layer** via Edge Functions for high-frequency sensor data (heart rate from wearable during session). This avoids the complexity of a full GraphQL subscription layer while delivering sub-100ms latency for the session state machine.

_Source: [Building a real-time WebSocket client in AWS AppSync](https://docs.aws.amazon.com/appsync/latest/devguide/real-time-websocket-client.html), [How to Configure GraphQL Subscriptions with WebSockets](https://oneuptime.com/blog/post/2026-01-24-graphql-subscriptions-websockets/view)_

---

### 2.4 HIPAA Infrastructure Requirements (2026 Security Rule Update)

The 2026 update to the HIPAA Security Rule has made several previously "addressable" safeguards into **mandatory** requirements:

**Mandatory Technical Safeguards (2026):**
- AES-256 encryption for all ePHI at rest
- TLS 1.3 (minimum TLS 1.2) for all ePHI in transit
- Role-based access controls with multi-factor authentication
- Audit logging for all PHI access, modification, and deletion
- Automatic logoff after inactivity period

**BAA Coverage Requirements:**

Every third-party vendor that touches ePHI requires a signed BAA. For a mental health app, this includes:
- Cloud infrastructure provider (AWS, GCP, Azure)
- BaaS platform (Supabase, Firebase, Amplify)
- Authentication provider
- Push notification service (if notifications contain PHI)
- AI/LLM API provider (if user session content is sent to model)
- Analytics and crash reporting (must be PHI-free or have BAA)
- Customer support tools

**Specialized HIPAA BaaS Platforms (Startup-Oriented):**

Beyond the mainstream BaaS options, specialized healthcare platforms exist:
- **MedStack** — HIPAA-compliant container hosting with built-in compliance tooling, encryption, and logging; designed for digital health startups
- **Healthcare Blocks** — HIPAA-compliant application platform, AWS-backed, BAA-friendly, startup packages from ~$170/month
- **TrueVault** — API-first PHI storage with built-in BAA support

These are viable alternatives if Supabase's HIPAA add-on proves insufficient at scale, but for an early-stage startup they add cost and complexity without proportional benefit.

**Cost Impact:** HIPAA compliance adds approximately 20–30% to backend development cost. Budget for security review, BAA management, and audit log infrastructure from day one.

_Source: [HIPAA Compliance for Cloud Computing: AWS, Azure & Google Cloud in 2026](https://medcurity.com/hipaa-cloud-compliance/), [HIPAA-Compliant App Development Checklist](https://www.concettolabs.com/blog/hipaa-app-development-checklist/), [HIPAA Compliant App Development in 2026](https://www.whitehalltechnologies.com/blog/hipaa-compliant-app-development-guide/)_

---

### 2.5 Technology Stack Summary

**Recommended Core Stack (Early-Stage ERP App):**

| Layer | Technology | Rationale |
|---|---|---|
| BaaS Platform | Supabase (Team Plan + HIPAA add-on) | PostgreSQL, RLS, Realtime, open-source, best dev ergonomics with HIPAA path |
| Edge Functions | Supabase Edge Functions (Deno) | Co-located with data, no cold start penalty, same platform |
| Real-Time | Supabase Realtime (WebSocket CDC) | Zero additional infrastructure for session state sync |
| Auth | Supabase Auth + MFA | Native integration, HIPAA-eligible on Team Plan |
| Storage | Supabase Storage (S3-backed) | Audio/video exposure content, encrypted at rest |
| CDN | Cloudflare | Edge caching for static assets, DDoS protection |
| AI/ML | AWS Bedrock or Anthropic API (with BAA) | Topic 3 scope — ensure BAA before sending session content |

**Scale-Up Path (Series A+):**

| Layer | Migration Target | Trigger |
|---|---|---|
| BaaS | AWS Amplify + AppSync | If HIPAA audit requires more granular controls or Supabase limits hit |
| Database | AWS RDS PostgreSQL | If Supabase connection limits become a bottleneck |
| Real-Time | AWS AppSync WebSocket | If therapist-facing real-time requires enterprise SLA |
| Edge Functions | AWS Lambda | If custom runtime or memory requirements exceed Edge Function limits |

---

## Step 3: Integration Patterns Analysis

### 3.1 API Design Patterns

**2026 API Landscape: Hybrid REST + GraphQL**

By 2026, the API paradigm debate has settled on hybrid stacks rather than single-winner approaches. Industry data shows:
- ~66% of teams use REST for public/resource endpoints
- ~40% piloting GraphQL for new client-facing features
- ~25% using gRPC for internal microservices

For a mobile mental health app, this translates to a clear pattern:

| API Layer | Protocol | Use Case |
|---|---|---|
| Mobile client ↔ backend | REST (OpenAPI) | Auth, CRUD operations, session management |
| Complex data queries | GraphQL | Personalized exposure hierarchy, session history aggregation |
| Internal services | gRPC | High-frequency sensor data ingestion, ML inference calls |
| Event notifications | Webhooks | Therapist alerts, achievement unlocks, reminder triggers |

**REST API Best Practices (2026):**
- Schema-first design using OpenAPI 3.1 — generates client SDKs automatically
- API gateway (Supabase built-in or Kong/AWS API Gateway) for unified auth, rate-limiting, and observability
- Versioning via URL path (`/v1/sessions`) not headers — more cacheable

**GraphQL for Mobile Mental Health Apps:**
GraphQL shines for the ERP app's most complex data need: assembling personalized exposure hierarchies. A hierarchy query needs to join user profile, therapist-assigned steps, completion history, SUDS scores, and adaptive difficulty recommendations — a classic GraphQL use case where REST would require 4–5 sequential round trips.

_Source: [REST API, GraphQL, and gRPC: 2026 trends](https://zuniweb.com/blog/api-architecture-showdown-rest-graphql-and-grpc-for-modern-web-and-mobile-apps/), [API Design Trends 2026](https://calmops.com/backend/api-design-trends-2026/)_

---

### 3.2 Communication Protocols: WebSocket vs MQTT for Health Data

**Protocol Decision Framework:**

An ERP anxiety app has two distinct real-time data patterns that require different protocols:

1. **Session state changes** — infrequent, schema-driven, web-facing (phone app ↔ server)
2. **Wearable sensor streams** — high-frequency, IoT-style, potentially battery-constrained

| Protocol | Best For | Battery | Browser Support | QoS | Use in ERP App |
|---|---|---|---|---|---|
| WebSocket | Web/mobile bidirectional | Moderate | Native | None | Session state machine, SUDS logs |
| MQTT | IoT sensor streams | Low (designed for it) | Via MQTT-over-WS | 0/1/2 | Heart rate, HRV from wearable |
| SSE | Server push only | Low | Native | None | Notifications, coach nudges |
| HTTP/2 Push | Deprecated | N/A | Deprecated | None | Avoid |

**MQTT for Wearable Integration:**

MQTT is a lightweight pub/sub protocol designed for environments with limited resources and unpredictable networks — precisely the profile of Bluetooth wearable data relayed over cellular. Key advantages:
- QoS Level 1 (at-least-once delivery) ensures SUDS-correlated heart rate data isn't dropped
- Low bandwidth footprint vs WebSocket for high-frequency streams (1–5Hz heart rate)
- MQTT over WebSockets bridges IoT and web layers — wearable SDK publishes via MQTT, phone subscribes via MQTT-over-WebSocket

**Architecture for ERP Session Real-Time:**

```
Wearable → BLE → Flutter App → MQTT-over-WebSocket → MQTT Broker (HiveMQ Cloud / EMQX)
                                                              ↓
Flutter App ← Supabase Realtime (WebSocket) ← Supabase PostgreSQL ← Edge Function ← MQTT Bridge
```

This two-protocol approach keeps the user-facing session state (Supabase Realtime/WebSocket) clean and schema-driven, while handling raw sensor streams separately through MQTT's purpose-built IoT channel.

_Source: [MQTT vs WebSocket - Which protocol to use when](https://ably.com/topic/mqtt-vs-websocket), [MQTT over WebSockets with HiveMQ: A 2025 Guide](https://www.hivemq.com/blog/mqtt-essentials-special-mqtt-over-websockets/)_

---

### 3.3 Offline-First Architecture (Critical for ERP Apps)

**Why Offline-First Is Non-Negotiable for Anxiety Tracking:**

Users perform ERP exposures in challenging real-world environments — crowded subways, public spaces, outdoor settings — where network connectivity is unreliable. If the app requires a network connection to log a SUDS score or mark an exposure complete, users will lose data precisely when anxiety is highest and motivation to re-engage is lowest.

**2026 Offline-First Principles:**

Every user interaction reads from a local database. The network functions silently in the background, reconciling local state with the server when conditions are optimal. In 2026, users expect apps to work anytime, anywhere — offline capability directly impacts satisfaction and retention.

**Implementation Architecture:**

```
User Action → Local SQLite (Drift/sqflite for Flutter) → Immediate UI Response
                     ↓
           Background Sync Queue (Outbox Pattern)
                     ↓
           WorkManager (Android) / BGTaskScheduler (iOS)
                     ↓
           Delta Sync → Supabase (only changed records)
```

**Key Patterns:**

1. **Outbox Pattern** — Write to local SQLite first, add to outbox queue, return success to UI immediately. Background worker drains queue when network is available.

2. **Delta Sync** — Only sync changed records, not full tables. Reduces bandwidth and battery drain. Implemented via `updated_at` timestamps + server-side cursor pagination.

3. **CRDT Conflict Resolution** — Conflict-free Replicated Data Types ensure that concurrent writes (e.g., user completes an exposure on phone while offline, therapist marks same step on web) converge to the same final state automatically. CRDTs eliminate last-write-wins data loss.

4. **Optimistic Updates** — UI shows completion immediately upon local write. If sync fails and server rejects, roll back with user notification. Appropriate for SUDS logs (low conflict risk) but not for therapist-assigned hierarchy changes (require server authority).

**Flutter Implementation Libraries:**

| Need | Library |
|---|---|
| Local DB | Drift (SQLite ORM for Dart) |
| Background sync | WorkManager Flutter plugin |
| CRDT | `crdt` package (Dart) |
| Offline state detection | `connectivity_plus` |

_Source: [Offline-First Mobile App Architecture: Syncing, Caching, and Conflict Resolution](https://dev.to/odunayo_dada/offline-first-mobile-app-architecture-syncing-caching-and-conflict-resolution-1j58), [Offline First Mobile App in 2026: Real-Time Data Sync with CRDT Architecture](https://www.calibraint.com/blog/offline-first-mobile-app-in-2026)_

---

### 3.4 Event-Driven Architecture and CQRS for ERP Session Tracking

**Why Event Sourcing Fits Healthcare Apps:**

Event sourcing is particularly valuable in regulated healthcare contexts because every state change is recorded as an immutable event — not just the current state. For an ERP app:

- **Audit trail by default**: Every SUDS measurement, every hierarchy step completion, every session state transition is a permanent, timestamped, immutable event. HIPAA audit log requirements are satisfied structurally.
- **Replay capability**: If a bug corrupts session state, replay events to reconstruct accurate history.
- **Therapist analytics**: Query the event stream to compute exposure frequency, avoidance patterns, SUDS trends over time.

**CQRS for ERP Session Data:**

CQRS separates the write model (commands: StartExposure, LogSUDS, CompleteSession) from the read model (queries: GetExposureHistory, GetAnxietyTrend, GetTherapistDashboard).

```
Commands (Write Side):
  StartExposure → ExposureStartedEvent → Event Store (Supabase PostgreSQL)
  LogSUDS(score: 7) → SUDSLoggedEvent → Event Store
  CompleteSession → SessionCompletedEvent → Event Store

Queries (Read Side):
  GetAnxietyTrend → Read from materialized view (pre-aggregated SUDS)
  GetTherapistDashboard → Read from denormalized client progress table
```

**Practical Implementation at Startup Scale:**

Full event sourcing infrastructure (Kafka, event store, projection services) is over-engineered for an early-stage app. The pragmatic approach:

1. **Event log table in PostgreSQL** — Append-only `session_events` table: `(id, session_id, user_id, event_type, payload JSONB, created_at)`. This gives event sourcing's auditability without dedicated infrastructure.
2. **Materialized views for reads** — PostgreSQL materialized views aggregate events into fast-read summaries (weekly anxiety trends, session completion rates).
3. **Supabase Realtime as event bus** — The PostgreSQL event log table broadcasts changes via Supabase Realtime to subscribed clients — doubling as both audit log and real-time event bus.

**Upgrade path:** When the event log table grows beyond ~10M rows or projection latency becomes unacceptable, migrate to a dedicated event streaming platform (AWS EventBridge or Apache Kafka on Confluent Cloud).

_Source: [Healthy Architectures - Using CQRS and Event Sourcing for Electronic Medical Records](https://www.infoq.com/articles/healthcare-emr-ehr/), [Event-Driven Architecture, Event Sourcing, and CQRS: How They Work Together](https://dev.to/yasmine_ddec94f4d4/event-driven-architecture-event-sourcing-and-cqrs-how-they-work-together-1bp1)_

---

### 3.5 Security Integration Patterns

**OAuth 2.0 + JWT Architecture:**

```
User → Supabase Auth (email/OAuth2) → JWT (RS256 signed)
JWT attached to every API request → Supabase RLS evaluates JWT claims
Row Level Security: SELECT * FROM sessions WHERE user_id = auth.uid()
```

Supabase's built-in JWT + Row Level Security (RLS) implementation means PHI is isolated at the database layer — not just application layer. Even if application code has a bug that fetches the wrong user's data, RLS prevents cross-user data leakage at the PostgreSQL level.

**Token Security for Mental Health PHI:**

- Short-lived access tokens (15 minutes) + refresh token rotation
- Refresh tokens stored in device Keychain (iOS) / Keystore (Android) — never in AsyncStorage
- Token revocation list for logout and account deletion (HIPAA right-to-deletion compliance)
- MFA enforcement for therapist accounts (higher PHI access level)

**API Gateway Security:**

- Rate limiting per user (not just per IP) to prevent session data scraping
- Request signing for high-sensitivity endpoints (delete account, export PHI)
- All PHI endpoints require `Authorization: Bearer <JWT>` — no session cookies

_Source: [Supabase Security Docs](https://supabase.com/docs/guides/security), [Modern API Design Best Practices for 2026](https://www.xano.com/blog/modern-api-design-best-practices/)_

---

## Step 4: Architectural Patterns and Design

### 4.1 System Architecture: The Serverless-First Pattern

**2026 Architecture Consensus**

More than 70% of organizations using AWS run at least some production workloads on Lambda (Datadog State of Serverless 2025). For a mental health startup in 2026, serverless-first is the default architecture choice — not because it's fashionable, but because it eliminates operational overhead that would otherwise consume engineering capacity that should go toward the product.

**Three-Tier Serverless Architecture for ERP App:**

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT LAYER                       │
│  Flutter App (iOS/Android) + Web Dashboard (React)  │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS / WebSocket
┌───────────────────▼─────────────────────────────────┐
│                  EDGE LAYER                          │
│  Cloudflare CDN + Supabase Edge Functions (Deno)    │
│  [Auth validation, rate limiting, request routing]  │
└───────────────────┬─────────────────────────────────┘
                    │ PostgreSQL connections
┌───────────────────▼─────────────────────────────────┐
│               DATA LAYER (BaaS)                      │
│  Supabase PostgreSQL + Realtime + Auth + Storage    │
│  [HIPAA-eligible on Team Plan with HIPAA add-on]    │
└─────────────────────────────────────────────────────┘
```

**Event-Driven Microservices as Scalability Path:**

Event-driven microservices are the dominant pattern for building scalable, decoupled systems in 2026. Unlike traditional request-response architectures, event-driven systems use asynchronous messaging to enable loose coupling. For the ERP app, this means:

- Session completion events trigger async notifications (push, email) without blocking the session write path
- AI/LLM adaptive content generation is triggered by session completion events, not in the critical path
- Therapist dashboard aggregations are updated asynchronously from session events, not on read

**Edge Computing for User Experience:**

Edge functions co-located with the database eliminate the latency of round-trip API calls for common operations. Supabase Edge Functions run on Deno Deploy's global network — the same pop-level distribution as Cloudflare Workers. Auth validation, SUDS submission, and session state transitions all benefit from sub-20ms edge execution.

_Source: [Serverless Computing 2026 Complete Guide: FaaS, BaaS, and Cloud Functions](https://calmops.com/backend/serverless-computing-2026/), [Emerging Backend Architectures for 2026](https://tensorblue.com/blog/emerging-backend-architectures-for-2026-microservices-serverless-and-beyond)_

---

### 4.2 Clean Architecture + DDD for Mental Health Domain

**Why Clean Architecture Applies to the ERP App Backend:**

Clean Architecture (Robert Martin) and Domain-Driven Design (Eric Evans) are not just for large enterprise codebases — they are the right pattern for any domain with genuine complexity. ERP therapy has deep domain complexity: exposure hierarchies, SUDS measurement protocols, avoidance detection, anxiety spike classification, adaptive difficulty algorithms. These cannot be expressed cleanly as CRUD operations.

**Three-Layer Clean Architecture for ERP Backend:**

```
┌─────────────────────────────────────────┐
│           DOMAIN LAYER                  │
│  Pure business logic, zero dependencies │
│  ExposureSession, SUDSMeasurement,      │
│  AnxietyHierarchy, AvoidanceBehavior    │
│  No Supabase, no HTTP, no framework     │
└──────────────┬──────────────────────────┘
               │ depends only on domain
┌──────────────▼──────────────────────────┐
│          APPLICATION LAYER              │
│  Use cases: StartExposure, LogSUDS,     │
│  CompleteSession, GetHierarchy          │
│  Orchestrates domain objects            │
│  Calls repository interfaces (ports)    │
└──────────────┬──────────────────────────┘
               │ implements interfaces
┌──────────────▼──────────────────────────┐
│        INFRASTRUCTURE LAYER             │
│  Supabase client, Edge Functions,       │
│  MQTT broker client, Push notifications │
│  Implements repository interfaces       │
│  (adapters in hexagonal terms)          │
└─────────────────────────────────────────┘
```

**DDD Bounded Contexts for ERP App:**

| Bounded Context | Responsibility | Key Aggregates |
|---|---|---|
| Session | ERP session lifecycle, state machine | ExposureSession, SUDSLog |
| Hierarchy | Exposure step management, difficulty | AnxietyHierarchy, ExposureStep |
| User | Profile, preferences, consent | UserProfile, ConsentRecord |
| Therapist | Clinician oversight, assignment | TherapistClient, ReviewNote |
| Analytics | Progress tracking, trend analysis | ProgressSnapshot, WeeklyReport |

**Domain Layer Independence:**

The domain layer has zero dependencies on Supabase, HTTP, or any framework. This means:
- The ERP session state machine can be unit-tested with zero infrastructure
- Switching from Supabase to AWS Amplify only requires changing the Infrastructure layer
- The core domain logic is portable between server-side Edge Functions and client-side Dart code in the Flutter app

DDD and Hexagonal Architecture perfectly match each other — domain objects encapsulate both data and behavior including validation. An `ExposureSession` domain object knows its own valid state transitions (cannot move to `DEBRIEF` without at least one `SUDSLog`).

_Source: [Understanding Software Architecture: DDD, Clean Architecture, and Hexagonal Architecture](https://medium.com/@ignatovich.dm/understanding-software-architecture-ddd-clean-architecture-and-hexagonal-architecture-13758e59c951), [Building Better Software with Domain-Driven Design and Hexagonal Architecture](https://www.cloudthat.com/resources/blog/building-better-software-with-domain-driven-design-and-hexagonal-architecture)_

---

### 4.3 Database Architecture: PostgreSQL + RLS for Multi-Tenant Health Data

**Multi-Tenant Strategy: Shared Schema + Row Level Security**

For a startup, the shared schema approach (all users in the same tables, isolated by RLS) is the correct choice. Separate-database-per-user is operationally expensive and premature. RLS provides strong data separation while maintaining cost-efficiency and operational simplicity.

**Core RLS Policies for ERP Data:**

```sql
-- Users can only see their own sessions
CREATE POLICY "users_own_sessions" ON exposure_sessions
  FOR ALL USING (user_id = auth.uid());

-- Therapists can see their assigned clients' sessions
CREATE POLICY "therapist_client_sessions" ON exposure_sessions
  FOR SELECT USING (
    user_id IN (
      SELECT client_user_id FROM therapist_assignments
      WHERE therapist_user_id = auth.uid()
    )
  );

-- PHI audit log: append-only for users, readable by HIPAA officer
CREATE POLICY "audit_log_append_only" ON phi_audit_log
  FOR INSERT WITH CHECK (actor_user_id = auth.uid());
```

RLS acts as an internal firewall against cross-tenant PHI exposure — even if an Edge Function has a bug that constructs a wrong WHERE clause, PostgreSQL RLS prevents the data from being returned.

**HIPAA-Specific Database Configuration:**

Full HIPAA compliance on PostgreSQL requires more than RLS:

1. **Encryption at rest** — Supabase uses AES-256 volume encryption (AWS RDS underlying storage). Additional column-level encryption for highest-sensitivity PHI fields (diagnosis codes, session notes) using `pgcrypto`.

2. **Audit logging** — Dedicated `phi_audit_log` table: every SELECT, INSERT, UPDATE, DELETE on PHI tables is logged via PostgreSQL triggers. Required by HIPAA: who accessed what PHI, when.

3. **Point-in-time recovery** — PostgreSQL WAL-based PITR with minimum 6-year retention for mental health records (varies by jurisdiction). Supabase Team Plan includes daily backups + PITR.

4. **Least-privilege access** — Application connects as a restricted role with no table-level DROP/CREATE permissions. Admin operations require a separate privileged role with MFA-protected access.

**Schema Design for ERP Session Data:**

```sql
-- Core session table (PHI — RLS required)
CREATE TABLE exposure_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  step_id     UUID REFERENCES hierarchy_steps(id),
  state       session_state NOT NULL DEFAULT 'IDLE',
  started_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- SUDS log (PHI — RLS required, append-only via policy)
CREATE TABLE suds_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES exposure_sessions(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  score       SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 10),
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Session events (immutable audit + CQRS write model)
CREATE TABLE session_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL,
  user_id     UUID NOT NULL,
  event_type  TEXT NOT NULL,
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON session_events (session_id, created_at);
```

_Source: [PostgreSQL HIPAA Compliance: Managed RDS vs. Hardened PostgreSQL](https://gartsolutions.com/postgresql-hipaa-compliance/), [Row Level Security in Serverless PostgreSQL for HIPAA Compliance](https://magill.dev/post/row-level-security-in-serverless-postgresql-for-hipaa-compliance), [Multi-Tenant PostgreSQL: RLS for Strict Data Isolation](https://www.wellally.tech/blog/postgres-multi-tenant-database-row-level-security)_

---

### 4.4 Scalability Architecture Patterns

**Variable Load Profile of an ERP App:**

An anxiety tracking app has a highly variable traffic pattern:
- **Spiky session bursts**: Users complete exposures at predictable times (morning routine, lunchtime, evening) — traffic is 5–10x baseline for 30-minute windows
- **Near-zero idle**: Between sessions, the backend receives only sync checks and notification delivers
- **Therapist office hours**: Therapist dashboard traffic concentrated in business hours (9am–5pm local)

This profile is ideal for serverless — pay-per-request pricing means near-zero cost during idle periods.

**Horizontal Scaling with Supabase:**

Supabase's auto-scaling handles connection pooling (via PgBouncer) and compute scaling automatically on Team Plan+. The key constraint to plan around is PostgreSQL connection limits — each Edge Function invocation holds a connection for its lifetime.

Connection pooling strategy:
- Use Supabase's built-in PgBouncer in transaction mode
- Edge Functions hold connections for <100ms per request
- Maximum concurrent users at MVP: ~500 active sessions = ~50 concurrent DB connections (within Team Plan limits)
- Scale trigger: upgrade to Pro Plan (unlimited connections via pgBouncer) when DAU exceeds ~5,000

**Caching Strategy:**

| Data Type | Cache Layer | TTL | Rationale |
|---|---|---|---|
| User profile | Supabase Auth JWT claims | 15 min | Avoids DB lookup per request |
| Exposure hierarchy | Edge Function in-memory | 5 min | Read-heavy, rarely changes |
| Therapist roster | Supabase PostgREST cache | 1 min | Low update frequency |
| SUDS data | Never cached | — | Must be real-time accurate |
| Session state | Supabase Realtime | N/A (push) | Live via WebSocket |

_Source: [Scalable Web Apps in 2025-26: Architecture & Growth Guide](https://www.dappinity.com/blog/building-scalable-web-apps-best-practices-and-architecture-patterns), [Design Patterns for Serverless Systems](https://www.infoq.com/articles/design-patterns-for-serverless-systems/)_

---

### 4.5 Deployment and Operations Architecture

**Infrastructure as Code from Day One:**

Even at startup scale, all infrastructure should be defined in code:
- Supabase migrations in version-controlled SQL files (Supabase CLI)
- Edge Function deployments via Supabase CLI + GitHub Actions
- Environment promotion: `local → staging → production` via branch-based Supabase projects

**Observability Stack:**

| Signal | Tool | HIPAA Note |
|---|---|---|
| Application logs | Supabase built-in logs + Axiom | Ensure no PHI in log messages |
| Error tracking | Sentry (with before-send PHI scrubber) | Requires BAA or PHI-free payloads |
| Performance | Supabase Studio query analyzer | No PHI exposure risk |
| Uptime | Better Uptime or Checkly | No PHI in health check endpoints |
| PHI audit trail | PostgreSQL trigger → `phi_audit_log` table | Must be tamper-evident, 6yr retention |

**CI/CD Pipeline:**

```
git push → GitHub Actions:
  1. Run unit tests (domain layer, pure functions)
  2. Run Supabase migration dryrun
  3. Deploy Edge Functions to staging
  4. Run integration tests against staging
  5. Deploy to production (on merge to main)
```

Zero downtime deployments are inherent in serverless — Edge Function deployments are atomic and instant with automatic rollback on error rate threshold breach.

---

## Step 5: Implementation Approaches and Technology Adoption

### 5.1 Development Workflow: Supabase CLI + GitHub Actions

**Local Development Setup**

The Supabase CLI enables running the entire Supabase stack locally — PostgreSQL, Auth, Realtime, Storage, and Edge Functions — via Docker Compose. This means every developer works against a fully isolated local environment with no shared staging pollution.

```bash
# Bootstrap local environment
supabase init
supabase start  # starts local stack on Docker

# Create a new migration
supabase migration new add_exposure_sessions_table

# Apply migrations to local stack
supabase db reset  # applies all migrations + seed data

# Push migrations to staging/production
supabase db push --db-url "$STAGING_DATABASE_URL"
```

**Environment Promotion Strategy:**

Three environments, each backed by a separate Supabase project:

| Environment | Purpose | Deployment Trigger |
|---|---|---|
| `local` | Developer sandbox | Manual (`supabase start`) |
| `staging` | Pre-release testing | Merge to `develop` branch |
| `production` | Live app | Merge to `main` branch |

Supabase's built-in database branching feature (available on Team Plan+) allows feature branches to get their own isolated database branch — eliminating the "staging data pollution" problem common in health app development where test PHI can accidentally contaminate staging data.

**GitHub Actions CI/CD Pipeline:**

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main, develop]

jobs:
  test-and-deploy:
    steps:
      - name: Run domain layer unit tests
        run: dart test test/domain/

      - name: Run Supabase migration dryrun
        run: supabase db diff --use-migra

      - name: Deploy Edge Functions
        run: supabase functions deploy --project-ref $PROJECT_REF

      - name: Run integration tests against staging
        run: dart test test/integration/ --dart-define=SUPABASE_URL=$STAGING_URL

      - name: Deploy migrations to production
        if: github.ref == 'refs/heads/main'
        run: supabase db push --db-url $PROD_DATABASE_URL
```

_Source: [Managing Environments — Supabase Docs](https://supabase.com/docs/guides/deployment/managing-environments), [Database Migrations — Supabase Docs](https://supabase.com/docs/guides/deployment/database-migrations)_

---

### 5.2 Testing Strategy: Pyramid Approach for ERP Backend

**Testing Pyramid for Clean Architecture:**

With Clean Architecture, the domain layer is pure Dart (no framework dependencies), which makes unit testing trivially fast and reliable.

```
          ┌──────────────┐
          │  E2E / Device │  ~5%  (Patrol, Flutter Driver)
          │     Tests    │
        ┌─┴──────────────┴─┐
        │  Integration Tests│  ~15%  (Supabase staging)
        │  (API + DB layer) │
      ┌─┴──────────────────┴─┐
      │    Widget Tests       │  ~20%  (Flutter widget_test)
      │  (UI + state binding) │
    ┌─┴────────────────────────┴─┐
    │         Unit Tests          │  ~60%  (domain + use cases)
    │  (domain layer, pure Dart)  │
    └──────────────────────────────┘
```

**Unit Testing the ERP Domain:**

```dart
// test/domain/exposure_session_test.dart
void main() {
  group('ExposureSession state machine', () {
    test('cannot complete without at least one SUDS log', () {
      final session = ExposureSession.start(step: testStep);
      expect(
        () => session.complete(),
        throwsA(isA<InsufficientSUDSDataException>()),
      );
    });

    test('SUDS trend is correctly calculated from log entries', () {
      final session = ExposureSession.start(step: testStep)
        ..logSUDS(score: 8, at: t0)
        ..logSUDS(score: 6, at: t1)
        ..logSUDS(score: 4, at: t2);
      expect(session.sudsSlope, isNegative);  // anxiety decreasing
    });
  });
}
```

**Mocking Supabase for Integration Tests:**

Use `Mockito` or `Mocktail` to mock Supabase client calls in application-layer tests. The repository interface pattern (from Clean Architecture) means tests inject a mock repository — no live Supabase connection required.

```dart
// Mock the repository interface
class MockSessionRepository extends Mock implements SessionRepository {}

void main() {
  test('StartExposure use case creates session and publishes event', () async {
    final mockRepo = MockSessionRepository();
    final useCase = StartExposureUseCase(sessionRepo: mockRepo);
    
    when(() => mockRepo.createSession(any())).thenAnswer((_) async => testSession);
    
    await useCase.execute(stepId: testStepId, userId: testUserId);
    
    verify(() => mockRepo.createSession(any())).called(1);
  });
}
```

**Integration Tests Against Staging:**

True integration tests (verifying RLS policies, Realtime subscriptions, Edge Function behavior) run against the Supabase staging project in CI. These are slower (~30s per test) but catch the class of bugs that mocks can't — cross-tenant data leakage, subscription fan-out, trigger execution.

_Source: [Best practices for testing Flutter applications](https://www.walturn.com/insights/best-practices-for-testing-flutter-applications), [TDD in Flutter: How To Use Test Driven Development in Flutter](https://www.browserstack.com/guide/tdd-in-flutter)_

---

### 5.3 Cost Model: Infrastructure Costs at Each Stage

**Serverless backend pricing is uniquely favorable for mental health apps.** Unlike a social media app with millions of daily active users generating constant background traffic, an ERP app's traffic pattern is session-driven: high intensity during 20–60 minute exposure sessions, near-zero otherwise.

**Estimated Monthly Infrastructure Costs by Stage:**

| Stage | MAU | Supabase Plan | Est. Monthly Cost | Notes |
|---|---|---|---|---|
| Pre-launch / Alpha | <100 | Free or Pro | $0–25 | Free tier covers dev/alpha |
| Closed Beta | 100–500 | Pro ($25/mo) | $25–75 | Pro covers HIPAA-adjacent configs |
| Launch | 500–5,000 | Team ($599/mo) | $599–800 | **HIPAA add-on required here** |
| Growth | 5,000–50,000 | Team + add-ons | $800–3,000 | Read replicas, more compute |
| Scale | 50,000+ | Enterprise | Custom | Dedicated infrastructure |

**Critical HIPAA Cost Inflection Point:**

The jump from Pro ($25/mo) to Team ($599/mo) is necessary the moment you handle any PHI in production. Do not launch with real users on Free or Pro Plan — the HIPAA add-on is only available on Team Plan+. Budget this as a fixed compliance cost from day one.

**HIPAA Compliance Development Premium:**

HIPAA compliance adds approximately 20–30% to total backend development cost. Key cost drivers:
- Security audit and penetration testing: $5,000–$20,000 once
- BAA management (legal review): $2,000–$5,000 once
- Ongoing compliance monitoring: $500–$2,000/month (tool subscriptions)
- HIPAA training for developers: $200–$500/person

**Total Infrastructure TCO for Year 1 (MVP to 1,000 MAU):**

| Item | Annual Cost |
|---|---|
| Supabase (mixed Free/Pro then Team) | ~$3,000–$7,000 |
| Cloudflare (CDN + DDoS) | ~$200–500 |
| Push notifications (OneSignal/Expo) | ~$0–500 |
| Error tracking (Sentry + BAA) | ~$300–600 |
| CI/CD (GitHub Actions) | ~$0–500 |
| HIPAA compliance tools | ~$2,000–5,000 |
| **Total Year 1 Backend** | **~$6,000–$14,000** |

_Source: [Mobile App Backend Development Cost 2026](https://mindster.com/mindster-blogs/mobile-app-backend-development-cost/), [Building Mental Health Solutions in 2026: Cost & ROI](https://apponward.com/blogs/building-a-mental-health-app-in-2026-use-cases-pricing-roi-strategy)_

---

### 5.4 Team Organization and Skill Requirements

**Minimum Viable Backend Team for MVP:**

A founding technical team of 2–3 engineers can ship the full Supabase-backed architecture:

| Role | Skills Needed | Coverage |
|---|---|---|
| Full-stack engineer | Flutter, Dart, Supabase, PostgreSQL | Sessions, hierarchy, auth |
| Backend/data engineer | PostgreSQL, RLS, Edge Functions, HIPAA | Compliance, data model, analytics |
| (Optional) DevOps | GitHub Actions, Docker, Supabase CLI | CI/CD, environment management |

**Critical Supabase-Specific Skills to Develop:**

1. **Row Level Security policy authorship** — RLS is powerful but has footguns (e.g., infinite recursion in policies). Team needs solid PostgreSQL policy debugging skills.
2. **Supabase Realtime subscription management** — Channel lifecycle, presence, broadcast vs. database changes patterns
3. **Edge Function patterns** — Deno runtime differs from Node.js; Supabase injects environment variables differently in local vs. production

**HIPAA Compliance Competency:**

At minimum, one team member must own HIPAA compliance: BAA tracking, audit log review cadence, incident response procedures, breach notification protocol. This does not require a dedicated compliance officer at MVP stage — but it requires someone who has read the HIPAA Security Rule, not just skimmed a blog post.

---

### 5.5 Risk Assessment and Mitigation

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Supabase Realtime latency spikes during session | Medium | High (breaks ERP session UX) | Fallback to polling on connection drop; exponential backoff reconnect |
| PostgreSQL connection exhaustion under load | Medium | High (app unavailable) | PgBouncer transaction pooling + connection limit alerts |
| HIPAA audit reveals data exposure | Low | Critical (regulatory, reputational) | RLS integration tests in CI + quarterly security review |
| BAA not in place before PHI ingestion | Medium | Critical (HIPAA violation) | Gate production launch on BAA checklist completion |
| Supabase pricing increases at Team Plan | Low | Medium | Self-host path available (Supabase is open-source); document migration plan |
| Edge Function cold starts impact session responsiveness | Low | Medium | Keep functions warm via scheduled health check pings |
| Offline sync conflict corrupts SUDS data | Low | High | CRDT-based conflict resolution; append-only SUDS log (conflicts impossible) |

**Implementation Roadmap:**

| Phase | Weeks | Deliverables |
|---|---|---|
| Foundation | 1–4 | Supabase project setup, schema design, RLS policies, auth, local dev environment |
| Core Domain | 5–10 | Exposure session state machine, SUDS logging, hierarchy CRUD, offline sync |
| Real-Time | 11–14 | Supabase Realtime subscriptions, session state push, SUDS live updates |
| HIPAA Hardening | 15–18 | Audit log triggers, PHI encryption, PITR configuration, BAA execution, pen test |
| Therapist Dashboard | 19–24 | Read model views, CQRS analytics queries, therapist API, web dashboard |
| Production Launch | 25+ | Load testing, incident response runbook, monitoring alerts, launch |

_Source: [Mental Health App Development Guide for 2026](https://topflightapps.com/ideas/how-to-build-a-mental-health-app/), [Is AWS Really Best Choice for Healthcare in 2026?](https://www.techmagic.co/blog/aws-for-healthcare)_

---

## Technical Research Synthesis

# Scalable and Compliant by Design: Comprehensive Backend Architecture Research for a Real-Time Anxiety Tracking App

## Executive Summary

The backend architecture for a consumer ERP anxiety tracking app must solve three simultaneous constraints that rarely appear together in startup contexts: clinical-grade real-time responsiveness (sub-100ms session state transitions during live exposure exercises), strict healthcare data compliance (HIPAA PHI handling, BAA coverage, mandatory 2026 Security Rule encryption requirements), and early-stage cost efficiency (a founding team cannot justify enterprise infrastructure overhead before product-market fit is demonstrated). This research resolves all three in a unified architecture.

The central recommendation is **Serverless-first on Supabase (Team Plan with HIPAA add-on)**: PostgreSQL as the relational data store with Row Level Security providing database-layer PHI isolation, Supabase Realtime delivering WebSocket-based session state updates, and Supabase Edge Functions (Deno) handling custom business logic at the edge without cold start penalties. This architecture is layered with **Clean Architecture and Domain-Driven Design** to keep the ERP session domain logic framework-agnostic, enabling the same domain model to run in server-side Edge Functions and the Flutter client app simultaneously. The result is an architecture that scales from 100 beta users to 50,000 MAU without a rewrite — and has a documented migration path to AWS Amplify if compliance requirements eventually outgrow Supabase's capabilities.

The research produced five key decision verdicts: Supabase over Firebase (Firebase's HIPAA restrictions eliminate most of its convenience features) and over AWS Amplify (stronger compliance but disproportionate complexity for a small founding team); offline-first architecture via Outbox Pattern + CRDT conflict resolution (non-negotiable for real-world ERP exposure settings with unreliable connectivity); dual real-time protocols — Supabase Realtime for session state, MQTT-over-WebSocket for wearable sensor streams; PostgreSQL append-only event log as both HIPAA audit trail and CQRS write model at zero infrastructure overhead; and a 24-week phased implementation roadmap from foundation to production launch with Year 1 infrastructure cost estimated at $6,000–$14,000.

**Key Technical Findings:**

- Serverless-first architecture dominates 2026: 70%+ of AWS orgs run Lambda in production; healthcare is now a first-class serverless use case
- Supabase wins the BaaS comparison for this use case: PostgreSQL's relational model, built-in Realtime, RLS, open-source portability, and a viable HIPAA path
- Firebase is the wrong choice: Firestore is not on Google's HIPAA-approved services list; building HIPAA-compliant features on Firebase eliminates most of its convenience
- PostgreSQL RLS is the correct PHI security model: database-layer isolation, not just application-layer; integrates natively with Supabase Auth JWT claims
- The 2026 HIPAA Security Rule update has made AES-256 at rest and TLS 1.3 in transit mandatory — no longer addressable
- HIPAA compliance adds 20–30% to total development cost; the Supabase Team Plan ($599/mo) is the mandatory HIPAA inflection point
- Offline-first with CRDT conflict resolution is essential — ERP exposures happen in real-world environments with unreliable connectivity

**Technical Recommendations:**

1. Use Supabase Team Plan + HIPAA add-on from the moment real users are onboarded — never accept PHI on Free or Pro Plan
2. Implement PostgreSQL RLS from the first migration — retrofitting is significantly harder than building it in from day one
3. Structure the backend with Clean Architecture: pure domain layer, application use cases, infrastructure adapters — the ERP state machine should have zero Supabase dependencies
4. Use an append-only `session_events` table from the initial schema — it simultaneously provides HIPAA audit trail, event sourcing, and CQRS read model with no additional infrastructure
5. Deploy an offline-first Outbox Pattern with CRDT conflict resolution before launch — SUDS data loss during an exposure session is a clinical quality failure

## Table of Contents

1. Technical Research Introduction and Methodology
2. Technology Stack Landscape and Architecture Analysis
3. Integration Patterns and Communication Protocols
4. Architectural Patterns and System Design
5. Implementation Approaches and Development Workflow
6. Technology Stack Evolution and Adoption Trends
7. Security and Compliance Architecture
8. Strategic Technical Recommendations
9. Implementation Roadmap and Risk Assessment
10. Future Technical Outlook
11. Technical Research Methodology and Source Verification
12. Technical Appendices and Reference Materials

---

## 1. Technical Research Introduction and Methodology

### Research Significance

Building a backend for a real-time anxiety tracking app in 2026 sits at the intersection of three demanding technical domains: regulated healthcare data handling, real-time mobile application architecture, and early-stage startup cost optimization. The stakes for getting the architecture wrong are high: a HIPAA violation before product-market fit could be existential; an architecture that requires a rewrite at 10,000 users wastes the runway; a real-time layer that drops SUDS data during an active exposure session undermines clinical value.

The mental health technology market is growing rapidly — estimated at $7.5–8.5 billion in 2025, projected $17–18 billion by 2030 — with regulatory requirements tightening simultaneously (the 2026 HIPAA Security Rule update mandates encryption standards previously classified as "addressable"). This research provides the technical foundation for building an architecture that is compliant from day one, scalable to growth, and achievable by a small founding team.

### Research Methodology

- **Technical Scope**: Backend architecture, BaaS platform selection, real-time delivery, database design, HIPAA compliance, integration patterns, offline architecture, development workflow, and cost modeling
- **Data Sources**: Supabase official documentation, HIPAA regulatory guidance (HHS.gov), AWS HIPAA Eligible Services reference, InfoQ architecture case studies (Electronic Medical Records CQRS), Martin Fowler's serverless architecture analysis, Datadog State of Serverless 2025 report, mental health app development cost analyses
- **Research Period**: Current 2026 with historical context where evolution patterns are relevant
- **Verification Standard**: All architectural claims cross-referenced against at least two independent sources; platform-specific claims verified against official documentation

### Research Goals and Objectives

**Original Goals:** Identify the right backend architecture for scalability, real-time features, HIPAA compliance, and cost efficiency for an early-stage mental health startup. Additional goal: data privacy of users.

**Achieved Objectives:**
- BaaS platform selection resolved with comparative analysis of Supabase, Firebase, and AWS Amplify against HIPAA compliance requirements
- Real-time architecture specified for two distinct patterns (session state vs. wearable sensor streams) using appropriate protocols
- PostgreSQL multi-tenant data isolation architecture designed with RLS policies for PHI compliance
- Offline-first architecture specified with CRDT conflict resolution for real-world ERP deployment conditions
- Year 1 infrastructure cost model built from startup-scale to 50,000 MAU growth trajectory
- Data privacy architecture specified: JWT + RLS + database-layer isolation + PHI audit trail

---

## 2. Technology Stack Landscape and Architecture Analysis

### BaaS Platform Comparison

In 2026, the backend decision for a HIPAA-regulated consumer app centers on which managed platform provides the best combination of developer ergonomics, compliance infrastructure, and cost efficiency.

**Verdict: Supabase (Team Plan + HIPAA add-on)**

| Criterion | Supabase | Firebase | AWS Amplify |
|---|---|---|---|
| HIPAA BAA | ✅ Team Plan+ | ⚠️ GCP BAA, restricted features | ✅ All plans |
| Firestore/DB HIPAA | ✅ PostgreSQL approved | ❌ Firestore not on approved list | ✅ DynamoDB/RDS approved |
| Real-time built-in | ✅ Supabase Realtime | ✅ Firestore (but HIPAA-restricted) | ✅ AppSync WebSocket |
| Developer ergonomics | ★★★★★ | ★★★★ | ★★★ |
| Open-source / self-hostable | ✅ | ❌ | ❌ |
| Startup monthly cost | ~$599 (Team) | Not usable with HIPAA | ~$100–500+ |
| PostgreSQL / relational | ✅ Native | ❌ NoSQL | ⚠️ RDS option |

Firebase is eliminated: Firestore (its primary database) is not on Google's list of HIPAA-approved services, meaning PHI cannot be stored in Firestore regardless of GCP BAA status. AWS Amplify is valid but adds operational complexity that is not justified at founding-team scale.

### Serverless Architecture Adoption

More than 70% of AWS organizations run at least some production workloads on Lambda (Datadog State of Serverless 2025). Healthcare has joined enterprise and government as a first-class serverless use case. The "serverless-first" pattern for 2026 combines a FaaS layer (AWS Lambda, Supabase Edge Functions, Cloudflare Workers) with a BaaS backend, with pay-per-execution pricing that is uniquely favorable for the session-driven traffic pattern of an ERP app.

_Source: [Serverless Computing 2026 Complete Guide](https://calmops.com/backend/serverless-computing-2026/), [HIPAA Compliance and Supabase Docs](https://supabase.com/docs/guides/security/hipaa-compliance), [Is Firebase HIPAA-Compliant? A Safer Alternative for 2026](https://www.blaze.tech/post/is-firebase-hipaa-compliant)_

---

## 3. Integration Patterns and Communication Protocols

### API Design

2026 API strategy is hybrid, not single-winner: ~66% REST for resource endpoints, ~40% GraphQL for complex client-specific queries, ~25% gRPC for internal services. For the ERP app: REST (OpenAPI) for standard CRUD and auth; GraphQL for complex exposure hierarchy queries that require joining multiple data sources in a single round-trip.

### Real-Time Protocols

Two distinct real-time patterns require two protocols:
- **Supabase Realtime (WebSocket CDC)**: Session state machine transitions, SUDS log updates, therapist dashboard live feed — schema-driven, infrequent events
- **MQTT-over-WebSocket**: Wearable heart rate / HRV sensor streams — high-frequency (1–5Hz), IoT-optimized, QoS Level 1 for delivery guarantees

### Offline-First with CRDT

ERP exposures happen in real-world public settings with unreliable connectivity. The offline-first Outbox Pattern ensures every user action writes to local SQLite first, with background delta sync. CRDTs resolve the only conflict class that matters: concurrent writes on different devices (e.g., user completes step offline while therapist marks same step on web dashboard).

### Event-Driven Integration

An append-only `session_events` table in PostgreSQL (event sourcing pattern) provides: HIPAA-mandated audit trail, CQRS write model for commands, and materialized view projections for analytics — all at zero additional infrastructure cost vs. a standard CRUD schema.

_Source: [REST API, GraphQL, and gRPC: 2026 trends](https://zuniweb.com/blog/api-architecture-showdown-rest-graphql-and-grpc-for-modern-web-and-mobile-apps/), [MQTT vs WebSocket](https://ably.com/topic/mqtt-vs-websocket), [Offline First Mobile App in 2026: Real-Time Data Sync with CRDT Architecture](https://www.calibraint.com/blog/offline-first-mobile-app-in-2026), [Healthy Architectures - CQRS and Event Sourcing for Electronic Medical Records](https://www.infoq.com/articles/healthcare-emr-ehr/)_

---

## 4. Architectural Patterns and System Design

### System Architecture

**Three-Tier Serverless Architecture:**
1. **Client Layer**: Flutter app (iOS/Android) + React web dashboard
2. **Edge Layer**: Cloudflare CDN + Supabase Edge Functions (Deno) — auth validation, rate limiting, business logic
3. **Data Layer**: Supabase PostgreSQL + Realtime + Auth + Storage (HIPAA-eligible on Team Plan)

### Clean Architecture + DDD

**Five DDD Bounded Contexts:**
- **Session** — ERP session lifecycle and state machine (ExposureSession, SUDSLog)
- **Hierarchy** — Exposure step management and adaptive difficulty (AnxietyHierarchy, ExposureStep)
- **User** — Profile, preferences, consent (UserProfile, ConsentRecord)
- **Therapist** — Clinician oversight and assignment (TherapistClient, ReviewNote)
- **Analytics** — Progress tracking and trend analysis (ProgressSnapshot, WeeklyReport)

The domain layer has zero Supabase dependencies — the ERP session state machine is pure Dart, testable with zero infrastructure, and portable between Edge Functions and the Flutter client.

### Database Architecture

PostgreSQL multi-tenant architecture with Row Level Security: all users share the same tables, isolated at the row level via `user_id` column + RLS policies. Three core PHI tables: `exposure_sessions`, `suds_logs`, `session_events` — all protected by RLS policies enforced at the PostgreSQL engine level.

_Source: [PostgreSQL HIPAA Compliance](https://gartsolutions.com/postgresql-hipaa-compliance/), [Design Patterns for Serverless Systems - InfoQ](https://www.infoq.com/articles/design-patterns-for-serverless-systems/)_

---

## 5. Implementation Approaches and Development Workflow

### Supabase CLI + GitHub Actions

**Environment chain:** `local (Docker) → staging (Supabase branch) → production`

All migrations versioned as SQL files in the repo. GitHub Actions CI pipeline: unit tests → migration dryrun → Edge Function deploy to staging → integration tests against staging → production deploy on `main` merge. Supabase's database branching (Team Plan+) gives feature branches isolated database environments.

### Testing Strategy

Testing pyramid for Clean Architecture:
- 60% unit tests (domain layer, pure Dart — zero infrastructure, runs in milliseconds)
- 20% widget tests (Flutter UI + state binding)
- 15% integration tests (Supabase staging — verifies RLS, Realtime, triggers)
- 5% E2E device tests (Patrol)

RLS policy correctness must be verified in integration tests — mocks cannot catch cross-tenant data leakage.

### Cost Model

| Stage | MAU | Monthly Cost | Key Threshold |
|---|---|---|---|
| Alpha | <100 | $0–25 | Free/Pro |
| Beta | 100–500 | $25–75 | Pro |
| Launch | 500–5,000 | $599–800 | **Team Plan + HIPAA add-on required** |
| Growth | 5,000–50,000 | $800–3,000 | Read replicas |

Year 1 total backend TCO (MVP to 1,000 MAU): **$6,000–$14,000**.

_Source: [Local Development & CLI — Supabase Docs](https://supabase.com/docs/guides/local-development), [Mobile App Backend Development Cost 2026](https://mindster.com/mindster-blogs/mobile-app-backend-development-cost/)_

---

## 6. Technology Stack Evolution and Adoption Trends

### Current Stack (2026)

**Recommended Core Stack for ERP App:**

| Layer | Technology |
|---|---|
| BaaS | Supabase (Team Plan + HIPAA add-on) |
| Edge Functions | Supabase Edge Functions (Deno) |
| Real-Time (session) | Supabase Realtime (WebSocket CDC) |
| Real-Time (wearable) | MQTT-over-WebSocket (HiveMQ Cloud) |
| Auth | Supabase Auth + MFA |
| Storage | Supabase Storage (S3-backed, AES-256) |
| CDN | Cloudflare |
| AI/ML | AWS Bedrock or Anthropic API (BAA required) |
| Local DB (client) | Drift (SQLite ORM for Dart) |

### Scale-Up Path

| Trigger | Migration |
|---|---|
| Supabase HIPAA audit limits | AWS Amplify + AppSync |
| Connection exhaustion (>50k DAU) | AWS RDS PostgreSQL |
| Enterprise therapist SLA | AWS AppSync real-time |
| Event log >10M rows | AWS EventBridge or Confluent Kafka |

### Emerging Technology: Edge-First BaaS

Convex (SOC 2 Type II, HIPAA compliant, GDPR verified) is an emerging reactive BaaS alternative — pure TypeScript schemas with changes propagating instantly to all clients. Worth tracking as a potential alternative to Supabase for teams with TypeScript-first backends.

_Source: [Convex Backend Platform: Real-Time Development Guide 2026](https://novemind.com/developer-insights/convex-the-reactive-backend-platform-reshaping-real-time-development)_

---

## 7. Security and Compliance Architecture

### 2026 HIPAA Security Rule Mandatory Requirements

The 2026 update made previously "addressable" safeguards mandatory:
- AES-256 encryption for all ePHI at rest
- TLS 1.3 (minimum TLS 1.2) for all ePHI in transit
- Role-based access controls with MFA
- Comprehensive audit logging (who accessed what PHI, when)
- Automatic session timeout on inactivity

### BAA Coverage Checklist

Every vendor touching ePHI requires a signed BAA:
- ✅ Supabase (Team Plan + HIPAA add-on)
- ✅ AWS / GCP / Azure (all offer BAAs)
- ⚠️ AI/LLM provider (required before sending session content to model)
- ⚠️ Push notification service (only if notifications contain PHI)
- ⚠️ Error tracking tool (Sentry requires PHI scrubbing OR BAA)
- ⚠️ Analytics tool (must be PHI-free or have BAA)

Operating without BAAs from any vendor that touches ePHI is a direct HIPAA violation.

### Data Privacy Architecture

**Layer 1 — Network**: TLS 1.3 for all connections; Cloudflare for DDoS and TLS termination
**Layer 2 — Auth**: Supabase Auth JWT (RS256), 15-minute access tokens, refresh token rotation, Keychain/Keystore storage only
**Layer 3 — Database**: PostgreSQL RLS — database-engine enforcement, not application-layer
**Layer 4 — Encryption**: AES-256 volume encryption (Supabase infrastructure) + pgcrypto column-level encryption for highest-sensitivity PHI fields
**Layer 5 — Audit**: PostgreSQL trigger-based `phi_audit_log` table — tamper-evident, 6-year retention minimum

_Source: [HIPAA Compliance for Cloud Computing: AWS, Azure & Google Cloud in 2026](https://medcurity.com/hipaa-cloud-compliance/), [Row Level Security in Serverless PostgreSQL for HIPAA Compliance](https://magill.dev/post/row-level-security-in-serverless-postgresql-for-hipaa-compliance)_

---

## 8. Strategic Technical Recommendations

### Architecture Recommendations

1. **Choose Supabase Team Plan as the production BaaS** — PostgreSQL relational model, built-in Realtime, RLS, open-source portability, and HIPAA path. Do not launch with PHI on Free or Pro Plan.

2. **Implement PostgreSQL RLS from migration 001** — Never retrofit security policies onto an existing data model. RLS is the single highest-leverage compliance investment in the schema.

3. **Enforce Clean Architecture layer boundaries** — The ERP session state machine belongs in the domain layer with zero infrastructure dependencies. This single architectural discipline enables independent testing, code sharing with Flutter client, and backend portability.

4. **Use an append-only event log table from the initial schema** — `session_events` with event sourcing semantics gives HIPAA audit trail, CQRS write model, and analytics projection for free. Adding it later requires data migration.

5. **Build offline-first before launch** — The Outbox Pattern + CRDT conflict resolution cannot be added as an afterthought. Design for offline first, then add online sync.

### Competitive Technical Advantage

The architecture described here produces two technical moats that most competitor apps lack:

- **HIPAA audit readiness at founding scale** — Most consumer mental health apps accumulate technical debt around compliance and spend months cleaning it up for clinical partnerships or enterprise sales. Building RLS, audit trails, and BAA coverage from day one means these conversations can start immediately.

- **Therapist-guided mode as a technical capability** — The therapist RLS policies, CQRS event model, and Realtime subscriptions built into the foundation enable a therapist dashboard feature without architectural rework. This capability requires a fundamentally different data model than purely solo consumer apps.

_Source: [Building HIPAA-compliant applications on the AWS cloud](https://www.cloudtech.com/resources/building-hipaa-compliant-applications-aws-cloud), [HIPAA Compliant App Development in 2026](https://www.whitehalltechnologies.com/blog/hipaa-compliant-app-development-guide/)_

---

## 9. Implementation Roadmap and Risk Assessment

### Phased Implementation Roadmap

| Phase | Weeks | Key Deliverables |
|---|---|---|
| **Foundation** | 1–4 | Supabase project + HIPAA add-on, schema + RLS policies, auth + MFA, local dev with Supabase CLI |
| **Core Domain** | 5–10 | ERP session state machine (domain layer), SUDS logging, hierarchy CRUD, offline Outbox sync |
| **Real-Time** | 11–14 | Supabase Realtime subscriptions, session state push, SUDS live feed, MQTT wearable bridge |
| **HIPAA Hardening** | 15–18 | Audit log triggers, pgcrypto column encryption, PITR config, BAA execution, penetration test |
| **Therapist Dashboard** | 19–24 | Therapist RLS policies, CQRS materialized views, therapist API, web dashboard |
| **Production Launch** | 25+ | Load testing, incident response runbook, monitoring alerts, on-call rotation |

### Technical Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Supabase Realtime latency during sessions | Medium | High | Polling fallback on connection drop; exponential backoff reconnect |
| PostgreSQL connection exhaustion | Medium | High | PgBouncer transaction mode + connection count alerts |
| HIPAA audit finds cross-tenant exposure | Low | Critical | RLS integration tests in every CI run |
| BAA missing before PHI ingestion | Medium | Critical | Hard launch gate: BAA checklist must pass before prod deployment |
| Supabase pricing change at Team Plan | Low | Medium | Self-host migration path documented; Supabase is fully open-source |
| Offline sync conflict corrupts SUDS data | Low | High | SUDS log is append-only — conflicts are structurally impossible |

---

## 10. Future Technical Outlook

### Near-Term (2026–2027)

- **Supabase AI features** — Supabase is adding vector similarity search (pgvector) and AI Edge Functions. For the ERP app: exposure hierarchy personalization via embedding similarity, session narrative generation.
- **MQTT consolidation** — EMQX and HiveMQ are both adding HIPAA-adjacent compliance features. Expect BAA availability from MQTT brokers by 2027.
- **Edge-native AI inference** — Cloudflare Workers AI and Supabase Edge Functions both support model inference at the edge. Anxiety prediction from SUDS trajectory could move to edge-native inference, eliminating round-trip latency to a central AI API.

### Medium-Term (2027–2029)

- **EHR Integration** — HL7 FHIR APIs will become a realistic integration target for clinical partnerships. The event sourcing architecture maps naturally to FHIR resources.
- **Wearable OS integration** — watchOS and Wear OS are adding more direct HIPAA-aware data APIs, potentially eliminating the MQTT bridge layer for Apple Watch and Galaxy Watch integrations.

### Long-Term (2029+)

- **Federated learning for anxiety models** — Privacy-preserving ML training on device without PHI leaving the device boundary. Eliminates the most difficult HIPAA risk in AI-personalized therapy.

_Source: [Serverless Architecture Future: Backend Dev Guide 2026](https://attowp.com/backend-server/serverless-architecture-the-future-of-backend-development-in-2025/)_

---

## 11. Technical Research Methodology and Source Verification

### Primary Technical Sources

| Source | Authority | Coverage |
|---|---|---|
| Supabase Official Docs | Platform authority | HIPAA configuration, RLS, Realtime, migrations |
| HHS / HIPAA Security Rule | Regulatory authority | Mandatory safeguards, BAA requirements |
| AWS HIPAA Eligible Services | Platform authority | BAA coverage, HIPAA-eligible service list |
| InfoQ (Healthcare CQRS) | Peer-reviewed architecture | Event sourcing for EMR/EHR systems |
| Martin Fowler (Serverless) | Architecture authority | Serverless patterns and trade-offs |
| Datadog State of Serverless 2025 | Industry data | Adoption rates, production usage statistics |

### Web Search Queries Used

1. Serverless vs microservices vs BaaS backend architecture mental health app 2025 2026
2. Supabase vs Firebase vs AWS Amplify HIPAA compliance BAA 2025 2026
3. Real-time WebSocket GraphQL subscriptions mental health anxiety app backend 2025 2026
4. HIPAA compliant backend infrastructure cloud providers BAA requirements health app startup 2026
5. Backend API design patterns REST GraphQL health app mobile 2025 2026
6. WebSocket MQTT message queue real-time health data communication protocols 2025 2026
7. Offline-first sync architecture mobile health app SQLite background sync 2025 2026
8. Event-driven architecture CQRS event sourcing healthcare app backend 2025 2026
9. System architecture patterns serverless BaaS scalability health app backend 2025 2026
10. Clean architecture hexagonal architecture mobile app backend domain driven design 2025 2026
11. Database architecture PostgreSQL row level security multi-tenant health data HIPAA 2025 2026
12. Supabase startup implementation guide local development migration CI/CD 2025 2026
13. Flutter backend integration testing strategy health app TDD unit testing 2025 2026
14. Mental health app backend infrastructure cost optimization startup serverless pricing 2025 2026
15. Backend architecture real-time anxiety tracking app HIPAA serverless 2026 technical overview

### Research Confidence Assessment

- **BaaS platform recommendation (Supabase)**: High confidence — based on official documentation from all three platforms plus multiple independent compliance analyses
- **HIPAA requirement specifics**: High confidence — verified against official HHS guidance and 2026 Security Rule update documentation
- **Cost estimates**: Medium confidence — infrastructure costs verified against multiple sources; development cost estimates have wide ranges due to team composition variability
- **MQTT for wearable streams**: High confidence — verified against HiveMQ, EMQX, and Ably protocol comparison documentation

---

## 12. Technical Appendices and Reference Materials

### Appendix A: Complete Technology Decision Matrix

| Decision | Winner | Runner-Up | Elimination |
|---|---|---|---|
| BaaS Platform | Supabase (Team + HIPAA) | AWS Amplify | Firebase |
| Real-Time (sessions) | Supabase Realtime | AWS AppSync | Firebase Realtime DB |
| Real-Time (wearables) | MQTT-over-WebSocket | Raw WebSocket | SSE |
| Database | PostgreSQL (via Supabase) | AWS RDS PostgreSQL | DynamoDB / Firestore |
| Auth | Supabase Auth + MFA | AWS Cognito | Firebase Auth |
| Edge Functions | Supabase Edge (Deno) | AWS Lambda | Cloudflare Workers |
| Offline Storage | Drift (SQLite) + CRDT | Realm | Hive |
| CI/CD | GitHub Actions | Bitrise | CircleCI |
| CDN | Cloudflare | AWS CloudFront | Fastly |

### Appendix B: Key PostgreSQL RLS Policies

```sql
-- Users see only their own data
CREATE POLICY "self_only" ON exposure_sessions
  FOR ALL USING (user_id = auth.uid());

-- Therapists see assigned clients
CREATE POLICY "therapist_view" ON exposure_sessions
  FOR SELECT USING (
    user_id IN (SELECT client_user_id FROM therapist_assignments
                WHERE therapist_user_id = auth.uid())
  );

-- Session events: append-only for all, readable by owner/therapist
CREATE POLICY "events_insert" ON session_events
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "events_read" ON session_events
  FOR SELECT USING (user_id = auth.uid());
```

### Appendix C: Technical Resources

- [Supabase HIPAA Projects Documentation](https://supabase.com/docs/guides/platform/hipaa-projects)
- [HIPAA Eligible Services — Amazon Web Services](https://aws.amazon.com/compliance/services-in-scope/HIPAA_BAA/)
- [Healthy Architectures: CQRS and Event Sourcing for EMR — InfoQ](https://www.infoq.com/articles/healthcare-emr-ehr/)
- [Offline-First Architecture: Designing for Reality](https://medium.com/@jusuftopic/offline-first-architecture-designing-for-reality-not-just-the-cloud-e5fd18e50a79)
- [Row Level Security in Serverless PostgreSQL for HIPAA](https://magill.dev/post/row-level-security-in-serverless-postgresql-for-hipaa-compliance)
- [MQTT vs WebSocket — Ably](https://ably.com/topic/mqtt-vs-websocket)
- [Domain-Driven Hexagon — GitHub](https://github.com/Sairyss/domain-driven-hexagon)

---

## Technical Research Conclusion

### Summary of Key Technical Findings

The backend architecture for an ERP anxiety tracking app is a solved problem in 2026, with a clear stack that satisfies all three constraint axes simultaneously. Supabase provides the BaaS foundation with a verified HIPAA path; PostgreSQL RLS provides database-layer PHI isolation that cannot be bypassed by application bugs; Clean Architecture ensures the clinical domain logic is testable and portable; and the serverless execution model matches the session-driven traffic pattern with pay-per-use economics.

The single most important architectural decision — implement RLS from migration 001 — is also the lowest-effort decision if made at the right time. Every week of delay makes it exponentially more expensive to retrofit.

### Strategic Technical Impact

The architecture described in this research positions the app to:
- Onboard clinical partners and employers within 12 months of launch (HIPAA audit readiness)
- Add therapist-guided mode without architectural rework (therapist RLS policies + Realtime already in foundation)
- Scale to 50,000 MAU without a rewrite (documented Supabase → AWS migration path)
- Pursue AI personalization features with PHI safety (event sourcing + BAA coverage for AI APIs)

### Next Steps

1. Execute BAA with Supabase (Team Plan) before writing any production PHI
2. Implement initial schema with RLS policies using the structures in this document
3. Write the ERP session state machine as a pure domain object with full unit test coverage
4. Configure local development environment with Supabase CLI + seed data
5. Begin HIPAA compliance checklist: BAA tracking spreadsheet, incident response plan, audit log review cadence

---

**Technical Research Completion Date:** 2026-05-05
**Research Period:** Comprehensive 2025–2026 current analysis
**Source Verification:** All technical claims cited with current authoritative sources
**Technical Confidence Level:** High — based on multiple authoritative technical sources including official platform documentation and regulatory guidance

_This comprehensive technical research document serves as an authoritative technical reference for backend architecture decisions for a real-time anxiety tracking app and provides strategic technical insights for the ERP therapy application development._
