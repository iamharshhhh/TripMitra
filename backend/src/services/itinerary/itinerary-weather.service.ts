import { WeatherTool } from "../../tools/weather.tool.js";
import { addDaysToDate } from "./daily-scheduler.service.js";
import { normalizeDestinationSlug } from "../../types/trip-requirements.types.js";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { getDestinationCoordinates } from "../../utils/geography.js";
import { ItineraryWeatherConfig, DailyWeatherForecast } from "./itinerary-weather.types.js";
import { DailySchedule, ScheduledPlace } from "./itinerary-scheduling.types.js";
import { StructuredTripRequirements } from "../../types/trip-requirements.types.js";

export const DEFAULT_WEATHER_CONFIG = {
    forecastHorizonDays: env.WEATHER_FORECAST_HORIZON_DAYS || 16,
    precipitationThreshold: env.WEATHER_PRECIPITATION_THRESHOLD || 50,
    severeConditionCodes: [95, 96, 99, 65, 75, 82], // Thunderstorms, violent rain/snow showers
    timeoutMs: env.WEATHER_TIMEOUT_MS || 10000
};
/**
 * Calculates calendar day difference (dateStr - todayStr).
 * Treats dates deterministically in UTC.
 */
export function getDaysDifference(targetDateStr: string, referenceDate: Date) {
    const [year, month, day] = targetDateStr.split("-").map(Number);
    const targetUtc = Date.UTC(year, month - 1, day);
    const ref = referenceDate ? new Date(referenceDate) : new Date();
    const refUtc = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((targetUtc - refUtc) / msPerDay);
}
export class ItineraryWeatherService {
    weatherTool;
    config;
    constructor(weatherTool?: WeatherTool, config?: Partial<ItineraryWeatherConfig>) {
        this.weatherTool = weatherTool || new WeatherTool();
        this.config = {
            ...DEFAULT_WEATHER_CONFIG,
            ...config
        };
    }
    /**
     * Assesses weather suitability for a place given weather forecast.
     * Invariants:
     * - Never guess indoor/outdoor from name or category.
     * - candidate.indoor === undefined -> unknown.
     * - Known severe weather + indoor === false -> unsuitable.
     * - Known severe weather + indoor === true -> potentially_unfavorable (indoor remains safe, transit/access hindered).
     * - High precipitation (>= threshold) + indoor === false -> potentially_unfavorable.
     * - High precipitation + indoor === true -> suitable.
     * - Normal weather conditions -> suitable.
     * - Weather unavailable -> unknown.
     */
    assessPlaceSuitability(place: ScheduledPlace, forecast: DailyWeatherForecast) {
        const candidate = place.candidate;
        const reasons = [];
        if (!forecast) {
            return {
                placeId: candidate.placeId,
                placeName: candidate.name,
                suitability: "unknown",
                reasons: ["Weather forecast unavailable for this date or location."]
            };
        }
        const isSevere = this.config.severeConditionCodes.includes(forecast.weatherCode);
        const hasHighPrecipitation = forecast.precipitationProbability >= this.config.precipitationThreshold;
        // Severe Weather Evaluation
        if (isSevere) {
            if (candidate.indoor === false) {
                reasons.push(`Severe weather condition (${forecast.weatherDescription}) for outdoor activity.`);
                return {
                    placeId: candidate.placeId,
                    placeName: candidate.name,
                    suitability: "unsuitable",
                    reasons,
                    forecast
                };
            }
            else if (candidate.indoor === true) {
                reasons.push(`Severe weather condition (${forecast.weatherDescription}) but venue is indoor.`);
                return {
                    placeId: candidate.placeId,
                    placeName: candidate.name,
                    suitability: "potentially_unfavorable",
                    reasons,
                    forecast
                };
            }
            else {
                // indoor is undefined -> strictly unknown
                reasons.push(`Severe weather condition (${forecast.weatherDescription}), venue indoor/outdoor status unknown.`);
                return {
                    placeId: candidate.placeId,
                    placeName: candidate.name,
                    suitability: "unknown",
                    reasons,
                    forecast
                };
            }
        }
        // High Precipitation Evaluation
        if (hasHighPrecipitation) {
            if (candidate.indoor === false) {
                reasons.push(`High precipitation probability (${forecast.precipitationProbability}%) for outdoor activity.`);
                return {
                    placeId: candidate.placeId,
                    placeName: candidate.name,
                    suitability: "potentially_unfavorable",
                    reasons,
                    forecast
                };
            }
            else if (candidate.indoor === true) {
                reasons.push(`High precipitation probability (${forecast.precipitationProbability}%), but venue is indoor.`);
                return {
                    placeId: candidate.placeId,
                    placeName: candidate.name,
                    suitability: "suitable",
                    reasons,
                    forecast
                };
            }
            else {
                // candidate.indoor === undefined -> strictly unknown
                reasons.push(`High precipitation probability (${forecast.precipitationProbability}%), venue indoor/outdoor status unknown.`);
                return {
                    placeId: candidate.placeId,
                    placeName: candidate.name,
                    suitability: "unknown",
                    reasons,
                    forecast
                };
            }
        }
        // Favorable / mild conditions
        reasons.push(`Favorable weather conditions: ${forecast.weatherDescription}, ${forecast.temperatureMax}°C / ${forecast.temperatureMin}°C.`);
        return {
            placeId: candidate.placeId,
            placeName: candidate.name,
            suitability: "suitable",
            reasons,
            forecast
        };
    }
    /**
     * Retrieves weather and evaluates suitability across daily schedules.
     * Gated strictly by the configured forecast horizon.
     */
    async enrichSchedulesWithWeather(dailySchedules: DailySchedule[], referenceDate: Date) {
        return Promise.all(dailySchedules.map(async (schedule) => {
            // Check if concrete date exists
            if (!schedule.date) {
                const assessments = schedule.places.map((p) => this.assessPlaceSuitability(p, undefined));
                return {
                    dayNumber: schedule.dayNumber,
                    status: "unavailable",
                    unavailableReason: "no_concrete_dates",
                    assessments
                };
            }
            const targetDate = schedule.date;
            // Check horizon
            const daysDiff = Math.max(0, getDaysDifference(targetDate, referenceDate));
            if (daysDiff > this.config.forecastHorizonDays) {
                const assessments = schedule.places.map((p) => this.assessPlaceSuitability(p, undefined));
                return {
                    dayNumber: schedule.dayNumber,
                    date: schedule.date,
                    status: "unavailable",
                    unavailableReason: "outside_forecast_horizon",
                    assessments
                };
            }
            // Find representative location for the day
            let latitude;
            let longitude;
            for (const p of schedule.places) {
                if (p.candidate.location.latitude && p.candidate.location.longitude) {
                    latitude = p.candidate.location.latitude;
                    longitude = p.candidate.location.longitude;
                    break;
                }
            }
            if (!latitude || !longitude) {
                const destSlug = schedule.places[0]?.candidate.destinationSlug || "";
                const destCoords = getDestinationCoordinates(destSlug);
                if (destCoords) {
                    latitude = destCoords.latitude;
                    longitude = destCoords.longitude;
                }
            }
            if (!latitude || !longitude) {
                const assessments = schedule.places.map((p) => this.assessPlaceSuitability(p, undefined));
                return {
                    dayNumber: schedule.dayNumber,
                    date: schedule.date,
                    status: "unavailable",
                    unavailableReason: "no_location",
                    assessments
                };
            }
            // Call Open-Meteo tool
            try {
                const toolResult = await this.weatherTool.execute({
                    latitude,
                    longitude,
                    startDate: targetDate,
                    endDate: targetDate
                });
                if (!toolResult.success || !toolResult.data || !toolResult.data.forecast.length) {
                    logger.warn({ dayNumber: schedule.dayNumber, date: schedule.date, error: toolResult.error }, "Weather tool failed for itinerary date");
                    const assessments = schedule.places.map((p) => this.assessPlaceSuitability(p, undefined));
                    return {
                        dayNumber: schedule.dayNumber,
                        date: schedule.date,
                        status: "error",
                        unavailableReason: "fetch_failed",
                        errorMessage: toolResult.error,
                        assessments
                    };
                }
                const rawForecast = toolResult.data.forecast[0];
                const retrievedAt = new Date().toISOString();
                const dailyForecast = {
                    date: rawForecast.date,
                    latitude,
                    longitude,
                    temperatureMin: rawForecast.temperatureMin,
                    temperatureMax: rawForecast.temperatureMax,
                    precipitationProbability: rawForecast.precipitationProbability,
                    weatherCode: rawForecast.weatherCode,
                    weatherDescription: rawForecast.weatherDescription,
                    source: "open-meteo" as const,
                    retrievedAt
                };
                const assessments = schedule.places.map((p) => this.assessPlaceSuitability(p, dailyForecast));
                return {
                    dayNumber: schedule.dayNumber,
                    date: schedule.date,
                    status: "available",
                    forecast: dailyForecast,
                    assessments
                };
            }
            catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                logger.error({ dayNumber: schedule.dayNumber, date: schedule.date, err: errMsg }, "Weather enrichment error");
                const assessments = schedule.places.map((p) => this.assessPlaceSuitability(p, undefined));
                return {
                    dayNumber: schedule.dayNumber,
                    date: schedule.date,
                    status: "error",
                    unavailableReason: "fetch_failed",
                    errorMessage: errMsg,
                    assessments
                };
            }
        }));
    }
    /**
     * Pre-fetches high-level weather summaries for trip dates to guide indoor/outdoor scheduling.
     */
    async getPreSchedulingWeatherSummaries(requirements: Partial<StructuredTripRequirements>, referenceDate: Date) {
        if (!requirements.startDate || !requirements.destination) {
            return undefined;
        }
        const daysDiff = Math.max(0, getDaysDifference(requirements.startDate, referenceDate));
        if (daysDiff > this.config.forecastHorizonDays) {
            return undefined;
        }
        const destSlug = requirements.destinationSlug || normalizeDestinationSlug(requirements.destination);
        const destCoords = getDestinationCoordinates(destSlug);
        if (!destCoords)
            return undefined;
        try {
            const durationDays = requirements.durationDays || 1;
            const endDate = addDaysToDate(requirements.startDate, durationDays - 1);
            const toolResult = await this.weatherTool.execute({
                latitude: destCoords.latitude,
                longitude: destCoords.longitude,
                startDate: requirements.startDate,
                endDate
            });
            if (!toolResult.success || !toolResult.data?.forecast?.length) {
                return undefined;
            }
            const summaries = {};
            toolResult.data.forecast.forEach((f, idx) => {
                const dayNumber = idx + 1;
                const isSevere = this.config.severeConditionCodes.includes(f.weatherCode);
                summaries[dayNumber] = {
                    precipitationProbability: f.precipitationProbability,
                    isSevere
                };
            });
            return summaries;
        }
        catch {
            return undefined;
        }
    }
}
