import { NavigationUrlBuilder } from "./navigation-url.builder.js";
import { TransitGuidanceService } from "./transit-guidance.service.js";
import { NavigationDestination, NavigationOrigin, TransitGuidanceContext } from "./navigation.types.js";

/**
 * NavigationService
 *
 * Facade coordinating Google Maps universal deep-link generation
 * and deterministic transit guidance.
 *
 * Reusable by:
 * - ItineraryPresenterService (M9.4)
 * - Live-location recommendation engine (M9.3)
 */
export class NavigationService {
    /**
     * Generates a complete navigation and advisory package for a destination.
     */
    static buildPlaceNavigation(destination: NavigationDestination, origin: NavigationOrigin | null = null, transitContext: TransitGuidanceContext | null = null, options: { compact?: boolean } = {}) {
        // 1. Evaluate transit guidance if context is supplied
        const transitGuidance = transitContext
            ? TransitGuidanceService.evaluate(transitContext)
            : undefined;
        // 2. Build map search/place view URL
        const mapSearchUrl = options?.compact
            ? NavigationUrlBuilder.buildCompactMapSearchUrl(destination)
            : NavigationUrlBuilder.buildMapSearchUrl(destination);
        // 3. Build directions URL if origin is provided
        const directionsUrl = origin
            ? options?.compact
                ? NavigationUrlBuilder.buildCompactDirectionsUrl(origin, destination, transitGuidance?.recommendedMode as any)
                : NavigationUrlBuilder.buildDirectionsUrl(origin, destination, transitGuidance?.recommendedMode as any)
            : null;
        return {
            mapSearchUrl,
            directionsUrl,
            transitGuidance
        };
    }
}
