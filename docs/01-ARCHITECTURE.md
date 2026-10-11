# TripMitra — System Architecture & Operating Model

## 1. High-Level Overview

**TripMitra** (AI Travel Companion) is an intelligent, conversational tourist assistant built with **Node.js, Express, strict TypeScript, and MongoDB/Mongoose**. It integrates directly with **Meta's WhatsApp Cloud API** to deliver personalized, weather-aware, and budget-constrained trip itineraries, live location recommendations, transit guidance, and multimodal photo landmark identification.

The system employs a **hybrid architecture** that couples probabilistic natural language understanding and multimodal vision (Large Language Models) with a strictly deterministic, rule-based itinerary generation and scheduling engine:

```text
                                  +-------------------------------------------------------------+
                                  |                     Inbound User Event                      |
                                  |              (WhatsApp Cloud API Webhook)                   |
                                  +-------------------------------------------------------------+
                                                                 |
                                                                 v
                                  +-------------------------------------------------------------+
                                  |               Observability & Security Layer                |
                                  |   - Helmet Headers, CORS Policy                             |
                                  |   - Meta Webhook HMAC-SHA256 Signature Verification         |
                                  |   - In-Flight Memory Deduplication (5-minute TTL)           |
                                  |   - Pino Redactor & Phone Masking (+91****210)              |
                                  +-------------------------------------------------------------+
                                                                 |
                                                                 v
                                  +-------------------------------------------------------------+
                                  |               WhatsAppMessageService & Queue                |
                                  |   - Instant HTTP 200 Acknowledgment to Meta                 |
                                  |   - Idempotent Message Persistence (externalMessageId)      |
                                  |   - Inbound Message Type Router (Text / Image / Location)   |
                                  +-------------------------------------------------------------+
                                            /                    |                    \
                 [Image / Photo Message]   /                     |                     \  [Text Message]
                                          v                      |                      v
    +-----------------------------------------------+            |    +-----------------------------------------------+
    |         Multimodal Vision Subsystem           |            |    |              TravelAgent Coordinator          |
    |  - Authenticated Meta Media Binary Streaming  |            |    |  - Multi-Turn Conversation History            |
    |  - MIME & Header Validation                   |            |    |  - Deterministic Transaction Guard (Pre-LLM)  |
    |  - Gemini 2.5 Flash / OpenRouter Vision Model |            |    |  - Dynamic Tool Registry & Atlas RAG Context  |
    |  - 15-Minute Ephemeral Context (VisualStore)  |            |    |  - Grounded Conversational Routing            |
    |  - Google Places API Authoritative Resolution |            |    +-----------------------------------------------+
    +-----------------------------------------------+            |             /                             \
                          \                                      |            /                               \
                           \                                     |           v                                 v
                            \     +------------------------------+   +-----------------------+   +---------------------------+
                             \    | Interactive Action Router    |   | Forward Pipeline      |   | Targeted Modification     |
                              \   | (Buttons & Quick Reply Lists)|   | ItineraryGenerator    |   | ItineraryModifierService  |
                               \  +------------------------------+   +-----------------------+   +---------------------------+
                                \                |                              \                             /
                                 \               |                               \                           /
                                  v              v                                v                         v
                                  +-------------------------------------------------------------------------+
                                  |              WhatsAppTextFormatter & Presentation Engine                |
                                  |  - Strips Leaky / Nested Asterisks (### **Heading** -> *Heading*)       |
                                  |  - Normalizes Bullet Points (* , - -> • )                               |
                                  |  - Protects Mathematical Multiplication (5 * 2 -> 5 × 2)                |
                                  |  - Converts Markdown Links to Native WhatsApp Clickable URLs            |
                                  |  - Splits Output into Scannable Mobile Chunks (<= 3,500 chars)          |
                                  +-------------------------------------------------------------------------+
                                                                 |
                                                                 v
                                  +-------------------------------------------------------------------------+
                                  |               Outbound Meta Graph API Message Delivery                  |
                                  +-------------------------------------------------------------------------+
```

---

## 2. LLM Authority Boundaries & The Tripartite Invariant

TripMitra enforces a strict architectural boundary separating untrusted, probabilistic LLM inference from deterministic business calculations:

```text
Untrusted User Conversational Text ("Make Day 2 more relaxed and replace the fort")
                                           │
                                           ▼
                 LLM Semantic Extraction (ItineraryModificationExtractor)
                                           │
                                           ▼
                    Strict Structural Validation (Zod Schema)
                                           │
                                           ▼
                    Application-Level Intent Safety Validation
                                           │
                                           ▼
                 Authoritative Place Resolution (Name Substring Matching)
                                           │
                                           ▼
                    Deterministic Replanning (ItineraryModifierService)
                    - Preserves Unaffected Days (Day 1 Bit-for-Bit Identical)
                    - Excludes Preserved Places from Candidate Pool
                    - Optimistic Concurrency Control (expectedVersion)
                                           │
                                           ▼
                    Re-Enrichment (Open-Meteo Weather + Budget Engine)
                                           │
                                           ▼
                 Durable Persistence & Version Bump (ItineraryPersistence)
                                           │
                                           ▼
                 Presentation Formatting (WhatsAppTextFormatter Engine)
```

### The Tripartite Invariant
1. **The LLM does NOT author authoritative itinerary facts**: It never invents places, operating hours, admission fees, or weather suitability.
2. **The LLM does NOT perform authoritative arithmetic**: All totals, daily budgets, traveler multipliers, distance estimates, and constraint checks are evaluated by deterministic TypeScript algorithms.
3. **The LLM does NOT directly mutate durable storage**: The LLM outputs strongly typed Zod intents. Application-level validation, deterministic replanning, and optimistic concurrency checks must succeed before database updates occur.

---

## 3. Modular Services Architecture (11 Subsystems)

The core business logic under `backend/src/services/` is structured into 11 single-responsibility domain subdirectories, maintaining a clean, zero-dead-code production footprint:

```text
backend/src/services/
├── ai/                     # Multi-provider orchestration (Gemini 2.5 Flash, OpenRouter, Grok, embeddings)
├── itinerary/              # 27-file deterministic itinerary generator, scoring, modifier, persistence, FSM
├── language/               # Multilingual understanding, detector, prompts, localized strings (EN, HI, MR)
├── location/               # Live GPS reverse geocoding, proximity recommendations, session store
├── navigation/             # 3-tier Google Maps URL builders, transit mode recommendations
├── routing/                # Conversational intent router and classifications
├── transit/                # Transit route discovery and presentation
├── travel/                 # Transaction guard, session place store, place continuity
├── trip/                   # Trip lifecycle operations and management
├── vision/                 # Multimodal landmark recognition, Meta media download, Places resolution
├── whatsapp-ui/            # Interactive buttons, lists, message builders, action handlers
├── health.service.ts       # Health metrics service for /health probes
├── whatsapp-message.service.ts # Inbound message router and event dispatcher
└── whatsapp.service.ts     # Meta Graph API client for message transmission
```

### Layer Responsibilities

| Layer / Subsystem | Primary Responsibilities | Strict Non-Responsibilities |
|---|---|---|
| **Agent & LLM Layer** (`TravelAgent`, `AiProviderManager`) | Interprets user natural language, extracts planning parameters and modification intents, routes queries, synthesizes friendly responses with source attribution. | Never computes budget arithmetic, schedules time windows, predicts weather, or modifies database state directly. |
| **Multimodal Vision Subsystem** (`GeminiVisionService`, `LandmarkResolutionService`, `SessionVisualStore`) | Downloads WhatsApp images authenticated from Meta, analyzes architectural features via vision LLMs, verifies landmarks via Google Places API (New), caches 15-minute ephemeral context. | Does not fabricate Google Maps links or ratings; unverified places are flagged transparently. |
| **Deterministic Itinerary Engine** (`ItineraryGeneratorService`, `DailySchedulerService`, `CandidateRankingService`) | Normalizes candidates, enforces hard constraints, computes multi-factor preference scores, clusters geographic nodes (5 km threshold), allocates time slots, evaluates budgets, checks weather. | Does not generate freeform conversational prose or make subjective assumptions outside configured rules. |
| **WhatsApp Formatting Engine** (`WhatsAppTextFormatter`) | Centralized regex sanitization normalizes Markdown for WhatsApp: converts bolding, normalizes bullets (`• `), protects math multiplication, resolves unmatched asterisks. | Does not modify semantic message content or URL targets. |
| **External Service Integrations** (`GooglePlaces`, `OpenMeteo`, `WhatsAppCloudAPI`) | Live POI details (opening hours, ratings), meteorological forecasts ($\le 16$ days), message ingestion, and delivery. | Does not store application state or manage trip lifecycles. |
| **Durable Data Layer** (`MongoDB Atlas`, Mongoose Repositories) | Persists users, messages, conversations, trips, and vector embeddings (`$vectorSearch`), ensures atomic updates and optimistic concurrency control. | Does not perform business logic or compute itineraries. |

---

## 4. Single-Node In-Process Execution Model

TripMitra runs as an asynchronous, single-node Express process without external distributed message queues:
- **Instant Webhook Acknowledgment**: Responds to Meta with `HTTP 200 OK` within $< 1$ second to avoid retry storms.
- **Asynchronous In-Process Background Task**: Processes conversational AI turns, tool execution, and itinerary generation in the background before dispatching outbound messages.
- **At-Most-Once Reprocessing Guarantee**: If the process terminates abruptly while background work is executing, the inbound user message is stored in MongoDB, and duplicate redeliveries with the same `wamid` are safely suppressed.
- **Zero Outbound Retries on Ambiguous Network Outcomes**: If an outbound dispatch to Meta encounters a timeout or socket reset, automatic retries are suppressed to prevent duplicate message spam.

---

## 5. Architectural Non-Goals & Boundaries

To preserve focus on a robust planning core, several feature areas are intentionally outside the operational scope:
- **Transactional Booking Execution**: TripMitra never books tickets, reserves hotel rooms, or executes financial transactions. Such queries are intercepted by `TransactionGuardService` and redirected to official portals.
- **Payment Processing**: No payment gateways (Razorpay, Stripe) or credit card processing are integrated.
- **Turn-by-Turn GPS Navigation**: Route guidance is provided via estimated travel times and Google Maps deep links; real-time turn-by-turn turn navigation is deferred to native mapping apps.
- **Persistent Image Storage**: User-uploaded images are never written to disk or MongoDB; visual binary buffers exist only in volatile memory during analysis, and visual metadata expires after 15 minutes.
