import { WhatsAppInteractiveService } from "../../whatsapp-interactive.service.js";
import { TripRepository } from "../../../../repositories/trip.repository.js";
import { ConversationRepository } from "../../../../repositories/conversation.repository.js";
import { ItineraryGeneratorService } from "../../../itinerary/itinerary-generator.service.js";
import { hasRequiredPlanningFields, normalizeWizardRequirements } from "../../../../types/trip-requirements.types.js";
import { parseTravelDate } from "../../../../utils/date-parser.js";
import { canonicalizeInterest, deduplicateInterests } from "../../../../utils/interest-normalizer.js";
import { logger } from "../../../../utils/logger.js";
import { TypedAction } from "../../whatsapp-ui.types.js";
import { SupportedLanguage } from "../../../language/language-detector.service.js";

export interface WizardHandlerParams {
    action: TypedAction;
    userId: string;
    conversationId: string;
    phoneNumber: string;
    activeLanguage: SupportedLanguage;
}

export class WizardActionHandler {
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
     * Retrieves or initializes a planning trip document.
     */
    static async getOrCreatePlanningTrip(conversationId: any, userId: any) {
        let activeTrip = await this.resolveActiveTrip(conversationId, userId);
        if (!activeTrip || activeTrip.status === "completed") {
            activeTrip = await TripRepository.create({
                userId,
                destination: "Pending",
                destinationSlug: "pending",
                status: "planning",
                planningState: "collecting_requirements",
                requirements: {
                    destination: "Pending",
                    planningState: "collecting_requirements"
                }
            });
            await ConversationRepository.updateActivity(conversationId, activeTrip._id.toString());
        }
        return activeTrip;
    }
    /**
     * Handles all wizard & trip requirement collection actions deterministically.
     */
    static async handleAction(params: WizardHandlerParams) {
        const { action, userId, conversationId, phoneNumber, activeLanguage } = params;
        if (action.type === "TRIP_CANCEL") {
            const activeTrip = await this.resolveActiveTrip(conversationId, userId);
            if (activeTrip) {
                await TripRepository.update(activeTrip._id.toString(), {
                    status: "completed",
                    planningState: "completed"
                });
                await ConversationRepository.updateActivity(conversationId, undefined);
            }
            return WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
        }
        if (action.type === "SET_DESTINATION") {
            const dest = action.destination.trim();
            const destSlug = dest.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            const activeTrip = await this.resolveActiveTrip(conversationId, userId);
            let planningTrip;
            if (activeTrip && activeTrip.status === "planning") {
                planningTrip = (await TripRepository.resetTripForNewDestination(activeTrip._id.toString(), dest, destSlug)) || activeTrip;
            }
            else {
                planningTrip = await TripRepository.create({
                    userId,
                    destination: dest,
                    destinationSlug: destSlug,
                    status: "planning",
                    planningState: "collecting_requirements",
                    travelers: 1,
                    requirements: {
                        destination: dest,
                        destinationSlug: destSlug,
                        planningState: "collecting_requirements"
                    }
                });
                await ConversationRepository.updateActivity(conversationId, planningTrip._id.toString());
            }
            return WhatsAppInteractiveService.sendTravelDateMenu(phoneNumber, dest, planningTrip._id.toString(), activeLanguage);
        }
        if (action.type === "TRAVEL_DATE") {
            const trip = await this.resolveActiveTrip(conversationId, userId);
            const reqs: any = (trip?.requirements || {});
            const dest: string = String(trip?.destination || reqs.destination || "your destination");
            return WhatsAppInteractiveService.sendTravelDateMenu(phoneNumber, dest, trip?._id.toString() || "", activeLanguage);
        }
        if (action.type === "CUSTOM_DATE") {
            const trip = await this.resolveActiveTrip(conversationId, userId);
            const reqs: any = (trip?.requirements || {});
            const dest: string = String(trip?.destination || reqs.destination || "your destination");
            return WhatsAppInteractiveService.sendCustomDatePrompt(phoneNumber, dest, trip?._id.toString() || "", activeLanguage);
        }
        if (action.type === "CUSTOM_DAYS") {
            const trip = await this.resolveActiveTrip(conversationId, userId);
            const reqs: any = (trip?.requirements || {});
            const dest: string = String(trip?.destination || reqs.destination || "your destination");
            return WhatsAppInteractiveService.sendCustomDaysPrompt(phoneNumber, dest, trip?._id.toString() || "", activeLanguage);
        }
        if (action.type === "GROUP_SIZE_PICKER") {
            const trip = await this.resolveActiveTrip(conversationId, userId);
            const reqs: any = (trip?.requirements || {});
            const dest: string = String(trip?.destination || reqs.destination || "your destination");
            const duration = reqs.durationDays || 3;
            return WhatsAppInteractiveService.sendGroupSizePicker(phoneNumber, dest, duration, trip?._id.toString() || "", activeLanguage);
        }
        if (action.type === "CUSTOM_TRAVELERS") {
            const trip = await this.resolveActiveTrip(conversationId, userId);
            const reqs: any = (trip?.requirements || {});
            const dest: string = String(trip?.destination || reqs.destination || "your destination");
            const duration = reqs.durationDays || 3;
            return WhatsAppInteractiveService.sendCustomTravelersPrompt(phoneNumber, dest, duration, trip?._id.toString() || "", activeLanguage);
        }
        if (action.type === "CUSTOM_BUDGET") {
            const trip = await this.resolveActiveTrip(conversationId, userId);
            const reqs: any = (trip?.requirements || {});
            const dest: string = String(trip?.destination || reqs.destination || "your destination");
            const duration = reqs.durationDays || 3;
            return WhatsAppInteractiveService.sendCustomBudgetPrompt(phoneNumber, dest, duration, trip?._id.toString() || "", activeLanguage);
        }
        if (action.type === "INTERESTS_BACK") {
            const trip = await this.resolveActiveTrip(conversationId, userId);
            const reqs: any = (trip?.requirements || {});
            const dest: string = String(trip?.destination || reqs.destination || "your destination");
            const duration = reqs.durationDays || 3;
            const travelers = reqs.travelers?.total || 1;
            return WhatsAppInteractiveService.sendBudgetMenu(phoneNumber, dest, duration, travelers, trip?._id.toString() || "", activeLanguage, reqs.startDate);
        }
        if (action.type === "TRIP_EDIT_MENU") {
            const trip = await this.resolveActiveTrip(conversationId, userId);
            return WhatsAppInteractiveService.sendTripEditMenu(phoneNumber, trip?._id.toString() || "", activeLanguage);
        }
        if (action.type === "EDIT_STEP") {
            const trip = await this.resolveActiveTrip(conversationId, userId);
            const reqs: any = (trip?.requirements || {});
            const dest: string = String(trip?.destination || reqs.destination || "your destination");
            const startDate = reqs.startDate;
            const duration = reqs.durationDays || 3;
            const travelers = reqs.travelers?.total || 1;
            const budget = reqs.budget?.category || "moderate";
            const pace = reqs.preferredPace || "balanced";
            const stepStr = String(action.step).toLowerCase();
            if (stepStr === "1" || stepStr === "destination") {
                return WhatsAppInteractiveService.sendDestinationMenu(phoneNumber, activeLanguage);
            }
            else if (stepStr === "2" || stepStr === "travel_date" || stepStr === "date") {
                return WhatsAppInteractiveService.sendTravelDateMenu(phoneNumber, dest, trip?._id.toString(), activeLanguage);
            }
            else if (stepStr === "3" || stepStr === "duration") {
                return WhatsAppInteractiveService.sendDurationMenu(phoneNumber, dest, trip?._id.toString(), activeLanguage, startDate);
            }
            else if (stepStr === "4" || stepStr === "travelers") {
                return WhatsAppInteractiveService.sendTravelerMenu(phoneNumber, dest, duration, trip?._id.toString(), activeLanguage, startDate);
            }
            else if (stepStr === "5" || stepStr === "budget") {
                return WhatsAppInteractiveService.sendBudgetMenu(phoneNumber, dest, duration, travelers, trip?._id.toString(), activeLanguage, startDate);
            }
            else if (stepStr === "6" || stepStr === "interests") {
                return WhatsAppInteractiveService.sendInterestMenu(phoneNumber, dest, duration, budget, reqs.interests || [], trip?._id.toString(), activeLanguage, startDate);
            }
            else if (stepStr === "summary" || stepStr === "7" || stepStr === "8") {
                if (trip) {
                    return WhatsAppInteractiveService.sendTripConfirmationCard(phoneNumber, trip, activeLanguage);
                }
            }
            if (trip) {
                return WhatsAppInteractiveService.sendTripConfirmationCard(phoneNumber, trip, activeLanguage);
            }
            return WhatsAppInteractiveService.sendMainMenu(phoneNumber, activeLanguage);
        }
        const trip = await this.getOrCreatePlanningTrip(conversationId, userId);
        if (!trip) {
            return WhatsAppInteractiveService.sendDestinationMenu(phoneNumber, activeLanguage);
        }
        if (!trip.destination && !("destination" in (trip.requirements || {}))) {
            return WhatsAppInteractiveService.sendDestinationMenu(phoneNumber, activeLanguage);
        }
        const currentReqs = (trip.requirements || {});
        const destination: string = (trip.destination || currentReqs.destination || "Trip") as string;
        const updatedReqs: any = {
            destination,
            ...currentReqs
        };
        if (action.type === "SET_TRAVEL_DATE") {
            const parsed = parseTravelDate(action.date);
            if (parsed.success && parsed.isoDate) {
                updatedReqs.startDate = parsed.isoDate;
                await TripRepository.update(trip._id.toString(), {
                    startDate: new Date(parsed.isoDate),
                    requirements: updatedReqs,
                    destination,
                    planningState: "collecting_requirements"
                });
                // Edit Mode: if all other required planning fields are already present, return directly to Summary
                const isEditMode = Boolean(updatedReqs.durationDays &&
                    updatedReqs.travelers?.total &&
                    updatedReqs.budget?.category &&
                    updatedReqs.interests !== undefined);
                if (isEditMode) {
                    const updatedTrip = (await TripRepository.findById(trip._id.toString())) || trip;
                    return WhatsAppInteractiveService.sendTripConfirmationCard(phoneNumber, updatedTrip, activeLanguage);
                }
                return WhatsAppInteractiveService.sendDurationMenu(phoneNumber, destination, trip._id.toString(), activeLanguage, parsed.isoDate);
            }
            else {
                const errorMsg = parsed.errorMessage || "⚠️ Invalid travel date. Please try again.";
                return {
                    textMessages: [errorMsg],
                    fallbackText: errorMsg
                };
            }
        }
        else if (action.type === "SET_DURATION") {
            updatedReqs.durationDays = action.durationDays;
        }
        else if (action.type === "SET_TRAVELERS") {
            let count = 1;
            const rawCountStr = String(action.count || "").trim();
            if (rawCountStr === "5-8" || rawCountStr === "5_8" || rawCountStr === "5–8") {
                count = 6;
            }
            else {
                count = typeof action.count === "number" ? action.count : parseInt(rawCountStr, 10) || 1;
            }
            updatedReqs.travelers = { total: count, adults: count };
            updatedReqs.travelType = count === 1 ? "solo" : count === 2 ? "couple" : count <= 4 ? "family" : "friends";
        }
        else if (action.type === "SET_BUDGET") {
            if (action.category === "custom" && typeof action.amount === "number" && action.amount > 0) {
                updatedReqs.budget = {
                    category: "custom",
                    maxTotalAmount: action.amount,
                    currency: "INR"
                };
            }
            else {
                const category = (["budget", "moderate", "luxury", "custom"].includes(action.category)
                    ? action.category
                    : "moderate");
                updatedReqs.budget = {
                    category,
                    currency: "INR",
                    ...(category === "custom" && action.amount ? { maxTotalAmount: action.amount } : {})
                };
            }
        }
        else if (action.type === "TOGGLE_INTEREST") {
            const canonicalTarget = canonicalizeInterest(action.category);
            const currentInterests = deduplicateInterests(updatedReqs.interests);
            if (currentInterests.includes(canonicalTarget)) {
                updatedReqs.interests = currentInterests.filter((i) => i !== canonicalTarget);
            }
            else {
                updatedReqs.interests = [...currentInterests, canonicalTarget];
            }
            await TripRepository.update(trip._id.toString(), {
                requirements: updatedReqs,
                destination,
                planningState: "collecting_requirements"
            });
            const dur = updatedReqs.durationDays || 3;
            const bud = updatedReqs.budget?.category || "moderate";
            return WhatsAppInteractiveService.sendInterestMenu(phoneNumber, destination, dur, bud, updatedReqs.interests, trip._id.toString(), activeLanguage, updatedReqs.startDate);
        }
        else if (action.type === "INTERESTS_DONE" || action.type === "SET_INTERESTS") {
            if (action.type === "SET_INTERESTS") {
                const existing = updatedReqs.interests || [];
                updatedReqs.interests = deduplicateInterests([...existing, ...action.interests]);
            }
            else {
                updatedReqs.interests = deduplicateInterests(updatedReqs.interests);
            }
            await TripRepository.update(trip._id.toString(), {
                requirements: updatedReqs,
                destination,
                planningState: "collecting_requirements"
            });
            const updatedTripForSummary = (await TripRepository.findById(trip._id.toString())) || trip;
            return WhatsAppInteractiveService.sendTripConfirmationCard(phoneNumber, updatedTripForSummary, activeLanguage);
        }
        else if (action.type === "SET_PACING") {
            const pace = (["relaxed", "moderate", "balanced", "fast_paced"].includes(action.pacing)
                ? (action.pacing === "moderate" ? "balanced" : action.pacing)
                : "balanced");
            updatedReqs.preferredPace = pace;
            updatedReqs.walkingTolerance =
                pace === "relaxed" ? "minimal" : pace === "fast_paced" ? "high" : "moderate";
        }
        if (action.type !== "TRIP_CONFIRM" && action.type !== "TRIP_RETRY_GENERATE") {
            await TripRepository.update(trip._id.toString(), {
                requirements: updatedReqs,
                destination,
                startDate: updatedReqs.startDate ? new Date(updatedReqs.startDate) : undefined,
                travelers: updatedReqs.travelers?.total || 1,
                planningState: "collecting_requirements"
            });
        }
        const updatedTrip = (await TripRepository.findById(trip._id.toString())) || trip;
        if (action.type === "TRIP_CONFIRM" || action.type === "TRIP_RETRY_GENERATE") {
            // Idempotency: if already confirmed with valid snapshot and NOT retry, return existing Day 1 immediately
            if (action.type === "TRIP_CONFIRM" && updatedTrip.status === "confirmed" && updatedTrip.itinerarySnapshot) {
                const snapshot = updatedTrip.itinerarySnapshot;
                if (snapshot.days && snapshot.days.length > 0) {
                    logger.info({ tripId: updatedTrip._id.toString() }, "Trip already confirmed with itinerary; returning Day 1 idempotently");
                    return WhatsAppInteractiveService.sendDayItinerary(phoneNumber, updatedTrip, snapshot, 1, activeLanguage);
                }
            }
            const { isReady, missingFields } = hasRequiredPlanningFields(updatedReqs);
            if (!isReady) {
                const missingNotice = `⚠️ Please select your ${missingFields.join(", ")} before generating your itinerary.`;
                if (!updatedReqs.startDate) {
                    return WhatsAppInteractiveService.sendTravelDateMenu(phoneNumber, destination, updatedTrip._id.toString(), activeLanguage);
                }
                if (!updatedReqs.durationDays) {
                    return WhatsAppInteractiveService.sendDurationMenu(phoneNumber, destination, updatedTrip._id.toString(), activeLanguage, updatedReqs.startDate);
                }
                if (!updatedReqs.travelers?.total) {
                    return WhatsAppInteractiveService.sendTravelerMenu(phoneNumber, destination, updatedReqs.durationDays, updatedTrip._id.toString(), activeLanguage, updatedReqs.startDate);
                }
                if (!updatedReqs.budget?.category) {
                    return WhatsAppInteractiveService.sendBudgetMenu(phoneNumber, destination, updatedReqs.durationDays, updatedReqs.travelers?.total || 1, updatedTrip._id.toString(), activeLanguage, updatedReqs.startDate);
                }
                if (updatedReqs.interests === undefined) {
                    return WhatsAppInteractiveService.sendInterestMenu(phoneNumber, destination, updatedReqs.durationDays, updatedReqs.budget?.category || "moderate", updatedReqs.interests || [], updatedTrip._id.toString(), activeLanguage, updatedReqs.startDate);
                }
                return {
                    textMessages: [missingNotice],
                    fallbackText: missingNotice
                };
            }
            try {
                const normalizedRequirements = normalizeWizardRequirements(updatedReqs);
                const generator = new ItineraryGeneratorService();
                const genResult = await generator.generateItinerary({
                    userId,
                    tripId: updatedTrip._id.toString(),
                    conversationId,
                    requirements: normalizedRequirements as any,
                    language: activeLanguage
                });
                await TripRepository.update(updatedTrip._id.toString(), {
                    status: "confirmed",
                    planningState: "completed",
                    requirements: normalizedRequirements,
                    startDate: normalizedRequirements.startDate ? new Date(normalizedRequirements.startDate) : undefined,
                    endDate: normalizedRequirements.endDate ? new Date(normalizedRequirements.endDate) : undefined
                });
                await ConversationRepository.updateActivity(conversationId, updatedTrip._id.toString());
                const refreshedTrip = (await TripRepository.findById(updatedTrip._id.toString())) || updatedTrip;
                return WhatsAppInteractiveService.sendDayItinerary(phoneNumber, refreshedTrip, genResult.snapshot, 1, activeLanguage);
            }
            catch (err) {
                logger.error({ err, tripId: updatedTrip._id.toString() }, "Failed to generate itinerary");
                return WhatsAppInteractiveService.sendGenerationErrorMenu(phoneNumber, updatedTrip._id.toString(), activeLanguage);
            }
        }
        // Determine next step dynamically
        const startDate = updatedReqs.startDate;
        const dur = updatedReqs.durationDays;
        const trav = updatedReqs.travelers?.total;
        const bud = updatedReqs.budget?.category;
        const ints = updatedReqs.interests;
        if (!startDate) {
            return WhatsAppInteractiveService.sendTravelDateMenu(phoneNumber, destination, updatedTrip._id.toString(), activeLanguage);
        }
        if (!dur) {
            return WhatsAppInteractiveService.sendDurationMenu(phoneNumber, destination, updatedTrip._id.toString(), activeLanguage, startDate);
        }
        if (!trav) {
            return WhatsAppInteractiveService.sendTravelerMenu(phoneNumber, destination, dur, updatedTrip._id.toString(), activeLanguage, startDate);
        }
        if (!bud) {
            return WhatsAppInteractiveService.sendBudgetMenu(phoneNumber, destination, dur, trav, updatedTrip._id.toString(), activeLanguage, startDate);
        }
        if (ints === undefined) {
            return WhatsAppInteractiveService.sendInterestMenu(phoneNumber, destination, dur, bud, updatedReqs.interests || [], updatedTrip._id.toString(), activeLanguage, startDate);
        }
        return WhatsAppInteractiveService.sendTripConfirmationCard(phoneNumber, updatedTrip, activeLanguage);
    }
}
