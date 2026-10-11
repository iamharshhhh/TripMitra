import { MULTILINGUAL_LOCATION_STRINGS, CATEGORY_ICONS } from "./location-presenter.strings.js";
import { SupportedLanguage } from "../language/language-detector.service.js";
import { NearbyCategory, NearbyPlace, NextItineraryStopResult } from "./location.types.js";

/**
 * LocationResponsePresenter
 *
 * Centralized, deterministic presentation layer for all WhatsApp messages
 * generated from shared live location interactions.
 *
 * Invariants:
 * 1. Presentation-only: Zero database queries, zero Places searches, zero LLM calls, zero coordinate mutations.
 * 2. No pseudo-Markdown: Plain, clickable HTTPS URLs natively recognized by WhatsApp.
 * 3. Compact & Scannable: Numbered place cards with emoji hierarchy and single-line ratings/distance.
 * 4. Multilingual: 100% localized in English, Hindi, and Marathi with zero English leakage.
 * 5. Data fidelity: Preserves authoritative place names, coordinates, and distances without loss.
 */
export class LocationResponsePresenter {
    /**
     * Formats radial exploration results (Attractions, Restaurants, Hotels, etc.)
     * into clean, numbered WhatsApp place cards.
     */
    static formatRadialDiscovery(params: {
        places: NearbyPlace[];
        category: NearbyCategory;
        language: SupportedLanguage;
    }) {
        const { places, category, language } = params;
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[language] || MULTILINGUAL_LOCATION_STRINGS.en;
        const categoryIcon = CATEGORY_ICONS[category] || "📍";
        const header = locStrings.categoryHeaders[category] || locStrings.nearbyPlacesHeader;
        const lines = [header, ""];
        if (places.length === 0) {
            const categoryName = locStrings.categoryNames[category] || category;
            lines.push(locStrings.noPlacesFoundCategory(categoryName));
            return lines.join("\n");
        }
        places.forEach((place, index) => {
            const num = index + 1;
            const distLabel = place.distanceMeters >= 1000
                ? locStrings.distanceKm((place.distanceMeters / 1000).toFixed(1))
                : locStrings.distanceMeter(place.distanceMeters);
            const ratingPart = typeof place.rating === "number" && place.rating > 0
                ? `⭐ ${place.rating.toFixed(1)} · `
                : "";
            // Clean, native Google Maps directions deep link (no square bracket pseudo-markdown)
            const lat = Number(place.latitude.toFixed(5));
            const lng = Number(place.longitude.toFixed(5));
            const directionsUrl = `https://maps.google.com/?daddr=${lat},${lng}`;
            lines.push(`${num}. ${categoryIcon} *${place.name}*`);
            lines.push(`   ${ratingPart}📏 ~${distLabel}`);
            lines.push(`   🗺️ ${locStrings.directionsLabel}: ${directionsUrl}`);
            lines.push("");
        });
        lines.push(locStrings.geographicEstimateNote);
        return lines.join("\n").trim();
    }
    /**
     * Formats active-trip next itinerary stop guidance.
     */
    static formatNextStop(nextStop: NextItineraryStopResult, language: SupportedLanguage) {
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
        const placeLat = nextStop.place.location?.latitude;
        const placeLng = nextStop.place.location?.longitude;
        let directionsUrl = nextStop.navigation?.directionsUrl;
        // Use clean compact URL if valid coordinates exist
        if (typeof placeLat === "number" && typeof placeLng === "number") {
            const lat = Number(placeLat.toFixed(5));
            const lng = Number(placeLng.toFixed(5));
            directionsUrl = `https://maps.google.com/?daddr=${lat},${lng}`;
        }
        const lines = [
            locStrings.locationReceivedHeader,
            "",
            locStrings.nextStopHeader,
            `📍 *${nextStop.place.name}*`,
            locStrings.distanceLabel(distLabel),
            transitLine
        ];
        if (directionsUrl) {
            lines.push("");
            lines.push(`🗺️ ${locStrings.directionsLabel}: ${directionsUrl}`);
        }
        lines.push("");
        lines.push(locStrings.geographicEstimateNote);
        return lines.join("\n").trim();
    }
    /**
     * Formats out-of-bounds notice when GPS pin is > 10km from itinerary target.
     */
    static formatOutOfBounds(language: SupportedLanguage) {
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[language] || MULTILINGUAL_LOCATION_STRINGS.en;
        return locStrings.outOfBoundsNotice;
    }
    /**
     * Formats empty discovery notice for a category.
     */
    static formatNoPlacesFound(category: NearbyCategory, language: SupportedLanguage) {
        const locStrings = MULTILINGUAL_LOCATION_STRINGS[language] || MULTILINGUAL_LOCATION_STRINGS.en;
        const categoryName = locStrings.categoryNames[category] || category;
        return locStrings.noPlacesFoundCategory(categoryName);
    }
}
