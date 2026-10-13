import { CandidatePlace, ItineraryActivityType } from "../../types/candidate-place.types.js";
export interface GeographicCluster {
    clusterId: string;
    center: {
        latitude: number;
        longitude: number;
    };
    candidateIds: string[];
    neighborhood?: string;
    totalCount: number;
}
export type DurationSource = "candidate" | "default_assumption";
export type TravelEstimationSource = "geographic_estimate" | "buffer_only";
export type ItineraryTimePeriod = "morning" | "lunch" | "afternoon" | "evening" | "dinner" | "night";
export interface ScheduledPlace {
    candidate: CandidatePlace;
    dayNumber: number;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    durationSource: DurationSource;
    visitDurationMinutes?: number;
    transferDurationMinutes?: number;
    waitingDurationMinutes?: number;
    transitionBufferMinutes?: number;
    transitionBufferNote?: string;
    transferScheduleSource?: "verified_timetable" | "estimated" | "none";
    transferNote?: string;
    solarSource?: "forecast_sourced" | "estimated_model";
    solarNote?: string;
    travelTimeMinutesFromPrevious: number;
    travelDistanceMetersFromPrevious: number;
    travelEstimationSource: TravelEstimationSource;
    activityType?: ItineraryActivityType;
    mealType?: "lunch" | "dinner";
    timePeriod?: ItineraryTimePeriod;
}
export interface DailySchedule {
    dayNumber: number;
    date?: string;
    places: ScheduledPlace[];
    clusterId?: string;
    totalVisitMinutes: number;
    totalTravelMinutes: number;
    remainingMinutes: number;
    totalAttractionVisitMinutes?: number;
    totalMealMinutes?: number;
    totalAccessTransferMinutes?: number;
    totalWaitingAndBufferMinutes?: number;
    totalDaytimeVisitMinutes?: number;
    totalNightlifeVisitMinutes?: number;
    dayStartTime: string;
    dayEndTime: string;
}
export type UnscheduledCandidateReason = "location_unavailable" | "no_trip_dates_or_duration" | "outside_daily_window" | "opening_hours_conflict" | "insufficient_time" | "arrival_time_constraint" | "departure_time_constraint" | "daily_capacity_reached";
export interface UnscheduledCandidate {
    candidate: CandidatePlace;
    reason: UnscheduledCandidateReason;
    details?: Record<string, unknown>;
}
export interface SchedulingDiagnostics {
    totalCandidates: number;
    scheduledPlacesCount: number;
    unscheduledCount: number;
    clustersCount: number;
    plannedDaysCount: number;
    warnings: string[];
}
export interface SchedulingResult {
    dailySchedules: DailySchedule[];
    unscheduledCandidates: UnscheduledCandidate[];
    geographicClusters: GeographicCluster[];
    diagnostics: SchedulingDiagnostics;
}
export interface ItinerarySchedulingConfig {
    clusterRadiusMeters: number;
    dayStartTime: string;
    dayEndTime: string;
    defaultVisitDurationMinutes: number;
    defaultMealDurationMinutes?: number;
    includeGenericMeals?: boolean;
    travelBufferMinutes: number;
    planningSpeedKmH: number;
    referenceDate?: Date;
    maxPlacesPerDay: {
        relaxed: number;
        moderate: number;
        fast_paced: number;
    };
    dayWeatherSummaries?: Record<number, {
        precipitationProbability?: number;
        isSevere?: boolean;
        sunrise?: string;
        sunset?: string;
    }>;
    semanticPlan?: SemanticPlanResult;
}
export interface SemanticPlanActivity {
    candidateId: string;
    period: "morning" | "afternoon" | "evening";
    reason?: string;
}
export interface SemanticDayPlan {
    day: number;
    activities: SemanticPlanActivity[];
}
export interface SemanticPlanResult {
    days: SemanticDayPlan[];
    source: "gemini" | "fallback_ai" | "deterministic";
}
