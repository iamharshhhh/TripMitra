import { MULTILINGUAL_UI_STRINGS } from "../../whatsapp-ui.strings.js";
import { WhatsAppInteractiveService } from "../../whatsapp-interactive.service.js";
import { TripRepository } from "../../../../repositories/trip.repository.js";
import { UserRepository } from "../../../../repositories/user.repository.js";
import { ConversationRepository } from "../../../../repositories/conversation.repository.js";
import { LiveLocationService } from "../../../location/live-location.service.js";
import { SessionLocationStore } from "../../../location/session-location.store.js";
import { WeatherTool } from "../../../../tools/weather.tool.js";
import { TripLifecycleService } from "../../../trip/trip-lifecycle.service.js";
import { getDestinationCoordinates, resolveDestinationCoordinates } from "../../../../utils/geography.js";
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
            const currentActiveTrip = await this.resolveActiveTrip(conversationId, userId);
            if (!tripId && currentActiveTrip) {
                tripId = currentActiveTrip._id.toString();
            }
            if (!tripId) {
                return WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, null, activeLanguage);
            }
            const targetTrip = await TripRepository.findById(tripId);
            if (!targetTrip || targetTrip.userId.toString() !== userId.toString()) {
                return WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, currentActiveTrip, activeLanguage);
            }
            if (!TripLifecycleService.isCancellableTrip(targetTrip)) {
                const safeFallbackTrip = String(targetTrip.status || "").toLowerCase() === "cancelled"
                    ? currentActiveTrip
                    : targetTrip;
                return WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, safeFallbackTrip, activeLanguage);
            }
            const isActive = TripLifecycleService.isActiveTripToday(targetTrip);
            return WhatsAppInteractiveService.sendTripCancelConfirmMenu(phoneNumber, tripId, activeLanguage, {
                isUpcoming: !isActive,
                destination: targetTrip.destination
            });
        }
        if (action.type === "TRIP_CANCEL_CONFIRM") {
            let tripId = action.tripId;
            let currentActiveTrip = null;
            try {
                currentActiveTrip = await this.resolveActiveTrip(conversationId, userId);
            }
            catch {
                currentActiveTrip = null;
            }
            if (!tripId && currentActiveTrip) {
                tripId = currentActiveTrip._id.toString();
            }
            if (!tripId) {
                return WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, null, activeLanguage);
            }
            let targetTrip = null;
            try {
                targetTrip = await TripRepository.findById(tripId);
            }
            catch (findErr) {
                logger.error({ err: findErr, tripId }, "Failed to fetch trip during TRIP_CANCEL_CONFIRM");
                const cancelErrorNotice = activeLanguage === "mr"
                    ? "⚠️ सहल रद्द करण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा."
                    : activeLanguage === "hi"
                        ? "⚠️ ट्रिप रद्द करने में समस्या आई। कृपया पुनः प्रयास करें।"
                        : "⚠️ Could not cancel the trip right now. Please try again.";
                const fallbackMenu = WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, currentActiveTrip, activeLanguage);
                return {
                    ...fallbackMenu,
                    textMessages: [cancelErrorNotice]
                };
            }
            if (!targetTrip || targetTrip.userId.toString() !== userId.toString()) {
                return WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, currentActiveTrip, activeLanguage);
            }
            const wasActive = TripLifecycleService.isActiveTripToday(targetTrip);
            if (!TripLifecycleService.isCancellableTrip(targetTrip)) {
                const safeFallbackTrip = String(targetTrip.status || "").toLowerCase() === "cancelled"
                    ? currentActiveTrip
                    : targetTrip;
                return WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, safeFallbackTrip, activeLanguage);
            }
            let updatedTrip: any = null;
            try {
                updatedTrip = await TripRepository.update(tripId, {
                    status: "cancelled"
                });
            }
            catch (updateErr) {
                logger.error({ err: updateErr, tripId }, "Failed to update trip status to cancelled");
                updatedTrip = null;
            }
            if (!updatedTrip || String(updatedTrip.status || "").toLowerCase() !== "cancelled") {
                const cancelErrorNotice = activeLanguage === "mr"
                    ? "⚠️ सहल रद्द करण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा."
                    : activeLanguage === "hi"
                        ? "⚠️ ट्रिप रद्द करने में समस्या आई। कृपया पुनः प्रयास करें।"
                        : "⚠️ Could not cancel the trip right now. Please try again.";
                const activeMenu = WhatsAppInteractiveService.sendActiveTripMenu(phoneNumber, targetTrip, activeLanguage);
                return {
                    ...activeMenu,
                    textMessages: [cancelErrorNotice]
                };
            }
            try {
                await ConversationRepository.clearPausedMenuContext(conversationId);
                await ConversationRepository.clearActiveMenuContext(conversationId);
                const conv = await ConversationRepository.findById(conversationId);
                if (conv?.activeTripId?.toString() === tripId.toString()) {
                    await ConversationRepository.updateActiveTrip(conversationId, undefined);
                }
            }
            catch (cleanupErr) {
                logger.warn({ err: cleanupErr, conversationId, tripId }, "Non-fatal error during post-cancellation conversation state cleanup");
            }
            SessionLocationStore.clearLocation(conversationId);
            const successNotice = wasActive
                ? strings.menuHeaders.tripCancelSuccess
                : strings.menuHeaders.tripCancelUpcomingSuccess;
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
                if (targetTrip &&
                    (targetTrip.userId.toString() !== userId.toString() ||
                        String(targetTrip.status || "").toLowerCase() === "cancelled")) {
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
                if (locationResult) {
                    const locMenu = WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage);
                    return {
                        ...locMenu,
                        textMessages: [locationResult.formattedMessage]
                    };
                }
                return WhatsAppInteractiveService.sendLocationMenu(phoneNumber, activeLanguage, false);
            }
            catch (err) {
                logger.error({ err, category: action.category }, "Failed to evaluate live location places category");
                const activePin = SessionLocationStore.getLocation(conversationId);
                const placesNotice = activeLanguage === "mr"
                    ? "⚠️ जवळपासची ठिकाणे शोधण्यात अडचण आली. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
                    : activeLanguage === "hi"
                        ? "⚠️ आस-पास के स्थान खोजने में समस्या आई। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
                        : "⚠️ Could not retrieve nearby places at the moment. Please try again in a moment.";
                const menu = activePin
                    ? WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage)
                    : WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
                return {
                    ...menu,
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
                if (locationResult) {
                    const locMenu = WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage);
                    return {
                        ...locMenu,
                        textMessages: [locationResult.formattedMessage]
                    };
                }
                return WhatsAppInteractiveService.sendLocationMenu(phoneNumber, activeLanguage, false);
            }
            catch (err) {
                logger.error({ err }, "Failed to evaluate next stop location");
                const activePin = SessionLocationStore.getLocation(conversationId);
                const navNotice = activeLanguage === "mr"
                    ? "⚠️ पुढील ठिकाण शोधण्यात अडचण आली. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
                    : activeLanguage === "hi"
                        ? "⚠️ अगला पड़ाव खोजने में समस्या आई। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
                        : "⚠️ Could not retrieve your next stop at the moment. Please try again in a moment.";
                const menu = activePin
                    ? WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage)
                    : WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
                return {
                    ...menu,
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
                if (locationResult) {
                    const navMenu = WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage);
                    return {
                        ...navMenu,
                        textMessages: [locationResult.formattedMessage]
                    };
                }
                return WhatsAppInteractiveService.sendLocationMenu(phoneNumber, activeLanguage, false);
            }
            catch (err) {
                logger.error({ err }, "Failed to evaluate nearby places attractions");
                const activePin = SessionLocationStore.getLocation(conversationId);
                const placesNotice = activeLanguage === "mr"
                    ? "⚠️ जवळपासची ठिकाणे शोधण्यात अडचण आली. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा."
                    : activeLanguage === "hi"
                        ? "⚠️ आस-पास के स्थान खोजने में समस्या आई। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
                        : "⚠️ Could not retrieve nearby places at the moment. Please try again in a moment.";
                const menu = activePin
                    ? WhatsAppInteractiveService.sendLocationDiscoveryMenu(phoneNumber, activeLanguage)
                    : WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
                return {
                    ...menu,
                    textMessages: [placesNotice]
                };
            }
        }
        if (action.type === "WEATHER" || action.type === "WEATHER_REFRESH") {
            const requestedDest = "destination" in action && action.destination ? (action.destination as string).trim() : undefined;
            const activeLanguageStr = activeLanguage || "en";
            const userLocationLabel = activeLanguageStr === "mr" ? "आपले स्थान" : activeLanguageStr === "hi" ? "आपका स्थान" : "Your Location";

            // FLOW A: Share Location Context (action.origin === "location")
            if (action.origin === "location") {
                const activePin = SessionLocationStore.getLocation(conversationId);
                if (!activePin) {
                    // Ephemeral GPS pin only, never substitute trip destination or default to Pune
                    return WhatsAppInteractiveService.sendLocationMenu(phoneNumber, activeLanguage, false);
                }
                const coords = { latitude: activePin.latitude, longitude: activePin.longitude };
                const dest = activePin.name || userLocationLabel;
                try {
                    const weatherTool = new WeatherTool();
                    const weatherOutput = await weatherTool.execute({
                        latitude: coords.latitude,
                        longitude: coords.longitude
                    });
                    if (!weatherOutput.success || !weatherOutput.data?.forecast?.length) {
                        throw new Error(weatherOutput.error || "Weather service unavailable");
                    }
                    const forecast = weatherOutput.data.forecast;
                    return WhatsAppInteractiveService.sendWeatherCard(phoneNumber, dest, forecast, undefined, activeLanguage, undefined, "location");
                } catch (weatherErr) {
                    logger.warn({ err: weatherErr, coords }, "Failed to fetch live weather forecast for shared location pin");
                    const weatherNotice = strings.menuHeaders.weatherErrorFallback || "Sorry, I couldn't get the weather right now. Please try again in a moment.";
                    const mainMenu = WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
                    return {
                        ...mainMenu,
                        textMessages: [weatherNotice]
                    };
                }
            }

            // FLOW B: Main Menu / Explicit City / Refresh
            const activeTrip = await this.resolveActiveTrip(conversationId, userId);
            const isEligibleTrip = Boolean(
                activeTrip &&
                ["planning", "confirmed", "active"].includes(activeTrip.status) &&
                typeof activeTrip.destination === "string" &&
                activeTrip.destination.trim().length > 0
            );
            const normalizeDestinationTokens = (val: string) =>
                val
                    .toLowerCase()
                    .replace(/[^\p{L}\p{N}]+/gu, " ")
                    .trim();
            const isRefreshingActiveTrip = Boolean(
                action.type === "WEATHER_REFRESH" &&
                isEligibleTrip &&
                activeTrip &&
                (!requestedDest ||
                    normalizeDestinationTokens(requestedDest) === normalizeDestinationTokens(activeTrip.destination))
            );

            // If explicit destination was specified (e.g. "Jaipur" from chat or refresh of an explicit city)
            if (requestedDest &&
                !isRefreshingActiveTrip &&
                requestedDest !== userLocationLabel &&
                requestedDest !== "Your Location" &&
                requestedDest !== "आपले स्थान" &&
                requestedDest !== "आपका स्थान") {
                const coords = await resolveDestinationCoordinates(requestedDest);
                if (!coords) {
                    const unknownCityNotice = activeLanguageStr === "mr"
                        ? `⚠️ *${requestedDest}* साठी हवामान निर्देशांक सापडले नाहीत. कृपया वैध शहराचे नाव टाइप करा किंवा आपले लोकेशन शेअर करा.`
                        : activeLanguageStr === "hi"
                            ? `⚠️ *${requestedDest}* के लिए मौसम निर्देशांक नहीं मिले। कृपया किसी मान्य शहर का नाम टाइप करें या अपना स्थान साझा करें।`
                            : `⚠️ Could not find weather coordinates for *${requestedDest}*. Please type a valid city name or share your location pin.`;
                    const promptMenu = WhatsAppInteractiveService.sendWeatherPrompt(phoneNumber, activeLanguage);
                    return {
                        ...promptMenu,
                        textMessages: [unknownCityNotice]
                    };
                }
                try {
                    const weatherTool = new WeatherTool();
                    const weatherOutput = await weatherTool.execute({
                        latitude: coords.latitude,
                        longitude: coords.longitude
                    });
                    if (!weatherOutput.success || !weatherOutput.data?.forecast?.length) {
                        throw new Error(weatherOutput.error || "Weather service unavailable");
                    }
                    const forecast = weatherOutput.data.forecast;
                    return WhatsAppInteractiveService.sendWeatherCard(phoneNumber, requestedDest, forecast, undefined, activeLanguage, undefined, "menu");
                } catch (weatherErr) {
                    logger.warn({ err: weatherErr, requestedDest }, "Failed to fetch weather for requested destination");
                    const weatherNotice = strings.menuHeaders.weatherErrorFallback || "Sorry, I couldn't get the weather right now. Please try again in a moment.";
                    const mainMenu = WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
                    return {
                        ...mainMenu,
                        textMessages: [weatherNotice]
                    };
                }
            }

            // Priority 1: Eligible active or upcoming trip destination and relevant dates
            if (isEligibleTrip && activeTrip) {
                const tripDest = activeTrip.destination.trim();
                const coords = await resolveDestinationCoordinates(tripDest);
                if (coords) {
                    const req = (activeTrip.requirements || activeTrip || {});
                    const startDateIso = req.startDate ||
                        (activeTrip.startDate instanceof Date
                            ? `${activeTrip.startDate.getFullYear()}-${String(activeTrip.startDate.getMonth() + 1).padStart(2, "0")}-${String(activeTrip.startDate.getDate()).padStart(2, "0")}`
                            : typeof activeTrip.startDate === "string"
                                ? activeTrip.startDate
                                : undefined);
                    const durationDays = req.durationDays || activeTrip.itinerarySnapshot?.days?.length || 3;
                    const endDateIso = startDateIso ? deriveEndDate(startDateIso as string, durationDays) : undefined;
                    const dateRangeStr = startDateIso ? formatDisplayDateRange(startDateIso as string, durationDays) : undefined;

                    let isBeyondHorizon = false;
                    if (startDateIso) {
                        const startMs = new Date(startDateIso as string).getTime();
                        const todayMs = new Date().setHours(0, 0, 0, 0);
                        const diffDays = Math.round((startMs - todayMs) / (1000 * 60 * 60 * 24));
                        if (diffDays > 16 || diffDays < 0) {
                            isBeyondHorizon = true;
                        }
                    }

                    if (isBeyondHorizon) {
                        return WhatsAppInteractiveService.sendWeatherCard(phoneNumber, tripDest, [], activeTrip._id.toString(), activeLanguage, dateRangeStr, "menu");
                    }

                    try {
                        const weatherTool = new WeatherTool();
                        const weatherOutput = await weatherTool.execute({
                            latitude: coords.latitude,
                            longitude: coords.longitude,
                            startDate: startDateIso,
                            endDate: endDateIso
                        });
                        if (!weatherOutput.success || !weatherOutput.data?.forecast?.length) {
                            throw new Error(weatherOutput.error || "Weather service unavailable");
                        }
                        const forecast = weatherOutput.data.forecast;
                        return WhatsAppInteractiveService.sendWeatherCard(phoneNumber, tripDest, forecast, activeTrip._id.toString(), activeLanguage, dateRangeStr, "menu");
                    } catch (weatherErr) {
                        logger.warn({ err: weatherErr, tripDest, startDateIso, endDateIso }, "Failed to fetch live weather forecast via WeatherTool");
                        const weatherNotice = strings.menuHeaders.weatherErrorFallback || "Sorry, I couldn't get the weather right now. Please try again in a moment.";
                        const mainMenu = WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
                        return {
                            ...mainMenu,
                            textMessages: [weatherNotice]
                        };
                    }
                }
            }

            // Priority 2: Reliable current-location pin from session store
            const activePin = SessionLocationStore.getLocation(conversationId);
            if (activePin) {
                const coords = { latitude: activePin.latitude, longitude: activePin.longitude };
                const dest = activePin.name || userLocationLabel;
                try {
                    const weatherTool = new WeatherTool();
                    const weatherOutput = await weatherTool.execute({
                        latitude: coords.latitude,
                        longitude: coords.longitude
                    });
                    if (!weatherOutput.success || !weatherOutput.data?.forecast?.length) {
                        throw new Error(weatherOutput.error || "Weather service unavailable");
                    }
                    const forecast = weatherOutput.data.forecast;
                    return WhatsAppInteractiveService.sendWeatherCard(phoneNumber, dest, forecast, undefined, activeLanguage, undefined, "location");
                } catch (weatherErr) {
                    logger.warn({ err: weatherErr, coords }, "Failed to fetch live weather forecast for session pin");
                    const weatherNotice = strings.menuHeaders.weatherErrorFallback || "Sorry, I couldn't get the weather right now. Please try again in a moment.";
                    const mainMenu = WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
                    return {
                        ...mainMenu,
                        textMessages: [weatherNotice]
                    };
                }
            }

            // Priority 3: Interactive prompt asking for city or location pin (Never silently default to Pune)
            return WhatsAppInteractiveService.sendWeatherPrompt(phoneNumber, activeLanguage);
        }
        return WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
    }
}
