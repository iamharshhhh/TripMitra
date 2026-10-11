/**
 * LanguageDetectorService (Refactored to delegate to Gemini-based LanguageUnderstandingService)
 *
 * Provides canonical type definitions and backward compatibility bindings.
 */
import { LanguageUnderstandingService } from "./language-understanding.service.js";
import { type LanguageUnderstandingResult, type SupportedLanguage, type UnderstandLanguageParams } from "./language-understanding.service.js";

export type { SupportedLanguage, LanguageUnderstandingResult, UnderstandLanguageParams };
export type LanguageDetectionResult = LanguageUnderstandingResult;

export { LanguageUnderstandingService };
export class LanguageDetectorService {
    /**
     * Async primary language detector powered by Gemini.
     */
    static async detectLanguageAsync(text: string | undefined | null, userStoredLanguage = "en") {
        return LanguageUnderstandingService.understandLanguage({
            text,
            userStoredLanguage: userStoredLanguage as SupportedLanguage
        });
    }
    /**
     * Fast synchronous fallback for purely synchronous callers.
     * Preserves user's stored language on empty strings, numbers, or neutral greetings.
     */
    static detectLanguage(text: string | undefined | null, userStoredLanguage = "en") {
        const raw = (text || "").trim();
        if (!raw || /^\d+[.)]?$/.test(raw)) {
            return {
                language: userStoredLanguage,
                confidence: 1.0,
                shouldPersist: false,
                isExplicitDirective: false,
                detectionSource: "fast_path_preserved"
            };
        }
        // Default to stored language safely
        return {
            language: userStoredLanguage,
            confidence: 1.0,
            shouldPersist: false,
            isExplicitDirective: false,
            detectionSource: "fallback_default"
        };
    }
}
