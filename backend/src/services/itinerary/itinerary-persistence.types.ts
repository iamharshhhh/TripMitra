import { z } from "zod";

export type PersistedScheduledPlace = z.infer<typeof PersistedScheduledPlaceSchema>;

export type PersistedItineraryDay = z.infer<typeof PersistedItineraryDaySchema>;

export type PersistedItinerarySnapshot = z.infer<typeof PersistedItinerarySnapshotSchema>;

export interface SaveItineraryOptions {
    tripId?: string;
    userId: string;
    conversationId?: string;
    expectedVersion?: number;
}

export interface PersistenceResult {
    tripId: string;
    userId: string;
    itineraryVersion: number;
    isNewTrip: boolean;
    isNewVersion: boolean;
    activeTripUpdated: boolean;
    snapshot: PersistedItinerarySnapshot;
}

/**
 * Persisted place schema.
 * Strips raw provider payloads, embedding vectors, and large tool logs.
 */
export const PersistedLocationSchema = z.object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    address: z.string().nullable().optional(),
    neighborhood: z.string().nullable().optional()
});
export const PersistedScheduledPlaceSchema = z.object({
    placeId: z.string().min(1),
    name: z.string().min(1),
    category: z.string().min(1),
    activityType: z.enum(["attraction", "restaurant", "meal", "free_time", "transit"]).optional(),
    mealType: z.enum(["lunch", "dinner"]).optional(),
    mealRecommendations: z.unknown().optional(),
    description: z.string().optional(),
    mapUrl: z.string().optional(),
    directionsUrl: z.string().optional(),
    location: PersistedLocationSchema.default({}),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
    durationMinutes: z.number().positive(),
    durationSource: z.enum(["candidate", "default_assumption"]),
    visitDurationMinutes: z.number().positive().optional(),
    transferDurationMinutes: z.number().min(0).optional(),
    waitingDurationMinutes: z.number().min(0).optional(),
    transitionBufferMinutes: z.number().min(0).optional(),
    transitionBufferNote: z.string().optional(),
    transferScheduleSource: z.enum(["verified_timetable", "estimated", "none"]).optional(),
    transferNote: z.string().optional(),
    solarSource: z.enum(["forecast_sourced", "estimated_model"]).optional(),
    solarNote: z.string().optional(),
    travelDistanceMetersFromPrevious: z.number().min(0),
    travelTimeMinutesFromPrevious: z.number().min(0),
    travelEstimationSource: z.enum(["geographic_estimate", "buffer_only"]),
    weatherSuitability: z.enum(["suitable", "potentially_unfavorable", "unsuitable", "unknown"]).optional(),
    weatherReasons: z.array(z.string()).default([]),
    costItem: z.any().optional(),
    executionStatus: z.enum(["pending", "in_progress", "completed", "skipped"]).optional(),
    completed: z.boolean().optional(),
    skipped: z.boolean().optional(),
    completedAt: z.string().optional(),
    skippedAt: z.string().optional()
});
export const PersistedItineraryDaySchema = z.object({
    dayNumber: z.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dayStartTime: z.string().regex(/^\d{2}:\d{2}$/),
    dayEndTime: z.string().regex(/^\d{2}:\d{2}$/),
    places: z.array(PersistedScheduledPlaceSchema),
    morning: z.array(PersistedScheduledPlaceSchema).optional(),
    afternoon: z.array(PersistedScheduledPlaceSchema).optional(),
    evening: z.array(PersistedScheduledPlaceSchema).optional(),
    totalVisitMinutes: z.number().min(0),
    totalTravelMinutes: z.number().min(0),
    remainingMinutes: z.number().min(0),
    totalAttractionVisitMinutes: z.number().min(0).optional(),
    totalMealMinutes: z.number().min(0).optional(),
    totalAccessTransferMinutes: z.number().min(0).optional(),
    totalWaitingAndBufferMinutes: z.number().min(0).optional(),
    totalDaytimeVisitMinutes: z.number().min(0).optional(),
    totalNightlifeVisitMinutes: z.number().min(0).optional(),
    clusterId: z.string().optional(),
    dayWeather: z.any().optional(),
    knownDailyCost: z.number().min(0)
});
export const PersistedItinerarySnapshotSchema = z.object({
    itineraryVersion: z.number().int().positive().default(1),
    generatedAt: z.string(), // ISO string
    contentHash: z.string().optional(), // Deterministic hash of itinerary content (excluding generatedAt/version)
    days: z.array(PersistedItineraryDaySchema),
    weather: z.object({
        status: z.enum(["available", "partial", "unavailable"]),
        days: z.array(z.any())
    }),
    budget: z.any(), // Authoritative BudgetEvaluationResult
    diagnostics: z.object({
        scheduling: z.any(),
        weatherWarnings: z.array(z.string()).default([]),
        budgetWarnings: z.array(z.string()).default([])
    }),
    generationMetadata: z.object({
        destination: z.string(),
        destinationSlug: z.string(),
        durationDays: z.number().int().positive(),
        totalPlaces: z.number().int().min(0)
    })
});
