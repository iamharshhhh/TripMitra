import { DailyForecast } from "../../../tools/weather.tool.js";
export class WeatherFormatter {
    /**
     * Formats day-level weather header for the WhatsApp day card.
     * Invariant: Never defaults to "Clear" when provider data is missing.
     */
    static formatDayWeatherHeader(dayWeather: any, lang = "en") {
        if (!dayWeather || dayWeather.status === "unavailable") {
            const reason = dayWeather?.unavailableReason || dayWeather?.reason;
            if (reason === "outside_forecast_horizon") {
                return lang === "mr"
                    ? "🌤️ सहलीच्या तारखेजवळ हवामान अंदाज उपलब्ध होईल"
                    : lang === "hi"
                        ? "🌤️ यात्रा की तारीख के पास मौसम का पूर्वानुमान उपलब्ध होगा"
                        : "🌤️ Forecast available closer to trip date";
            }
            if (reason === "no_concrete_dates") {
                return lang === "mr"
                    ? "🌤️ प्रवासाच्या तारखांनुसार हवामान उपलब्ध होईल"
                    : lang === "hi"
                        ? "🌤️ यात्रा की तारीखों के साथ मौसम उपलब्ध होगा"
                        : "🌤️ Weather available with travel dates";
            }
            return lang === "mr"
                ? "🌤️ हवामान माहिती अनुपलब्ध"
                : lang === "hi"
                    ? "🌤️ मौसम की जानकारी अनुपलब्ध"
                    : "🌤️ Weather data unavailable";
        }
        if (dayWeather.status === "error") {
            return lang === "mr"
                ? "🌤️ हवामान माहिती अनुपलब्ध"
                : lang === "hi"
                    ? "🌤️ मौसम की जानकारी अनुपलब्ध"
                    : "🌤️ Weather data unavailable";
        }
        const forecast = dayWeather.forecast || dayWeather;
        const maxTemp = typeof forecast.temperatureMax === "number"
            ? forecast.temperatureMax
            : typeof dayWeather.tempMax === "number"
                ? dayWeather.tempMax
                : typeof dayWeather.tempDay === "number"
                    ? dayWeather.tempDay
                    : undefined;
        const minTemp = typeof forecast.temperatureMin === "number"
            ? forecast.temperatureMin
            : typeof dayWeather.tempMin === "number"
                ? dayWeather.tempMin
                : undefined;
        const conditionStr = (typeof forecast.weatherDescription === "string" && forecast.weatherDescription.trim()) ||
            (typeof dayWeather.condition === "string" && dayWeather.condition.trim()) ||
            (typeof dayWeather.description === "string" && dayWeather.description.trim()) ||
            undefined;
        const rainProb = typeof forecast.precipitationProbability === "number"
            ? forecast.precipitationProbability
            : typeof dayWeather.precipitationProbability === "number"
                ? dayWeather.precipitationProbability
                : undefined;
        // Never default to "Clear" when provider data is missing
        if (!conditionStr && maxTemp === undefined) {
            return lang === "mr"
                ? "🌤️ हवामान माहिती अनुपलब्ध"
                : lang === "hi"
                    ? "🌤️ मौसम की जानकारी अनुपलब्ध"
                    : "🌤️ Weather data unavailable";
        }
        const headerLabel = lang === "mr" ? "🌤️ हवामान" : lang === "hi" ? "🌤️ मौसम" : "🌤️ WEATHER";
        let tempPart = "";
        if (maxTemp !== undefined && minTemp !== undefined) {
            tempPart = `${Math.round(maxTemp)}°C / ${Math.round(minTemp)}°C`;
        }
        else if (maxTemp !== undefined) {
            tempPart = `${Math.round(maxTemp)}°C`;
        }
        const rainIcon = (rainProb ?? 0) >= 30 ? "🌧️" : "💧";
        const rainLabel = lang === "mr" ? "पाऊस" : lang === "hi" ? "बारिश" : "Rain";
        const rainPart = rainProb !== undefined ? ` · ${rainIcon} ${rainLabel}: ${Math.round(rainProb)}%` : "";
        if (tempPart && conditionStr) {
            return `${headerLabel}\n${tempPart} · ${conditionStr}${rainPart}`;
        }
        else if (tempPart) {
            return `${headerLabel}\n${tempPart}${rainPart}`;
        }
        else {
            return `${headerLabel}\n${conditionStr}${rainPart}`;
        }
    }
    /**
     * Formats multi-day forecast lines for the standalone weather card.
     */
    static formatForecastLines(forecasts: DailyForecast[], lang = "en", dateRangeStr: string) {
        if (!forecasts || forecasts.length === 0) {
            if (dateRangeStr && dateRangeStr !== "Not set") {
                const msg = lang === "mr"
                    ? `🌤️ *${dateRangeStr}* साठी हवामान अंदाज अजून उपलब्ध नाही.\nℹ️ थेट हवामान अंदाज प्रवासाच्या तारखेजवळ (16 दिवसांच्या आत) उपलब्ध होईल.`
                    : lang === "hi"
                        ? `🌤️ *${dateRangeStr}* के लिए मौसम का पूर्वानुमान अभी उपलब्ध नहीं है।\nℹ️ वास्तविक समय का मौसम पूर्वानुमान यात्रा की तारीख के पास (16 दिनों के भीतर) उपलब्ध होगा।`
                        : `🌤️ Forecast for *${dateRangeStr}* is not available yet.\nℹ️ Real-time meteorological forecasts become available closer to your travel date (within 16 days).`;
                return [msg];
            }
            const defaultMsg = lang === "mr"
                ? "🌤️ प्रवासाच्या तारखांनुसार हवामान अंदाज उपलब्ध होईल."
                : lang === "hi"
                    ? "🌤️ यात्रा की तारीखों के साथ मौसम का पूर्वानुमान उपलब्ध होगा।"
                    : "🌤️ Weather forecast will be available once travel dates are scheduled.";
            return [defaultMsg];
        }
        return forecasts.map((f) => {
            let dayName = f.date;
            const parts = f.date.split("-").map(Number);
            if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                dayName = d.toLocaleDateString(lang === "mr" ? "mr-IN" : lang === "hi" ? "hi-IN" : "en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC"
                });
            }
            return `📅 *${dayName}*: ${f.weatherDescription}\n   🌡️ ${f.temperatureMax}°C / ${f.temperatureMin}°C  💧 ${f.precipitationProbability}% rain`;
        });
    }
}
