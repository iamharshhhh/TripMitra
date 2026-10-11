import { PlaceDiscoveryService } from "./place-discovery.service.js";
import { CandidateRankingService } from "./candidate-ranking.service.js";
import { DailySchedulerService } from "./daily-scheduler.service.js";
import { ItineraryEnrichmentService } from "./itinerary-enrichment.service.js";
import { ItineraryPersistenceService } from "./itinerary-persistence.service.js";
import { ItineraryPresenterService } from "./itinerary-presenter.service.js";
import { logger } from "../../utils/logger.js";
import { AppError } from "../../utils/errors.js";
import { SemanticItineraryPlannerService } from "./semantic-itinerary-planner.service.js";
import { StructuredTripRequirements } from "../../types/trip-requirements.types.js";
import { PersistedItinerarySnapshot } from "./itinerary-persistence.types.js";
import { SupportedLanguage } from "../language/language-detector.service.js";

export interface GenerateItineraryParams {
    userId: string;
    tripId?: string;
    conversationId?: string;
    requirements: StructuredTripRequirements;
    referenceDate?: Date;
    language?: SupportedLanguage;
}

export interface GeneratedItineraryResult {
    tripId: string;
    itineraryVersion: number;
    snapshot: PersistedItinerarySnapshot;
    formattedMessages: string[];
}

export class ItineraryGeneratorService {
    discoveryService;
    rankingService;
    schedulerService;
    enrichmentService;
    persistenceService;
    semanticPlanner;
    constructor(discoveryService?: PlaceDiscoveryService, rankingService?: CandidateRankingService, schedulerService?: DailySchedulerService, enrichmentService?: ItineraryEnrichmentService, persistenceService?: ItineraryPersistenceService, semanticPlanner?: SemanticItineraryPlannerService) {
        this.discoveryService = discoveryService ?? new PlaceDiscoveryService();
        this.rankingService = rankingService ?? new CandidateRankingService();
        this.schedulerService = schedulerService ?? new DailySchedulerService();
        this.enrichmentService = enrichmentService ?? new ItineraryEnrichmentService();
        this.persistenceService = persistenceService ?? new ItineraryPersistenceService();
        this.semanticPlanner = semanticPlanner ?? new SemanticItineraryPlannerService();
    }
    /**
     * Orchestrates the complete forward itinerary pipeline:
     * 1. Candidate Discovery (M8.2)
     * 2. Hard-Constraint Filtering & Preference Scoring (M8.3)
     * 3. Geographic Grouping & Daily Scheduling (M8.4)
     * 4. Weather & Authoritative Budget Enrichment (M8.5)
     * 5. Durable Atomic Persistence & Versioning (M8.6)
     * 6. Scannable WhatsApp-Formatted Presentation (M8.7)
     */
    async generateItinerary(params: GenerateItineraryParams) {
        const { userId, tripId, conversationId, requirements, referenceDate } = params;
        logger.info({
            userId,
            tripId,
            destination: requirements.destination,
            durationDays: requirements.durationDays
        }, "ItineraryGeneratorService starting forward itinerary pipeline");
        // 1. M8.2: Discover Candidates (Hybrid RAG + Google Places with spatial deduplication)
        const discoveredCandidates = await this.discoveryService.discoverCandidates(requirements);
        if (discoveredCandidates.length === 0) {
            throw new AppError(`No candidate places could be discovered for destination: ${requirements.destination}`, 422, "NO_CANDIDATE_PLACES");
        }
        // 2. M8.3: Hard-Constraint Filtering + Preference Scoring (Frozen engine evaluated on trip requirements)
        const rankingResult = this.rankingService.rankCandidates(requirements, discoveredCandidates);
        const rankedCandidates = rankingResult.rankedCandidates.map((r) => r.candidate);
        if (rankedCandidates.length === 0) {
            throw new AppError("All candidate places were rejected by trip hard constraints (e.g. walking, accessibility, dietary)", 422, "ALL_CANDIDATES_FILTERED");
        }
        // 3. M8.4: Geographic Clustering & Daily Time-Window Scheduling
        const dayWeatherSummaries = await this.enrichmentService.getPreSchedulingWeather(requirements, referenceDate);
        let semanticPlan;
        try {
            const plan = await this.semanticPlanner.planDailyActivities(requirements, rankedCandidates, dayWeatherSummaries);
            if (plan) {
                semanticPlan = plan;
            }
        }
        catch (plannerErr) {
            logger.warn({ err: plannerErr }, "Semantic planner failed; using deterministic fallback");
        }
        const schedulingResult = this.schedulerService.scheduleItinerary(requirements, rankedCandidates, { referenceDate, dayWeatherSummaries, semanticPlan });
        // 4. M8.5: Weather & Authoritative Budget Enrichment
        const enrichedResult = await this.enrichmentService.enrichItinerary(requirements, schedulingResult, referenceDate);
        // 5. M8.6: Durable Atomic Persistence
        const persistResult = await this.persistenceService.persistItinerary({
            tripId,
            userId,
            conversationId
        }, requirements, enrichedResult);
        // 6. M8.7: WhatsApp Presentation Formatting
        const formattedMessages = ItineraryPresenterService.presentItinerary(persistResult.snapshot, undefined, params.language || "en");
        logger.info({
            tripId: persistResult.tripId,
            itineraryVersion: persistResult.itineraryVersion,
            totalDays: persistResult.snapshot.days.length,
            totalPlaces: persistResult.snapshot.generationMetadata.totalPlaces
        }, "ItineraryGeneratorService completed forward generation successfully");
        return {
            tripId: persistResult.tripId,
            itineraryVersion: persistResult.itineraryVersion,
            snapshot: persistResult.snapshot,
            formattedMessages
        };
    }
}
