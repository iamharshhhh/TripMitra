import { StructuredTripRequirementsSchema, normalizeDestinationSlug } from "../../types/trip-requirements.types.js";
import { deduplicateInterests } from "../../utils/interest-normalizer.js";
import { logger } from "../../utils/logger.js";
import { StructuredTripRequirements, PartialTripRequirements } from "../../types/trip-requirements.types.js";

/**
 * Merges newly extracted requirements into existing stored requirements deterministically.
 *
 * Rules:
 * 1. Missing/undefined fields in incoming do NOT overwrite existing values.
 * 2. Explicit incoming values overwrite existing values.
 * 3. Array fields (interests, foodPreferences, etc.) are unioned without duplicates.
 * 4. destinationSlug is automatically kept synchronized with destination.
 * 5. Field provenance tracks which fields were updated.
 */
export function mergeRequirements(existing: Partial<StructuredTripRequirements> | null, incoming: PartialTripRequirements | null) {
    const base = existing ? { ...existing } : {};
    if (!incoming) {
        return base;
    }
    // 1. Destination & Slug
    if (incoming.destination !== undefined && incoming.destination.trim() !== "") {
        base.destination = incoming.destination.trim();
        base.destinationSlug = normalizeDestinationSlug(base.destination);
    }
    else if (incoming.destinationSlug !== undefined && !base.destinationSlug) {
        base.destinationSlug = normalizeDestinationSlug(incoming.destinationSlug);
    }
    // 2. Dates & Duration
    if (incoming.startDate !== undefined) {
        base.startDate = incoming.startDate;
    }
    if (incoming.endDate !== undefined) {
        base.endDate = incoming.endDate;
    }
    if (incoming.durationDays !== undefined && incoming.durationDays > 0) {
        base.durationDays = incoming.durationDays;
    }
    // 3. Travelers
    if (incoming.travelers !== undefined) {
        base.travelers = {
            total: incoming.travelers.total,
            adults: incoming.travelers.adults ?? base.travelers?.adults,
            children: incoming.travelers.children ?? base.travelers?.children,
            seniors: incoming.travelers.seniors ?? base.travelers?.seniors
        };
    }
    // 4. Travel Type
    if (incoming.travelType !== undefined) {
        base.travelType = incoming.travelType;
    }
    // 5. Budget
    if (incoming.budget !== undefined) {
        base.budget = {
            category: incoming.budget.category ?? base.budget?.category ?? "moderate",
            maxTotalAmount: incoming.budget.maxTotalAmount ?? base.budget?.maxTotalAmount,
            currency: incoming.budget.currency ?? base.budget?.currency ?? "INR"
        };
    }
    // 6. Walking Tolerance & Pace
    if (incoming.walkingTolerance !== undefined) {
        base.walkingTolerance = incoming.walkingTolerance;
    }
    if (incoming.preferredPace !== undefined) {
        base.preferredPace = incoming.preferredPace;
    }
    // 7. Accommodation & Timings
    if (incoming.accommodationArea !== undefined && incoming.accommodationArea.trim() !== "") {
        base.accommodationArea = incoming.accommodationArea.trim();
    }
    if (incoming.arrivalTime !== undefined && incoming.arrivalTime.trim() !== "") {
        base.arrivalTime = incoming.arrivalTime.trim();
    }
    if (incoming.departureTime !== undefined && incoming.departureTime.trim() !== "") {
        base.departureTime = incoming.departureTime.trim();
    }
    // 8. Array field merging (union)
    const mergeArrays = <T>(existingArr?: T[], incomingArr?: T[]): T[] => {
        const set = new Set<T>();
        (existingArr ?? []).forEach((item) => set.add(item));
        (incomingArr ?? []).forEach((item) => set.add(item));
        return Array.from(set);
    };
    if (incoming.interests !== undefined) {
        base.interests = deduplicateInterests([...(base.interests || []), ...incoming.interests]);
    }
    if (incoming.foodPreferences !== undefined) {
        base.foodPreferences = mergeArrays(base.foodPreferences, incoming.foodPreferences);
    }
    if (incoming.accessibilityRequirements !== undefined) {
        base.accessibilityRequirements = mergeArrays(base.accessibilityRequirements, incoming.accessibilityRequirements);
    }
    if (incoming.preferredTransport !== undefined) {
        base.preferredTransport = mergeArrays(base.preferredTransport, incoming.preferredTransport) as string[];
    }
    if (incoming.specialRequests !== undefined) {
        base.specialRequests = mergeArrays(base.specialRequests, incoming.specialRequests) as string[];
    }
    // 9. Provenance merging
    base.provenance = {
        ...(base.provenance ?? {}),
        ...(incoming.provenance ?? {})
    };
    logger.debug({
        destination: base.destination,
        durationDays: base.durationDays,
        travelers: base.travelers?.total
    }, "Requirements merged successfully");
    // Attempt validation with strict schema if minimum fields exist
    const parseResult = StructuredTripRequirementsSchema.safeParse(base);
    if (parseResult.success) {
        return parseResult.data;
    }
    // If partial, return the valid merged partial state
    return base;
}
