# TripMitra — WhatsApp Gateway, Deduplication & Transaction Safety

## 1. Webhook Pipeline & Inbound Lifecycle

The integration with Meta's **WhatsApp Cloud API** is implemented in [`backend/src/controllers/whatsapp.controller.ts`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/controllers/whatsapp.controller.ts) and [`backend/src/services/whatsapp-message.service.ts`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/whatsapp-message.service.ts):

```text
                                User sends WhatsApp Message / Photo
                                              │
                                              ▼
                  Inbound Webhook POST: /api/v1/whatsapp/webhook
                                              │
                                              ▼
                HMAC-SHA256 Signature Verification (verifyWhatsAppSignature)
                                              │
                                              ▼
                         In-Flight Memory Deduplication Check
                         (5-minute TTL window on externalMessageId)
                                              │
                                              ▼
                                 WhatsAppMessageService
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │                                                   │
                    ▼                                                   ▼
       1. Immediate Acknowledgment                        2. Asynchronous Background Task
       Returns HTTP 200 OK to Meta                        - User & Conversation Resolution
       (Prevents Meta retry storms)                       - Media Download or Text Routing
                                                          - Transaction Guard Interception
                                                          - TravelAgent or Vision Execution
                                                          - WhatsAppTextFormatter Sanitization
                                                          - Outbound Graph API Dispatch
```

### 1.1. Handshake Verification (`GET /api/v1/whatsapp/webhook`)
Meta verifies webhooks upon initial setup:
- Checks `hub.mode === "subscribe"` and `hub.verify_token === env.WHATSAPP_VERIFY_TOKEN`.
- Echoes back `hub.challenge` directly with status 200 on success; returns 403 on mismatch.

### 1.2. Cryptographic Signature Validation (`POST /api/v1/whatsapp/webhook`)
- Meta signs every webhook payload in the `x-hub-signature-256` HTTP header.
- The [`verifyWhatsAppSignature`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/middleware/verifyWhatsAppSignature.ts) middleware calculates the HMAC-SHA256 digest over the raw request buffer using `env.WHATSAPP_APP_SECRET`.
- Verification uses `crypto.timingSafeEqual()` to protect against timing attack vulnerabilities.

---

## 2. Multi-Tier Inbound Deduplication

Meta aggressively retries webhooks if acknowledgment exceeds 3 seconds. To prevent duplicate AI execution:

1. **In-Flight Memory Cache (`inFlightMessageIds`)**:
   - Stores active `externalMessageId` strings (`wamid.*`) in an in-memory `Set` with a 5-minute TTL.
   - Any duplicate arriving while the first request is processing is dropped immediately.
2. **MongoDB Unique Index (`externalMessageId`)**:
   - `MessageModel` maintains a unique sparse index on `externalMessageId`.
   - If two requests pass in-memory checks concurrently, the duplicate insert throws MongoDB `E11000 Duplicate Key Error`, which is caught and suppressed safely.
3. **Database Pre-Execution Lookup**:
   - `MessageRepository.findByExternalId()` verifies whether the message has already completed and persisted.

---

## 3. WhatsApp Text Formatting Engine ([`WhatsAppTextFormatter`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/utils/whatsapp-text-formatter.ts))

WhatsApp mobile clients do not support standard Markdown headings (`###`), Markdown links (`[label](url)`), or standard markdown bullet asterisks (`* `). To prevent literal formatting leakage (such as ugly `*` characters or unclickable links), all outbound messages pass through a centralized deterministic formatting engine:

### 3.1. Formatting Invariants & Transformations

| Markdown Pattern | Transformation Logic | WhatsApp Output | Rationale |
|---|---|---|---|
| `### 🏛️ **Title**` | Strips hashes and inner bold asterisks; wraps in `*...*` | `*🏛️ Title*` | WhatsApp renders `*Title*` as native bold text. Prevents `###` and nested asterisks. |
| `* Bullet item` | Converts line-starting `* `, `- `, `+ ` into `• ` | `• Bullet item` | Prevents bullet asterisks from colliding with bold formatting asterisks. |
| `heart of *Auroville*` | Normalizes whitespace around boundary asterisks | `heart of *Auroville*` | Ensures WhatsApp mobile client recognizes the word as bold. |
| `* text *` | Normalizes inner whitespace | `*text*` | WhatsApp ignores bold tags if space follows opening `*` or precedes closing `*`. |
| `5 * 10 = 50` | Converts mathematical asterisk to multiplication symbol | `5 × 10 = 50` | Prevents mathematical formulas from accidentally toggling bold text mode. |
| `---` or `***` | Strips Markdown horizontal rules | `""` (removed) | Prevents horizontal rules from leaking stray asterisks into chat. |
| `[Google Maps](https://...)` | Converts Markdown link to clean readable link | `Google Maps: https://...` | WhatsApp cannot render inline markdown links; transforms into clickable URL. |
| Unclosed `*Heading` | Closes unmatched asterisks at line boundary | `*Heading*` | Prevents a single unclosed asterisk from corrupting the rest of the message. |

---

## 4. Ephemeral Visual Session Context ([`SessionVisualStore`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/vision/session-visual.store.ts))

When travelers upload landmark photos, visual metadata is preserved ephemerally:
- **15-Minute Sliding TTL**: Context expires automatically 15 minutes after the user's latest interaction.
- **In-Memory Isolation**: Indexed strictly by `conversationId` in volatile memory; never written to MongoDB or disk.
- **Follow-up Continuity**: If a user uploads a photo of Shaniwar Wada and then asks: *"When is it open?"* or *"How do I get there?"*, the bot resolves the context seamlessly without re-downloading media.

---

## 5. Deterministic Transaction Guard

TripMitra is strictly an informational travel companion and **does not execute bookings or financial payments**.

### 5.1. Pre-LLM Regex Interception ([`TransactionGuardService`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/travel/transaction-guard.service.ts))
Before invoking any generative LLM, user queries are evaluated against deterministic regex patterns. If a transaction request is detected, the LLM is bypassed completely.

### 5.2. Protected Transaction Domains
1. **Train Tickets**: Intercepts booking requests and redirects to **IRCTC Official Portal** (`https://www.irctc.co.in`).
2. **Bus Tickets**: Intercepts booking attempts and redirects to **MSRTC** (`https://msrtc.maharashtra.gov.in`) or **RedBus** (`https://www.redbus.in`).
3. **Flights**: Redirects to **Google Flights** (`https://www.google.com/travel/flights`).
4. **Hotels**: Advises direct booking via official hotel websites or Google Maps listings.
5. **Restaurants**: Advises direct telephone reservations or Google Maps business listings.
6. **Monument Passes**: Redirects to **ASI Official Ticket Portal** (`https://asi.paygov.in`).
7. **Cabs / Taxis**: Directs to official ride-hailing apps (Ola, Uber) or station prepaid booths.

### 5.3. Multilingual Refusal Support
Refusal responses and official links are generated in **English, Hindi, and Marathi** matching the traveler's language.

---

## 6. Interactive UI & Action Routing

In addition to text conversations, TripMitra supports Meta's interactive message types:
* **Interactive UI Builders ([`WhatsAppMessageBuilder`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/whatsapp-ui/whatsapp-message.builder.ts) & [`WhatsAppInteractiveService`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/whatsapp-ui/whatsapp-interactive.service.ts))**:
  - Quick-reply buttons (up to 3 options).
  - Structured list messages (up to 10 choices grouped in sections).
* **Deterministic Action Handling**:
  - Inbound button clicks or list selections contain structured `actionId` identifiers.
  - [`WhatsAppActionParser`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/whatsapp-ui/whatsapp-action.parser.ts) validates and routes the selection directly to [`WhatsAppActionHandler`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/whatsapp-ui/whatsapp-action.handler.ts), updating state or presenting menus without LLM latency.
