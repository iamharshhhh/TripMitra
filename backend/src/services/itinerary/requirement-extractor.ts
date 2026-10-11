import { PartialTripRequirementsSchema, normalizeDestinationSlug } from "../../types/trip-requirements.types.js";
import { logger } from "../../utils/logger.js";
import { MULTILINGUAL_REQUIREMENT_EXTRACTION_INSTRUCTION } from "../language/multilingual-prompts.js";
import { AIProvider } from "../../types/ai.types.js";

export const REQUIREMENT_EXTRACTION_SYSTEM_PROMPT = `You are a travel requirement extraction engine.
Analyze the user's conversation to extract structured travel parameters.

CRITICAL EXTRACTION RULES:
1. ONLY extract information EXPLICITLY stated or unambiguously implied by the user.
2. NEVER guess or invent missing values. If the user does not mention a field, leave it null or omit it entirely.
3. If the user does not state a destination, do NOT assume Pune or any other city.
4. If the user does not state the number of travelers, leave travelers null.
5. If the user does not state budget, leave budget null.
6. If the user states a duration (e.g. "for 3 days", "weekend trip"), extract durationDays as an integer (e.g. 3, or 2 for weekend).
7. If the user specifies dates (e.g. "from 2026-10-10 to 2026-10-12"), format them as YYYY-MM-DD.
8. Map travelType to one of: "solo", "couple", "family", "friends" ONLY if mentioned.
9. Map walkingTolerance to "minimal", "moderate", or "high" ONLY if walking preferences are stated.
10. Return valid JSON adhering strictly to the schema below. Do NOT output any conversational text or explanation.
${MULTILINGUAL_REQUIREMENT_EXTRACTION_INSTRUCTION}
JSON SCHEMA:
{
  "hasTripIntent": boolean,
  "destination": string | null,
  "durationDays": number | null,
  "startDate": string | null,
  "endDate": string | null,
  "travelType": "solo" | "couple" | "family" | "friends" | null,
  "travelersCount": number | null,
  "adultsCount": number | null,
  "childrenCount": number | null,
  "seniorsCount": number | null,
  "budgetCategory": "budget" | "moderate" | "luxury" | null,
  "budgetMaxAmount": number | null,
  "walkingTolerance": "minimal" | "moderate" | "high" | null,
  "interests": string[],
  "foodPreferences": string[],
  "accessibilityRequirements": string[],
  "preferredPace": "relaxed" | "moderate" | "fast_paced" | null,
  "accommodationArea": string | null,
  "specialRequests": string[]
}`;
export class RequirementExtractor {
    aiProvider;
    constructor(aiProvider: AIProvider) {
        this.aiProvider = aiProvider;
    }
    /**
     * Extracts structured travel requirements from a user message and conversation history.
     */
    async extractRequirements(currentMessage: string, history = []) {
        const startTime = Date.now();
        const messages = [
            ...history,
            {
                role: "user",
                content: `Extract structured travel requirements from this latest user message in context:\n"${currentMessage}"`
            }
        ];
        try {
            const response = await this.aiProvider.generateResponse({
                messages,
                systemPrompt: REQUIREMENT_EXTRACTION_SYSTEM_PROMPT,
                temperature: 0.1 // Low temperature for deterministic extraction
            });
            const rawText = response.text.trim();
            const extractedJson = this.parseJsonFromText(rawText);
            if (!extractedJson || typeof extractedJson !== "object") {
                logger.debug({ durationMs: Date.now() - startTime }, "No structured JSON found in extraction response");
                return { hasTripIntent: false, requirements: {} };
            }
            const hasTripIntent = Boolean(extractedJson.hasTripIntent);
            // Build structured candidate
            const raw = extractedJson;
            const candidate: any = {};
            const provenance: any = {};
            if (raw.destination && typeof raw.destination === "string" && raw.destination.trim() !== "") {
                candidate.destination = raw.destination.trim();
                candidate.destinationSlug = normalizeDestinationSlug(raw.destination);
                provenance.destination = "user";
                provenance.destinationSlug = "user";
            }
            if (typeof raw.durationDays === "number" && raw.durationDays > 0) {
                candidate.durationDays = raw.durationDays;
                provenance.durationDays = "user";
            }
            if (typeof raw.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.startDate)) {
                candidate.startDate = raw.startDate;
                provenance.startDate = "user";
            }
            if (typeof raw.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.endDate)) {
                candidate.endDate = raw.endDate;
                provenance.endDate = "user";
            }
            if (typeof raw.travelType === "string" && ["solo", "couple", "family", "friends"].includes(raw.travelType)) {
                candidate.travelType = raw.travelType;
                provenance.travelType = "user";
            }
            if (typeof raw.travelersCount === "number" && raw.travelersCount >= 1) {
                candidate.travelers = {
                    total: raw.travelersCount,
                    adults: typeof raw.adultsCount === "number" ? raw.adultsCount : undefined,
                    children: typeof raw.childrenCount === "number" ? raw.childrenCount : undefined,
                    seniors: typeof raw.seniorsCount === "number" ? raw.seniorsCount : undefined
                };
                provenance.travelers = "user";
            }
            if (typeof raw.budgetCategory === "string" &&
                ["budget", "moderate", "luxury"].includes(raw.budgetCategory)) {
                candidate.budget = {
                    category: raw.budgetCategory,
                    maxTotalAmount: typeof raw.budgetMaxAmount === "number" ? raw.budgetMaxAmount : undefined,
                    currency: "INR"
                };
                provenance.budget = "user";
            }
            if (typeof raw.walkingTolerance === "string" &&
                ["minimal", "moderate", "high"].includes(raw.walkingTolerance)) {
                candidate.walkingTolerance = raw.walkingTolerance;
                provenance.walkingTolerance = "user";
            }
            if (typeof raw.preferredPace === "string" &&
                ["relaxed", "moderate", "fast_paced"].includes(raw.preferredPace)) {
                candidate.preferredPace = raw.preferredPace;
                provenance.preferredPace = "user";
            }
            if (typeof raw.accommodationArea === "string" && raw.accommodationArea.trim() !== "") {
                candidate.accommodationArea = raw.accommodationArea.trim();
                provenance.accommodationArea = "user";
            }
            if (Array.isArray(raw.interests) && raw.interests.length > 0) {
                candidate.interests = raw.interests.map((s) => String(s).trim()).filter(Boolean);
                provenance.interests = "user";
            }
            if (Array.isArray(raw.foodPreferences) && raw.foodPreferences.length > 0) {
                candidate.foodPreferences = raw.foodPreferences.map((s) => String(s).trim()).filter(Boolean);
                provenance.foodPreferences = "user";
            }
            if (Array.isArray(raw.accessibilityRequirements) && raw.accessibilityRequirements.length > 0) {
                candidate.accessibilityRequirements = raw.accessibilityRequirements
                    .map((s) => String(s).trim())
                    .filter(Boolean);
                provenance.accessibilityRequirements = "user";
            }
            if (Array.isArray(raw.specialRequests) && raw.specialRequests.length > 0) {
                candidate.specialRequests = raw.specialRequests.map((s) => String(s).trim()).filter(Boolean);
                provenance.specialRequests = "user";
            }
            if (Object.keys(provenance).length > 0) {
                candidate.provenance = provenance;
            }
            // Validate with Zod partial schema
            const parseResult = PartialTripRequirementsSchema.safeParse(candidate);
            const validated = parseResult.success ? parseResult.data : {};
            const hasExtractedFields = Object.keys(validated).filter((k) => k !== "provenance").length > 0;
            logger.debug({
                hasTripIntent,
                fieldsExtracted: Object.keys(validated),
                durationMs: Date.now() - startTime
            }, "Requirement extraction completed");
            return {
                hasTripIntent: Boolean(hasTripIntent && hasExtractedFields),
                requirements: hasExtractedFields ? validated : {}
            };
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.warn({ err: errorMsg }, "Failed to extract requirements; returning empty requirements");
            return { hasTripIntent: false, requirements: {} };
        }
    }
    /**
     * Safely extracts JSON from an LLM response text that might contain markdown fences.
     */
    parseJsonFromText(text: any) {
        try {
            // 1. Check for markdown code blocks ```json ... ```
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            const cleaned = jsonMatch ? jsonMatch[1] : text;
            return JSON.parse(cleaned.trim());
        }
        catch {
            try {
                // 2. Direct parse attempt
                return JSON.parse(text);
            }
            catch {
                return null;
            }
        }
    }
}
