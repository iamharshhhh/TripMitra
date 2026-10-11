export type WeatherSuitability = "suitable" | "potentially_unfavorable" | "unsuitable" | "unknown";
export interface DailyWeatherForecast {
    date: string;
    latitude: number;
    longitude: number;
    temperatureMin: number;
    temperatureMax: number;
    precipitationProbability: number;
    weatherCode: number;
    weatherDescription: string;
    source: "open-meteo";
    retrievedAt: string;
}
export interface PlaceWeatherAssessment {
    placeId: string;
    placeName: string;
    suitability: WeatherSuitability;
    reasons: string[];
    forecast?: DailyWeatherForecast;
}
export type DayWeatherStatus = "available" | "unavailable" | "error";
export type DayWeatherUnavailableReason = "outside_forecast_horizon" | "no_concrete_dates" | "fetch_failed" | "no_location";
export interface ItineraryDayWeather {
    dayNumber: number;
    date?: string;
    status: DayWeatherStatus;
    unavailableReason?: DayWeatherUnavailableReason;
    errorMessage?: string;
    forecast?: DailyWeatherForecast;
    assessments: PlaceWeatherAssessment[];
}
export interface ItineraryWeatherConfig {
    forecastHorizonDays: number;
    precipitationThreshold: number;
    severeConditionCodes: number[];
    timeoutMs: number;
}
