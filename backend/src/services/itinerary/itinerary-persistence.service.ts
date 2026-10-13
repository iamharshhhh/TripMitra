import crypto from "crypto";
import { TripRepository } from "../../repositories/trip.repository.js";
import { ConversationRepository } from "../../repositories/conversation.repository.js";
import { PersistedItinerarySnapshotSchema } from "./itinerary-persistence.types.js";
import { TripStateMachine } from "./trip-state.machine.js";
import { AppError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import { PersistedItineraryDay, SaveItineraryOptions } from "./itinerary-persistence.types.js";
import { StructuredTripRequirements } from "../../types/trip-requirements.types.js";
import { EnrichedItineraryResult } from "./itinerary-enrichment.types.js";

export class ItineraryPersistenceService {
    /**
     * Computes a deterministic SHA-256 hash of the content of the itinerary.
     * Excludes generatedAt and itineraryVersion so identical schedules result in identical hashes.
     */
    static computeContentHash(days: PersistedItineraryDay[], destinationSlug: string) {
        const canonicalRepresentation = {
            destinationSlug,
            days: days.map((d) => ({
                dayNumber: d.dayNumber,
                date: d.date,
                dayStartTime: d.dayStartTime,
                dayEndTime: d.dayEndTime,
                totalVisitMinutes: d.totalVisitMinutes,
                totalTravelMinutes: d.totalTravelMinutes,
                clusterId: d.clusterId,
                places: d.places.map((p) => ({
                    placeId: p.placeId,
                    name: p.name,
                    category: p.category,
                    startTime: p.startTime,
                    endTime: p.endTime,
                    durationMinutes: p.durationMinutes,
                    travelTimeMinutesFromPrevious: p.travelTimeMinutesFromPrevious,
                    travelDistanceMetersFromPrevious: p.travelDistanceMetersFromPrevious
                }))
            }))
        };
        return crypto
            .createHash("sha256")
            .update(JSON.stringify(canonicalRepresentation))
            .digest("hex");
    }
    /**
     * Converts EnrichedItineraryResult into compact, valid PersistedItinerarySnapshot.
     * Strips raw provider payloads and transient data.
     */
    static buildSnapshot(requirements: StructuredTripRequirements, enrichedResult: EnrichedItineraryResult, version = 1) {
        const days = enrichedResult.dailySchedules.map((schedule) => {
            const places = schedule.places.map((place, idx) => {
                const prevPlace = idx > 0 ? schedule.places[idx - 1] : undefined;
                const lat = place.candidate.location?.latitude;
                const lng = place.candidate.location?.longitude;
                const isGenericMeal = place.activityType === "meal" || !place.candidate.placeId || place.candidate.placeId.startsWith("lunch-day-") || place.candidate.placeId.startsWith("dinner-day-");
                let mapUrl = undefined;
                if (lat && lng) {
                    mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                }
                else if (!isGenericMeal && place.candidate.name && requirements.destination) {
                    mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.candidate.name}, ${requirements.destination}`)}`;
                }
                let directionsUrl = undefined;
                if (prevPlace && !isGenericMeal) {
                    const prevLat = prevPlace.candidate.location?.latitude;
                    const prevLng = prevPlace.candidate.location?.longitude;
                    if (prevLat && prevLng && lat && lng) {
                        directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${prevLat},${prevLng}&destination=${lat},${lng}&travelmode=driving`;
                    }
                    else if (prevPlace.candidate.name && place.candidate.name && !prevPlace.candidate.placeId?.includes("day-")) {
                        directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(prevPlace.candidate.name)}&destination=${encodeURIComponent(place.candidate.name)}&travelmode=driving`;
                    }
                }
                return {
                    placeId: place.candidate.placeId,
                    name: place.candidate.name,
                    category: place.candidate.category,
                    activityType: place.activityType || (place.candidate.category === "restaurant" ? "restaurant" : "attraction"),
                    mealType: place.mealType,
                    description: place.candidate.description || place.candidate.category,
                    mapUrl,
                    directionsUrl,
                    location: {
                        latitude: lat,
                        longitude: lng,
                        address: place.candidate.location?.address,
                        neighborhood: place.candidate.location?.neighborhood
                    },
                    startTime: place.startTime,
                    endTime: place.endTime,
                    durationMinutes: place.durationMinutes,
                    durationSource: place.durationSource,
                    visitDurationMinutes: place.visitDurationMinutes,
                    transferDurationMinutes: place.transferDurationMinutes,
                    waitingDurationMinutes: place.waitingDurationMinutes,
                    transitionBufferMinutes: place.transitionBufferMinutes,
                    transitionBufferNote: place.transitionBufferNote,
                    transferScheduleSource: place.transferScheduleSource,
                    transferNote: place.transferNote,
                    solarSource: place.solarSource,
                    solarNote: place.solarNote,
                    travelDistanceMetersFromPrevious: place.travelDistanceMetersFromPrevious,
                    travelTimeMinutesFromPrevious: place.travelTimeMinutesFromPrevious,
                    travelEstimationSource: place.travelEstimationSource,
                    weatherSuitability: place.weatherSuitability,
                    weatherReasons: place.weatherReasons || [],
                    costItem: place.costItem
                };
            });
            const morning = places.filter((p) => (p.startTime || "09:00") < "12:00");
            const afternoon = places.filter((p) => (p.startTime || "09:00") >= "12:00" && (p.startTime || "09:00") < "17:00");
            const evening = places.filter((p) => (p.startTime || "09:00") >= "17:00");
            return {
                dayNumber: schedule.dayNumber,
                date: schedule.date,
                dayStartTime: schedule.dayStartTime,
                dayEndTime: schedule.dayEndTime,
                places,
                morning,
                afternoon,
                evening,
                totalVisitMinutes: schedule.totalVisitMinutes,
                totalTravelMinutes: schedule.totalTravelMinutes,
                remainingMinutes: schedule.remainingMinutes,
                totalAttractionVisitMinutes: schedule.totalAttractionVisitMinutes,
                totalMealMinutes: schedule.totalMealMinutes,
                totalAccessTransferMinutes: schedule.totalAccessTransferMinutes,
                totalWaitingAndBufferMinutes: schedule.totalWaitingAndBufferMinutes,
                totalDaytimeVisitMinutes: schedule.totalDaytimeVisitMinutes,
                totalNightlifeVisitMinutes: schedule.totalNightlifeVisitMinutes,
                clusterId: schedule.clusterId,
                dayWeather: schedule.dayWeather,
                knownDailyCost: schedule.knownDailyCost
            };
        });
        const contentHash = this.computeContentHash(days, requirements.destinationSlug);
        const snapshot = {
            itineraryVersion: version,
            generatedAt: new Date().toISOString(),
            contentHash,
            days,
            weather: enrichedResult.weather,
            budget: enrichedResult.budget,
            diagnostics: enrichedResult.diagnostics,
            generationMetadata: {
                destination: requirements.destination,
                destinationSlug: requirements.destinationSlug,
                durationDays: requirements.durationDays || days.length,
                totalPlaces: days.reduce((sum, d) => sum + d.places.length, 0)
            }
        };
        // Pre-validate via Zod
        return PersistedItinerarySnapshotSchema.parse(snapshot);
    }
    /**
     * Persists an enriched itinerary into MongoDB.
     *
     * Idempotency & Versioning Rules:
     * - New Trip: version = 1
     * - Identical Snapshot Re-persist (matching contentHash): TRUE NO-OP (version is NOT incremented)
     * - Genuinely changed itinerary: version increments
     * - Stale expectedVersion: throws 409 CONCURRENT_MODIFICATION
     * - Safe legacy estimatedCost: populates only if hasUnknownCosts is false; otherwise undefined (never claims unknown is 0)
     * - Updates Conversation.activeTripId if conversationId is provided
     */
    async persistItinerary(options: SaveItineraryOptions, requirements: StructuredTripRequirements, enrichedResult: EnrichedItineraryResult) {
        const { userId, conversationId, expectedVersion } = options;
        let targetTripId = options.tripId;
        // 1. Resolve Target Trip and Validate Ownership
        let existingTrip = null;
        if (targetTripId) {
            existingTrip = await TripRepository.findById(targetTripId);
            if (!existingTrip) {
                throw new AppError(`Trip not found: ${targetTripId}`, 404, "TRIP_NOT_FOUND");
            }
            if (String(existingTrip.userId) !== String(userId)) {
                throw new AppError("Unauthorized access to trip", 403, "TRIP_ACCESS_DENIED");
            }
        }
        else if (conversationId) {
            const conversation = await ConversationRepository.findById(conversationId);
            if (!conversation) {
                throw new AppError(`Conversation not found: ${conversationId}`, 404, "CONVERSATION_NOT_FOUND");
            }
            if (String(conversation.userId) !== String(userId)) {
                throw new AppError("Unauthorized access to conversation", 403, "CONVERSATION_ACCESS_DENIED");
            }
            if (conversation.activeTripId) {
                const activeTrip = await TripRepository.findById(String(conversation.activeTripId));
                if (activeTrip && String(activeTrip.userId) === String(userId)) {
                    existingTrip = activeTrip;
                    targetTripId = String(activeTrip._id);
                }
            }
        }
        // 2. Determine Version and Idempotency
        const currentVersion = existingTrip?.itineraryVersion || 0;
        // Optimistic concurrency check
        if (existingTrip && typeof expectedVersion === "number" && expectedVersion !== currentVersion) {
            throw new AppError(`Stale itinerary update. Expected version ${expectedVersion}, but current version is ${currentVersion}.`, 409, "CONCURRENT_ITINERARY_MODIFICATION");
        }
        // Build candidate snapshot
        const initialSnapshot = ItineraryPersistenceService.buildSnapshot(requirements, enrichedResult, existingTrip ? currentVersion + 1 : 1);
        // Check Identical Re-Persist (True No-Op for Versioning)
        if (existingTrip && existingTrip.itinerarySnapshot) {
            const existingSnapshot = existingTrip.itinerarySnapshot;
            if (existingSnapshot.contentHash && existingSnapshot.contentHash === initialSnapshot.contentHash) {
                logger.info({ tripId: targetTripId, version: currentVersion }, "Identical itinerary snapshot re-persisted; preserving existing version (idempotent no-op)");
                return {
                    tripId: targetTripId,
                    userId,
                    itineraryVersion: currentVersion,
                    isNewTrip: false,
                    isNewVersion: false,
                    activeTripUpdated: false,
                    snapshot: existingSnapshot
                };
            }
        }
        const nextVersion = existingTrip ? currentVersion + 1 : 1;
        const finalSnapshot = {
            ...initialSnapshot,
            itineraryVersion: nextVersion
        };
        // 3. State Transition Validation
        const currentState = existingTrip?.planningState || "planning";
        const nextState = TripStateMachine.transition(currentState, "itinerary_created", requirements, true);
        // 4. Safe Legacy estimatedCost Handling
        // If hasUnknownCosts is true, we leave estimatedCost undefined so legacy callers do not treat a partial cost as a complete total.
        const safeEstimatedCost = enrichedResult.budget.hasUnknownCosts
            ? undefined
            : enrichedResult.budget.knownTotalCost;
        // 5. Atomic Trip Update or Creation
        let savedTrip;
        if (existingTrip && targetTripId) {
            const updatePayload = {
                requirements,
                destination: requirements.destination,
                destinationSlug: requirements.destinationSlug,
                startDate: requirements.startDate ? new Date(requirements.startDate) : undefined,
                endDate: requirements.endDate ? new Date(requirements.endDate) : undefined,
                travelers: requirements.travelers?.total ?? 1,
                budget: requirements.budget?.maxTotalAmount,
                itinerary: finalSnapshot.days,
                itinerarySnapshot: finalSnapshot,
                itineraryVersion: nextVersion,
                budgetBreakdown: enrichedResult.budget,
                estimatedCost: safeEstimatedCost,
                planningState: nextState
            };
            const updated = await TripRepository.saveItinerary(targetTripId, updatePayload, expectedVersion);
            if (!updated) {
                throw new AppError("Failed to update trip or version conflict occurred", 409, "CONCURRENT_ITINERARY_MODIFICATION");
            }
            savedTrip = updated;
        }
        else {
            // Create new trip
            const newTripPayload = {
                userId,
                destination: requirements.destination,
                destinationSlug: requirements.destinationSlug,
                startDate: requirements.startDate ? new Date(requirements.startDate) : undefined,
                endDate: requirements.endDate ? new Date(requirements.endDate) : undefined,
                travelers: requirements.travelers?.total ?? 1,
                budget: requirements.budget?.maxTotalAmount,
                itinerary: finalSnapshot.days,
                itinerarySnapshot: finalSnapshot,
                itineraryVersion: nextVersion,
                budgetBreakdown: enrichedResult.budget,
                estimatedCost: safeEstimatedCost,
                status: "planning",
                planningState: nextState,
                requirements
            };
            savedTrip = await TripRepository.create(newTripPayload as any);
            targetTripId = String(savedTrip._id);
        }
        // 6. Handle Conversation.activeTripId Consistency
        let activeTripUpdated = false;
        if (conversationId && targetTripId) {
            try {
                const convUpdate = await ConversationRepository.updateActiveTrip(conversationId, targetTripId);
                if (!convUpdate) {
                    throw new Error(`Conversation not found for id ${conversationId}`);
                }
                activeTripUpdated = true;
            }
            catch (convErr) {
                const msg = convErr instanceof Error ? convErr.message : String(convErr);
                logger.error({ conversationId, tripId: targetTripId, err: msg }, "Failed to update conversation activeTripId after trip persistence");
                throw new AppError(`Trip persisted but failed to update conversation activeTripId: ${msg}`, 500, "CONVERSATION_CONSISTENCY_ERROR");
            }
        }
        logger.info({ tripId: targetTripId, version: nextVersion, isNewTrip: !existingTrip }, "Itinerary persisted successfully");
        return {
            tripId: targetTripId,
            userId,
            itineraryVersion: nextVersion,
            isNewTrip: !existingTrip,
            isNewVersion: true,
            activeTripUpdated,
            snapshot: finalSnapshot
        };
    }
    /**
     * Retrieves durable persisted itinerary for a given tripId.
     */
    async getItinerary(tripId: string) {
        const rawSnapshot = await TripRepository.getItinerary(tripId);
        if (!rawSnapshot)
            return null;
        return PersistedItinerarySnapshotSchema.parse(rawSnapshot);
    }
}
