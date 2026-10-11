# TripMitra — Dynamic Tools & Navigation Subsystem

## 1. Dynamic Tool Registry ([`ToolRegistry`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/tools/tool.registry.ts))

The `ToolRegistry` provides an extensible, type-safe execution framework that connects LLM providers to live external APIs and deterministic calculation services.

### Dual Schema Serialization
To support both Google Gemini and OpenAI-compatible providers seamlessly, `ToolRegistry` converts registered tools into two standard formats:
1. **Gemini Declarations (`getDeclarations()`)**: Converted into `@google/genai` function declarations.
2. **OpenAI Tool Definitions (`getOpenAIToolDefinitions()`)**: Converted into standard OpenAI/OpenRouter function tool objects (`{ type: "function", function: { name, description, parameters } }`).

---

## 2. Active Travel Tools

### 2.1. Weather Tool (`get_weather_forecast`)
* **Source File**: [`backend/src/tools/weather.tool.ts`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/tools/weather.tool.ts)
* **Provider**: **Open-Meteo REST API**
* **Authentication**: None required (public meteorological data).
* **Input Schema**:
  ```typescript
  {
    latitude?: number;    // default 18.5204 (Pune)
    longitude?: number;   // default 73.8567 (Pune)
    startDate?: string;   // YYYY-MM-DD
    endDate?: string;     // YYYY-MM-DD
  }
  ```
* **Output Capabilities**:
  - Daily minimum and maximum temperatures.
  - Precipitation probability percentages.
  - WMO Weather Interpretation Code mapping (e.g. Code 0 = "Clear sky", Code 65 = "Heavy rain", Code 95 = "Thunderstorm").

---

### 2.2. Places Tool (`search_places`)
* **Source File**: [`backend/src/tools/places.tool.ts`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/tools/places.tool.ts)
* **Provider**: **Google Places API (New)** `places:searchText`
* **Authentication**: `GOOGLE_PLACES_API_KEY`
* **Strict Field Masking**: To optimize latency and minimize API cost, requests restrict returned fields to:
  ```text
  places.id, places.displayName, places.formattedAddress, places.location,
  places.rating, places.userRatingCount, places.priceLevel,
  places.regularOpeningHours, places.currentOpeningHours, places.types
  ```
* **Normalized Place Schema**: Maps heterogeneous Google Places responses into `NormalizedPlace` objects with parsed opening hours periods, weekday descriptions, and latitude/longitude coordinates.

---

### 2.3. Intercity Transit Tool (`get_transit_routes`)
* **Source File**: [`backend/src/tools/transit.tool.ts`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/tools/transit.tool.ts)
* **Engine**: [`TransitRoutingService`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/transit/transit-routing.service.ts)
* **Input Schema**:
  ```typescript
  {
    origin: string;        // e.g. "Pune", "Mumbai", "Delhi"
    destination: string;   // e.g. "Pondicherry", "Goa", "Jaipur"
    preferredMode?: "train" | "bus" | "flight" | "road" | "all";
  }
  ```
* **Output Capabilities**:
  - Realistic journey durations across all available modes.
  - Departure and arrival hubs (stations, airports, bus terminals).
  - Transit transfer points and corridor travel recommendations.
  - Direct links to official verification portals (IRCTC, State Road Transport, airline aggregators).

---

## 3. Navigation Deep Link Hierarchy ([`NavigationUrlBuilder`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/navigation/navigation-url.builder.ts))

When presenting itineraries or transit routes in WhatsApp, Google Maps links are generated deterministically using a 3-tier fallback hierarchy:

```text
[ NavigationDestination Object ]
               │
               ▼
   Has Place ID & Name? ───────► YES ──► Tier A: Verified Place Search URL
               │
               ▼ NO
   Has Valid Coordinates? ─────► YES ──► Tier B: Coordinate Search URL
               │
               ▼ NO
   Has Place Name? ────────────► YES ──► Tier C: Name + Destination City Fallback
               │
               ▼ NO
          Return null
```

### Hierarchy Tiers
* **Tier A (Place ID + Name)**:
  `https://www.google.com/maps/search/?api=1&query=Shaniwar%20Wada&query_place_id=ChIJ...`
  *Provides the highest reliability, anchoring directly to Google's verified place entity.*
* **Tier B (Coordinate Fallback)**:
  `https://www.google.com/maps/search/?api=1&query=18.5196%2C73.8553`
  *Direct coordinate pinpoint when Google Place IDs are unavailable.*
* **Tier C (Name + City Fallback)**:
  `https://www.google.com/maps/search/?api=1&query=Aga%20Khan%20Palace%2C%20Pune`
  *Text-based geographic search fallback.*
* **Compact Mobile Links**:
  `https://maps.google.com/?q=18.51960,73.85530`
  *Compact format with coordinates rounded to 5 decimal places for clean WhatsApp display.*

---

## 4. Authoritative Landmark Places Verification ([`LandmarkResolutionService`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/ai-travel-companion/backend/src/services/vision/landmark-resolution.service.ts))

When travelers upload photos for landmark recognition:
1. The visual AI model extracts the candidate place name (e.g., *"Matrimandir"* or *"Shaniwar Wada"*).
2. `LandmarkResolutionService` performs an authoritative lookup via Google Places API (New):
   - Queries `places:searchText` with field masking for verified address, GPS coordinates, rating, user review count, and Google Maps URL.
   - If resolved, the landmark is certified as **Verified** and provided with an authoritative Google Maps link.
   - If not found or if Places API quota is unavailable, the landmark is flagged honestly as an **Unverified Visual Prediction**, preventing fabricated ratings or broken map links.
