import { SessionLocationStore } from "../location/session-location.store.js";
import { LiveLocationService } from "../location/live-location.service.js";
import { LocationResponsePresenter } from "../location/location-response.presenter.js";
import { MULTILINGUAL_LOCATION_STRINGS } from "../location/location-presenter.strings.js";
import { PlacesTool } from "../../tools/places.tool.js";
import { WeatherTool } from "../../tools/weather.tool.js";
import { PlacesPresentationService } from "./places-presentation.service.js";
import { SessionPlaceStore } from "./session-place.store.js";
import { logger } from "../../utils/logger.js";
import { SupportedLanguage } from "../language/language-detector.service.js";
import { UserLivePin, NearbyCategory } from "../location/location.types.js";
import { StructuredPlaceContextItem } from "./places-presentation.service.js";

export interface SpatialEvaluationParams {
    conversationId: string;
    userId?: string;
    query: string;
    language?: SupportedLanguage;
    previousPlacesContext?: StructuredPlaceContextItem[];
}

export interface SpatialEvaluationResult {
    handled: boolean;
    replyText?: string;
    structuredContext?: StructuredPlaceContextItem[];
    sanitizedSpatialContext?: string;
    isLocationPromptOnly?: boolean;
}

/**
 * LocationPlacesDiscoveryService (Phase 4 Thin Orchestrator)
 *
 * Coordinates free-text location-aware discovery requests by delegating:
 * - Ephemeral location lifecycle to SessionLocationStore
 * - Proximity search, 3.5km boundary, ranking, and deduplication to LiveLocationService
 * - Place-centered secondary searches to PlacesTool
 * - Weather queries to WeatherTool
 * - Deterministic WhatsApp card formatting to LocationResponsePresenter / PlacesPresentationService
 *
 * Guaranteed Invariants:
 * 1. Zero duplication of spatial calculations, 3.5km cutoff, or scoring weights.
 * 2. Location Precedence: Incoming Pin -> Valid SessionLocationStore Pin (< 30m TTL) -> No Pin.
 * 3. Zero LLM hallucination or Pune default when location is absent.
 * 4. Zero raw GPS coordinates exposed in LLM prompts or chat logs.
 * 5. Deterministic ordinal resolution for follow-ups and closest-place queries.
 */
export class LocationPlacesDiscoveryService {
    liveLocationService;
    placesTool;
    weatherTool;
    constructor(liveLocationService?: LiveLocationService, placesTool?: PlacesTool, weatherTool?: WeatherTool) {
        this.liveLocationService = liveLocationService ?? new LiveLocationService();
        this.placesTool = placesTool ?? new PlacesTool();
        this.weatherTool = weatherTool ?? new WeatherTool();
    }
    /**
     * Deterministic pattern matcher for "near me", "nearby", "around here", and regional equivalents.
     */
    isSpatialNearMeQuery(query: string) {
        const q = (query || "").trim().toLowerCase();
        const spatialPatterns = [
            /\b(near me|nearby|around here|around me|close to me|walking distance|what is nearby|what can i visit nearby|anything nearby|places around here|anything interesting nearby)\b/i,
            /\b(paas me|aas paas|idhar paas|yahan paas|sabse paas|idhar kya hai|yahan kya hai|yahan ghumne|idhar ghumne|idhar acche|yahan acche|idhar koi)\b/i,
            /\b(javal|javalche|javalchi|ithe javal|tithe javal|chalnyachya antarat|saglyat javal|ithe chhan|ithe kahi)\b/i,
            /[\u0900-\u097F]+.*\b(जवळ|जवळचे|माझ्या जवळ|इथे जवळ|येथे जवळ|आस-पास|आसपास|मेरे पास|यहाँ पास|यहाँ के पास|नजदीक|निकट|पैदल दूरी|सगळ्यात जवळ|सबसे पास)\b/u
        ];
        return spatialPatterns.some((pattern) => pattern.test(q));
    }
    /**
     * Deterministic pattern matcher for "which is closest", "sabse paas kaunsa", etc.
     */
    isClosestPlaceQuery(query: string) {
        const q = (query || "").trim().toLowerCase();
        const closestPatterns = [
            /\b(which (one )?is (the )?(closest|nearest)|closest (one|place)|nearest (one|place)|which place is closest)\b/i,
            /\b(sabse paas (kaunsa|konsa|hai)|sabse nazdik)\b/i,
            /\b(saglyat javal (konta|ahe)|sarvat javal)\b/i,
            /[\u0900-\u097F]+.*\b(सबसे पास|सबसे नजदीक|सगळ्यात जवळ|सर्वात जवळ)\b/u
        ];
        return closestPatterns.some((pattern) => pattern.test(q));
    }
    /**
     * Deterministic pattern matcher for ordinal directions requests (e.g. "directions to the second one").
     */
    extractOrdinalDirectionsQuery(query: string) {
        const q = (query || "").trim().toLowerCase();
        const isDirectionIntent = /\b(directions?|route|rasta|मार्ग|दिशा|kasa jaycha|kaise jaana|how to reach|show directions)\b/i.test(q) ||
            /[\u0900-\u097F]+.*\b(मार्ग|दिशा|रस्ता|कसे जावे|रास्ता)\b/u.test(q);
        if (!isDirectionIntent) {
            return { isOrdinalDirections: false };
        }
        const ordinalIndex = this.extractOrdinalIndex(q);
        if (ordinalIndex) {
            return { isOrdinalDirections: true, ordinalIndex };
        }
        return { isOrdinalDirections: false };
    }
    /**
     * Deterministic pattern matcher for place-centered follow-ups (e.g. "cafes near the second one", "restaurants near the 1st hotel").
     */
    extractPlaceCenteredQuery(query: string) {
        const q = (query || "").trim().toLowerCase();
        const isPlaceRef = /\b(near (the |that )?(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|hotel|place|restaurant|cafe|attraction)|paas me|javal)\b/i.test(q) ||
            /\b(dusre (wale|thikani)|pehli jagah|pahilya thikani|tya hotel|us hotel|us jagah)\b/i.test(q) ||
            /[\u0900-\u097F]+.*\b(त्या|त्याच्या|तिथे|पहिल्या|दुसऱ्या|तिसऱ्या|उस|पहले|दूसरे|तीसरे)\b/u.test(q);
        if (!isPlaceRef) {
            return { isPlaceCentered: false };
        }
        const ordinalIndex = this.extractOrdinalIndex(q);
        if (!ordinalIndex) {
            return { isPlaceCentered: false };
        }
        const category = this.resolveCategoryFromQuery(q);
        return {
            isPlaceCentered: true,
            ordinalIndex,
            category,
            subQuery: q
        };
    }
    /**
     * Deterministic pattern matcher for location-aware weather queries (e.g. "What's the weather here?", "Will it rain near me?").
     */
    isWeatherWithLocationQuery(query: string) {
        const q = (query || "").trim().toLowerCase();
        const hasWeatherTerm = /\b(weather|forecast|rain|rainy|temperature|climate|हवामान|मौसम|पाऊस|बारिश)\b/i.test(q) ||
            /[\u0900-\u097F]+.*\b(हवामान|मौसम|पाऊस|बारिश|तापमान)\b/u.test(q);
        const hasSpatialTerm = /\b(here|near me|around here|ithe|idhar|yahan|माझ्या जवळ|यहाँ|इथे)\b/i.test(q) ||
            /[\u0900-\u097F]+.*\b(इथे|येथे|यहाँ|यहाँ पर|इथे)\b/u.test(q);
        return hasWeatherTerm && hasSpatialTerm;
    }
    /**
     * Main evaluation entry point for conversational spatial queries.
     */
    async handleSpatialQuery(params: SpatialEvaluationParams) {
        const { conversationId, query, previousPlacesContext = [] } = params;
        const lang = params.language || "en";
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[lang] || MULTILINGUAL_LOCATION_STRINGS.en;
        // 1. Check for closest place comparison from previous context
        if (this.isClosestPlaceQuery(query) && previousPlacesContext.length > 0) {
            return this.handleClosestQuery(previousPlacesContext, lang);
        }
        // 2. Check for ordinal directions request (e.g. "directions to the 2nd one")
        const ordinalDir = this.extractOrdinalDirectionsQuery(query);
        if (ordinalDir.isOrdinalDirections && ordinalDir.ordinalIndex && previousPlacesContext.length > 0) {
            return this.handleOrdinalDirections(previousPlacesContext, ordinalDir.ordinalIndex, lang);
        }
        // 3. Check for place-centered secondary search (e.g. "cafes near the 2nd hotel")
        const placeCentered = this.extractPlaceCenteredQuery(query);
        if (placeCentered.isPlaceCentered && placeCentered.ordinalIndex && previousPlacesContext.length > 0) {
            return this.handlePlaceCenteredSearch(previousPlacesContext, placeCentered.ordinalIndex, placeCentered.category || "attractions", lang);
        }
        // 4. Check for spatial "near me" or "weather near me" queries
        const isNearMe = this.isSpatialNearMeQuery(query);
        const isWeather = this.isWeatherWithLocationQuery(query);
        if (!isNearMe && !isWeather) {
            return { handled: false };
        }
        // 5. Precedence Tier 2: Check SessionLocationStore for active ephemeral pin
        const pin = SessionLocationStore.getLocation(conversationId);
        // Precedence Tier 3: No location / Expired (> 30m TTL)
        if (!pin) {
            logger.info({ conversationId }, "LocationPlacesDiscoveryService: No active pin for spatial query; prompting user");
            return {
                handled: true,
                replyText: locStrings.shareLocationPrompt,
                isLocationPromptOnly: true
            };
        }
        // Handle weather query for active pin
        if (isWeather) {
            return this.handleWeatherForPin(pin, lang);
        }
        // 6. Handle radial exploration via LiveLocationService
        const category = this.resolveCategoryFromQuery(query);
        return this.performRadialDiscovery(conversationId, pin, category, lang);
    }
    /**
     * Discovers nearby places using LiveLocationService (reusing existing 3.5km boundary and ranking).
     */
    async performRadialDiscovery(conversationId: string, pin: UserLivePin, category: NearbyCategory, language: SupportedLanguage) {
        const recommendation = await this.liveLocationService.performRadialExploration(conversationId, pin, language, category);
        const places = recommendation.discoveredNearbyPlaces || [];
        const normalizedPlaces = places.map((p) => ({
            id: p.id,
            name: p.name,
            address: p.address || "",
            location: { latitude: p.latitude, longitude: p.longitude },
            types: p.types || [],
            rating: p.rating,
            userRatingCount: p.userRatingCount
        }));
        // Build structured place context items for follow-ups
        const structuredContext = PlacesPresentationService.buildStructuredContext(normalizedPlaces);
        // Enrich with distance metadata for closest comparisons
        places.forEach((p, idx) => {
            if (structuredContext[idx]) {
                (structuredContext[idx] as any).distanceMeters = p.distanceMeters;
                (structuredContext[idx] as any).distanceKm = p.distanceKm;
            }
        });
        // Authoritative replacement in SessionPlaceStore (Phase 5)
        SessionPlaceStore.setPlaceContext({
            conversationId,
            structuredPlaces: structuredContext
        });
        const replyText = LocationResponsePresenter.formatRadialDiscovery({
            places,
            category,
            language
        });
        return {
            handled: true,
            replyText,
            structuredContext,
            sanitizedSpatialContext: recommendation.sanitizedSpatialContext
        };
    }
    /**
     * Deterministically finds and presents the closest place from recent place context.
     */
    handleClosestQuery(context: any, language: any) {
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[language] || MULTILINGUAL_LOCATION_STRINGS.en;
        // Filter items with valid distance
        const withDistance = context.filter((c) => typeof c.distanceMeters === "number");
        if (withDistance.length === 0) {
            // Fall back to first item if explicit distance is missing
            const first = context[0];
            const reply = `📍 *${first.name}*\n🗺️ ${locStrings.directionsLabel}: ${first.mapsUrl}`;
            return { handled: true, replyText: reply, structuredContext: context };
        }
        // Sort ascending by distance
        withDistance.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
        const closest = withDistance[0];
        const distLabel = (closest.distanceMeters || 0) >= 1000
            ? locStrings.distanceKm(((closest.distanceMeters || 0) / 1000).toFixed(1))
            : locStrings.distanceMeter(closest.distanceMeters || 0);
        const walkingNote = (closest.distanceMeters || 0) <= 1200 ? `\n${locStrings.recommendedWalk}` : "";
        const lines = [
            `📍 *${closest.name}* is closest to your location!`,
            `📏 *Distance:* ~${distLabel}${walkingNote}`,
            `🗺️ *${locStrings.directionsLabel}:* ${closest.mapsUrl}`
        ];
        if (language === "hi") {
            lines[0] = `📍 *${closest.name}* आपके स्थान से सबसे नजदीक है!`;
            lines[1] = `📏 *दूरी:* ~${distLabel}${walkingNote}`;
            lines[2] = `🗺️ *${locStrings.directionsLabel}:* ${closest.mapsUrl}`;
        }
        else if (language === "mr") {
            lines[0] = `📍 *${closest.name}* तुमच्या स्थानापासून सर्वात जवळ आहे!`;
            lines[1] = `📏 *अंतर:* ~${distLabel}${walkingNote}`;
            lines[2] = `🗺️ *${locStrings.directionsLabel}:* ${closest.mapsUrl}`;
        }
        return {
            handled: true,
            replyText: lines.join("\n"),
            structuredContext: context
        };
    }
    /**
     * Deterministically produces navigation directions for an ordinal item (#1..5).
     */
    handleOrdinalDirections(context: any, ordinalIndex: any, language: any) {
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[language] || MULTILINGUAL_LOCATION_STRINGS.en;
        const target = context[ordinalIndex - 1];
        if (!target) {
            return {
                handled: true,
                replyText: language === "mr"
                    ? `क्षमस्व, या क्रमांकाचे ठिकाण सापडले नाही. कृपया 1 ते ${context.length} मधील क्रमांक निवडा.`
                    : language === "hi"
                        ? `क्षमा करें, इस नंबर का स्थान नहीं मिला। कृपया 1 से ${context.length} के बीच का नंबर चुनें।`
                        : `Sorry, place #${ordinalIndex} was not found. Please choose between 1 and ${context.length}.`,
                structuredContext: context
            };
        }
        const distPart = target.distanceMeters
            ? `\n📏 *Distance:* ~${target.distanceMeters >= 1000 ? (target.distanceMeters / 1000).toFixed(1) + " km" : target.distanceMeters + "m"}`
            : "";
        const travelMode = target.distanceMeters && target.distanceMeters <= 1200 ? "walking" : "driving";
        let directionsUrl = target.mapsUrl;
        if (typeof target.latitude === "number" && typeof target.longitude === "number") {
            directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}&travelmode=${travelMode}`;
        }
        const lines = [
            `🗺️ *${target.name}* - ${locStrings.directionsLabel}:`,
            `${target.address ? `📍 ${target.address}` : ""}${distPart}`,
            `🔗 ${directionsUrl}`
        ]
            .filter(Boolean)
            .join("\n");
        return {
            handled: true,
            replyText: lines,
            structuredContext: context
        };
    }
    /**
     * Performs a secondary place-centered search around the coordinates of a resolved place.
     */
    async handlePlaceCenteredSearch(context: any, ordinalIndex: any, category: any, language: any) {
        const target = context[ordinalIndex - 1];
        if (!target || typeof target.latitude !== "number" || typeof target.longitude !== "number") {
            return { handled: false };
        }
        logger.info({ placeName: target.name, category }, "LocationPlacesDiscoveryService: Performing place-centered search");
        const queryTerms = {
            attractions: "tourist attractions OR sightseeing",
            food: "restaurants OR food",
            cafes: "cafes OR coffee",
            hotels: "hotels OR stays",
            shopping: "shopping OR markets",
            photos: "scenic viewpoints"
        };
        const searchQuery = queryTerms[category] || queryTerms.attractions;
        const result = await this.placesTool.execute({
            query: searchQuery,
            latitude: target.latitude,
            longitude: target.longitude,
            radius: 3500,
            maxResults: 5
        });
        if (result.success && result.data && Array.isArray(result.data.places) && result.data.places.length > 0) {
            const places = result.data.places;
            const formatted = PlacesPresentationService.formatPlacesList({
                places,
                query: searchQuery,
                destination: target.name,
                language
            });
            const newContext = PlacesPresentationService.buildStructuredContext(places);
            return {
                handled: true,
                replyText: formatted,
                structuredContext: newContext
            };
        }
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[language] || MULTILINGUAL_LOCATION_STRINGS.en;
        const categoryName = locStrings.categoryNames[category] || category;
        return {
            handled: true,
            replyText: locStrings.noPlacesFoundCategory(categoryName),
            structuredContext: context
        };
    }
    /**
     * Retrieves weather forecast for an active location pin without exposing raw GPS coordinates.
     */
    async handleWeatherForPin(pin: any, language: any) {
        try {
            const weatherResult = await this.weatherTool.execute({
                latitude: pin.latitude,
                longitude: pin.longitude
            });
            if (weatherResult.success && weatherResult.data?.forecast && weatherResult.data.forecast.length > 0) {
                const today = weatherResult.data.forecast[0];
                const lines = [
                    `🌤️ *Current Weather Forecast:*`,
                    `🌡️ Temperature: ${today.temperatureMin}°C - ${today.temperatureMax}°C`,
                    `☁️ Condition: ${today.weatherDescription}`,
                    `🌧️ Rain Probability: ${today.precipitationProbability}%`
                ];
                if (language === "hi") {
                    lines[0] = `🌤️ *आपके स्थान का मौसम पूर्वानुमान:*`;
                    lines[1] = `🌡️ तापमान: ${today.temperatureMin}°C - ${today.temperatureMax}°C`;
                    lines[2] = `☁️ स्थिति: ${today.weatherDescription}`;
                    lines[3] = `🌧️ बारिश की संभावना: ${today.precipitationProbability}%`;
                }
                else if (language === "mr") {
                    lines[0] = `🌤️ *तुमच्या स्थानावरील हवामान अंदाज:*`;
                    lines[1] = `🌡️ तापमान: ${today.temperatureMin}°C - ${today.temperatureMax}°C`;
                    lines[2] = `☁️ स्थिती: ${today.weatherDescription}`;
                    lines[3] = `🌧️ पावसाची शक्यता: ${today.precipitationProbability}%`;
                }
                return {
                    handled: true,
                    replyText: lines.join("\n")
                };
            }
        }
        catch (err) {
            logger.warn({ err }, "Failed to fetch weather forecast for active pin");
        }
        return {
            handled: true,
            replyText: language === "mr"
                ? "सध्या या स्थानावरील हवामान माहिती उपलब्ध नाही."
                : language === "hi"
                    ? "वर्तमान में इस स्थान की मौसम जानकारी उपलब्ध नहीं है।"
                    : "Weather information is temporarily unavailable for this location."
        };
    }
    /**
     * Helper: Maps text query keywords to a NearbyCategory.
     */
    resolveCategoryFromQuery(query: any) {
        const q = query.toLowerCase();
        if (q.includes("cafe") || q.includes("coffee") || q.includes("tea") || q.includes("chai") || q.includes("bakery")) {
            return "cafes";
        }
        if (q.includes("food") ||
            q.includes("restaurant") ||
            q.includes("eat") ||
            q.includes("dining") ||
            q.includes("lunch") ||
            q.includes("dinner") ||
            q.includes("breakfast") ||
            q.includes("misal") ||
            q.includes("dhaba") ||
            q.includes("जेवण") ||
            q.includes("खाद्य") ||
            q.includes("भोजन")) {
            return "food";
        }
        if (q.includes("hotel") ||
            q.includes("stay") ||
            q.includes("resort") ||
            q.includes("homestay") ||
            q.includes("lodge") ||
            q.includes("हॉटेल") ||
            q.includes("रुकने") ||
            q.includes("मुक्काम")) {
            return "hotels";
        }
        if (q.includes("shopping") || q.includes("market") || q.includes("bazaar") || q.includes("खरेदी") || q.includes("बाज़ार")) {
            return "shopping";
        }
        if (q.includes("photo") || q.includes("viewpoint") || q.includes("scenic")) {
            return "photos";
        }
        return "attractions";
    }
    /**
     * Helper: Extracts ordinal index (1 to 5) from textual query.
     */
    extractOrdinalIndex(query: any) {
        const q = query.toLowerCase();
        if (/\b(1st|first|pehla|pahila|पहिला|पहिलं|पहिला)\b/i.test(q))
            return 1;
        if (/\b(2nd|second|dusra|dusre|दुसरा|दुसरं|दूसरा)\b/i.test(q))
            return 2;
        if (/\b(3rd|third|tisra|tisre|तिसरा|तिसरं|तीसरा)\b/i.test(q))
            return 3;
        if (/\b(4th|fourth|chautha|chauthe|चौथा|चौथं)\b/i.test(q))
            return 4;
        if (/\b(5th|fifth|panchva|pachva|पाँचवाँ|पाचवा|पाचवं)\b/i.test(q))
            return 5;
        if (/\b(1|#1)\b/.test(q))
            return 1;
        if (/\b(2|#2)\b/.test(q))
            return 2;
        if (/\b(3|#3)\b/.test(q))
            return 3;
        if (/\b(4|#4)\b/.test(q))
            return 4;
        if (/\b(5|#5)\b/.test(q))
            return 5;
        return null;
    }
}
