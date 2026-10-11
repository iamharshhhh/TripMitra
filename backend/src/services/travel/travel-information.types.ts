import { SupportedLanguage } from "../language/language-detector.service.js";
import { ModificationIntent } from "../itinerary/modification-intent.types.js";

/**
 * TripMitra Travel Information Types
 * Cleaned production domain types supporting TransactionGuard, SessionPlaceStore, and PlaceContinuity.
 */

export type TravelServiceCategory = "train" | "bus" | "flight" | "hotel" | "restaurant" | "attraction" | "cab" | "metro" | "general";

export type ReliabilityTier = "verified_live" | "verified_static" | "estimated_guidance" | "unavailable";

export interface TransactionDetectionResult {
    isTransactionRequest: boolean;
    actionIntent: ActionIntent;
    serviceType?: TravelServiceCategory;
    matchedPattern?: string;
    targetItemRef?: string;
    targetOrdinal?: number;
    partySize?: number;
    rawText: string;
}

export interface StructuredMoney {
    amount: number;
    currency: string;
    pricingBasis: string;
    travelerCategory?: string;
    freshness?: ReliabilityTier;
    reliability?: ReliabilityTier;
    isEstimated?: boolean;
}

export interface UserConstraintRequirement {
    id: string;
    type: ConstraintType;
    hardness: ConstraintHardness;
    rawExpression: string;
    targetBudget?: StructuredMoney;
    targetTimeWindow?: {
        earliestArrival?: string;
        latestDeparture?: string;
        targetDeadline?: string;
        deadlinePurpose?: "TRAIN_DEPARTURE" | "FLIGHT_DEPARTURE" | "CLOSING_TIME" | "GENERAL";
        planningBufferMinutes?: number;
    };
    targetDistanceMeters?: number;
    targetAccessibility?: {
        property: AccessibilityProperty;
        requiredState: AccessibilityFactState;
    };
    targetOpenStatus?: boolean;
    referencePoint?: {
        name: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    updatedAt: number;
}

export type AdaptationProvenance = "FORECASTED_WEATHER" | "USER_REPORTED_WEATHER" | "HYPOTHETICAL_WEATHER_SCENARIO" | "EXTERNALLY_VERIFIED" | "USER_REPORTED_STATUS" | "LIVE_STATUS_UNAVAILABLE" | "USER_REPORTED_CONTEXT" | "USER_EXPLICIT_INTENT";

export type ImpactItemState = "DIRECTLY_AFFECTED" | "DOWNSTREAM_AFFECTED" | "UNAFFECTED" | "UNKNOWN_IMPACT";

export interface AdaptationProposedModification {
    optionIndex: number;
    tierApplied: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    action: "replace_place" | "remove_place" | "adjust_timing" | "reorder_places";
    description: string;
    targetSlotIndex: number;
    originalPlaceName?: string;
    replacementPlace?: {
        name: string;
        category: string;
        priceLevel?: string;
        environmentState: EnvironmentTypeState;
        feasibilityStatus: FeasibilityStatus;
        mapsNavigationUrl?: string;
        officialPortalUrl?: string;
    };
    revisedTimeline?: Array<{
        timeWindow: string;
        placeName: string;
        estimatedTransitMins?: number;
    }>;
    modificationIntentPayload: ModificationIntent;
}

export interface EphemeralItineraryProposal {
    proposalId: string;
    tripId: string;
    expectedItineraryVersion: number;
    targetDayNumber: number;
    trigger: {
        eventType: AdaptationEventType;
        provenance: AdaptationProvenance;
        normalizedDetails: {
            weatherCondition?: "RAIN" | "EXTREME_HEAT" | "UNFAVORABLE";
            delayMinutes?: number;
            remainingDurationMinutes?: number;
            specifiedEndTime?: string;
            targetPlaceName?: string;
            targetSlotIndex?: number;
        };
        rawTriggerText?: string;
    };
    impactSummary: {
        directlyAffectedCount: number;
        downstreamAffectedCount: number;
        unaffectedCount: number;
        unknownImpactCount: number;
    };
    affectedItems: Array<{
        slotIndex: number;
        placeName: string;
        impactState: ImpactItemState;
        reason: string;
    }>;
    preservedItems: Array<{
        slotIndex: number;
        placeName: string;
    }>;
    proposedModifications: AdaptationProposedModification[];
    activeConstraintsPreserved: UserConstraintRequirement[];
    unknownFieldsDisclosed: string[];
    requiresConfirmation: boolean;
    isHypothetical?: boolean;
    createdAt: number;
    expiresAt: number;
}

export interface EphemeralTripExecutionContext {
    tripId?: string;
    itineraryVersion?: number;
    activeDayNumber?: number;
    activePlaceId?: string;
    activePlaceName?: string;
    arrivalTimestamp?: number;
    lastConfirmedArrivalPlace?: string;
    lastProximityAdvisoryPlace?: string;
    lastProximityAdvisoryTimestamp?: number;
    lastKnownLocationTime?: number;
    temporaryDepartureContext?: {
        departureType: "TRAIN" | "FLIGHT" | "BUS";
        scheduledTime: string;
        stationOrAirportName: string;
        planningBufferMinutes: number;
    };
    temporaryExecutionMetadata?: Record<string, unknown>;
    lastUpdated: number;
}

export enum ActionIntent {
    NONE = "none",
    TRANSACTION_REQUEST = "transaction_request"
}

export enum ComparisonSubIntent {
    DIRECT_COMPARISON = "direct_comparison",
    PROXIMITY_QUERY = "proximity_query",
    COST_TRADEOFF = "cost_tradeoff",
    DURATION_TRADEOFF = "duration_tradeoff",
    WALKING_EFFORT = "walking_effort",
    FAMILY_SUITABILITY = "family_suitability",
    DIMENSIONAL_RANKING = "dimensional_ranking",
    FOLLOW_UP_COMPARISON = "follow_up_comparison"
}

export enum ConstraintType {
    TIME_WINDOW = "TIME_WINDOW",
    BUDGET_CEILING = "BUDGET_CEILING",
    DISTANCE_RADIUS = "DISTANCE_RADIUS",
    WALKING_EFFORT = "WALKING_EFFORT",
    ACCESSIBILITY = "ACCESSIBILITY",
    OPEN_STATUS = "OPEN_STATUS"
}

export enum ConstraintHardness {
    HARD = "HARD",
    SOFT = "SOFT"
}

export enum FeasibilityStatus {
    PASS = "PASS",
    FAIL = "FAIL",
    UNKNOWN = "UNKNOWN"
}

export enum AccessibilityProperty {
    WHEELCHAIR_ACCESSIBLE = "WHEELCHAIR_ACCESSIBLE",
    STROLLER_ACCESSIBLE = "STROLLER_ACCESSIBLE",
    STEP_FREE_ACCESS = "STEP_FREE_ACCESS",
    ELEVATOR_AVAILABLE = "ELEVATOR_AVAILABLE"
}

export enum AccessibilityFactState {
    VERIFIED_PRESENT = "VERIFIED_PRESENT",
    VERIFIED_ABSENT = "VERIFIED_ABSENT",
    UNKNOWN = "UNKNOWN"
}

export enum ConstraintUpdateOperation {
    ADD = "ADD",
    REPLACE = "REPLACE",
    REMOVE = "REMOVE",
    CLEAR_ALL = "CLEAR_ALL"
}

export enum EnvironmentTypeState {
    VERIFIED_INDOOR = "VERIFIED_INDOOR",
    VERIFIED_OUTDOOR = "VERIFIED_OUTDOOR",
    UNKNOWN = "UNKNOWN"
}

export enum AdaptationEventType {
    WEATHER_DISRUPTION = "WEATHER_DISRUPTION",
    SCHEDULE_DELAY = "SCHEDULE_DELAY",
    PLACE_CLOSURE = "PLACE_CLOSURE",
    USER_EARLY_DEPARTURE = "USER_EARLY_DEPARTURE",
    USER_REQUESTED_REPLACEMENT = "USER_REQUESTED_REPLACEMENT",
    MANUAL_INSTRUCTION = "MANUAL_INSTRUCTION"
}
