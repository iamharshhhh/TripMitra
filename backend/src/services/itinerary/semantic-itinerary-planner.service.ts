import { AiProviderManager } from "../ai/ai-provider-manager.js";
import { logger } from "../../utils/logger.js";
import { CandidatePlace } from "../../types/candidate-place.types.js";
import { StructuredTripRequirements, PartialTripRequirements } from "../../types/trip-requirements.types.js";
import { AIProvider } from "../../types/ai.types.js";

export interface SemanticPlannerCandidateMetadata {
    placeId: string;
    name: string;
    category?: string;
    isIconicLandmark?: boolean;
    rating?: number;
    openingHours?: string | string[];
    indoor?: boolean;
    timeOfDaySuitability?: "morning" | "afternoon" | "sunset_evening" | "any";
}

export class SemanticItineraryPlannerService {
    aiProvider;
    isDefaultProvider;
    constructor(aiProvider?: AIProvider) {
        this.aiProvider = aiProvider ?? new AiProviderManager();
        this.isDefaultProvider = !aiProvider;
    }
    /**
     * Generates a semantic day and slot activity plan using AIProviderManager (Gemini with fallback).
     * Returns null if AI is unavailable, times out, or fails validation (triggering deterministic fallback).
     */
    async planDailyActivities(requirements: StructuredTripRequirements | PartialTripRequirements, candidates: CandidatePlace[], dayWeatherSummaries: Record<number, {
        precipitationProbability?: number;
        isSevere?: boolean;
    }>) {
        const destination = requirements.destination || "Destination";
        const durationDays = requirements.durationDays || 1;
        const pace = requirements.preferredPace || "moderate";
        const interests = requirements.interests && requirements.interests.length > 0
            ? requirements.interests.join(", ")
            : "Famous Places & Top Landmarks";
        if (!candidates || candidates.length === 0) {
            return null;
        }
        if (this.isDefaultProvider && process.env.NODE_ENV === "test" && !process.env.ENABLE_TEST_LIVE_AI) {
            logger.debug("Skipping live AI calls in test environment; falling back to deterministic scheduling");
            return null;
        }
        // Candidate metadata whitelist: strictly from input candidates
        const validCandidateIds = new Set(candidates.map((c) => c.placeId));
        const candidateSummary = candidates.map((c) => ({
            placeId: c.placeId,
            name: c.name,
            category: c.category || "attraction",
            isIconicLandmark: Boolean(c.isIconicLandmark),
            rating: c.rating || 4.0,
            openingHours: c.openingHours || undefined,
            indoor: c.indoor,
            timeOfDaySuitability: c.timeOfDaySuitability || "any"
        }));
        const weatherInfo = dayWeatherSummaries
            ? Object.entries(dayWeatherSummaries)
                .map(([d, w]) => `Day ${d}: Rain probability ${w.precipitationProbability ?? 0}%${w.isSevere ? " (Severe)" : ""}`)
                .join("; ")
            : "No severe weather forecast";
        const systemPrompt = `You are an expert travel planner assisting a traveler on WhatsApp.
Your task is to select and assign REAL candidate places into morning, afternoon, and evening periods for each day of the trip.

CRITICAL CONSTRAINTS:
1. You MUST ONLY select placeIds from the provided CANDIDATE LIST below.
2. NEVER invent, hallucinate, or alter any placeId, place name, or attraction.
3. Every candidate place can be scheduled at most ONCE across the entire trip (no duplicates).
4. Respect natural time-of-day suitability:
   - Morning: temples, spiritual sites, ashrams, forts, morning walks, heritage monuments.
   - Afternoon: museums, art galleries, palaces, indoor shopping, covered attractions.
   - Evening: beaches, coastal promenades, waterfronts, lake viewpoints, sunset viewing locations.
5. Consider weather: if high rain (>= 50%) is forecast on a day, prioritize indoor venues and avoid outdoor beaches.
6. Time-based daily exploration density:
   - EVERY requested day MUST contain meaningful destination exploration across morning, afternoon, and evening.
   - Do NOT leave any day empty or with only 1 place when eligible candidates exist.
   - 2 substantial venues (e.g. major forts, national parks, 3h each) can reasonably fill a day.
   - For standard or shorter venues (45-90 min), schedule 3-4 (or up to 5 for fast pace) attractions across morning, afternoon, and evening.
7. Distribute places meaningfully across all ${durationDays} days so EVERY day is populated with genuine sightseeing.
8. Output MUST be valid, raw JSON matching the exact schema below. Do NOT include markdown code blocks or explanatory text outside the JSON.`;
        const userMessage = `Destination: ${destination}
Duration: ${durationDays} days
Travel Style: ${pace}
Interests: ${interests}
Weather Forecast: ${weatherInfo}

CANDIDATE LIST:
${JSON.stringify(candidateSummary, null, 2)}

OUTPUT SCHEMA:
{
  "days": [
    {
      "day": 1,
      "activities": [
        {
          "candidateId": "<placeId from CANDIDATE LIST>",
          "period": "morning",
          "reason": "<brief rationale>"
        },
        {
          "candidateId": "<placeId from CANDIDATE LIST>",
          "period": "afternoon",
          "reason": "<brief rationale>"
        },
        {
          "candidateId": "<placeId from CANDIDATE LIST>",
          "period": "evening",
          "reason": "<brief rationale>"
        }
      ]
    }
  ]
}`;
        try {
            logger.info({ destination, durationDays }, "SemanticItineraryPlannerService requesting AI plan");
            // Timeout guard of 12000ms to prevent WhatsApp webhook latency degradation
            let timerHandle;
            const timeoutPromise = new Promise((_, reject) => {
                timerHandle = setTimeout(() => reject(new Error("Semantic itinerary planning timed out")), 12000);
            });
            const aiPromise = this.aiProvider.generateResponse({
                messages: [{ role: "user", content: userMessage }],
                systemPrompt,
                temperature: 0.2
            });
            let response = null;
            try {
                response = await Promise.race([aiPromise, timeoutPromise]);
            }
            finally {
                if (timerHandle) {
                    clearTimeout(timerHandle);
                }
            }
            if (!response || !response.text) {
                logger.warn("AI returned empty response for semantic planning; using deterministic fallback");
                return null;
            }
            // Parse JSON
            let rawText = response.text.trim();
            if (rawText.startsWith("```")) {
                rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
            }
            let parsed;
            try {
                parsed = JSON.parse(rawText);
            }
            catch (parseErr) {
                logger.warn({ rawText, err: parseErr }, "Failed to parse AI semantic plan JSON; using deterministic fallback");
                return null;
            }
            if (!parsed || !Array.isArray(parsed.days) || parsed.days.length === 0) {
                logger.warn("AI returned invalid days structure; using deterministic fallback");
                return null;
            }
            const scheduledInPlan = new Set();
            const validatedDays = [];
            for (const d of parsed.days) {
                const dayNum = typeof d.day === "number" ? d.day : validatedDays.length + 1;
                const validActivities = [];
                if (Array.isArray(d.activities)) {
                    for (const act of d.activities) {
                        if (act &&
                            typeof act.candidateId === "string" &&
                            validCandidateIds.has(act.candidateId) &&
                            !scheduledInPlan.has(act.candidateId)) {
                            const period = act.period === "morning" || act.period === "afternoon" || act.period === "evening"
                                ? act.period
                                : "afternoon";
                            validActivities.push({
                                candidateId: act.candidateId,
                                period,
                                reason: act.reason
                            });
                            scheduledInPlan.add(act.candidateId);
                        }
                    }
                }
                validatedDays.push({
                    day: dayNum,
                    activities: validActivities
                });
            }
            const totalActivities = validatedDays.reduce((sum, d) => sum + d.activities.length, 0);
            if (totalActivities === 0) {
                logger.warn("AI semantic plan contained zero valid matching candidate IDs; using deterministic fallback");
                return null;
            }
            logger.info({
                provider: response.provider,
                model: response.model,
                daysPlanned: validatedDays.length,
                totalActivities
            }, "SemanticItineraryPlannerService successfully generated plan");
            return {
                days: validatedDays,
                source: response.provider.includes("gemini") ? "gemini" : "fallback_ai"
            };
        }
        catch (err) {
            logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Semantic itinerary planning encountered an error; falling back to deterministic scheduler");
            return null;
        }
    }
}
