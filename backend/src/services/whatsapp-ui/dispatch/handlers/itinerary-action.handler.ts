import { WhatsAppInteractiveService } from "../../whatsapp-interactive.service.js";
import { MenuScreensPresenter } from "../../presentation/screens/menu-screens.presenter.js";
import { TripRepository } from "../../../../repositories/trip.repository.js";
import { ItineraryPresenterService } from "../../../itinerary/itinerary-presenter.service.js";
import { ItineraryModifierService } from "../../../itinerary/itinerary-modifier.service.js";
import { NavigationService } from "../../../navigation/navigation.service.js";
import { logger } from "../../../../utils/logger.js";
import { TypedAction } from "../../whatsapp-ui.types.js";
import { SupportedLanguage } from "../../../language/language-detector.service.js";
import { PersistedItinerarySnapshot } from "../../../itinerary/itinerary-persistence.types.js";
import { ITripDocument } from "../../../../models/Trip.js";

export interface ItineraryHandlerParams {
    action: TypedAction;
    userId: string;
    conversationId: string;
    phoneNumber: string;
    activeLanguage: SupportedLanguage;
    trip: ITripDocument;
}

export class ItineraryActionHandler {
    static modifierService = new ItineraryModifierService();
    /**
     * Validates optimistic concurrency control (OCC) version against expected payload version.
     */
    static validateOCCVersion(snapshot: PersistedItinerarySnapshot | null | undefined, expectedVersion: number, destination: string, activeLanguage: SupportedLanguage) {
        const currentVersion = snapshot?.itineraryVersion || 1;
        if (expectedVersion !== currentVersion) {
            logger.warn({ expectedVersion, currentVersion, destination }, "Optimistic Concurrency Control (OCC) rejected stale modification action");
            const notice = `⚠️ This itinerary has already updated to Version ${currentVersion}. ` +
                `Please use the controls on the latest version above.`;
            const fallbackMenu = WhatsAppInteractiveService.sendMainMenu("", activeLanguage);
            return {
                isValid: false,
                safeResponse: {
                    ...fallbackMenu,
                    textMessages: [notice]
                }
            };
        }
        return { isValid: true };
    }
    /**
     * Handles all day-by-day navigation, directions, and modification actions.
     */
    static async handleAction(params: ItineraryHandlerParams) {
        const { action, userId, phoneNumber, activeLanguage, trip } = params;
        const snapshot = trip.itinerarySnapshot;
        if (action.type === "VIEW_TRIP" || action.type === "FULL_ITINERARY") {
            if (!snapshot || !snapshot.days || snapshot.days.length === 0) {
                return WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, trip, activeLanguage);
            }
            return WhatsAppInteractiveService.sendDayItinerary(phoneNumber, trip, snapshot, 1, activeLanguage);
        }
        if (action.type === "VIEW_DAY" || action.type === "DAY_NEXT" || action.type === "DAY_PREV") {
            if (!snapshot || !snapshot.days || snapshot.days.length === 0) {
                return WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, trip, activeLanguage);
            }
            const dayNum = "dayNumber" in action ? action.dayNumber : 1;
            return WhatsAppInteractiveService.sendDayItinerary(phoneNumber, trip, snapshot, dayNum, activeLanguage);
        }
        if (action.type === "DIRECTIONS") {
            const places = snapshot?.days?.flatMap((d) => d.places) || [];
            const placeIndex = action.placeIndex !== undefined ? action.placeIndex : 0;
            const place = places[placeIndex] || places[0];
            const navDest = {
                placeId: place?.placeId || "unknown",
                name: place?.name || trip.destination,
                latitude: place?.location?.latitude,
                longitude: place?.location?.longitude,
                address: place?.location?.address,
                destinationCity: trip.destination
            };
            const navResult = NavigationService.buildPlaceNavigation(navDest);
            const navUrl = navResult.directionsUrl ||
                navResult.mapSearchUrl ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place?.name || trip.destination)}`;
            const dirText = `🗺️ *Directions to ${place?.name || "Attraction"}*\n\nOpen in Google Maps: ${navUrl}`;
            const menu = WhatsAppInteractiveService.sendItineraryActions(phoneNumber, trip, snapshot, activeLanguage);
            return {
                ...menu,
                textMessages: [dirText]
            };
        }
        if (action.type === "MODIFY_MENU") {
            const occCheck = this.validateOCCVersion(snapshot, action.expectedVersion, trip.destination, activeLanguage);
            if (!occCheck.isValid) {
                return occCheck.safeResponse;
            }
            return MenuScreensPresenter.buildModificationMenu(phoneNumber, trip._id.toString(), snapshot.itineraryVersion, activeLanguage);
        }
        if (action.type === "MAKE_CHEAPER" ||
            action.type === "LESS_WALKING" ||
            action.type === "MORE_HISTORY" ||
            action.type === "MORE_FOOD" ||
            action.type === "REDUCE_PACE") {
            const occCheck = this.validateOCCVersion(snapshot, action.expectedVersion, trip.destination, activeLanguage);
            if (!occCheck.isValid) {
                return occCheck.safeResponse;
            }
            const intent = {
                action: (action.type === "MAKE_CHEAPER"
                    ? "adjust_budget"
                    : action.type === "LESS_WALKING"
                        ? "adjust_walking"
                        : action.type === "MORE_HISTORY" || action.type === "MORE_FOOD"
                            ? "adjust_interests"
                            : "adjust_pace") as any,
                scope: "trip_level",
                requiresClarification: false,
                adjustments: {
                    makeCheaper: action.type === "MAKE_CHEAPER" ? true : undefined,
                    budgetCategory: action.type === "MAKE_CHEAPER" ? "budget" : undefined,
                    walkingTolerance: action.type === "LESS_WALKING" ? "minimal" : undefined,
                    addedInterests: action.type === "MORE_HISTORY"
                        ? ["historic"]
                        : action.type === "MORE_FOOD"
                            ? ["food"]
                            : [],
                    removedInterests: [],
                    preferredPace: action.type === "REDUCE_PACE" ? "relaxed" : undefined,
                    specialRequests: []
                }
            };
            try {
                const modResult = await this.modifierService.modifyItinerary(trip._id.toString(), userId, intent as any);
                const formattedChunks = ItineraryPresenterService.formatModificationResult(modResult as any, activeLanguage);
                const updatedTrip = await TripRepository.findById(trip._id.toString());
                const updatedSnapshot = (updatedTrip?.itinerarySnapshot ||
                    modResult.snapshot);
                const newMenu = WhatsAppInteractiveService.sendItineraryActions(phoneNumber, updatedTrip || trip, updatedSnapshot, activeLanguage);
                return {
                    ...newMenu,
                    textMessages: formattedChunks
                };
            }
            catch (modErr) {
                logger.error({ err: modErr, tripId: trip._id.toString() }, "Error executing modifier via UI action");
                const fallbackMsg = "⚠️ We encountered an issue modifying this trip. Here is your current plan:";
                const currentMenu = WhatsAppInteractiveService.sendItineraryActions(phoneNumber, trip, snapshot, activeLanguage);
                return {
                    ...currentMenu,
                    textMessages: [fallbackMsg]
                };
            }
        }
        return WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
    }
}
