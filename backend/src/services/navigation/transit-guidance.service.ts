import { TransitGuidanceContext } from "./navigation.types.js";
export class TransitGuidanceService {
    /**
     * Evaluates transit context deterministically.
     */
    static evaluate(context: TransitGuidanceContext) {
        const dist = typeof context.estimatedDistanceMeters === "number" && context.estimatedDistanceMeters >= 0
            ? context.estimatedDistanceMeters
            : 0;
        const tolerance = context.walkingTolerance;
        const isWeatherUnfavorable = context.weatherSuitability === "unsuitable" ||
            context.weatherSuitability === "potentially_unfavorable";
        const hasAccessibilityReqs = Array.isArray(context.accessibilityRequirements) &&
            context.accessibilityRequirements.length > 0;
        // Accessibility advisory note (preserves unknown route accessibility semantics)
        const stepFreeNotice = hasAccessibilityReqs
            ? "Please verify step-free access and facility support at the venue."
            : undefined;
        // 1. Explicit minimal walking tolerance preference
        if (tolerance === "minimal" && dist > 300) {
            return {
                recommendedMode: "taxi_rideshare",
                confidence: "advisory_only",
                reasonCode: "minimal_walking_preference",
                advisoryNotice: "Minimal walking preference specified; taxi/rideshare advisory.",
                stepFreeNotice
            };
        }
        // 2. Short distance (<= 1,200m)
        if (dist <= 1200) {
            if (isWeatherUnfavorable && dist > 500) {
                return {
                    recommendedMode: "taxi_rideshare",
                    confidence: "advisory_only",
                    reasonCode: "weather_advisory_vehicle",
                    advisoryNotice: "Weather may be unfavorable for walking; local transit or taxi advised.",
                    stepFreeNotice
                };
            }
            return {
                recommendedMode: "walking",
                confidence: "moderate",
                reasonCode: "short_walking_distance",
                stepFreeNotice
            };
        }
        // 3. Moderate distance (1,200m - 3,500m)
        if (dist <= 3500) {
            if (tolerance === "high" && !isWeatherUnfavorable) {
                return {
                    recommendedMode: "walking",
                    confidence: "moderate",
                    reasonCode: "high_walking_tolerance",
                    stepFreeNotice
                };
            }
            return {
                recommendedMode: "public_transit",
                confidence: "advisory_only",
                reasonCode: "moderate_transit_distance",
                advisoryNotice: "Public transit or taxi recommended for this distance.",
                stepFreeNotice
            };
        }
        // 4. Long distance (> 3,500m)
        return {
            recommendedMode: "taxi_rideshare",
            confidence: "advisory_only",
            reasonCode: "long_distance_vehicle",
            advisoryNotice: "Vehicle transport recommended for cross-city travel.",
            stepFreeNotice
        };
    }
}
