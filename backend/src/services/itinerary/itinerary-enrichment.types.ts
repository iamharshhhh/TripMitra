import { DailySchedule, ScheduledPlace, SchedulingResult, SchedulingDiagnostics } from "./itinerary-scheduling.types.js";
import { ItineraryDayWeather, WeatherSuitability } from "./itinerary-weather.types.js";
import { BudgetEvaluationResult, CostItem } from "./budget.types.js";
export interface EnrichedScheduledPlace extends ScheduledPlace {
    weatherSuitability?: WeatherSuitability;
    weatherReasons?: string[];
    costItem?: CostItem;
}
export interface EnrichedDailySchedule extends Omit<DailySchedule, "places"> {
    dayWeather?: ItineraryDayWeather;
    places: EnrichedScheduledPlace[];
    knownDailyCost: number;
}
export interface EnrichedItineraryResult {
    schedulingResult: SchedulingResult;
    dailySchedules: EnrichedDailySchedule[];
    weather: {
        status: "available" | "partial" | "unavailable";
        days: ItineraryDayWeather[];
    };
    budget: BudgetEvaluationResult;
    diagnostics: {
        scheduling: SchedulingDiagnostics;
        weatherWarnings: string[];
        budgetWarnings: string[];
    };
}
