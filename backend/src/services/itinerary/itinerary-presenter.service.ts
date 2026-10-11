import { env } from "../../config/env.js";
import { MULTILINGUAL_PRESENTER_STRINGS } from "../language/multilingual-presenter.strings.js";
import { NavigationService } from "../navigation/navigation.service.js";
import { MULTILINGUAL_NAVIGATION_STRINGS } from "../navigation/navigation-presenter.strings.js";
import { PersistedItinerarySnapshot, PersistedItineraryDay, PersistedScheduledPlace } from "./itinerary-persistence.types.js";

function getTimeBlockHeader(startTime: any, language = "en") {
    const [h] = (startTime || "09:00").split(":").map(Number);
    if (language === "mr") {
        if (h < 12)
            return "🌅 सकाळ";
        if (h < 16)
            return "🍽️ दुपार";
        if (h < 19)
            return "🌆 संध्याकाळ";
        return "🌙 रात्र";
    }
    if (language === "hi") {
        if (h < 12)
            return "🌅 सुबह";
        if (h < 16)
            return "🍽️ दोपहर";
        if (h < 19)
            return "🌆 शाम";
        return "🌙 रात";
    }
    if (h < 12)
        return "🌅 MORNING";
    if (h < 16)
        return "🍽️ AFTERNOON";
    if (h < 19)
        return "🌆 EVENING";
    return "🌙 NIGHT";
}
export class ItineraryPresenterService {
    /**
     * Formats a single place with full transit notes and navigation links for snapshot presentation.
     */
    static formatPlace(place: PersistedScheduledPlace, language = "en", previousPlace: PersistedScheduledPlace | null, destinationCity: string) {
        const s = MULTILINGUAL_PRESENTER_STRINGS[language] || MULTILINGUAL_PRESENTER_STRINGS.en;
        const navStrings = MULTILINGUAL_NAVIGATION_STRINGS[language] || MULTILINGUAL_NAVIGATION_STRINGS.en;
        const cat = (place.category || "").toLowerCase();
        const name = (place.name || "").toLowerCase();
        const isLunch = place.mealType === "lunch" || name.includes("lunch") || (place.activityType === "meal" && (place.startTime || "09:00") < "16:00");
        const isDinner = place.mealType === "dinner" || name.includes("dinner") || (place.activityType === "meal" && (place.startTime || "09:00") >= "16:00");
        if (isLunch || isDinner) {
            const mealLabel = isLunch
                ? (language === "mr" ? "दुपारचे जेवण" : language === "hi" ? "दोपहर का भोजन" : "LUNCH")
                : (language === "mr" ? "रात्रीचे जेवण" : language === "hi" ? "रात का भोजन" : "DINNER");
            return `${place.startTime} — ${place.endTime}\n🍽️ *${mealLabel}*`;
        }
        // Select category icon
        let icon = "🏛️";
        if (cat.includes("beach") || name.includes("beach"))
            icon = "🏖️";
        else if (cat.includes("temple") || name.includes("temple") || name.includes("kovil") || name.includes("devasthanam"))
            icon = "🛕";
        else if (cat.includes("church") || cat.includes("basilica") || name.includes("church") || name.includes("basilica"))
            icon = "⛪";
        else if (cat.includes("fort") || name.includes("fort") || name.includes("wada") || name.includes("palace"))
            icon = "🏰";
        else if (cat.includes("garden") || cat.includes("park") || cat.includes("nature") || cat.includes("lake") || cat.includes("falls"))
            icon = "🌿";
        else if (cat.includes("food") || cat.includes("restaurant") || cat.includes("dining"))
            icon = "🍲";
        else if (cat.includes("cafe") || cat.includes("coffee"))
            icon = "☕";
        else if (cat.includes("market") || cat.includes("shopping") || cat.includes("bazaar"))
            icon = "🛍️";
        else if (cat.includes("spiritual") || name.includes("ashram") || name.includes("auroville"))
            icon = "🏛️";
        const lines = [];
        lines.push(`${place.startTime} — ${place.endTime}`);
        lines.push(`${icon} *${place.name}*`);
        if (place.category) {
            lines.push(`_${place.category}_`);
        }
        // Transit note
        if (place.travelTimeMinutesFromPrevious > 0) {
            const transitSourceLabel = place.travelEstimationSource === "geographic_estimate"
                ? s.transitGeographic
                : s.transitBuffer;
            lines.push(`🚗 ${s.travelFromPrevious(place.travelTimeMinutesFromPrevious, place.travelDistanceMetersFromPrevious, transitSourceLabel)}`);
        }
        // Weather note if unfavorable or unsuitable
        if (place.weatherSuitability === "unsuitable" || place.weatherSuitability === "potentially_unfavorable") {
            const reason = place.weatherReasons[0] || "Potentially unfavorable weather";
            lines.push(`${s.weatherNotice(reason)}`);
        }
        // Cost note if known
        if (place.costItem && typeof place.costItem.amount === "number") {
            lines.push(s.costLabel(place.costItem.amount, place.costItem.currency, place.costItem.confidence));
        }
        // Navigation links & transit advisory
        const navDest = {
            placeId: place.placeId,
            name: place.name,
            latitude: place.location?.latitude,
            longitude: place.location?.longitude,
            address: place.location?.address,
            destinationCity
        };
        let navOrigin = undefined;
        if (previousPlace) {
            navOrigin = {
                name: previousPlace.name,
                latitude: previousPlace.location?.latitude,
                longitude: previousPlace.location?.longitude,
                placeId: previousPlace.placeId
            };
        }
        let transitContext = undefined;
        if (place.travelDistanceMetersFromPrevious > 0) {
            transitContext = {
                estimatedDistanceMeters: place.travelDistanceMetersFromPrevious,
                weatherSuitability: place.weatherSuitability
            };
        }
        const navResult = NavigationService.buildPlaceNavigation(navDest, navOrigin, transitContext);
        if (navResult.mapSearchUrl) {
            lines.push(`🗺️ [${navStrings.viewOnMap}](${navResult.mapSearchUrl})`);
        }
        if (navResult.directionsUrl && previousPlace) {
            lines.push(`🗺️ [${navStrings.directions}](${navResult.directionsUrl})`);
        }
        if (navResult.transitGuidance && place.travelDistanceMetersFromPrevious > 0) {
            const g = navResult.transitGuidance;
            const modeLabel = navStrings.modes[g.recommendedMode] || g.recommendedMode;
            const reasonLabel = navStrings.reasonNotes[g.reasonCode] || "";
            lines.push(`🚶 _${navStrings.transitAdvisoryHeader}: ${modeLabel} - ${reasonLabel}_`);
            if (g.stepFreeNotice) {
                lines.push(`♿ _${navStrings.stepFreeDisclaimer}_`);
            }
        }
        return lines.join("\n\n");
    }
    /**
     * Formats a daily schedule into a detailed section for full snapshot presentation.
     */
    static formatDay(day: PersistedItineraryDay, language = "en", destinationCity: string) {
        const s = MULTILINGUAL_PRESENTER_STRINGS[language] || MULTILINGUAL_PRESENTER_STRINGS.en;
        const lines = [];
        const dateLabel = day.date ? ` (${day.date})` : "";
        const startTime = day.dayStartTime || "09:00";
        const endTime = day.dayEndTime || "18:00";
        lines.push(s.dayHeader(day.dayNumber, dateLabel, startTime, endTime));
        // Weather summary for the day
        if (day.dayWeather?.forecast) {
            const fc = day.dayWeather.forecast;
            lines.push(`🌤️ *${s.weather}:* ${fc.weatherDescription}, ${fc.temperatureMax}°C / ${fc.temperatureMin}°C, ${fc.precipitationProbability}% ${s.rain}`);
        }
        else if (day.dayWeather?.status === "unavailable") {
            const reason = day.dayWeather.unavailableReason === "outside_forecast_horizon"
                ? s.weatherUnavailableAhead
                : s.weatherUnavailable;
            lines.push(`🌤️ *${s.weather}:* _${reason}_`);
        }
        // Places
        if (day.places.length === 0) {
            lines.push(`_${s.noScheduledActivities}_`);
        }
        else {
            let prevPlace = null;
            for (const place of day.places) {
                lines.push(this.formatPlace(place, language, prevPlace, destinationCity));
                prevPlace = place;
            }
        }
        return lines.join("\n\n");
    }
    /**
     * Formats a single day into the modern, WhatsApp-native compact day card.
     */
    /**
     * Formats a single day into the modern, WhatsApp-native compact day card.
     */
    static formatWhatsAppDayCard(day: PersistedItineraryDay, language = "en", destinationCity: string, totalDays: number) {
        const s = MULTILINGUAL_PRESENTER_STRINGS[language] || MULTILINGUAL_PRESENTER_STRINGS.en;
        const lines = [];
        // 1. Header
        lines.push(`🗓️ *DAY ${day.dayNumber}*`);
        if (destinationCity) {
            lines.push(destinationCity);
        }
        const startTime = day.dayStartTime || "07:30";
        const endTime = day.dayEndTime || "19:00";
        lines.push(`${startTime} – ${endTime}`);
        lines.push("");
        // 2. Weather section
        lines.push("🌤️ *WEATHER*");
        if (day.dayWeather?.forecast) {
            const fc = day.dayWeather.forecast;
            lines.push(`${fc.temperatureMin}–${fc.temperatureMax}°C · ${fc.precipitationProbability}% rain`);
        }
        else if (day.dayWeather?.unavailableReason === "outside_forecast_horizon") {
            lines.push("Forecast available closer to trip date");
        }
        else {
            lines.push("Weather data unavailable");
        }
        lines.push("");
        // 3. Time Periods (Morning, Afternoon, Evening)
        const morningPlaces = day.morning || day.places.filter((p) => (p.startTime || "09:00") < "12:00");
        const afternoonPlaces = day.afternoon ||
            day.places.filter((p) => (p.startTime || "09:00") >= "12:00" && (p.startTime || "09:00") < "17:00");
        const eveningPlaces = day.evening || day.places.filter((p) => (p.startTime || "09:00") >= "17:00");
        const morningHeader = language === "mr" ? "🌅 सकाळ" : language === "hi" ? "🌅 सुबह" : "🌅 MORNING";
        const afternoonHeader = language === "mr" ? "☀️ दुपार" : language === "hi" ? "☀️ दोपहर" : "☀️ AFTERNOON";
        const eveningHeader = language === "mr" ? "🌆 संध्याकाळ" : language === "hi" ? "🌆 शाम" : "🌆 EVENING";
        const isDay1 = day.dayNumber === 1;
        const isLastDay = totalDays ? day.dayNumber === totalDays : false;
        const renderPeriod = (periodTitle, periodPlaces, periodKey) => {
            lines.push(periodTitle);
            if (periodPlaces.length === 0) {
                if (periodKey === "morning" && isDay1 && day.dayStartTime && day.dayStartTime >= "12:00") {
                    lines.push("✈️ _Arrival & Check-in_");
                }
                else if (periodKey === "afternoon" && isLastDay && day.dayEndTime && day.dayEndTime < "14:00") {
                    lines.push("🧳 _Departure & Transit_");
                }
                else if (periodKey === "evening" && isLastDay && day.dayEndTime && day.dayEndTime < "19:00") {
                    lines.push("🧳 _Departure & Farewell_");
                }
                else {
                    lines.push("🌿 _Free Time & Relaxation_");
                }
                lines.push("");
                return;
            }
            for (const place of periodPlaces) {
                const cat = (place.category || "").toLowerCase();
                const name = (place.name || "").toLowerCase();
                const isLunch = place.mealType === "lunch" || name.includes("lunch") || (place.activityType === "meal" && (place.startTime || "09:00") < "16:00");
                const isDinner = place.mealType === "dinner" || name.includes("dinner") || (place.activityType === "meal" && (place.startTime || "09:00") >= "16:00");
                if (isLunch || isDinner) {
                    const mealLabel = isLunch
                        ? (language === "mr" ? "दुपारचे जेवण" : language === "hi" ? "दोपहर का भोजन" : "LUNCH")
                        : (language === "mr" ? "रात्रीचे जेवण" : language === "hi" ? "रात का भोजन" : "DINNER");
                    lines.push(`${place.startTime} – ${place.endTime}`);
                    lines.push(`🍽️ *${mealLabel}*`);
                    lines.push("");
                    continue;
                }
                const isRestaurant = place.activityType === "restaurant" || cat === "restaurant";
                let icon = "🏛️";
                if (cat.includes("beach") || name.includes("beach"))
                    icon = "🏖️";
                else if (cat.includes("temple") || name.includes("temple") || name.includes("kovil") || name.includes("devasthanam"))
                    icon = "🛕";
                else if (cat.includes("church") || cat.includes("basilica") || name.includes("church") || name.includes("basilica"))
                    icon = "⛪";
                else if (cat.includes("fort") || name.includes("fort") || name.includes("wada") || name.includes("palace"))
                    icon = "🏰";
                else if (cat.includes("garden") || cat.includes("park") || cat.includes("nature") || cat.includes("lake") || cat.includes("falls"))
                    icon = "🌿";
                else if (cat.includes("food") || cat.includes("restaurant") || cat.includes("dining"))
                    icon = "🍲";
                else if (cat.includes("cafe") || cat.includes("coffee"))
                    icon = "☕";
                else if (cat.includes("market") || cat.includes("shopping") || cat.includes("bazaar"))
                    icon = "🛍️";
                else if (cat.includes("spiritual") || name.includes("ashram") || name.includes("auroville"))
                    icon = "🏛️";
                lines.push(`${place.startTime} – ${place.endTime}`);
                lines.push(`${icon} *${place.name}*`);
                if (place.description && place.description !== place.name && !place.name.includes("Rest Break") && !place.name.includes("Leisure")) {
                    lines.push(`_${place.description}_`);
                }
                else if (place.category && place.category !== "meal" && place.category !== "restaurant") {
                    lines.push(`_${place.category}_`);
                }
                const hasCoordinates = Boolean(place.location?.latitude && place.location?.longitude);
                const isGenericMealBreak = place.activityType === "meal" || (!hasCoordinates && (isLunch || isDinner) && !place.mapUrl);
                if (hasCoordinates || (!isGenericMealBreak && (place.mapUrl || place.name))) {
                    const mapUrl = place.mapUrl ||
                        (hasCoordinates
                            ? `https://www.google.com/maps/search/?api=1&query=${place.location.latitude},${place.location.longitude}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationCity ? `${place.name}, ${destinationCity}` : place.name)}`);
                    lines.push("🗺️ View on Map");
                    lines.push(mapUrl);
                    if (place.directionsUrl) {
                        lines.push("🧭 Directions");
                        lines.push(place.directionsUrl);
                    }
                }
                lines.push("");
            }
        };
        renderPeriod(morningHeader, morningPlaces, "morning");
        renderPeriod(afternoonHeader, afternoonPlaces, "afternoon");
        renderPeriod(eveningHeader, eveningPlaces, "evening");
        if (totalDays && totalDays > 0) {
            lines.push(`Day ${day.dayNumber} of ${totalDays}`);
        }
        return lines.join("\n").trim();
    }
    /**
     * Formats the authoritative budget summary into a WhatsApp section.
     */
    static formatBudget(budget: PersistedItinerarySnapshot["budget"], language = "en") {
        const s = MULTILINGUAL_PRESENTER_STRINGS[language] || MULTILINGUAL_PRESENTER_STRINGS.en;
        const lines = [];
        lines.push(s.budgetSummary);
        if (budget.budgetStatus === "not_specified") {
            lines.push(`${s.knownActivitiesCost} ${budget.knownTotalCost} ${budget.currency}`);
            lines.push(s.targetBudgetNotSpecified);
        }
        else {
            lines.push(`${s.knownActivitiesCost} ${budget.knownTotalCost} ${budget.currency}`);
            if (budget.targetBudget !== undefined) {
                lines.push(`${s.targetBudget} ${budget.targetBudget} ${budget.currency}`);
            }
            if (budget.remainingBudget !== undefined) {
                lines.push(`${s.remainingBudget} ${budget.remainingBudget} ${budget.currency}`);
            }
        }
        if (budget.hasUnknownCosts) {
            lines.push(s.unknownFeesNotice(budget.unknownCostCount));
        }
        if (budget.currencyMismatch) {
            lines.push(s.currencyMismatchNotice);
        }
        return lines.join("\n");
    }
    /**
     * Presents a complete itinerary snapshot.
     * Returns an array of formatted message chunks, ensuring no single message exceeds the configured limit.
     */
    static presentItinerary(snapshot: PersistedItinerarySnapshot, maxChars = env.WHATSAPP_MAX_MESSAGE_CHARACTERS, language = "en") {
        const s = MULTILINGUAL_PRESENTER_STRINGS[language] || MULTILINGUAL_PRESENTER_STRINGS.en;
        const headerLines = [
            `🌟 *${s.itineraryFor} ${snapshot.generationMetadata.destination}*`,
            `📅 ${s.durationDays}: ${snapshot.generationMetadata.durationDays} ${s.durationDays} | 📍 ${s.totalPlaces}: ${snapshot.generationMetadata.totalPlaces}`,
            `🏷️ ${s.version}: ${snapshot.itineraryVersion}`,
            ""
        ];
        const daySections = snapshot.days.map((d) => this.formatDay(d, language, snapshot.generationMetadata.destination));
        const budgetSection = this.formatBudget(snapshot.budget, language);
        const footer = s.footerReplyHint;
        // Combine sections progressively respecting maxChars
        const chunks = [];
        const pushChunkOrSplit = (text) => {
            const trimmed = text.trim();
            if (!trimmed)
                return;
            if (trimmed.length <= maxChars) {
                chunks.push(trimmed);
                return;
            }
            // If text exceeds maxChars, split on double newlines
            const parts = trimmed.split("\n\n");
            let subChunk = "";
            for (const part of parts) {
                const candidate = subChunk ? `${subChunk}\n\n${part}` : part;
                if (candidate.length > maxChars && subChunk.length > 0) {
                    pushChunkOrSplit(subChunk);
                    subChunk = part;
                }
                else {
                    subChunk = candidate;
                }
            }
            if (subChunk.trim().length > 0) {
                if (subChunk.length > maxChars) {
                    // Fallback: split on single newlines
                    const lines = subChunk.split("\n");
                    let lineChunk = "";
                    for (const line of lines) {
                        const cand = lineChunk ? `${lineChunk}\n${line}` : line;
                        if (cand.length > maxChars && lineChunk.length > 0) {
                            chunks.push(lineChunk.trim());
                            lineChunk = line;
                        }
                        else {
                            lineChunk = cand;
                        }
                    }
                    if (lineChunk.trim().length > 0) {
                        chunks.push(lineChunk.trim());
                    }
                }
                else {
                    chunks.push(subChunk.trim());
                }
            }
        };
        let currentChunk = headerLines.join("\n");
        for (const dayText of daySections) {
            const candidate = `${currentChunk}\n\n${dayText}`;
            if (candidate.length > maxChars && currentChunk.trim().length > 0) {
                pushChunkOrSplit(currentChunk);
                currentChunk = dayText;
            }
            else {
                currentChunk = candidate;
            }
        }
        // Append budget section and footer
        const finalCandidate = `${currentChunk}\n\n${budgetSection}${footer}`;
        if (finalCandidate.length > maxChars && currentChunk.trim().length > 0) {
            pushChunkOrSplit(currentChunk);
            pushChunkOrSplit(`${budgetSection}${footer}`);
        }
        else {
            pushChunkOrSplit(finalCandidate);
        }
        return chunks;
    }
    /**
     * Formats a ModificationResult for WhatsApp delivery.
     */
    static formatModificationResult(result: import("./modification-intent.types.js").ModificationResult, language = "en") {
        const s = MULTILINGUAL_PRESENTER_STRINGS[language] || MULTILINGUAL_PRESENTER_STRINGS.en;
        if (result.status === "modified" && result.snapshot) {
            const summaryPrefix = `${s.updatedHeader(result.snapshot.itineraryVersion)}\n${result.explanation}\n\n`;
            const presented = this.presentItinerary(result.snapshot, env.WHATSAPP_MAX_MESSAGE_CHARACTERS, language);
            if (presented.length > 0) {
                presented[0] = summaryPrefix + presented[0];
                return presented;
            }
            return [summaryPrefix.trim()];
        }
        if (result.status === "clarification_needed") {
            return [`${s.clarificationHeader}\n${result.explanation}`];
        }
        if (result.status === "no_change") {
            return [`${s.noChangeHeader}\n${result.explanation}`];
        }
        // failed
        return [`${s.failedHeader}\n${result.explanation}`];
    }
}
export const ItineraryPresenter = ItineraryPresenterService;
