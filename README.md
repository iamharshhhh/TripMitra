# TripMitra — Intelligent WhatsApp Travel Companion

[![Node.js](https://img.shields.io/badge/Node.js-v22+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_Vector_Search-green.svg)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini_2.5_Flash-orange.svg)](https://ai.google.dev/)
[![WhatsApp](https://img.shields.io/badge/Channel-WhatsApp_Cloud_API-brightgreen.svg)](https://developers.facebook.com/)

**TripMitra** is a production-grade, conversational tourist assistant and travel companion engineered specifically for **WhatsApp**. It delivers intelligent multi-day travel itineraries, targeted single-day modifications, real-time meteorological forecasting, live transit navigation, landmark photo identification, and official booking portal guidance in **English**, **Hindi**, and **Marathi**.

While **Pune, Maharashtra** serves as the initial specialized showcase and cultural demonstration destination, the entire planning engine, knowledge graph, multimodal vision pipeline, and recommendation algorithms are built on a **100% destination-agnostic architecture**.

---

## 🏛️ Core Architectural Invariants & Subsystems

1. **The Tripartite Architectural Invariant**:
   TripMitra enforces a strict separation of concerns across the request lifecycle:
   $$\text{User Intent} \longrightarrow \text{Deterministic Planning Engine} \longrightarrow \text{LLM Presentation}$$
   - Generative LLMs **never** compute budgets, schedule operating hours, calculate geographic distances, or mutate database state directly.
   - All spatial grouping, mathematical scoring, schedule validation, and financial arithmetic are executed by deterministic TypeScript services.
   - LLMs are utilized strictly for semantic intent extraction and conversational narration.

2. **Automated Multi-Provider AI Resilience**:
   - **Text Generation**: Primary is Google Gemini 2.5 Flash (`gemini-3.6-flash`). Automated failover routes to OpenRouter (`anthropic/claude-3.5-sonnet` or `openai/gpt-4o-mini`) and tertiary xAI Grok (`grok-2-latest`).
   - **Multimodal Vision**: Primary is Google Gemini 2.5 Flash with strict JSON schema validation (`responseSchema`). Secondary failover routes to OpenRouter multimodal models.
   - Automatic failover triggers on HTTP 429 (rate limits), HTTP 503 (service unavailable), network timeouts, or schema mismatches. Complete outage degrades gracefully to structured deterministic fallbacks.

3. **Multimodal Landmark Identification (Phase 10)**:
   - Travelers send photos directly via WhatsApp ("What is this place?", "Name of this place").
   - Authenticated binary streaming downloads the image directly from Meta Graph API into ephemeral memory.
   - Vision-capable AI extracts identifying architectural features and predicts the landmark.
   - Authoritative verification via **Google Places API (New)** retrieves official Google Maps links, ratings, address, and photo attributions.
   - An ephemeral **15-minute sliding session memory** (`SessionVisualStore`) maintains image context per conversation for follow-up questions without re-downloading media.

4. **Deterministic Itinerary Engine & Spatial Clustering**:
   - **Haversine Distance Clustering**: Seed-and-radius clustering with a 5 km spatial threshold prevents inefficient cross-city transit.
   - **Multi-Factor Weighted Ranking**: Places are scored mathematically based on interest alignment ($w=0.35$), ratings ($w=0.20$), reviews ($w=0.15$), weather safety ($w=0.15$), and travel distance ($w=0.15$).
   - **Targeted Day Replanning**: Allows tourists to replan specific days while preserving unaffected days bit-for-bit with Optimistic Concurrency Control (`itineraryVersion`).

5. **WhatsApp Text Formatting Engine (`WhatsAppTextFormatter`)**:
   - Centralized, deterministic regex sanitization normalizes Markdown for WhatsApp's mobile client.
   - Eliminates leaky or unmatched asterisks (e.g., converts `### 🏛️ **Title**` into clean `*🏛️ Title*`).
   - Normalizes markdown bullet points (`* `, `- `) into clean bullet symbols (`• `) to prevent formatting collisions.
   - Protects mathematical expressions (`5 * 2 = 10` $\rightarrow$ `5 × 10`) and converts markdown links to native WhatsApp clickable URLs.

6. **Safety & Deterministic Transaction Guard**:
   - TripMitra is strictly an informational assistant and **never executes financial transactions or bookings**.
   - A pre-LLM regex interceptor catches booking requests and redirects travelers to official government and travel portals (**IRCTC**, **MSRTC**, **RedBus**, **ASI**, **Google Flights**) in **English**, **Hindi**, and **Marathi**.

7. **Durable Snapshot Persistence & Concurrency**:
   - Every confirmed itinerary is stored as an immutable, self-contained snapshot with a SHA-256 `contentHash` ensuring write idempotency.
   - Optimistic concurrency control via `itineraryVersion` prevents lost updates (returning HTTP 409 on version conflicts).

---

## 🏗️ System Execution Flow

```text
[ Traveler on WhatsApp ]
           │
           ▼
[ Meta Webhook POST /api/v1/whatsapp/webhook ]
           │ (Timing-safe HMAC-SHA256 verification & in-flight deduplication)
           ▼
┌─────────────────────────────────────────────────────────────┐
│ Message Type Router                                         │
└──────┬───────────────────────────────┬──────────────────────┘
       │ [Image / Photo Message]       │ [Text Message]
       ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────────────────┐
│ Multimodal Vision Subsystem  │ │ Transaction Guard Interceptor            │
│ • Authenticated Meta DL      │ └──────┬───────────────────────────────────┘
│ • Gemini / OpenRouter Vision │        │ (Booking Request Detected?)
│ • Ephemeral Session Cache    │        ├──► [ Official Portal Redirection ]
│ • Google Places Resolution   │        ▼ (No)
└──────┬───────────────────────┘ ┌──────────────────────────────────────────┐
       │                         │ Interactive Action vs Agent Dispatch     │
       │                         │ • Buttons / Lists ──► Fast UI Handlers   │
       │                         │ • Natural Language ──► Deterministic     │
       │                         │   Itinerary Engine (Places, Weather, RAG)│
       │                         └──────┬───────────────────────────────────┘
       │                                │
       ▼                                ▼
┌─────────────────────────────────────────────────────────────┐
│ WhatsAppTextFormatter (Markdown Sanitization & Clean Bolding│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Meta Graph API Outbound Dispatch (Scannable WhatsApp Cards) │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Documentation Suite

Comprehensive technical guides are maintained under the [`docs/`](docs/) directory:

- [**01 — System Architecture**](docs/01-ARCHITECTURE.md): Architectural boundaries, layer responsibilities, 11-service subsystem design, single-node execution model, and non-goals.
- [**02 — Setup & Operations**](docs/02-SETUP-AND-OPERATIONS.md): Local installation, complete environment variable catalog (`env.ts`), operational scripts, and Meta webhook setup.
- [**03 — Multi-Provider AI Resilience**](docs/03-AI-AND-MULTI-PROVIDER.md): Automated failover tiering for text (Gemini $\rightarrow$ OpenRouter $\rightarrow$ Grok) and multimodal vision (Gemini with JSON schemas $\rightarrow$ OpenRouter), error classification, and graceful degradation.
- [**04 — Deterministic Itinerary Engine**](docs/04-ITINERARY-ENGINE.md): Haversine spatial clustering, multi-factor scoring formulas, Open-Meteo weather matrix, authoritative budget calculation, and bit-for-bit day modification.
- [**05 — Tools & Navigation**](docs/05-TOOLS-AND-NAVIGATION.md): Dynamic `ToolRegistry`, Google Places API (New) field masking, Open-Meteo weather, authoritative place verification, and 3-tier navigation URLs.
- [**06 — WhatsApp Integration & Safety**](docs/06-WHATSAPP-AND-SAFETY.md): Webhook security, message deduplication, scannable chunking ($\le 3,500$ chars), `WhatsAppTextFormatter` regex invariants, multilingual transaction guards, and interactive UI menus.
- [**07 — Data Model, State Machine & RAG**](docs/07-DATA-MODEL-AND-RAG.md): 8 Mongoose domain schemas, 7 typed repositories, `TripStateMachine`, snapshot persistence, optimistic locking, and Atlas vector search (768-dim embeddings).
- [**08 — Verification, QA & Security**](docs/08-VERIFICATION-AND-QA.md): Executable verification pipeline (`typecheck`, `build`, `lint`, `test:conn`, `test-gemini-vision.ts`), health probes, PII phone masking, and credential redaction.

---

## 📁 Repository Structure

```text
ai-travel-companion/
├── docs/                               # Comprehensive technical documentation suite
│   ├── 01-ARCHITECTURE.md
│   ├── 02-SETUP-AND-OPERATIONS.md
│   ├── 03-AI-AND-MULTI-PROVIDER.md
│   ├── 04-ITINERARY-ENGINE.md
│   ├── 05-TOOLS-AND-NAVIGATION.md
│   ├── 06-WHATSAPP-AND-SAFETY.md
│   ├── 07-DATA-MODEL-AND-RAG.md
│   └── 08-VERIFICATION-AND-QA.md
├── backend/
│   ├── dist/                           # Compiled production JavaScript output
│   ├── src/
│   │   ├── agents/                     # Conversational trip planning & editing agent (travelAgent.ts)
│   │   ├── config/                     # Environment schema (Zod), MongoDB connection, Pino logger
│   │   ├── controllers/                # Webhook, health check, and privacy controllers
│   │   ├── middleware/                 # Timing-safe HMAC signature verification, error handler, request logger
│   │   ├── models/                     # 8 Mongoose models: User, Conversation, Message, Trip, Knowledge...
│   │   ├── rag/                        # RAG vector ingestion, chunking, retrieval service, and source data
│   │   ├── repositories/               # 7 Typed repositories for data persistence and queries
│   │   ├── routes/                     # Express REST and Webhook route definitions (/api/v1/whatsapp, /health)
│   │   ├── scripts/                    # Diagnostic & operational scripts (test-gemini-vision, testConnection...)
│   │   ├── services/                   # 11 Modular domain services + root gateways:
│   │   │   ├── ai/                     # Multi-provider manager, Gemini, OpenRouter, Grok, embeddings
│   │   │   ├── itinerary/              # 27-file deterministic itinerary generator, scoring, modifier, persistence
│   │   │   ├── language/               # Multilingual understanding, detector, prompts (EN, HI, MR)
│   │   │   ├── location/               # Live GPS reverse geocoding, proximity recommendation, session store
│   │   │   ├── navigation/             # 3-tier Google Maps navigation URLs, transit mode guidance
│   │   │   ├── routing/                # Conversational intent router & classifications
│   │   │   ├── transit/                # Transit route discovery and presentation
│   │   │   ├── travel/                 # Transaction guard, session place store, place continuity
│   │   │   ├── trip/                   # Trip lifecycle operations
│   │   │   ├── vision/                 # Multimodal vision: Gemini/OpenRouter vision, Places resolution, cache
│   │   │   ├── whatsapp-ui/            # Interactive buttons, lists, message builders, action handlers
│   │   │   ├── health.service.ts       # Health metrics service
│   │   │   ├── whatsapp-message.service.ts # Inbound message router & dispatcher
│   │   │   └── whatsapp.service.ts     # Meta Graph API client for sending messages
│   │   ├── tools/                      # Tool registry: Google Places (New), Open-Meteo weather, transit
│   │   ├── types/                      # 4 Core global schemas: ai, candidate-place, express.d.ts, trip-requirements
│   │   ├── utils/                      # WhatsAppTextFormatter, Haversine geo math, date parsers, logger
│   │   ├── app.ts                      # Express app initialization with middleware and routes
│   │   └── server.ts                   # Process bootstrap and graceful shutdown manager
│   ├── .env.example                    # Verified environment variable template
│   ├── package.json                    # Project dependencies and operational scripts
│   └── tsconfig.json                   # Strict TypeScript compiler configuration
└── README.md                           # Main repository overview (this document)
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: `v20+` or `v22+` (developed and verified on Node.js v22.18.0)
- **Package Manager**: npm v10+
- **MongoDB**: MongoDB Atlas cluster with Vector Search support (or local MongoDB for development)
- **Meta WhatsApp Cloud API**: Meta App credentials (Phone Number ID, Access Token, App Secret)
- **AI Keys**: Google Gemini API key (recommended); OpenRouter / Grok keys (optional for failover)

### 2. Installation
Clone the repository and install backend dependencies:
```bash
git clone <repository-url>
cd ai-travel-companion/backend
npm install
```

### 3. Environment Configuration
Copy the sample environment configuration and fill in your keys:
```bash
cp .env.example .env
```

Key variables to configure in `backend/.env`:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/ai-travel-companion
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GOOGLE_MAPS_API_KEY=your_google_maps_places_api_key

# WhatsApp Cloud API credentials
WHATSAPP_VERIFY_TOKEN=your_custom_webhook_verify_token
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_access_token
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_APP_SECRET=your_meta_app_secret
```
*(For the complete reference, see [`docs/02-SETUP-AND-OPERATIONS.md`](docs/02-SETUP-AND-OPERATIONS.md).)*

### 4. RAG Knowledge Ingestion
Populate the vector knowledge base with curated destination insights:
```bash
npm run rag:ingest
```

### 5. Running the Application
```bash
# Start local development server with hot-reload:
npm run dev

# Or compile and run the production build:
npm run build
npm start
```

### 6. WhatsApp Webhook Setup (Local Development)
Expose your local development port (3000) using ngrok:
```bash
ngrok http 3000
```
In the **Meta App Dashboard** $\rightarrow$ **WhatsApp** $\rightarrow$ **Configuration**:
- **Callback URL**: `https://<your-ngrok-subdomain>.ngrok-free.app/api/v1/whatsapp/webhook`
- **Verify Token**: Must match `WHATSAPP_VERIFY_TOKEN` in your `.env`.
- **Webhook Fields**: Subscribe to `messages`.

---

## 🧪 Verification & Operational Diagnostics

TripMitra enforces strict quality, architectural compliance, and stability through an executable verification suite:

```bash
# 1. Typecheck: Validate strict TypeScript compilation and contracts (0 errors)
npm run typecheck

# 2. Production Build: Compile TypeScript into backend/dist/
npm run build

# 3. Linting: Enforce code style and syntax rules
npm run lint

# 4. Database Connection: Test live MongoDB connectivity
npm run test:conn

# 5. Multimodal Vision Diagnostic: Test Gemini vision landmark pipeline
npx tsx src/scripts/test-gemini-vision.ts
```

### Live Health Probes
When the server is running, monitor process health and external dependencies:
- **Liveness Probe**: `GET http://localhost:3000/api/v1/health`
  - Returns service status, uptime, and memory usage.
- **Readiness Probe**: `GET http://localhost:3000/api/v1/health/ready`
  - Validates active connections to MongoDB, Gemini API keys, and WhatsApp credentials before routing traffic.

---

## 🔒 Security & Privacy Guarantees

- **Timing-Safe Webhook Signatures**: Incoming Meta webhooks are verified via HMAC-SHA256 signatures (`X-Hub-Signature-256`) using `crypto.timingSafeEqual()`.
- **PII Protection**: Sensitive telephone numbers are automatically masked in production logs (e.g., `+91****210`).
- **Secret Redaction**: API keys and authorization headers are scrubbed from Pino application logs.
- **Zero Financial Liability**: TripMitra refuses direct transaction processing, preventing accidental payments or liability issues.
- **Privacy Policy**: Meta-compliant privacy endpoint served at `GET /privacy`.

---

## 📄 License & Attribution

Developed as an advanced agentic travel companion with Google Gemini AI and strict TypeScript architecture. Licensed under the ISC License.
