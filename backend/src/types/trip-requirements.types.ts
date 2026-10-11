import { z } from "zod";

export type TripPlanningState = "collecting_requirements" | "planning" | "itinerary_created" | "modifying_itinerary" | "confirmed" | "traveling" | "completed";

export type TravelType = "solo" | "couple" | "family" | "friends";

export type WalkingTolerance = "minimal" | "moderate" | "high";

export type BudgetCategory = "budget" | "moderate" | "luxury" | "custom";

export type PreferredPace = "relaxed" | "moderate" | "fast_paced";

export type TravelerCount = z.infer<typeof TravelerCountSchema>;

export type TripBudget = z.infer<typeof TripBudgetSchema>;

export type StructuredTripRequirements = z.infer<typeof StructuredTripRequirementsSchema>;

export type PartialTripRequirements = z.infer<typeof PartialTripRequirementsSchema>;

/**
 * Normalizes destination strings to consistent slug format (e.g. "Pune" -> "pune", "New Delhi" -> "new-delhi").
 */
export function normalizeDestinationSlug(destination: string) {
    if (!destination)
        return "";
    return destination
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}
/**
 * Helper to validate ISO calendar date (YYYY-MM-DD).
 */
const DateStringSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime()))
        return false;
    const [year, month, day] = val.split("-").map(Number);
    return (date.getUTCFullYear() === year &&
        date.getUTCMonth() + 1 === month &&
        date.getUTCDate() === day);
}, "Invalid calendar date");
/**
 * Traveler composition schema.
 */
export const TravelerCountSchema = z
    .object({
    total: z.number().int().min(1, "Total travelers must be at least 1"),
    adults: z.number().int().min(0).optional(),
    children: z.number().int().min(0).optional(),
    seniors: z.number().int().min(0).optional()
})
    .refine((data) => {
    // If component counts are provided, verify they sum to total
    const hasComponents = data.adults !== undefined ||
        data.children !== undefined ||
        data.seniors !== undefined;
    if (!hasComponents)
        return true;
    const adults = data.adults ?? 0;
    const children = data.children ?? 0;
    const seniors = data.seniors ?? 0;
    return adults + children + seniors === data.total;
}, {
    message: "Sum of adults, children, and seniors must equal total travelers count",
    path: ["total"]
});
/**
 * Budget schema.
 */
export const TripBudgetSchema = z.object({
    category: z.enum(["budget", "moderate", "luxury", "custom"]).default("moderate"),
    maxTotalAmount: z.number().positive("Budget maxTotalAmount must be positive").optional(),
    currency: z.string().default("INR")
});
/**
 * Complete Structured Trip Requirements Schema with date and traveler refinements.
 */
export const StructuredTripRequirementsSchema = z
    .object({
    destination: z.string().min(1, "Destination is required").trim(),
    destinationSlug: z.string().min(1, "Destination slug is required").trim(),
    startDate: DateStringSchema.optional(),
    endDate: DateStringSchema.optional(),
    durationDays: z
        .number()
        .int("durationDays must be an integer")
        .min(1, "Trip duration must be at least 1 day")
        .max(30, "Maximum trip duration supported is 30 days")
        .optional(),
    travelers: TravelerCountSchema.optional(),
    travelType: z.enum(["solo", "couple", "family", "friends"]).optional(),
    budget: TripBudgetSchema.optional(),
    interests: z.array(z.string().trim()).default([]),
    foodPreferences: z.array(z.string().trim()).default([]),
    walkingTolerance: z.enum(["minimal", "moderate", "high"]).optional(),
    accessibilityRequirements: z.array(z.string().trim()).default([]),
    preferredTransport: z.array(z.string().trim()).default([]),
    preferredPace: z.enum(["relaxed", "moderate", "fast_paced"]).optional(),
    accommodationArea: z.string().trim().optional(),
    arrivalTime: z.string().trim().optional(),
    departureTime: z.string().trim().optional(),
    specialRequests: z.array(z.string().trim()).default([]),
    provenance: z
        .record(z.enum(["user", "inferred", "system"]))
        .optional()
})
    .refine((data) => {
    // If both startDate and endDate are provided, startDate must be <= endDate
    if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
    }
    return true;
}, {
    message: "startDate must be before or equal to endDate",
    path: ["endDate"]
})
    .refine((data) => {
    // If startDate, endDate, and durationDays are all provided, verify consistency
    if (data.startDate && data.endDate && data.durationDays !== undefined) {
        const start = new Date(data.startDate).getTime();
        const end = new Date(data.endDate).getTime();
        const calculatedDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return data.durationDays === calculatedDays;
    }
    return true;
}, {
    message: "durationDays must match the inclusive count of days between startDate and endDate",
    path: ["durationDays"]
});
/**
 * Partial requirements for incremental multi-turn collection.
 */
export const PartialTripRequirementsSchema = z.object({
    destination: z.string().trim().optional(),
    destinationSlug: z.string().trim().optional(),
    startDate: DateStringSchema.optional(),
    endDate: DateStringSchema.optional(),
    durationDays: z.number().int().min(1).max(30).optional(),
    travelers: TravelerCountSchema.optional(),
    travelType: z.enum(["solo", "couple", "family", "friends"]).optional(),
    budget: TripBudgetSchema.optional(),
    interests: z.array(z.string().trim()).optional(),
    foodPreferences: z.array(z.string().trim()).optional(),
    walkingTolerance: z.enum(["minimal", "moderate", "high"]).optional(),
    accessibilityRequirements: z.array(z.string().trim()).optional(),
    preferredTransport: z.array(z.string().trim()).optional(),
    preferredPace: z.enum(["relaxed", "moderate", "fast_paced"]).optional(),
    accommodationArea: z.string().trim().optional(),
    arrivalTime: z.string().trim().optional(),
    departureTime: z.string().trim().optional(),
    specialRequests: z.array(z.string().trim()).optional(),
    provenance: z.record(z.enum(["user", "inferred", "system"])).optional()
});
/**
 * Checks whether the minimum critical information needed for itinerary generation is present.
 */
export function hasRequiredPlanningFields(req: Partial<StructuredTripRequirements> | null) {
    if (!req) {
        return {
            isReady: false,
            missingFields: ["destination", "durationDays"]
        };
    }
    const missing = [];
    if (!req.destination || req.destination.trim() === "") {
        missing.push("destination");
    }
    const hasDuration = req.durationDays !== undefined && req.durationDays > 0;
    const hasDateRange = Boolean(req.startDate && req.endDate);
    if (!hasDuration && !hasDateRange) {
        missing.push("durationDays");
    }
    return {
        isReady: missing.length === 0,
        missingFields: missing
    };
}
/**
  * Canonical normalization layer for wizard-collected inputs before domain processing.
  */
export function normalizeWizardRequirements(raw: Partial<StructuredTripRequirements> & Record<string, any>) {
    const destination = (raw.destination || "Trip").trim();
    const destinationSlug = raw.destinationSlug || normalizeDestinationSlug(destination);
    const durationDays = typeof raw.durationDays === "number" && raw.durationDays > 0
        ? Math.min(Math.max(Math.round(raw.durationDays), 1), 30)
        : 3;
    // 1. Travelers count (1..50)
    let travelersCount = 1;
    if (typeof raw.travelers === "number") {
        travelersCount = raw.travelers;
    }
    else if (raw.travelers && typeof raw.travelers.total === "number") {
        travelersCount = raw.travelers.total;
    }
    else if (raw.travelersCount) {
        travelersCount = Number(raw.travelersCount) || 1;
    }
    travelersCount = Math.min(Math.max(Math.round(travelersCount), 1), 50);
    const travelers = {
        total: travelersCount,
        adults: travelersCount
    };
    const travelType = travelersCount === 1
        ? "solo"
        : travelersCount === 2
            ? "couple"
            : travelersCount <= 5
                ? "family"
                : "friends";
    // 2. Start Date and End Date Normalization
    let startDate = undefined;
    let endDate = undefined;
    if (raw.startDate) {
        if (typeof raw.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate.trim())) {
            startDate = raw.startDate.trim();
        }
        else if ((raw.startDate as any) instanceof Date && !isNaN((raw.startDate as any).getTime())) {
            const d = raw.startDate as any;
            startDate = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        }
    }
    if (startDate) {
        const parts = startDate.split("-").map((p) => parseInt(p, 10));
        const startObj = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        startObj.setUTCDate(startObj.getUTCDate() + (durationDays - 1));
        endDate = `${startObj.getUTCFullYear()}-${String(startObj.getUTCMonth() + 1).padStart(2, "0")}-${String(startObj.getUTCDate()).padStart(2, "0")}`;
    }
    else if (raw.endDate) {
        if (typeof raw.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.endDate.trim())) {
            endDate = raw.endDate.trim();
        }
    }
    // 3. Budget normalization
    let budgetCategory = "moderate";
    let maxTotalAmount = undefined;
    const rawBudget = raw.budget;
    if (typeof rawBudget === "number" && rawBudget > 0) {
        maxTotalAmount = rawBudget;
        budgetCategory = "custom";
    }
    else if (typeof raw.budgetAmount === "number" && raw.budgetAmount > 0) {
        maxTotalAmount = raw.budgetAmount;
        budgetCategory = "custom";
    }
    else if (rawBudget) {
        if (typeof rawBudget === "string") {
            const bStr = (rawBudget as any).toLowerCase().trim();
            if (["budget", "moderate", "luxury", "custom"].includes(bStr)) {
                budgetCategory = bStr;
            }
            else {
                const num = parseInt(bStr.replace(/[^0-9]/g, ""), 10);
                if (!isNaN(num) && num > 0) {
                    maxTotalAmount = num;
                    budgetCategory = "custom";
                }
            }
        }
        else if (typeof rawBudget === "object") {
            if (rawBudget.category &&
                ["budget", "moderate", "luxury", "custom"].includes(rawBudget.category)) {
                budgetCategory = rawBudget.category;
            }
            if (typeof rawBudget.maxTotalAmount === "number" && rawBudget.maxTotalAmount > 0) {
                maxTotalAmount = rawBudget.maxTotalAmount;
                if (budgetCategory !== "budget" && budgetCategory !== "luxury") {
                    budgetCategory = "custom";
                }
            }
        }
    }
    const budget = {
        category: budgetCategory,
        currency: "INR",
        ...(maxTotalAmount ? { maxTotalAmount } : {})
    };
    // 4. Interests expansion & sanitization
    const rawInterests = Array.isArray(raw.interests) ? raw.interests : [];
    const expandedInterests = [];
    for (const item of rawInterests) {
        if (typeof item === "string") {
            const trimmed = item.toLowerCase().trim();
            if (trimmed) {
                expandedInterests.push(trimmed);
                const parts = trimmed.split(/[_\s,]+/);
                for (const p of parts) {
                    if (p && p !== trimmed)
                        expandedInterests.push(p);
                }
            }
        }
    }
    const interests = Array.from(new Set(expandedInterests));
    // 5. Preferred Pace & Walking Tolerance
    let pace = "moderate";
    const rawPace = String(raw.preferredPace || raw.pacing || "moderate").toLowerCase().trim();
    if (rawPace === "relaxed") {
        pace = "relaxed";
    }
    else if (rawPace === "fast_paced" || rawPace === "fast") {
        pace = "fast_paced";
    }
    else {
        pace = "moderate";
    }
    const walkingTolerance = pace === "relaxed" ? "minimal" : pace === "fast_paced" ? "high" : "moderate";
    return {
        destination,
        destinationSlug,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        durationDays,
        travelers,
        travelType,
        budget,
        interests,
        foodPreferences: Array.isArray(raw.foodPreferences) ? raw.foodPreferences : [],
        walkingTolerance,
        accessibilityRequirements: Array.isArray(raw.accessibilityRequirements)
            ? raw.accessibilityRequirements
            : [],
        preferredTransport: Array.isArray(raw.preferredTransport) ? raw.preferredTransport : [],
        preferredPace: pace,
        specialRequests: Array.isArray(raw.specialRequests) ? raw.specialRequests : []
    };
}
