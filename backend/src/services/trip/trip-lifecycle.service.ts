import { deriveEndDate } from "../../utils/date-parser.js";

export type TripLifecycleState = "PLANNING" | "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface TripLifecycleInfo {
    state: TripLifecycleState;
    daysUntilStart?: number;
    currentDayNumber?: number;
    totalDays: number;
    startDateIso?: string;
    endDateIso?: string;
    isActionableToday: boolean;
}

/**
 * Single source of truth for Trip Lifecycle calculations across UI presenters and Location/Navigation services.
 */
export class TripLifecycleService {
    /**
     * Normalizes a date or date-string to YYYY-MM-DD in local/provided calendar.
     */
    static normalizeToIsoDate(d: Date | string | undefined | null) {
        if (!d)
            return undefined;
        if (d instanceof Date) {
            if (isNaN(d.getTime()))
                return undefined;
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        }
        const str = String(d).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return str;
        }
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, "0");
            const day = String(parsed.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        }
        return undefined;
    }
    /**
     * Calculates the exact lifecycle state of a trip relative to a reference date.
     */
    static calculateLifecycle(trip: any, targetDate = new Date()) {
        if (!trip) {
            return {
                state: "COMPLETED",
                totalDays: 0,
                isActionableToday: false
            };
        }
        const status = String(trip.status || "").toLowerCase();
        const req = (trip.requirements || trip || {});
        const durationDays = Number(req.durationDays) || (trip.itinerarySnapshot?.days?.length) || 1;
        // 1. Explicit Cancelled State
        if (status === "cancelled") {
            return {
                state: "CANCELLED",
                totalDays: durationDays,
                isActionableToday: false
            };
        }
        // 2. Explicit Completed Status
        if (status === "completed") {
            return {
                state: "COMPLETED",
                totalDays: durationDays,
                isActionableToday: false
            };
        }
        // 3. Planning State (collecting requirements / not yet confirmed)
        const hasItinerary = Boolean(trip.itinerarySnapshot?.days && trip.itinerarySnapshot.days.length > 0);
        const isConfirmed = status === "confirmed" || status === "active" || (trip.planningState === "completed" && hasItinerary);
        if (!isConfirmed && (status === "planning" || trip.planningState === "collecting_requirements")) {
            return {
                state: "PLANNING",
                totalDays: durationDays,
                isActionableToday: false
            };
        }
        // 4. Date-based calculation for Confirmed / Active trips
        const startDateRaw = req.startDate || trip.startDate;
        const startDateIso = TripLifecycleService.normalizeToIsoDate(startDateRaw);
        const todayIso = TripLifecycleService.normalizeToIsoDate(targetDate) ||
            TripLifecycleService.normalizeToIsoDate(new Date());
        if (!startDateIso) {
            // If dates are not set yet on a confirmed trip, treat as upcoming/actionable based on status
            return {
                state: "UPCOMING",
                totalDays: durationDays,
                isActionableToday: false
            };
        }
        const endDateIso = TripLifecycleService.normalizeToIsoDate(trip.endDate) ||
            deriveEndDate(startDateIso, durationDays);
        if (todayIso < startDateIso) {
            // Future trip (today < startDate) -> UPCOMING
            const [ty, tm, td] = todayIso.split("-").map(Number);
            const [sy, sm, sd] = startDateIso.split("-").map(Number);
            const todayUtc = Date.UTC(ty, tm - 1, td);
            const startUtc = Date.UTC(sy, sm - 1, sd);
            const diffMs = startUtc - todayUtc;
            const daysUntilStart = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
            return {
                state: "UPCOMING",
                daysUntilStart,
                totalDays: durationDays,
                startDateIso,
                endDateIso,
                isActionableToday: false
            };
        }
        if (todayIso > endDateIso) {
            // Past trip (today > endDate) -> COMPLETED
            return {
                state: "COMPLETED",
                totalDays: durationDays,
                startDateIso,
                endDateIso,
                isActionableToday: false
            };
        }
        // Current trip (startDate <= today <= endDate) -> ACTIVE
        const [ty, tm, td] = todayIso.split("-").map(Number);
        const [sy, sm, sd] = startDateIso.split("-").map(Number);
        const todayUtc = Date.UTC(ty, tm - 1, td);
        const startUtc = Date.UTC(sy, sm - 1, sd);
        const diffMs = todayUtc - startUtc;
        const dayIndex = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
        const currentDayNumber = Math.min(durationDays, Math.max(1, dayIndex));
        return {
            state: "ACTIVE",
            currentDayNumber,
            totalDays: durationDays,
            startDateIso,
            endDateIso,
            isActionableToday: true
        };
    }
    /**
     * Helper: Determines if a trip is strictly active today.
     */
    static isActiveTripToday(trip: any, targetDate = new Date()) {
        return TripLifecycleService.calculateLifecycle(trip, targetDate).state === "ACTIVE";
    }
    /**
     * Helper: Determines if a trip is upcoming.
     */
    static isUpcomingTrip(trip: any, targetDate = new Date()) {
        return TripLifecycleService.calculateLifecycle(trip, targetDate).state === "UPCOMING";
    }
    /**
     * Helper: Determines if a trip is eligible for cancellation based on persisted status.
     * - Confirmed, Active, or Planning trips: cancellable (true)
     * - Completed or Cancelled trips: not cancellable (false)
     */
    static isCancellableTrip(trip: any) {
        if (!trip)
            return false;
        const status = String(trip.status || "").toLowerCase();
        if (status === "completed" || status === "cancelled") {
            return false;
        }
        if (status === "confirmed" || status === "active" || status === "planning") {
            return true;
        }
        return false;
    }
}
