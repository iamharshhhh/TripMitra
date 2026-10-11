import { z } from "zod";
import { TravelerCountSchema } from "../../types/trip-requirements.types.js";
import { PersistedItinerarySnapshot } from "./itinerary-persistence.types.js";

export type ModificationAction = z.infer<typeof ModificationActionEnum>;

export type ModificationScope = z.infer<typeof ModificationScopeEnum>;

export type ModificationIntent = z.infer<typeof ModificationIntentSchema>;

export type ModificationResultStatus = "modified" | "no_change" | "clarification_needed" | "failed";

export interface ModificationResult {
    status: ModificationResultStatus;
    tripId?: string;
    userId: string;
    intent: ModificationIntent;
    previousVersion: number;
    newVersion: number;
    changedDays: number[];
    preservedDays: number[];
    explanation: string;
    snapshot?: PersistedItinerarySnapshot;
    error?: string;
}

/**
 * Modification action types supported by M8.7.
 */
export const ModificationActionEnum = z.enum([
    "none", // Chit-chat or unrelated; no itinerary modification
    "adjust_budget", // "make it cheaper", "upgrade to luxury"
    "adjust_pace", // "make it more relaxed", "fast-paced"
    "adjust_walking", // "less walking", "minimal walking"
    "adjust_interests", // "more museums", "add food places"
    "adjust_travelers", // "traveling with kids now", "solo trip now"
    "adjust_dates", // "change dates", "add a day"
    "replace_place", // "replace Shaniwar Wada with something else"
    "remove_place", // "remove Sinhagad Fort"
    "complete_place", // Phase 8.8: "I finished Shaniwar Wada" / "Mark completed"
    "skip_place", // Phase 8.8: "Skip Sinhagad Fort" / "Skip option 2"
    "complete_trip", // Phase 8.9: "I finished my trip" / "My trip is over"
    "add_place", // "add Dagdusheth Mandir"
    "modify_day", // "change day 2"
    "clarification_needed" // Ambiguous user intent requiring clarification
]);
/**
 * Explicit vs. Day-level scope:
 * - trip_level: affects all days (e.g. global pace, total travelers, dates)
 * - day_level: strictly targets a single day (e.g. "change Day 2", "Day 2 relaxed")
 */
export const ModificationScopeEnum = z.enum(["trip_level", "day_level"]);
/**
 * Structured Modification Intent Schema extracted by LLM.
 * Structure is validated strictly via Zod; application-level validation subsequently checks intent safety.
 */
export const ModificationIntentSchema = z.object({
    action: ModificationActionEnum,
    scope: ModificationScopeEnum.default("trip_level"),
    targetDayNumber: z.number().int().positive().nullable().optional(),
    targetPlaceName: z.string().nullable().optional(),
    replacementCategory: z.string().nullable().optional(),
    requiresClarification: z.boolean().default(false),
    clarificationPrompt: z.string().nullable().optional(),
    adjustments: z.object({
        budgetCategory: z.enum(["budget", "moderate", "luxury"]).nullable().optional(),
        maxBudget: z.number().positive().nullable().optional(),
        makeCheaper: z.boolean().nullable().optional(), // Semantic flag when user says "make it cheaper" without numeric limit
        preferredPace: z.enum(["relaxed", "moderate", "fast_paced"]).nullable().optional(),
        walkingTolerance: z.enum(["minimal", "moderate", "high"]).nullable().optional(),
        addedInterests: z.array(z.string().trim()).default([]),
        removedInterests: z.array(z.string().trim()).default([]),
        travelType: z.enum(["solo", "couple", "family", "friends"]).nullable().optional(),
        travelers: TravelerCountSchema.nullable().optional(),
        durationDays: z.number().int().positive().nullable().optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        specialRequests: z.array(z.string().trim()).default([])
    }).default({}),
    rawUserRationale: z.string().nullable().optional()
});
