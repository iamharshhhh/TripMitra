import { logger } from "../../utils/logger.js";
import { CandidatePlace } from "../../types/candidate-place.types.js";
import { StructuredTripRequirements, PartialTripRequirements } from "../../types/trip-requirements.types.js";

/**
 * Complete deterministic compatibility matrix for walking tolerance vs place walking intensity.
 * Tolerance: what the traveler can handle.
 * Intensity: the walking difficulty of the place.
 */
export const WALKING_COMPATIBILITY_MATRIX = {
    minimal: {
        minimal: true,
        moderate: false,
        high: false
    },
    moderate: {
        minimal: true,
        moderate: true,
        high: false
    },
    high: {
        minimal: true,
        moderate: true,
        high: true
    }
};
/**
 * Known strict dietary restriction keywords that constitute hard food constraints.
 * General interests (e.g., "local cuisine", "street food", "misal", "fine dining") are NOT hard restrictions.
 */
const STRICT_DIETARY_RESTRICTIONS = new Set([
    "vegetarian",
    "pure_vegetarian",
    "pure-vegetarian",
    "vegan",
    "jain",
    "halal",
    "kosher"
]);
export class PlaceFilterService {
    /**
     * Filters candidate places against hard constraints in user requirements.
     * Unknown attributes strictly evaluate to compatible/accepted (undefined ≠ false).
     */
    filterCandidates(requirements: StructuredTripRequirements | PartialTripRequirements, candidates: CandidatePlace[]) {
        const accepted = [];
        const rejected = [];
        for (const candidate of candidates) {
            const evalResult = this.evaluateHardConstraints(requirements, candidate);
            if (evalResult.accepted) {
                accepted.push(candidate);
            }
            else {
                rejected.push(evalResult);
            }
        }
        logger.info({
            totalEvaluated: candidates.length,
            acceptedCount: accepted.length,
            rejectedCount: rejected.length
        }, "Place hard-constraint filtering completed");
        return {
            accepted,
            rejected,
            totalEvaluated: candidates.length
        };
    }
    /**
     * Evaluates hard constraints on a single candidate place.
     */
    evaluateHardConstraints(requirements: StructuredTripRequirements | PartialTripRequirements, candidate: CandidatePlace) {
        // -------------------------------------------------------------
        // 1. Destination check
        // -------------------------------------------------------------
        if (requirements.destinationSlug &&
            candidate.destinationSlug &&
            requirements.destinationSlug.trim() !== "" &&
            candidate.destinationSlug.trim() !== "" &&
            requirements.destinationSlug !== candidate.destinationSlug) {
            return {
                candidate,
                accepted: false,
                rejectionReason: "destination_mismatch",
                rejectionDetails: {
                    field: "destinationSlug",
                    required: requirements.destinationSlug,
                    actual: candidate.destinationSlug
                }
            };
        }
        // -------------------------------------------------------------
        // 2. Accessibility Hard Constraint
        // -------------------------------------------------------------
        const hasWheelchairRequirement = (requirements.accessibilityRequirements || []).some((req) => req.toLowerCase().includes("wheelchair") || req.toLowerCase().includes("mobility"));
        if (hasWheelchairRequirement) {
            // If wheelchairAccessible is explicitly known to be false, reject
            if (candidate.wheelchairAccessible === false) {
                return {
                    candidate,
                    accepted: false,
                    rejectionReason: "accessibility_requirement_not_met",
                    rejectionDetails: {
                        field: "wheelchairAccessible",
                        required: true,
                        actual: false
                    }
                };
            }
            // If undefined/unknown: DO NOT reject (unknown ≠ false)
        }
        // -------------------------------------------------------------
        // 3. Walking Tolerance Hard Constraint
        // -------------------------------------------------------------
        const userTolerance = requirements.walkingTolerance;
        const placeIntensity = candidate.walkingIntensity;
        if (userTolerance && placeIntensity) {
            const matrixForTolerance = WALKING_COMPATIBILITY_MATRIX[userTolerance];
            const isCompatible = matrixForTolerance ? matrixForTolerance[placeIntensity] : true;
            if (!isCompatible) {
                return {
                    candidate,
                    accepted: false,
                    rejectionReason: "walking_requirement_not_met",
                    rejectionDetails: {
                        field: "walkingIntensity",
                        required: userTolerance,
                        actual: placeIntensity
                    }
                };
            }
        }
        // If either userTolerance or placeIntensity is unknown/undefined: DO NOT reject
        // -------------------------------------------------------------
        // 4. Strict Dietary / Food Preferences Hard Constraint
        // -------------------------------------------------------------
        const foodPrefs = (requirements.foodPreferences || []).map((f) => f.toLowerCase().trim());
        const strictDietary = foodPrefs.filter((f) => STRICT_DIETARY_RESTRICTIONS.has(f));
        if (strictDietary.length > 0 && candidate.category === "restaurant") {
            // Check explicit cuisine or dietary conflict metadata if provided
            const googleTypes = candidate.provenance.googleDetails?.types || [];
            const knownConflict = this.checkExplicitDietaryConflict(strictDietary, googleTypes, candidate);
            if (knownConflict) {
                return {
                    candidate,
                    accepted: false,
                    rejectionReason: "food_preference_conflict",
                    rejectionDetails: {
                        field: "foodPreferences",
                        required: strictDietary,
                        actual: knownConflict
                    }
                };
            }
            // Unknown cuisine or no explicit conflict -> accepted
        }
        return {
            candidate,
            accepted: true
        };
    }
    /**
     * Deterministically checks if candidate place metadata explicitly conflicts with strict dietary rules.
     * Does NOT infer cuisine from restaurant name or ungrounded descriptive prose.
     */
    checkExplicitDietaryConflict(strictRequirements: any, googleTypes: any, candidate: any) {
        const isVegetarianOrVegan = strictRequirements.some((r) => r === "vegetarian" || r === "pure_vegetarian" || r === "vegan" || r === "jain");
        if (isVegetarianOrVegan) {
            // Explicit non-vegetarian venues in Google Places types
            if (googleTypes.includes("steak_house") || googleTypes.includes("butcher_shop")) {
                return "explicit_non_vegetarian_establishment";
            }
            // Explicit metadata tags if present
            const meta = candidate.provenance.ragDetails?.category;
            if (meta && meta.toLowerCase() === "non_vegetarian_only") {
                return "non_vegetarian_only";
            }
        }
        return null;
    }
}
