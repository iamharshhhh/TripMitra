export type CandidatePlaceCategory = "attraction" | "restaurant" | "nature" | "heritage" | "activity" | "shopping";
export type ItineraryActivityType = "attraction" | "restaurant" | "meal" | "free_time" | "transit";
export type PlaceSourceType = "knowledge_base" | "google-places" | "merged";
export interface CandidatePlaceLocation {
    latitude?: number;
    longitude?: number;
    address?: string;
    neighborhood?: string;
}
export interface CandidatePlaceProvenance {
    sources: Array<"knowledge_base" | "google-places">;
    sourceId?: string;
    sourceUrl?: string;
    retrievalScore?: number;
    retrievalQuery?: string;
    ragDetails?: {
        documentId?: string;
        sourceFile?: string;
        category?: string;
        score?: number;
        title?: string;
    };
    googleDetails?: {
        placeId?: string;
        types?: string[];
        userRatingCount?: number;
    };
}
export interface CandidatePlace {
    placeId: string;
    name: string;
    destinationSlug: string;
    category: CandidatePlaceCategory;
    location: CandidatePlaceLocation;
    description?: string;
    rating?: number;
    userRatingCount?: number;
    priceLevel?: number;
    estimatedVisitDurationMinutes?: number;
    familyFriendly?: boolean;
    wheelchairAccessible?: boolean;
    walkingIntensity?: "minimal" | "moderate" | "high";
    indoor?: boolean;
    openingHours?: string | string[];
    estimatedCostPerPerson?: number;
    costConfidence?: "low" | "medium" | "high" | "unknown";
    source: PlaceSourceType;
    sourceUrl?: string;
    provenance: CandidatePlaceProvenance;
    isIconicLandmark?: boolean;
    timeOfDaySuitability?: "morning" | "afternoon" | "sunset_evening" | "night" | "any";
}
export interface PlaceDiscoveryLimits {
    maxRagCandidates?: number;
    maxGooglePlacesCandidates?: number;
    maxFinalCandidates?: number;
    maxGoogleQueries?: number;
    dedupDistanceMeters?: number;
}
export interface PlaceDiscoveryOptions {
    limits?: PlaceDiscoveryLimits;
    skipRag?: boolean;
    skipGooglePlaces?: boolean;
}
