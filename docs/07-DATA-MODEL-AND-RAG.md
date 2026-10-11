# TripMitra — Data Model, State Persistence & RAG Architecture

## 1. Domain Models & Entity Relationships

The data layer is implemented using MongoDB with Mongoose ODM, organized across 8 core domain models and 7 typed repositories:

```text
+-----------------------+              +---------------------------+
|         User          | 1          1 |      UserPreference       |
|-----------------------|<-------------|---------------------------|
| _id                   |              | userId (unique index)     |
| phoneNumber (indexed) |              | travelType                |
| name                  |              | interests                 |
| language              |              | walkingTolerance          |
| homeLocation          |              | preferredTransport        |
+-----------------------+              +---------------------------+
          | 1
          |
          | 1..N
          v
+-----------------------+              +---------------------------+
|     Conversation      | 1       1..N |          Message          |
|-----------------------|------------->|---------------------------|
| _id                   |              | conversationId (indexed)  |
| userId (indexed)      |              | role (user/assistant)     |
| activeTripId (ref)    |              | content                   |
| status                |              | externalMessageId (unique)|
+-----------------------+              | timestamp (indexed)       |
          | 1                          +---------------------------+
          |
          | 0..1 (active)
          v
+------------------------------------------------------------------+
|                              Trip                                |
|------------------------------------------------------------------|
| _id                                                              |
| userId (indexed)                                                 |
| destination / destinationSlug (indexed)                          |
| travelers                                                        |
| requirements (StructuredTripRequirements)                        |
| planningState (collecting_requirements -> planning -> ...)       |
| status (planning / confirmed / active / ...)                     |
| itinerarySnapshot (PersistedItinerarySnapshot)                   |
| itineraryVersion (Number, increments on genuine updates)         |
| budgetBreakdown (Authoritative BudgetEvaluationResult)           |
| estimatedCost (Number, legacy safety: undefined if unknown costs)|
+------------------------------------------------------------------+
```

---

## 2. Model Specifications (8 Core Models)

| Model | File Path | Collection | Primary Responsibility & Indexes |
|---|---|---|---|
| **User** | `models/User.ts` | `users` | Traveler identity; unique index on `phoneNumber` |
| **UserPreference** | `models/UserPreference.ts` | `userpreferences` | Personal travel preferences; unique index on `userId` |
| **Conversation** | `models/Conversation.ts` | `conversations` | Conversation session and active trip binding; index on `userId` |
| **Message** | `models/Message.ts` | `messages` | Chat history and raw transcripts; unique sparse index on `externalMessageId` (`wamid.*`) for webhook deduplication |
| **Trip** | `models/Trip.ts` | `trips` | Multi-day trip plan, requirements, snapshots, version, and state machine; index on `userId`, `destinationSlug` |
| **DistributedLock** | `models/DistributedLock.ts` | `distributedlocks` | Concurrency lock with automatic TTL expiration for distributed safety |
| **KnowledgeDocument** | `models/KnowledgeDocument.ts` | `knowledgedocuments` | Normalized cultural and tourist knowledge source documents |
| **KnowledgeChunk** | `models/KnowledgeChunk.ts` | `knowledgechunks` | Semantic text chunks with 768-dim embeddings for Atlas Vector Search |

---

## 3. Repositories Layer (`backend/src/repositories/`)

All data access is mediated through 7 strongly typed repositories that encapsulate queries and atomic updates:
- **`user.repository.ts`**: Finds or creates users by international phone number.
- **`user-preference.repository.ts`**: Persists and queries user dietary, walking, and pace preferences.
- **`conversation.repository.ts`**: Manages active conversation sessions and trip bindings.
- **`message.repository.ts`**: Manages inbound/outbound chat history with idempotency lookups (`findByExternalId`).
- **`trip.repository.ts`**: Executes atomic snapshot saves, optimistic concurrency version checks, and trip queries.
- **`knowledgeDocument.repository.ts`**: Manages knowledge documents for RAG indexing.
- **`knowledgeChunk.repository.ts`**: Performs native MongoDB `$vectorSearch` or local in-memory cosine similarity fallback.

---

## 4. Trip Planning State Machine

The trip planning lifecycle is governed by [`TripStateMachine`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/trip-state.machine.ts):

```text
[ collecting_requirements ] <----------------------------------------+
           |                                                          |
           | (has required fields: destination + duration)            | (missing fields
           v                                                          |  or replan requested)
      [ planning ] ---------------------------------------------------+
           |
           | (itinerary generated & persisted)
           v
  [ itinerary_created ] <---------------------------------------------+
      /              \                                                |
     /                \                                               |
(user requests     (user confirms)                                    |
 modification)          \                                             |
   v                     v                                            |
[ modifying_itinerary ] [ confirmed ]                                 |
   |         |                 \                                      |
   |         | (replan          \ (start date arrives)                |
   |         |  all days)        v                                    |
   |         +-------------> [ traveling ]                            |
   |                               \                                  |
   |                                \ (end date passes)               |
   |                                 v                                |
   |                           [ completed ]                          |
   |                                                                  |
   +-----------------(modification completed & persisted)-------------+
```

### Transition Guards
1. **Entering `planning`**: Requires non-empty `destination` and a positive `durationDays`.
2. **Entering `modifying_itinerary`**: Requires an existing itinerary (`trip.itinerarySnapshot.days.length > 0`).
3. **Entering `confirmed`**: Requires an existing itinerary.
4. **Self-Transitions**: Executed as safe no-ops.
5. **Terminal State**: `completed` allows no outbound transitions.

---

## 5. Snapshot Persistence & Optimistic Concurrency

### 5.1. True Idempotency via SHA-256 Content Hash
Before saving an itinerary, [`computeItineraryContentHash()`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/itinerary-persistence.service.ts) hashes the canonical place sequence and known costs:
* If the incoming snapshot matches the existing `contentHash` in MongoDB, the save operation executes as a **true no-op**.
* The `itineraryVersion` **remains unchanged**, preventing redundant writes.

### 5.2. Optimistic Concurrency Control (HTTP 409 Conflict)
When modifying an existing itinerary, clients must provide `expectedVersion`:
* If `expectedVersion !== trip.itineraryVersion`, [`ItineraryModifierService`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/itinerary-modifier.service.ts) throws `AppError(409, "ITINERARY_VERSION_CONFLICT")`.
* During database updates, [`TripRepository.saveItinerary()`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/repositories/trip.repository.ts) executes an atomic conditional update matching `_id` and `itineraryVersion`. If a concurrent update changed the version, it throws `AppError(409, "CONCURRENT_ITINERARY_MODIFICATION")`.

---

## 6. RAG Knowledge Ingestion & Vector Search

Cultural background, local heritage context, and historical insights are provided through a dedicated **Retrieval-Augmented Generation (RAG)** pipeline:

```text
External Knowledge Sources (REST API, Curated Tourism Feeds)
                            │
                            ▼
     Normalized Documents (Collection: knowledgedocuments)
                            │
                            ▼
     Document Chunker (500–800 chars, 50–120 overlap)
                            │
                            ▼
     Content Hash Comparison (SHA-256)
     ├── Hash Unchanged: Skip re-embedding
     └── Hash Changed / New: Generate vector embedding
                            │
                            ▼
     Google Embedding Model (768 dimensions)
                            │
                            ▼
     MongoDB Atlas (Collection: knowledgechunks)
     Vector Search Index: knowledge_chunks_vector_index
```

### 6.1. Native Atlas Vector Search
* **Index**: `knowledge_chunks_vector_index`
* **Metric**: `cosine` similarity
* **Dimensions**: `768`
* **Filter Paths**: `destinationSlug`, `category` (enables lightning-fast pre-filtering by destination).

### 6.2. In-Memory Cosine Fallback
[`KnowledgeChunkRepository`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/repositories/knowledgeChunk.repository.ts) contains an in-memory dot-product cosine similarity engine that executes automatically when running against local MongoDB instances without Atlas Search.

---

## 7. Clean Global Type Definitions (`backend/src/types/`)

Following the safe removal of unintegrated legacy prototype schemas (`phase11-orchestration.types.ts`), the global type layer is strictly organized into 4 active production schemas:
- **`ai.types.ts`**: Multi-provider AI interfaces (`AIMessage`, `AIRequest`, `AIResponse`, `AIProvider`).
- **`candidate-place.types.ts`**: Candidate place domain schema (`CandidatePlace`, `CandidatePlaceLocation`).
- **`express.d.ts`**: Ambient Express augmentation (`req.id`, `req.rawBody` for timing-safe signature verification).
- **`trip-requirements.types.ts`**: Zod schemas and normalization functions for trip planning (`StructuredTripRequirements`).
