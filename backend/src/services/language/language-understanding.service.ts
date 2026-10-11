import { AiProviderManager } from "../ai/ai-provider-manager.js";
import { logger } from "../../utils/logger.js";
import { AIProvider } from "../../types/ai.types.js";

export type SupportedLanguage = "en" | "hi" | "mr";

export interface LanguageUnderstandingResult {
    language: SupportedLanguage;
    confidence: number;
    shouldPersist: boolean;
    isExplicitDirective: boolean;
    detectionSource: "interactive_action" | "fast_path_preserved" | "gemini_understanding" | "fallback_default";
}

export interface UnderstandLanguageParams {
    text?: string | null;
    userStoredLanguage?: SupportedLanguage;
    previousLanguage?: SupportedLanguage;
}

export const LANGUAGE_UNDERSTANDING_SYSTEM_PROMPT = `You are a language classifier for a WhatsApp travel assistant.

The application supports exactly three languages:
en = English
hi = Hindi
mr = Marathi

Classify the user's intended communication language.

Hindi may be written in Devanagari script (हिन्दी) or Romanized Hinglish (e.g. "mujhe 3 din ghumna hai").
Marathi may be written in Devanagari script (मराठी) or Romanized Marathi/Maranglish (e.g. "mala 2 divasanchi sahal karaychi aahe", "punyat 2 divas sahal").

CRITICAL RULES:
1. Output language MUST be strictly one of: "en", "hi", "mr".
2. If the user explicitly asks to switch language or speak in a language (e.g., "talk in Marathi", "हिंदी में बताओ", "switch to english", "marathi madhe sanga"), identify that language, set isExplicitDirective=true, and set shouldPersist=true.
3. If the user writes a substantive sentence/query in Hindi or Marathi, set shouldPersist=true.
4. If the user writes a substantive sentence/query in English, set language="en" and shouldPersist=true.
5. If the message is ambiguous or proper nouns only without linguistic markers (e.g., "Shaniwar Wada", "Pondicherry"), return the user's current language with shouldPersist=false.
6. Return strict JSON only matching the schema below. Do NOT output markdown code fences or explanatory text.

OUTPUT SCHEMA:
{
  "language": "en" | "hi" | "mr",
  "confidence": 0.95,
  "shouldPersist": true,
  "isExplicitDirective": false
}`;
const FAST_PATH_NEUTRAL_GREETINGS = new Set([
    "hi",
    "hello",
    "hey",
    "ok",
    "okay",
    "yes",
    "no",
    "thanks",
    "thank you",
    "thx",
    "bye",
    "good morning",
    "good evening",
    "good night",
    "namaste",
    "namaskar"
]);
export class LanguageUnderstandingService {
    static defaultAiProvider = new AiProviderManager();
    /**
     * Primary language understanding engine powered by Gemini / AiProviderManager.
     *
     * Fast paths intercept empty strings, numeric replies, and short greetings without LLM calls.
     * Natural language messages are classified via Gemini structured JSON.
     */
    static async understandLanguage(params: UnderstandLanguageParams, customProvider?: AIProvider) {
        const userStoredLanguage = params.userStoredLanguage || "en";
        const raw = (params.text || "").trim();
        // 1. Fast Path: Empty / Whitespace
        if (!raw) {
            return {
                language: userStoredLanguage,
                confidence: 1.0,
                shouldPersist: false,
                isExplicitDirective: false,
                detectionSource: "fast_path_preserved"
            };
        }
        // 2. Fast Path: Numeric selections (e.g., "1", "2", "5", "10")
        if (/^\d+[.)]?$/.test(raw)) {
            return {
                language: userStoredLanguage,
                confidence: 1.0,
                shouldPersist: false,
                isExplicitDirective: false,
                detectionSource: "fast_path_preserved"
            };
        }
        // 3. Fast Path: Short neutral greetings & acknowledgements
        const normalizedGreeting = raw.toLowerCase().replace(/[^\w\s]/g, "").trim();
        if (FAST_PATH_NEUTRAL_GREETINGS.has(normalizedGreeting)) {
            return {
                language: userStoredLanguage,
                confidence: 0.9,
                shouldPersist: false,
                isExplicitDirective: false,
                detectionSource: "fast_path_preserved"
            };
        }
        // 4. Natural-Language Understanding via Gemini (AiProviderManager)
        // Offline / unit-test fallback guard: avoid external network calls during automated test suites
        if (process.env.NODE_ENV === "test" && !process.env.ENABLE_TEST_LIVE_AI && !customProvider) {
            return {
                language: userStoredLanguage,
                confidence: 1.0,
                shouldPersist: false,
                isExplicitDirective: false,
                detectionSource: "fallback_default"
            };
        }
        const provider = customProvider || this.defaultAiProvider;
        try {
            const userMessage = `Current Stored User Language: "${userStoredLanguage}"\nUser Message: "${raw}"`;
            const response = await provider.generateResponse({
                systemPrompt: LANGUAGE_UNDERSTANDING_SYSTEM_PROMPT,
                messages: [{ role: "user", content: userMessage }],
                temperature: 0.0
            });
            const parsed = this.parseAndValidateResponse(response.text, userStoredLanguage);
            if (parsed) {
                logger.debug({
                    detectedLanguage: parsed.language,
                    confidence: parsed.confidence,
                    shouldPersist: parsed.shouldPersist,
                    isExplicitDirective: parsed.isExplicitDirective,
                    textSnippet: raw.slice(0, 50)
                }, "Gemini language understanding completed successfully");
                return parsed;
            }
            logger.warn({ rawResponse: response.text, userStoredLanguage }, "Gemini returned invalid language classification schema; falling back to stored language");
        }
        catch (err) {
            logger.warn({ err: err instanceof Error ? err.message : err, userStoredLanguage }, "Failed calling Gemini for language understanding; safely falling back to stored language");
        }
        // 5. Defensive Fallback: Preserve user's stored language on any error or invalid response
        return {
            language: userStoredLanguage,
            confidence: 1.0,
            shouldPersist: false,
            isExplicitDirective: false,
            detectionSource: "fallback_default"
        };
    }
    /**
     * Validates Gemini structured output against SupportedLanguage rules.
     */
    static parseAndValidateResponse(rawText: any, fallbackLang: any) {
        try {
            if (!rawText || rawText.trim() === "")
                return null;
            const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
            const parsed = JSON.parse(cleaned);
            if (!parsed || typeof parsed !== "object")
                return null;
            const lang = String(parsed.language || "").trim().toLowerCase();
            if (lang !== "en" && lang !== "hi" && lang !== "mr") {
                return null;
            }
            const confidence = typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
                ? Math.max(0, Math.min(1, parsed.confidence))
                : 0.95;
            const shouldPersist = Boolean(parsed.shouldPersist);
            const isExplicitDirective = Boolean(parsed.isExplicitDirective);
            return {
                language: lang,
                confidence,
                shouldPersist,
                isExplicitDirective,
                detectionSource: "gemini_understanding"
            };
        }
        catch {
            return null;
        }
    }
}
