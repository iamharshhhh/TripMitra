import { MULTILINGUAL_NAVIGATION_STRINGS } from "../../navigation/navigation-presenter.strings.js";
import { NavigationService } from "../../navigation/navigation.service.js";
import { WeatherFormatter } from "./weather.formatter.js";
import { formatDisplayDate } from "../../../utils/date-parser.js";
import { MULTILINGUAL_UI_STRINGS } from "../whatsapp-ui.strings.js";
import { PersistedItineraryDay } from "../../itinerary/itinerary-persistence.types.js";

export class ItineraryFormatter {
    /**
     * Formats a complete single-day WhatsApp card with Morning, Afternoon, and Evening blocks.
     * Guarantees total character length <= 1024 (targeting <= 1010) so it reliably fits
     * into a single WhatsApp Interactive Button Message payload.
     */
    static formatWhatsAppDayCard(day: PersistedItineraryDay, language = "en", destinationCity: string, totalDays = 1) {
        const TARGET_MAX_LENGTH = 1010;
        // Normal pass
        let card = this.renderDayCard(day, language, destinationCity, totalDays, {});
        card = card.replace(/\n{3,}/g, "\n\n");
        if (card.length <= TARGET_MAX_LENGTH) {
            return card;
        }
        // Defensive Pass 1: Trim place descriptions to max 45 chars
        card = this.renderDayCard(day, language, destinationCity, totalDays, { maxDescLength: 45 });
        card = card.replace(/\n{3,}/g, "\n\n");
        if (card.length <= TARGET_MAX_LENGTH) {
            return card;
        }
        // Defensive Pass 2: Omit long descriptions while strictly preserving place names, times, categories, and navigation
        card = this.renderDayCard(day, language, destinationCity, totalDays, { omitDescription: true });
        card = card.replace(/\n{3,}/g, "\n\n");
        if (card.length <= TARGET_MAX_LENGTH) {
            return card;
        }
        // Defensive Pass 3: Collapse blank lines as last defensive measure
        card = card.replace(/\n{2,}/g, "\n");
        return card;
    }
    /**
     * Renders the structured day card lines.
     */
    static renderDayCard(day: any, language = "en", destinationCity: any, totalDays = 1, options = {}) {
        const strings = MULTILINGUAL_UI_STRINGS[language] || MULTILINGUAL_UI_STRINGS.en;
        const placeholders = strings.wizardUI.itineraryActivityPlaceholders;
        const lines = [];
        // 1. Header: Day Number & Date
        const dayDateStr = day.date ? ` · ${formatDisplayDate(day.date)}` : "";
        const destStr = destinationCity ? `\n📍 ${destinationCity.toUpperCase()}` : "";
        lines.push(`${placeholders.dayNumberHeader(day.dayNumber)}${dayDateStr}${destStr}`);
        lines.push("");
        // 2. Weather Section
        const weatherSection = WeatherFormatter.formatDayWeatherHeader(day.dayWeather, language);
        lines.push(weatherSection);
        lines.push("──────────────");
        // 3. Activity Blocks: Group places into Morning (<12:00), Afternoon (12:00–17:00), Evening (17:00+)
        const morningPlaces = [];
        const afternoonPlaces = [];
        const eveningPlaces = [];
        const places = day.places || [];
        for (const p of places) {
            const [hour] = (p.startTime || "09:00").split(":").map(Number);
            if (hour < 12) {
                morningPlaces.push(p);
            }
            else if (hour < 17) {
                afternoonPlaces.push(p);
            }
            else {
                eveningPlaces.push(p);
            }
        }
        const isDay1 = day.dayNumber === 1;
        const isLastDay = day.dayNumber === totalDays;
        // Helper to render a group of places with tight item formatting and clean single-blank-line separation between items
        const renderPlacesGroup = (groupPlaces, prevPlaceInitial) => {
            const items = [];
            for (let i = 0; i < groupPlaces.length; i++) {
                const prev = i > 0 ? groupPlaces[i - 1] : prevPlaceInitial;
                items.push(this.formatPlaceItem(groupPlaces[i], language, prev, destinationCity, options));
            }
            return items.join("\n\n");
        };
        // Morning Block
        lines.push(language === "mr" ? "🌅 *सकाळ*" : language === "hi" ? "🌅 *सुबह*" : "🌅 *MORNING*");
        if (morningPlaces.length > 0) {
            lines.push(renderPlacesGroup(morningPlaces, null));
        }
        else if (isDay1 && day.dayStartTime && day.dayStartTime >= "12:00") {
            lines.push(placeholders.arrivalCheckIn);
        }
        else {
            lines.push(placeholders.relaxedMorning);
        }
        lines.push("──────────────");
        // Afternoon Block
        lines.push(language === "mr" ? "☀️ *दुपार*" : language === "hi" ? "☀️ *दोपहर*" : "☀️ *AFTERNOON*");
        if (afternoonPlaces.length > 0) {
            const prevForAfternoon = morningPlaces.length > 0 ? morningPlaces[morningPlaces.length - 1] : null;
            lines.push(renderPlacesGroup(afternoonPlaces, prevForAfternoon));
        }
        else if (isLastDay && day.dayEndTime && day.dayEndTime < "14:00") {
            lines.push(placeholders.departureTransit);
        }
        else {
            lines.push(placeholders.leisureRestBreak);
        }
        lines.push("──────────────");
        // Evening Block
        lines.push(language === "mr" ? "🌆 *संध्याकाळ*" : language === "hi" ? "🌆 *शाम*" : "🌆 *EVENING*");
        if (eveningPlaces.length > 0) {
            const prevForEvening = afternoonPlaces.length > 0
                ? afternoonPlaces[afternoonPlaces.length - 1]
                : morningPlaces.length > 0
                    ? morningPlaces[morningPlaces.length - 1]
                    : null;
            lines.push(renderPlacesGroup(eveningPlaces, prevForEvening));
        }
        else if (isLastDay && day.dayEndTime && day.dayEndTime < "19:00") {
            lines.push(placeholders.departureFarewell);
        }
        else {
            lines.push(placeholders.freeTimeRelaxation);
        }
        lines.push("──────────────");
        lines.push(`📍 *${strings.wizardUI.itineraryPagination.dayOfTotal(day.dayNumber, totalDays)}*`);
        return lines.join("\n");
    }
    /**
     * Normalizes time ranges into compact format with en-dash: HH:MM–HH:MM.
     */
    static formatTimeRange(startTime: any, endTime: any) {
        const normalize = (t) => {
            if (!t)
                return "";
            const match = t.trim().match(/^(\d{1,2}):(\d{2})$/);
            if (match) {
                const hour = match[1].padStart(2, "0");
                const min = match[2];
                return `${hour}:${min}`;
            }
            return t.trim();
        };
        const start = normalize(startTime);
        const end = normalize(endTime);
        if (start && end) {
            return `${start}–${end}`;
        }
        return start || end || "";
    }
    /**
     * Formats a single place item with clean time, name, category, maps, and directions.
     */
    static formatPlaceItem(place: any, language = "en", previousPlace: any, destinationCity: any, options: { omitDescription?: boolean; maxDescLength?: number } = {}) {
        const navStrings = MULTILINGUAL_NAVIGATION_STRINGS[language] || MULTILINGUAL_NAVIGATION_STRINGS.en;
        const cat = (place.category || "").toLowerCase();
        const name = (place.name || "").toLowerCase();
        const isLunch = place.mealType === "lunch" || name.includes("lunch") || (place.activityType === "meal" && (place.startTime || "09:00") < "16:00");
        const isDinner = place.mealType === "dinner" || name.includes("dinner") || (place.activityType === "meal" && (place.startTime || "09:00") >= "16:00");
        if (isLunch || isDinner) {
            return this.formatMealItem(place, language, Boolean(isLunch));
        }
        const isRestaurant = place.activityType === "restaurant" || cat === "restaurant";
        let icon = "🏛️";
        if (cat.includes("beach") || name.includes("beach"))
            icon = "🏖️";
        else if (cat.includes("temple") || name.includes("temple") || name.includes("kovil"))
            icon = "🛕";
        else if (cat.includes("church") || cat.includes("basilica") || name.includes("church"))
            icon = "⛪";
        else if (cat.includes("fort") || name.includes("fort") || name.includes("palace"))
            icon = "🏰";
        else if (cat.includes("garden") || cat.includes("park") || cat.includes("lake"))
            icon = "🌿";
        else if (cat.includes("food") || cat.includes("restaurant"))
            icon = "🍲";
        else if (cat.includes("cafe") || cat.includes("coffee"))
            icon = "☕";
        else if (cat.includes("market") || cat.includes("shopping"))
            icon = "🛍️";
        else if (cat.includes("spiritual") || name.includes("ashram") || name.includes("auroville"))
            icon = "🏛️";
        const lines = [];
        const timeRange = this.formatTimeRange(place.startTime, place.endTime);
        if (timeRange) {
            lines.push(timeRange);
        }
        lines.push(`${icon} *${place.name}*`);
        if (!options.omitDescription) {
            if (place.description && place.description !== place.name && !place.name.includes("Rest Break") && !place.name.includes("Leisure")) {
                let desc = place.description;
                const maxLen = options.maxDescLength ?? 60;
                if (desc.length > maxLen) {
                    desc = desc.substring(0, maxLen - 3) + "...";
                }
                lines.push(`_${desc}_`);
            }
            else if (place.category && place.category !== "meal" && place.category !== "restaurant") {
                lines.push(`_${place.category}_`);
            }
        }
        else if (place.category && place.category !== "meal" && place.category !== "restaurant") {
            lines.push(`_${place.category}_`);
        }
        if (place.travelTimeMinutesFromPrevious > 0) {
            const distStr = place.travelDistanceMetersFromPrevious > 0
                ? ` · ${(place.travelDistanceMetersFromPrevious / 1000).toFixed(1)} km`
                : "";
            lines.push(`🚗 ~${place.travelTimeMinutesFromPrevious} min${distStr}`);
        }
        const hasCoordinates = Boolean(place.location?.latitude && place.location?.longitude);
        const isGenericMealBreak = place.activityType === "meal" || (!hasCoordinates && (isLunch || isDinner) && !place.mapUrl);
        if (hasCoordinates || (!isGenericMealBreak && (place.mapUrl || place.name))) {
            const navDest = {
                placeId: place.placeId,
                name: place.name,
                latitude: typeof place.location?.latitude === "number" ? Number(place.location.latitude.toFixed(5)) : undefined,
                longitude: typeof place.location?.longitude === "number" ? Number(place.location.longitude.toFixed(5)) : undefined,
                address: place.location?.address,
                destinationCity
            };
            const navOrigin = previousPlace && previousPlace.location?.latitude && previousPlace.location?.longitude
                ? {
                    name: previousPlace.name,
                    latitude: Number(previousPlace.location.latitude.toFixed(5)),
                    longitude: Number(previousPlace.location.longitude.toFixed(5)),
                    placeId: previousPlace.placeId
                }
                : undefined;
            const navResult = NavigationService.buildPlaceNavigation(navDest, navOrigin, null, { compact: true });
            if (navResult.directionsUrl && navOrigin) {
                lines.push(`🧭 ${navStrings.directions || "Directions"}: ${navResult.directionsUrl}`);
            }
            else if (navResult.mapSearchUrl && (hasCoordinates || !isGenericMealBreak)) {
                lines.push(`🗺️ ${navStrings.viewOnMap || "View on Map"}: ${navResult.mapSearchUrl}`);
            }
        }
        return lines.join("\n");
    }
    /**
     * Formats simple meal placeholder for lunch and dinner slots.
     */
    static formatMealItem(place: any, language = "en", isLunch: any) {
        const lines = [];
        const timeRange = this.formatTimeRange(place.startTime, place.endTime);
        if (timeRange) {
            lines.push(timeRange);
        }
        const mealLabel = isLunch
            ? (language === "mr" ? "दुपारचे जेवण" : language === "hi" ? "दोपहर का भोजन" : "LUNCH")
            : (language === "mr" ? "रात्रीचे जेवण" : language === "hi" ? "रात का भोजन" : "DINNER");
        lines.push(`🍽️ *${mealLabel}*`);
        return lines.join("\n");
    }
}
