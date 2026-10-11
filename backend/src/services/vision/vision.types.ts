import { z } from "zod";
import { CandidatePlace } from "../../types/candidate-place.types.js";
import { PlaceNavigationResult } from "../navigation/navigation.types.js";
import { RetrievedChunk } from "../../rag/retrieval.service.js";
import { SupportedLanguage } from "../language/language-detector.service.js";

export type LandmarkVisionResponse = z.infer<typeof LandmarkVisionResponseSchema>;

export type VisualObservation = z.infer<typeof VisualObservationSchema>;

export type SignboardObservation = z.infer<typeof SignboardObservationSchema>;

export type MenuObservation = z.infer<typeof MenuObservationSchema>;

export type DocumentExtraction = z.infer<typeof DocumentExtractionSchema>;

export type Phase10MultimodalVisionResponse = z.infer<typeof Phase10MultimodalVisionResponseSchema>;

export type LandmarkResolutionStatus = "verified_authoritative" | "unverified_candidate" | "unmatched_unknown";

export type SpatialProximityContext = "nearby" | "moderate_distance" | "far" | "none";

export interface LandmarkResolutionResult {
    resolutionStatus: LandmarkResolutionStatus;
    visionResponse: Phase10MultimodalVisionResponse;
    language: SupportedLanguage;
    verifiedPlace?: CandidatePlace;
    spatialContext?: SpatialProximityContext;
    distanceMeters?: number;
    distanceEstimationSource?: "geographic_estimate";
    navigation?: PlaceNavigationResult;
    ragChunks?: RetrievedChunk[];
    formattedMessage: string;
    sanitizedSpatialContext: string;
}

/**
 * Strict Zod Schema for Gemini Vision Model Output.
 *
 * CRITICAL AUTHORITY BOUNDARY:
 * "Vision confidence is model-reported uncertainty only. It never establishes authoritative landmark identity."
 */
export const LandmarkVisionResponseSchema = z.object({
    identificationStatus: z.enum(["identified", "probable", "ambiguous", "unknown"]),
    candidateName: z.string().nullable(),
    candidateCategory: z.enum([
        "heritage",
        "nature",
        "religious",
        "monument",
        "museum",
        "market",
        "viewpoint",
        "architecture",
        "other"
    ]).nullable(),
    confidence: z.enum(["high", "medium", "low", "unknown"]),
    confidenceScore: z.number().min(0).max(1),
    visualClues: z.array(z.string()).max(5),
    reasoningSummary: z.string().max(400),
    ambiguityNotes: z.string().nullable()
});
/**
 * Phase 10 Visual Observation Schema (Qualitative visual evidence).
 * CRITICAL INVARIANT: Visual evidence ("looks indoor") remains VISUAL_OBSERVATION / UNVERIFIED.
 * It NEVER satisfies authoritative venue metadata or VERIFIED_INDOOR weather constraints.
 */
export const VisualObservationSchema = z.object({
    environment: z.enum(["indoor", "outdoor", "unverified"]).default("unverified"),
    stairsVisible: z.boolean().default(false),
    elevatorSignVisible: z.boolean().default(false),
    entranceVisible: z.boolean().default(false),
    exitVisible: z.boolean().default(false),
    transportSignageVisible: z.boolean().default(false),
    apparentCrowdDensity: z.enum(["low", "moderate", "high", "unknown"]).default("unknown"),
    visibleAccessibilityFeatures: z.array(z.string()).default([]),
    landmarkType: z.string().nullable().default(null)
});
/**
 * Phase 10 Signboard Text Extraction Schema.
 * Visual signboard text is OBSERVATIONAL ONLY.
 * It does NOT establish live authoritative opening status or official timings.
 */
export const SignboardObservationSchema = z.object({
    extractedText: z.string().nullable().default(null),
    languageDetected: z.string().nullable().default(null),
    category: z.enum(["entrance", "timing", "platform", "rules", "general"]).default("general"),
    observationalOnly: z.boolean().default(true)
});
/**
 * Phase 10 Menu & Food Analysis Schema.
 * Health & allergen claims are cautious. No medical conditions are inferred.
 */
export const MenuObservationSchema = z.object({
    foodItems: z.array(z.string()).default([]),
    vegetarianItems: z.array(z.string()).default([]),
    dairyItems: z.array(z.string()).default([]),
    uncertainAllergens: z.array(z.string()).default([]),
    allergenDisclaimer: z.string().default("Visual menu analysis is advisory. Please verify allergens with venue staff.")
});
/**
 * Phase 10 Travel Document Extraction Schema.
 * INFORMATIONAL ONLY. TransactionGuard remains authoritative. Zero booking/cancellation execution.
 */
export const DocumentExtractionSchema = z.object({
    documentType: z.enum([
        "boarding_pass",
        "train_ticket",
        "bus_ticket",
        "hotel_confirmation",
        "attraction_ticket",
        "itinerary_screenshot",
        "travel_schedule",
        "other_document"
    ]),
    travelerName: z.string().nullable().default(null),
    origin: z.string().nullable().default(null),
    destination: z.string().nullable().default(null),
    date: z.string().nullable().default(null),
    departureTime: z.string().nullable().default(null),
    arrivalTime: z.string().nullable().default(null),
    operator: z.string().nullable().default(null),
    serviceNumber: z.string().nullable().default(null),
    terminalPlatform: z.string().nullable().default(null),
    bookingReference: z.string().nullable().default(null),
    informationalOnly: z.boolean().default(true)
});
/**
 * Comprehensive Phase 10 Multimodal Vision Analysis Output.
 */
export const Phase10MultimodalVisionResponseSchema = LandmarkVisionResponseSchema.extend({
    analysisType: z.enum([
        "landmark",
        "place_identification",
        "signboard",
        "menu",
        "scene_context",
        "document",
        "multi_image_comparison"
    ]).optional().default("landmark"),
    visualObservation: VisualObservationSchema.optional(),
    signboardObservation: SignboardObservationSchema.optional(),
    menuObservation: MenuObservationSchema.optional(),
    documentExtraction: DocumentExtractionSchema.optional()
});
