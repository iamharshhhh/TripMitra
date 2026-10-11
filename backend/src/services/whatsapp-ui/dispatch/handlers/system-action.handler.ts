import { MULTILINGUAL_UI_STRINGS } from "../../whatsapp-ui.strings.js";
import { WhatsAppInteractiveService } from "../../whatsapp-interactive.service.js";
import { TripRepository } from "../../../../repositories/trip.repository.js";
import { UserRepository } from "../../../../repositories/user.repository.js";
import { ConversationRepository } from "../../../../repositories/conversation.repository.js";
import { LiveLocationService } from "../../../location/live-location.service.js";
import { SessionLocationStore } from "../../../location/session-location.store.js";
import { WeatherTool } from "../../../../tools/weather.tool.js";
import { TripLifecycleService } from "../../../trip/trip-lifecycle.service.js";
import { getDestinationCoordinates } from "../../../../utils/geography.js";
import { deriveEndDate, formatDisplayDateRange } from "../../../../utils/date-parser.js";
import { logger } from "../../../../utils/logger.js";
import { TypedAction } from "../../whatsapp-ui.types.js";
import { SupportedLanguage } from "../../../language/language-detector.service.js";

export interface SystemHandlerParams {
    action: TypedAction;
    userId: string;
    conversationId: string;
    phoneNumber: string;
    activeLanguage: SupportedLanguage;
}

export class SystemActionHandler {
    static liveLocationService = new LiveLocationService();
    /**
     * Resolves the active trip for a user conversation.
     */
    static async resolveActiveTrip(conversationId: any, userId: any) {
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
     * Handles all core navigation, language, profile, location, and weather actions.
     */
    static async handleAction(params: SystemHandlerParams) {
        const { action, userId, conversationId, phoneNumber, activeLanguage } = params;
        const strings = MULTILINGUAL_UI_STRINGS[activeLanguage] || MULTILINGUAL_UI_STRINGS.en;
        // 1. Navigation / Core Informational Actions
        if (action.type === "HOME") {
            return WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
        }
        if (action.type === "BACK") {
            const activeTrip = await this.resolveActiveTrip(conversationId, userId);
            if (activeTrip && activeTrip.itinerarySnapshot) {
                return WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, activeTrip, activeLanguage);
            }
            return WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
        }
        if (action.type === "HELP") {
            return WhatsAppInteractiveService.sendHelpMenu(phoneNumber, activeLanguage);
        }
        if (action.type === "PLAN_TRIP" ||
            action.type === "TRIP_NEW" ||
            action.type === "TRIP_CHANGE_DESTINATION") {
            await ConversationRepository.clearPausedMenuContext(conversationId);
            await ConversationRepository.clearActiveMenuContext(conversationId);
            const activeTrip = await this.resolveActiveTrip(conversationId, userId);
            if (activeTrip) {
                await TripRepository.update(activeTrip._id.toString(), {
                    status: "completed",
                    planningState: "completed"
                });
            }
            await ConversationRepository.updateActivity(conversationId, undefined);
            return WhatsAppInteractiveService.sendPlanTripPrompt(phoneNumber, activeLanguage);
        }
        if (action.type === "MY_TRIP") {
            const activeTrip = await this.resolveActiveTrip(conversationId, userId);
            return WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, activeTrip, activeLanguage);
        }
        if (action.type === "TRIP_CONTINUE" || action.type === "RESUME_WIZARD") {
            await ConversationRepository.resumePausedMenuContext(conversationId);
            const activeTrip = await this.resolveActiveTrip(conversationId, userId);
            if (!activeTrip) {
                return WhatsAppInteractiveService.sendDestinationMenu(phoneNumber, activeLanguage);
            }
            const reqs: any = (activeTrip.requirements || {});
            const dest: string = activeTrip.destination || reqs.destination;
            const startDate = reqs.startDate;
            const dur = reqs.durationDays;
            const trav = reqs.travelers?.total;
            const bud = reqs.budget?.category;
            const ints = reqs.interests;
            const pac = reqs.preferredPace;
            if (!dest) {
                return WhatsAppInteractiveService.sendDestinationMenu(phoneNumber, activeLanguage);
            }
            else if (!startDate) {
                return WhatsAppInteractiveService.sendTravelDateMenu(phoneNumber, dest, activeTrip._id.toString(), activeLanguage);
            }
            else if (!dur) {
                return WhatsAppInteractiveService.sendDurationMenu(phoneNumber, dest, activeTrip._id.toString(), activeLanguage, startDate);
            }
            else if (!trav) {
                return WhatsAppInteractiveService.sendTravelerMenu(phoneNumber, dest, dur, activeTrip._id.toString(), activeLanguage, startDate);
            }
            else if (!bud) {
                return WhatsAppInteractiveService.sendBudgetMenu(phoneNumber, dest, dur, trav, activeTrip._id.toString(), activeLanguage, startDate);
            }
            else if (!ints || ints.length === 0) {
                return WhatsAppInteractiveService.sendInterestMenu(phoneNumber, dest, dur, bud, ints || [], activeTrip._id.toString(), activeLanguage, startDate);
            }
            else if (!pac) {
                return WhatsAppInteractiveService.sendPacingMenu(phoneNumber, dest, dur, "balanced", activeTrip._id.toString(), activeLanguage, {
                    startDate,
                    travelers: trav,
                    budget: activeTrip.requirements?.budget,
                    interests: ints
                });
            }
            return WhatsAppInteractiveService.sendTripConfirmationCard(phoneNumber, activeTrip, activeLanguage);
        }
        // 2. Language Selection
        if (action.type === "LANGUAGE_MENU") {
            return WhatsAppInteractiveService.sendLanguageMenu(phoneNumber, activeLanguage);
        }
        if (action.type === "SET_LANGUAGE") {
            await UserRepository.update(userId, { language: action.language });
            const confirmText = action.language === "mr"
                ? "✅ भाषा यशस्वीरित्या बदलून *मराठी* केली आहे."
                : action.language === "hi"
                    ? "✅ भाषा सफलतापूर्वक बदलकर *हिन्दी* कर दी गई है।"
                    : "✅ Language successfully set to *English*.";
            const mainMenu = WhatsAppInteractiveService.sendMainMenu(phoneNumber, action.language);
            return {
                ...mainMenu,
                textMessages: [confirmText]
            };
        }
        // Trip Cancellation Actions
        if (action.type === "TRIP_CANCEL_PROMPT") {
            let tripId = action.tripId;
            if (!tripId) {
                const activeTrip = await this.resolveActiveTrip(conversationId, userId);
                if (activeTrip) {
                    tripId = activeTrip._id.toString();
                }
            }
            if (!tripId) {
                return WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
            }
            const targetTrip = await TripRepository.findById(tripId);
            if (!targetTrip || targetTrip.userId.toString() !== userId.toString()) {
                return WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
            }
            if (!TripLifecycleService.isCancellableTrip(targetTrip)) {
                return WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, targetTrip, activeLanguage);
            }
            const isActive = TripLifecycleService.isActiveTripToday(targetTrip);
            return WhatsAppInteractiveService.sendTripCancelConfirmMenu(phoneNumber, tripId, activeLanguage, {
                isUpcoming: !isActive,
                destination: targetTrip.destination
            });
        }
        if (action.type === "TRIP_CANCEL_CONFIRM") {
            let tripId = action.tripId;
            if (!tripId) {
                const activeTrip = await this.resolveActiveTrip(conversationId, userId);
                if (activeTrip) {
                    tripId = activeTrip._id.toString();
                }
            }
            if (!tripId) {
                return WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
            }
            const targetTrip = await TripRepository.findById(tripId);
            if (!targetTrip || targetTrip.userId.toString() !== userId.toString()) {
                return WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
            }
            const wasActive = TripLifecycleService.isActiveTripToday(targetTrip);
            if (TripLifecycleService.isCancellableTrip(targetTrip)) {
                await TripRepository.update(tripId, {
                    status: "cancelled"
                });
                await ConversationRepository.clearPausedMenuContext(conversationId);
                await ConversationRepository.clearActiveMenuContext(conversationId);
                const conv = await ConversationRepository.findById(conversationId);
                if (conv?.activeTripId?.toString() === tripId.toString()) {
                    await ConversationRepository.updateActiveTrip(conversationId, undefined);
                }
            }
            const successNotice = wasActive
                ? strings.menuHeaders.tripCancelSuccess
                : strings.menuHeaders.tripCancelUpcomingSuccess;
            const activePin = SessionLocationStore.getLocation(conversationId);
            if (activePin) {
                const discoveryMenu = WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage);
                return {
                    ...discoveryMenu,
                    textMessages: [successNotice]
                };
            }
            const mainMenu = WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
            return {
                ...mainMenu,
                textMessages: [successNotice]
            };
        }
        if (action.type === "TRIP_CANCEL_ABORT") {
            const tripId = action.tripId;
            let targetTrip = null;
            if (tripId) {
                targetTrip = await TripRepository.findById(tripId);
                if (targetTrip && targetTrip.userId.toString() !== userId.toString()) {
                    targetTrip = null;
                }
            }
            if (!targetTrip) {
                targetTrip = await this.resolveActiveTrip(conversationId, userId);
            }
            return WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, targetTrip, activeLanguage);
        }
        // 3. Real-time Discovery & Location
        if (action.type === "LOCATION_MENU") {
            const activePin = SessionLocationStore.getLocation(conversationId);
            return WhatsAppInteractiveService.sendLocationMenu(phoneNumber, activeLanguage, Boolean(activePin));
        }
        if (action.type === "LOC_CAT") {
            try {
                const requestedDest = "destination" in action && action.destination ? (action.destination as string) : undefined;
                const locationResult = await this.liveLocationService.evaluateLiveLocation({
                    conversationId,
                    userId,
                    language: activeLanguage,
                    category: action.category,
                    destination: requestedDest
                });
                const reply = locationResult?.formattedMessage || strings.menuHeaders.locationRequiredForDiscovery;
                const locMenu = WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage);
                return {
                    ...locMenu,
                    textMessages: [reply]
                };
            }
            catch (err) {
                logger.error({ err, category: action.category }, "Failed to evaluate live location places category");
                const placesNotice = activeLanguage === "mr"
                    ? "क्षमा करा, मी सध्या जवळपासची ठिकाणे शोधू शकलो नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
                    : activeLanguage === "hi"
                        ? "क्षमा करें, मैं अभी आस-पास के स्थान नहीं खोज सका। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
                        : "Sorry, I couldn't fetch nearby places right now. Please try again in a moment.";
                const locMenu = WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage);
                return {
                    ...locMenu,
                    textMessages: [placesNotice]
                };
            }
        }
        if (action.type === "LOCATION_NEXT_STOP") {
            try {
                const locationResult = await this.liveLocationService.evaluateLiveLocation({
                    conversationId,
                    userId,
                    language: activeLanguage
                });
                const reply = locationResult?.formattedMessage ||
                    (activeLanguage === "mr"
                        ? "📍 कृपया प्रथम तुमचे थेट स्थान शेअर करा."
                        : activeLanguage === "hi"
                            ? "📍 कृपया पहले अपना लाइव स्थान साझा करें।"
                            : "📍 Please share your live location first.");
                const locMenu = WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage);
                return {
                    ...locMenu,
                    textMessages: [reply]
                };
            }
            catch (err) {
                logger.error({ err }, "Failed to evaluate next stop location");
                const navNotice = activeLanguage === "mr"
                    ? "क्षमा करा, मी दिशा मिळवू शकलो नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
                    : activeLanguage === "hi"
                        ? "क्षमा करें, मैं दिशा-निर्देश प्राप्त नहीं कर सका। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
                        : "Sorry, I couldn't fetch directions right now. Please try again in a moment.";
                const locMenu = WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage);
                return {
                    ...locMenu,
                    textMessages: [navNotice]
                };
            }
        }
        if (action.type === "NEARBY_PLACES") {
            try {
                const requestedDest = "destination" in action && action.destination ? (action.destination as string) : undefined;
                const locationResult = await this.liveLocationService.evaluateLiveLocation({
                    conversationId,
                    userId,
                    language: activeLanguage,
                    category: "attractions",
                    destination: requestedDest
                });
                const reply = locationResult?.formattedMessage || strings.menuHeaders.locationRequiredForDiscovery;
                const navMenu = WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage);
                return {
                    ...navMenu,
                    textMessages: [reply]
                };
            }
            catch (err) {
                logger.error({ err }, "Failed to evaluate nearby places attractions");
                const placesNotice = activeLanguage === "mr"
                    ? "क्षमा करा, मी सध्या जवळपासची ठिकाणे शोधू शकलो नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
                    : activeLanguage === "hi"
                        ? "क्षमा करें, मैं अभी आस-पास के स्थान नहीं खोज सका। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
                        : "Sorry, I couldn't fetch nearby places right now. Please try again in a moment.";
                const navMenu = WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage);
                return {
                    ...navMenu,
                    textMessages: [placesNotice]
                };
            }
        }
        if (action.type === "WEATHER" || action.type === "WEATHER_REFRESH") {
            const requestedDest = "destination" in action && action.destination ? (action.destination as string) : undefined;
            const activeTrip = await this.resolveActiveTrip(conversationId, userId);
            const activePin = SessionLocationStore.getLocation(conversationId);
            let dest: string = requestedDest || (activeTrip?.destination as string);
            let coords;
            if (activePin) {
                coords = { latitude: activePin.latitude, longitude: activePin.longitude };
                dest = dest || (activeLanguage === "mr" ? "आपले स्थान" : activeLanguage === "hi" ? "आपका स्थान" : "Your Location");
            }
            else {
                dest = dest || "Pune";
                coords = getDestinationCoordinates(dest) || { latitude: 18.5204, longitude: 73.8567 };
            }
            const req = (activeTrip?.requirements || activeTrip || {});
            const startDateIso = req.startDate ||
                (activeTrip?.startDate instanceof Date
                    ? `${activeTrip.startDate.getFullYear()}-${String(activeTrip.startDate.getMonth() + 1).padStart(2, "0")}-${String(activeTrip.startDate.getDate()).padStart(2, "0")}`
                    : typeof activeTrip?.startDate === "string"
                        ? activeTrip.startDate
                        : undefined);
            const durationDays = req.durationDays || activeTrip?.itinerarySnapshot?.days?.length || 3;
            const endDateIso = startDateIso ? deriveEndDate(startDateIso as string, durationDays) : undefined;
            const dateRangeStr = startDateIso ? formatDisplayDateRange(startDateIso as string, durationDays) : undefined;
            try {
                const weatherTool = new WeatherTool();
                const weatherOutput = await weatherTool.execute({
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    startDate: startDateIso,
                    endDate: endDateIso
                });
                const forecast = weatherOutput.data?.forecast || [];
                return WhatsAppInteractiveService.sendWeatherCard(phoneNumber, dest, forecast, activeTrip?._id.toString(), activeLanguage, dateRangeStr);
            }
            catch (weatherErr) {
                logger.warn({ err: weatherErr, dest, startDateIso, endDateIso }, "Failed to fetch live weather forecast via WeatherTool");
                const weatherNotice = strings.menuHeaders.weatherErrorFallback || "Sorry, I couldn't get the weather right now. Please try again in a moment.";
                const mainMenu = WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
                return {
                    ...mainMenu,
                    textMessages: [weatherNotice]
                };
            }
        }
        return WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
    }
}
