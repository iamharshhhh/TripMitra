import { ItineraryWeatherService } from "./itinerary-weather.service.js";
import { BudgetEngineService } from "./budget.service.js";
import { logger } from "../../utils/logger.js";
import { SchedulingResult } from "./itinerary-scheduling.types.js";
import { StructuredTripRequirements } from "../../types/trip-requirements.types.js";

export class ItineraryEnrichmentService {
    weatherService;
    budgetService;
    constructor(weatherService?: ItineraryWeatherService, budgetService?: BudgetEngineService) {
        this.weatherService = weatherService || new ItineraryWeatherService();
        this.budgetService = budgetService || new BudgetEngineService();
    }
    /**
     * Enriches an M8.4 scheduling result with M8.5 weather suitability and authoritative budget evaluation.
     *
     * Crucial Invariants:
     * 1. Preserves all M8.4 scheduling data intact (day numbers, dates, times, travel distances, clusters, diagnostics).
     * 2. Pure deterministic TypeScript logic for suitability and arithmetic.
     * 3. Weather failure does not crash the itinerary generation.
     * 4. Unknown costs or weather never cause destructive candidate rejection.
     */
    async enrichItinerary(requirements: Partial<StructuredTripRequirements>, schedulingResult: SchedulingResult, referenceDate: Date) {
        const weatherWarnings = [];
        const budgetWarnings = [];
        // 1. All scheduled places across days
        const allScheduledPlaces = schedulingResult.dailySchedules.flatMap((d) => d.places);
        // 2. Authoritative Budget Evaluation
        const budget = this.budgetService.evaluateBudget(requirements, allScheduledPlaces);
        for (const diag of budget.diagnostics) {
            if (budget.budgetStatus === "over_budget" || budget.currencyMismatch) {
                budgetWarnings.push(diag);
            }
        }
        // Map cost items by placeId
        const costItemByPlaceId = new Map();
        for (const item of budget.costItems) {
            if (item.placeId) {
                costItemByPlaceId.set(item.placeId, item);
            }
        }
        // 3. Weather Evaluation across Daily Schedules
        let weatherDays = [];
        try {
            weatherDays = await this.weatherService.enrichSchedulesWithWeather(schedulingResult.dailySchedules, referenceDate);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error({ err: msg }, "Unexpected weather service failure during itinerary enrichment");
            weatherWarnings.push(`Weather retrieval failed: ${msg}`);
            // Graceful degradation: create empty/unavailable weather days
            weatherDays = schedulingResult.dailySchedules.map((s) => ({
                dayNumber: s.dayNumber,
                date: s.date,
                status: "error",
                unavailableReason: "fetch_failed",
                errorMessage: msg,
                assessments: s.places.map((p) => this.weatherService.assessPlaceSuitability(p, undefined))
            }));
        }
        // Determine overall weather status
        const availableCount = weatherDays.filter((w) => w.status === "available").length;
        let overallWeatherStatus = "unavailable";
        if (availableCount === weatherDays.length && weatherDays.length > 0) {
            overallWeatherStatus = "available";
        }
        else if (availableCount > 0) {
            overallWeatherStatus = "partial";
        }
        for (const wd of weatherDays) {
            if (wd.status === "unavailable" && wd.unavailableReason) {
                weatherWarnings.push(`Day ${wd.dayNumber} (${wd.date || "duration-only"}): weather unavailable (${wd.unavailableReason}).`);
            }
            else if (wd.status === "error") {
                weatherWarnings.push(`Day ${wd.dayNumber} (${wd.date || "duration-only"}): weather error (${wd.errorMessage || "unknown"}).`);
            }
        }
        // 4. Combine into Enriched Daily Schedules
        const enrichedDailySchedules = schedulingResult.dailySchedules.map((daySchedule) => {
            const dayWeather = weatherDays.find((w) => w.dayNumber === daySchedule.dayNumber);
            const assessmentMap = new Map();
            if (dayWeather) {
                for (const a of dayWeather.assessments) {
                    assessmentMap.set(a.placeId, a);
                }
            }
            let knownDailyCost = 0;
            const enrichedPlaces = daySchedule.places.map((place) => {
                const assessment = assessmentMap.get(place.candidate.placeId);
                const costItem = costItemByPlaceId.get(place.candidate.placeId);
                if (costItem && typeof costItem.amount === "number") {
                    knownDailyCost += costItem.amount;
                }
                return {
                    ...place, // All M8.4 fields preserved intact
                    weatherSuitability: assessment?.suitability,
                    weatherReasons: assessment?.reasons,
                    costItem
                };
            });
            return {
                dayNumber: daySchedule.dayNumber,
                date: daySchedule.date,
                clusterId: daySchedule.clusterId,
                totalVisitMinutes: daySchedule.totalVisitMinutes,
                totalTravelMinutes: daySchedule.totalTravelMinutes,
                remainingMinutes: daySchedule.remainingMinutes,
                dayStartTime: daySchedule.dayStartTime,
                dayEndTime: daySchedule.dayEndTime,
                dayWeather,
                places: enrichedPlaces,
                knownDailyCost
            };
        });
        return {
            schedulingResult, // Preserved intact from M8.4
            dailySchedules: enrichedDailySchedules,
            weather: {
                status: overallWeatherStatus,
                days: weatherDays
            },
            budget,
            diagnostics: {
                scheduling: schedulingResult.diagnostics,
                weatherWarnings,
                budgetWarnings
            }
        };
    }
    /**
     * Delegates pre-scheduling weather summary retrieval to ItineraryWeatherService.
     */
    async getPreSchedulingWeather(requirements: Partial<StructuredTripRequirements>, referenceDate: Date) {
        return this.weatherService.getPreSchedulingWeatherSummaries(requirements, referenceDate);
    }
}
