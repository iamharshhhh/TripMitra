import { normalizeDestinationSlug } from "../../types/trip-requirements.types.js";
import { CandidatePlace } from "../../types/candidate-place.types.js";
import { haversineDistanceMeters } from "../../utils/geography.js";

export const DEFAULT_PLACE_DEDUP_DISTANCE_METERS = 800;
/**
 * Calculates Haversine distance in meters between two GPS coordinates.
 * Purely used as a deduplication heuristic; not for routing/itinerary optimization.
 */
export function calculateHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    return haversineDistanceMeters(lat1, lon1, lat2, lon2);
}
const COMMON_STOP_WORDS = new Set([
    "the",
    "and",
    "of",
    "in",
    "at",
    "for",
    "hotel",
    "restaurant",
    "fort",
    "palace",
    "temple",
    "mandir",
    "garden",
    "gardens",
    "park",
    "museum",
    "memorial",
    "lake",
    "hill",
    "hills",
    "pune",
    "city"
]);
/**
 * Extracts normalized core tokens for name comparison.
 */
export function extractCoreTokens(name: string) {
    return name
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 2 && !COMMON_STOP_WORDS.has(t));
}
/**
 * Determines whether two CandidatePlaces refer to the same physical place.
 * Strict matching order:
 * 1. Exact placeId (if matching google placeIds)
 * 2. Exact slugified name
 * 3. Distance within threshold AND token overlap
 * 4. Token subset matching if coordinates missing
 */
export function isDuplicatePlace(placeA: CandidatePlace, placeB: CandidatePlace, maxDistanceMeters = DEFAULT_PLACE_DEDUP_DISTANCE_METERS) {
    // 1. Exact placeId match (if valid Google placeId or custom ID)
    if (placeA.placeId &&
        placeB.placeId &&
        !placeA.placeId.startsWith("rag:") &&
        !placeB.placeId.startsWith("rag:") &&
        placeA.placeId === placeB.placeId) {
        return true;
    }
    // 2. Exact slug match
    const slugA = normalizeDestinationSlug(placeA.name);
    const slugB = normalizeDestinationSlug(placeB.name);
    if (slugA && slugB && slugA === slugB) {
        return true;
    }
    const tokensA = extractCoreTokens(placeA.name);
    const tokensB = extractCoreTokens(placeB.name);
    // If either has no distinctive tokens, fallback to full string check
    if (tokensA.length === 0 || tokensB.length === 0) {
        return false;
    }
    const hasCoordsA = typeof placeA.location.latitude === "number" &&
        typeof placeA.location.longitude === "number";
    const hasCoordsB = typeof placeB.location.latitude === "number" &&
        typeof placeB.location.longitude === "number";
    // 3. Distance check when coordinates are present on both
    if (hasCoordsA && hasCoordsB) {
        const dist = calculateHaversineDistanceMeters(placeA.location.latitude, placeA.location.longitude, placeB.location.latitude, placeB.location.longitude);
        if (dist <= maxDistanceMeters) {
            // Must also share at least 1 core token to avoid merging adjacent different venues
            const sharedTokens = tokensA.filter((t) => tokensB.includes(t));
            if (sharedTokens.length > 0) {
                return true;
            }
        }
        // If coordinates are both present and dist > threshold, they are NOT the same place
        return false;
    }
    // 4. Token subset check when one or both coordinates are missing (e.g. RAG)
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    const aSubsetOfB = tokensA.length > 0 && tokensA.every((t) => setB.has(t));
    const bSubsetOfA = tokensB.length > 0 && tokensB.every((t) => setA.has(t));
    if (aSubsetOfB || bSubsetOfA) {
        return true;
    }
    return false;
}
/**
 * Merges two matching CandidatePlaces into a single unified CandidatePlace.
 * Prefers Google Places for real-time location/ratings, and RAG for cultural/historical descriptions.
 */
export function mergeCandidatePlaces(primary: CandidatePlace, secondary: CandidatePlace) {
    const google = primary.source === "google-places" ? primary : secondary.source === "google-places" ? secondary : undefined;
    const rag = primary.source === "knowledge_base" ? primary : secondary.source === "knowledge_base" ? secondary : undefined;
    const mergedSources = Array.from(new Set([...primary.provenance.sources, ...secondary.provenance.sources]));
    const latitude = google?.location.latitude ?? primary.location.latitude ?? secondary.location.latitude;
    const longitude = google?.location.longitude ?? primary.location.longitude ?? secondary.location.longitude;
    const address = google?.location.address ?? primary.location.address ?? secondary.location.address;
    const neighborhood = rag?.location.neighborhood ??
        google?.location.neighborhood ??
        primary.location.neighborhood ??
        secondary.location.neighborhood;
    const description = rag?.description ?? primary.description ?? secondary.description;
    const rating = google?.rating ?? primary.rating ?? secondary.rating;
    const userRatingCount = google?.userRatingCount ?? primary.userRatingCount ?? secondary.userRatingCount;
    const placeId = google?.placeId ?? primary.placeId;
    const name = google?.name ?? primary.name;
    const category = google?.category ?? primary.category;
    const source = mergedSources.includes("google-places") && mergedSources.includes("knowledge_base")
        ? "merged"
        : primary.source;
    return {
        placeId,
        name,
        destinationSlug: primary.destinationSlug,
        category,
        location: {
            latitude,
            longitude,
            address,
            neighborhood
        },
        description,
        rating,
        userRatingCount,
        costConfidence: "unknown",
        source,
        sourceUrl: google?.sourceUrl ?? rag?.sourceUrl ?? primary.sourceUrl,
        provenance: {
            sources: mergedSources,
            sourceId: google?.provenance.sourceId ?? primary.provenance.sourceId,
            sourceUrl: google?.provenance.sourceUrl ?? rag?.provenance.sourceUrl,
            retrievalScore: rag?.provenance.retrievalScore ?? primary.provenance.retrievalScore,
            retrievalQuery: google?.provenance.retrievalQuery ?? primary.provenance.retrievalQuery,
            ragDetails: rag?.provenance.ragDetails ?? (primary.provenance.ragDetails || secondary.provenance.ragDetails),
            googleDetails: google?.provenance.googleDetails ?? (primary.provenance.googleDetails || secondary.provenance.googleDetails)
        }
    };
}
/**
 * Deduplicates an array of CandidatePlaces, merging matching places and preserving provenance.
 */
export function deduplicateCandidates(candidates: CandidatePlace[], maxDistanceMeters: number) {
    const threshold = maxDistanceMeters ??
        (Number(process.env.PLACE_DEDUP_DISTANCE_METERS) || DEFAULT_PLACE_DEDUP_DISTANCE_METERS);
    const deduplicated = [];
    for (const candidate of candidates) {
        const existingIndex = deduplicated.findIndex((existing) => isDuplicatePlace(existing, candidate, threshold));
        if (existingIndex >= 0) {
            // Merge with existing candidate
            deduplicated[existingIndex] = mergeCandidatePlaces(deduplicated[existingIndex], candidate);
        }
        else {
            deduplicated.push(candidate);
        }
    }
    return deduplicated;
}
