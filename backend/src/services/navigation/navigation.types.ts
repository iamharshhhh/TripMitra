export type RecommendedTransitMode = "walking" | "public_transit" | "taxi_rideshare" | "driving";
export type TransitGuidanceConfidence = "high" | "moderate" | "advisory_only";
export type TransitReasonCode = "short_walking_distance" | "high_walking_tolerance" | "minimal_walking_preference" | "moderate_transit_distance" | "long_distance_vehicle" | "weather_advisory_vehicle";
export interface NavigationDestination {
    placeId?: string;
    name: string;
    latitude?: number;
    longitude?: number;
    address?: string | null;
    destinationCity?: string;
}
export interface NavigationOrigin {
    name?: string;
    latitude?: number;
    longitude?: number;
    placeId?: string;
}
export interface TransitGuidanceContext {
    estimatedDistanceMeters: number;
    walkingTolerance?: "minimal" | "moderate" | "high";
    accessibilityRequirements?: string[];
    weatherSuitability?: "suitable" | "potentially_unfavorable" | "unsuitable" | "unknown";
    weatherNotice?: string;
}
export interface TransitGuidanceResult {
    recommendedMode: RecommendedTransitMode;
    confidence: TransitGuidanceConfidence;
    reasonCode: TransitReasonCode;
    advisoryNotice?: string;
    stepFreeNotice?: string;
}
export interface PlaceNavigationResult {
    mapSearchUrl: string | null;
    directionsUrl: string | null;
    transitGuidance?: TransitGuidanceResult;
}
/**
 * Navigation and Transit Guidance Domain Types (M9.4)
 *
 * Scope:
 * - Deterministic Google Maps deep links
 * - Pure advisory transit guidance based on structured trip context
 * - Zero paid routing APIs
 * - Reusable by Itinerary Presentation and M9.3 live-location engine
 */
export {};
