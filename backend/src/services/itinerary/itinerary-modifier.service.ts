import { PlaceDiscoveryService } from "./place-discovery.service.js";
import { CandidateRankingService } from "./candidate-ranking.service.js";
import { DailySchedulerService } from "./daily-scheduler.service.js";
import { ItineraryEnrichmentService } from "./itinerary-enrichment.service.js";
import { ItineraryPersistenceService } from "./itinerary-persistence.service.js";
import { TripRepository } from "../../repositories/trip.repository.js";
import { AppError } from "../../utils/errors.js";
import { ModificationIntent } from "./modification-intent.types.js";

export class ItineraryModifierService {
    discoveryService;
    rankingService;
    schedulerService;
    enrichmentService;
    persistenceService;
    constructor(discoveryService?: PlaceDiscoveryService, rankingService?: CandidateRankingService, schedulerService?: DailySchedulerService, enrichmentService?: ItineraryEnrichmentService, persistenceService?: ItineraryPersistenceService) {
        this.discoveryService = discoveryService || new PlaceDiscoveryService();
        this.rankingService = rankingService || new CandidateRankingService();
        this.schedulerService = schedulerService || new DailySchedulerService();
        this.enrichmentService = enrichmentService || new ItineraryEnrichmentService();
        this.persistenceService = persistenceService || new ItineraryPersistenceService();
    }
    /**
     * Modifies an itinerary based on a structured ModificationIntent.
     *
     * Crucial Invariants:
     * 1. Application-level validation of untrusted intent.
     * 2. Targeted day modification preserves unaffected days exactly; excludes preserved places from candidates.
     * 3. Day-specific pace/preferences are not applied globally.
     * 4. Place resolution is authoritative: resolve targetPlaceName against persisted places; never trust raw LLM placeId.
     * 5. "makeCheaper" without numeric budget adjusts scoring preference toward lower price levels / budget categories; never invents numeric limits.
     * 6. Hard constraints remain non-negotiable (M8.3 filtering).
     * 7. Persistence via M8.6 guarantees atomic writes, optimistic concurrency, and version increments.
     */
    async modifyItinerary(tripId: string, userId: string, intent: ModificationIntent, optionsOrRefDate?: Date | {
        expectedVersion?: number;
        referenceDate?: Date;
    }, legacyRefDate?: Date) {
        const options = optionsOrRefDate instanceof Date
            ? { referenceDate: optionsOrRefDate }
            : (typeof optionsOrRefDate === "object" ? optionsOrRefDate : {});
        const referenceDate = options.referenceDate ?? legacyRefDate;
        const expectedVersion = options.expectedVersion;
        // 1. Fetch current trip and snapshot
        const trip = await TripRepository.findById(tripId);
        if (!trip) {
            throw new AppError(`Trip not found: ${tripId}`, 404, "TRIP_NOT_FOUND");
        }
        if (String(trip.userId) !== String(userId)) {
            throw new AppError("Unauthorized access to trip", 403, "TRIP_ACCESS_DENIED");
        }
        const currentSnapshot = trip.itinerarySnapshot;
        if (!currentSnapshot || !currentSnapshot.days || currentSnapshot.days.length === 0) {
            throw new AppError("No existing itinerary snapshot found to modify", 400, "NO_EXISTING_ITINERARY");
        }
        const currentReqs = trip.requirements;
        const previousVersion = trip.itineraryVersion || 1;
        // Reject stale expectedVersion early
        if (expectedVersion !== undefined && expectedVersion !== previousVersion) {
            throw new AppError(`Itinerary version conflict: trip has version ${previousVersion}, but client expected version ${expectedVersion}`, 409, "ITINERARY_VERSION_CONFLICT");
        }
        // 2. Clarification Handling
        if (intent.action === "clarification_needed" || intent.requiresClarification) {
            return {
                status: "clarification_needed",
                tripId,
                userId,
                intent,
                previousVersion,
                newVersion: previousVersion,
                changedDays: [],
                preservedDays: currentSnapshot.days.map((d) => d.dayNumber),
                explanation: intent.clarificationPrompt || "Could you please provide more details on the changes you'd like?",
                snapshot: currentSnapshot
            };
        }
        if (intent.action === "none") {
            return {
                status: "no_change",
                tripId,
                userId,
                intent,
                previousVersion,
                newVersion: previousVersion,
                changedDays: [],
                preservedDays: currentSnapshot.days.map((d) => d.dayNumber),
                explanation: "No itinerary changes requested.",
                snapshot: currentSnapshot
            };
        }
        // 3. Authoritative Place Resolution (for replace_place / remove_place / complete_place / skip_place)
        let resolvedPlaceId;
        let resolvedPlaceDayNumber;
        if (intent.action === "replace_place" || intent.action === "remove_place" || intent.action === "complete_place" || intent.action === "skip_place") {
            if (!intent.targetPlaceName) {
                return {
                    status: "clarification_needed",
                    tripId,
                    userId,
                    intent,
                    previousVersion,
                    newVersion: previousVersion,
                    changedDays: [],
                    preservedDays: currentSnapshot.days.map((d) => d.dayNumber),
                    explanation: "Which place would you like to modify, complete, or skip? Please mention its name.",
                    snapshot: currentSnapshot
                };
            }
            // Search matching place across all days deterministically (case-insensitive substring)
            const targetQuery = intent.targetPlaceName.toLowerCase().trim();
            const matches = [];
            for (const day of currentSnapshot.days) {
                for (const place of day.places) {
                    if (place.name.toLowerCase().includes(targetQuery) || targetQuery.includes(place.name.toLowerCase())) {
                        matches.push({ placeId: place.placeId, name: place.name, dayNumber: day.dayNumber });
                    }
                }
            }
            if (matches.length === 0) {
                return {
                    status: "clarification_needed",
                    tripId,
                    userId,
                    intent,
                    previousVersion,
                    newVersion: previousVersion,
                    changedDays: [],
                    preservedDays: currentSnapshot.days.map((d) => d.dayNumber),
                    explanation: `I couldn't find "${intent.targetPlaceName}" in your current itinerary. Could you check the name?`,
                    snapshot: currentSnapshot
                };
            }
            if (matches.length > 1) {
                // Ambiguity: multiple places match
                return {
                    status: "clarification_needed",
                    tripId,
                    userId,
                    intent,
                    previousVersion,
                    newVersion: previousVersion,
                    changedDays: [],
                    preservedDays: currentSnapshot.days.map((d) => d.dayNumber),
                    explanation: `Multiple places match "${intent.targetPlaceName}": ${matches.map((m) => `"${m.name}" on Day ${m.dayNumber}`).join(", ")}. Which one did you mean?`,
                    snapshot: currentSnapshot
                };
            }
            resolvedPlaceId = matches[0].placeId;
            resolvedPlaceDayNumber = matches[0].dayNumber;
        }
        // 4. Targeted Day vs. Trip-Level Execution
        const isDayLevel = intent.scope === "day_level" || Boolean(intent.targetDayNumber) || Boolean(resolvedPlaceDayNumber);
        const targetDay = intent.targetDayNumber || resolvedPlaceDayNumber || 1;
        const updatedRequirements: any = { ...currentReqs };
        let changedDays = [];
        let preservedDays = [];
        // Apply adjustments to requirements
        if (intent.adjustments.maxBudget !== undefined && intent.adjustments.maxBudget !== null) {
            updatedRequirements.budget = {
                ...updatedRequirements.budget,
                category: (intent.adjustments.budgetCategory ?? updatedRequirements.budget?.category) || "moderate",
                maxTotalAmount: intent.adjustments.maxBudget,
                currency: updatedRequirements.budget?.currency || "INR"
            };
        }
        else if (intent.adjustments.makeCheaper) {
            // Vague "make it cheaper" -> shift budgetCategory to budget without inventing arbitrary numeric limit
            updatedRequirements.budget = {
                ...updatedRequirements.budget,
                category: "budget",
                currency: updatedRequirements.budget?.currency || "INR"
            };
        }
        else if (intent.adjustments.budgetCategory) {
            updatedRequirements.budget = {
                ...updatedRequirements.budget,
                category: intent.adjustments.budgetCategory,
                currency: updatedRequirements.budget?.currency || "INR"
            };
        }
        if (intent.adjustments.preferredPace && !isDayLevel) {
            updatedRequirements.preferredPace = intent.adjustments.preferredPace;
        }
        if (intent.adjustments.walkingTolerance) {
            updatedRequirements.walkingTolerance = intent.adjustments.walkingTolerance;
        }
        if (intent.adjustments.travelers) {
            updatedRequirements.travelers = intent.adjustments.travelers;
        }
        if (intent.adjustments.travelType) {
            updatedRequirements.travelType = intent.adjustments.travelType;
        }
        if (intent.adjustments.addedInterests?.length) {
            updatedRequirements.interests = Array.from(new Set([...updatedRequirements.interests, ...intent.adjustments.addedInterests]));
        }
        if (intent.adjustments.removedInterests?.length) {
            const toRemove = new Set(intent.adjustments.removedInterests.map((s) => s.toLowerCase()));
            updatedRequirements.interests = updatedRequirements.interests.filter((i) => !toRemove.has(i.toLowerCase()));
        }
        // Direct Execution State Mutation (Phase 8.8: complete_place / skip_place)
        if (intent.action === "complete_place" || intent.action === "skip_place") {
            const isComplete = intent.action === "complete_place";
            const targetPlaceName = intent.targetPlaceName;
            changedDays = [targetDay];
            preservedDays = currentSnapshot.days.filter((d) => d.dayNumber !== targetDay).map((d) => d.dayNumber);
            const updatedDays = currentSnapshot.days.map((day) => {
                if (day.dayNumber !== targetDay)
                    return day;
                return {
                    ...day,
                    places: day.places.map((place) => {
                        const matches = (resolvedPlaceId && place.placeId === resolvedPlaceId) ||
                            (targetPlaceName && place.name.toLowerCase() === targetPlaceName.toLowerCase());
                        if (!matches)
                            return place;
                        return {
                            ...place,
                            executionStatus: isComplete ? "completed" : "skipped",
                            completed: isComplete ? true : place.completed,
                            skipped: !isComplete ? true : place.skipped,
                            completedAt: isComplete ? new Date().toISOString() : place.completedAt,
                            skippedAt: !isComplete ? new Date().toISOString() : place.skippedAt
                        };
                    })
                };
            });
            const newVersion = previousVersion + 1;
            const updatedSnapshot = {
                ...currentSnapshot,
                itineraryVersion: newVersion,
                days: updatedDays
            };
            const updatedTrip = await TripRepository.saveItinerary(tripId, {
                itinerarySnapshot: updatedSnapshot,
                itineraryVersion: newVersion
            }, expectedVersion ?? previousVersion);
            if (!updatedTrip) {
                throw new AppError(`Itinerary version conflict: failed to update trip ${tripId} at expected version ${expectedVersion ?? previousVersion}`, 409, "ITINERARY_VERSION_CONFLICT");
            }
            const explanation = isComplete
                ? `Marked "${intent.targetPlaceName || "place"}" as completed.`
                : `Skipped "${intent.targetPlaceName || "place"}".`;
            return {
                status: "modified",
                tripId,
                userId,
                intent,
                previousVersion,
                newVersion,
                changedDays,
                preservedDays,
                explanation,
                snapshot: updatedSnapshot
            };
        }
        // Direct Trip Completion State Mutation (Phase 8.9: complete_trip)
        if (intent.action === "complete_trip") {
            const newVersion = previousVersion + 1;
            const updatedSnapshot = {
                ...currentSnapshot,
                itineraryVersion: newVersion
            };
            const updatedTrip = await TripRepository.saveItinerary(tripId, {
                status: "completed",
                itinerarySnapshot: updatedSnapshot,
                itineraryVersion: newVersion
            }, expectedVersion ?? previousVersion);
            if (!updatedTrip) {
                throw new AppError(`Itinerary version conflict: failed to complete trip ${tripId} at expected version ${expectedVersion ?? previousVersion}`, 409, "ITINERARY_VERSION_CONFLICT");
            }
            const explanation = `Marked trip to ${trip.destination || "destination"} as completed.`;
            return {
                status: "modified",
                tripId,
                userId,
                intent,
                previousVersion,
                newVersion,
                changedDays: currentSnapshot.days.map((d) => d.dayNumber),
                preservedDays: [],
                explanation,
                snapshot: updatedSnapshot
            };
        }
        // 5. Discover Candidates
        const discoveredCandidates = await this.discoveryService.discoverCandidates({
            destination: updatedRequirements.destination,
            destinationSlug: updatedRequirements.destinationSlug,
            interests: updatedRequirements.interests
        });
        let newDailySchedules = [];
        if (isDayLevel && currentSnapshot.days.length > 1) {
            // TARGETED DAY REPLANNING
            changedDays = [targetDay];
            preservedDays = currentSnapshot.days.filter((d) => d.dayNumber !== targetDay).map((d) => d.dayNumber);
            // Collect place IDs in preserved days so they are excluded from the candidate pool for the modified day
            const preservedPlaceIds = new Set();
            for (const d of currentSnapshot.days) {
                if (d.dayNumber !== targetDay) {
                    for (const p of d.places) {
                        preservedPlaceIds.add(p.placeId);
                    }
                }
            }
            // If replacing/removing place, also exclude resolvedPlaceId
            if (resolvedPlaceId) {
                preservedPlaceIds.add(resolvedPlaceId);
            }
            // Filter eligible candidates for the target day
            const dayCandidates = discoveredCandidates.filter((c) => !preservedPlaceIds.has(c.placeId));
            // Day requirements: if pace is specified for this day, apply it to the single-day schedule
            const dayReqs = {
                ...updatedRequirements,
                durationDays: 1,
                preferredPace: intent.adjustments.preferredPace || updatedRequirements.preferredPace,
                startDate: currentSnapshot.days.find((d) => d.dayNumber === targetDay)?.date,
                endDate: currentSnapshot.days.find((d) => d.dayNumber === targetDay)?.date
            };
            const ranked = this.rankingService.rankCandidates(dayReqs, dayCandidates);
            const rankedEligible = ranked.rankedCandidates.map((r) => r.candidate);
            const targetDaySchedule = this.schedulerService.scheduleItinerary(dayReqs, rankedEligible);
            const scheduledDay1 = targetDaySchedule.dailySchedules[0];
            // Reassemble combined days
            newDailySchedules = currentSnapshot.days.map((existingDay) => {
                if (existingDay.dayNumber === targetDay) {
                    return {
                        ...scheduledDay1,
                        dayNumber: targetDay,
                        date: existingDay.date
                    };
                }
                else {
                    // Convert persisted place back to ScheduledPlace structure for enrichment
                    return {
                        dayNumber: existingDay.dayNumber,
                        date: existingDay.date,
                        dayStartTime: existingDay.dayStartTime,
                        dayEndTime: existingDay.dayEndTime,
                        clusterId: existingDay.clusterId,
                        totalVisitMinutes: existingDay.totalVisitMinutes,
                        totalTravelMinutes: existingDay.totalTravelMinutes,
                        remainingMinutes: existingDay.remainingMinutes,
                        places: existingDay.places.map((p) => ({
                            candidate: {
                                placeId: p.placeId,
                                name: p.name,
                                destinationSlug: updatedRequirements.destinationSlug,
                                category: p.category,
                                location: {
                                    latitude: p.location.latitude,
                                    longitude: p.location.longitude,
                                    address: p.location.address ?? undefined,
                                    neighborhood: p.location.neighborhood ?? undefined
                                },
                                source: "google-places",
                                provenance: { sources: ["google-places"] }
                            },
                            dayNumber: existingDay.dayNumber,
                            startTime: p.startTime,
                            endTime: p.endTime,
                            durationMinutes: p.durationMinutes,
                            durationSource: p.durationSource,
                            travelTimeMinutesFromPrevious: p.travelTimeMinutesFromPrevious,
                            travelDistanceMetersFromPrevious: p.travelDistanceMetersFromPrevious,
                            travelEstimationSource: p.travelEstimationSource,
                            activityType: p.activityType,
                            mealType: p.mealType
                        }))
                    };
                }
            });
        }
        else {
            // TRIP-LEVEL REPLANNING
            changedDays = currentSnapshot.days.map((d) => d.dayNumber);
            preservedDays = [];
            if (intent.adjustments.preferredPace) {
                updatedRequirements.preferredPace = intent.adjustments.preferredPace;
            }
            let eligibleCandidates = discoveredCandidates;
            if (resolvedPlaceId) {
                eligibleCandidates = discoveredCandidates.filter((c) => c.placeId !== resolvedPlaceId);
            }
            const ranked = this.rankingService.rankCandidates(updatedRequirements, eligibleCandidates);
            const rankedEligible = ranked.rankedCandidates.map((r) => r.candidate);
            const tripSchedule = this.schedulerService.scheduleItinerary(updatedRequirements, rankedEligible);
            newDailySchedules = tripSchedule.dailySchedules;
        }
        // 6. Enrich with Weather and Authoritative Budget
        const intermediateScheduling = {
            dailySchedules: newDailySchedules,
            unscheduledCandidates: [],
            geographicClusters: [],
            diagnostics: {
                totalCandidates: discoveredCandidates.length,
                scheduledPlacesCount: newDailySchedules.reduce((sum, d) => sum + d.places.length, 0),
                unscheduledCount: 0,
                clustersCount: 0,
                plannedDaysCount: newDailySchedules.length,
                warnings: []
            }
        };
        const enrichedResult = await this.enrichmentService.enrichItinerary(updatedRequirements, intermediateScheduling, referenceDate);
        // 7. Persist via M8.6 with Optimistic Versioning
        const persistResult = await this.persistenceService.persistItinerary({
            tripId,
            userId,
            expectedVersion: expectedVersion ?? previousVersion
        }, updatedRequirements, enrichedResult);
        const explanation = this.generateChangeExplanation(intent, changedDays, preservedDays);
        return {
            status: "modified",
            tripId,
            userId,
            intent,
            previousVersion,
            newVersion: persistResult.itineraryVersion,
            changedDays,
            preservedDays,
            explanation,
            snapshot: persistResult.snapshot
        };
    }
    generateChangeExplanation(intent: any, changedDays: any, preservedDays: any) {
        const parts = [];
        if (intent.action === "complete_place" && intent.targetPlaceName) {
            parts.push(`Marked "${intent.targetPlaceName}" as completed.`);
        }
        else if (intent.action === "skip_place" && intent.targetPlaceName) {
            parts.push(`Skipped "${intent.targetPlaceName}".`);
        }
        else if (intent.action === "replace_place" && intent.targetPlaceName) {
            parts.push(`Replaced "${intent.targetPlaceName}".`);
        }
        else if (intent.action === "remove_place" && intent.targetPlaceName) {
            parts.push(`Removed "${intent.targetPlaceName}".`);
        }
        else if (intent.action === "adjust_pace" && intent.adjustments.preferredPace) {
            parts.push(`Adjusted pacing to ${intent.adjustments.preferredPace}.`);
        }
        else if (intent.action === "adjust_walking" && intent.adjustments.walkingTolerance) {
            parts.push(`Set walking tolerance to ${intent.adjustments.walkingTolerance}.`);
        }
        else if (intent.adjustments.makeCheaper) {
            parts.push("Prioritized budget-friendly places.");
        }
        if (changedDays.length > 0 && preservedDays.length > 0) {
            parts.push(`Updated Day ${changedDays.join(", ")}, keeping Day ${preservedDays.join(", ")} unchanged.`);
        }
        else if (changedDays.length > 0) {
            parts.push(`Updated all ${changedDays.length} days.`);
        }
        return parts.join(" ") || "Itinerary updated successfully.";
    }
}
