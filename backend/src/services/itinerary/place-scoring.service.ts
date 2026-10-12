import { CandidatePlace } from "../../types/candidate-place.types.js";
import { StructuredTripRequirements, PartialTripRequirements } from "../../types/trip-requirements.types.js";
import { PlaceScoringConfig } from "./place-filter.types.js";
import { IUserPreference } from "../../models/UserPreference.js";
export const DEFAULT_SCORING_WEIGHTS = {
    interest: 0.35,
    rating: 0.20,
    popularity: 0.15,
    budget: 0.10,
    walking: 0.10,
    family: 0.10
};
export const DEFAULT_SCORING_CONFIG = {
    weights: DEFAULT_SCORING_WEIGHTS,
    maxReviewBenchmark: 10000,
    personalizationWeight: 0.00
};
/**
 * Maps category names and keywords to semantic groups for deterministic interest matching.
 */
const CATEGORY_INTEREST_MAP = {
    heritage: ["history", "heritage", "monument", "fort", "palace", "temple", "museum", "historical", "architecture", "culture", "religious", "spiritual", "art", "photography", "photos"],
    nature: ["nature", "park", "garden", "wildlife", "lake", "hills", "trekking", "scenic", "greenery", "beach", "beaches", "coastal", "water", "sea", "photography", "photos"],
    restaurant: ["food", "dining", "cuisine", "restaurant", "cafe", "cafes", "street food", "local food", "culinary", "drinks", "nightlife", "nightlife_entertainment", "bar", "pub", "lounge"],
    shopping: ["shopping", "market", "markets", "bazaar", "mall", "handicrafts", "clothes", "souvenirs", "night market"],
    activity: ["activity", "adventure", "trekking", "sports", "entertainment", "amusement", "water park", "nightlife", "nightlife_entertainment", "bar", "pub", "lounge", "club", "photography", "photos"],
    attraction: ["sightseeing", "attractions", "tourist", "landmarks", "explore", "beach", "beaches", "monument", "photography", "photos"]
};
export class PlaceScoringService {
    config;
    constructor(config?: Partial<PlaceScoringConfig>) {
        this.config = this.validateAndNormalizeConfig(config);
    }
    /**
     * Validates and normalizes scoring configuration.
     */
    validateAndNormalizeConfig(custom: any) {
        const rawWeights = custom?.weights ?? DEFAULT_SCORING_WEIGHTS;
        // Check for negative weights
        for (const [key, val] of Object.entries(rawWeights)) {
            if (typeof val !== "number" || isNaN(val) || val < 0) {
                throw new Error(`Invalid scoring weight for ${key}: must be a non-negative number`);
            }
        }
        const totalWeight = rawWeights.interest +
            rawWeights.rating +
            rawWeights.popularity +
            rawWeights.budget +
            rawWeights.walking +
            rawWeights.family;
        if (totalWeight <= 0) {
            throw new Error("Total scoring weight must be greater than zero");
        }
        const benchmark = custom?.maxReviewBenchmark && custom.maxReviewBenchmark > 0
            ? custom.maxReviewBenchmark
            : DEFAULT_SCORING_CONFIG.maxReviewBenchmark;
        const pWeight = custom?.personalizationWeight !== undefined ? Math.max(0, Math.min(0.25, custom.personalizationWeight)) : 0.00;
        return {
            weights: { ...rawWeights },
            maxReviewBenchmark: benchmark,
            personalizationWeight: pWeight
        };
    }
    /**
     * Scores a single candidate place across all criteria using dynamic weight renormalization.
     * Unknown criteria are omitted from denominator and never punished as zero.
     */
    scoreCandidate(requirements: StructuredTripRequirements | PartialTripRequirements, candidate: CandidatePlace, userPreferences?: Partial<IUserPreference> | null, overridePersonalizationWeight?: number) {
        const pWeight = overridePersonalizationWeight !== undefined
            ? Math.max(0, Math.min(0.25, overridePersonalizationWeight))
            : (this.config.personalizationWeight || 0.00);
        const hasActivePreferences = !!(userPreferences && ((userPreferences.activityInterests && userPreferences.activityInterests.length > 0) ||
            userPreferences.budgetTier ||
            typeof userPreferences.maxDailyWalkingMeters === "number" ||
            (userPreferences.dietaryPreferences && userPreferences.dietaryPreferences.length > 0) ||
            userPreferences.preferredPacing));
        const effectivePWeight = (hasActivePreferences && pWeight > 0) ? pWeight : 0;
        const baseScale = 1.0 - effectivePWeight;
        const weights = {
            interest: this.config.weights.interest * baseScale,
            rating: this.config.weights.rating * baseScale,
            popularity: this.config.weights.popularity * baseScale,
            budget: this.config.weights.budget * baseScale,
            walking: this.config.weights.walking * baseScale,
            family: this.config.weights.family * baseScale,
            personalization: effectivePWeight
        };
        // 1. Interest Match Criterion
        const interest = this.calculateInterestScore(requirements, candidate, weights.interest);
        // 2. Rating Criterion
        const rating = this.calculateRatingScore(candidate, weights.rating);
        // 3. Popularity Criterion (Bounded logarithmic review count)
        const popularity = this.calculatePopularityScore(candidate, weights.popularity);
        // 4. Budget Fit Criterion
        const budget = this.calculateBudgetScore(requirements, candidate, weights.budget);
        // 5. Walking Fit Criterion
        const walking = this.calculateWalkingScore(requirements, candidate, weights.walking);
        // 6. Family / Traveler Fit Criterion
        const family = this.calculateFamilyScore(requirements, candidate, weights.family);
        // 7. Personalization Criterion (Phase 9.3)
        const personalization = this.calculatePersonalizationScore(userPreferences, candidate, weights.personalization);
        const breakdown = {
            interest,
            rating,
            popularity,
            budget,
            walking,
            family,
            personalization,
            finalScore: 0
        };
        // Calculate dynamic weighted average over AVAILABLE criteria only
        const allCriteria = [interest, rating, popularity, budget, walking, family];
        if (personalization.available) {
            allCriteria.push(personalization);
        }
        const availableCriteria = allCriteria.filter((c) => c.available);
        let finalScore = 0.5; // Neutral baseline if all criteria are unknown
        if (availableCriteria.length > 0) {
            const sumWeightedScores = availableCriteria.reduce((acc, c) => acc + c.score * c.weight, 0);
            const sumAvailableWeights = availableCriteria.reduce((acc, c) => acc + c.weight, 0);
            finalScore = sumAvailableWeights > 0 ? sumWeightedScores / sumAvailableWeights : 0.5;
        }
        // Clamp and round to 4 decimal places for deterministic precision
        const clampedScore = Math.max(0, Math.min(1, Math.round(finalScore * 10000) / 10000));
        breakdown.finalScore = clampedScore;
        let personalizationAttribution;
        if (personalization.available && effectivePWeight > 0) {
            const matchedAspects = [];
            if (userPreferences?.activityInterests?.length)
                matchedAspects.push(`interests: ${userPreferences.activityInterests.join(", ")}`);
            if (userPreferences?.budgetTier)
                matchedAspects.push(`budget: ${userPreferences.budgetTier}`);
            if (userPreferences?.maxDailyWalkingMeters)
                matchedAspects.push(`max walk: ${userPreferences.maxDailyWalkingMeters}m`);
            personalizationAttribution = `Personalized (+${Math.round(effectivePWeight * 100)}% weight) based on confirmed preferences (${matchedAspects.join("; ")})`;
        }
        return {
            candidate,
            finalScore: clampedScore,
            scoreBreakdown: breakdown,
            personalizationAttribution
        };
    }
    /**
     * Scores a list of candidates.
     */
    scoreCandidates(requirements: StructuredTripRequirements | PartialTripRequirements, candidates: CandidatePlace[], userPreferences?: Partial<IUserPreference> | null, overridePersonalizationWeight?: number) {
        return candidates.map((candidate) => this.scoreCandidate(requirements, candidate, userPreferences, overridePersonalizationWeight));
    }
    // -------------------------------------------------------------
    // CRITERION EVALUATION METHODS
    // -------------------------------------------------------------
    /**
     * Evaluates interest match against place category, Google types, and description.
     */
    calculateInterestScore(requirements: any, candidate: any, weight: any) {
        const userInterests = (requirements.interests || [])
            .map((i) => i.toLowerCase().trim())
            .filter(Boolean);
        if (userInterests.length === 0) {
            return { score: 0, weight, available: false };
        }
        const placeCategory = candidate.category.toLowerCase();
        const relatedKeywords = CATEGORY_INTEREST_MAP[placeCategory] || [];
        const googleTypes = (candidate.provenance.googleDetails?.types || []).map((t) => t.toLowerCase().replace(/_/g, " "));
        const descText = (candidate.description || "").toLowerCase();
        let matchedInterests = 0;
        for (const interest of userInterests) {
            const isNightlife = interest === "nightlife_entertainment" || interest.includes("nightlife");
            const interestTokens = isNightlife
                ? ["nightlife", "nightlife_entertainment", "night life", "club", "bar", "pub", "lounge", "entertainment"]
                : [interest];

            // 1. Direct match with category or mapped category keywords, or night suitability
            if (placeCategory === interest ||
                (isNightlife && candidate.timeOfDaySuitability === "night") ||
                relatedKeywords.some((kw) => interestTokens.some((it) => kw.includes(it) || it.includes(kw)))) {
                matchedInterests += 1.0;
                continue;
            }
            // 2. Match with Google place types
            if (googleTypes.some((gt) => interestTokens.some((it) => gt.includes(it) || it.includes(gt)))) {
                matchedInterests += 0.8;
                continue;
            }
            // 3. Match in description
            if (interestTokens.some((it) => descText.includes(it))) {
                matchedInterests += 0.5;
                continue;
            }
        }
        // Interest-matched places remain primary priority (1.0 or 0.8).
        // Iconic landmarks supplement with a modest baseline (0.25) so they are not dropped to 0.
        const interestMatchScore = matchedInterests / userInterests.length;
        const iconicBaseline = candidate.isIconicLandmark ? 0.25 : 0;
        const rawScore = Math.min(1.0, Math.max(interestMatchScore, iconicBaseline));
        return {
            score: Math.max(0, Math.min(1, rawScore)),
            weight,
            available: true,
            rawScore
        };
    }
    /**
     * Evaluates Google Places rating normalized to [0, 1].
     */
    calculateRatingScore(candidate: any, weight: any) {
        if (typeof candidate.rating !== "number" || isNaN(candidate.rating)) {
            return { score: 0, weight, available: false };
        }
        // Clamp 0.0 to 5.0 -> 0.0 to 1.0
        const normalized = Math.max(0, Math.min(1, candidate.rating / 5.0));
        return {
            score: normalized,
            weight,
            available: true,
            rawScore: candidate.rating
        };
    }
    /**
     * Evaluates popularity using bounded logarithmic review count.
     * Formula: log10(userRatingCount + 1) / log10(maxReviewBenchmark + 1)
     */
    calculatePopularityScore(candidate: any, weight: any) {
        if (typeof candidate.userRatingCount !== "number" || isNaN(candidate.userRatingCount)) {
            return { score: 0, weight, available: false };
        }
        const count = Math.max(0, candidate.userRatingCount);
        const benchmark = this.config.maxReviewBenchmark;
        const logCount = Math.log10(count + 1);
        const logBenchmark = Math.log10(benchmark + 1);
        const normalized = Math.max(0, Math.min(1, logCount / logBenchmark));
        return {
            score: Math.round(normalized * 10000) / 10000,
            weight,
            available: true,
            rawScore: count
        };
    }
    /**
     * Evaluates budget fit if estimatedCostPerPerson and budget preference are known.
     */
    calculateBudgetScore(requirements: any, candidate: any, weight: any) {
        if (typeof candidate.estimatedCostPerPerson !== "number" || !requirements.budget) {
            return { score: 0, weight, available: false };
        }
        const cost = candidate.estimatedCostPerPerson;
        const category = requirements.budget.category || "moderate";
        let score = 0.5;
        if (category === "budget") {
            score = cost <= 500 ? 1.0 : cost <= 1500 ? 0.6 : 0.2;
        }
        else if (category === "moderate") {
            score = cost <= 2000 ? 1.0 : cost <= 4000 ? 0.7 : 0.4;
        }
        else if (category === "luxury") {
            score = cost >= 2000 ? 1.0 : 0.8;
        }
        return {
            score,
            weight,
            available: true,
            rawScore: cost
        };
    }
    /**
     * Evaluates walking compatibility if both user tolerance and place intensity are known.
     */
    calculateWalkingScore(requirements: any, candidate: any, weight: any) {
        const tolerance = requirements.walkingTolerance;
        const intensity = candidate.walkingIntensity;
        if (!tolerance || !intensity) {
            return { score: 0, weight, available: false };
        }
        const WALKING_SCORE_MATRIX = {
            minimal: { minimal: 1.0, moderate: 0.5, high: 0.0 },
            moderate: { minimal: 0.9, moderate: 1.0, high: 0.4 },
            high: { minimal: 0.8, moderate: 0.9, high: 1.0 }
        };
        const score = WALKING_SCORE_MATRIX[tolerance]?.[intensity] ?? 0.5;
        return {
            score,
            weight,
            available: true
        };
    }
    /**
     * Evaluates family/traveler fit if family travel is requested and familyFriendly is boolean.
     */
    calculateFamilyScore(requirements: any, candidate: any, weight: any) {
        const isFamily = requirements.travelType === "family" || (requirements.travelers?.children ?? 0) > 0;
        if (!isFamily || typeof candidate.familyFriendly !== "boolean") {
            return { score: 0, weight, available: false };
        }
        const score = candidate.familyFriendly ? 1.0 : 0.0;
        return {
            score,
            weight,
            available: true
        };
    }
    /**
     * Evaluates candidate alignment with reusable confirmed user preferences (Phase 9.3).
     */
    calculatePersonalizationScore(userPreferences: any, candidate: any, weight: any) {
        if (!userPreferences || weight <= 0) {
            return { score: 0, weight: 0, available: false };
        }
        let totalPoints = 0;
        let maxPoints = 0;
        // 1. Activity Interests
        if (userPreferences.activityInterests && userPreferences.activityInterests.length > 0) {
            maxPoints += 1;
            const interests = userPreferences.activityInterests.map((i) => i.toLowerCase());
            const cat = candidate.category.toLowerCase();
            const kw = CATEGORY_INTEREST_MAP[cat] || [];
            const match = interests.some((int) => cat.includes(int) || kw.some((k) => k.includes(int) || int.includes(k)));
            if (match)
                totalPoints += 1;
            else if (candidate.isIconicLandmark)
                totalPoints += 0.3;
        }
        // 2. Budget Tier
        if (userPreferences.budgetTier) {
            maxPoints += 1;
            const tier = userPreferences.budgetTier;
            const cost = candidate.estimatedCostPerPerson ?? 1000;
            if (tier === "budget" && cost <= 500)
                totalPoints += 1;
            else if (tier === "moderate" && cost <= 2000)
                totalPoints += 1;
            else if (tier === "luxury" && cost >= 2000)
                totalPoints += 1;
            else
                totalPoints += 0.5;
        }
        // 3. Max Daily Walking Meters
        if (typeof userPreferences.maxDailyWalkingMeters === "number") {
            maxPoints += 1;
            const maxWalk = userPreferences.maxDailyWalkingMeters;
            const intensity = candidate.walkingIntensity;
            if (maxWalk <= 1500 && intensity === "minimal")
                totalPoints += 1;
            else if (maxWalk <= 3000 && (intensity === "minimal" || intensity === "moderate"))
                totalPoints += 1;
            else if (maxWalk > 3000)
                totalPoints += 1;
            else
                totalPoints += 0.3;
        }
        // 4. Dietary Preferences
        if (userPreferences.dietaryPreferences && userPreferences.dietaryPreferences.length > 0) {
            const cat = candidate.category;
            if (cat === "restaurant" || cat === "cafe" || cat === "street_food") {
                maxPoints += 1;
                const desc = (candidate.description || "").toLowerCase();
                const vegPref = userPreferences.dietaryPreferences.some((d) => d.toLowerCase().includes("veg"));
                if (vegPref && (desc.includes("veg") || desc.includes("vegetarian")))
                    totalPoints += 1;
                else if (!vegPref)
                    totalPoints += 1;
                else
                    totalPoints += 0.4;
            }
        }
        if (maxPoints === 0) {
            return { score: 0, weight: 0, available: false };
        }
        const score = Math.max(0, Math.min(1, totalPoints / maxPoints));
        return {
            score: Math.round(score * 10000) / 10000,
            weight,
            available: true,
            rawScore: totalPoints
        };
    }
}
