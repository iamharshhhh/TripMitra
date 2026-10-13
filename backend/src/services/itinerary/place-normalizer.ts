import { normalizeDestinationSlug } from "../../types/trip-requirements.types.js";
import { RetrievedChunk } from "../../rag/retrieval.service.js";
import { NormalizedPlace } from "../../tools/places.tool.js";

/**
 * Maps provider-specific or freeform categories into the application's controlled categories:
 * attraction | restaurant | nature | heritage | activity | shopping
 */
export function normalizeCategory(categoryOrType: string, types = []) {
    const combined = [categoryOrType ?? "", ...types]
        .map((s) => s.toLowerCase().trim())
        .filter(Boolean);
    const hasKeyword = (keywords) => combined.some((item) => keywords.some((kw) => item.includes(kw)));
    if (hasKeyword([
        "restaurant",
        "food",
        "dining",
        "cafe",
        "bakery",
        "bar",
        "meal"
    ])) {
        return "restaurant";
    }
    if (hasKeyword([
        "heritage",
        "history",
        "historical",
        "monument",
        "fort",
        "palace",
        "temple",
        "church",
        "mosque",
        "museum",
        "place_of_worship",
        "culture"
    ])) {
        return "heritage";
    }
    if (hasKeyword([
        "activity",
        "activities",
        "activit",
        "amusement",
        "theme_park",
        "water_park",
        "trek",
        "adventure",
        "sport",
        "stadium",
        "entertainment",
        "movie",
        "theater"
    ])) {
        return "activity";
    }
    if (hasKeyword([
        "park",
        "nature",
        "garden",
        "zoo",
        "wildlife",
        "campground",
        "natural_feature"
    ])) {
        return "nature";
    }
    if (hasKeyword([
        "shopping",
        "market",
        "bazaar",
        "mall",
        "store"
    ])) {
        return "shopping";
    }
    if (hasKeyword([
        "attraction",
        "sightseeing",
        "tourist",
        "point_of_interest"
    ])) {
        return "attraction";
    }
    return "attraction";
}
/**
 * Normalizes a Google Places result into a CandidatePlace.
 * Unknown fields remain strictly undefined.
 */
export function normalizeGooglePlaceCandidate(place: NormalizedPlace, destinationSlug: string, query: string) {
    const category = normalizeCategory(undefined, place.types);
    return {
        placeId: place.id || `google:${destinationSlug}:${normalizeDestinationSlug(place.name)}`,
        name: place.name.trim(),
        destinationSlug,
        category,
        location: {
            latitude: place.location?.latitude,
            longitude: place.location?.longitude,
            address: place.address ? place.address.trim() : undefined
        },
        rating: typeof place.rating === "number" ? place.rating : undefined,
        userRatingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : undefined,
        costConfidence: "unknown",
        openingHours: place.regularOpeningHours?.weekdayDescriptions && place.regularOpeningHours.weekdayDescriptions.length > 0
            ? place.regularOpeningHours.weekdayDescriptions
            : undefined,
        source: "google-places",
        provenance: {
            sources: ["google-places"],
            sourceId: place.id,
            retrievalQuery: query,
            googleDetails: {
                placeId: place.id,
                types: place.types,
                userRatingCount: place.userRatingCount
            }
        }
    };
}
const NON_PLACE_CATEGORIES = new Set([
    "safety_and_tips",
    "local_transport",
    "travel_guide",
    "tips",
    "transport",
    "general",
    "safety"
]);
const NON_PLACE_TITLE_PATTERNS = [
    /safety/i,
    /transport/i,
    /travel tips/i,
    /packing/i,
    /guide/i,
    /emergency/i,
    /metro/i,
    /rickshaw/i,
    /weather/i,
    /overview/i,
    /introduction/i,
    /major attractions/i,
    /dining culture/i,
    /culinary identity/i,
    /history & heritage/i,
    /history and heritage/i,
    /culture & festivals/i,
    /culture and festivals/i,
    /attractions & sightseeing/i,
    /attractions and sightseeing/i,
    /food,?\s*cuisine/i,
    /cuisine & dining/i,
    /cuisine and dining/i,
    /general information/i,
    /places to visit in/i,
    /things to do in/i,
    /sightseeing in/i
];
/**
 * Normalizes a RAG knowledge chunk into a CandidatePlace if it represents a real geographic place.
 * Advice-only or general advice chunks are rejected (returns null).
 * Unknown fields remain strictly undefined.
 */
export function normalizeRagCandidate(chunk: RetrievedChunk, destinationSlug: string, query: string) {
    // 1. Guard against advice-only and transport categories
    const lowerCat = (chunk.category || "").toLowerCase().trim();
    if (NON_PLACE_CATEGORIES.has(lowerCat)) {
        return null;
    }
    // 2. Extract title / place name from markdown headings or content
    let placeName;
    const content = chunk.content.trim();
    // Pattern: # Place Name or ## Place Name
    const headingMatch = content.match(/^#{1,3}\s+(.+)$/m);
    if (headingMatch && headingMatch[1]) {
        const rawTitle = headingMatch[1].trim();
        const candidateTitle = rawTitle.replace(/^\d+[.)]\s*/, "").trim();
        const isNonPlace = NON_PLACE_TITLE_PATTERNS.some((p) => p.test(candidateTitle));
        if (!isNonPlace) {
            placeName = candidateTitle;
        }
    }
    // If no heading, check if title is in metadata or first line
    if (!placeName && chunk.metadata && typeof chunk.metadata.title === "string") {
        const candidateTitle = chunk.metadata.title.replace(/^\d+[.)]\s*/, "").trim();
        if (!NON_PLACE_TITLE_PATTERNS.some((p) => p.test(candidateTitle))) {
            placeName = candidateTitle;
        }
    }
    // If no valid place name was detected from headings or metadata, reject this chunk as a place candidate
    if (!placeName || placeName.length < 2) {
        return null;
    }
    // 3. Extract vicinity / neighborhood if present
    let neighborhood;
    if (chunk.metadata && typeof chunk.metadata.neighborhood === "string") {
        neighborhood = chunk.metadata.neighborhood.trim();
    }
    else {
        const areaMatch = content.match(/(?:Area|Neighborhood|Vicinity):\s*([^,\n\r]+)/i);
        if (areaMatch && areaMatch[1]) {
            neighborhood = areaMatch[1].trim();
        }
    }
    // 4. Extract description from content (excluding headings and meta lines)
    const descriptionLines = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("###"))
        .slice(0, 3);
    const description = descriptionLines.length > 0 ? descriptionLines.join(" ") : undefined;
    // 5. Generate deterministic placeId
    const rawId = chunk.externalId || chunk.metadata?.rawId;
    const placeId = rawId
        ? `rag:${destinationSlug}:${rawId}`
        : `rag:${destinationSlug}:${normalizeDestinationSlug(placeName)}`;
    const category = normalizeCategory(chunk.category);
    return {
        placeId,
        name: placeName,
        destinationSlug,
        category,
        location: {
            neighborhood
        },
        description,
        costConfidence: "unknown",
        source: "knowledge_base",
        sourceUrl: chunk.sourceUrl,
        provenance: {
            sources: ["knowledge_base"],
            sourceId: chunk.externalId || chunk.documentId || placeId,
            sourceUrl: chunk.sourceUrl,
            retrievalScore: chunk.score,
            retrievalQuery: query,
            ragDetails: {
                documentId: chunk.documentId,
                sourceFile: chunk.sourceFile,
                category: chunk.category,
                score: chunk.score,
                title: placeName
            }
        }
    };
}
