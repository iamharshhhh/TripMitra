import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export type WeatherInput = z.infer<typeof WeatherInputSchema>;

export interface DailyForecast {
    date: string;
    weatherCode: number;
    weatherDescription: string;
    temperatureMax: number;
    temperatureMin: number;
    precipitationProbability: number;
}

export interface WeatherToolOutput {
    location: {
        latitude: number;
        longitude: number;
        timezone?: string;
    };
    forecast: DailyForecast[];
    source: "open-meteo";
}

export const WeatherInputSchema = z.object({
    latitude: z.coerce.number().default(18.5204),
    longitude: z.coerce.number().default(73.8567),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional()
});
/**
 * Maps standard WMO Weather Interpretation Codes to human-readable summaries.
 */
function getWeatherDescription(code: any) {
    switch (code) {
        case 0:
            return "Clear sky";
        case 1:
            return "Mainly clear";
        case 2:
            return "Partly cloudy";
        case 3:
            return "Overcast";
        case 45:
        case 48:
            return "Foggy";
        case 51:
        case 53:
        case 55:
            return "Drizzle";
        case 61:
        case 63:
        case 65:
            return "Rain";
        case 71:
        case 73:
        case 75:
            return "Snowfall";
        case 80:
        case 81:
        case 82:
            return "Rain showers";
        case 95:
        case 96:
        case 99:
            return "Thunderstorm";
        default:
            return "Variable weather conditions";
    }
}
export class WeatherTool {
    name = "get_weather_forecast";
    description = "Retrieves real-time daily weather forecasts and precipitation probabilities for a destination by latitude and longitude. Default coordinates are for Pune (18.5204, 73.8567). Use this tool whenever the user asks about current weather, upcoming forecasts, temperature, or rain conditions.";
    inputSchema = WeatherInputSchema;
    getDeclaration() {
        return {
            name: this.name,
            description: this.description,
            parametersJsonSchema: {
                type: "object",
                properties: {
                    latitude: {
                        type: "number",
                        description: "Latitude coordinate of the destination (default Pune: 18.5204)."
                    },
                    longitude: {
                        type: "number",
                        description: "Longitude coordinate of the destination (default Pune: 73.8567)."
                    },
                    startDate: {
                        type: "string",
                        description: "Optional start date in YYYY-MM-DD format."
                    },
                    endDate: {
                        type: "string",
                        description: "Optional end date in YYYY-MM-DD format."
                    }
                },
                required: ["latitude", "longitude"]
            }
        };
    }
    async execute(rawInput: unknown) {
        const startTime = Date.now();
        // 1. Validate input schema
        const parseResult = this.inputSchema.safeParse(rawInput ?? {});
        if (!parseResult.success) {
            const errorMsg = parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
            logger.warn({ tool: this.name, error: errorMsg }, "Invalid weather tool input");
            return {
                success: false,
                error: `Invalid input parameters: ${errorMsg}`,
                source: "open-meteo",
                executionTimeMs: Date.now() - startTime
            };
        }
        const { latitude, longitude, startDate, endDate } = parseResult.data;
        try {
            const url = new URL("https://api.open-meteo.com/v1/forecast");
            url.searchParams.set("latitude", String(latitude));
            url.searchParams.set("longitude", String(longitude));
            url.searchParams.set("daily", "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset");
            url.searchParams.set("timezone", "auto");
            if (startDate) {
                url.searchParams.set("start_date", startDate);
            }
            if (endDate) {
                url.searchParams.set("end_date", endDate);
            }
            logger.debug({ tool: this.name, latitude, longitude, startDate, endDate }, "Calling Open-Meteo weather API");
            const response = await fetch(url.toString(), {
                signal: AbortSignal.timeout(env.WEATHER_TIMEOUT_MS)
            });
            if (!response.ok) {
                const statusText = response.statusText || String(response.status);
                logger.error({ tool: this.name, status: response.status }, "Open-Meteo API returned error status");
                return {
                    success: false,
                    error: `Weather service error (${response.status}: ${statusText})`,
                    source: "open-meteo",
                    executionTimeMs: Date.now() - startTime
                };
            }
            const json: any = await response.json();
            const daily = json.daily;
            if (!daily || !Array.isArray(daily.time)) {
                logger.warn({ tool: this.name, json }, "Open-Meteo returned unexpected structure");
                return {
                    success: false,
                    error: "Weather data currently unavailable from provider.",
                    source: "open-meteo",
                    executionTimeMs: Date.now() - startTime
                };
            }
            const forecast = [];
            for (let i = 0; i < daily.time.length; i++) {
                const code = daily.weathercode?.[i] ?? 0;
                forecast.push({
                    date: daily.time[i],
                    weatherCode: code,
                    weatherDescription: getWeatherDescription(code),
                    temperatureMax: daily.temperature_2m_max?.[i] ?? 0,
                    temperatureMin: daily.temperature_2m_min?.[i] ?? 0,
                    precipitationProbability: daily.precipitation_probability_max?.[i] ?? 0,
                    sunrise: daily.sunrise?.[i],
                    sunset: daily.sunset?.[i]
                });
            }
            const output = {
                location: {
                    latitude: json.latitude ?? latitude,
                    longitude: json.longitude ?? longitude,
                    timezone: json.timezone
                },
                forecast,
                source: "open-meteo"
            };
            logger.info({ tool: this.name, daysReturned: forecast.length, durationMs: Date.now() - startTime }, "Weather forecast retrieved successfully");
            return {
                success: true,
                data: output,
                source: "open-meteo",
                executionTimeMs: Date.now() - startTime
            };
        }
        catch (err) {
            const durationMs = Date.now() - startTime;
            const message = err instanceof Error ? err.message : String(err);
            const isTimeout = message.toLowerCase().includes("timeout") ||
                (typeof err === "object" && err !== null && err.name === "TimeoutError");
            logger.error({ tool: this.name, err: message, isTimeout, durationMs }, "Weather tool execution failed");
            return {
                success: false,
                error: isTimeout ? "Weather request timed out." : "Unable to retrieve real-time weather information.",
                source: "open-meteo",
                executionTimeMs: durationMs
            };
        }
    }
}
