# TripMitra — Setup, Configuration & Operational Guide

## 1. Prerequisites

- **Node.js**: `v20+` or `v22+` (developed and verified on Node.js v22.18.0 with native ESM support).
- **MongoDB**: MongoDB Atlas cluster (M0 or higher with vector search enabled) or a local MongoDB server (`mongodb://127.0.0.1:27017`).
- **External API Accounts / Keys**:
  - **Google Gemini API Key**: For LLM generation (`gemini-3.6-flash`), multimodal vision analysis, and vector embeddings (`gemini-embedding-2` / `text-embedding-004`).
  - **Meta for Developers**: WhatsApp Cloud API webhook configuration, permanent/system user access token, and phone number ID.
  - **Google Places API Key / Maps Key** *(Recommended)*: For live POI discovery via Google Places API (New), landmark verification, and Google Maps links.
  - **OpenRouter API Key** *(Optional)*: For secondary LLM and multimodal vision failover.
  - **xAI Grok API Key** *(Optional)*: For tertiary text LLM failover.

---

## 2. Environment Configuration (`backend/.env`)

Create your `.env` file inside `backend/`:
```bash
cd backend
cp .env.example .env
```

### Complete Environment Variable Reference

The configuration schema is strictly defined and validated using Zod in `backend/src/config/env.ts`:

| Variable Name | Required? | Default Value | Description & Constraints |
|---|---|---|---|
| `PORT` | No | `3000` | HTTP listening port for the Express application. |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`). |
| `LOG_LEVEL` | No | `info` | Pino logging level (`debug`, `info`, `warn`, `error`). |
| `MONGODB_URI` | No | `mongodb://localhost:27017` | MongoDB connection URI (use Atlas URI for native `$vectorSearch`). |
| `MONGODB_DB_NAME` | No | `ai-travel-companion` | Target MongoDB database name. |
| `WHATSAPP_VERIFY_TOKEN` | Yes | — | Webhook challenge token configured in Meta developer portal (e.g. `<your_webhook_verify_token>`). |
| `WHATSAPP_ACCESS_TOKEN` | Yes | — | Meta System User permanent or temporary access token for outbound Graph API calls and media downloads. |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes | — | Meta WhatsApp business phone number ID. |
| `WHATSAPP_API_VERSION` | No | `v21.0` | Meta Graph API version string. |
| `WHATSAPP_APP_SECRET` | **Mandatory in prod** | `undefined` | Meta App Secret used for timing-safe HMAC-SHA256 signature verification. |
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key for conversational text, vision analysis, and embeddings. |
| `GEMINI_MODEL` | No | `gemini-3.6-flash` | Primary generative LLM and multimodal vision model identifier. |
| `GEMINI_TIMEOUT_MS` | No | `30000` | Request timeout for Gemini API calls (ms). |
| `GEMINI_EMBEDDING_MODEL` | No | `text-embedding-004` | Google embedding model identifier for vector generation. |
| `GEMINI_EMBEDDING_DIMENSIONS`| No | `768` | Dimension vector count for embeddings. |
| `AI_MAX_HISTORY_MESSAGES`| No | `10` | Maximum previous conversation turns passed to LLM context. |
| `AI_MAX_TOOL_CALLS` | No | `5` | Maximum autonomous function/tool execution steps per turn. |
| `WEATHER_TIMEOUT_MS` | No | `10000` | Timeout for Open-Meteo weather API requests (ms). |
| `WEATHER_FORECAST_HORIZON_DAYS` | No | `7` | Maximum forward days for meteorological forecast evaluation. |
| `WEATHER_PRECIPITATION_THRESHOLD` | No | `50` | Rain probability threshold percentage for unfavorable weather notices. |
| `BUDGET_DEFAULT_CURRENCY` | No | `INR` | Default currency code for budget evaluations. |
| `WHATSAPP_MAX_MESSAGE_CHARACTERS` | No | `4096` | Upper limit for WhatsApp text chunks. |
| `GOOGLE_PLACES_API_KEY` | No | `undefined` | API key for Google Places API (New) text search queries and landmark resolution. |
| `GOOGLE_PLACES_TIMEOUT_MS` | No | `10000` | Timeout for Google Places API calls (ms). |
| `GOOGLE_MAPS_API_KEY` | No | `undefined` | API key for Google Maps links and navigation URLs. |
| `OPENROUTER_API_KEY` | No | `undefined` | API key for secondary LLM and vision failover. |
| `GROK_API_KEY` | No | `undefined` | API key for tertiary text LLM failover. |
| `RAG_CHUNK_SIZE` | No | `500` | Character count per RAG knowledge chunk. |
| `RAG_CHUNK_OVERLAP` | No | `50` | Overlap character count between consecutive RAG chunks. |
| `RAG_TOP_K` | No | `5` | Top-$K$ nearest neighbors retrieved by vector search. |
| `RAG_NUM_CANDIDATES` | No | `20` | Candidate pool size evaluated during vector pre-filtering. |

---

## 3. Operational Command Catalog

All commands are run from the `backend/` directory:

```bash
# 1. Start development server with file watching and auto-reload:
npm run dev

# 2. Compile TypeScript source code into production JavaScript in dist/:
npm run build

# 3. Start the compiled production server:
npm start

# 4. Perform strict TypeScript typechecking without building (0 errors):
npm run typecheck

# 5. Run ESLint code quality checks across TypeScript files:
npm run lint

# 6. Format source code using Prettier:
npm run format

# 7. Test live MongoDB database connectivity:
npm run test:conn

# 8. Ingest cultural knowledge base into MongoDB vector chunks:
npm run rag:ingest
# (Alias: npm run knowledge:ingest)

# 9. Manage and inspect MongoDB Atlas vector search indexes:
npm run rag:vector-index

# 10. Run multimodal Gemini vision landmark identification diagnostic:
npx tsx src/scripts/test-gemini-vision.ts

# 11. Inspect MongoDB index consistency:
npx tsx src/scripts/checkIndexes.ts
```

---

## 4. Meta WhatsApp Webhook Configuration

### 4.1. Local Development Tunnel Setup
To receive webhooks from Meta's cloud servers on your local machine:
```bash
# Start an HTTPS tunnel on port 3000 using ngrok:
ngrok http 3000
```
This generates an HTTPS URL (e.g. `https://<unique-id>.ngrok-free.app`).

### 4.2. Meta Developer Portal Settings
1. Navigate to your app in **Meta for Developers** $\rightarrow$ **WhatsApp** $\rightarrow$ **Configuration**.
2. Under **Webhook**, click **Edit**:
   - **Callback URL**: `https://<your-ngrok-domain>/api/v1/whatsapp/webhook`
   - **Verify Token**: Enter the exact value matching `WHATSAPP_VERIFY_TOKEN` (e.g. `<your_webhook_verify_token>`).
3. Click **Verify and Save**. Meta will dispatch a `GET` request with challenge parameters; TripMitra validates the token and echoes the challenge immediately.
4. Under **Webhook fields**, click **Manage** and subscribe to the **`messages`** event.

---

## 5. Health Probes & Privacy Compliance

TripMitra exposes standard HTTP endpoints for operations and Meta app compliance:
- **Liveness Probe**: `GET /api/v1/health`
  - Returns service status, uptime, and system memory.
- **Readiness Probe**: `GET /api/v1/health/ready`
  - Validates active connections to MongoDB and API keys before traffic routing.
- **Privacy Policy**: `GET /privacy`
  - Serves the required Meta-compliant privacy policy page.
