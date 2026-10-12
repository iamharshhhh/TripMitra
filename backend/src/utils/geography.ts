
/**
 * Validates that latitude is within [-90, 90] and longitude is within [-180, 180].
 */
export function isValidCoordinate(latitude: number, longitude: number) {
    if (typeof latitude !== "number" || typeof longitude !== "number") {
        return false;
    }
    if (isNaN(latitude) || isNaN(longitude)) {
        return false;
    }
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}
/**
 * Calculates the Haversine distance in meters between two GPS coordinates.
 * Validates coordinate bounds. Returns 0 if coordinates are identical.
 */
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    if (!isValidCoordinate(lat1, lon1)) {
        throw new Error(`Invalid coordinate for point 1: (${lat1}, ${lon1})`);
    }
    if (!isValidCoordinate(lat2, lon2)) {
        throw new Error(`Invalid coordinate for point 2: (${lat2}, ${lon2})`);
    }
    if (lat1 === lat2 && lon1 === lon2) {
        return 0;
    }
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}
/**
 * Computes the arithmetic geographic center (centroid) of a set of GPS points.
 */
export function geographicCenter(points: Array<{
    latitude: number;
    longitude: number;
}>) {
    if (!points || points.length === 0) {
        throw new Error("Cannot calculate geographic center of an empty points array");
    }
    const validPoints = points.filter((p) => isValidCoordinate(p.latitude, p.longitude));
    if (validPoints.length === 0) {
        throw new Error("No valid coordinates provided to calculate geographic center");
    }
    const sumLat = validPoints.reduce((acc, p) => acc + p.latitude, 0);
    const sumLon = validPoints.reduce((acc, p) => acc + p.longitude, 0);
    return {
        latitude: Math.round((sumLat / validPoints.length) * 1000000) / 1000000,
        longitude: Math.round((sumLon / validPoints.length) * 1000000) / 1000000
    };
}
/**
 * Authoritative destination coordinates dictionary for Indian and major tourist hubs.
 */
export const KNOWN_DESTINATION_COORDINATES = {
    pondicherry: { latitude: 11.9416, longitude: 79.8083 },
    puducherry: { latitude: 11.9416, longitude: 79.8083 },
    goa: { latitude: 15.4909, longitude: 73.8278 },
    panaji: { latitude: 15.4909, longitude: 73.8278 },
    pune: { latitude: 18.5204, longitude: 73.8567 },
    mumbai: { latitude: 19.0760, longitude: 72.8777 },
    chennai: { latitude: 13.0827, longitude: 80.2707 },
    jaipur: { latitude: 26.9124, longitude: 75.7873 },
    manali: { latitude: 32.2432, longitude: 77.1892 },
    shimla: { latitude: 31.1048, longitude: 77.1734 },
    agra: { latitude: 27.1767, longitude: 78.0081 },
    varanasi: { latitude: 25.3176, longitude: 82.9739 },
    delhi: { latitude: 28.6139, longitude: 77.2090 },
    bengaluru: { latitude: 12.9716, longitude: 77.5946 },
    bangalore: { latitude: 12.9716, longitude: 77.5946 },
    hyderabad: { latitude: 17.3850, longitude: 78.4867 },
    kolkata: { latitude: 22.5726, longitude: 88.3639 },
    udaipur: { latitude: 24.5854, longitude: 73.7125 },
    kochi: { latitude: 9.9312, longitude: 76.2673 },
    cochin: { latitude: 9.9312, longitude: 76.2673 },
    munnar: { latitude: 10.0889, longitude: 77.0595 },
    ooty: { latitude: 11.4102, longitude: 76.6950 },
    kanyakumari: { latitude: 8.0883, longitude: 77.5385 },
    amritsar: { latitude: 31.6340, longitude: 74.8723 },
    rishikesh: { latitude: 30.0869, longitude: 78.2676 },
    darjeeling: { latitude: 27.0410, longitude: 88.2663 },
    mysore: { latitude: 12.2958, longitude: 76.6394 },
    mysuru: { latitude: 12.2958, longitude: 76.6394 },
    hampi: { latitude: 15.3350, longitude: 76.4600 },
    gokarna: { latitude: 14.5479, longitude: 74.3188 },
    mahabaleshwar: { latitude: 17.9237, longitude: 73.6586 },
    lonavala: { latitude: 18.7557, longitude: 73.4091 },
    alibaug: { latitude: 18.6414, longitude: 72.8722 },
    katraj: { latitude: 18.4529, longitude: 73.8552 },
    swargate: { latitude: 18.5018, longitude: 73.8636 },
    fcroad: { latitude: 18.5209, longitude: 73.8415 },
    kothrud: { latitude: 18.5074, longitude: 73.8077 },
    hinjewadi: { latitude: 18.5912, longitude: 73.7389 },
    wakad: { latitude: 18.5987, longitude: 73.7687 },
    vimannagar: { latitude: 18.5679, longitude: 73.9143 },
    nashik: { latitude: 19.9975, longitude: 73.7898 },
    aurangabad: { latitude: 19.8762, longitude: 75.3433 },
    kolhapur: { latitude: 16.7050, longitude: 74.2433 },
    nagpur: { latitude: 21.1458, longitude: 79.0882 },
    indore: { latitude: 22.7196, longitude: 75.8577 },
    ahmedabad: { latitude: 23.0225, longitude: 72.5714 },
    jodhpur: { latitude: 26.2389, longitude: 73.0243 },
    jaisalmer: { latitude: 26.9157, longitude: 70.9083 },
    coorg: { latitude: 12.4244, longitude: 75.7382 },
    kodaikanal: { latitude: 10.2381, longitude: 77.4892 },
    gangtok: { latitude: 27.3389, longitude: 88.6065 },
    shillong: { latitude: 25.5788, longitude: 91.8933 },
    leh: { latitude: 34.1526, longitude: 77.5771 },
    srinagar: { latitude: 34.0837, longitude: 74.7973 },
    nainital: { latitude: 29.3919, longitude: 79.4542 },
    mussoorie: { latitude: 30.4598, longitude: 78.0644 }
};
export function getDestinationCoordinates(destination: string) {
    if (!destination)
        return null;
    const slug = destination.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!slug)
        return null;
    if (slug in KNOWN_DESTINATION_COORDINATES) {
        return KNOWN_DESTINATION_COORDINATES[slug as keyof typeof KNOWN_DESTINATION_COORDINATES];
    }
    for (const [key, coords] of Object.entries(KNOWN_DESTINATION_COORDINATES)) {
        if (slug.includes(key) || (slug.length >= 4 && key.includes(slug))) {
            return coords;
        }
    }
    return null;
}
/**
 * Resolves coordinates for a destination or city name using the local dictionary first,
 * falling back to Open-Meteo's geocoding API when not in the static dictionary.
 */
export async function resolveDestinationCoordinates(destination: string): Promise<{
    latitude: number;
    longitude: number;
} | null> {
    const known = getDestinationCoordinates(destination);
    if (known) {
        return known;
    }
    const cleaned = (destination || "").trim();
    if (cleaned.length < 2) {
        return null;
    }
    try {
        const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
        url.searchParams.set("name", cleaned);
        url.searchParams.set("count", "1");
        url.searchParams.set("language", "en");
        url.searchParams.set("format", "json");
        const response = await fetch(url.toString(), {
            signal: AbortSignal.timeout(4000)
        });
        if (!response.ok) {
            return null;
        }
        const json: any = await response.json();
        const first = Array.isArray(json?.results) ? json.results[0] : null;
        if (first && isValidCoordinate(first.latitude, first.longitude)) {
            return {
                latitude: first.latitude,
                longitude: first.longitude
            };
        }
        return null;
    }
    catch {
        return null;
    }
}

