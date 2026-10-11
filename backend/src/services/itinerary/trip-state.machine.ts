import { hasRequiredPlanningFields } from "../../types/trip-requirements.types.js";
import { AppError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import { TripPlanningState, StructuredTripRequirements } from "../../types/trip-requirements.types.js";

export interface TransitionValidationResult {
    valid: boolean;
    reason?: string;
}

const ALLOWED_TRANSITIONS = {
    collecting_requirements: ["planning", "itinerary_created"],
    planning: ["itinerary_created", "collecting_requirements"],
    itinerary_created: ["modifying_itinerary", "confirmed"],
    modifying_itinerary: ["itinerary_created", "planning"],
    confirmed: ["traveling", "modifying_itinerary"],
    traveling: ["completed"],
    completed: []
};
export class TripStateMachine {
    /**
     * Validates whether a state transition from currentState to nextState is permitted.
     */
    static validateTransition(currentState: TripPlanningState, nextState: TripPlanningState, requirements: Partial<StructuredTripRequirements> | null, hasItinerary = false) {
        // 1. Same state transition is a no-op (valid)
        if (currentState === nextState) {
            return { valid: true };
        }
        // 2. Check general allowed transitions matrix
        const allowed = ALLOWED_TRANSITIONS[currentState] || [];
        if (!allowed.includes(nextState)) {
            const reason = `Invalid trip planning state transition from '${currentState}' to '${nextState}'.`;
            return { valid: false, reason };
        }
        // 3. Guard: Entering 'planning' requires critical fields (destination + duration)
        if (nextState === "planning") {
            const { isReady, missingFields } = hasRequiredPlanningFields(requirements);
            if (!isReady) {
                return {
                    valid: false,
                    reason: `Cannot transition to 'planning': missing required fields [${missingFields.join(", ")}].`
                };
            }
        }
        // 4. Guard: Entering 'modifying_itinerary' requires an existing itinerary
        if (nextState === "modifying_itinerary" && !hasItinerary) {
            return {
                valid: false,
                reason: "Cannot transition to 'modifying_itinerary': no itinerary exists to modify."
            };
        }
        // 5. Guard: Entering 'confirmed' requires an existing itinerary
        if (nextState === "confirmed" && !hasItinerary) {
            return {
                valid: false,
                reason: "Cannot confirm a trip that does not have an existing itinerary."
            };
        }
        return { valid: true };
    }
    /**
     * Transitions from currentState to nextState, throwing AppError if invalid.
     */
    static transition(currentState: TripPlanningState, nextState: TripPlanningState, requirements: Partial<StructuredTripRequirements> | null, hasItinerary = false) {
        const result = this.validateTransition(currentState, nextState, requirements, hasItinerary);
        if (!result.valid) {
            logger.warn({ from: currentState, to: nextState, reason: result.reason }, "Trip state transition rejected");
            throw new AppError(result.reason || `Invalid state transition from ${currentState} to ${nextState}`, 400, "INVALID_TRIP_STATE_TRANSITION");
        }
        logger.info({ from: currentState, to: nextState }, `Trip planning state transitioned: ${currentState} -> ${nextState}`);
        return nextState;
    }
}
