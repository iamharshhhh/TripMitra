import { WhatsAppInteractiveService } from "./whatsapp-interactive.service.js";
import { TripRepository } from "../../repositories/trip.repository.js";
import { ConversationRepository } from "../../repositories/conversation.repository.js";
import { logger, maskPhoneNumber } from "../../utils/logger.js";
import { WizardActionHandler } from "./dispatch/handlers/wizard-action.handler.js";
import { ItineraryActionHandler } from "./dispatch/handlers/itinerary-action.handler.js";
import { SystemActionHandler } from "./dispatch/handlers/system-action.handler.js";
import { SupportedLanguage } from "../language/language-detector.service.js";
import { PersistedItinerarySnapshot } from "../itinerary/itinerary-persistence.types.js";
import { TypedAction } from "./whatsapp-ui.types.js";

export interface ActionHandlerParams {
    action: TypedAction;
    userId: string;
    conversationId: string;
    phoneNumber: string;
    activeLanguage: SupportedLanguage;
}

/**
 * Action sets for deterministic routing to specialized sub-handlers.
 */
const SYSTEM_ACTIONS = new Set([
    "HOME",
    "BACK",
    "HELP",
    "PLAN_TRIP",
    "TRIP_NEW",
    "TRIP_CHANGE_DESTINATION",
    "MY_TRIP",
    "TRIP_CONTINUE",
    "RESUME_WIZARD",
    "LANGUAGE_MENU",
    "SET_LANGUAGE",
    "LOCATION_MENU",
    "LOC_CAT",
    "LOCATION_NEXT_STOP",
    "NEARBY_PLACES",
    "WEATHER",
    "WEATHER_REFRESH",
    "TRIP_CANCEL_PROMPT",
    "TRIP_CANCEL_CONFIRM",
    "TRIP_CANCEL_ABORT"
]);
const WIZARD_ACTIONS = new Set([
    "SET_DESTINATION",
    "TRAVEL_DATE",
    "SET_TRAVEL_DATE",
    "CUSTOM_DATE",
    "SET_DURATION",
    "CUSTOM_DAYS",
    "SET_TRAVELERS",
    "GROUP_SIZE_PICKER",
    "CUSTOM_TRAVELERS",
    "SET_BUDGET",
    "CUSTOM_BUDGET",
    "SET_INTERESTS",
    "TOGGLE_INTEREST",
    "INTERESTS_DONE",
    "INTERESTS_BACK",
    "SET_PACING",
    "TRIP_CONFIRM",
    "TRIP_RETRY_GENERATE",
    "TRIP_EDIT_MENU",
    "EDIT_STEP",
    "TRIP_CANCEL"
]);
const ITINERARY_ACTIONS = new Set([
    "VIEW_TRIP",
    "FULL_ITINERARY",
    "VIEW_DAY",
    "DAY_NEXT",
    "DAY_PREV",
    "DIRECTIONS",
    "MODIFY_MENU",
    "MAKE_CHEAPER",
    "LESS_WALKING",
    "MORE_HISTORY",
    "MORE_FOOD",
    "REDUCE_PACE"
]);
/**
 * Top-level Action Router.
 * Performs shared validation, security/OCC gating, and delegates to specialized sub-handlers.
 */
export class WhatsAppActionHandler {
    /**
     * Resolves the active trip for a user conversation.
     */
    static async resolveActiveTrip(conversationId: string, userId: string) {
        try {
            const conv = await ConversationRepository.findById(conversationId);
            if (conv?.activeTripId) {
                const trip = await TripRepository.findById(conv.activeTripId.toString());
                if (trip && ["planning", "confirmed", "active"].includes(trip.status)) {
                    return trip;
                }
            }
            return await TripRepository.findActiveByUserId(userId);
        }
        catch {
            return null;
        }
    }
    /**
     * Validates trip authority and cross-trip isolation.
     */
    static async validateTripAuthority(action: TypedAction, conversationId: string, userId: string, phoneNumber: string, activeLanguage: SupportedLanguage) {
        const requestedTripId = "tripId" in action ? action.tripId : undefined;
        const activeTrip = await this.resolveActiveTrip(conversationId, userId);
        if (!requestedTripId) {
            if (!activeTrip) {
                const welcome = WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
                return {
                    isViolation: true,
                    safeResponse: {
                        ...welcome,
                        textMessages: ["⚠️ You do not currently have an active trip. Let's plan one!"]
                    }
                };
            }
            return { isViolation: false, trip: activeTrip };
        }
        const requestedTrip = await TripRepository.findById(requestedTripId);
        if (!requestedTrip) {
            const welcome = WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
            return {
                isViolation: true,
                safeResponse: {
                    ...welcome,
                    textMessages: ["⚠️ The requested trip could not be found. Here is your main menu:"]
                }
            };
        }
        if (String(requestedTrip.userId) !== String(userId)) {
            logger.warn({ userId, requestedTripId, ownerId: requestedTrip.userId.toString() }, "Unauthorized trip action attempt rejected");
            const welcome = WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
            return {
                isViolation: true,
                safeResponse: {
                    ...welcome,
                    textMessages: ["⚠️ You do not have permission to view or modify this trip."]
                }
            };
        }
        if (!["planning", "confirmed", "active"].includes(requestedTrip.status)) {
            logger.warn({
                userId,
                requestedTripId,
                status: requestedTrip.status,
                activeTripId: activeTrip?._id.toString()
            }, "Inactive trip action rejected");
            if (activeTrip && activeTrip._id.toString() !== requestedTripId) {
                const notice = `⚠️ This option belongs to your previous trip (${requestedTrip.destination}). Your current active trip is in *${activeTrip.destination}*.`;
                const activeSnapshot = activeTrip.itinerarySnapshot;
                const safeMenu = activeSnapshot
                    ? WhatsAppInteractiveService.sendItineraryActions(phoneNumber, activeTrip, activeSnapshot, activeLanguage)
                    : WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, activeTrip, activeLanguage);
                return {
                    isViolation: true,
                    safeResponse: {
                        ...safeMenu,
                        textMessages: [notice]
                    }
                };
            }
            const welcome = WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
            return {
                isViolation: true,
                safeResponse: {
                    ...welcome,
                    textMessages: ["⚠️ The requested trip is no longer active. Here is your main menu:"]
                }
            };
        }
        await ConversationRepository.updateActiveTrip(conversationId, requestedTrip._id.toString());
        return { isViolation: false, trip: requestedTrip };
    }
    /**
     * Helper to validate OCC versions for backward compatibility.
     */
    static validateOCCVersion(snapshot: PersistedItinerarySnapshot | null | undefined, expectedVersion: number, destination: string, activeLanguage: SupportedLanguage) {
        return ItineraryActionHandler.validateOCCVersion(snapshot, expectedVersion, destination, activeLanguage);
    }
    /**
     * Executes a parsed, validated TypedAction deterministically via specialized sub-handlers.
     */
    static async handleAction(paramsOrAction: ActionHandlerParams | any, userId?: string, conversationId?: string, phoneNumber?: string, activeLanguage: SupportedLanguage = "en"): Promise<any> {
        let params: ActionHandlerParams;
        if (paramsOrAction && "action" in paramsOrAction && typeof paramsOrAction.action === "object") {
            params = paramsOrAction as ActionHandlerParams;
        } else {
            params = {
                action: paramsOrAction,
                userId: userId!,
                conversationId: conversationId!,
                phoneNumber: phoneNumber!,
                activeLanguage
            };
        }
        const action = params.action;
        userId = params.userId;
        conversationId = params.conversationId;
        phoneNumber = params.phoneNumber;
        activeLanguage = params.activeLanguage;
        logger.info({
            actionType: action.type,
            userId,
            conversationId,
            phone: maskPhoneNumber(phoneNumber)
        }, "WhatsAppActionHandler executing action");
        // 1. System / Navigation / Settings Actions
        if (SYSTEM_ACTIONS.has(action.type)) {
            return SystemActionHandler.handleAction(params);
        }
        // 2. Wizard & Requirement Collection Actions
        if (WIZARD_ACTIONS.has(action.type)) {
            return WizardActionHandler.handleAction(params);
        }
        // 3. Itinerary Actions (View, Navigation, Directions, Modification)
        if (ITINERARY_ACTIONS.has(action.type)) {
            const tripSecurityCheck = await this.validateTripAuthority(action, conversationId, userId, phoneNumber, activeLanguage);
            if (tripSecurityCheck.isViolation) {
                return tripSecurityCheck.safeResponse;
            }
            return ItineraryActionHandler.handleAction({
                ...params,
                trip: tripSecurityCheck.trip
            });
        }
        // Fallback: Default to Main Menu for unrecognized actions
        return WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
    }
}
