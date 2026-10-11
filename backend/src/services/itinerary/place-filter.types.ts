import { CandidatePlace } from "../../types/candidate-place.types.js";
export type FilterRejectionReason = "accessibility_requirement_not_met" | "walking_requirement_not_met" | "food_preference_conflict" | "destination_mismatch" | "explicit_requirement_not_supported";
export interface FilteredCandidate {
    candidate: CandidatePlace;
    accepted: boolean;
    rejectionReason?: FilterRejectionReason;
    rejectionDetails?: {
        field: string;
        required: unknown;
        actual: unknown;
    };
}
export interface PlaceFilterResult {
    accepted: CandidatePlace[];
    rejected: FilteredCandidate[];
    totalEvaluated: number;
}
export interface CriterionScore {
    score: number;
    weight: number;
    available: boolean;
    rawScore?: number;
}
export interface PlaceScoreBreakdown {
    interest: CriterionScore;
    rating: CriterionScore;
    popularity: CriterionScore;
    budget: CriterionScore;
    walking: CriterionScore;
    family: CriterionScore;
    personalization?: CriterionScore;
    finalScore: number;
}
export interface ScoredCandidate {
    candidate: CandidatePlace;
    finalScore: number;
    scoreBreakdown: PlaceScoreBreakdown;
    personalizationAttribution?: string;
}
export interface PlaceScoringWeights {
    interest: number;
    rating: number;
    popularity: number;
    budget: number;
    walking: number;
    family: number;
    personalization?: number;
}
export interface PlaceScoringConfig {
    weights: PlaceScoringWeights;
    maxReviewBenchmark: number;
    personalizationWeight?: number;
}
export interface CandidateRankingResult {
    rankedCandidates: ScoredCandidate[];
    rejectedCandidates: FilteredCandidate[];
    filterResult: PlaceFilterResult;
    scoringConfig: PlaceScoringConfig;
}
