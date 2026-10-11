import { HUMAN_FRIENDLY_INTEREST_LABELS, MULTILINGUAL_UI_STRINGS, formatLocalizedDuration, formatLocalizedTravelers } from "../whatsapp-ui.strings.js";
import { formatDisplayDateRange } from "../../../utils/date-parser.js";
import { deduplicateInterests } from "../../../utils/interest-normalizer.js";
import { TripLifecycleService } from "../../trip/trip-lifecycle.service.js";

export class TripSummaryFormatter {
    /**
     * Formats the trip confirmation card text summary.
     */
    static formatConfirmationSummary(trip: any, lang = "en") {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const sum = strings.wizardUI.summary;
        const req = (trip.requirements || trip);
        const destination = trip.destination || req.destination || "Destination";
        const durationDays = req.durationDays || 3;
        const durationStr = formatLocalizedDuration(durationDays, lang);
        const travelerCount = req.travelers?.total || (typeof req.travelers === "number" ? req.travelers : 1);
        const travelersStr = formatLocalizedTravelers(travelerCount, lang);
        const startDateIso = req.startDate ||
            (trip.startDate instanceof Date
                ? `${trip.startDate.getFullYear()}-${String(trip.startDate.getMonth() + 1).padStart(2, "0")}-${String(trip.startDate.getDate()).padStart(2, "0")}`
                : typeof trip.startDate === "string"
                    ? trip.startDate
                    : undefined);
        const dateRangeStr = startDateIso ? formatDisplayDateRange(startDateIso, durationDays) : undefined;
        let budgetStr = strings.wizardUI.budget.categories.moderate;
        const rawBudget = req.budget || trip.budget;
        if (rawBudget && typeof rawBudget === "object") {
            if (typeof rawBudget.maxTotalAmount === "number" && rawBudget.maxTotalAmount > 0) {
                budgetStr = `₹${rawBudget.maxTotalAmount.toLocaleString("en-IN")}`;
            }
            else if (rawBudget.category) {
                const cat = rawBudget.category;
                budgetStr = strings.wizardUI.budget.categories[cat] || strings.wizardUI.budget.categories.moderate;
            }
        }
        else if (typeof rawBudget === "number" && rawBudget > 0) {
            budgetStr = `₹${rawBudget.toLocaleString("en-IN")}`;
        }
        else if (typeof rawBudget === "string") {
            const cat = rawBudget;
            budgetStr = strings.wizardUI.budget.categories[cat] || strings.wizardUI.budget.categories.moderate;
        }
        const rawInterests = deduplicateInterests(req.interests || []);
        let interestsLines = [sum.famousPlacesDefault];
        if (Array.isArray(rawInterests) && rawInterests.length > 0) {
            const renderedLabels = rawInterests.map((i) => `• ${HUMAN_FRIENDLY_INTEREST_LABELS[i] || (i.charAt(0).toUpperCase() + i.slice(1).replace(/_/g, " "))}`);
            interestsLines = Array.from(new Set(renderedLabels));
        }
        const interestsHeader = `${sum.interestsLabel}`;
        const cardLines = [
            sum.confirmationHeader,
            "",
            `${sum.destinationLabel} ${destination}`
        ];
        if (dateRangeStr) {
            cardLines.push(`${sum.travelDatesLabel} ${dateRangeStr}`);
        }
        cardLines.push(`${sum.durationLabel} ${durationStr}`, `${sum.travelersLabel} ${travelersStr}`, `${sum.budgetLabel} ${budgetStr}`, "", interestsHeader, ...interestsLines, "", sum.readyPrompt);
        return cardLines.join("\n");
    }
    /**
     * Formats Trip Summary Card respecting exact Trip Lifecycle state.
     */
    static formatActiveTripCard(trip: any, hasCompletedItinerary: boolean, lang = "en", targetDate = new Date()) {
        const strings = MULTILINGUAL_UI_STRINGS[lang] || MULTILINGUAL_UI_STRINGS.en;
        const sum = strings.wizardUI.summary;
        const req = (trip.requirements || trip || {});
        const destination = trip.destination || req.destination || "Unknown";
        const durationDays = req.durationDays || (trip.itinerarySnapshot?.days?.length) || 3;
        const durationStr = formatLocalizedDuration(durationDays, lang);
        const travelerCount = req.travelers?.total || (typeof req.travelers === "number" ? req.travelers : undefined);
        const travelersStr = travelerCount ? formatLocalizedTravelers(travelerCount, lang) : sum.notSet;
        const startDateIso = req.startDate ||
            (trip.startDate instanceof Date
                ? `${trip.startDate.getFullYear()}-${String(trip.startDate.getMonth() + 1).padStart(2, "0")}-${String(trip.startDate.getDate()).padStart(2, "0")}`
                : typeof trip.startDate === "string"
                    ? trip.startDate
                    : undefined);
        const dateRangeStr = startDateIso ? formatDisplayDateRange(startDateIso, durationDays) : sum.notSet;
        let budgetStr = strings.wizardUI.budget.categories.moderate;
        const rawBudget = req.budget || trip.budget;
        if (rawBudget && typeof rawBudget === "object") {
            if (typeof rawBudget.maxTotalAmount === "number" && rawBudget.maxTotalAmount > 0) {
                budgetStr = `₹${rawBudget.maxTotalAmount.toLocaleString("en-IN")}`;
            }
            else if (rawBudget.category) {
                const cat = rawBudget.category;
                budgetStr = strings.wizardUI.budget.categories[cat] || strings.wizardUI.budget.categories.moderate;
            }
        }
        else if (typeof rawBudget === "number" && rawBudget > 0) {
            budgetStr = `₹${rawBudget.toLocaleString("en-IN")}`;
        }
        else if (typeof rawBudget === "string") {
            const cat = rawBudget;
            budgetStr = strings.wizardUI.budget.categories[cat] || strings.wizardUI.budget.categories.moderate;
        }
        const rawInterests = deduplicateInterests(req.interests || []);
        let interestsStr;
        if (Array.isArray(rawInterests) && rawInterests.length > 0) {
            const renderedLabels = rawInterests.map((i) => HUMAN_FRIENDLY_INTEREST_LABELS[i] || (i.charAt(0).toUpperCase() + i.slice(1).replace(/_/g, " ")));
            interestsStr = Array.from(new Set(renderedLabels)).join(", ");
        }
        // Determine exact lifecycle state
        const lifecycle = TripLifecycleService.calculateLifecycle(trip, targetDate);
        let header = sum.activeTripHeader;
        let statusText = hasCompletedItinerary ? sum.statusReady : sum.statusCollecting;
        let countdownOrProgressLine;
        if (lifecycle.state === "UPCOMING") {
            header = sum.upcomingTripHeader;
            statusText = sum.statusUpcoming;
            if (lifecycle.daysUntilStart !== undefined) {
                countdownOrProgressLine = sum.startsInDays(lifecycle.daysUntilStart);
            }
        }
        else if (lifecycle.state === "ACTIVE") {
            header = sum.activeTripHeader;
            statusText = sum.statusActive;
            if (lifecycle.currentDayNumber && lifecycle.totalDays) {
                countdownOrProgressLine = sum.activeDayProgress(lifecycle.currentDayNumber, lifecycle.totalDays);
            }
        }
        else if (lifecycle.state === "COMPLETED") {
            header = sum.completedTripHeader;
            statusText = sum.statusCompleted;
        }
        else if (lifecycle.state === "CANCELLED") {
            header = sum.cancelledTripHeader;
            statusText = sum.statusCancelled;
        }
        else if (lifecycle.state === "PLANNING") {
            header = sum.planningTripHeader;
            statusText = sum.statusCollecting;
        }
        const cardLines = [
            header,
            "",
            `${sum.destinationLabel} ${destination}`,
            `${sum.travelDatesLabel} ${dateRangeStr}`
        ];
        if (countdownOrProgressLine) {
            cardLines.push(countdownOrProgressLine);
        }
        cardLines.push(`${sum.durationLabel} ${durationStr}`, `${sum.travelersLabel} ${travelersStr}`, `${sum.budgetLabel} ${budgetStr}`);
        if (interestsStr) {
            cardLines.push(`${sum.interestsLabel} ${interestsStr}`);
        }
        const statusIcon = lifecycle.state === "UPCOMING"
            ? "📅"
            : lifecycle.state === "ACTIVE"
                ? "🚗"
                : lifecycle.state === "COMPLETED"
                    ? "🏁"
                    : lifecycle.state === "CANCELLED"
                        ? "❌"
                        : hasCompletedItinerary
                            ? "✅"
                            : "📌";
        cardLines.push(`${statusIcon} *${sum.statusLabel}* ${statusText}`);
        return cardLines.join("\n");
    }
}
