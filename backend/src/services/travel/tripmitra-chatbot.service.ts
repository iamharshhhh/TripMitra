import { TravelAgent } from "../../agents/travelAgent.js";
import { MULTILINGUAL_UI_STRINGS } from "../whatsapp-ui/whatsapp-ui.strings.js";
import { SupportedLanguage } from "../language/language-detector.service.js";
import { AIMessage } from "../../types/ai.types.js";
import { logger } from "../../utils/logger.js";

export interface ChatbotQueryOptions {
    userMessage: string;
    conversationId: string;
    userId: string;
    activeLanguage: SupportedLanguage;
    history?: AIMessage[];
}

export class TripMitraChatbotService {
    public static travelAgent = new TravelAgent();

    /**
     * Checks if the message is clearly non-travel and out-of-scope (e.g., programming, math, sports scores, politics).
     */
    static isOutOfScopeQuery(userMessage: string): boolean {
        const lower = userMessage.toLowerCase().trim();

        // 1. Explicit coding / programming / tech queries
        const isCoding = /\b(python|javascript|typescript|java|c\+\+|code|function|script|algorithm|write a program|debug|html|css|sql|git)\b/i.test(lower);
        
        // 2. Math / arithmetic calculations
        const isMath = new RegExp("\\d+\\s*[+*/-]\\s*\\d+", "i").test(lower) || /\b(solve|equation|algebra|calculus|square root|calculate)\b/i.test(lower);

        // 3. General non-travel trivia, sports, politics, news
        const isNonTravelTrivia = /\b(ipl|cricket|football|match score|election|president|prime minister|movie|actor|bitcoin|stock market)\b/i.test(lower);

        return isCoding || isMath || isNonTravelTrivia;
    }

    /**
     * Checks if the query is a product capability inquiry.
     */
    static isProductCapabilityQuery(userMessage: string): boolean {
        const lower = userMessage.toLowerCase().trim();
        return /\b(what can (you|tripmitra)|how to use|features|capabilities|help me with|supported languages|language support|what languages|how does tripmitra work)\b/i.test(lower) ||
            /(ट्रिपमित्रा|वैशिष्ट्ये|भाषा|मदत|सुविधा)/u.test(userMessage);
    }

    /**
     * Orchestrates domain-scoped chatbot processing.
     */
    static async handleChatbotQuery(options: ChatbotQueryOptions): Promise<string> {
        const { userMessage, activeLanguage, history = [] } = options;
        const strings = MULTILINGUAL_UI_STRINGS[activeLanguage] || MULTILINGUAL_UI_STRINGS.en;

        // 1. Domain Boundary Check: Out-of-scope non-travel queries
        if (this.isOutOfScopeQuery(userMessage)) {
            logger.info({ userMessage, language: activeLanguage }, "TripMitraChatbotService: Out-of-scope query rejected");
            return strings.menuHeaders.chatbotRefusal;
        }

        // 2. Product Capability Inquiry Check
        if (this.isProductCapabilityQuery(userMessage)) {
            logger.info({ userMessage, language: activeLanguage }, "TripMitraChatbotService: Product capability response served");
            return strings.menuHeaders.chatbotWelcome;
        }

        // 3. Grounded Travel AI Processing via TravelAgent
        try {
            const systemPrompt = `You are TripMitra, a knowledgeable, friendly, and helpful personal tourist and travel expert.

Your role & capabilities:
- Answer travel, place, destination, tourism, route, transportation, sightseeing, hotel, food, cafe, and cultural questions naturally and accurately (e.g. Pune → Pondicherry routes, local attractions, weather, budgets).
- Mirror the user's language (${activeLanguage === "mr" ? "Marathi" : activeLanguage === "hi" ? "Hindi" : "English"}).
- Structure answers cleanly for WhatsApp with friendly tone, bullet points (•), and helpful emojis. Use single asterisks (*Text*) for bold headings/keys and avoid raw markdown hashes (###) or divider lines (---).
- Do NOT fabricate hotel tariffs, prices, opening hours, or live schedules.
- Do NOT promise artificial rankings like "top 5" unless substantiated by real place search data.
- Only mention verified places returned by real-time place tools.
- If the user's message includes [Visual Context: ...], computer vision has already analyzed their uploaded image. Use the visual context to answer their question directly. NEVER state, claim, or imply that you cannot view, see, or analyze photos.`;

            const reply = await this.travelAgent.generateReply({
                currentMessage: userMessage,
                history,
                systemPrompt,
                conversationId: options.conversationId,
                userId: options.userId
            });

            return reply;
        } catch (err) {
            logger.error({ err: err instanceof Error ? err.message : err }, "TripMitraChatbotService LLM generation failed");
            throw err;
        }
    }
}
