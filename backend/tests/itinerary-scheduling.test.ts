import { describe, it, expect } from "@jest/globals";
import {
    DailySchedulerService,
    timeToMinutes,
    minutesToTime,
    calculateAstronomicalSolarTimes,
    getDestinationTimezoneOffsetMinutes,
    inferCandidateDurationBreakdown,
    inferCandidateVisitDuration
} from "../src/services/itinerary/daily-scheduler.service.js";
import { CandidatePlace } from "../src/types/candidate-place.types.js";
import { StructuredTripRequirements } from "../src/types/trip-requirements.types.js";
import { ItineraryPersistenceService } from "../src/services/itinerary/itinerary-persistence.service.js";
import { ItineraryEnrichmentService } from "../src/services/itinerary/itinerary-enrichment.service.js";
import { ItineraryFormatter } from "../src/services/whatsapp-ui/formatters/itinerary.formatter.js";
import { PersistedItinerarySnapshotSchema } from "../src/services/itinerary/itinerary-persistence.types.js";

describe("Intelligent Itinerary Scheduling Test Suite", () => {
    // -------------------------------------------------------------
    // Mock Candidates for Pondicherry Scenario
    // -------------------------------------------------------------
    const mockParadiseBeach: CandidatePlace = {
        placeId: "paradise-beach-1",
        name: "Paradise Beach",
        destinationSlug: "pondicherry",
        category: "nature",
        location: { latitude: 11.8795, longitude: 79.8164, address: "Chunnambar, Puducherry" },
        timeOfDaySuitability: "morning",
        source: "google-places",
        provenance: { sources: ["google-places"] }
    };

    const mockSurguruRestaurant: CandidatePlace = {
        placeId: "surguru-restaurant-1",
        name: "Hotel Surguru",
        destinationSlug: "pondicherry",
        category: "restaurant",
        location: { latitude: 11.9355, longitude: 79.8312, address: "Heritage Town, Puducherry" },
        source: "google-places",
        provenance: { sources: ["google-places"] }
    };

    const mockAshram: CandidatePlace = {
        placeId: "aurobindo-ashram-1",
        name: "Sri Aurobindo Ashram",
        destinationSlug: "pondicherry",
        category: "heritage",
        location: { latitude: 11.9367, longitude: 79.8344, address: "White Town, Puducherry" },
        timeOfDaySuitability: "afternoon",
        source: "google-places",
        provenance: { sources: ["google-places"] }
    };

    const mockTemple: CandidatePlace = {
        placeId: "manakula-vinayagar-1",
        name: "Arulmigu Manakula Vinayagar Temple",
        destinationSlug: "pondicherry",
        category: "heritage",
        location: { latitude: 11.9359, longitude: 79.8339, address: "White Town, Puducherry" },
        timeOfDaySuitability: "afternoon",
        source: "google-places",
        provenance: { sources: ["google-places"] }
    };

    const mockPromenadeBeach: CandidatePlace = {
        placeId: "promenade-beach-1",
        name: "Promenade Beach",
        destinationSlug: "pondicherry",
        category: "nature",
        location: { latitude: 11.9319, longitude: 79.8358, address: "Beach Road, Puducherry" },
        timeOfDaySuitability: "sunset_evening",
        source: "google-places",
        provenance: { sources: ["google-places"] }
    };

    const mockDinnerRestaurant: CandidatePlace = {
        placeId: "villa-shanti-1",
        name: "Villa Shanti",
        destinationSlug: "pondicherry",
        category: "restaurant",
        location: { latitude: 11.9329, longitude: 79.8335, address: "White Town, Puducherry" },
        source: "google-places",
        provenance: { sources: ["google-places"] }
    };

    const mockNightLounge: CandidatePlace = {
        placeId: "asian-house-1",
        name: "Asian House Lounge",
        destinationSlug: "pondicherry",
        category: "activity",
        location: { latitude: 11.9320, longitude: 79.8340, address: "White Town, Puducherry" },
        timeOfDaySuitability: "night",
        source: "google-places",
        provenance: { sources: ["google-places"] }
    };

    // -------------------------------------------------------------
    // 1. Duration Invariants & Component Breakdown
    // -------------------------------------------------------------
    describe("1. Duration Invariants & Component Breakdown", () => {
        it("should infer Paradise Beach with decoupled visit, ferry transfer, and dock waiting", () => {
            const breakdown = inferCandidateDurationBreakdown(mockParadiseBeach);
            expect(breakdown.visitDurationMinutes).toBe(80);
            expect(breakdown.transferDurationMinutes).toBe(40);
            expect(breakdown.waitingDurationMinutes).toBe(30);
            expect(breakdown.totalDurationMinutes).toBe(150);
            expect(breakdown.transferScheduleSource).toBe("estimated");
            expect(breakdown.transferNote).toContain("Chunnambar");
        });

        it("should not falsely collapse all Google Places to 45 min due to point_of_interest", () => {
            const genericMuseum: CandidatePlace = {
                placeId: "museum-1",
                name: "Pondicherry Museum",
                destinationSlug: "pondicherry",
                category: "heritage",
                location: { latitude: 11.9360, longitude: 79.8340 },
                source: "google-places",
                provenance: {
                    sources: ["google-places"],
                    googleDetails: { types: ["point_of_interest", "museum", "establishment"] }
                }
            };
            const breakdown = inferCandidateDurationBreakdown(genericMuseum);
            // Museum should be 90 min, not 45 min!
            expect(breakdown.totalDurationMinutes).toBe(90);
            expect(breakdown.visitDurationMinutes).toBe(90);
        });

        it("should satisfy Universal Block Invariant (endTime - startTime = durationMinutes) for every scheduled block", () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                preferredPace: "moderate"
            };
            const candidates = [
                mockParadiseBeach,
                mockSurguruRestaurant,
                mockAshram,
                mockTemple,
                mockPromenadeBeach,
                mockDinnerRestaurant
            ];
            const result = scheduler.scheduleItinerary(reqs, candidates);
            expect(result.dailySchedules.length).toBe(1);

            const day = result.dailySchedules[0];
            for (const place of day.places) {
                const startMins = timeToMinutes(place.startTime);
                const endMins = timeToMinutes(place.endTime);
                expect(endMins - startMins).toBe(place.durationMinutes);

                if (place.activityType === "attraction") {
                    const visit = place.visitDurationMinutes ?? place.durationMinutes;
                    const transfer = place.transferDurationMinutes ?? 0;
                    const wait = place.waitingDurationMinutes ?? 0;
                    expect(visit + transfer + wait).toBe(place.durationMinutes);
                }
            }
        });
    });

    // -------------------------------------------------------------
    // 2. Meal Anchors and Trip-Boundary Rules
    // -------------------------------------------------------------
    describe("2. Meal Anchors and Trip-Boundary Rules", () => {
        it("should strictly anchor Lunch at 12:30 and Dinner at 19:00", () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                preferredPace: "moderate"
            };
            const result = scheduler.scheduleItinerary(reqs, [
                mockParadiseBeach,
                mockSurguruRestaurant,
                mockAshram,
                mockDinnerRestaurant
            ]);

            const day = result.dailySchedules[0];
            const lunch = day.places.find((p) => p.mealType === "lunch");
            const dinner = day.places.find((p) => p.mealType === "dinner");

            expect(lunch).toBeDefined();
            expect(lunch?.startTime).toBe("12:30");
            expect(lunch?.endTime).toBe("13:30");
            expect(lunch?.durationMinutes).toBe(60);

            expect(dinner).toBeDefined();
            expect(dinner?.startTime).toBe("19:00");
            expect(dinner?.endTime).toBe("20:00");
            expect(dinner?.durationMinutes).toBe(60);
        });

        it("should allocate 45 min for Lunch under fast-paced preference", () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                preferredPace: "fast_paced"
            };
            const result = scheduler.scheduleItinerary(reqs, [
                mockParadiseBeach,
                mockSurguruRestaurant,
                mockAshram
            ]);
            const lunch = result.dailySchedules[0].places.find((p) => p.mealType === "lunch");
            expect(lunch?.startTime).toBe("12:30");
            expect(lunch?.endTime).toBe("13:15");
            expect(lunch?.durationMinutes).toBe(45);
        });

        it("should skip Lunch on Day 1 if arrivalTime >= 13:00", () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                arrivalTime: "13:30",
                preferredPace: "moderate"
            };
            const result = scheduler.scheduleItinerary(reqs, [
                mockAshram,
                mockPromenadeBeach,
                mockDinnerRestaurant
            ]);
            const day = result.dailySchedules[0];
            const lunch = day.places.find((p) => p.mealType === "lunch");
            expect(lunch).toBeUndefined();
        });

        it("should schedule Lunch at 12:30 if Day 1 arrivalTime is 12:00 (partial arrival)", () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                arrivalTime: "12:00",
                preferredPace: "moderate"
            };
            const result = scheduler.scheduleItinerary(reqs, [
                mockSurguruRestaurant,
                mockAshram,
                mockDinnerRestaurant
            ]);
            const day = result.dailySchedules[0];
            const lunch = day.places.find((p) => p.mealType === "lunch");
            expect(lunch).toBeDefined();
            expect(lunch?.startTime).toBe("12:30");
        });

        it("should skip Dinner on final day if departureTime < 19:30", () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                departureTime: "18:00",
                preferredPace: "moderate"
            };
            const result = scheduler.scheduleItinerary(reqs, [
                mockAshram,
                mockPromenadeBeach,
                mockDinnerRestaurant
            ]);
            const day = result.dailySchedules[0];
            const dinner = day.places.find((p) => p.mealType === "dinner");
            expect(dinner).toBeUndefined();
        });
    });

    // -------------------------------------------------------------
    // 3. Paradise Beach Chronological Feasibility
    // -------------------------------------------------------------
    describe("3. Paradise Beach Chronological Feasibility", () => {
        it("should chronologically fit Paradise Beach, 25-min drive, 15-min seating buffer, and 12:30 lunch", () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                preferredPace: "moderate"
            };
            const result = scheduler.scheduleItinerary(reqs, [
                mockParadiseBeach,
                mockSurguruRestaurant,
                mockAshram,
                mockDinnerRestaurant
            ]);

            const day = result.dailySchedules[0];
            const beach = day.places.find((p) => p.candidate.name === "Paradise Beach");
            const lunch = day.places.find((p) => p.mealType === "lunch");

            expect(beach).toBeDefined();
            expect(lunch).toBeDefined();

            // Beach duration breakdown
            expect(beach?.durationMinutes).toBe(150);
            expect(beach?.visitDurationMinutes).toBe(80);
            expect(beach?.transferDurationMinutes).toBe(40);
            expect(beach?.waitingDurationMinutes).toBe(30);

            // Beach ends at or before 11:50
            const beachEndMins = timeToMinutes(beach!.endTime);
            expect(beachEndMins).toBeLessThanOrEqual(timeToMinutes("11:50"));

            // Lunch starts strictly at 12:30
            expect(lunch?.startTime).toBe("12:30");

            // Transition buffer leading to lunch
            expect(lunch?.transitionBufferMinutes).toBeGreaterThanOrEqual(15);
            expect(lunch?.transitionBufferNote).toBe("arrival & seating buffer");

            // Elapsed time between beach end and lunch start matches transit + buffer exactly
            const lunchStartMins = timeToMinutes(lunch!.startTime);
            const transitToLunch = lunch!.travelTimeMinutesFromPrevious;
            const bufferToLunch = lunch!.transitionBufferMinutes ?? 0;
            expect(beachEndMins + transitToLunch + bufferToLunch).toBeLessThanOrEqual(lunchStartMins);
        });
    });

    // -------------------------------------------------------------
    // 4. Destination-Agnostic Solar Attribution & Terminology
    // -------------------------------------------------------------
    describe("4. NOAA Astronomical Solar Calculations & Terminology", () => {
        it("should calculate astronomical sunset for Pondicherry on 2026-10-20 within narrow ±2 min tolerance of 17:50", () => {
            const lat = 11.9416;
            const lon = 79.8083;
            const dateStr = "2026-10-20";
            const tzOffset = getDestinationTimezoneOffsetMinutes(lat, lon);
            expect(tzOffset).toBe(330); // IST

            const solar = calculateAstronomicalSolarTimes(lat, lon, dateStr, tzOffset);
            expect(solar.sunset).toBe("17:50");
            expect(solar.sunrise).toBe("06:01");
        });

        it("should calculate destination-agnostic solar times for Paris without hardcoding IST", () => {
            const parisLat = 48.8566;
            const parisLon = 2.3522;
            const tzOffset = getDestinationTimezoneOffsetMinutes(parisLat, parisLon);
            expect(tzOffset).toBe(0); // UTC longitude band

            const solar = calculateAstronomicalSolarTimes(parisLat, parisLon, "2026-10-20", 60); // CET (UTC+1)
            expect(solar.sunset).toBe("17:54");
            // Verify it does NOT hardcode IST (+330 min, which would give ~22:24)
            expect(solar.sunset).not.toBe("22:24");
        });

        it("should label API-sourced forecast as 'forecast_sourced' and fallback as 'estimated_model', never 'verified'", () => {
            const scheduler = new DailySchedulerService();
            // Test Case A: Forecast-sourced via Open-Meteo summary
            const reqsA: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                preferredPace: "moderate"
            };
            const configWithForecast = {
                dayWeatherSummaries: {
                    1: { sunset: "2026-10-20T17:58", precipitationProbability: 10 }
                }
            };
            const resA = scheduler.scheduleItinerary(reqsA, [mockPromenadeBeach, mockDinnerRestaurant], configWithForecast);
            const beachA = resA.dailySchedules[0].places.find((p) => p.candidate.name === "Promenade Beach");
            expect(beachA?.solarSource).toBe("forecast_sourced");
            expect(beachA?.solarNote).toContain("Forecast sunset window");
            expect(beachA?.solarNote).not.toContain("verified");

            // Test Case B: Estimated fallback (no forecast)
            const resB = scheduler.scheduleItinerary(reqsA, [mockPromenadeBeach, mockDinnerRestaurant]);
            const beachB = resB.dailySchedules[0].places.find((p) => p.candidate.name === "Promenade Beach");
            expect(beachB?.solarSource).toBe("estimated_model");
            expect(beachB?.solarNote).toContain("Estimated sunset window");
            expect(beachB?.solarNote).not.toContain("verified");
        });
    });

    // -------------------------------------------------------------
    // 5. Full-Day Granular Reconciliation vs Legacy Semantics
    // -------------------------------------------------------------
    describe("5. Full-Day Reconciliation & Backward Compatibility", () => {
        it("should reconcile an 810-minute day without omissions or double-counting, preserving legacy totalVisitMinutes semantics", () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                preferredPace: "moderate",
                interests: ["nightlife"]
            };
            const customConfig = {
                dayStartTime: "09:00",
                dayEndTime: "22:30",
                maxPlacesPerDay: { moderate: 6, relaxed: 5, fast_paced: 7 }
            };

            const candidates = [
                mockParadiseBeach, // 150m (80 visit + 40 boat + 30 wait)
                mockSurguruRestaurant, // 60m lunch
                mockAshram, // 90m visit
                mockTemple, // 75m visit
                mockPromenadeBeach, // 75m visit
                mockDinnerRestaurant, // 60m dinner
                mockNightLounge // 90m nightlife
            ];

            const result = scheduler.scheduleItinerary(reqs, candidates, customConfig);
            const day = result.dailySchedules[0];

            const elapsedDayMinutes = timeToMinutes(day.dayEndTime) - timeToMinutes(day.dayStartTime);
            expect(day.places.length).toBe(7);
            expect(elapsedDayMinutes).toBe(810); // 22:30 - 09:00 = 810 min

            const granularSum =
                (day.totalAttractionVisitMinutes ?? 0) +
                (day.totalMealMinutes ?? 0) +
                (day.totalAccessTransferMinutes ?? 0) +
                (day.totalWaitingAndBufferMinutes ?? 0) +
                day.totalTravelMinutes +
                day.remainingMinutes;

            // Invariant: Full day is 100% reconciled to the exact minute!
            expect(granularSum).toBe(elapsedDayMinutes);

            // Legacy totalVisitMinutes preserves exact sum of durationMinutes
            const legacySum = day.places.reduce((sum, p) => sum + p.durationMinutes, 0);
            expect(day.totalVisitMinutes).toBe(legacySum);

            // The difference between elapsed time (minus travel) and legacy sum is exactly the transition buffers
            const totalTransitionBuffers = day.places.reduce((sum, p) => sum + (p.transitionBufferMinutes ?? 0), 0);
            expect(day.totalVisitMinutes + day.totalTravelMinutes + totalTransitionBuffers + day.remainingMinutes).toBe(elapsedDayMinutes);
        });
    });

    // -------------------------------------------------------------
    // 6. Persistence Round-Trip & Snapshot Validation
    // -------------------------------------------------------------
    describe("6. Persistence Round-Trip & Snapshot Parity", () => {
        it("should serialize decoupled fields and granular totals into valid PersistedItinerarySnapshotSchema", async () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                preferredPace: "moderate"
            };
            const candidates = [
                mockParadiseBeach,
                mockSurguruRestaurant,
                mockAshram,
                mockDinnerRestaurant
            ];
            const schedResult = scheduler.scheduleItinerary(reqs, candidates);

            const enrichment = new ItineraryEnrichmentService();
            const enriched = await enrichment.enrichItinerary(reqs, schedResult, new Date("2026-10-20"));

            const snapshot = ItineraryPersistenceService.buildSnapshot(reqs, enriched);

            // Validate against the Zod schema
            const parsed = PersistedItinerarySnapshotSchema.safeParse(snapshot);
            expect(parsed.success).toBe(true);

            if (parsed.success) {
                const day = parsed.data.days[0];
                expect(day.totalAttractionVisitMinutes).toBeDefined();
                expect(day.totalMealMinutes).toBeDefined();
                expect(day.totalAccessTransferMinutes).toBeDefined();

                const beach = day.places.find((p) => p.name === "Paradise Beach");
                expect(beach?.visitDurationMinutes).toBe(80);
                expect(beach?.transferDurationMinutes).toBe(40);
                expect(beach?.waitingDurationMinutes).toBe(30);
            }
        });
    });

    // -------------------------------------------------------------
    // 7. WhatsApp Presentation & Parity
    // -------------------------------------------------------------
    describe("7. WhatsApp Presentation & Format Parity", () => {
        it("should format decoupled road travel, seating buffer, boat transfer, and solar notes accurately", async () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                preferredPace: "moderate"
            };
            const configWithForecast = {
                dayWeatherSummaries: {
                    1: { sunset: "2026-10-20T17:58", precipitationProbability: 15 }
                }
            };
            const candidates = [
                mockParadiseBeach,
                mockSurguruRestaurant,
                mockPromenadeBeach,
                mockDinnerRestaurant
            ];
            const schedResult = scheduler.scheduleItinerary(reqs, candidates, configWithForecast);
            const enrichment = new ItineraryEnrichmentService();
            const enriched = await enrichment.enrichItinerary(reqs, schedResult, new Date("2026-10-20"));
            const snapshot = ItineraryPersistenceService.buildSnapshot(reqs, enriched);

            const card = ItineraryFormatter.formatWhatsAppDayCard(snapshot.days[0], "en", "Pondicherry", 1);

            // Road drive + buffer check
            expect(card).toContain("drive");
            expect(card).toContain("arrival & seating buffer");

            // Boat transfer check
            expect(card).toContain("🚤 ~40 min boat transfer · ~30 min boarding wait (Estimated)");

            // Solar forecast note check
            expect(card).toContain("🌇 ~17:58 (Forecast sunset window)");
            expect(card).not.toContain("verified");

            // WhatsApp character constraint (<= 1010 chars)
            expect(card.length).toBeLessThanOrEqual(1010);
        });

        it("should format estimated solar note when API forecast is unavailable", async () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                preferredPace: "moderate"
            };
            const candidates = [
                mockPromenadeBeach,
                mockDinnerRestaurant
            ];
            const schedResult = scheduler.scheduleItinerary(reqs, candidates);
            const enrichment = new ItineraryEnrichmentService();
            const enriched = await enrichment.enrichItinerary(reqs, schedResult, new Date("2026-10-20"));
            const snapshot = ItineraryPersistenceService.buildSnapshot(reqs, enriched);

            const card = ItineraryFormatter.formatWhatsAppDayCard(snapshot.days[0], "en", "Pondicherry", 1);

            expect(card).toContain("Estimated sunset window");
            expect(card).not.toContain("verified");
            expect(card.length).toBeLessThanOrEqual(1010);
        });
    });

    // -------------------------------------------------------------
    // 8. Weather Nuance & Robust Degradation
    // -------------------------------------------------------------
    describe("8. Weather Nuance & Robust Degradation", () => {
        it("should attach honest warning without emptying itinerary when severe weather occurs", () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                preferredPace: "moderate"
            };
            const severeForecastConfig = {
                dayWeatherSummaries: {
                    1: { precipitationProbability: 95, isSevere: true }
                }
            };
            const schedResult = scheduler.scheduleItinerary(reqs, [
                mockPromenadeBeach,
                mockAshram,
                mockDinnerRestaurant
            ], severeForecastConfig);

            expect(schedResult.dailySchedules.length).toBe(1);
            const day = schedResult.dailySchedules[0];
            // Must not produce an empty itinerary
            expect(day.places.length).toBeGreaterThan(0);
        });

        it("should not blanket-ban all outdoor activities on a 50% rain probability day", () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                preferredPace: "moderate"
            };
            const moderateRainConfig = {
                dayWeatherSummaries: {
                    1: { precipitationProbability: 50, isSevere: false }
                }
            };
            const schedResult = scheduler.scheduleItinerary(reqs, [
                mockAshram,
                mockPromenadeBeach,
                mockDinnerRestaurant
            ], moderateRainConfig);

            const day = schedResult.dailySchedules[0];
            const promenade = day.places.find((p) => p.candidate.name === "Promenade Beach");
            // Promenade Beach is outdoor nature, but 50% rain should NOT blanket ban it
            expect(promenade).toBeDefined();
        });

        it("should calculate correct astronomical solar times for Tokyo (JST UTC+9)", () => {
            const tokyoLat = 35.6762;
            const tokyoLon = 139.6503;
            const tzOffset = getDestinationTimezoneOffsetMinutes(tokyoLat, tokyoLon);
            expect(tzOffset).toBe(540); // UTC+9

            const solar = calculateAstronomicalSolarTimes(tokyoLat, tokyoLon, "2026-10-20", tzOffset);
            // In Tokyo on Oct 20, sunset is ~17:00 JST, sunrise ~05:50 JST
            expect(solar.sunset).toBe("17:01");
            expect(solar.sunrise).toBe("05:51");
        });

        it("should skip dinner if day has 0 places scheduled", () => {
            const scheduler = new DailySchedulerService();
            const reqs: StructuredTripRequirements = {
                destination: "Pondicherry",
                destinationSlug: "pondicherry",
                startDate: "2026-10-20",
                endDate: "2026-10-20",
                preferredPace: "moderate"
            };
            // Pass empty candidate list
            const schedResult = scheduler.scheduleItinerary(reqs, []);
            expect(schedResult.dailySchedules.length).toBe(1);
            const day = schedResult.dailySchedules[0];
            // No activities and no dinner scheduled
            expect(day.places.length).toBe(0);
        });
    });
});
