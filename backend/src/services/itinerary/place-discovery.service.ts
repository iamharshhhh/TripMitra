import { normalizeDestinationSlug } from "../../types/trip-requirements.types.js";
import { RagRetrievalService } from "../../rag/retrieval.service.js";
import { getDefaultToolRegistry } from "../../tools/tool.registry.js";
import { normalizeGooglePlaceCandidate, normalizeRagCandidate } from "./place-normalizer.js";
import { deduplicateCandidates } from "./place-deduplicator.js";
import { logger } from "../../utils/logger.js";
import { PlaceDiscoveryOptions } from "../../types/candidate-place.types.js";
import { StructuredTripRequirements, PartialTripRequirements } from "../../types/trip-requirements.types.js";
import { ToolRegistry } from "../../tools/tool.registry.js";

export const DEFAULT_DISCOVERY_LIMITS = {
    maxRagCandidates: 10,
    maxGooglePlacesCandidates: 10,
    maxFinalCandidates: 15,
    maxGoogleQueries: 3,
    dedupDistanceMeters: 800
};
export class PlaceDiscoveryService {
    ragRetrievalService;
    toolRegistry;
    constructor(ragRetrievalService?: RagRetrievalService, toolRegistry?: ToolRegistry) {
        this.ragRetrievalService = ragRetrievalService ?? new RagRetrievalService();
        this.toolRegistry = toolRegistry ?? getDefaultToolRegistry();
    }
    /**
     * Builds targeted Google Places queries driven by user requirements and destination.
     * Capped to maxGoogleQueries to protect API quota.
     */
    buildGooglePlacesQueries(destination: any, requirements: any, maxQueries: any) {
        const queries = [];
        // 1. Primary destination attractions query
        queries.push(`${destination} top tourist attractions places to visit`);
        // 2. Interest-driven queries (e.g. history, food, nature)
        const interests: string[] = requirements.interests || [];
        const hasNightlife = interests.some((i: string) => {
            const clean = (i || "").trim().toLowerCase();
            return clean === "nightlife_entertainment" || clean.includes("nightlife");
        });
        const nightlifeQuery = `${destination} popular nightlife lounges pubs clubs`;
        const nonNightlifeCap = hasNightlife ? Math.max(1, maxQueries - 1) : maxQueries;
        for (const interest of interests) {
            if (queries.length >= maxQueries)
                break;
            const clean = (interest || "").trim();
            if (clean.length > 0) {
                if (clean === "nightlife_entertainment" || clean.toLowerCase().includes("nightlife")) {
                    if (!queries.includes(nightlifeQuery)) {
                        queries.push(nightlifeQuery);
                    }
                }
                else if (queries.length < nonNightlifeCap || queries.includes(nightlifeQuery)) {
                    queries.push(`${destination} ${clean} places`);
                }
            }
        }
        if (hasNightlife && !queries.includes(nightlifeQuery) && queries.length < maxQueries) {
            queries.push(nightlifeQuery);
        }
        // 3. Food preferences if specified and query budget allows
        const foodPrefs = requirements.foodPreferences || [];
        for (const food of foodPrefs) {
            if (queries.length >= maxQueries)
                break;
            const clean = food.trim();
            if (clean.length > 0) {
                queries.push(`${destination} authentic ${clean} restaurants`);
            }
        }
        // 4. Multi-day supplemental queries to ensure broad attraction coverage
        if (queries.length < maxQueries) {
            queries.push(`${destination} famous landmarks places to visit`);
        }
        if (queries.length < maxQueries) {
            queries.push(`${destination} sightseeing spots attractions`);
        }
        return queries.slice(0, maxQueries);
    }
    /**
     * Builds RAG discovery queries driven by destination and requirements.
     * Discovers interest-matched places as primary priority, supplemented with iconic destination landmarks.
     */
    buildRagQueries(destination: any, requirements: any) {
        const interests = requirements.interests || [];
        const queries = [];
        if (interests.length > 0) {
            const hasNightlife = interests.some((i: string) => i.toLowerCase().includes("nightlife"));
            if (hasNightlife) {
                queries.push(`${destination} popular nightlife lounges pubs entertainment`);
            }
            queries.push(`${destination} ${interests.join(" ")} tourist attractions and heritage`);
            queries.push(`${destination} top tourist attractions famous landmarks places to visit`);
        }
        else {
            queries.push(`${destination} top tourist attractions places to visit`);
            queries.push(`${destination} famous landmarks sightseeing spots`);
        }
        return queries;
    }
    /**
     * Discovers candidate places from both RAG knowledge base and Google Places API,
     * normalizes them into CandidatePlace[], and deduplicates them deterministically.
     */
    async discoverCandidates(requirements: StructuredTripRequirements | PartialTripRequirements, options?: PlaceDiscoveryOptions) {
        const startTime = Date.now();
        const destination = requirements.destination?.trim();
        if (!destination) {
            logger.warn("Place discovery called without a destination");
            return [];
        }
        const destinationSlug = requirements.destinationSlug || normalizeDestinationSlug(destination);
        // Dynamic candidate scaling: safely scaled by trip duration to ensure sufficient candidates across multi-day trips
        const durationDays = requirements.durationDays || 1;
        const dynamicGooglePlacesLimit = Math.min(32, Math.max(14, durationDays * 8));
        const dynamicFinalLimit = Math.min(35, Math.max(DEFAULT_DISCOVERY_LIMITS.maxFinalCandidates, durationDays * 8));
        const limits = {
            ...DEFAULT_DISCOVERY_LIMITS,
            maxGooglePlacesCandidates: dynamicGooglePlacesLimit,
            maxFinalCandidates: dynamicFinalLimit,
            maxGoogleQueries: Math.min(5, Math.max(3, Math.ceil(durationDays * 1.2))),
            ...(options?.limits || {})
        };
        logger.info({ destination, destinationSlug, interests: requirements.interests }, "Starting place discovery");
        const ragCandidates = [];
        const googleCandidates = [];
        // -------------------------------------------------------------
        // 1. RAG Discovery
        // -------------------------------------------------------------
        if (!options?.skipRag) {
            try {
                const ragQueries = this.buildRagQueries(destination, requirements);
                for (const query of ragQueries) {
                    if (ragCandidates.length >= limits.maxRagCandidates)
                        break;
                    logger.debug({ query, destinationSlug }, "Querying RAG for candidate places");
                    const chunks = await this.ragRetrievalService.retrieveRelevantChunks({
                        query,
                        destinationSlug,
                        limit: limits.maxRagCandidates
                    });
                    for (const chunk of chunks) {
                        const candidate = normalizeRagCandidate(chunk, destinationSlug, query);
                        if (candidate) {
                            ragCandidates.push(candidate);
                        }
                        if (ragCandidates.length >= limits.maxRagCandidates)
                            break;
                    }
                }
                logger.info({ count: ragCandidates.length, destinationSlug }, "RAG candidate places discovered");
            }
            catch (err) {
                logger.warn({ err: err instanceof Error ? err.message : String(err), destinationSlug }, "RAG discovery encountered an error; continuing with other sources");
            }
        }
        // -------------------------------------------------------------
        // 2. Google Places Discovery
        // -------------------------------------------------------------
        if (!options?.skipGooglePlaces) {
            try {
                const googleQueries = this.buildGooglePlacesQueries(destination, requirements, limits.maxGoogleQueries);
                for (const query of googleQueries) {
                    if (googleCandidates.length >= limits.maxGooglePlacesCandidates)
                        break;
                    const remaining = limits.maxGooglePlacesCandidates - googleCandidates.length;
                    const queryShare = Math.ceil(limits.maxGooglePlacesCandidates / Math.max(1, googleQueries.length));
                    const maxResults = Math.min(Math.max(remaining, 1), Math.max(5, Math.min(8, queryShare)));
                    logger.debug({ query, maxResults }, "Querying Google Places tool for candidates");
                    const result = await this.toolRegistry.execute("search_places", {
                        query,
                        maxResults
                    });
                    if (result && result.success && result.data) {
                        const placesOutput = result.data;
                        const places = placesOutput.places || [];
                        for (const place of places) {
                            const candidate = normalizeGooglePlaceCandidate(place, destinationSlug, query);
                            googleCandidates.push(candidate);
                            if (googleCandidates.length >= limits.maxGooglePlacesCandidates)
                                break;
                        }
                    }
                    else {
                        logger.warn({ query, error: result?.error }, "Google Places search returned error or empty result");
                    }
                }
                logger.info({ count: googleCandidates.length, destinationSlug }, "Google Places candidates discovered");
            }
            catch (err) {
                logger.warn({ err: err instanceof Error ? err.message : String(err), destinationSlug }, "Google Places discovery encountered an error; continuing with other sources");
            }
        }
        const candidatePool = [...googleCandidates, ...ragCandidates];
        if (candidatePool.length === 0) {
            logger.warn({ destinationSlug }, "No candidate places found from any source");
            return [];
        }
        // -------------------------------------------------------------
        // 3. Deduplication & Information Merging
        // -------------------------------------------------------------
        const deduplicated = deduplicateCandidates(candidatePool, limits.dedupDistanceMeters);
        const finalCandidates = deduplicated.slice(0, limits.maxFinalCandidates);
        logger.info({
            destinationSlug,
            totalRaw: candidatePool.length,
            deduplicated: deduplicated.length,
            finalCount: finalCandidates.length,
            durationMs: Date.now() - startTime
        }, "Place discovery completed successfully");
        return finalCandidates;
    }
}
