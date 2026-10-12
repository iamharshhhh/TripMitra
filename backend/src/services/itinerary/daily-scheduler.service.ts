import { CandidatePlace } from "../../types/candidate-place.types.js";
import { GeographicGroupingService } from "./geographic-grouping.service.js";
import { haversineDistanceMeters } from "../../utils/geography.js";
import { logger } from "../../utils/logger.js";
import { StructuredTripRequirements, PartialTripRequirements } from "../../types/trip-requirements.types.js";
import { ItinerarySchedulingConfig } from "./itinerary-scheduling.types.js";

export const DEFAULT_SCHEDULING_CONFIG = {
    clusterRadiusMeters: 5000,
    dayStartTime: "09:00",
    dayEndTime: "18:00",
    defaultVisitDurationMinutes: 90,
    defaultMealDurationMinutes: 60,
    travelBufferMinutes: 20,
    planningSpeedKmH: 20,
    maxPlacesPerDay: {
        relaxed: 3,
        moderate: 4,
        fast_paced: 5
    }
};
/**
 * Converts "HH:MM" string to minutes from midnight.
 */
export function timeToMinutes(timeStr: string) {
    const parts = timeStr.trim().split(":");
    const hours = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    return hours * 60 + mins;
}
/**
 * Converts minutes from midnight to "HH:MM".
 */
export function minutesToTime(totalMins: number) {
    const normalized = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMins)));
    const hours = Math.floor(normalized / 60);
    const mins = normalized % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}
/**
 * Adds days to a YYYY-MM-DD date string deterministically without timezone issues.
 */
export function addDaysToDate(dateStr: string, daysToAdd: number) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + daysToAdd);
    const y = date.getUTCFullYear();
    const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const d = date.getUTCDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
}
/**
 * Parses structured opening hours string (e.g. "09:00-17:00" or "09:00 - 18:00") if present.
 * Returns null if absent or insufficiently structured.
 */
export function parseStructuredHours(hours: string | string[]) {
    if (!hours)
        return null;
    const rawStr = Array.isArray(hours) ? hours[0] : hours;
    if (typeof rawStr !== "string")
        return null;
    // Check 24-hr format like "09:00-17:00" or "09:00 - 18:00" or overnight "18:00-02:00"
    const match24 = rawStr.match(/(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})/i);
    if (match24) {
        const openMinutes = timeToMinutes(match24[1]);
        let closeMinutes = timeToMinutes(match24[2]);
        if (closeMinutes <= openMinutes) {
            closeMinutes += 24 * 60;
        }
        return {
            openMinutes,
            closeMinutes
        };
    }
    return null;
}
function isDiningCandidate(candidate: any) {
    if (getPlaceTimeOfDaySuitability(candidate) === "night")
        return false;
    if (candidate.category === "restaurant")
        return true;
    const types = candidate.provenance?.googleDetails?.types || [];
    return types.some((t: string) => ["restaurant", "cafe", "food", "bakery", "meal_takeaway"].includes(t));
}
/**
 * Determines natural time-of-day suitability for a candidate place based primarily on real place data:
 * 1. Actual operating hours
 * 2. Place-specific name and description signals (sunrise, temple, sunset, night market, club, camping)
 * 3. Place categories and Google Place types
 * 4. Fallback default
 */
export function getPlaceTimeOfDaySuitability(candidate: CandidatePlace) {
    if (candidate.timeOfDaySuitability) {
        return candidate.timeOfDaySuitability;
    }
    const structuredHours = parseStructuredHours(candidate.openingHours);
    const name = (candidate.name || "").toLowerCase();
    const desc = (candidate.description || "").toLowerCase();
    const cat = (candidate.category || "").toLowerCase();
    const googleTypes = (candidate.provenance?.googleDetails?.types || []).map((t) => t.toLowerCase());
    // 1. Operating hours strong signals
    if (structuredHours) {
        // If it opens at 18:00 (1080 min) or later, or opens in late afternoon (>= 17:00) and closes after midnight
        if (structuredHours.openMinutes >= 1080 ||
            (structuredHours.closeMinutes > 1440 && structuredHours.openMinutes >= 1020) ||
            (structuredHours.closeMinutes <= 360 && structuredHours.openMinutes >= 1020)) {
            return "night";
        }
    }
    // 2. Night Experience Signals (nightclub, night market, camping, nightlife, pub, bar, lounge, stargazing)
    const nonNightBarPattern = /\b(juice\s+bar|coffee\s+bar|tea\s+bar|salad\s+bar|snack\s+bar|milk\s+bar|ice\s+cream\s+bar|chocolate\s+bar|chaat\s+bar|espresso\s+bar|smoothie\s+bar)\b/i;
    const isNonNightBar = nonNightBarPattern.test(name) || nonNightBarPattern.test(desc);
    const hasExplicitNightKeyword =
        /\b(night\s*club|nightclub|night\s*market|night\s*bazaar|nightlife|pub|pubs|brewpub|microbrewery|taproom|lounge|discotheque|camping|stargazing|restobar|restro\s*bar|gastro\s*bar)\b/i.test(name) ||
        /\b(night\s*club|nightclub|night\s*market|night\s*bazaar|nightlife|late\s*night|sound\s+and\s+light\s+show|camping|stargazing|pub|lounge|microbrewery)\b/i.test(desc) ||
        (!isNonNightBar && /\bbar\b/i.test(name));
    const hasNightGoogleType =
        googleTypes.some((t) => t.includes("night_club") || t.includes("campground")) ||
        (googleTypes.includes("bar") &&
            (!googleTypes.includes("restaurant") ||
                hasExplicitNightKeyword ||
                Boolean(structuredHours && structuredHours.openMinutes >= 1020)));
    if (hasExplicitNightKeyword || hasNightGoogleType) {
        return "night";
    }
    // 3. Morning Signals (Sunrise, early morning, temple, mandir, ashram, spiritual prayer)
    if (googleTypes.some((t) => t.includes("worship") || t.includes("temple") || t.includes("church") || t.includes("mosque")) ||
        name.includes("temple") ||
        name.includes("mandir") ||
        name.includes("ashram") ||
        name.includes("basilica") ||
        name.includes("cathedral") ||
        name.includes("sunrise") ||
        name.includes("morning walk") ||
        desc.includes("spiritual") ||
        desc.includes("early morning") ||
        desc.includes("sunrise") ||
        desc.includes("aarti")) {
        return "morning";
    }
    // 4. Evening / Sunset Signals (Sunset point, beach sunset, promenade, waterfront, lakefront, evening breeze)
    if (name.includes("sunset") ||
        name.includes("sunset point") ||
        desc.includes("sunset") ||
        name.includes("promenade") ||
        name.includes("rock beach") ||
        desc.includes("coastal breeze") ||
        desc.includes("evening walk") ||
        desc.includes("evening lights")) {
        return "sunset_evening";
    }
    // 5. Afternoon Signals (Indoor museums, art galleries, indoor shopping, handicrafts)
    if (googleTypes.some((t) => t.includes("museum") || t.includes("art_gallery") || t.includes("shopping_mall")) ||
        name.includes("museum") ||
        name.includes("gallery") ||
        cat === "shopping") {
        return "afternoon";
    }
    return "any";
}
/**
 * Validates whether a candidate can legitimately and feasibly be scheduled in a specific slot.
 */
export function isCandidateSuitableForSlot(candidate: CandidatePlace, slot: "morning" | "afternoon" | "sunset_evening" | "night" | "any", slotStartMinutes: number, slotEndMinutes: number) {
    const hours = parseStructuredHours(candidate.openingHours);
    if (hours && slotStartMinutes !== undefined && slotEndMinutes !== undefined) {
        if (hours.openMinutes >= slotEndMinutes)
            return false;
        if (hours.closeMinutes <= slotStartMinutes)
            return false;
    }
    const suitability = getPlaceTimeOfDaySuitability(candidate);
    // Night-only places (nightclubs, pubs, bars, night markets, camping) MUST NOT be scheduled in daytime slots
    if (suitability === "night" && slot !== "night") {
        return false;
    }
    // Night slots are exclusively for night venues or nightlife activities
    if (slot === "night" && suitability !== "night") {
        return false;
    }
    // If slot is morning and place opens after 12:00
    if (slot === "morning" && hours && hours.openMinutes >= timeToMinutes("12:00")) {
        return false;
    }
    // If slot is afternoon and place closes before 13:00
    if (slot === "afternoon" && hours && hours.closeMinutes <= timeToMinutes("13:00")) {
        return false;
    }
    return true;
}
/**
 * Evaluates match score between candidate and time slot for prioritizing natural distribution.
 */
export function scoreSlotFit(cand: CandidatePlace, slot: "morning" | "afternoon" | "sunset_evening" | "night" | "any", isHighRain: boolean) {
    const suit = getPlaceTimeOfDaySuitability(cand);
    // Night places are strict: score 0 for daytime slots, high score for night
    if (suit === "night") {
        if (slot === "night")
            return 5;
        if (slot === "sunset_evening")
            return 2;
        return 0; // cannot be morning or afternoon
    }
    // If slot is night, but place is a daytime museum or morning temple
    if (slot === "night") {
        if (suit === "morning" || suit === "afternoon")
            return 0;
        if (suit === "sunset_evening")
            return 2;
        return 1;
    }
    // Weather awareness
    if (isHighRain && cand.indoor === true) {
        if (slot === "afternoon" || slot === "morning")
            return 5;
    }
    if (isHighRain && cand.indoor === false && (suit === "sunset_evening" || cand.category === "nature")) {
        return 0;
    }
    if (slot === "any")
        return 3;
    if (slot === suit)
        return 5;
    if (suit === "any")
        return 4;
    if ((slot === "morning" && suit === "sunset_evening") || (slot === "sunset_evening" && suit === "morning"))
        return 1;
    return 2;
}
/**
 * Estimates exploration duration according to attraction category and characteristics
 * when no reliable candidate-specific duration exists.
 */
export function inferCandidateVisitDuration(candidate: CandidatePlace) {
    if (typeof candidate.estimatedVisitDurationMinutes === "number" &&
        candidate.estimatedVisitDurationMinutes > 0) {
        return candidate.estimatedVisitDurationMinutes;
    }
    const name = (candidate.name || "").toLowerCase();
    const desc = (candidate.description || "").toLowerCase();
    const cat = (candidate.category || "").toLowerCase();
    const googleTypes = (candidate.provenance?.googleDetails?.types || []).map((t) => t.toLowerCase());
    // 1. Quick stops (45–60 min, default 45 min)
    // Viewpoints, statues, memorials, photo points, small bazaars / markets
    if (googleTypes.some((t) => ["shopping_mall", "store", "point_of_interest"].includes(t)) ||
        cat === "market" ||
        cat === "memorial" ||
        cat === "viewpoint" ||
        name.includes("viewpoint") ||
        name.includes("photo point") ||
        name.includes("statue") ||
        name.includes("memorial") ||
        name.includes("market") ||
        name.includes("bazaar") ||
        name.includes("lookout")) {
        return 45;
    }
    // 2. Major venues / large complexes (150–210 min, default 180 min = 3h)
    // Forts, palaces, national parks, wildlife sanctuaries, zoos, theme parks, amusement parks, hiking trails
    if (googleTypes.some((t) => ["national_park", "zoo", "amusement_park", "theme_park", "aquarium", "hiking_area", "campground"].includes(t)) ||
        cat === "nature_reserve" ||
        cat === "theme_park" ||
        name.includes("national park") ||
        name.includes("wildlife") ||
        name.includes("sanctuary") ||
        name.includes("fort") ||
        name.includes("palace") ||
        name.includes("safari") ||
        name.includes("trek") ||
        desc.includes("national park") ||
        desc.includes("vast complex") ||
        desc.includes("hiking trail")) {
        return 180;
    }
    // 3. Substantial cultural / heritage sites (90–120 min, default 90 min)
    // Major museums, historical monuments, large temple/heritage complexes, art galleries, caves
    if (googleTypes.some((t) => ["museum", "art_gallery", "hindu_temple", "church", "mosque"].includes(t)) ||
        cat === "historical" ||
        cat === "museum" ||
        cat === "religious" ||
        cat === "heritage" ||
        name.includes("museum") ||
        name.includes("monument") ||
        name.includes("ashram") ||
        name.includes("temple") ||
        name.includes("mandir") ||
        name.includes("caves") ||
        name.includes("basilica") ||
        name.includes("cathedral") ||
        desc.includes("historical monument") ||
        desc.includes("heritage site")) {
        return 90;
    }
    // 4. Standard attractions / nature (60–90 min, default 75 min)
    // Beaches, botanical gardens, promenades, lakefronts, parks, waterfalls
    if (googleTypes.some((t) => ["park", "tourist_attraction"].includes(t)) ||
        cat === "beach" ||
        cat === "nature" ||
        name.includes("beach") ||
        name.includes("promenade") ||
        name.includes("lake") ||
        name.includes("waterfall") ||
        name.includes("garden") ||
        desc.includes("beach") ||
        desc.includes("scenic") ||
        desc.includes("waterfront")) {
        return 75;
    }
    return 90;
}
export class DailySchedulerService {
    groupingService;
    config;
    constructor(groupingService?: GeographicGroupingService, config?: Partial<ItinerarySchedulingConfig>) {
        this.groupingService =
            groupingService ??
                new GeographicGroupingService(config?.clusterRadiusMeters ?? DEFAULT_SCHEDULING_CONFIG.clusterRadiusMeters);
        this.config = {
            ...DEFAULT_SCHEDULING_CONFIG,
            ...(config || {})
        };
    }
    /**
     * Transforms ranked CandidatePlace[] into period-aware daily schedules with explicit meals.
     */
    scheduleItinerary(requirements: StructuredTripRequirements | PartialTripRequirements, candidates: CandidatePlace[], customConfig?: Partial<ItinerarySchedulingConfig>) {
        const config = {
            ...this.config,
            ...(customConfig || {})
        };
        const warnings = [];
        const unscheduledCandidates = [];
        // -------------------------------------------------------------
        // 1. Determine Trip Duration and Dates
        // -------------------------------------------------------------
        let totalDays = 0;
        const concreteDates = [];
        if (requirements.startDate && requirements.endDate) {
            const startMs = new Date(requirements.startDate).getTime();
            const endMs = new Date(requirements.endDate).getTime();
            totalDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
            for (let d = 0; d < totalDays; d++) {
                concreteDates.push(addDaysToDate(requirements.startDate, d));
            }
        }
        else if (requirements.durationDays && requirements.durationDays > 0) {
            totalDays = requirements.durationDays;
            if (requirements.startDate) {
                for (let d = 0; d < totalDays; d++) {
                    concreteDates.push(addDaysToDate(requirements.startDate, d));
                }
            }
        }
        if (totalDays <= 0) {
            // Neither dates nor duration is known: return diagnostic
            for (const candidate of candidates) {
                unscheduledCandidates.push({
                    candidate,
                    reason: "no_trip_dates_or_duration",
                    details: { message: "Trip dates or durationDays must be provided to schedule an itinerary" }
                });
            }
            return {
                dailySchedules: [],
                unscheduledCandidates,
                geographicClusters: [],
                diagnostics: {
                    totalCandidates: candidates.length,
                    scheduledPlacesCount: 0,
                    unscheduledCount: candidates.length,
                    clustersCount: 0,
                    plannedDaysCount: 0,
                    warnings: ["Trip dates or duration are missing; scheduling aborted."]
                }
            };
        }
        // -------------------------------------------------------------
        // 2. Geographic Grouping
        // -------------------------------------------------------------
        const grouping = this.groupingService.groupCandidates(candidates, config.clusterRadiusMeters);
        // Candidates with missing coordinates are safely separated
        for (const unlocatable of grouping.unlocatableCandidates) {
            unscheduledCandidates.push({
                candidate: unlocatable,
                reason: "location_unavailable",
                details: { message: "Candidate lacks valid GPS coordinates for geographic scheduling" }
            });
        }
        const clusters = grouping.clusters;
        const candidateMap = new Map();
        for (const c of candidates) {
            candidateMap.set(c.placeId, c);
        }
        // -------------------------------------------------------------
        // 3. Setup Daily Capacity and Windows
        // -------------------------------------------------------------
        const pace = requirements.preferredPace || "moderate";
        const maxPlacesPerDay = config.maxPlacesPerDay[pace] || config.maxPlacesPerDay.moderate;
        const dailySchedules = [];
        const scheduledPlaceIds = new Set();
        // -------------------------------------------------------------
        // 4. Daily Allocation Loop (Period-Aware: Morning, Lunch, Afternoon, Evening/Dinner)
        // -------------------------------------------------------------
        for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
            const dayNumber = dayIdx + 1;
            const isFirstDay = dayNumber === 1;
            const isLastDay = dayNumber === totalDays;
            // Determine day time boundaries (handling arrival/departure constraints)
            let dayStartMinutes = timeToMinutes(config.dayStartTime);
            if (isFirstDay && requirements.arrivalTime) {
                const arrivalMins = timeToMinutes(requirements.arrivalTime);
                dayStartMinutes = Math.max(dayStartMinutes, arrivalMins);
            }
            let dayEndMinutes = timeToMinutes(config.dayEndTime);
            if (isLastDay && requirements.departureTime) {
                const departureMins = timeToMinutes(requirements.departureTime);
                dayEndMinutes = Math.min(dayEndMinutes, departureMins);
            }
            let currentMinutes = dayStartMinutes;
            // Select primary cluster for this day
            let primaryCluster;
            let highestRank = -1;
            for (const cluster of clusters) {
                const unassignedInCluster = cluster.candidateIds.filter((id) => !scheduledPlaceIds.has(id));
                if (unassignedInCluster.length > 0) {
                    const firstCandId = unassignedInCluster[0];
                    const rank = candidates.findIndex((c) => c.placeId === firstCandId);
                    if (highestRank === -1 || (rank !== -1 && rank < highestRank)) {
                        highestRank = rank;
                        primaryCluster = cluster;
                    }
                }
            }
            const dayPlaces = [];
            let totalVisitMinutes = 0;
            let totalTravelMinutes = 0;
            const dayWeatherSummary = config.dayWeatherSummaries?.[dayNumber];
            const isHighRain = dayWeatherSummary?.precipitationProbability !== undefined && dayWeatherSummary.precipitationProbability >= 50;
            // Helper to find the last place that has physical coordinates for distance calculations
            const getLastLocatablePlace = () => {
                for (let i = dayPlaces.length - 1; i >= 0; i--) {
                    const p = dayPlaces[i];
                    if (p.candidate.location?.latitude && p.candidate.location?.longitude) {
                        return p;
                    }
                }
                return undefined;
            };
            // Helper: Attempt to schedule a candidate
            const tryScheduleCandidate = (candidate: any, periodCapMinutes: any, overrideActivityType?: any, overrideMealType?: any, minStartMinutes?: any, overridePeriod?: any) => {
                if (scheduledPlaceIds.has(candidate.placeId))
                    return false;
                const lastPlace = dayPlaces[dayPlaces.length - 1];
                const lastEnd = lastPlace ? timeToMinutes(lastPlace.endTime) : dayStartMinutes;
                let candidateStartBase = Math.max(currentMinutes, lastEnd);
                if (minStartMinutes && candidateStartBase < minStartMinutes) {
                    candidateStartBase = minStartMinutes;
                }
                const departureCutoffMins = isLastDay && requirements.departureTime ? timeToMinutes(requirements.departureTime) : 24 * 60;
                if (candidateStartBase >= periodCapMinutes || candidateStartBase >= departureCutoffMins) {
                    return false;
                }
                const lastLocatable = getLastLocatablePlace();
                const prevPlace = lastLocatable?.candidate;
                // Travel estimation
                let travelDistanceMeters = 0;
                let travelTimeMinutes = 0;
                let travelEstimationSource = "buffer_only";
                if (prevPlace &&
                    prevPlace.location?.latitude &&
                    prevPlace.location?.longitude &&
                    candidate.location?.latitude &&
                    candidate.location?.longitude) {
                    travelDistanceMeters = haversineDistanceMeters(prevPlace.location.latitude, prevPlace.location.longitude, candidate.location.latitude, candidate.location.longitude);
                    const transitMinutes = Math.round((travelDistanceMeters / 1000 / config.planningSpeedKmH) * 60);
                    travelTimeMinutes = Math.max(config.travelBufferMinutes, transitMinutes);
                    travelEstimationSource = "geographic_estimate";
                }
                // Duration
                let durationMinutes = config.defaultVisitDurationMinutes;
                let durationSource = "default_assumption";
                if (overrideMealType) {
                    durationMinutes = config.defaultMealDurationMinutes || 60;
                }
                else if (typeof candidate.estimatedVisitDurationMinutes === "number" &&
                    candidate.estimatedVisitDurationMinutes > 0) {
                    durationMinutes = candidate.estimatedVisitDurationMinutes;
                    durationSource = "candidate";
                }
                else {
                    durationMinutes = inferCandidateVisitDuration(candidate);
                    durationSource = "default_assumption";
                }
                let placeStartMinutes = candidateStartBase + (lastPlace ? travelTimeMinutes : 0);
                // Opening hours check and clean start adjustment
                const structuredHours = parseStructuredHours(candidate.openingHours);
                if (structuredHours) {
                    if (placeStartMinutes < structuredHours.openMinutes) {
                        placeStartMinutes = structuredHours.openMinutes;
                    }
                    if (placeStartMinutes + durationMinutes > structuredHours.closeMinutes) {
                        return false;
                    }
                }
                const placeEndMinutes = placeStartMinutes + durationMinutes;
                const maxCutoff = overrideMealType === "dinner" || overridePeriod === "night"
                    ? Math.min(periodCapMinutes, departureCutoffMins)
                    : (dayPlaces.length === 0 && placeStartMinutes + durationMinutes <= Math.min(dayEndMinutes, departureCutoffMins))
                        ? Math.min(dayEndMinutes, departureCutoffMins)
                        : Math.min(periodCapMinutes, Math.min(dayEndMinutes, departureCutoffMins));
                if (placeEndMinutes > maxCutoff) {
                    return false;
                }
                const activityType = overrideActivityType ||
                    (isDiningCandidate(candidate) ? "restaurant" : "attraction");
                // Determine chronological time period
                let timePeriod = overridePeriod;
                if (!timePeriod) {
                    if (overrideMealType === "lunch")
                        timePeriod = "lunch";
                    else if (overrideMealType === "dinner")
                        timePeriod = "dinner";
                    else if (placeStartMinutes < timeToMinutes("12:30"))
                        timePeriod = "morning";
                    else if (placeStartMinutes < timeToMinutes("17:30"))
                        timePeriod = "afternoon";
                    else if (placeStartMinutes < timeToMinutes("20:30"))
                        timePeriod = "evening";
                    else
                        timePeriod = "night";
                }
                dayPlaces.push({
                    candidate,
                    dayNumber,
                    startTime: minutesToTime(placeStartMinutes),
                    endTime: minutesToTime(placeEndMinutes),
                    durationMinutes,
                    durationSource,
                    travelTimeMinutesFromPrevious: travelTimeMinutes,
                    travelDistanceMetersFromPrevious: travelDistanceMeters,
                    travelEstimationSource,
                    activityType,
                    mealType: overrideMealType,
                    timePeriod
                });
                scheduledPlaceIds.add(candidate.placeId);
                currentMinutes = placeEndMinutes;
                totalVisitMinutes += durationMinutes;
                totalTravelMinutes += travelTimeMinutes;
                return true;
            };
            // Multi-day distribution target & candidate preservation
            const remainingDays = totalDays - dayIdx;
            const remainingDaysAfterToday = totalDays - dayNumber;
            const unassignedAttractions = candidates.filter((c) => !scheduledPlaceIds.has(c.placeId) && !isDiningCandidate(c));
            // Distribute unassigned candidates evenly across remaining days
            const fairShare = Math.ceil(unassignedAttractions.length / remainingDays);
            const minReservePerFutureDay = unassignedAttractions.length >= remainingDays * 2 ? 2 : 1;
            const minReservedForFuture = remainingDaysAfterToday * minReservePerFutureDay;
            const maxAllowedToday = Math.max(1, unassignedAttractions.length - minReservedForFuture);
            // Today's attraction limit based on pace and multi-day equity
            const dailyAttractionCapacity = Math.min(maxPlacesPerDay, Math.min(Math.max(2, fairShare), maxAllowedToday));
            // Helper: Schedule next available sightseeing candidate in cluster or fallback pool
            const scheduleNextSightseeing = (periodCapMinutes, preferredSlot = "any") => {
                if (currentMinutes >= periodCapMinutes)
                    return false;
                const currentAttractionsList = dayPlaces.filter((p) => p.activityType === "attraction");
                const currentExplorationMins = currentAttractionsList.reduce((sum, p) => sum + p.durationMinutes, 0);
                // Substantial exploration check: if day already has >= 2 attractions and >= 240 min (4h) of pure exploration, do not force extra places
                if (currentAttractionsList.length >= 2 && currentExplorationMins >= 240) {
                    return false;
                }
                if (currentAttractionsList.length >= dailyAttractionCapacity) {
                    return false;
                }
                const sortPool = (pool) => {
                    return [...pool].sort((a, b) => scoreSlotFit(b, preferredSlot as any, isHighRain) - scoreSlotFit(a, preferredSlot as any, isHighRain));
                };
                const primaryPool = (primaryCluster?.candidateIds || [])
                    .filter((id) => !scheduledPlaceIds.has(id))
                    .map((id) => candidateMap.get(id))
                    .filter((c) => c && !isDiningCandidate(c))
                    .filter((c) => isCandidateSuitableForSlot(c, preferredSlot as any, currentMinutes, periodCapMinutes));
                for (const cand of sortPool(primaryPool)) {
                    if (tryScheduleCandidate(cand, periodCapMinutes, "attraction")) {
                        return true;
                    }
                }
                // Proximity-aware secondary cluster fallback (prevents cluster starvation)
                const lastLocatable = getLastLocatablePlace();
                const prevLat = lastLocatable?.candidate.location?.latitude;
                const prevLng = lastLocatable?.candidate.location?.longitude;
                const sortSecondaryPool = (pool) => {
                    return [...pool].sort((a, b) => {
                        const fitDiff = scoreSlotFit(b, preferredSlot as any, isHighRain) - scoreSlotFit(a, preferredSlot as any, isHighRain);
                        if (fitDiff !== 0)
                            return fitDiff;
                        if (prevLat !== undefined && prevLng !== undefined) {
                            const distA = a.location?.latitude && a.location?.longitude
                                ? haversineDistanceMeters(prevLat, prevLng, a.location.latitude, a.location.longitude)
                                : 10000;
                            const distB = b.location?.latitude && b.location?.longitude
                                ? haversineDistanceMeters(prevLat, prevLng, b.location.latitude, b.location.longitude)
                                : 10000;
                            return distA - distB;
                        }
                        return 0;
                    });
                };
                const currentAttractionCount = currentAttractionsList.length;
                const unassignedAttractionsCount = candidates.filter((c) => !scheduledPlaceIds.has(c.placeId) && !isDiningCandidate(c)).length;
                // Allow fallback to secondary clusters if:
                // 1. Today has < 2 attractions (anti-underpopulation guarantee)
                // 2. Or this is the last day
                // 3. Or current attraction count is less than today's equity capacity AND remaining days won't be starved
                const canFallbackToSecondary = currentAttractionCount < 2 ||
                    remainingDaysAfterToday === 0 ||
                    (currentAttractionCount < dailyAttractionCapacity && unassignedAttractionsCount > remainingDaysAfterToday * 1);
                if (canFallbackToSecondary) {
                    const secondaryPool = candidates
                        .filter((c) => !scheduledPlaceIds.has(c.placeId) && !isDiningCandidate(c))
                        .filter((c) => Boolean(c.location?.latitude && c.location?.longitude))
                        .filter((c) => isCandidateSuitableForSlot(c, preferredSlot as any, currentMinutes, periodCapMinutes));
                    for (const cand of sortSecondaryPool(secondaryPool)) {
                        if (tryScheduleCandidate(cand, periodCapMinutes, "attraction")) {
                            return true;
                        }
                    }
                    // If no locatable non-dining candidate fits, try any remaining unassigned candidate
                    const anyPool = candidates
                        .filter((c) => !scheduledPlaceIds.has(c.placeId) && !isDiningCandidate(c))
                        .filter((c) => isCandidateSuitableForSlot(c, preferredSlot as any, currentMinutes, periodCapMinutes));
                    for (const cand of sortSecondaryPool(anyPool)) {
                        if (tryScheduleCandidate(cand, periodCapMinutes, "attraction")) {
                            return true;
                        }
                    }
                }
                return false;
            };
            // Helper: Schedule a meal (Lunch or Dinner)
            const shouldAddGenericMeals = customConfig?.includeGenericMeals ??
                (config.includeGenericMeals !== undefined
                    ? config.includeGenericMeals
                    : Boolean(requirements.destinationSlug || requirements.destination));
            const scheduleMeal = (mealType: "lunch" | "dinner", idealStartMinutes: number, mealDurationMinutes: number, mealEndLimitMinutes = dayEndMinutes) => {
                if (currentMinutes >= mealEndLimitMinutes)
                    return;
                // Try to find a verified restaurant candidate
                const diningCandidates = candidates.filter((c) => !scheduledPlaceIds.has(c.placeId) && isDiningCandidate(c));
                let restaurantScheduled = false;
                for (const cand of diningCandidates) {
                    if (tryScheduleCandidate(cand, mealEndLimitMinutes, "restaurant", mealType, idealStartMinutes, mealType)) {
                        restaurantScheduled = true;
                        break;
                    }
                }
                if (!restaurantScheduled && shouldAddGenericMeals) {
                    const lastPlace = dayPlaces[dayPlaces.length - 1];
                    const lastEnd = lastPlace ? timeToMinutes(lastPlace.endTime) : dayStartMinutes;
                    const mealStartMinutes = Math.max(idealStartMinutes, Math.max(currentMinutes, lastEnd));
                    const mealEndMinutes = mealStartMinutes + mealDurationMinutes;
                    if (mealEndMinutes > mealEndLimitMinutes)
                        return;
                    // Represent lunch/dinner as a clean generic meal entry without fabricated place data or fake coordinates
                    const mealName = mealType === "lunch" ? "Lunch & Rest Break" : "Dinner & Leisure";
                    const genericMealCandidate = {
                        placeId: `${mealType}-day-${dayNumber}`,
                        name: mealName,
                        destinationSlug: requirements.destinationSlug || "trip",
                        category: "restaurant",
                        location: {},
                        source: "knowledge_base",
                        provenance: { sources: [] }
                    };
                    dayPlaces.push({
                        candidate: genericMealCandidate,
                        dayNumber,
                        startTime: minutesToTime(mealStartMinutes),
                        endTime: minutesToTime(mealEndMinutes),
                        durationMinutes: mealDurationMinutes,
                        durationSource: "default_assumption",
                        travelTimeMinutesFromPrevious: 0,
                        travelDistanceMetersFromPrevious: 0,
                        travelEstimationSource: "buffer_only",
                        activityType: "meal",
                        mealType,
                        timePeriod: mealType
                    });
                    currentMinutes = mealEndMinutes;
                    totalVisitMinutes += mealDurationMinutes;
                }
            };
            // Check if semantic plan from Gemini/AIProvider exists for this day
            const dayPlan = config.semanticPlan?.days?.find((d) => d.day === dayNumber);
            const semanticMorning = (dayPlan?.activities || [])
                .filter((a) => a.period === "morning")
                .map((a) => candidateMap.get(a.candidateId))
                .filter(Boolean);
            const semanticAfternoon = (dayPlan?.activities || [])
                .filter((a) => a.period === "afternoon")
                .map((a) => candidateMap.get(a.candidateId))
                .filter(Boolean);
            const semanticEvening = (dayPlan?.activities || [])
                .filter((a) => a.period === "evening")
                .map((a) => candidateMap.get(a.candidateId))
                .filter(Boolean);
            // -------------------------------------------------------------
            // PERIOD 1: MORNING SIGHTSEEING (Start -> ~12:30)
            // -------------------------------------------------------------
            const hasAfternoonWindow = dayEndMinutes >= timeToMinutes("16:00");
            const maxMorningAttractions = hasAfternoonWindow
                ? (dailyAttractionCapacity <= 2 ? 1 : Math.min(2, Math.ceil(dailyAttractionCapacity / 2)))
                : dailyAttractionCapacity;
            if (dayStartMinutes < timeToMinutes("12:00")) {
                const morningCap = Math.min(dayEndMinutes, timeToMinutes("12:30"));
                // 1. Try places from semantic plan
                for (const cand of semanticMorning) {
                    if (dayPlaces.filter((p) => p.activityType === "attraction").length < maxMorningAttractions &&
                        currentMinutes < morningCap - 30 &&
                        isCandidateSuitableForSlot(cand, "morning", currentMinutes, morningCap)) {
                        tryScheduleCandidate(cand, morningCap, "attraction", undefined, undefined, "morning");
                    }
                }
                // 2. Continuous time-budget packing with pool
                while (dayPlaces.filter((p) => p.activityType === "attraction").length < maxMorningAttractions &&
                    currentMinutes < morningCap - 30) {
                    if (!scheduleNextSightseeing(morningCap, "morning")) {
                        break;
                    }
                }
                // 3. HARD INVARIANT: NO EMPTY MORNING RECOVERY PASS
                // If Morning has 0 attractions and unassigned candidates exist, search all eligible candidates
                const hasMorningAttraction = dayPlaces.some((p) => p.activityType === "attraction" && timeToMinutes(p.startTime) < timeToMinutes("12:30"));
                if (!hasMorningAttraction &&
                    dayPlaces.filter((p) => p.activityType === "attraction").length < maxMorningAttractions &&
                    currentMinutes < morningCap - 30) {
                    const unassignedForMorning = candidates
                        .filter((c) => !scheduledPlaceIds.has(c.placeId) && !isDiningCandidate(c))
                        .filter((c) => isCandidateSuitableForSlot(c, "morning", currentMinutes, morningCap));
                    const sortedMorningPool = [...unassignedForMorning].sort((a, b) => {
                        return scoreSlotFit(b, "morning", isHighRain) - scoreSlotFit(a, "morning", isHighRain);
                    });
                    for (const cand of sortedMorningPool) {
                        if (tryScheduleCandidate(cand, morningCap, "attraction", undefined, undefined, "morning")) {
                            break;
                        }
                    }
                }
            }
            // -------------------------------------------------------------
            // PERIOD 2: LUNCH (12:30 -> 14:00)
            // -------------------------------------------------------------
            const hasSightseeingToday = dayPlaces.some((p) => p.activityType === "attraction");
            const isPartialArrival = isFirstDay && dayStartMinutes >= timeToMinutes("12:00");
            const unassignedAttractionsCount = candidates.filter((c) => !scheduledPlaceIds.has(c.placeId) && !isDiningCandidate(c)).length;
            // Ensure that on normal days, we attempt to schedule at least 1 attraction before lunch if candidates exist
            if (!hasSightseeingToday && !isPartialArrival && unassignedAttractionsCount > 0 && currentMinutes < timeToMinutes("12:30")) {
                scheduleNextSightseeing(Math.min(dayEndMinutes, timeToMinutes("12:30")), "morning");
            }
            const canHaveLunch = dayStartMinutes <= timeToMinutes("13:00") &&
                dayEndMinutes >= timeToMinutes("13:30") &&
                currentMinutes <= timeToMinutes("14:00") &&
                (dayPlaces.length > 0 || isPartialArrival || unassignedAttractionsCount === 0);
            if (canHaveLunch) {
                const lunchDuration = pace === "fast_paced" ? 45 : 60;
                const lunchStart = Math.max(timeToMinutes("12:30"), currentMinutes);
                scheduleMeal("lunch", lunchStart, lunchDuration);
            }
            // -------------------------------------------------------------
            // PERIOD 3: AFTERNOON SIGHTSEEING (13:30 -> 17:30)
            // -------------------------------------------------------------
            if (currentMinutes < dayEndMinutes && currentMinutes < timeToMinutes("17:30")) {
                const afternoonCap = Math.min(dayEndMinutes, timeToMinutes("17:30"));
                // 1. Try places from semantic plan
                for (const cand of semanticAfternoon) {
                    if (dayPlaces.filter((p) => p.activityType === "attraction").length < dailyAttractionCapacity &&
                        currentMinutes < afternoonCap - 30 &&
                        isCandidateSuitableForSlot(cand, "afternoon", currentMinutes, afternoonCap)) {
                        tryScheduleCandidate(cand, afternoonCap, "attraction", undefined, undefined, "afternoon");
                    }
                }
                // 2. Continuous time-budget packing
                while (dayPlaces.filter((p) => p.activityType === "attraction").length < dailyAttractionCapacity &&
                    currentMinutes < afternoonCap - 30) {
                    if (!scheduleNextSightseeing(afternoonCap, "afternoon")) {
                        break;
                    }
                }
                // 3. HARD INVARIANT: NO EMPTY AFTERNOON RECOVERY PASS
                // If Afternoon has 0 attractions and unassigned candidates exist, search all eligible candidates
                const hasAfternoonAttraction = dayPlaces.some((p) => p.activityType === "attraction" &&
                    timeToMinutes(p.endTime) >= timeToMinutes("13:30") &&
                    timeToMinutes(p.startTime) < timeToMinutes("17:30"));
                if (!hasAfternoonAttraction &&
                    dayPlaces.filter((p) => p.activityType === "attraction").length < dailyAttractionCapacity &&
                    currentMinutes < afternoonCap - 30) {
                    const unassignedForAfternoon = candidates
                        .filter((c) => !scheduledPlaceIds.has(c.placeId) && !isDiningCandidate(c))
                        .filter((c) => isCandidateSuitableForSlot(c, "afternoon", currentMinutes, afternoonCap));
                    const sortedAfternoonPool = [...unassignedForAfternoon].sort((a, b) => {
                        return scoreSlotFit(b, "afternoon", isHighRain) - scoreSlotFit(a, "afternoon", isHighRain);
                    });
                    for (const cand of sortedAfternoonPool) {
                        if (tryScheduleCandidate(cand, afternoonCap, "attraction", undefined, undefined, "afternoon")) {
                            break;
                        }
                    }
                }
            }
            // -------------------------------------------------------------
            // PERIOD 4: EVENING SIGHTSEEING (17:30 -> 19:30)
            // -------------------------------------------------------------
            const departureCutoff = isLastDay && requirements.departureTime ? timeToMinutes(requirements.departureTime) : 24 * 60;
            if (departureCutoff >= timeToMinutes("18:00") && currentMinutes < timeToMinutes("19:30")) {
                const eveningActivityCap = Math.min(dayEndMinutes, Math.min(departureCutoff, timeToMinutes("19:30")));
                // 1. Try places from semantic plan
                for (const cand of semanticEvening) {
                    if (dayPlaces.filter((p) => p.activityType === "attraction").length < dailyAttractionCapacity &&
                        currentMinutes < eveningActivityCap - 30 &&
                        isCandidateSuitableForSlot(cand, "sunset_evening", currentMinutes, eveningActivityCap)) {
                        tryScheduleCandidate(cand, eveningActivityCap, "attraction", undefined, undefined, "evening");
                    }
                }
                // 2. Continuous evening time-budget packing
                while (dayPlaces.filter((p) => p.activityType === "attraction").length < dailyAttractionCapacity &&
                    currentMinutes < eveningActivityCap - 30) {
                    if (!scheduleNextSightseeing(eveningActivityCap, "sunset_evening")) {
                        break;
                    }
                }
            }
            // -------------------------------------------------------------
            // SIGHTSEEING-DENSITY VALIDATION & REAL-CANDIDATE BACKFILL
            // Evaluates daytime exploration density and attempts real-candidate backfill before dinner
            // -------------------------------------------------------------
            const currentAttractions = dayPlaces.filter((p) => p.activityType === "attraction");
            // If day has fewer than 2 attractions and usable time remains before day end
            if (currentAttractions.length < 2 &&
                currentAttractions.length < dailyAttractionCapacity &&
                currentMinutes < dayEndMinutes - 30) {
                const unassignedAttractionsPool = candidates.filter((c) => !scheduledPlaceIds.has(c.placeId) &&
                    !isDiningCandidate(c) &&
                    getPlaceTimeOfDaySuitability(c) !== "night");
                // Future day reservation check: do not starve future days
                const minFutureReserved = remainingDaysAfterToday * 1;
                const canBackfill = remainingDaysAfterToday === 0 || unassignedAttractionsPool.length > minFutureReserved;
                if (canBackfill && unassignedAttractionsPool.length > 0) {
                    const lastLocatable = getLastLocatablePlace();
                    const prevLat = lastLocatable?.candidate.location?.latitude;
                    const prevLng = lastLocatable?.candidate.location?.longitude;
                    const sortedBackfillPool = [...unassignedAttractionsPool].sort((a, b) => {
                        const fitA = scoreSlotFit(a, "afternoon", isHighRain);
                        const fitB = scoreSlotFit(b, "afternoon", isHighRain);
                        if (fitB !== fitA)
                            return fitB - fitA;
                        if (prevLat !== undefined && prevLng !== undefined) {
                            const distA = a.location?.latitude && a.location?.longitude
                                ? haversineDistanceMeters(prevLat, prevLng, a.location.latitude, a.location.longitude)
                                : 10000;
                            const distB = b.location?.latitude && b.location?.longitude
                                ? haversineDistanceMeters(prevLat, prevLng, b.location.latitude, b.location.longitude)
                                : 10000;
                            return distA - distB;
                        }
                        return 0;
                    });
                    for (const cand of sortedBackfillPool) {
                        if (dayPlaces.filter((p) => p.activityType === "attraction").length < dailyAttractionCapacity &&
                            currentMinutes < dayEndMinutes - 30) {
                            if (tryScheduleCandidate(cand, dayEndMinutes, "attraction")) {
                                if (dayPlaces.filter((p) => p.activityType === "attraction").length >= 2) {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            // -------------------------------------------------------------
            // PERIOD 5: DINNER & EVENING LEISURE (19:00 -> 21:00)
            // -------------------------------------------------------------
            if (departureCutoff >= timeToMinutes("19:30") && dayPlaces.length > 0) {
                const dinnerEndLimit = Math.min(departureCutoff, timeToMinutes("21:00"));
                scheduleMeal("dinner", timeToMinutes("19:00"), 60, dinnerEndLimit);
            }
            // -------------------------------------------------------------
            // PERIOD 6: NIGHT EXPERIENCES & NIGHTLIFE (20:00 -> 23:00)
            // Supports verified nightlife (lounges, pubs, clubs, night markets) and night experiences
            // -------------------------------------------------------------
            if (departureCutoff >= timeToMinutes("21:00") && dayPlaces.length > 0) {
                const nightActivityCap = Math.min(departureCutoff, timeToMinutes("23:00"));
                const currentAttractionCount = dayPlaces.filter((p) => p.activityType === "attraction").length;
                const userInterests = (requirements.interests || []).map((i: string) => i.toLowerCase().trim());
                const hasNightlifeInterest = userInterests.some((i: string) => i.includes("nightlife"));
                const isFamilyTrip = requirements.travelType === "family" || Boolean(requirements.travelers?.children && requirements.travelers.children > 0);

                const isStrictNightlifeVenue = (c: CandidatePlace) => {
                    const types = (c.provenance?.googleDetails?.types || []).map((t) => t.toLowerCase());
                    if (types.some((t) => t.includes("night_club") || t.includes("bar") || t.includes("lounge") || t.includes("pub") || t.includes("live_music") || t.includes("bowling_alley"))) {
                        return true;
                    }
                    const name = (c.name || "").toLowerCase();
                    const desc = (c.description || "").toLowerCase();
                    const nonNightBar = /\b(juice\s+bar|coffee\s+bar|tea\s+bar|salad\s+bar|snack\s+bar|milk\s+bar|ice\s+cream\s+bar|chocolate\s+bar|chaat\s+bar|espresso\s+bar|smoothie\s+bar)\b/i;
                    if (nonNightBar.test(name) || nonNightBar.test(desc)) {
                        return false;
                    }
                    return /\b(night\s*club|nightclub|pub|pubs|brewpub|microbrewery|taproom|lounge|bar|restobar|restro\s*bar|discotheque|nightlife)\b/i.test(name) ||
                        /\b(night\s*club|nightclub|nightlife|pub|lounge|microbrewery|discotheque)\b/i.test(desc);
                };

                const isNightlifeCandidate = (c: CandidatePlace) => {
                    const suit = getPlaceTimeOfDaySuitability(c);
                    if (suit === "night") return true;
                    if (isStrictNightlifeVenue(c)) return true;
                    const name = (c.name || "").toLowerCase();
                    const desc = (c.description || "").toLowerCase();
                    return /\b(night\s*market|night\s*bazaar|sound\s+and\s+light\s+show)\b/i.test(name) ||
                        /\b(night\s*market|night\s*bazaar|sound\s+and\s+light\s+show)\b/i.test(desc);
                };

                const isTravelerSuitable = (c: CandidatePlace) => {
                    if (!isFamilyTrip) return true;
                    if (c.familyFriendly === false) return false;
                    const types = (c.provenance?.googleDetails?.types || []).map((t) => t.toLowerCase());
                    const name = (c.name || "").toLowerCase();
                    const desc = (c.description || "").toLowerCase();
                    if (types.includes("night_club") || /\b(night\s*club|nightclub)\b/i.test(name) || /\b(night\s*club|nightclub)\b/i.test(desc)) {
                        return false;
                    }
                    if ((types.includes("bar") || /\b(pub|brewpub|microbrewery|taproom|bar)\b/i.test(name)) && !types.includes("restaurant") && !name.includes("cafe")) {
                        return false;
                    }
                    return true;
                };

                const isBudgetSuitable = (c: CandidatePlace) => {
                    if (requirements.budget?.category === "budget") {
                        const priceLevel = c.priceLevel;
                        if (typeof priceLevel === "number" && priceLevel >= 3) {
                            return false;
                        }
                    }
                    return true;
                };

                const isHoursSuitable = (c: CandidatePlace) => {
                    const hours = parseStructuredHours(c.openingHours);
                    if (hours) {
                        if (hours.openMinutes >= nightActivityCap) {
                            return false;
                        }
                        if (hours.closeMinutes <= timeToMinutes("20:30")) {
                            return false;
                        }
                    }
                    return true;
                };

                const totalUnassignedAttractions = candidates.filter((c) => !scheduledPlaceIds.has(c.placeId) && !isDiningCandidate(c)).length;
                const minFuture = remainingDaysAfterToday * (totalUnassignedAttractions >= (remainingDaysAfterToday + 1) * 2 ? 2 : 1);

                // Relaxed pace protection: do not overload if day already has heavy visit time
                const isPaceOverloaded = pace === "relaxed" && totalVisitMinutes >= 300;

                const unassignedNightCandidates = isPaceOverloaded
                    ? []
                    : candidates
                        .filter((c) => !scheduledPlaceIds.has(c.placeId))
                        .filter((c) => {
                            if (!isTravelerSuitable(c) || !isBudgetSuitable(c) || !isHoursSuitable(c)) {
                                return false;
                            }
                            if (hasNightlifeInterest) {
                                return isNightlifeCandidate(c);
                            }
                            // Default non-nightlife: exclude dining and strict nightlife venues (clubs, pubs, bars, lounges);
                            // allow only general night experiences (e.g., night market, stargazing, sound & light show) within capacity.
                            if (isDiningCandidate(c) || isStrictNightlifeVenue(c)) return false;
                            const suit = getPlaceTimeOfDaySuitability(c);
                            return suit === "night" &&
                                currentAttractionCount < dailyAttractionCapacity &&
                                totalUnassignedAttractions > minFuture &&
                                isCandidateSuitableForSlot(c, "night", currentMinutes, nightActivityCap);
                        });

                if (unassignedNightCandidates.length > 0 && currentMinutes < nightActivityCap - 45) {
                    const sortedNightPool = [...unassignedNightCandidates].sort((a, b) => {
                        return scoreSlotFit(b, "night", isHighRain) - scoreSlotFit(a, "night", isHighRain);
                    });
                    for (const cand of sortedNightPool) {
                        const hours = parseStructuredHours(cand.openingHours);
                        const minNightStart = hours
                            ? Math.max(hours.openMinutes, Math.max(timeToMinutes("20:00"), currentMinutes))
                            : Math.max(timeToMinutes("20:00"), currentMinutes);
                        if (tryScheduleCandidate(cand, nightActivityCap, "attraction", undefined, minNightStart, "night")) {
                            break;
                        }
                    }
                }
            }
            // -------------------------------------------------------------
            // Finalize Day Schedule & Accurate Remaining Time Calculation
            // -------------------------------------------------------------
            const daytimeActivities = dayPlaces.filter((p) => p.mealType !== "dinner" && p.timePeriod !== "night");
            const lastDaytimePlace = daytimeActivities[daytimeActivities.length - 1];
            const lastDaytimeEndMinutes = lastDaytimePlace
                ? timeToMinutes(lastDaytimePlace.endTime)
                : dayStartMinutes;
            const remainingMinutes = Math.max(0, dayEndMinutes - Math.min(dayEndMinutes, lastDaytimeEndMinutes));
            dailySchedules.push({
                dayNumber,
                date: concreteDates[dayIdx] || undefined,
                places: dayPlaces,
                clusterId: primaryCluster?.clusterId,
                totalVisitMinutes,
                totalTravelMinutes,
                remainingMinutes,
                dayStartTime: minutesToTime(dayStartMinutes),
                dayEndTime: minutesToTime(dayEndMinutes)
            });
        }
        // -------------------------------------------------------------
        // 5. Diagnostics for Unscheduled Candidates
        // -------------------------------------------------------------
        for (const candidate of candidates) {
            if (!scheduledPlaceIds.has(candidate.placeId)) {
                if (!unscheduledCandidates.some((u) => u.candidate.placeId === candidate.placeId)) {
                    unscheduledCandidates.push({
                        candidate,
                        reason: "insufficient_time",
                        details: {
                            message: "Candidate could not be scheduled within available daily time budget or capacity constraints"
                        }
                    });
                }
            }
        }
        const scheduledPlacesCount = dailySchedules.reduce((sum, d) => sum + d.places.length, 0);
        const diagnostics = {
            totalCandidates: candidates.length,
            scheduledPlacesCount,
            unscheduledCount: unscheduledCandidates.length,
            clustersCount: clusters.length,
            plannedDaysCount: totalDays,
            warnings
        };
        logger.info({
            totalCandidates: candidates.length,
            scheduledCount: scheduledPlacesCount,
            unscheduledCount: unscheduledCandidates.length,
            daysPlanned: totalDays
        }, "Itinerary daily scheduling completed");
        return {
            dailySchedules,
            unscheduledCandidates,
            geographicClusters: clusters,
            diagnostics
        };
    }
}
