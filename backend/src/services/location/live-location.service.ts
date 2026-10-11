import { PROXIMITY_BOUNDARIES, PROXIMITY_WEIGHTS } from "./location.types.js";
import { haversineDistanceMeters, isValidCoordinate, getDestinationCoordinates } from "../../utils/geography.js";
import { SessionLocationStore, maskCoordinates } from "./session-location.store.js";
import { TripRepository } from "../../repositories/trip.repository.js";
import { NavigationService } from "../navigation/navigation.service.js";
import { MULTILINGUAL_LOCATION_STRINGS } from "./location-presenter.strings.js";
import { LocationResponsePresenter } from "./location-response.presenter.js";
import { MULTILINGUAL_NAVIGATION_STRINGS } from "../navigation/navigation-presenter.strings.js";
import { PlacesTool } from "../../tools/places.tool.js";
import { TripLifecycleService } from "../trip/trip-lifecycle.service.js";
import { logger } from "../../utils/logger.js";
import { UserLivePin, EvaluateLiveLocationParams } from "./location.types.js";
import { SupportedLanguage } from "../language/language-detector.service.js";

const CATEGORY_QUERY_MAP = {
    attractions: {
        primary: "tourist attraction OR landmark OR park OR zoo OR museum OR monument OR garden OR fort",
        fallback: "sightseeing OR places to visit OR tourist spot"
    },
    food: {
        primary: "restaurants OR food OR dining OR eatery OR dhaba",
        fallback: "popular restaurants OR food places"
    },
    cafes: {
        primary: "cafe OR coffee shop OR tea",
        fallback: "bakery OR cafe OR snacks"
    },
    hotels: {
        primary: "hotel OR resort OR guest house OR lodge OR stay",
        fallback: "hotels OR lodging"
    },
    shopping: {
        primary: "shopping mall OR market OR bazaar OR supermarket",
        fallback: "shopping center OR stores"
    },
    photos: {
        primary: "scenic viewpoint OR photo spot OR viewpoint OR look out",
        fallback: "garden OR park OR historical monument"
    }
};
/**
 * LiveLocationService
 *
 * Deterministic spatial reasoning and nearby discovery engine for live user location pins.
 *
 * Core Behaviors:
 * 1. Zero permanent GPS persistence: Coordinates stored strictly in memory via SessionLocationStore (30m TTL).
 * 2. Radial proximity discovery: Direct geographic search using PlacesTool around user pin (radius: 3500m).
 * 3. Multi-stage fallback search: If primary category query yields 0 results within 3.5km, falls back to broader queries.
 * 4. Proximity ranking: Ranks candidates strictly <= 3.5km using distance and ratings.
 * 5. 1-tap navigation: Provides direct Google Maps directions URL for every discovered place.
 * 6. Multilingual: Outputs in English, Hindi, or Marathi with zero English leakage.
 * 7. Privacy: Never logs or passes raw GPS coordinates to LLMs.
 */
export class LiveLocationService {
    placesTool;
    constructor(placesTool?: PlacesTool) {
        this.placesTool = placesTool ?? new PlacesTool();
    }
    /**
     * Checks whether a trip is currently active for the target date.
     */
    static isActiveTrip(trip: any, targetDate = new Date()) {
        return TripLifecycleService.isActiveTripToday(trip, targetDate);
    }
    /**
     * Main entry point: Evaluates live location for a conversation and returns formatted recommendation.
     */
    async evaluateLiveLocation(params: EvaluateLiveLocationParams) {
        const { conversationId, userId, category, destination } = params;
        const lang = params.language || "en";
        // 1. Retrieve ephemeral location pin from SessionLocationStore or resolve destination coordinates
        let pin = SessionLocationStore.getLocation(conversationId);
        if (!pin && destination) {
            const coords = getDestinationCoordinates(destination);
            if (coords) {
                pin = {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    name: destination,
                    timestamp: Date.now()
                };
            }
        }
        if (!pin) {
            logger.debug({ conversationId }, "LiveLocationService: No active location pin found for conversation");
            return null;
        }
        logger.info({
            conversationId,
            coords: maskCoordinates(pin.latitude, pin.longitude),
            language: lang,
            category: category || "none"
        }, "LiveLocationService: Evaluating live location recommendations");
        // If explicit category is provided, perform radial discovery directly
        if (category) {
            return this.performRadialExploration(conversationId, pin, lang, category);
        }
        // 2. Check for active trip safely
        let hasActiveTrip = false;
        let snapshot;
        try {
            if (userId && /^[0-9a-fA-F]{24}$/.test(userId)) {
                const activeTrip = await TripRepository.findActiveByUserId(userId);
                const currentTime: Date = (params.currentTime as any) instanceof Date ? (params.currentTime as unknown as Date) : new Date((params.currentTime as any) || Date.now());
                if (activeTrip && TripLifecycleService.isActiveTripToday(activeTrip, currentTime)) {
                    hasActiveTrip = true;
                    snapshot = activeTrip.itinerarySnapshot;
                }
            }
        }
        catch {
            hasActiveTrip = false;
            snapshot = undefined;
        }
        // 3. Evaluate Next Stop if active trip exists
        if (hasActiveTrip && snapshot && Array.isArray(snapshot.days) && snapshot.days.length > 0) {
            const nextStop = this.findNextEligibleScheduledPlace(snapshot, pin, params.currentTime);
            if (nextStop) {
                return this.formatNextStopResult(conversationId, lang, nextStop, pin);
            }
            // Active trip exists, but today's schedule is completed
            const locStrings = MULTILINGUAL_LOCATION_STRINGS[lang] || MULTILINGUAL_LOCATION_STRINGS.en;
            return {
                type: "completed_today",
                conversationId,
                language: lang,
                formattedMessage: locStrings.completedTodayHeader,
                sanitizedSpatialContext: "User completed today's scheduled itinerary; offering category discovery."
            };
        }
        // 4. No active trip: direct category discovery prompt
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[lang] || MULTILINGUAL_LOCATION_STRINGS.en;
        return {
            type: "no_active_trip",
            conversationId,
            language: lang,
            formattedMessage: locStrings.noActiveTripPrompt,
            sanitizedSpatialContext: "User shared location with no active trip; offering category discovery."
        };
    }
    /**
     * Discovers nearby places within 3.5km using PlacesTool with coordinates, fallback queries, and ranking.
     */
    async performRadialExploration(conversationId: string, pin: UserLivePin, language: SupportedLanguage, category = "attractions") {
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[language] || MULTILINGUAL_LOCATION_STRINGS.en;
        const navStrings = MULTILINGUAL_NAVIGATION_STRINGS[language] || MULTILINGUAL_NAVIGATION_STRINGS.en;
        const queryConfig = CATEGORY_QUERY_MAP[category] || CATEGORY_QUERY_MAP.attractions;
        // 1. Primary Radial Search around GPS pin (Radius = 3500m)
        let candidates = await this.searchPlacesNearPin(pin, queryConfig.primary, 3500);
        // 2. Fallback radial search if 0 candidates within 3.5km
        if (candidates.length === 0 && queryConfig.fallback) {
            logger.info({ category, pinCoords: maskCoordinates(pin.latitude, pin.longitude) }, "LiveLocationService: Primary query yielded 0 results within 3.5km, trying fallback query");
            candidates = await this.searchPlacesNearPin(pin, queryConfig.fallback, 3500);
        }
        // 3. Second fallback: general tourist attractions if primary category was attractions
        if (candidates.length === 0 && (category === "attractions" || category === "photos")) {
            logger.info({ category, pinCoords: maskCoordinates(pin.latitude, pin.longitude) }, "LiveLocationService: Secondary fallback search for places to visit");
            candidates = await this.searchPlacesNearPin(pin, "places to visit OR tourist spots", 3500);
        }
        // 4. Deduplicate candidates by name and location (< 100m)
        const uniqueCandidates = this.deduplicatePlaces(candidates);
        // 5. Score & Rank candidates
        const scoredPlaces = [];
        for (const place of uniqueCandidates) {
            if (!place.location || !isValidCoordinate(place.location.latitude, place.location.longitude)) {
                continue;
            }
            const dist = haversineDistanceMeters(pin.latitude, pin.longitude, place.location.latitude, place.location.longitude);
            // Strict 3.5 km boundary cutoff
            if (dist <= PROXIMITY_BOUNDARIES.FREE_EXPLORATION_RMAX_METERS) {
                const distanceScore = Math.max(0, 1 - dist / PROXIMITY_BOUNDARIES.FREE_EXPLORATION_RMAX_METERS);
                const ratingScore = place.rating && place.rating >= 1 && place.rating <= 5 ? place.rating / 5.0 : 0.70;
                const finalScore = PROXIMITY_WEIGHTS.PREFERENCE * ratingScore + PROXIMITY_WEIGHTS.DISTANCE * distanceScore;
                const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.location.latitude},${place.location.longitude}`;
                scoredPlaces.push({
                    place,
                    distanceMeters: dist,
                    distanceScore,
                    ratingScore,
                    finalScore,
                    navigationUrl: navUrl
                });
            }
        }
        // Sort descending by finalScore, breaking ties by shorter distance
        scoredPlaces.sort((a, b) => {
            if (Math.abs(b.finalScore - a.finalScore) > 0.001) {
                return b.finalScore - a.finalScore;
            }
            return a.distanceMeters - b.distanceMeters;
        });
        const topPlaces = scoredPlaces.slice(0, 5);
        // 6. Build normalized NearbyPlace models
        const discoveredNearbyPlaces = topPlaces.map((item) => ({
            id: item.place.id,
            name: item.place.name,
            category,
            latitude: item.place.location.latitude,
            longitude: item.place.location.longitude,
            distanceKm: parseFloat((item.distanceMeters / 1000).toFixed(1)),
            distanceMeters: item.distanceMeters,
            address: item.place.address,
            rating: item.place.rating,
            userRatingCount: item.place.userRatingCount,
            types: item.place.types
        }));
        // Build compatibility ProximityRecommendationPlace list
        const legacyNearbyPlaces = topPlaces.map((item) => {
            const nav = NavigationService.buildPlaceNavigation({
                placeId: item.place.id,
                name: item.place.name,
                latitude: item.place.location.latitude,
                longitude: item.place.location.longitude,
                address: item.place.address
            }, {
                name: "Your Location",
                latitude: pin.latitude,
                longitude: pin.longitude
            }, {
                estimatedDistanceMeters: item.distanceMeters
            });
            return {
                candidate: {
                    placeId: item.place.id,
                    name: item.place.name,
                    destinationSlug: "nearby",
                    category: category === "food" || category === "cafes"
                        ? "restaurant"
                        : category === "shopping"
                            ? "shopping"
                            : "attraction",
                    location: {
                        latitude: item.place.location.latitude,
                        longitude: item.place.location.longitude,
                        address: item.place.address
                    },
                    rating: item.place.rating,
                    userRatingCount: item.place.userRatingCount,
                    source: "google-places",
                    provenance: {
                        sources: ["google-places"],
                        googleDetails: {
                            placeId: item.place.id,
                            types: item.place.types,
                            userRatingCount: item.place.userRatingCount
                        }
                    }
                },
                distanceMeters: item.distanceMeters,
                distanceEstimationSource: "geographic_estimate",
                distanceScore: item.distanceScore,
                basePreferenceScore: item.ratingScore,
                finalScore: item.finalScore,
                navigation: nav
            };
        });
        // 7. Format localized message via LocationResponsePresenter
        const formattedMessage = LocationResponsePresenter.formatRadialDiscovery({
            places: discoveredNearbyPlaces as any,
            category: category as any,
            language
        });
        const sanitizedSpatialContext = topPlaces.length > 0
            ? `User shared location; top recommended nearby ${category}: ${topPlaces.map((p) => p.place.name).join(", ")}.`
            : `User shared location; no immediate ${category} found within 3.5km.`;
        return {
            type: topPlaces.length > 0 ? "free_exploration" : "out_of_bounds",
            conversationId,
            language,
            category,
            nearbyPlaces: legacyNearbyPlaces,
            discoveredNearbyPlaces,
            formattedMessage,
            sanitizedSpatialContext
        };
    }
    /**
     * Helper: Calls PlacesTool with coordinates and radius bias.
     */
    async searchPlacesNearPin(pin: any, query: any, radiusMeters = 3500) {
        try {
            const result = await this.placesTool.execute({
                query,
                latitude: pin.latitude,
                longitude: pin.longitude,
                radius: radiusMeters,
                maxResults: 15
            });
            if (result.success && result.data && Array.isArray(result.data.places)) {
                return result.data.places;
            }
            return [];
        }
        catch (err) {
            logger.warn({ err, query }, "LiveLocationService: PlacesTool search failed near pin");
            return [];
        }
    }
    /**
     * Helper: Deduplicates places by name and proximity (< 100m).
     */
    deduplicatePlaces(places: any) {
        const unique = [];
        const seenNames = new Set();
        for (const place of places) {
            const normName = place.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (seenNames.has(normName))
                continue;
            let isDuplicateCoord = false;
            if (place.location && isValidCoordinate(place.location.latitude, place.location.longitude)) {
                for (const existing of unique) {
                    if (existing.location && isValidCoordinate(existing.location.latitude, existing.location.longitude)) {
                        const dist = haversineDistanceMeters(place.location.latitude, place.location.longitude, existing.location.latitude, existing.location.longitude);
                        if (dist < 100) {
                            isDuplicateCoord = true;
                            break;
                        }
                    }
                }
            }
            if (!isDuplicateCoord) {
                seenNames.add(normName);
                unique.push(place);
            }
        }
        return unique;
    }
    /**
     * Finds the next eligible scheduled place in today's active itinerary.
     * Preserves M8 deterministic sequence order (does not jump to a closer place scheduled later or earlier).
     */
    findNextEligibleScheduledPlace(snapshot: any, pin: any, currentTimeOverride: any) {
        // Determine current time in HH:MM
        let nowHHMM = currentTimeOverride;
        if (!nowHHMM) {
            const d = new Date();
            nowHHMM = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        }
        // Examine Day 1 (or today's matching day)
        const activeDay = snapshot.days[0];
        if (!activeDay || !Array.isArray(activeDay.places) || activeDay.places.length === 0) {
            return null;
        }
        // Iterate sequentially through scheduled places (preserving M8 order)
        let nextPlace = null;
        for (const place of activeDay.places) {
            // Place is eligible if its scheduled endTime is >= nowHHMM
            if (place.endTime >= nowHHMM) {
                nextPlace = place;
                break;
            }
        }
        // If all scheduled places have elapsed or no place found, fallback
        if (!nextPlace) {
            return null;
        }
        const placeLat = nextPlace.location?.latitude;
        const placeLng = nextPlace.location?.longitude;
        if (!isValidCoordinate(placeLat, placeLng)) {
            return null;
        }
        const distanceMeters = haversineDistanceMeters(pin.latitude, pin.longitude, placeLat, placeLng);
        // Generate M9.4 directions & transit guidance
        const navResult = NavigationService.buildPlaceNavigation({
            placeId: nextPlace.placeId,
            name: nextPlace.name,
            latitude: placeLat,
            longitude: placeLng,
            address: nextPlace.location?.address
        }, {
            name: "Your Location",
            latitude: pin.latitude,
            longitude: pin.longitude
        }, {
            estimatedDistanceMeters: distanceMeters,
            weatherSuitability: nextPlace.weatherSuitability
        });
        return {
            place: nextPlace,
            dayNumber: activeDay.dayNumber,
            distanceMeters,
            distanceEstimationSource: "geographic_estimate",
            navigation: navResult
        };
    }
    /**
     * Formats the response when a next eligible scheduled stop exists.
     */
    formatNextStopResult(conversationId: any, language: any, nextStop: any, _pin: any) {
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[language] || MULTILINGUAL_LOCATION_STRINGS.en;
        const distLabel = nextStop.distanceMeters >= 1000
            ? locStrings.distanceKm((nextStop.distanceMeters / 1000).toFixed(1))
            : locStrings.distanceMeter(nextStop.distanceMeters);
        let transitLine;
        if (nextStop.distanceMeters <= 1200) {
            transitLine = locStrings.recommendedWalk;
        }
        else if (nextStop.distanceMeters <= 3500) {
            transitLine = locStrings.recommendedTransit;
        }
        else {
            transitLine = locStrings.recommendedTaxi;
        }
        const formattedMessage = LocationResponsePresenter.formatNextStop(nextStop, language);
        const sanitizedSpatialContext = `User is approximately ${distLabel} from next scheduled itinerary place: ${nextStop.place.name}. Recommended transit: ${transitLine}.`;
        return {
            type: "next_itinerary_stop",
            conversationId,
            language,
            nextStop,
            formattedMessage,
            sanitizedSpatialContext
        };
    }
}
