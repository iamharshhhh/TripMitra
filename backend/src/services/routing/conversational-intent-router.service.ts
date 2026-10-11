import { parseTravelDate } from "../../utils/date-parser.js";
import { IntentAnalysisParams } from "./intent-routing.types.js";

export class ConversationalIntentRouter {
    /**
     * Classifies incoming message into intent category with context awareness.
     */
    static classifyIntent(params: IntentAnalysisParams) {
        const { userMessage, activeMenuContext, pausedMenuContext, activeTrip } = params;
        const trimmed = userMessage.trim();
        const lower = trimmed.toLowerCase();
        // 1. SYSTEM COMMAND PRIORITY (Highest Deterministic Priority)
        if (lower === "main menu" ||
            lower === "home" ||
            lower === "मुख्य मेनू" ||
            lower === "मेनू" ||
            lower === "menu") {
            return {
                intent: "SYSTEM_COMMAND",
                confidence: 1.0,
                isTopicSwitch: false,
                systemActionType: "HOME"
            };
        }
        if (lower === "back" ||
            lower === "मागे" ||
            lower === "पीछे" ||
            lower === "वापस") {
            return {
                intent: "SYSTEM_COMMAND",
                confidence: 1.0,
                isTopicSwitch: false,
                systemActionType: "BACK"
            };
        }
        if (lower === "cancel" ||
            lower === "cancel trip" ||
            lower === "रद्द करा" ||
            lower === "रद्द करें" ||
            lower === "सहल रद्द करा") {
            return {
                intent: "SYSTEM_COMMAND",
                confidence: 1.0,
                isTopicSwitch: false,
                systemActionType: "TRIP_CANCEL_PROMPT"
            };
        }
        if (lower === "help" ||
            lower === "मदत" ||
            lower === "सहायता") {
            return {
                intent: "SYSTEM_COMMAND",
                confidence: 1.0,
                isTopicSwitch: false,
                systemActionType: "HELP"
            };
        }
        if (lower === "my trip" ||
            lower === "active trip" ||
            lower === "show my active trip" ||
            lower === "show active trip" ||
            lower === "माझी सहल" ||
            lower === "मेरी ट्रिप") {
            return {
                intent: "SYSTEM_COMMAND",
                confidence: 1.0,
                isTopicSwitch: false,
                systemActionType: "MY_TRIP"
            };
        }
        // 2. WIZARD RESUMPTION COMMANDS (Supports EN, HI, MR, Hinglish, Minglish)
        const isResumePhrase = /\b(resume|continue|back to trip|continue planning|resume planning|continue my trip)\b/i.test(lower) ||
            /(पुन्हा ट्रिप|माझी सहल सुरू|सहल सुरू|पुणे सहल पुढे|ट्रिप प्लानिंग जारी|मेरी ट्रिप जारी|ट्रिप फिर से शुरू)/u.test(trimmed);
        if (isResumePhrase && (pausedMenuContext || activeMenuContext)) {
            return {
                intent: "RESUME_WIZARD",
                confidence: 1.0,
                isTopicSwitch: false
            };
        }

        // 3. ACTIVE WIZARD EXPECTATION CHECK (If user is currently in a multi-step setup)
        if (activeMenuContext &&
            activeMenuContext.menuType &&
            activeMenuContext.menuType.startsWith("wizard_") &&
            activeMenuContext.expiresAt &&
            new Date(activeMenuContext.expiresAt) > new Date()) {
            const menuType = activeMenuContext.menuType;
            if (menuType === "wizard_travel_date" || menuType === "wizard_custom_date") {
                const dateResult = parseTravelDate(trimmed);
                if (dateResult.success && dateResult.isoDate) {
                    return {
                        intent: "WIZARD_STEP_ANSWER",
                        confidence: 0.95,
                        isTopicSwitch: false
                    };
                }
            }
            else if (menuType === "wizard_destination") {
                const isNav = /\b(directions|how to reach|how do i get|how i travel|how to travel|travel to|how do i travel|route to)\b/i.test(lower);
                const isWeath = /\b(weather|forecast|rain|temperature)\b/i.test(lower);
                const isPlaces = /\b(places|attractions|visit|restaurants|food|hotels)\b/i.test(lower);
                if (trimmed.length >= 2 && !isNav && !isWeath && !isPlaces) {
                    return {
                        intent: "WIZARD_STEP_ANSWER",
                        confidence: 0.9,
                        extractedCity: trimmed,
                        isTopicSwitch: false
                    };
                }
            }
            else if (menuType === "wizard_duration" ||
                menuType === "wizard_custom_days" ||
                menuType === "wizard_travelers" ||
                menuType === "wizard_custom_travelers" ||
                menuType === "wizard_budget" ||
                menuType === "wizard_custom_budget" ||
                menuType === "wizard_interests") {
                if (/^\d+$/.test(trimmed) || trimmed.length > 0) {
                    return {
                        intent: "WIZARD_STEP_ANSWER",
                        confidence: 0.9,
                        isTopicSwitch: false
                    };
                }
            }
        }

        // 4. TRIP MODIFICATION INTENT (Checked early for active itineraries)
        if (activeTrip && activeTrip.itinerarySnapshot && this.isItineraryModificationDirectives(lower)) {
            return {
                intent: "TRIP_MODIFICATION",
                confidence: 0.95,
                isTopicSwitch: false
            };
        }

        // 5. NAVIGATION / TRAVEL ROUTE INTENT (High precedence before general planning / discovery)
        const isNavigation = /\b(directions|how to reach|how do i get|how i travel|how to travel|travel to|how do i travel|route to|way to|kasa jaycha|kaise jaye)\b/i.test(lower) ||
            /(दिशा|मार्ग|कैसे जाएं|कसे जावे|कसे जाऊ)/u.test(trimmed);
        if (isNavigation) {
            return {
                intent: "TRAVEL_ROUTE_GUIDANCE",
                confidence: 0.90,
                isTopicSwitch: Boolean(activeMenuContext)
            };
        }

        // 6. WEATHER INTENT
        const isWeather = /\b(weather|forecast|rain|temperature|climate|raining|hawaaman|mausam|paus|barish)\b/i.test(lower) ||
            /(हवामान|मौसम|पाऊस|बारिश)/u.test(trimmed);
        if (isWeather) {
            const extractedCity = this.extractCityFromText(trimmed);
            return {
                intent: "WEATHER",
                confidence: 0.9,
                extractedCity,
                isTopicSwitch: Boolean(activeMenuContext)
            };
        }

        const isNearMe = /\b(near me|nearby|around here|around me|close to me|walking distance|what is nearby|paas me|aas paas|माझ्या जवळ|इथे जवळ|यहाँ पास|आसपास)\b/i.test(lower);

        // 7. RESTAURANTS / FOOD INTENT
        const isFood = /\b(restaurant|restaurants|food|cafe|cafes|eat|dining|breakfast|lunch|dinner|misal|dosa|thali|khana|jewan)\b/i.test(lower) ||
            /(रेस्टॉरंट|खाद्य|जेवण|खाना|कैफे)/u.test(trimmed);
        if (isFood) {
            const extractedCity = this.extractCityFromText(trimmed);
            if (isNearMe && !extractedCity) {
                return {
                    intent: "GPS_LOCATION_SEARCH",
                    confidence: 0.90,
                    category: "food",
                    isTopicSwitch: Boolean(activeMenuContext)
                };
            }
            return {
                intent: "RESTAURANTS_FOOD",
                confidence: 0.90,
                extractedCity,
                category: "food",
                isTopicSwitch: Boolean(activeMenuContext)
            };
        }

        // 8. HOTELS / STAYS INTENT
        const isHotel = /\b(hotel|hotels|stay|stays|resort|resorts|homestay|lodging|room|rooms)\b/i.test(lower) ||
            /(हॉटेल|होटल|रहने|ठहरने)/u.test(trimmed);
        if (isHotel) {
            const extractedCity = this.extractCityFromText(trimmed);
            if (isNearMe && !extractedCity) {
                return {
                    intent: "GPS_LOCATION_SEARCH",
                    confidence: 0.90,
                    category: "hotels",
                    isTopicSwitch: Boolean(activeMenuContext)
                };
            }
            return {
                intent: "HOTELS_STAYS",
                confidence: 0.90,
                extractedCity,
                category: "hotels",
                isTopicSwitch: Boolean(activeMenuContext)
            };
        }

        // 9. PLACES / ATTRACTIONS INTENT
        const isPlaces = /\b(places|attractions|visit|sightseeing|spots|monuments|fort|temple|beach|firayla|ghoomne)\b/i.test(lower) ||
            /(ठिकाणे|स्थल|दर्शनीय|घूमने|पाहण्यासारखी)/u.test(trimmed);
        if (isPlaces) {
            const extractedCity = this.extractCityFromText(trimmed);
            if (isNearMe && !extractedCity) {
                return {
                    intent: "GPS_LOCATION_SEARCH",
                    confidence: 0.90,
                    category: "attractions",
                    isTopicSwitch: Boolean(activeMenuContext)
                };
            }
            return {
                intent: "PLACES_ATTRACTIONS",
                confidence: 0.90,
                extractedCity,
                category: "attractions",
                isTopicSwitch: Boolean(activeMenuContext)
            };
        }

        // 10. EXPLICIT NAMED LOCATION / NEARBY SEARCH
        const isExplicitNearPhrase = /\b(near|around|in|at|ke paas|jawal|paas)\b/i.test(lower) ||
            /(जवळ|पास|में)/u.test(trimmed);

        if (isExplicitNearPhrase || isNearMe) {
            const extractedCity = this.extractCityFromText(trimmed);
            if (extractedCity) {
                return {
                    intent: "NAMED_LOCATION_SEARCH",
                    confidence: 0.90,
                    extractedCity,
                    category: "attractions",
                    isTopicSwitch: Boolean(activeMenuContext)
                };
            } else if (isNearMe) {
                return {
                    intent: "GPS_LOCATION_SEARCH",
                    confidence: 0.85,
                    category: "attractions",
                    isTopicSwitch: Boolean(activeMenuContext)
                };
            }
        }

        // 11. EXPLICIT TRIP PLANNING DIRECTIVES
        const isExplicitNewTrip = /\b(plan\b.*?\btrip|create\b.*?\bitinerary|visiting .* for \d+ days|traveling to .* on|start new trip|new trip)\b/i.test(lower) ||
            /(नवीन सहल|सहल नियोजित|नई ट्रिप|ट्रिप प्लान)/u.test(trimmed);
        if (isExplicitNewTrip) {
            const extractedCity = this.extractCityFromText(trimmed);
            return {
                intent: "TRIP_PLANNING",
                confidence: 0.95,
                extractedCity,
                isTopicSwitch: Boolean(activeMenuContext || pausedMenuContext)
            };
        }

        // 9. AMBIGUOUS STANDALONE DATE (Without active date prompt)
        const standaloneDateResult = parseTravelDate(trimmed);
        const isStandaloneDateWord = /\b(tomorrow|today|this weekend|next weekend|udya|kya|कल|आज)\b/i.test(lower);
        if (standaloneDateResult.success && isStandaloneDateWord && (!activeMenuContext || activeMenuContext.menuType !== "wizard_travel_date")) {
            return {
                intent: "AMBIGUOUS_DATE_CLARIFICATION",
                confidence: 0.8,
                isTopicSwitch: false
            };
        }

        // 10. GENERAL TRAVEL CHAT (Safe Deterministic Fallback)
        return {
            intent: "GENERAL_TRAVEL_CHAT",
            confidence: 0.7,
            isTopicSwitch: Boolean(activeMenuContext)
        };
    }

    /**
     * Helper to identify itinerary modification directives vs general recommendations.
     */
    static isItineraryModificationDirectives(lower: any) {
        return /\b(make day \d+|remove|add .* to day \d+|swap day|cheaper|change .*itinerary|change itinerary|change day \d+|day \d+ cheaper)\b/i.test(lower) ||
            /(बदला|काढा|कमी करा)/u.test(lower);
    }

    /**
     * Extracts city or locality name from text query (e.g. "near Swargate", "Katraj ke paas", "Katraj jawal", "in Pune", "weather in Goa").
     */
    static extractCityFromText(text: any) {
        const ignore = [
            "today",
            "tomorrow",
            "weekend",
            "food",
            "hotel",
            "hotels",
            "places",
            "attraction",
            "attractions",
            "restaurant",
            "restaurants",
            "weather",
            "lunch",
            "dinner",
            "me",
            "here",
            "around",
            "nearby",
            "near",
            "find",
            "suggest",
            "show",
            "give",
            "some",
            "good",
            "best"
        ];
        // 1. Check English prepositional match: "near Katraj", "in Pune", "around Swargate"
        // eslint-disable-next-line no-misleading-character-class
        const prepMatch = text.match(/\b(?:in|near|at|to|for|of|around)\s+([A-Za-z\u0900-\u097F]{3,20})\b/iu);
        if (prepMatch && prepMatch[1]) {
            const city = prepMatch[1].trim();
            if (!ignore.includes(city.toLowerCase())) {
                return city.charAt(0).toUpperCase() + city.slice(1);
            }
        }
        // 2. Check Hinglish/Minglish postpositional match: "Katraj ke paas", "Katraj jawal", "Swargate paas", "Pune mein"
        // eslint-disable-next-line no-misleading-character-class
        const postMatch = text.match(/\b([A-Za-z\u0900-\u097F]{3,20})\s+(?:ke\s+paas|jawal|paas|mai|mein|chya)\b/iu);
        if (postMatch && postMatch[1]) {
            const city = postMatch[1].trim();
            if (!ignore.includes(city.toLowerCase())) {
                return city.charAt(0).toUpperCase() + city.slice(1);
            }
        }
        // 3. Fallback check for known localities / cities in text
        const knownPlaces = [
            "katraj", "swargate", "fcroad", "kothrud", "hinjewadi", "wakad", "vimannagar", "deccan",
            "pune", "mumbai", "goa", "jaipur", "delhi", "bengaluru", "chennai", "hyderabad", "kolkata",
            "pondicherry", "manali", "shimla", "udaipur", "agra", "varanasi", "ooty", "munnar"
        ];
        const lower = text.toLowerCase();
        for (const kp of knownPlaces) {
            if (new RegExp(`\\b${kp}\\b`, "i").test(lower)) {
                return kp.charAt(0).toUpperCase() + kp.slice(1);
            }
        }
        return undefined;
    }
}
