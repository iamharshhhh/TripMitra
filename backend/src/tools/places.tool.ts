import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export type PlacesInput = z.infer<typeof PlacesInputSchema>;

export interface OpeningHoursPeriod {
    open: {
        day: number;
        hour: number;
        minute: number;
    };
    close?: {
        day: number;
        hour: number;
        minute: number;
    };
}

export interface PlaceOpeningHours {
    openNow?: boolean;
    periods?: OpeningHoursPeriod[];
    weekdayDescriptions?: string[];
}

export interface NormalizedPlace {
    id: string;
    name: string;
    address: string;
    location?: {
        latitude: number;
        longitude: number;
    };
    types: string[];
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    regularOpeningHours?: PlaceOpeningHours;
    currentOpeningHours?: PlaceOpeningHours;
}

export interface PlacesToolOutput {
    places: NormalizedPlace[];
    source: "google-places";
}

export const PlacesInputSchema = z.object({
    query: z.string().min(1, "Search query is required"),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    radius: z.coerce.number().optional(),
    maxResults: z.coerce.number().min(1).max(20).default(5)
});
export class PlacesTool {
    name = "search_places";
    description = "Searches for real-time places, tourist spots, restaurants, parks, or points of interest using the Google Places API (New). Use this tool to discover specific places, verified addresses, user ratings, or when the user asks for recommendations near a specific location.";
    inputSchema = PlacesInputSchema;
    getDeclaration() {
        return {
            name: this.name,
            description: this.description,
            parametersJsonSchema: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Text search query for places, attractions, restaurants, or points of interest (e.g. 'historical places in Pune', 'restaurants near FC road')."
                    },
                    latitude: {
                        type: "number",
                        description: "Optional latitude coordinate to bias the search around."
                    },
                    longitude: {
                        type: "number",
                        description: "Optional longitude coordinate to bias the search around."
                    },
                    radius: {
                        type: "number",
                        description: "Optional search radius in meters (e.g. 5000)."
                    },
                    maxResults: {
                        type: "number",
                        description: "Maximum number of places to return (default 5, max 20)."
                    }
                },
                required: ["query"]
            }
        };
    }
    async execute(rawInput: unknown) {
        const startTime = Date.now();
        // 1. Validate input schema
        const parseResult = this.inputSchema.safeParse(rawInput ?? {});
        if (!parseResult.success) {
            const errorMsg = parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
            logger.warn({ tool: this.name, error: errorMsg }, "Invalid places tool input");
            return {
                success: false,
                error: `Invalid input parameters: ${errorMsg}`,
                source: "google-places",
                executionTimeMs: Date.now() - startTime
            };
        }
        const { query, latitude, longitude, radius, maxResults } = parseResult.data;
        // 2. Check API Key availability
        const apiKey = env.GOOGLE_PLACES_API_KEY;
        if (!apiKey || apiKey.trim() === "") {
            logger.warn({ tool: this.name }, "GOOGLE_PLACES_API_KEY is not configured");
            return {
                success: false,
                error: "Google Places API key is not configured.",
                source: "google-places",
                executionTimeMs: Date.now() - startTime
            };
        }
        try {
            const endpoint = "https://places.googleapis.com/v1/places:searchText";
            const requestBody: Record<string, any> = {
                textQuery: query,
                maxResultCount: maxResults
            };
            if (typeof latitude === "number" && typeof longitude === "number") {
                requestBody.locationBias = {
                    circle: {
                        center: { latitude, longitude },
                        radius: radius ?? 10000.0
                    }
                };
            }
            logger.debug({ tool: this.name, query, maxResults }, "Calling Google Places API (New)");
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": apiKey,
                    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.currentOpeningHours"
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(env.GOOGLE_PLACES_TIMEOUT_MS || 10000)
            });
            if (!response.ok) {
                let errorMessage = `Google Places API error (${response.status}: ${response.statusText || response.status})`;
                let isQuotaError = response.status === 429;
                try {
                    const errJson: any = await response.json();
                    if (errJson.error?.message) {
                        errorMessage = `Google Places API error (${response.status}: ${response.statusText || response.status}) - ${errJson.error.message}`;
                        if (errJson.error.message.toLowerCase().includes("quota")) {
                            isQuotaError = true;
                        }
                    }
                }
                catch {
                    // fallback to standard status message if JSON parsing fails
                }
                // Fallback to places:searchNearby if searchText hits quota limit and coordinates are available
                if (isQuotaError && typeof latitude === "number" && typeof longitude === "number") {
                    logger.warn({ tool: this.name, query, latitude, longitude }, "searchText quota exceeded; attempting resilient searchNearby fallback");
                    const qLower = query.toLowerCase();
                    let includedTypes = ["restaurant", "cafe", "fast_food_restaurant"];
                    if (qLower.includes("hotel") || qLower.includes("stay") || qLower.includes("lodging") || qLower.includes("resort")) {
                        includedTypes = ["hotel", "lodging", "resort_hotel"];
                    }
                    else if (qLower.includes("attraction") || qLower.includes("tourist") || qLower.includes("park") || qLower.includes("temple") || qLower.includes("museum") || qLower.includes("fort")) {
                        includedTypes = ["tourist_attraction", "historical_landmark", "museum", "park", "hindu_temple", "place_of_worship"];
                    }
                    else if (qLower.includes("street food") || qLower.includes("chaat") || qLower.includes("dhaba") || qLower.includes("misal")) {
                        includedTypes = ["fast_food_restaurant", "restaurant", "cafe"];
                    }
                    const nearbyResponse = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Goog-Api-Key": apiKey,
                            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.currentOpeningHours"
                        },
                        body: JSON.stringify({
                            includedTypes,
                            maxResultCount: maxResults,
                            locationRestriction: {
                                circle: {
                                    center: { latitude, longitude },
                                    radius: radius ?? 2500.0
                                }
                            }
                        }),
                        signal: AbortSignal.timeout(env.GOOGLE_PLACES_TIMEOUT_MS || 10000)
                    });
                    if (nearbyResponse.ok) {
                        const nearbyJson: any = await nearbyResponse.json();
                        const rawPlaces = Array.isArray(nearbyJson.places) ? nearbyJson.places : [];
                        const places = rawPlaces.map((p: any) => ({
                            id: p.id ?? "",
                            name: p.displayName?.text ?? "Unknown Place",
                            address: p.formattedAddress ?? "",
                            location: p.location && typeof p.location.latitude === "number" && typeof p.location.longitude === "number"
                                ? {
                                    latitude: p.location.latitude,
                                    longitude: p.location.longitude
                                }
                                : undefined,
                            types: Array.isArray(p.types) ? p.types : [],
                            rating: p.rating,
                            userRatingCount: p.userRatingCount,
                            priceLevel: p.priceLevel,
                            regularOpeningHours: p.regularOpeningHours,
                            currentOpeningHours: p.currentOpeningHours
                        }));
                        logger.info({ tool: this.name, placesCount: places.length, durationMs: Date.now() - startTime, fallback: "searchNearby" }, "Google Places searchNearby fallback retrieved successfully");
                        return {
                            success: true,
                            data: {
                                places,
                                source: "google-places"
                            },
                            source: "google-places",
                            executionTimeMs: Date.now() - startTime
                        };
                    }
                    else {
                        let nearbyErrText = "";
                        try {
                            nearbyErrText = await nearbyResponse.text();
                        }
                        catch {
                            // ignore
                        }
                        logger.warn({ tool: this.name, status: nearbyResponse.status, error: nearbyErrText }, "Google Places searchNearby fallback also returned error");
                    }
                }
                logger.error({ tool: this.name, status: response.status, error: errorMessage }, "Google Places API returned error status");
                return {
                    success: false,
                    error: errorMessage,
                    source: "google-places",
                    executionTimeMs: Date.now() - startTime
                };
            }
            const json: any = await response.json();
            const rawPlaces = Array.isArray(json.places) ? json.places : [];
            const places = rawPlaces.map((p: any) => ({
                id: p.id ?? "",
                name: p.displayName?.text ?? "Unknown Place",
                address: p.formattedAddress ?? "",
                location: p.location && typeof p.location.latitude === "number" && typeof p.location.longitude === "number"
                    ? {
                        latitude: p.location.latitude,
                        longitude: p.location.longitude
                    }
                    : undefined,
                types: Array.isArray(p.types) ? p.types : [],
                rating: p.rating,
                userRatingCount: p.userRatingCount,
                priceLevel: p.priceLevel,
                regularOpeningHours: p.regularOpeningHours,
                currentOpeningHours: p.currentOpeningHours
            }));
            logger.info({ tool: this.name, placesCount: places.length, durationMs: Date.now() - startTime }, "Google Places retrieved successfully");
            return {
                success: true,
                data: {
                    places,
                    source: "google-places"
                },
                source: "google-places",
                executionTimeMs: Date.now() - startTime
            };
        }
        catch (err) {
            const durationMs = Date.now() - startTime;
            const message = err instanceof Error ? err.message : String(err);
            const isTimeout = message.toLowerCase().includes("timeout") ||
                message.toLowerCase().includes("abort") ||
                (typeof err === "object" && err !== null && (err.name === "TimeoutError" || err.name === "AbortError"));
            logger.error({ tool: this.name, err: message, isTimeout, durationMs }, "Places tool execution failed");
            return {
                success: false,
                error: isTimeout ? "Google Places request timed out." : "Unable to search places at this time.",
                source: "google-places",
                executionTimeMs: durationMs
            };
        }
    }
}
