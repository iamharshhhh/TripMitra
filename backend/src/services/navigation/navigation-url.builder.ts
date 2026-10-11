import { NavigationDestination, NavigationOrigin, RecommendedTransitMode } from "./navigation.types.js";
export class NavigationUrlBuilder {
    static GOOGLE_MAPS_SEARCH_BASE = "https://www.google.com/maps/search/?api=1";
    static GOOGLE_MAPS_DIR_BASE = "https://www.google.com/maps/dir/?api=1";
    /**
     * Validates whether latitude and longitude are valid numeric geographic coordinates.
     */
    static isValidCoordinate(lat: number, lng: number) {
        if (typeof lat !== "number" || typeof lng !== "number")
            return false;
        if (isNaN(lat) || isNaN(lng))
            return false;
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }
    /**
     * Builds a Google Maps search/place deep link according to the 3-tier hierarchy.
     */
    static buildMapSearchUrl(dest: NavigationDestination) {
        if (!dest)
            return null;
        const hasValidCoords = this.isValidCoordinate(dest.latitude, dest.longitude);
        const hasName = typeof dest.name === "string" && dest.name.trim().length > 0;
        const hasPlaceId = typeof dest.placeId === "string" && dest.placeId.trim().length > 0;
        // Tier A: Authoritative placeId + Name/Address
        if (hasPlaceId && (hasName || dest.address)) {
            const queryText = (dest.name || dest.address || "").trim();
            const encodedQuery = encodeURIComponent(queryText);
            const encodedPlaceId = encodeURIComponent(dest.placeId.trim());
            return `${this.GOOGLE_MAPS_SEARCH_BASE}&query=${encodedQuery}&query_place_id=${encodedPlaceId}`;
        }
        // Tier B: Authoritative Coordinates
        if (hasValidCoords) {
            const lat = dest.latitude;
            const lng = dest.longitude;
            return `${this.GOOGLE_MAPS_SEARCH_BASE}&query=${lat}%2C${lng}`;
        }
        // Tier C: Authoritative Name + Destination Fallback
        if (hasName) {
            let queryText = dest.name.trim();
            if (dest.destinationCity && !queryText.toLowerCase().includes(dest.destinationCity.toLowerCase())) {
                queryText = `${queryText}, ${dest.destinationCity.trim()}`;
            }
            return `${this.GOOGLE_MAPS_SEARCH_BASE}&query=${encodeURIComponent(queryText)}`;
        }
        return null;
    }
    /**
     * Builds a compact Google Maps search/place deep link.
     * If coordinates are present, formats as https://maps.google.com/?q=lat,lng (5 decimal places).
     */
    static buildCompactMapSearchUrl(dest: NavigationDestination) {
        if (!dest)
            return null;
        const hasValidCoords = this.isValidCoordinate(dest.latitude, dest.longitude);
        if (hasValidCoords) {
            const lat = Number(dest.latitude.toFixed(5));
            const lng = Number(dest.longitude.toFixed(5));
            return `https://maps.google.com/?q=${lat},${lng}`;
        }
        if (dest.name && dest.name.trim().length > 0) {
            let queryText = dest.name.trim();
            if (dest.destinationCity && !queryText.toLowerCase().includes(dest.destinationCity.toLowerCase())) {
                queryText = `${queryText}, ${dest.destinationCity.trim()}`;
            }
            return `https://maps.google.com/?q=${encodeURIComponent(queryText)}`;
        }
        return null;
    }
    /**
     * Builds a Google Maps directions deep link between an origin and destination.
     */
    static buildDirectionsUrl(origin: NavigationOrigin, dest: NavigationDestination, mode: RecommendedTransitMode) {
        if (!origin || !dest)
            return null;
        // Format Origin parameter
        let originParam = null;
        if (this.isValidCoordinate(origin.latitude, origin.longitude)) {
            originParam = `${origin.latitude}%2C${origin.longitude}`;
        }
        else if (origin.name && origin.name.trim().length > 0) {
            originParam = encodeURIComponent(origin.name.trim());
        }
        // Format Destination parameter
        let destParam = null;
        if (this.isValidCoordinate(dest.latitude, dest.longitude)) {
            destParam = `${dest.latitude}%2C${dest.longitude}`;
        }
        else if (dest.name && dest.name.trim().length > 0) {
            let queryText = dest.name.trim();
            if (dest.destinationCity && !queryText.toLowerCase().includes(dest.destinationCity.toLowerCase())) {
                queryText = `${queryText}, ${dest.destinationCity.trim()}`;
            }
            destParam = encodeURIComponent(queryText);
        }
        if (!originParam || !destParam)
            return null;
        let url = `${this.GOOGLE_MAPS_DIR_BASE}&origin=${originParam}&destination=${destParam}`;
        // Optional place ID for pinpoint destination accuracy if available
        if (dest.placeId && dest.placeId.trim().length > 0) {
            url += `&destination_place_id=${encodeURIComponent(dest.placeId.trim())}`;
        }
        // Map transit mode parameter if applicable
        if (mode === "walking") {
            url += "&travelmode=walking";
        }
        else if (mode === "public_transit") {
            url += "&travelmode=transit";
        }
        else if (mode === "driving" || mode === "taxi_rideshare") {
            url += "&travelmode=driving";
        }
        return url;
    }
    /**
     * Builds a compact Google Maps directions deep link.
     * Formats as https://maps.google.com/?daddr=lat,lng (5 decimal places).
     */
    static buildCompactDirectionsUrl(origin: NavigationOrigin, dest: NavigationDestination, mode: RecommendedTransitMode) {
        if (!dest)
            return null;
        const hasValidCoords = this.isValidCoordinate(dest.latitude, dest.longitude);
        if (hasValidCoords) {
            const destLat = Number(dest.latitude.toFixed(5));
            const destLng = Number(dest.longitude.toFixed(5));
            return `https://maps.google.com/?daddr=${destLat},${destLng}`;
        }
        if (dest.name && dest.name.trim().length > 0) {
            let queryText = dest.name.trim();
            if (dest.destinationCity && !queryText.toLowerCase().includes(dest.destinationCity.toLowerCase())) {
                queryText = `${queryText}, ${dest.destinationCity.trim()}`;
            }
            return `https://maps.google.com/?daddr=${encodeURIComponent(queryText)}`;
        }
        return null;
    }
}
