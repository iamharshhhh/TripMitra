# TripMitra — Deterministic Itinerary Engine & Planning Algorithms

## 1. Engine Pipeline Architecture

The **Deterministic Itinerary Engine** transforms conversational travel requirements into chronologically valid, geographically clustered, and constraint-verified daily schedules. It is implemented across 27 interconnected, production-certified TypeScript files in [`backend/src/services/itinerary/`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary):

```text
StructuredTripRequirements + Discovered Candidates
                     │
                     ▼
        1. Normalization & Deduplication
           (PlaceNormalizer + PlaceDeduplicator: 800m threshold)
                     │
                     ▼
        2. Hard-Constraint Screening
           (PlaceFilterService: Unknown ≠ False)
                     │
                     ▼
        3. Multi-Factor Preference Scoring
           (PlaceScoringService: Weights sum to 1.0)
                     │
                     ▼
        4. Candidate Ranking & Tie-Breaking
           (CandidateRankingService: Deterministic sorting)
                     │
                     ▼
        5. Geographic Seed-and-Radius Grouping
           (GeographicGroupingService: Haversine 5 km radius)
                     │
                     ▼
        6. Daily Scheduling & Time Allocation
           (DailySchedulerService: 09:00 - 18:00 window, pace caps)
                     │
                     ▼
        7. Weather & Budget Enrichment
           (ItineraryWeatherService + BudgetService)
                     │
                     ▼
        8. Atomic Snapshot Persistence & OCC Versioning
           (ItineraryPersistenceService + TripStateMachine)
                     │
                     ▼
Scheduled Daily Itinerary Snapshot (Persisted to MongoDB)
```

---

## 2. Active 27-File Subsystem Catalog

All 27 files in `src/services/itinerary/` are active production dependencies with zero dead code:

| Subsystem Component | Key Files | Production Function |
|---|---|---|
| **Top-Level Orchestrators** | `itinerary-generator.service.ts`, `itinerary-modifier.service.ts` | Entry points for forward generation (WhatsApp wizard) and conversational editing |
| **Extractors & Mergers** | `requirement-extractor.ts`, `requirement-merger.ts`, `itinerary-modification-extractor.service.ts` | Parse user preferences from chat, merge incremental updates, extract modification intents |
| **Discovery & Normalization** | `place-discovery.service.ts`, `place-normalizer.ts`, `place-deduplicator.ts` | Discovers POIs via Places API + RAG, normalizes schemas, deduplicates spatial clusters ($800\text{m}$) |
| **Filtering & Scoring** | `candidate-ranking.service.ts`, `place-filter.service.ts`, `place-scoring.service.ts`, `place-filter.types.ts` | Enforces hard constraints, computes multi-factor weighted scores, sorts candidates |
| **Daily Scheduling** | `daily-scheduler.service.ts`, `geographic-grouping.service.ts`, `itinerary-scheduling.types.ts` | 5 km Haversine clustering, morning/afternoon/evening slot allocation, transit buffers |
| **AI Semantic Planning** | `semantic-itinerary-planner.service.ts` | Enriches daily schedules with cohesive cultural themes (with deterministic fallback) |
| **Weather & Budget Enrichment** | `itinerary-enrichment.service.ts`, `itinerary-weather.service.ts`, `budget.service.ts`, types | Open-Meteo weather suitability checks, authoritative per-traveler expense calculations |
| **Persistence & FSM** | `itinerary-persistence.service.ts`, `trip-state.machine.ts`, `itinerary-persistence.types.ts` | Atomic MongoDB snapshot writes, SHA-256 idempotency, optimistic locking |
| **Presentation** | `itinerary-presenter.service.ts`, `modification-intent.types.ts` | Formats snapshot into scannable WhatsApp cards with action menus |

---

## 3. Multi-Turn Requirement Extraction & Merging

When users plan trips over WhatsApp, requirements arrive incrementally across multiple messages (e.g. *"Plan 2 days in Pune"* followed by *"budget 5000 and interested in history"*).

### Multi-Turn Merging Invariant ([`requirement-merger.ts`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/requirement-merger.ts))
In [`TravelAgent`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/agents/travelAgent.ts), `mergeRequirements(existing, incoming)` reconciles requirements without data loss:
- **Interest Deduplication**: Combines new and previous interest arrays without duplicates.
- **Incremental Field Updating**: New dates, pace, or duration overwrite previous values, while unaffected fields (budget, accommodation style, accessibility) are preserved.
- **Budget Partial Updates**: If the user specifies an amount without repeating the currency, the existing currency (`INR`) is retained.

---

## 4. Candidate Normalization & Deduplication

### Normalization ([`PlaceNormalizer`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/place-normalizer.ts))
Raw candidates from heterogeneous sources (MongoDB Atlas RAG vs. Google Places API New) are mapped into a standardized `CandidatePlace` schema:
- **Place ID**: Prefixed identifiers (`places:ChIJ...` or `rag:...`).
- **Category Normalization**: Mapped to standard categories (`attraction`, `heritage`, `nature`, `restaurant`, `shopping`, `activity`).
- **Operating Hours**: Normalized into a 7-day schedule (`dayOfWeek: 0..6`, `openTime`, `closeTime`, `isClosed`).

### Deduplication ([`PlaceDeduplicator`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/place-deduplicator.ts))
Two candidates are considered duplicates if:
1. Exact match on `placeId` (excluding non-canonical RAG IDs).
2. Exact match on destination-scoped name slug.
3. **Proximity & Token Overlap**: Haversine distance $\le 800\text{ meters}$ (`DEFAULT_PLACE_DEDUP_DISTANCE_METERS = 800`) **AND** share at least one distinctive core token.
4. **Token Subset Match**: When GPS coordinates are missing on one candidate, distinctive core tokens form a subset match.

---

## 5. Hard-Constraint Screening (`Unknown ≠ False`)

Candidates must satisfy all non-negotiable constraints ([`PlaceFilterService`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/place-filter.service.ts)):

| Constraint | Evaluation Logic | Rejection Code |
|---|---|---|
| **Max Visit Duration** | Candidate `typicalVisitMinutes` exceeds daily window ($540\text{ min} = 9\text{ h}$). | `EXCEEDS_MAX_DURATION` |
| **Walking Tolerance** | User specified `walkingTolerance: "minimal"` AND candidate `walkingIntensity === "high"`. | `EXCEEDS_WALKING_TOLERANCE` |
| **Wheelchair Accessibility** | User requires wheelchair access AND candidate `wheelchairAccessible === false`. | `INACCESSIBLE` |
| **Explicit Dislikes** | Candidate name or tags match user's explicit exclusion requests. | `USER_EXCLUDED` |

### Invariant: Unknown Semantics
```text
Unknown ≠ False
Unknown ≠ Zero
Unknown ≠ Incompatible
```
If a place has `wheelchairAccessible === undefined` or an unknown price, it is **not** rejected outright. It is retained with an informational note.

---

## 6. Multi-Factor Preference Scoring & Tie-Breaking

Each surviving candidate receives an aggregate score $S \in [0.0, 1.0]$ ([`PlaceScoringService`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/place-scoring.service.ts)):

$$S = \sum_{k \in K} w_k \cdot s_k$$

### Scoring Weights ($\sum w_k = 1.0$)
- **Interest Alignment ($w = 0.35$)**: Substring and category mapping between user interests and place tags.
- **User Rating ($w = 0.20$)**: Linear normalization: $s = \frac{\text{rating} - 1.0}{4.0}$ (unknown rating defaults to 0.5).
- **Popularity / Review Count ($w = 0.15$)**: Logarithmic scaling: $s = \min\left(1.0, \frac{\ln(1 + \text{reviewCount})}{\ln(1 + 10000)}\right)$.
- **Budget Compatibility ($w = 0.10$)**: Match against user budget tier (budget, moderate, luxury).
- **Walking Tolerance Fit ($w = 0.10$)**: Alignment between user walking preference and place intensity.
- **Family / Kid Friendliness ($w = 0.10$)**: Boosted if traveling with children and place has `kidFriendly === true`.

### Deterministic Tie-Breaking
Ties in score $S$ are broken deterministically by:
1. Higher raw review count (`userRatingCount`).
2. Higher rating (`rating`).
3. Lexicographical comparison of `placeId`.

---

## 7. Geographic Grouping & Daily Scheduling

### Geographic Clustering ([`GeographicGroupingService`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/geographic-grouping.service.ts))
1. The highest-ranked unassigned locatable candidate becomes the **seed** of Cluster $C_i$.
2. All remaining candidates within radius $R = 5,000\text{ meters}$ (Haversine formula) are absorbed into $C_i$.
3. The cluster center is updated to the centroid of all members.
4. **Planning Preference Rule**: Clusters represent planning preferences, not hard exclusion walls. If a day's cluster lacks feasible candidates, candidates from adjacent clusters are selected to avoid empty schedules.

### Daily Scheduling Parameters ([`DailySchedulerService`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/daily-scheduler.service.ts))
- **Day Window**: 09:00 to 18:00 ($540\text{ available minutes}$).
- **Daily Place Caps**:
  - `relaxed`: Max 3 places/day.
  - `moderate`: Max 4 places/day.
  - `fast_paced`: Max 5 places/day.
- **Default Visit Duration**: 90 minutes (or place's `typicalVisitMinutes`).
- **Transit Modeling**:
  - $\text{distanceMeters} = \text{Haversine}(P_{prev}, P_{curr})$.
  - Travel time: $t_{\text{travel}} = \text{round}\left(\frac{\text{distanceMeters}}{1000} \cdot \frac{60}{\text{planningSpeedKmH}}\right) + \text{bufferMinutes}$ ($\text{speed} = 20\text{ km/h}$, $\text{buffer} = 20\text{ min}$).

---

## 8. Weather & Authoritative Budget Engines

### Real-Time Weather Decision Matrix ([`ItineraryWeatherService`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/itinerary-weather.service.ts))
Forecasts are retrieved from Open-Meteo for dates within the forecast horizon ($\le 16$ days):

| Meteorological Condition | Place `indoor` Flag | Resulting Suitability | Rationale |
|---|---|---|---|
| Severe Weather (Codes 95, 96, 99, 65, 75, 82) | `false` (Outdoor) | `unsuitable` | Thunderstorms / dangerous precipitation. |
| Severe Weather | `true` (Indoor) | `potentially_unfavorable` | Interior is safe, but transit may be difficult. |
| High Precipitation ($\ge 50\%$) | `false` (Outdoor) | `potentially_unfavorable` | Rain impairs outdoor sightseeing. |
| High Precipitation ($\ge 50\%$) | `true` (Indoor) | `suitable` | Rain does not impair museums or indoor monuments. |
| Normal Weather ($< 50\%$ precip) | Any | `suitable` | Standard favorable conditions. |
| Dates outside horizon ($> 16$ days) | Any | `unknown` | System never fabricates long-range forecasts. |

### Authoritative Budget Accounting ([`BudgetService`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/budget.service.ts))
1. **Activity Costs**: $\text{itemTotal} = \text{costPerPerson} \times \text{travelerCount}$.
2. **Unknown Costs Preservation**:
   - Places with unknown admission fees are recorded as `CostItem` with `amount = undefined` and `confidence = "unknown"`.
   - Unknown costs are **never coerced to ₹0 or treated as free admission**.
3. **Currency Mismatch**:
   - If user requirements use a different currency than place items, the engine flags `currencyMismatch: true` and sets `budgetStatus = "unknown"`.
4. **Legacy `estimatedCost` Safety**:
   - If an itinerary contains any place with unknown costs, `trip.estimatedCost` is set to `undefined`. This prevents downstream clients from displaying partial sums as the total trip price.

---

## 9. Targeted Itinerary Modification & Preservation

When modifying an itinerary ([`ItineraryModifierService`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/itinerary/itinerary-modifier.service.ts)):
- **Day-Level Preservation**: If the user modifies Day $K$, all other days $\{D_i \mid i \neq K\}$ remain **100% bit-for-bit identical**.
- **Preserved Place Exclusion**: All places scheduled on preserved days are excluded from the candidate pool for Day $K$ to prevent duplicate visits.
- **Optimistic Concurrency Control (OCC)**: Validates `expectedVersion === currentVersion`. If stale, returns HTTP 409 conflict, rejecting obsolete button clicks.
- **Version Increment**: Increments `itineraryVersion` atomically on success.
