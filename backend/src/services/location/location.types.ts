import { CandidatePlace } from "../../types/candidate-place.types.js";
import { SupportedLanguage } from "../language/language-detector.service.js";
import { PlaceNavigationResult } from "../navigation/navigation.types.js";
import { PersistedScheduledPlace } from "../itinerary/itinerary-persistence.types.js";

export interface UserLivePin {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
    timestamp: number;
}

export interface SessionLocationEntry {
    conversationId: string;
    pin: UserLivePin;
    expiresAt: number;
}

export type NearbyCategory = "food" | "attractions" | "hotels" | "cafes" | "shopping" | "photos";

export interface UserLocation {
    latitude: number;
    longitude: number;
    receivedAt: Date;
    name?: string;
    address?: string;
}

export interface NearbyPlace {
    id: string;
    name: string;
    category: NearbyCategory;
    latitude: number;
    longitude: number;
    distanceKm: number;
    distanceMeters: number;
    address?: string;
    rating?: number;
    userRatingCount?: number;
    types?: string[];
}

export interface ProximityRecommendationPlace {
    candidate: CandidatePlace;
    distanceMeters: number;
    distanceEstimationSource: "geographic_estimate";
    distanceScore: number;
    basePreferenceScore: number;
    finalScore: number;
    navigation: PlaceNavigationResult;
}

export interface NextItineraryStopResult {
    place: PersistedScheduledPlace;
    dayNumber: number;
    distanceMeters: number;
    distanceEstimationSource: "geographic_estimate";
    navigation: PlaceNavigationResult;
}

export type LiveLocationRecommendationType = "next_itinerary_stop" | "completed_today" | "no_active_trip" | "free_exploration" | "out_of_bounds";

export interface EvaluateLiveLocationParams {
    conversationId: string;
    userId: string;
    language?: SupportedLanguage;
    category?: NearbyCategory;
    destination?: string;
    mode?: "explore" | "next_stop" | "auto";
    currentTime?: string;
}

export interface LiveLocationRecommendationResult {
    type: LiveLocationRecommendationType;
    conversationId: string;
    language: SupportedLanguage;
    category?: NearbyCategory;
    nextStop?: NextItineraryStopResult;
    nearbyPlaces?: ProximityRecommendationPlace[];
    discoveredNearbyPlaces?: NearbyPlace[];
    formattedMessage: string;
    sanitizedSpatialContext: string;
}
/**
 * Constants for Proximity Boundaries (M9.3)
 */
export const PROXIMITY_BOUNDARIES = {
    IMMEDIATE_WALKABLE_RADIUS_METERS: 1200,
    NEARBY_TRANSIT_RADIUS_METERS: 3500,
    FREE_EXPLORATION_RMAX_METERS: 3500,
    ABSOLUTE_HORIZON_METERS: 10000,
    SESSION_TTL_MS: 30 * 60 * 1000 // 30 minutes
};
export const PROXIMITY_WEIGHTS = {
    PREFERENCE: 0.70,
    DISTANCE: 0.30
};
