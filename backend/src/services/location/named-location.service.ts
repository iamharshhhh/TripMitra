import { PlacesTool, NormalizedPlace } from "../../tools/places.tool.js";
import { getDestinationCoordinates, haversineDistanceMeters, isValidCoordinate } from "../../utils/geography.js";
import { SupportedLanguage } from "../language/language-detector.service.js";
import { logger } from "../../utils/logger.js";

export interface HandleNamedLocationParams {
    locationPhrase: string;
    category?: "attractions" | "food" | "hotels" | "cafes" | "shopping";
    language?: SupportedLanguage;
    activeTripDestination?: string;
}

export interface NamedLocationResult {
    success: boolean;
    locationPhrase: string;
    resolvedCenter?: { latitude: number; longitude: number; name: string };
    places: Array<{
        name: string;
        address: string;
        rating?: number;
        userRatingCount?: number;
        distanceKm?: number;
        mapsUrl: string;
        category: string;
    }>;
    formattedMessage: string;
}

export class NamedLocationService {
    private static placesTool = new PlacesTool();

    /**
     * Resolves an arbitrary location phrase independently and returns verified nearby places.
     */
    static async handleNamedLocationQuery(params: HandleNamedLocationParams): Promise<NamedLocationResult> {
        const { locationPhrase, activeTripDestination } = params;
        const category = params.category || "attractions";
        const lang = params.language || "en";

        logger.info({ locationPhrase, category, language: lang, activeTripDestination }, "NamedLocationService: Processing named location search query");

        // 1. Independent Reference Center Coordinates Resolution
        let refCoords: { latitude: number; longitude: number; name: string } | null = null;

        // 1a. Check static dictionary / regional context optimization
        const staticCoords = getDestinationCoordinates(locationPhrase) || 
                             (activeTripDestination ? getDestinationCoordinates(`${locationPhrase} ${activeTripDestination}`) : null);

        if (staticCoords) {
            refCoords = {
                latitude: staticCoords.latitude,
                longitude: staticCoords.longitude,
                name: locationPhrase
            };
        } else {
            // 1b. Dynamic Places Search entity resolution for arbitrary worldwide locations
            try {
                const entitySearch = await this.placesTool.execute({
                    query: activeTripDestination ? `${locationPhrase}, ${activeTripDestination}` : locationPhrase,
                    maxResults: 1
                });

                if (entitySearch.success && entitySearch.data?.places?.[0]?.location) {
                    const topEntity = entitySearch.data.places[0];
                    if (isValidCoordinate(topEntity.location.latitude, topEntity.location.longitude)) {
                        refCoords = {
                            latitude: topEntity.location.latitude,
                            longitude: topEntity.location.longitude,
                            name: topEntity.name || locationPhrase
                        };
                    }
                }
            } catch (err) {
                logger.warn({ err, locationPhrase }, "NamedLocationService: Entity resolution search failed");
            }
        }

        // 2. Failure / Ambiguity Handling if reference center cannot be resolved
        if (!refCoords) {
            logger.info({ locationPhrase }, "NamedLocationService: Unable to resolve reference center coordinates");
            const notFoundMsg = lang === "mr"
                ? `📍 "${locationPhrase}" हे ठिकाण सापडू शकले नाही. कृपया ठिकाणाचे नाव तपासा किंवा शहराचे नाव समाविष्ट करा (उदा. "Places near Swargate, Pune").`
                : lang === "hi"
                    ? `📍 स्थान "${locationPhrase}" की पुष्टि नहीं हो सकी। कृपया स्थान का नाम जांचें या शहर का नाम शामिल करें (जैसे "Places near Swargate, Pune")।`
                    : `📍 Could not resolve location "${locationPhrase}". Please check the place name or include the city name (e.g. "Places near Swargate, Pune").`;

            return {
                success: false,
                locationPhrase,
                places: [],
                formattedMessage: notFoundMsg
            };
        }

        // 3. Search for places near the resolved center coordinates
        let searchQuery = "";
        if (category === "food") searchQuery = `restaurants near ${locationPhrase}`;
        else if (category === "hotels") searchQuery = `hotels near ${locationPhrase}`;
        else if (category === "cafes") searchQuery = `cafes near ${locationPhrase}`;
        else if (category === "shopping") searchQuery = `shopping places near ${locationPhrase}`;
        else searchQuery = `places to visit near ${locationPhrase}`;

        if (activeTripDestination && !locationPhrase.toLowerCase().includes(activeTripDestination.toLowerCase())) {
            searchQuery += `, ${activeTripDestination}`;
        }

        let searchResult = await this.placesTool.execute({
            query: searchQuery,
            latitude: refCoords.latitude,
            longitude: refCoords.longitude,
            radius: 10000,
            maxResults: 10
        });

        let rawPlaces: NormalizedPlace[] = searchResult.success && searchResult.data?.places ? searchResult.data.places : [];

        // Fallback search if primary query yields 0 results
        if (rawPlaces.length === 0) {
            const fallbackQuery = `attractions in ${locationPhrase}`;
            searchResult = await this.placesTool.execute({
                query: fallbackQuery,
                latitude: refCoords.latitude,
                longitude: refCoords.longitude,
                radius: 15000,
                maxResults: 10
            });
            if (searchResult.success && searchResult.data?.places) {
                rawPlaces = searchResult.data.places;
            }
        }

        if (rawPlaces.length === 0) {
            const noResultsMsg = lang === "mr"
                ? `📍 "${locationPhrase}" जवळ कोणतीही सत्यापित ठिकाणे सापडली नाहीत. कृपया परिसर बदलून प्रयत्न करा.`
                : lang === "hi"
                    ? `📍 "${locationPhrase}" के पास कोई सत्यापित स्थान नहीं मिला। कृपया दूसरा क्षेत्र खोजें।`
                    : `📍 No verified places found near "${locationPhrase}". Try searching with a broader area name (e.g., "Places near ${locationPhrase}, Pune").`;

            return {
                success: false,
                locationPhrase,
                resolvedCenter: refCoords,
                places: [],
                formattedMessage: noResultsMsg
            };
        }

        // 4. Calculate Haversine distance strictly from resolved reference center coordinates
        const processedPlaces = rawPlaces.map((p) => {
            let distanceKm: number | undefined;
            if (p.location && isValidCoordinate(p.location.latitude, p.location.longitude)) {
                const meters = haversineDistanceMeters(
                    refCoords!.latitude,
                    refCoords!.longitude,
                    p.location.latitude,
                    p.location.longitude
                );
                distanceKm = parseFloat((meters / 1000).toFixed(1));
            }

            // Google Maps Link: Use API-returned googleMapsUri if available, or generate standard search URL
            const mapsUrl = (p as any).googleMapsUri || 
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + " " + (p.address || locationPhrase))}`;

            return {
                name: p.name,
                address: p.address,
                rating: p.rating,
                userRatingCount: p.userRatingCount,
                distanceKm,
                mapsUrl,
                category
            };
        });

        // Rank candidates by rating & distance
        processedPlaces.sort((a, b) => {
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            if (Math.abs(ratingB - ratingA) > 0.3) {
                return ratingB - ratingA;
            }
            return (a.distanceKm || 99) - (b.distanceKm || 99);
        });

        const topPlaces = processedPlaces.slice(0, 5);

        // 5. Format localized message
        const categoryHeader = category === "food"
            ? (lang === "mr" ? "रेस्टॉरंट्स" : lang === "hi" ? "रेस्टोरेंट" : "Restaurants")
            : category === "hotels"
                ? (lang === "mr" ? "हॉटेल्स" : lang === "hi" ? "होटल" : "Hotels")
                : (lang === "mr" ? "प्रसिद्ध ठिकाणे" : lang === "hi" ? "प्रमुख स्थान" : "Places");

        const headerStr = lang === "mr"
            ? `📍 *${locationPhrase} जवळील ${categoryHeader}*`
            : lang === "hi"
                ? `📍 *${locationPhrase} के पास ${categoryHeader}*`
                : `📍 *${categoryHeader} near ${locationPhrase}*`;

        const placeLines = topPlaces.map((p, idx) => {
            let line = `${idx + 1}. 🏛️ *${p.name}*`;
            if (p.rating) {
                line += `\n   ⭐ ${p.rating}${p.userRatingCount ? ` (${p.userRatingCount.toLocaleString()} ratings)` : ""}`;
            }
            if (p.address) {
                line += `\n   📍 ${p.address}`;
            }
            if (typeof p.distanceKm === "number") {
                const distStr = lang === "mr" ? `~${p.distanceKm} किमी ${locationPhrase}पासून` : lang === "hi" ? `~${p.distanceKm} किमी ${locationPhrase} से` : `~${p.distanceKm} km from ${locationPhrase}`;
                line += `\n   📏 ${distStr}`;
            }
            const mapsLabel = lang === "mr" ? "गूगल मॅप्सवर पहा" : lang === "hi" ? "गूगल मैप्स पर देखें" : "View on Google Maps";
            line += `\n   🗺️ ${mapsLabel}: ${p.mapsUrl}`;
            return line;
        });

        const formattedMessage = `${headerStr}\n\n${placeLines.join("\n\n")}`;

        return {
            success: true,
            locationPhrase,
            resolvedCenter: refCoords,
            places: topPlaces,
            formattedMessage
        };
    }
}
