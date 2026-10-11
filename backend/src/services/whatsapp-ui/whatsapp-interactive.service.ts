import { WizardScreensPresenter } from "./presentation/screens/wizard-screens.presenter.js";
import { ItineraryScreensPresenter } from "./presentation/screens/itinerary-screens.presenter.js";
import { MenuScreensPresenter } from "./presentation/screens/menu-screens.presenter.js";
import { ITripDocument } from "../../models/Trip.js";
import { PersistedItinerarySnapshot } from "../itinerary/itinerary-persistence.types.js";
import { DailyForecast } from "../../tools/weather.tool.js";

/**
 * Backward-compatible Facade for WhatsApp Interactive UI Presentation.
 * Thinly delegates calls to specialized screen presenters.
 */
export class WhatsAppInteractiveService {
    // --- Main & Menu Screens ---
    static sendMainMenu(to: string, lang = "en") {
        return MenuScreensPresenter.sendMainMenu(to, lang);
    }
    static sendActiveTripMenu(to: string, trip: ITripDocument | null, lang = "en") {
        return MenuScreensPresenter.sendActiveTripMenu(to, trip, lang);
    }
    static sendTripCancelConfirmMenu(to: string, tripId: string, lang = "en", options: {
        isUpcoming?: boolean;
        destination?: string;
    }) {
        return MenuScreensPresenter.sendTripCancelConfirmMenu(to, tripId, lang, options);
    }
    static sendLanguageMenu(to: string, lang = "en") {
        return MenuScreensPresenter.sendLanguageMenu(to, lang);
    }
    static sendHelpMenu(to: string, lang = "en") {
        return MenuScreensPresenter.sendHelpMenu(to, lang);
    }
    static sendLocationMenu(to: string, lang = "en", hasLocationPin = false) {
        return MenuScreensPresenter.sendLocationMenu(to, lang, hasLocationPin);
    }
    static sendLocationDiscoveryMenu(to: string, lang = "en", headerOrIntro?: string) {
        return MenuScreensPresenter.sendLocationDiscoveryMenu(to, lang, headerOrIntro);
    }
    static sendLocationCategoryMenu(to: string, lang = "en") {
        return MenuScreensPresenter.sendLocationCategoryMenu(to, lang);
    }
    static sendWeatherCard(to: string, destination: string, forecasts: DailyForecast[], tripId: string, lang = "en", dateRangeStr: string) {
        return MenuScreensPresenter.sendWeatherCard(to, destination, forecasts, tripId, lang, dateRangeStr);
    }
    static hasCompletedItinerary(trip: ITripDocument | null | undefined) {
        if (!trip)
            return false;
        const snapshot = (trip.itinerarySnapshot ||
            trip.itinerary);
        return ((trip.planningState === "completed" || trip.status === "confirmed") &&
            Boolean(snapshot?.days && snapshot.days.length > 0));
    }
    // --- Wizard Screens ---
    static sendDestinationMenu(to: string, lang = "en") {
        return WizardScreensPresenter.sendDestinationMenu(to, lang);
    }
    static sendPlanTripPrompt(to: string, lang = "en") {
        return WizardScreensPresenter.sendPlanTripPrompt(to, lang);
    }
    static sendTravelDateMenu(to: string, destination = "your destination", tripId: string, lang = "en") {
        return WizardScreensPresenter.sendTravelDateMenu(to, destination, tripId, lang);
    }
    static sendCustomDatePrompt(to: string, destination = "your destination", tripId: string, lang = "en") {
        return WizardScreensPresenter.sendCustomDatePrompt(to, destination, tripId, lang);
    }
    static sendDurationMenu(to: string, destination = "your destination", tripId: string, lang = "en", startDateIso: string) {
        return WizardScreensPresenter.sendDurationMenu(to, destination, tripId, lang, startDateIso);
    }
    static sendCustomDaysPrompt(to: string, destination = "your destination", tripId: string, lang = "en") {
        return WizardScreensPresenter.sendCustomDaysPrompt(to, destination, tripId, lang);
    }
    static sendTravelerMenu(to: string, destination = "your destination", durationDays = 3, tripId: string, lang = "en", startDateIso: string) {
        return WizardScreensPresenter.sendTravelerMenu(to, destination, durationDays, tripId, lang, startDateIso);
    }
    static sendGroupSizePicker(to: string, destination = "your destination", durationDays = 3, tripId: string, lang = "en") {
        return WizardScreensPresenter.sendGroupSizePicker(to, destination, durationDays, tripId, lang);
    }
    static sendCustomTravelersPrompt(to: string, destination = "your destination", durationDays = 3, tripId: string, lang = "en") {
        return WizardScreensPresenter.sendCustomTravelersPrompt(to, destination, durationDays, tripId, lang);
    }
    static sendBudgetMenu(to: string, destination = "your destination", durationDays = 3, travelers = 1, tripId: string, lang = "en", startDateIso: string) {
        return WizardScreensPresenter.sendBudgetMenu(to, destination, durationDays, travelers, tripId, lang, startDateIso);
    }
    static sendCustomBudgetPrompt(to: string, destination = "your destination", durationDays = 3, tripId: string, lang = "en") {
        return WizardScreensPresenter.sendCustomBudgetPrompt(to, destination, durationDays, tripId, lang);
    }
    static sendInterestMenu(to: string, destination = "your destination", durationDays = 3, budgetCategory = "moderate", selectedInterests = [], tripId: string, lang = "en", startDateIso: string) {
        return WizardScreensPresenter.sendInterestMenu(to, destination, durationDays, budgetCategory, selectedInterests, tripId, lang, startDateIso);
    }
    static sendPacingMenu(to: string, destination = "your destination", durationDays = 3, preferredPace = "balanced", tripId: string, lang = "en", tripContext: any) {
        return WizardScreensPresenter.sendPacingMenu(to, destination, durationDays, preferredPace, tripId, lang, tripContext);
    }
    static sendTripConfirmationCard(to: string, trip: any, lang = "en") {
        return WizardScreensPresenter.sendTripConfirmationCard(to, trip, lang);
    }
    static sendTripEditMenu(to: string, tripId: string, lang = "en") {
        return WizardScreensPresenter.sendTripEditMenu(to, tripId, lang);
    }
    static sendGenerationErrorMenu(to: string, tripId: string, lang = "en") {
        return WizardScreensPresenter.sendGenerationErrorMenu(to, tripId, lang);
    }
    // --- Itinerary Screens ---
    static sendDayItinerary(to: string, trip: ITripDocument, snapshot: PersistedItinerarySnapshot, dayNumber = 1, lang = "en") {
        return ItineraryScreensPresenter.sendDayItinerary(to, trip, snapshot, dayNumber, lang);
    }
    static sendItineraryActions(to: string, trip: ITripDocument, snapshot: PersistedItinerarySnapshot, lang = "en") {
        return ItineraryScreensPresenter.sendItineraryActions(to, trip, snapshot, lang);
    }
}
