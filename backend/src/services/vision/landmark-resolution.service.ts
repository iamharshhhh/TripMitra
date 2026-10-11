import { PlaceDiscoveryService } from "../itinerary/place-discovery.service.js";
import { RagRetrievalService } from "../../rag/retrieval.service.js";
import { SessionLocationStore } from "../location/session-location.store.js";
import { NavigationService } from "../navigation/navigation.service.js";
import { MULTILINGUAL_VISION_STRINGS } from "./vision-presenter.strings.js";
import { haversineDistanceMeters, isValidCoordinate } from "../../utils/geography.js";
import { logger } from "../../utils/logger.js";
import { PlacesTool } from "../../tools/places.tool.js";
import { SupportedLanguage } from "../language/language-detector.service.js";
import { LandmarkVisionResponse } from "./vision.types.js";

/**
 * Common landmark aliases for deterministic normalization.
 */
const LANDMARK_ALIASES = {
    "shanivar vada": "Shaniwar Wada",
    "shaniwar wada": "Shaniwar Wada",
    "shanivar wada": "Shaniwar Wada",
    "shaniwar palace": "Shaniwar Wada",
    "pataleshwar cave": "Pataleshwar Cave Temple",
    "pataleshwar caves": "Pataleshwar Cave Temple",
    "pataleshwar temple": "Pataleshwar Cave Temple",
    "pataleshwar cave temple": "Pataleshwar Cave Temple",
    "aga khan": "Aga Khan Palace",
    "aga khan palace": "Aga Khan Palace",
    "agakhan palace": "Aga Khan Palace",
    "sinhagad": "Sinhagad Fort",
    "sinhagad fort": "Sinhagad Fort",
    "sinhagarh": "Sinhagad Fort",
    "shreemant dagdusheth halwai ganpati temple": "Dagdusheth Halwai Ganpati Temple",
    "dagdusheth ganpati": "Dagdusheth Halwai Ganpati Temple",
    "dagdusheth temple": "Dagdusheth Halwai Ganpati Temple",
    "dagdusheth halwai": "Dagdusheth Halwai Ganpati Temple",
    "osho ashram": "Osho International Meditation Resort",
    "osho international meditation resort": "Osho International Meditation Resort"
};
export class LandmarkResolutionService {
    discoveryService;
    ragService;
    constructor(discoveryService?: PlaceDiscoveryService | any, ragService?: RagRetrievalService | any) {
        this.discoveryService = discoveryService ?? new PlaceDiscoveryService();
        this.ragService = ragService ?? new RagRetrievalService();
    }
    /**
     * Deterministically resolves a vision candidate against the authoritative place catalog,
     * performs RAG grounding if verified, checks M9.3 proximity, and formats localized output.
     */
    async resolveLandmark(params: {
        visionResponse: LandmarkVisionResponse;
        destination?: string;
        conversationId?: string;
        language?: SupportedLanguage;
    }) {
        const { visionResponse, conversationId } = params;
        const destination = params.destination || "Pune";
        const language = params.language || "en";
        const strings = MULTILINGUAL_VISION_STRINGS[language] || MULTILINGUAL_VISION_STRINGS.en;
        const rawCandidateName = visionResponse.candidateName?.trim();
        const fullVisionResponse = {
            analysisType: "landmark",
            ...visionResponse
        };
        if (!rawCandidateName || visionResponse.identificationStatus === "unknown") {
            return {
                resolutionStatus: "unmatched_unknown",
                visionResponse: fullVisionResponse,
                language,
                formattedMessage: strings.unknownNotice,
                sanitizedSpatialContext: "Landmark photo was unrecognized."
            };
        }
        // 2. Normalize Candidate Name via Aliases
        const normalizedKey = rawCandidateName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
        const canonicalName = LANDMARK_ALIASES[normalizedKey] || rawCandidateName;
        // 3. Match against Authoritative Catalog (CandidatePlace Pool)
        const effectiveReqs = {
            destination,
            destinationSlug: destination.toLowerCase(),
            durationDays: 1,
            interests: []
        };
        let matchedPlace;
        try {
            const candidates = await this.discoveryService.discoverCandidates(effectiveReqs);
            matchedPlace = candidates.find((c) => {
                const cNorm = c.name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
                return (cNorm === normalizedKey ||
                    cNorm === canonicalName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim() ||
                    c.name.toLowerCase().includes(canonicalName.toLowerCase()) ||
                    canonicalName.toLowerCase().includes(c.name.toLowerCase()));
            });
        }
        catch (discErr) {
            logger.warn({ err: discErr }, "Place discovery failed during landmark resolution; continuing with unverified fallback");
        }
        // Fallback to real-time Google Places API search if not in local catalog
        if (!matchedPlace && canonicalName) {
            try {
                const placesTool = new PlacesTool();
                const searchRes = await placesTool.execute({ query: canonicalName, maxResults: 1 });
                if (searchRes.success && searchRes.data?.places && searchRes.data.places.length > 0) {
                    const p = searchRes.data.places[0];
                    matchedPlace = {
                        placeId: p.id,
                        name: p.name,
                        category: (p.types?.[0] as any) || "attraction",
                        location: p.location ? { latitude: p.location.latitude, longitude: p.location.longitude, address: p.address } : undefined,
                        rating: p.rating,
                        reviewsCount: p.userRatingCount,
                        tags: p.types || []
                    } as any;
                }
            } catch (placesErr) {
                logger.warn({ err: placesErr, canonicalName }, "Google Places search fallback for landmark failed");
            }
        }
        // Determine Resolution Status
        // CRITICAL AUTHORITY BOUNDARY: Even high confidence vision cannot self-verify without catalog match!
        const resolutionStatus = matchedPlace
            ? "verified_authoritative"
            : "unverified_candidate";
        // 4. M9.3 Spatial Corroboration (Contextual only; NEVER mutates vision confidence!)
        let spatialContext = "none";
        let distanceMeters;
        let userPin;
        if (conversationId) {
            const pin = SessionLocationStore.getLocation(conversationId);
            if (pin &&
                matchedPlace?.location &&
                typeof matchedPlace.location.latitude === "number" &&
                typeof matchedPlace.location.longitude === "number" &&
                isValidCoordinate(matchedPlace.location.latitude, matchedPlace.location.longitude)) {
                userPin = { latitude: pin.latitude, longitude: pin.longitude };
                const dist = haversineDistanceMeters(pin.latitude, pin.longitude, matchedPlace.location.latitude, matchedPlace.location.longitude);
                distanceMeters = dist;
                if (dist <= 1200) {
                    spatialContext = "nearby";
                }
                else if (dist <= 3500) {
                    spatialContext = "moderate_distance";
                }
                else {
                    spatialContext = "far";
                }
            }
        }
        // 5. RAG Factual Grounding
        // Only verified authoritative places receive factual knowledge grounding.
        let ragChunks = [];
        if (resolutionStatus === "verified_authoritative" && matchedPlace) {
            try {
                const ragResult = await this.ragService.retrieveRelevantChunks({
                    query: `${matchedPlace.name} history architecture tourist visiting information`,
                    destinationSlug: destination.toLowerCase(),
                    limit: 2
                });
                ragChunks = ragResult;
            }
            catch (ragErr) {
                logger.warn({ err: ragErr }, "RAG retrieval failed during landmark resolution");
            }
        }
        // 6. M9.4 Navigation Link
        // Only verified authoritative places receive navigation links!
        let navigation;
        if (resolutionStatus === "verified_authoritative" &&
            matchedPlace?.location &&
            typeof matchedPlace.location.latitude === "number" &&
            typeof matchedPlace.location.longitude === "number") {
            navigation = NavigationService.buildPlaceNavigation({
                placeId: matchedPlace.placeId,
                name: matchedPlace.name,
                latitude: matchedPlace.location.latitude,
                longitude: matchedPlace.location.longitude,
                address: matchedPlace.location.address
            }, userPin
                ? { name: "Your Location", latitude: userPin.latitude, longitude: userPin.longitude }
                : undefined, distanceMeters !== undefined
                ? {
                    estimatedDistanceMeters: distanceMeters
                }
                : undefined);
        }
        // 7. Format Localized Output Presentation
        const lines = [];
        if (visionResponse.identificationStatus === "ambiguous") {
            lines.push(strings.ambiguousNotice(visionResponse.reasoningSummary));
        }
        else if (resolutionStatus === "verified_authoritative" && matchedPlace) {
            lines.push(strings.verifiedHeader(matchedPlace.name, matchedPlace.category));
        }
        else {
            lines.push(strings.unverifiedHeader(canonicalName));
        }
        // Visual Clues
        if (visionResponse.visualClues && visionResponse.visualClues.length > 0) {
            lines.push("");
            lines.push(strings.visualCluesHeader);
            for (const clue of visionResponse.visualClues) {
                lines.push(`• ${clue}`);
            }
        }
        // Factual Grounding
        if (ragChunks.length > 0) {
            lines.push("");
            lines.push(strings.aboutHeader);
            for (const chunk of ragChunks) {
                const excerpt = chunk.content.replace(/\n+/g, " ").trim().substring(0, 250);
                lines.push(`_${excerpt}..._`);
            }
        }
        else if (visionResponse.reasoningSummary && visionResponse.identificationStatus !== "ambiguous") {
            lines.push("");
            lines.push(`_${visionResponse.reasoningSummary}_`);
        }
        // Spatial Context (Location Check)
        if (spatialContext === "nearby" && distanceMeters !== undefined) {
            lines.push("");
            const distLabel = distanceMeters >= 1000
                ? `${(distanceMeters / 1000).toFixed(1)}km`
                : `${distanceMeters}m`;
            lines.push(strings.nearbyCorroboration(distLabel));
        }
        // Navigation Deep Link (Verified Only)
        if (navigation?.directionsUrl) {
            lines.push("");
            lines.push(`🗺️ ${strings.directionsBtn}: ${navigation.directionsUrl}`);
        }
        else if (navigation?.mapSearchUrl) {
            lines.push("");
            lines.push(`🗺️ ${strings.directionsBtn}: ${navigation.mapSearchUrl}`);
        }
        // Disclaimers
        if (resolutionStatus === "unverified_candidate") {
            lines.push("");
            lines.push(strings.unverifiedDisclaimer);
        }
        else if (distanceMeters !== undefined) {
            lines.push("");
            lines.push(strings.geographicEstimateNote);
        }
        const formattedMessage = lines.join("\n");
        const sanitizedSpatialContext = resolutionStatus === "verified_authoritative" && matchedPlace
            ? `User sent photo of verified landmark: ${matchedPlace.name} (${matchedPlace.category}). Location proximity: ${spatialContext}.`
            : `User sent photo resembling candidate: ${canonicalName} (unverified in catalog).`;
        return {
            resolutionStatus,
            visionResponse: fullVisionResponse,
            language,
            verifiedPlace: matchedPlace,
            spatialContext,
            distanceMeters,
            distanceEstimationSource: distanceMeters !== undefined ? "geographic_estimate" : undefined,
            navigation,
            ragChunks,
            formattedMessage,
            sanitizedSpatialContext
        };
    }
}
