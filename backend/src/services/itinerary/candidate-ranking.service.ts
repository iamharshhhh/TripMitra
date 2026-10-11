import { PlaceFilterService } from "./place-filter.service.js";
import { PlaceScoringService, DEFAULT_SCORING_CONFIG } from "./place-scoring.service.js";
import { logger } from "../../utils/logger.js";
import { CandidatePlace } from "../../types/candidate-place.types.js";
import { StructuredTripRequirements, PartialTripRequirements } from "../../types/trip-requirements.types.js";
import { PlaceScoringConfig } from "./place-filter.types.js";
import { IUserPreference } from "../../models/UserPreference.js";

export class CandidateRankingService {
    filterService;
    scoringService;
    constructor(filterService?: PlaceFilterService, scoringService?: PlaceScoringService, scoringConfig?: Partial<PlaceScoringConfig>) {
        this.filterService = filterService ?? new PlaceFilterService();
        this.scoringService =
            scoringService ?? new PlaceScoringService(scoringConfig);
    }
    /**
     * Filters, scores, and deterministically ranks candidate places against trip requirements.
     */
    rankCandidates(requirements: StructuredTripRequirements | PartialTripRequirements, candidates: CandidatePlace[], userPreferences?: Partial<IUserPreference> | null, overridePersonalizationWeight?: number) {
        const startTime = Date.now();
        // 1. Hard-Constraint Filtering
        const filterResult = this.filterService.filterCandidates(requirements, candidates);
        // 2. Multi-Criteria Preference Scoring
        const scoredList = this.scoringService.scoreCandidates(requirements, filterResult.accepted, userPreferences, overridePersonalizationWeight);
        // 3. Deterministic Tie-Breaking and Sorting
        const rankedCandidates = [...scoredList].sort((a, b) => this.compareCandidates(a, b));
        logger.info({
            total: candidates.length,
            accepted: rankedCandidates.length,
            rejected: filterResult.rejected.length,
            topScore: rankedCandidates[0]?.finalScore,
            durationMs: Date.now() - startTime
        }, "Candidate ranking completed");
        return {
            rankedCandidates,
            rejectedCandidates: filterResult.rejected,
            filterResult,
            scoringConfig: DEFAULT_SCORING_CONFIG
        };
    }
    /**
     * Deterministic comparison for sorting scored candidates.
     * Priority:
     * 1. Final score (descending)
     * 2. Rating (descending)
     * 3. User rating count (descending)
     * 4. PlaceId / Name (ascending alphabetical)
     */
    compareCandidates(a: any, b: any) {
        // 1. Primary: Final Score
        if (b.finalScore !== a.finalScore) {
            return b.finalScore - a.finalScore;
        }
        // 2. Secondary: Rating
        const ratingA = a.candidate.rating ?? -1;
        const ratingB = b.candidate.rating ?? -1;
        if (ratingB !== ratingA) {
            return ratingB - ratingA;
        }
        // 3. Tertiary: Review Count
        const countA = a.candidate.userRatingCount ?? -1;
        const countB = b.candidate.userRatingCount ?? -1;
        if (countB !== countA) {
            return countB - countA;
        }
        // 4. Stable tie-break: placeId or name
        const idA = a.candidate.placeId || a.candidate.name;
        const idB = b.candidate.placeId || b.candidate.name;
        return idA.localeCompare(idB);
    }
}
