import { ModificationIntentSchema } from "./modification-intent.types.js";
import { logger } from "../../utils/logger.js";
import { AIProvider } from "../../types/ai.types.js";
import { PersistedItinerarySnapshot } from "./itinerary-persistence.types.js";

export const ITINERARY_MODIFICATION_EXTRACTION_PROMPT = `You are a travel itinerary modification extraction engine.
Analyze the user's message in the context of their current itinerary to extract a structured modification intent.

CRITICAL RULES:
1. ONLY extract information EXPLICITLY stated or unambiguously implied by the user.
2. NEVER guess or invent missing values.
3. If the user asks a general question or makes unrelated conversation, set action to "none".
4. If the user's request is ambiguous or underspecified (e.g. "change it", "change day 2" without details, "replace that place"), set action to "clarification_needed", requiresClarification to true, and provide a polite clarificationPrompt.
5. If the user mentions modifying a specific day (e.g. "change day 2", "make day 2 relaxed"), set scope to "day_level" and targetDayNumber accordingly. If modifying the whole trip, set scope to "trip_level".
6. If the user says "make it cheaper" without providing a specific number, set adjustments.makeCheaper to true (do NOT fabricate a numeric maxBudget).
7. If the user asks to replace or remove a place, extract targetPlaceName as stated by the user. Do NOT invent a place ID.
8. Output ONLY raw JSON matching the schema below. No markdown fences, no conversational text.

JSON SCHEMA:
{
  "action": "none" | "adjust_budget" | "adjust_pace" | "adjust_walking" | "adjust_interests" | "adjust_travelers" | "adjust_dates" | "replace_place" | "remove_place" | "add_place" | "modify_day" | "clarification_needed",
  "scope": "trip_level" | "day_level",
  "targetDayNumber": number | null,
  "targetPlaceName": string | null,
  "replacementCategory": string | null,
  "requiresClarification": boolean,
  "clarificationPrompt": string | null,
  "adjustments": {
    "budgetCategory": "budget" | "moderate" | "luxury" | null,
    "maxBudget": number | null,
    "makeCheaper": boolean | null,
    "preferredPace": "relaxed" | "moderate" | "fast_paced" | null,
    "walkingTolerance": "minimal" | "moderate" | "high" | null,
    "addedInterests": string[],
    "removedInterests": string[],
    "travelType": "solo" | "couple" | "family" | "friends" | null,
    "travelers": {
      "total": number,
      "adults": number | null,
      "children": number | null,
      "seniors": number | null
    } | null,
    "durationDays": number | null,
    "startDate": string | null,
    "endDate": string | null,
    "specialRequests": string[]
  },
  "rawUserRationale": string | null
}`;
export class ItineraryModificationExtractor {
    aiProvider;
    constructor(aiProvider: AIProvider) {
        this.aiProvider = aiProvider;
    }
    /**
     * Extracts a structured ModificationIntent from user message and existing itinerary context.
     * Enforces strict JSON/schema validation with bounded retry.
     * Never uses regex reconstruction for authoritative fields.
     */
    async extractIntent(currentMessage: string, existingSnapshot: PersistedItinerarySnapshot | null, history = []) {
        // Summarize current itinerary for LLM context
        let contextSummary = "";
        if (existingSnapshot) {
            contextSummary = `\n\n[CURRENT ITINERARY CONTEXT]:
Destination: ${existingSnapshot.generationMetadata.destination}
Days Count: ${existingSnapshot.days.length}
Days Overview:
${existingSnapshot.days
                .map((d) => `Day ${d.dayNumber} (${d.date || "unspecified"}): ${d.places.map((p) => p.name).join(", ")}`)
                .join("\n")}
`;
        }
        const messages = [
            ...history,
            { role: "user", content: `${contextSummary}\nUser modification request: "${currentMessage}"` }
        ];
        // Bounded execution: attempt 1 -> optional 1 bounded retry
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const response = await this.aiProvider.generateResponse({
                    messages,
                    systemPrompt: ITINERARY_MODIFICATION_EXTRACTION_PROMPT,
                    temperature: 0.1 // Low temperature for deterministic structure extraction
                });
                const rawText = response.text.trim();
                // Remove code block markers if present
                const cleanedText = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
                const parsedJson = JSON.parse(cleanedText);
                // Strict Zod validation
                const validated = ModificationIntentSchema.parse(parsedJson);
                logger.debug({ action: validated.action, scope: validated.scope, attempt }, "Itinerary modification intent extracted successfully");
                return validated;
            }
            catch (err) {
                logger.warn({ attempt, err: err instanceof Error ? err.message : String(err) }, "Failed to parse structured modification intent from LLM output");
                if (attempt === 2) {
                    // If bounded retry also failed, return safe clarification/error intent without guessing
                    return {
                        action: "clarification_needed",
                        scope: "trip_level",
                        requiresClarification: true,
                        clarificationPrompt: "I couldn't quite understand how you'd like to modify the itinerary. Could you please specify what changes you'd like (for example: make it more relaxed, visit more museums, or change a specific day)?",
                        adjustments: {
                            addedInterests: [],
                            removedInterests: [],
                            specialRequests: []
                        }
                    };
                }
            }
        }
        // Default safe fallback
        return {
            action: "none",
            scope: "trip_level",
            requiresClarification: false,
            adjustments: { addedInterests: [], removedInterests: [], specialRequests: [] }
        };
    }
}
