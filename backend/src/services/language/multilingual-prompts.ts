import { SupportedLanguage } from "./language-detector.service.js";
export function getMultilingualAgentInstructions(language: SupportedLanguage) {
    switch (language) {
        case "hi":
            return `
[LANGUAGE INSTRUCTION - HINDI / हिंदी]
- You MUST converse with the user in natural, warm, culturally nuanced Hindi (Devanagari script: हिन्दी).
- Address the user politely using respectful forms (जैसे 'आप', 'बताइए', 'सादर').
- When suggesting travel tips, use authentic Indian travel vocabulary (जैसे 'सफर', 'दर्शन', 'विश्राम', 'प्रस्थान').
- Place names may be mentioned in commonly recognized Hindi/English forms, but ALL tool arguments and internal IDs MUST remain canonical English.
- Do NOT translate tool parameters, schema field names, or coordinates.
`;
        case "mr":
            return `
[LANGUAGE INSTRUCTION - MARATHI / मराठी]
- You MUST converse with the user in natural, polite, culturally authentic Marathi (Devanagari script: मराठी).
- Address the user respectfully (उदा. 'तुम्ही', 'सांगावे', 'नक्कीच').
- When suggesting travel tips, use warm Maharashtrian cultural context (उदा. 'सहल', 'दर्शन', 'भ्रमण', 'सुखकर प्रवास').
- Place names may be mentioned in commonly recognized Marathi/English forms, but ALL tool arguments and internal IDs MUST remain canonical English.
- Do NOT translate tool parameters, schema field names, or coordinates.
`;
        case "en":
        default:
            return `
[LANGUAGE INSTRUCTION - ENGLISH]
- Converse with the user in fluent, engaging English.
- Keep tone helpful, warm, and concise for WhatsApp.
`;
    }
}
/**
 * Prompt snippet for the Requirement Extractor to ensure that regardless of the input language,
 * the extracted JSON fields (destination, preferences, pace, etc.) remain canonical English.
 */
export const MULTILINGUAL_REQUIREMENT_EXTRACTION_INSTRUCTION = `
CROSS-LINGUAL EXTRACTION REQUIREMENT:
- The user's input may be in Marathi, Hindi, English, Hinglish, or Maranglish.
- Regardless of the user's input language, you MUST emit all extracted values, enums, place names, and notes in CANONICAL ENGLISH.
- Translate intent into English concepts (e.g., "कमी चालायचे" -> pace: "relaxed", "शाकाहारी जेवण" -> "vegetarian food", "२ दिवस" -> durationDays: 2).
- Never output Marathi or Hindi Devanagari inside the JSON values.
`;
