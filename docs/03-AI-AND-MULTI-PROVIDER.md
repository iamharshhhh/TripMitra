# TripMitra — Multi-Provider AI Architecture & Fallback Tiering

## 1. Overview & Dual-Track AI Resilience

To ensure 24/7 high availability against upstream API outages, rate limits, and quota exhaustion, TripMitra operates a **dual-track multi-provider AI resilience architecture**:
1. **Conversational Text Track**: Generative chat, parameter extraction, and itinerary narration.
2. **Multimodal Vision Track**: Inbound image landmark identification and visual observation extraction.

```text
                                  +-------------------------------------------------------------+
                                  |                     Inbound User Request                    |
                                  +-------------------------------------------------------------+
                                            /                                           \
                 [Image / Photo Message]   /                                             \   [Conversational Text]
                                          v                                               v
    +-----------------------------------------------------+   +-----------------------------------------------------+
    |              Multimodal Vision Track                |   |              Conversational Text Track              |
    |  MultimodalVisionChatbotService                     |   |  AiProviderManager                                  |
    |                                                     |   |                                                     |
    |  1. Primary: GeminiVisionService                    |   |  1. Primary: GeminiProvider                         |
    |     - Model: "gemini-3.6-flash"                     |   |     - Model: "gemini-3.6-flash"                     |
    |     - Strict JSON responseSchema                    |   |     - Native Tools & Structured JSON                |
    |     - Binary Buffer Streaming                       |   |                                                     |
    |                 | (429, 503, timeout)               |   |                 | (429, 503, timeout)               |
    |                 v                                   |   |                 v                                   |
    |  2. Secondary: OpenRouterVisionService              |   |  2. Secondary: OpenRouterProvider                   |
    |     - Model: "google/gemini-2.5-flash" or vision    |   |     - Protocol: OpenAICompatibleProvider            |
    |     - Base64 Multimodal Payload                     |   |     - Model: "openrouter/auto"                      |
    |                 |                                   |   |                 |                                   |
    |                 v                                   |   |                 v                                   |
    |  Authoritative Resolution & Places Verification:    |   |  3. Tertiary: GrokProvider                          |
    |  - LandmarkResolutionService                        |   |     - Model: "grok-2-latest"                        |
    |  - Google Places API (New) official links & ratings |   +-----------------------------------------------------+
    |  - 15-Min Ephemeral Cache (SessionVisualStore)      |                              |
    +-----------------------------------------------------+                              | (All fail)
                              \                                                          v
                               \                                      +---------------------------------------------+
                                \                                     | Safe Friendly Degradation Message           |
                                 \                                    +---------------------------------------------+
                                  \                                                  /
                                   v                                                v
                                  +-----------------------------------------------------+
                                  | WhatsAppTextFormatter -> Outbound Meta Graph API    |
                                  +-----------------------------------------------------+
```

---

## 2. Conversational Text Track: Provider Inventory & Capabilities

| Priority | Provider Class | Base Protocol / SDK | Endpoint / Transport | Default Model | Configuration Requirement |
|:---:|---|---|---|---|---|
| **1** | [`GeminiProvider`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/ai/gemini.provider.ts) | Official `@google/genai` SDK | Google Gemini API | `gemini-3.6-flash` | Requires `GEMINI_API_KEY`. Primary provider supporting native function declarations and structured JSON. |
| **2** | [`OpenRouterProvider`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/ai/openrouter.provider.ts) | Extends `OpenAICompatibleProvider` | `https://openrouter.ai/api/v1/chat/completions` | `openrouter/auto` | Activated when `OPENROUTER_API_KEY` is present. Uses standard HTTP Chat Completions. |
| **3** | [`GrokProvider`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/ai/grok.provider.ts) | Extends `OpenAICompatibleProvider` | `https://api.x.ai/v1/chat/completions` | `grok-2-latest` | Activated when `GROK_API_KEY` is present. Uses standard HTTP Chat Completions. |

---

## 3. Multimodal Vision Track (Phase 10 Landmark Identification)

The multimodal vision pipeline enables travelers on WhatsApp to snap a photo of any monument, temple, signboard, or building and ask: *"What is this place?"* or *"Name of this place"*.

### 3.1. Vision Subsystem Components (`backend/src/services/vision/`)

1. **`WhatsAppMediaService`**:
   - Queries Meta Graph API (`GET /v21.0/{mediaId}`) to retrieve authenticated download URL.
   - Streams media bytes directly into ephemeral memory buffer (`Buffer`). Never writes user images to persistent disk or database.
2. **`MediaValidatorService`**:
   - Validates declared MIME types (`image/jpeg`, `image/png`, `image/webp`).
   - Validates binary magic numbers to prevent MIME spoofing.
   - Enforces 16 MB payload upper limit.
3. **`GeminiVisionService`**:
   - Primary vision engine using Google Gemini 2.5 Flash.
   - Formulates multimodal content with image inline data and structured extraction instructions.
   - Uses strict Gemini `responseSchema` enforcing the `LandmarkVisionResponse` JSON schema:
     - `identifiedPlaceName`: String (e.g. "Matrimandir", "Shaniwar Wada")
     - `confidence`: Float between 0.0 and 1.0
     - `analysisType`: "landmark" | "signboard" | "menu" | "general"
     - `architecturalFeatures`: Array of visual clues detected
     - `historicalContext`: Historical summary for traveler guidance
4. **`OpenRouterVisionService`**:
   - Secondary vision failover provider.
   - Encodes image buffer to Base64 data URL and passes to vision-capable OpenRouter models.
5. **`LandmarkResolutionService`**:
   - Resolves predicted place name against Google Places API (New) with field masking.
   - Retrieves authoritative Google Maps URL, user ratings, total review count, and photo attribution.
   - Flags whether landmark is authoritatively verified or an unverified candidate.
6. **`SessionVisualStore`**:
   - In-memory sliding TTL cache storing recent visual context per conversation ID (15-minute expiration).
   - Allows follow-up conversational questions (e.g. User: "What are its visiting hours?") without requiring the user to re-upload the photo.

---

## 4. Shared Protocol Base: `chat-completions.provider.ts`

Both secondary (`OpenRouterProvider`) and tertiary (`GrokProvider`) providers inherit from the protocol-oriented base class `OpenAICompatibleProvider` defined in [`backend/src/services/ai/chat-completions.provider.ts`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/ai/chat-completions.provider.ts).

### Key Architectural Capabilities
1. **Generic Protocol Compatibility**: Adheres to the HTTP Chat Completions format (request body with `model`, `messages`, `tools`, `temperature`). Does **not** require an OpenAI API key or official OpenAI SDK.
2. **Message Normalization**: Translates application messages into `system`, `user`, and `assistant` roles.
3. **Tool Definition Transformation**: Converts registered tools from `ToolRegistry.getOpenAIToolDefinitions()` into standard function declarations with JSON schema parameters.
4. **Autonomous Multi-Turn Loop**: If the model emits `tool_calls`, the base provider executes each requested tool safely, appends tool outputs as `role: "tool"` messages, and re-invokes the model up to `AI_MAX_TOOL_CALLS` (default `5`).
5. **Provider Header Injection**: Supports custom headers (e.g. `HTTP-Referer: https://tripmitra.local`, `X-Title: TripMitra`).

---

## 5. Fallback Eligibility Evaluation (`isFallbackEligibleError`)

When a provider fails, [`isFallbackEligibleError()`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/ai/ai-provider-manager.ts) evaluates the exception. Only transient or quota-related errors trigger failover:

### Fallback-Eligible Errors (Trigger Failover)
* **HTTP 429 / Quota Exhaustion**: `RESOURCE_EXHAUSTED`, rate limits, quota exceeded.
* **HTTP 502, 503, 504**: Upstream provider unavailable, bad gateway, gateway timeout.
* **Request Timeout**: Execution exceeds configured provider timeout (`GEMINI_TIMEOUT_MS = 30000`, `timeoutMs = 15000`).
* **Socket / Network Errors**: `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `fetch failed`.

### Non-Fallback-Eligible Errors (Fail Fast)
* **HTTP 400 Bad Request**: Malformed user prompt or unparseable input.
* **Client Validation Errors (`VALIDATION_ERROR`)**: Schema mismatch on client input.
* **Corrupt Image / Unsupported MIME**: Rejected immediately without upstream retries.

---

## 6. Total Outage Graceful Degradation

If all configured AI providers fail simultaneously:
1. `AiProviderManager` logs an aggregated failure notice with the last recorded error.
2. `WhatsAppMessageService` intercepts the error and dispatches a friendly, static fallback message:
   > *"I'm having a little trouble connecting to my planning engine right now. Please try again in a few moments, or ask me about Pune attractions and weather!"*
3. **Zero Server Crash**: The Express server remains fully healthy, MongoDB connections remain open, and health checks continue reporting readiness.
