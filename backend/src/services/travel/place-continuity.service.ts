import { SessionPlaceStore } from "./session-place.store.js";
import { PlacesPresentationService } from "./places-presentation.service.js";
import { PlacesTool } from "../../tools/places.tool.js";
import { TransitTool } from "../../tools/transit.tool.js";
import { TransitPresentationService } from "../transit/transit-presentation.service.js";
import { WeatherTool } from "../../tools/weather.tool.js";
import { MULTILINGUAL_LOCATION_STRINGS } from "../location/location-presenter.strings.js";
import { logger } from "../../utils/logger.js";
import { SupportedLanguage } from "../language/language-detector.service.js";
import { StructuredPlaceContextItem } from "./places-presentation.service.js";

export interface ContinuityEvaluationParams {
    conversationId: string;
    userId?: string;
    query: string;
    language?: SupportedLanguage;
}

export interface ContinuityEvaluationResult {
    handled: boolean;
    replyText?: string;
    structuredContext?: StructuredPlaceContextItem[];
}

/**
 * PlaceContinuityService (Phase 5)
 *
 * Deterministic multi-turn place & corridor continuity engine.
 *
 * Invariants & Guarantees:
 * 1. Scope Boundary: Handles ONLY recognized deterministic contextual intents.
 *    Any open-ended or unrecognized query returns { handled: false } to fall through to TravelAgent.
 * 2. Deterministic Ordinal Resolution: Resolves #1..5, closest place, and directions in TypeScript without LLM reasoning.
 * 3. 3-Tier Place-Centered Search: Tier A (placeId) -> Tier B (coordinates, radius 3500m) -> Tier C (name/address).
 * 4. Authoritative Context Replacement: New discovery searches replace previous #1..5 places in SessionPlaceStore.
 * 5. Non-sliding read TTL: Reading context does not extend context lifetime.
 */
export class PlaceContinuityService {
    placesTool;
    transitTool;
    weatherTool;
    constructor(placesTool?: PlacesTool, transitTool?: TransitTool, weatherTool?: WeatherTool) {
        this.placesTool = placesTool ?? new PlacesTool();
        this.transitTool = transitTool ?? new TransitTool();
        this.weatherTool = weatherTool ?? new WeatherTool();
    }
    /**
     * Evaluates an incoming user query against active conversational place/corridor context.
     */
    async handleContinuityQuery(params: ContinuityEvaluationParams) {
        const { conversationId, query } = params;
        const lang = params.language || "en";
        // 1. Retrieve short-lived active place context (non-sliding read)
        const context = SessionPlaceStore.getPlaceContext(conversationId);
        if (!context) {
            return { handled: false };
        }
        const q = query.trim().toLowerCase();
        // 1b. Destination / Trip Switch Check: If query explicitly asks about a different destination, fall through to main pipeline & clear old place context
        if (context.destination && this.isDestinationSwitchQuery(q, context.destination)) {
            logger.info({ conversationId, prevDest: context.destination }, "PlaceContinuityService: Destination switch detected, falling through");
            SessionPlaceStore.clearPlaceContext(conversationId);
            return { handled: false };
        }
        // 2. Check for Pronominal Reference ("that place", "the hotel", "it") with single active/target place
        const pronominalTarget = this.resolvePronominalTarget(q, context);
        if (pronominalTarget) {
            return this.handleTargetPlaceDetail(conversationId, context, pronominalTarget, lang);
        }
        // 3. Check for Ambiguous Pronoun when multiple places exist and no single active selection
        if (this.isAmbiguousPlaceQuery(q) && context.structuredPlaces.length > 1) {
            return this.handleAmbiguousPlaceDisambiguation(context, lang);
        }
        // 4. Check for Ordinal Deep-Dive (e.g. "Tell me more about the 2nd one", "2nd wale ki details")
        const ordinalDetailIndex = this.extractOrdinalDetailIndex(q);
        if (ordinalDetailIndex !== null && context.structuredPlaces.length > 0) {
            return this.handleOrdinalDetail(conversationId, context, ordinalDetailIndex, lang);
        }
        // 5. Check for Ordinal Directions (e.g. "Show directions to #1", "Pehle wale ka rasta")
        const ordinalDirIndex = this.extractOrdinalDirectionsIndex(q);
        if (ordinalDirIndex !== null && context.structuredPlaces.length > 0) {
            return this.handleOrdinalDirections(context, ordinalDirIndex, lang);
        }
        // 6. Check for Opening Hours Check (e.g. "Is the 3rd one open now?", "Tisra thikan sadhya ugad ahe ka?")
        const ordinalOpenIndex = this.extractOrdinalOpenStatusIndex(q);
        if (ordinalOpenIndex !== null && context.structuredPlaces.length > 0) {
            return this.handleOpeningStatus(context, ordinalOpenIndex, lang);
        }
        // 7. Check for Relative Spatial / Closest Place Comparison
        if (this.isClosestPlaceQuery(q) && context.structuredPlaces.length > 0) {
            return this.handleClosestPlace(context, lang);
        }
        // 8. Check for Relative Budget Query (e.g. "cheaper than the 2nd one", "budget alternative")
        const budgetQuery = this.extractRelativeBudgetIntent(q);
        if (budgetQuery.isRelativeBudget && context.structuredPlaces.length > 0) {
            return this.handleRelativeBudgetQuery(context, budgetQuery.ordinalIndex, lang);
        }
        // 9. Check for Place-Centered Search (e.g. "Where can I eat near the 2nd hotel?", "Cafes near that place")
        const placeCentered = this.extractPlaceCenteredIntent(q);
        if (placeCentered.isPlaceCentered && context.structuredPlaces.length > 0) {
            return this.handlePlaceCenteredSearch(conversationId, context, placeCentered.ordinalIndex, placeCentered.category, q, lang);
        }
        // 8. Check for Corridor Transit Follow-Up (e.g. "What about train?", "Flight options?")
        if (context.origin && context.destination && this.isTransitFollowUp(q)) {
            return this.handleCorridorTransit(conversationId, context, q, lang);
        }
        // 9. Check for Corridor Weather Follow-Up (e.g. "What is the weather there?")
        if (context.destination && this.isWeatherFollowUp(q)) {
            return this.handleCorridorWeather(context, lang);
        }
        // 10. Check for Corridor Destination Place Follow-Up (e.g. "Suggest hotels there", "Top restaurants there")
        if (context.destination && this.isDestinationPlaceFollowUp(q)) {
            return this.handleDestinationPlaceFollowUp(conversationId, context, q, lang);
        }
        // 11. Unrecognized / general query -> Fallback to TravelAgent
        return { handled: false };
    }
    /**
     * Handles ordinal place deep-dive details.
     */
    handleOrdinalDetail(conversationId: any, context: any, ordinalIndex: any, language: any) {
        const target = context.structuredPlaces[ordinalIndex - 1];
        if (!target) {
            return {
                handled: true,
                replyText: language === "mr"
                    ? `क्षमस्व, या क्रमांकाचे ठिकाण सापडले नाही. कृपया 1 ते ${context.structuredPlaces.length} मधील क्रमांक निवडा.`
                    : language === "hi"
                        ? `क्षमा करें, इस नंबर का स्थान नहीं मिला। कृपया 1 से ${context.structuredPlaces.length} के बीच का नंबर चुनें।`
                        : `Sorry, place #${ordinalIndex} was not found. Please choose between 1 and ${context.structuredPlaces.length}.`
            };
        }
        // Update active selected place
        SessionPlaceStore.updateSelectedPlace(conversationId, target);
        const lines = [`📍 *${target.name}*`];
        if (target.rating) {
            const revText = target.userRatingCount ? ` (${target.userRatingCount.toLocaleString()} reviews)` : "";
            lines.push(`⭐ *Rating:* ${target.rating.toFixed(1)}${revText}`);
        }
        if (target.address) {
            lines.push(`🏢 *Address:* ${target.address}`);
        }
        if (target.priceLevel) {
            lines.push(`💰 *Price Tier:* ${target.priceLevel}`);
        }
        if (target.openNow !== undefined) {
            lines.push(target.openNow ? "🕒 *Status:* Open now" : "🕒 *Status:* Closed now");
        }
        if (target.distanceKm) {
            lines.push(`📏 *Distance:* ~${target.distanceKm} km away`);
        }
        lines.push(`🗺️ *Google Maps:* ${target.mapsUrl}`);
        return {
            handled: true,
            replyText: lines.join("\n"),
            structuredContext: context.structuredPlaces
        };
    }
    /**
     * Handles ordinal directions deep-link resolution.
     */
    handleOrdinalDirections(context: any, ordinalIndex: any, language: any) {
        const target = context.structuredPlaces[ordinalIndex - 1];
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[language] || MULTILINGUAL_LOCATION_STRINGS.en;
        if (!target) {
            return {
                handled: true,
                replyText: language === "mr"
                    ? `क्षमस्व, या क्रमांकाचे ठिकाण सापडले नाही. कृपया 1 ते ${context.structuredPlaces.length} मधील क्रमांक निवडा.`
                    : language === "hi"
                        ? `क्षमा करें, इस नंबर का स्थान नहीं मिला। कृपया 1 से ${context.structuredPlaces.length} के बीच का नंबर चुनें।`
                        : `Sorry, place #${ordinalIndex} was not found. Please choose between 1 and ${context.structuredPlaces.length}.`
            };
        }
        const travelMode = target.distanceMeters && target.distanceMeters <= 1200 ? "walking" : "driving";
        let directionsUrl = target.mapsUrl;
        if (typeof target.latitude === "number" && typeof target.longitude === "number") {
            directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}&travelmode=${travelMode}`;
        }
        const distPart = target.distanceMeters
            ? `\n📏 *Distance:* ~${target.distanceMeters >= 1000 ? (target.distanceMeters / 1000).toFixed(1) + " km" : target.distanceMeters + "m"}`
            : "";
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
            structuredContext: context.structuredPlaces
        };
    }
    /**
     * Handles place opening hours check.
     */
    handleOpeningStatus(context: any, ordinalIndex: any, language: any) {
        const target = context.structuredPlaces[ordinalIndex - 1];
        if (!target) {
            return { handled: false };
        }
        let statusText;
        if (target.openNow === true) {
            statusText =
                language === "mr"
                    ? `✅ *${target.name}* सध्या उघडे आहे (Open now).`
                    : language === "hi"
                        ? `✅ *${target.name}* अभी खुला है (Open now)।`
                        : `✅ *${target.name}* is currently open now.`;
        }
        else if (target.openNow === false) {
            statusText =
                language === "mr"
                    ? `❌ *${target.name}* सध्या बंद आहे (Closed now).`
                    : language === "hi"
                        ? `❌ *${target.name}* अभी बंद है (Closed now)।`
                        : `❌ *${target.name}* is currently closed now.`;
        }
        else {
            statusText =
                language === "mr"
                    ? `ℹ️ *${target.name}* च्या उघडण्याच्या वेळा Google Places वर उपलब्ध नाहीत. कृपया Google Maps लिंक तपासा:\n🔗 ${target.mapsUrl}`
                    : language === "hi"
                        ? `ℹ️ *${target.name}* के खुलने का समय Google Places पर उपलब्ध नहीं है। कृपया Google Maps लिंक देखें:\n🔗 ${target.mapsUrl}`
                        : `ℹ️ Live opening hours for *${target.name}* are not listed on Google Places. Check Google Maps:\n🔗 ${target.mapsUrl}`;
        }
        return {
            handled: true,
            replyText: statusText,
            structuredContext: context.structuredPlaces
        };
    }
    /**
     * Handles closest place query.
     */
    handleClosestPlace(context: any, language: any) {
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[language] || MULTILINGUAL_LOCATION_STRINGS.en;
        const withDist = context.structuredPlaces.filter((p) => typeof p.distanceMeters === "number");
        if (withDist.length === 0) {
            return { handled: false };
        }
        withDist.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
        const closest = withDist[0];
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
            structuredContext: context.structuredPlaces
        };
    }
    /**
     * Handles 3-tier place-centered search (e.g. "cafes near the second hotel").
     */
    async handlePlaceCenteredSearch(conversationId: any, context: any, ordinalIndex: any, category: any, query: any, language: any) {
        const target = ordinalIndex
            ? context.structuredPlaces[ordinalIndex - 1]
            : context.activeSelectedPlace || context.structuredPlaces[0];
        if (!target) {
            return { handled: false };
        }
        logger.info({ placeName: target.name, placeId: target.placeId, category }, "PlaceContinuityService: Executing 3-tier place-centered search");
        const categoryQueries = {
            food: "restaurants OR food",
            restaurant: "restaurants OR dining",
            cafe: "cafes OR coffee",
            hotel: "hotels OR stays",
            attraction: "tourist attractions OR sightseeing",
            shopping: "shopping OR markets",
            street_food: "street food OR local food"
        };
        const searchQuery = categoryQueries[category] || `${category} near ${target.name}`;
        // 3-Tier Execution: Tier A (placeId) -> Tier B (coordinates) -> Tier C (text)
        let toolResult;
        if (typeof target.latitude === "number" && typeof target.longitude === "number") {
            // Tier B: Spatial search around coordinates with 3.5km radius
            toolResult = await this.placesTool.execute({
                query: searchQuery,
                latitude: target.latitude,
                longitude: target.longitude,
                radius: 3500,
                maxResults: 5
            });
        }
        else {
            // Tier C: Name + address fallback
            toolResult = await this.placesTool.execute({
                query: `${searchQuery} in ${target.name} ${target.address || ""}`.trim(),
                maxResults: 5
            });
        }
        if (toolResult.success && toolResult.data && Array.isArray(toolResult.data.places) && toolResult.data.places.length > 0) {
            const places = toolResult.data.places;
            const formatted = PlacesPresentationService.formatPlacesList({
                places,
                query: searchQuery,
                destination: target.name,
                language
            });
            const newStructuredContext = PlacesPresentationService.buildStructuredContext(places);
            // Overwrite context in SessionPlaceStore (Authoritative Replacement)
            SessionPlaceStore.setPlaceContext({
                conversationId,
                destination: context.destination,
                origin: context.origin,
                structuredPlaces: newStructuredContext,
                activeSelectedPlace: target
            });
            return {
                handled: true,
                replyText: formatted,
                structuredContext: newStructuredContext
            };
        }
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[language] || MULTILINGUAL_LOCATION_STRINGS.en;
        return {
            handled: true,
            replyText: locStrings.noPlacesFoundCategory(category),
            structuredContext: context.structuredPlaces
        };
    }
    /**
     * Handles corridor transit follow-up (e.g. "What about train?").
     */
    async handleCorridorTransit(conversationId: any, context: any, query: any, language: any) {
        const origin = context.origin;
        const destination = context.destination;
        const preferredMode = this.resolveTransitModeFromQuery(query);
        logger.info({ origin, destination, preferredMode }, "PlaceContinuityService: Executing corridor transit follow-up");
        const result = await this.transitTool.execute({
            origin,
            destination,
            preferredMode
        });
        if (result.success && result.data?.plan) {
            const formatted = TransitPresentationService.formatRoutePlan(result.data.plan, language);
            return {
                handled: true,
                replyText: formatted
            };
        }
        return { handled: false };
    }
    /**
     * Handles corridor weather follow-up (e.g. "What is the weather there?").
     */
    async handleCorridorWeather(context: any, language: any) {
        const destination = context.destination;
        // If coordinates are in first place, reuse; otherwise pass destination
        const firstPlace = context.structuredPlaces[0];
        const lat = firstPlace?.latitude;
        const lon = firstPlace?.longitude;
        const weatherResult = await this.weatherTool.execute({
            latitude: lat || 18.5204,
            longitude: lon || 73.8567
        });
        if (weatherResult.success && weatherResult.data?.forecast && weatherResult.data.forecast.length > 0) {
            const today = weatherResult.data.forecast[0];
            const lines = [
                `🌤️ *Weather Forecast for ${destination}:*`,
                `🌡️ Temperature: ${today.temperatureMin}°C - ${today.temperatureMax}°C`,
                `☁️ Condition: ${today.weatherDescription}`,
                `🌧️ Rain Probability: ${today.precipitationProbability}%`
            ];
            if (language === "hi") {
                lines[0] = `🌤️ *${destination} का मौसम पूर्वानुमान:*`;
                lines[1] = `🌡️ तापमान: ${today.temperatureMin}°C - ${today.temperatureMax}°C`;
                lines[2] = `☁️ स्थिति: ${today.weatherDescription}`;
                lines[3] = `🌧️ बारिश की संभावना: ${today.precipitationProbability}%`;
            }
            else if (language === "mr") {
                lines[0] = `🌤️ *${destination} येथील हवामान अंदाज:*`;
                lines[1] = `🌡️ तापमान: ${today.temperatureMin}°C - ${today.temperatureMax}°C`;
                lines[2] = `☁️ स्थिती: ${today.weatherDescription}`;
                lines[3] = `🌧️ पावसाची शक्यता: ${today.precipitationProbability}%`;
            }
            return {
                handled: true,
                replyText: lines.join("\n"),
                structuredContext: context.structuredPlaces
            };
        }
        return { handled: false };
    }
    /**
     * Handles corridor destination place follow-ups (e.g. "Suggest hotels there").
     */
    async handleDestinationPlaceFollowUp(conversationId: any, context: any, query: any, language: any) {
        const destination = context.destination;
        const category = this.resolveCategoryFromQuery(query);
        const searchQuery = `${category} in ${destination}`;
        const result = await this.placesTool.execute({
            query: searchQuery,
            maxResults: 5
        });
        if (result.success && result.data && Array.isArray(result.data.places) && result.data.places.length > 0) {
            const places = result.data.places;
            const formatted = PlacesPresentationService.formatPlacesList({
                places,
                query: searchQuery,
                destination,
                language
            });
            const newStructuredContext = PlacesPresentationService.buildStructuredContext(places);
            // Overwrite context with fresh search (Authoritative Replacement)
            SessionPlaceStore.setPlaceContext({
                conversationId,
                destination,
                origin: context.origin,
                structuredPlaces: newStructuredContext
            });
            return {
                handled: true,
                replyText: formatted,
                structuredContext: newStructuredContext
            };
        }
        return { handled: false };
    }
    /**
     * Disambiguation prompt for ambiguous pronoun queries when multiple places are in context.
     */
    handleAmbiguousPlaceDisambiguation(context: any, language: any) {
        const count = context.structuredPlaces.length;
        const names = context.structuredPlaces.map((p, i) => `${i + 1}. *${p.name}*`).join("\n");
        const text = language === "mr"
            ? `तुम्हाला कोणत्या ठिकाणाबद्दल अधिक माहिती हवी आहे? कृपया क्रमांक सांगा (1 ते ${count}):\n\n${names}`
            : language === "hi"
                ? `आप किस स्थान के बारे में अधिक जानना चाहते हैं? कृपया नंबर बताएं (1 से ${count}):\n\n${names}`
                : `Which place would you like to know more about? Please reply with the number (1 to ${count}):\n\n${names}`;
        return {
            handled: true,
            replyText: text,
            structuredContext: context.structuredPlaces
        };
    }
    // --- Helper Intent Matchers ---
    isAmbiguousPlaceQuery(q: any) {
        return (/^(tell me more about it|tell me more|details please|more details|iski details|iski mahiti|yachi mahiti|baddal sanga)$/i.test(q) || /^[\u0900-\u097F]+.*\b(याबद्दल सांगा|याची माहिती|इसके बारे में बताएं|इसकी जानकारी)\b/u.test(q));
    }
    extractOrdinalDetailIndex(q: any) {
        // If query is a conversational place intelligence inquiry (history, why famous, interesting facts, family suitability, sights),
        // let TravelAgent handle with RAG grounding.
        const isKnowledgeInquiry = /\b(why|famous|prasiddha|history|itihas|interesting|facts|family|families|kids|children|elderly|food|special|better|see there|do there)\b/i.test(q) ||
            /[\u0900-\u097F]+.*\b(का प्रसिद्ध|क्यों प्रसिद्ध|इतिहास|रोचक|खास|फॅमिली|परिवार|काय पाहावे|क्या देखें)\b/u.test(q);
        if (isKnowledgeInquiry) {
            return null;
        }
        const isDetailIntent = /\b(tell me more|details|info|about|mahiti|baddal sanga|batao|jankari|kaisa hai|kaise hai)\b/i.test(q) ||
            /[\u0900-\u097F]+.*\b(माहिती|सांगा|बताओ|जानकारी|कैसा है)\b/u.test(q);
        if (!isDetailIntent) {
            // Also check simple ordinal patterns like "second one", "2nd place", "dusra wala"
            if (/^(the )?(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|#1|#2|#3|#4|#5|pehla|pahila|dusra|tisra|chautha|pachva)( one| place| hotel)?$/i.test(q)) {
                return this.extractOrdinalNumber(q);
            }
            return null;
        }
        return this.extractOrdinalNumber(q);
    }
    extractOrdinalDirectionsIndex(q: any) {
        const isDirectionIntent = /\b(directions?|route|rasta|मार्ग|दिशा|kasa jaycha|kaise jaana|how to reach|show directions)\b/i.test(q) ||
            /[\u0900-\u097F]+.*\b(मार्ग|दिशा|रस्ता|कसे जावे|रास्ता)\b/u.test(q);
        if (!isDirectionIntent)
            return null;
        return this.extractOrdinalNumber(q);
    }
    extractOrdinalOpenStatusIndex(q: any) {
        const isOpenIntent = /\b(open now|is it open|closed now|khula hai kya|ugad ahe ka|timings|opening hours)\b/i.test(q) ||
            /[\u0900-\u097F]+.*\b(खुला है|उघडे आहे|सध्या उघडे|वेळ)\b/u.test(q);
        if (!isOpenIntent)
            return null;
        return this.extractOrdinalNumber(q);
    }
    isClosestPlaceQuery(q: any) {
        return (/\b(which (one )?is (the )?(closest|nearest)|closest (one|place)|nearest (one|place)|which place is closest)\b/i.test(q) ||
            /\b(sabse paas (kaunsa|konsa|hai)|sabse nazdik|saglyat javal (konta|ahe)|sarvat javal)\b/i.test(q) ||
            /[\u0900-\u097F]+.*\b(सबसे पास|सबसे नजदीक|सगळ्यात जवळ|सर्वात जवळ)\b/u.test(q));
    }
    extractPlaceCenteredIntent(q: any) {
        const isNearTerm = /\b(near (the |that )?(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|hotel|place|restaurant|cafe|attraction)|paas me|javal|ke paas)\b/i.test(q) ||
            /\b(dusre (wale|thikani)|pehli jagah|pahilya thikani|tya hotel|us hotel|us jagah)\b/i.test(q) ||
            /[\u0900-\u097F]+.*\b(त्या|त्याच्या|तिथे|पहिल्या|दुसऱ्या|तिसऱ्या|उस|पहले|दूसरे|तीसरे)\b/u.test(q);
        if (!isNearTerm) {
            return { isPlaceCentered: false, ordinalIndex: null, category: "attraction" };
        }
        const ordinalIndex = this.extractOrdinalNumber(q);
        const category = this.resolveCategoryFromQuery(q);
        return {
            isPlaceCentered: true,
            ordinalIndex,
            category
        };
    }
    isTransitFollowUp(q: any) {
        return (/\b(what about (train|bus|flight|driving|car)|and train\??|and bus\??|and flight\??|train se\??|bus se\??|flight se\??|train ne\??|bus ne\??|flight options|train options|bus options)\b/i.test(q) || /[\u0900-\u097F]+.*\b(आणि ट्रेन|आणि बस|ट्रेन ने|बस ने|ट्रेन से|बस से|विमान से)\b/u.test(q));
    }
    isWeatherFollowUp(q: any) {
        return (/\b(what is the weather there|weather there|is it raining there|temperature there|wahan ka mausam|tithla havaman|tethe havaman)\b/i.test(q) || /[\u0900-\u097F]+.*\b(तिथले हवामान|तेथील हवामान|वहाँ का मौसम|वहाँ मौसम)\b/u.test(q));
    }
    isDestinationPlaceFollowUp(q: any) {
        return (/\b(hotels? there|restaurants? there|cafes? there|attractions? there|places? there|things to do there|wahan ke hotels|wahan ghumne|tithe firayla|tithle hotels)\b/i.test(q) || /[\u0900-\u097F]+.*\b(तिथले हॉटेल्स|तेथील ठिकाणे|वहाँ के होटल|वहाँ घूमने)\b/u.test(q));
    }
    resolveTransitModeFromQuery(q: any) {
        if (q.includes("train") || q.includes("ट्रेन") || q.includes("गाडी"))
            return "train";
        if (q.includes("bus") || q.includes("बस"))
            return "bus";
        if (q.includes("flight") || q.includes("plane") || q.includes("विमान") || q.includes("हवाई"))
            return "flight";
        if (q.includes("drive") || q.includes("car") || q.includes("road") || q.includes("रस्ता") || q.includes("गाडीने"))
            return "road";
        return "all";
    }
    resolveCategoryFromQuery(q: any) {
        if (q.includes("cafe") || q.includes("coffee") || q.includes("tea") || q.includes("chai") || q.includes("bakery"))
            return "cafe";
        if (q.includes("food") || q.includes("restaurant") || q.includes("eat") || q.includes("dining") || q.includes("lunch") || q.includes("dinner") || q.includes("misal") || q.includes("dhaba"))
            return "restaurant";
        if (q.includes("hotel") || q.includes("stay") || q.includes("resort") || q.includes("homestay") || q.includes("lodge"))
            return "hotel";
        if (q.includes("shopping") || q.includes("market") || q.includes("bazaar"))
            return "shopping";
        if (q.includes("street food") || q.includes("thela") || q.includes("chaat"))
            return "street_food";
        return "attraction";
    }
    isDestinationSwitchQuery(q: any, currentDestination: any) {
        const isNewDestQuery = /\b(in|to|about|for|near|visit|trip to|going to)\s+([a-zA-Z\s]+)\b/i.exec(q);
        if (!isNewDestQuery)
            return false;
        const targetName = isNewDestQuery[2].trim().toLowerCase();
        const currName = currentDestination.trim().toLowerCase();
        // Exclude general words, pronouns, categories, and transit modes
        const nonDestWords = [
            "the", "that", "this", "first", "second", "third", "fourth", "fifth",
            "hotel", "hotels", "place", "places", "restaurant", "restaurants", "cafe", "cafes",
            "it", "one", "there", "details", "info", "more", "stay", "stays",
            "train", "bus", "flight", "plane", "car", "drive", "road", "transit", "weather"
        ];
        const targetWords = targetName.split(/\s+/);
        if (targetWords.some(w => nonDestWords.includes(w)))
            return false;
        return targetName.length > 2 && targetName !== currName && !currName.includes(targetName);
    }
    resolvePronominalTarget(q: any, context: any) {
        const isPronominal = /\b(that place|the place|that hotel|the hotel|that restaurant|the restaurant|it|that one)\b/i.test(q);
        if (!isPronominal)
            return null;
        if (context.activeSelectedPlace)
            return context.activeSelectedPlace;
        if (context.entityStack && context.entityStack.length === 1)
            return context.entityStack[0];
        if (context.structuredPlaces && context.structuredPlaces.length === 1)
            return context.structuredPlaces[0];
        return null;
    }
    handleTargetPlaceDetail(conversationId: any, context: any, target: any, language: any) {
        SessionPlaceStore.updateSelectedPlace(conversationId, target);
        const lines = [`📍 *${target.name}*`];
        if (target.rating) {
            const revText = target.userRatingCount ? ` (${target.userRatingCount.toLocaleString()} reviews)` : "";
            lines.push(`⭐ *Rating:* ${target.rating.toFixed(1)}${revText}`);
        }
        if (target.address) {
            lines.push(`🏢 *Address:* ${target.address}`);
        }
        if (target.priceLevel) {
            lines.push(`💰 *Price Tier:* ${target.priceLevel}`);
        }
        if (target.openNow !== undefined) {
            lines.push(target.openNow ? "🕒 *Status:* Open now" : "🕒 *Status:* Closed now");
        }
        if (target.distanceKm) {
            lines.push(`📏 *Distance:* ~${target.distanceKm} km away`);
        }
        lines.push(`🗺️ *Google Maps:* ${target.mapsUrl}`);
        return {
            handled: true,
            replyText: lines.join("\n"),
            structuredContext: context.structuredPlaces
        };
    }
    extractRelativeBudgetIntent(q: any) {
        const isBudget = /\b(cheaper|less expensive|more affordable|budget option|cheaper alternative|sasta|kam kharcha)\b/i.test(q);
        if (!isBudget)
            return { isRelativeBudget: false, ordinalIndex: null };
        const ordinalIndex = this.extractOrdinalNumber(q);
        return { isRelativeBudget: true, ordinalIndex };
    }
    handleRelativeBudgetQuery(context: any, ordinalIndex: any, language: any) {
        const target = ordinalIndex ? context.structuredPlaces[ordinalIndex - 1] : context.activeSelectedPlace || context.structuredPlaces[0];
        if (!target)
            return { handled: false };
        // Filter structuredPlaces for lower price tier or budget rating
        const cheaper = context.structuredPlaces.filter((p) => {
            if (p.name === target.name)
                return false;
            if (p.priceLevel && target.priceLevel) {
                return p.priceLevel.length < target.priceLevel.length;
            }
            return true;
        });
        const items = cheaper.length > 0 ? cheaper : context.structuredPlaces.filter((p) => p.name !== target.name);
        if (items.length === 0)
            return { handled: false };
        const formattedList = items.map((p, idx) => `${idx + 1}. *${p.name}* ${p.priceLevel ? `(${p.priceLevel})` : ""}`).join("\n");
        const replyText = language === "mr"
            ? `💰 *${target.name}* पेक्षा अधिक बजेट-फ्रेंडली पर्याय:\n\n${formattedList}`
            : language === "hi"
                ? `💰 *${target.name}* से अधिक किफायती विकल्प:\n\n${formattedList}`
                : `💰 Budget-friendly options compared to *${target.name}*:\n\n${formattedList}`;
        return {
            handled: true,
            replyText,
            structuredContext: context.structuredPlaces
        };
    }
    extractOrdinalNumber(q: any) {
        if (/\b(1st|first|pehla|pehli|pahila|pahilya|पहिला|पहिलं|पहिल्या|पहले|पहली|#1)\b/i.test(q))
            return 1;
        if (/\b(2nd|second|dusra|dusre|dusri|dusrya|दुसरा|दुसरं|दुसऱ्या|दूसरा|दूसरे|दूसरी|#2)\b/i.test(q))
            return 2;
        if (/\b(3rd|third|tisra|tisre|tisri|tisrya|तिसरा|तिसरं|तिसऱ्या|तीसरा|तीसरे|तीसरी|#3)\b/i.test(q))
            return 3;
        if (/\b(4th|fourth|chautha|chauthe|chauthi|chauthya|चौथा|चौथं|चौथ्या|चौथे|चौथी|#4)\b/i.test(q))
            return 4;
        if (/\b(5th|fifth|panchva|pachva|pachvya|पाँचवाँ|पाचवा|पाचवं|पाचव्या|पाँचवें|#5)\b/i.test(q))
            return 5;
        if (/\b(1)\b/.test(q))
            return 1;
        if (/\b(2)\b/.test(q))
            return 2;
        if (/\b(3)\b/.test(q))
            return 3;
        if (/\b(4)\b/.test(q))
            return 4;
        if (/\b(5)\b/.test(q))
            return 5;
        return null;
    }
}
