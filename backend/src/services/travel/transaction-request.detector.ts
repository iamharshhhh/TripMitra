import { ActionIntent } from "./travel-information.types.js";

export class TransactionRequestDetector {
    /**
     * Informational exemptions: Queries asking HOW / WHERE / WHEN / RULES / CHARGES / PROCEDURES
     * must NEVER be flagged as explicit transaction execution requests.
     */
    static INFORMATIONAL_EXEMPTIONS = [
        // English Informational Patterns
        /\b(how\s+(can|do|to|should|would)\s+(i|we|one)?\s*(book|reserve|buy|purchase|cancel|get|pay))\b/i,
        /\b(how\s+to\s+(book|reserve|buy|purchase|cancel|modify|get))\b/i,
        /\b(where\s+(can|do|to|should)\s+(i|we|one)?\s*(book|reserve|buy|purchase|cancel|get))\b/i,
        /\b(where\s+to\s+(book|reserve|buy|purchase|cancel))\b/i,
        /\b(can\s+(i|we|one)?\s*(book|reserve|buy|purchase|cancel)(?:\s+[\w\s]{1,30})?\s+(online|in\s+advance|at\s+station|at\s+counter|offline))\b/i,
        /\b(is\s+(online|advance)\s+booking\s+(available|required|mandatory|open|possible))\b/i,
        /\b(does\s+(this|it)\s+(need|require)\s+(advance|online)?\s*(booking|reservation))\b/i,
        /\b(which\s+(website|portal|app|link|site)\s+(should|can|to|do)\s+(i|we|one)?\s*(use|visit|go\s+to))\b/i,
        /\b(booking\s+(process|procedure|rules?|steps?|guide|guidelines?|timings?|hours?|window|charges?|fees?|cost|policy|portal|website|link|options?))\b/i,
        /\b(cancellation\s+(policy|charges?|rules?|fees?|refund|deduction|process|procedure))\b/i,
        /\b(refund\s+(rules?|policy|timeline|amount|process|charges?))\b/i,
        /\b(ticket\s+(price|fare|cost|rates?|charges?|types?|availability|timing|timings))\b/i,
        /\b(when\s+does\s+(booking|reservation|tatkal)\s+(open|start|close))\b/i,
        /\b(advance\s+reservation\s+(period|window|rules?))\b/i,
        /\b(tatkal\s+(timing|timings|rules?|charges?|quota))\b/i,
        /\b(what\s+is\s+the\s+(fare|price|cost|cancellation\s+charge|booking\s+charge|refund))\b/i,
        // Hindi & Hinglish Informational Patterns
        /\b(kaise\s+(book|reserve|khareed|cancel)\s*(kare|karein|hota|hoga|karte|karna\s+hai))\b/i,
        /\b(kaha\s+(se|par)?\s*(book|reserve|khareed|milega|milegi))\b/i,
        /\b(booking\s+(kaise|kaha|kab|ke\s+niyam|charges|process|procedure|timing))\b/i,
        /\b(ticket\s+(kaise\s+milega|kaise\s+book\s+kare|kitne\s+ka\s+hai|ka\s+kiraya|charges|price|cost))\b/i,
        /\b(cancellation\s+(charges|rules|niyam|refund|kaise\s+hoga))\b/i,
        /\b(refund\s+(kaise\s+milega|kitna\s+milega|ke\s+niyam))\b/i,
        /\b(online\s+booking\s+(hoti\s+hai|hoti\s+kya|hoti\s+hai\s+kya|chalu\s+hai|available\s+hai))\b/i,
        /\b(tatkal\s+(kab\s+khulta\s+hai|timing\s+kya\s+hai|ke\s+rules))\b/i,
        // Marathi & Minglish Informational Patterns
        /\b(kasa\s+(book|reserve)\s*(karaycha|karava|hou\s+shakto|karto))\b/i,
        /\b(kashi\s+(booking|reservation)\s*(karaychi|hote|karavi))\b/i,
        /\b(kuthe\s*(jaun|varun)?\s*(book|reserve)\s*(karayche|karava|milel))\b/i,
        /\b(kuthoon\s+(book|reserve)\s*(karayche|karava))\b/i,
        /\b(booking\s+(kashi\s+karaychi|kuthe\s+karaychi|che\s+niyam|charges|dar|process))\b/i,
        /\b(ticket\s+(kasa\s+kadhave|kase\s+kadhave|dar\s+kiti|charges|kiti\s+ahet|kuthe\s+milel))\b/i,
        /\b(cancellation\s+(charges\s+kiti|niyam|refund\s+kasa\s+milel))\b/i,
        /\b(refund\s+(kiti\s+milel|kasa\s+milel|che\s+niyam))\b/i,
        // Devanagari Hindi / Marathi Informational Patterns (Unicode safe matching)
        /(कुठून\s+.*(?:बुक\s+करावे|तिकीट|कसे)|कुठे\s+.*(?:बुक\s+करावे|तिकीट|कसे)|कसे\s+.*(?:बुक\s+करावे|तिकीट|कसे)|कशी\s+.*(?:बुकिंग|करावी)|कॅन्सलेशन\s+नियम|कॅन्सलेशन\s+चार्जेस|रिफंड\s+कसा\s+मिळेल|तिकीट\s+दर|बुकिंगचे\s+नियम|कसे\s+जावे|कसे\s+मिळेल)/u,
        /(कहाँ\s+से\s+.*(?:बुक\s+करें|मिलेगा|मिलेगी)|कैसे\s+.*(?:बुक\s+करें|मिलेगा|मिलेगी)|बुकिंग\s+के\s+नियम|कैंसिलेशन\s+चार्ज|रिफंड\s+कैसे\s+मिलेगा|टिकट\s+किराया|टिकट\s+का\s+दाम|ऑनलाइन\s+बुकिंग\s+कैसे\s+करें|तत्काल\s+कब\s+खुलता\s+है)/u
    ];
    /**
     * Positive Transaction Request Patterns in English, Hindi, Marathi, Hinglish, Minglish.
     * Specific domain patterns are evaluated first to accurately capture serviceCategory.
     */
    static TRANSACTION_PATTERNS = [
        // --- Specific Domain English Commands (Evaluated First) ---
        { pattern: /\b(?:book|reserve)\s+(?:a\s+|the\s+|an\s+|my\s+)?(?:\w+\s+)?(?:cab|taxi|uber|ola|ride)\b/i, service: "cab" },
        { pattern: /\b(?:book|reserve)\s+(?:a\s+|the\s+|an\s+|my\s+)?table(?:\s+at|\s+for|\s+in)?\b/i, service: "restaurant" },
        { pattern: /\b(?:book|reserve)\s+(?:me\s+)?(?:a\s+|the\s+|an\s+|my\s+)?(?:\w+\s+)?(?:hotel|room|suite|resort|homestay|cottage)\b/i, service: "hotel" },
        { pattern: /\b(?:book|reserve)\s+(?:a\s+|the\s+|an\s+|my\s+)?(?:\w+\s+)?(?:flight|air\s+ticket|plane\s+ticket)\b/i, service: "flight" },
        { pattern: /\b(?:book|reserve)\s+(?:a\s+|the\s+|an\s+|my\s+)?(?:\w+\s+)?(?:bus|sleeper|volvo|shivneri)\b/i, service: "bus" },
        { pattern: /\b(book\s+(?:the\s+)?(?:\d+\s+pm|\d+\s+am|\d+:\d+|\w+\s+express|vande\s+bharat|deccan\s+queen))\b/i, service: "train" },
        { pattern: /\b(?:book|reserve)\s+(?:the\s+|a\s+|my\s+)?(?:\w+\s+)?train(?:\s+ticket)?\b/i, service: "train" },
        { pattern: /\b(?:buy|book|reserve|purchase)\s+(?:\d+\s+)?(?:the\s+|a\s+)?(?:\w+\s+)?(?:tickets?|passes?)\s+for\s+(?:the\s+)?(?:monument|fort|palace|museum|temple|shaniwar|auroville|aga\s+khan|gateway)\b/i, service: "attraction" },
        // --- Cancellation Execution Requests ---
        { pattern: /\b(?:cancel|cancellation\s+of)\s+(?:the\s+|a\s+|an\s+|my\s+)?(?:\w+\s+)?(?:hotel|room|suite|resort|homestay)\s*(?:booking|reservation)?\b/i, service: "hotel" },
        { pattern: /\b(?:cancel|cancellation\s+of)\s+(?:the\s+|a\s+|an\s+|my\s+)?(?:\w+\s+)?(?:flight|air\s+ticket|plane\s+ticket)\s*(?:booking)?\b/i, service: "flight" },
        { pattern: /\b(?:cancel|cancellation\s+of)\s+(?:the\s+|a\s+|an\s+|my\s+)?(?:\w+\s+)?(?:train\s+ticket|train\s+booking|railway\s+ticket)\b/i, service: "train" },
        { pattern: /\b(?:cancel|cancellation\s+of)\s+(?:the\s+|a\s+|an\s+|my\s+)?(?:\w+\s+)?(?:bus\s+ticket|bus\s+booking)\b/i, service: "bus" },
        { pattern: /\b(?:cancel|cancellation\s+of)\s+(?:the\s+|a\s+|an\s+|my\s+)?(?:\w+\s+)?(?:cab|taxi|ride|uber|ola)\b/i, service: "cab" },
        { pattern: /\b(?:cancel|cancellation\s+of)\s+(?:the\s+|a\s+|an\s+|my\s+)?(?:booking|reservation|ticket|tickets|seat|seats)\b/i },
        // --- Direct English General Commands ---
        { pattern: /\b(?:book|reserve|buy|purchase|pay\s+for)\s+(?:\d+\s+)?(?:the\s+|a\s+|an\s+|my\s+)?(?:\w+\s+)?(?:train|bus|flight|plane|room|hotel|resort|table|cab|taxi|uber|ola|ticket|tickets|seat|seats|berth|pass|passes|it|this|that|one|new\s+one|#\d+|\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth)\b/i },
        { pattern: /\b(?:can\s+you\s+(?:please\s+)?(?:book|reserve|buy|purchase)\s+(?:\d+\s+)?(?:the\s+|a\s+|an\s+|my\s+)?(?:\w+\s+)?(?:train|bus|flight|plane|room|hotel|resort|table|cab|taxi|uber|ola|ticket|tickets|seat|seats|pass|passes|this|it|that|one|new\s+one))/i },
        { pattern: /\b(?:please\s+(?:book|reserve|buy|purchase|pay\s+for)\s+(?:\d+\s+)?(?:the\s+|a\s+|an\s+|my\s+)?(?:\w+\s+)?(?:train|bus|flight|plane|room|hotel|resort|table|cab|taxi|uber|ola|ticket|tickets|seat|seats|pass|passes|this|it|that|one|new\s+one|me))/i },
        { pattern: /\b(?:book|reserve)\s+(?:this|it|that|one|the\s+new\s+one|for\s+me|my\s+ticket|my\s+trip|my\s+seat)\b/i },
        { pattern: /\b(?:make\s+a\s+reservation\s+(?:for|at|in))\b/i },
        { pattern: /\b(?:confirm\s+and\s+book\s+(?:this|it|the\s+ticket|the\s+booking))\b/i },
        { pattern: /\b(?:buy|purchase)\s+(?:\d+\s+)?(?:tickets?|passes?|entry\s+tickets?|tour\s+passes?)\b/i },
        { pattern: /\b(?:pay\s+(?:for\s+)?(?:it|this|that|my\s+ticket|the\s+booking|the\s+fare|the\s+cab|the\s+hotel))\b/i },
        { pattern: /\b(?:reserve\s+(?:#\d+|\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth))\b/i },
        // --- Hinglish / Roman Hindi Commands ---
        { pattern: /\btable\s*(?:reserve|book)\s*(?:kar\s*do|kardo|karo|kijiye|kar\s*dijiye)\b/i, service: "restaurant" },
        { pattern: /\b(?:room|hotel)\s*(?:book|reserve)\s*(?:kar\s*do|kardo|karo|kijiye|kar\s*dijiye)\b/i, service: "hotel" },
        { pattern: /\b(?:hotel|room)\s*(?:booking\s*)?(?:cancel|radd)\s*(?:kar\s*do|kardo|karo|kijiye|kar\s*dijiye|karwa\s*do)\b/i, service: "hotel" },
        { pattern: /\btrain\s*(?:ticket\s*)?(?:book|reserve)\s*(?:kar\s*do|kardo|karo|kijiye)\b/i, service: "train" },
        { pattern: /\bflight\s*(?:ticket\s*)?(?:book|reserve)\s*(?:kar\s*do|kardo|karo|kijiye)\b/i, service: "flight" },
        { pattern: /\bbus\s*(?:ticket\s*)?(?:book|reserve)\s*(?:kar\s*do|kardo|karo|kijiye)\b/i, service: "bus" },
        { pattern: /\b(?:cab|gaadi)\s*(?:book|reserve)\s*(?:kar\s*do|kardo|karo|kijiye)\b/i, service: "cab" },
        { pattern: /\b(?:train|bus|flight|room|hotel|table|ticket|seat|cab|gaadi)?\s*(?:ticket\s+)?(?:book|reserve|buy)\s*(?:kar\s*do|kardo|karo|kijiye|kar\s*dijiye|kar\s*de|karwa\s*do)\b/i },
        { pattern: /\bbooking\s*(?:kar\s*do|kardo|karo|kijiye|kar\s*dijiye|karwa\s*do|kar\s*de)\b/i },
        { pattern: /\b(?:booking|ticket)\s*(?:cancel|radd)\s*(?:kar\s*do|kardo|karo|kijiye|kar\s*dijiye|karwa\s*do)\b/i },
        { pattern: /\b(?:payment\s*(?:kar\s*do|kardo|karo|kijiye)|paise\s*(?:bhar\s*do|katwa\s*do|de\s*do|bhardo))\b/i },
        { pattern: /\b(?:pehla|dusra|teesra|chautha)\s+wala\s+book\s+kar\s*(?:do|dijiye|kardo)\b/i },
        { pattern: /\bmere\s+liye\s+(?:ticket|seat|hotel|room|train|bus|flight|cab)\s+book\s+kar\s*(?:do|dijiye|kardo)\b/i },
        // --- Minglish / Roman Marathi Commands ---
        { pattern: /\btable\s*book\s*(?:karun\s*de|karun\s*dya|kara)\b/i, service: "restaurant" },
        { pattern: /\b(?:room|hotel)\s*book\s*(?:karun\s*de|karun\s*dya|kara)\b/i, service: "hotel" },
        { pattern: /\b(?:hotel|room)\s*(?:booking\s*)?(?:cancel|radda)\s*(?:karun\s*de|karun\s*dya|kara|kar)\b/i, service: "hotel" },
        { pattern: /\b(?:train|bus|flight|room|hotel|table|ticket|seat|cab)?\s*(?:ticket\s+)?(?:book|reserve)\s*(?:karun\s*de|karun\s*dya|kara|kar)\b/i },
        { pattern: /\bbooking\s*(?:karun\s*de|karun\s*dya|kara|kar)\b/i },
        { pattern: /\b(?:booking|ticket)\s*(?:cancel|radda)\s*(?:karun\s*de|karun\s*dya|kara|kar)\b/i },
        { pattern: /\bpaise\s*(?:bhara|de|patva|bharun\s*taak)\b/i },
        { pattern: /\bticket\s*kadhun\s*(?:de|dya)\b/i },
        { pattern: /\b(?:pahila|dusra|tisra)\s*book\s*kara\b/i },
        { pattern: /\bmajhyasathi\s+(?:ticket|seat|room)\s+book\s+kara\b/i },
        // --- Devanagari Hindi Commands (Unicode safe matching) ---
        { pattern: /(टेबल\s*(?:बुक|रिज़र्व)\s*(?:कर\s*दो|करो|कीजिए))/u, service: "restaurant" },
        { pattern: /(कमरा\s*बुक\s*कर\s*दो|होटल\s*बुक\s*(?:कर\s*दो|करो)|रूम\s*बुक\s*कर\s*दो)/u, service: "hotel" },
        { pattern: /(होटल\s*(?:बुकिंग\s*)?(?:रद्द|कैंसल)\s*(?:कर\s*दो|करो|कीजिए)|कमरा\s*(?:रद्द|कैंसल)\s*कर\s*दो)/u, service: "hotel" },
        { pattern: /(ट्रेन\s*(?:टिकट\s*)?बुक\s*(?:कर\s*दो|करो)|गाड़ी\s*बुक\s*कर\s*दो|रेलवे\s*टिकट\s*बुक\s*कर\s*दो)/u, service: "train" },
        { pattern: /(फ्लाइट\s*(?:टिकट\s*)?बुक\s*(?:कर\s*दो|करो)|हवाई\s*टिकट\s*बुक\s*कर\s*दो|विमान\s*टिकट\s*बुक\s*करो)/u, service: "flight" },
        { pattern: /(बस\s*(?:टिकट\s*)?बुक\s*(?:कर\s*दो|करो))/u, service: "bus" },
        { pattern: /(कैब\s*बुक\s*कर\s*दो|टैक्सी\s*बुक\s*कर\s*दो)/u, service: "cab" },
        { pattern: /(टिकट\s*बुक\s*(?:कर\s*दो|करो|कीजिए|कर\s*दें)|बुकिंग\s*(?:कर\s*दो|करो|कीजिए)|मेरे\s*लिए\s*बुक\s*कर\s*दो|सीट\s*(?:बुक|रिज़र्व)\s*कर\s*दो)/u },
        { pattern: /(टिकट\s*(?:रद्द|कैंसल)\s*(?:कर\s*दो|करो|कीजिए)|बुकिंग\s*(?:रद्द|कैंसल)\s*कर\s*दो)/u },
        { pattern: /(पैसे\s*दे\s*दो|भुगतान\s*कर\s*दो|पेमेंट\s*कर\s*दो)/u },
        { pattern: /(पहला\s*वाला\s*बुक\s*कर\s*दो|दूसरा\s*वाला\s*बुक\s*कर\s*दो|तीसरा\s*वाला\s*बुक\s*कर\s*दो)/u },
        // --- Devanagari Marathi Commands (Unicode safe matching) ---
        { pattern: /(टेबल\s*बुक\s*(?:करा|करून\s*द्या)|टेबल\s*रिझर्व्ह\s*करा)/u, service: "restaurant" },
        { pattern: /(हॉटेल\s*बुक\s*करा|रूम\s*बुक\s*करा|खोली\s*बुक\s*करा)/u, service: "hotel" },
        { pattern: /(हॉटेल\s*(?:बुकिंग\s*)?(?:रद्द\s*करा|कॅन्सल\s*करा)|रूम\s*(?:रद्द\s*करा|कॅन्सल\s*करा))/u, service: "hotel" },
        { pattern: /(रेल्वे\s*(?:तिकीट\s*)?बुक\s*करा|गाडीचे\s*तिकीट\s*काढा|ट्रेन\s*(?:तिकीट\s*)?बुक\s*करा)/u, service: "train" },
        { pattern: /(विमान\s*(?:तिकीट\s*)?बुक\s*करा|फ्लाइट\s*(?:तिकीट\s*)?बुक\s*करा)/u, service: "flight" },
        { pattern: /(एसटी\s*(?:तिकीट\s*)?बुक\s*करा|बस\s*(?:तिकीट\s*)?बुक\s*करा|बस\s*तिकीट\s*काढून\s*द्या)/u, service: "bus" },
        { pattern: /(कॅब\s*बुक\s*करा|टॅक्सी\s*बुक\s*करा|रिक्षा\s*बुक\s*करा)/u, service: "cab" },
        { pattern: /(तिकीट\s*बुक\s*(?:करून\s*दे|करून\s*द्या|करा)|तिकीट\s*काढून\s*द्या|बुकिंग\s*(?:करा|करून\s*द्या)|माझ्यासाठी\s*बुक\s*करा|सीट\s*बुक\s*करा)/u },
        { pattern: /(तिकीट\s*(?:रद्द\s*करा|कॅन्सल\s*करा)|बुकिंग\s*(?:रद्द\s*करा|कॅन्सल\s*करा))/u },
        { pattern: /(पैसे\s*भरा|पेमेंट\s*करा)/u },
        { pattern: /(पहिलं\s*बुक\s*करा|दुसरं\s*बुक\s*करा|तिसरं\s*बुक\s*करा|पहिला\s*बुक\s*करा)/u }
    ];
    /**
     * Service Keyword Detection for granular categorization
     */
    static SERVICE_KEYWORDS = {
        cab: [/\b(cab|taxi|uber|ola|auto|rickshaw|driver)\b/i, /(कॅब|टॅक्सी|रिक्षा|गाडी)/u],
        attraction: [/\b(monument|museum|fort|palace|temple|attraction|entry\s+ticket|pass|sightseeing|asi|shaniwar|auroville|aga\s+khan|gateway)\b/i, /(किल्ला|महाल|स्मारक|मंदिर|संग्रहालय|दर्शन|प्रवेश)/u],
        restaurant: [/\b(restaurant|cafe|table|dinner|lunch|breakfast|dining|reservation)\b/i, /(टेबल|रेस्टॉरंट|जेवण|खाद्य)/u],
        hotel: [/\b(hotel|room|resort|stay|homestay|lodge|hostel|accommodation|check-in)\b/i, /(हॉटेल|कमरा|रूम|मुक्काम|निवास|खोली)/u],
        train: [/\b(train|railway|irctc|vande\s+bharat|express|sleeper|3ac|2ac|1ac|coach|berth)\b/i, /(ट्रेन|रेल्वे|रेल|गाडी)/u],
        bus: [/\b(bus|msrtc|shivneri|ksrtc|redbus|sleeper\s+bus|volvo)\b/i, /(बस|एसटी)/u],
        flight: [/\b(flight|plane|airline|indigo|air\s+india|spicejet|airport|boarding\s+pass)\b/i, /(फ्लाइट|विमान|हवाई)/u],
        metro: [/\b(metro|pune\s+metro|mumbai\s+metro|maha\s+metro|mmrcl)\b/i, /(मेट्रो)/u],
        general: []
    };
    /**
     * Deterministically evaluates whether the user's message is an explicit transaction execution request.
     */
    static detect(text: string) {
        const rawText = text || "";
        const cleanText = rawText.trim();
        if (!cleanText) {
            return {
                isTransactionRequest: false,
                actionIntent: ActionIntent.NONE,
                rawText
            };
        }
        // 1. Check for informational exemptions first
        for (const exemptionPattern of this.INFORMATIONAL_EXEMPTIONS) {
            if (exemptionPattern.test(cleanText)) {
                return {
                    isTransactionRequest: false,
                    actionIntent: ActionIntent.NONE,
                    rawText
                };
            }
        }
        // 2. Check for positive transaction patterns
        let matchedPattern;
        let detectedService;
        for (const { pattern, service } of this.TRANSACTION_PATTERNS) {
            if (pattern.test(cleanText)) {
                matchedPattern = pattern.source;
                detectedService = service;
                break;
            }
        }
        if (!matchedPattern) {
            return {
                isTransactionRequest: false,
                actionIntent: ActionIntent.NONE,
                rawText
            };
        }
        // 3. Resolve service category if not directly mapped from transaction pattern
        if (!detectedService || detectedService === "general") {
            detectedService = this.resolveServiceCategory(cleanText);
        }
        // 4. Extract target ordinal if present
        const ordinal = this.extractOrdinal(cleanText);
        // 5. Extract party size / count if present
        const partySize = this.extractPartySize(cleanText);
        return {
            isTransactionRequest: true,
            actionIntent: ActionIntent.TRANSACTION_REQUEST,
            serviceType: detectedService,
            matchedPattern,
            targetOrdinal: ordinal ?? undefined,
            partySize: partySize ?? undefined,
            rawText
        };
    }
    static resolveServiceCategory(text: any) {
        const categories = [
            "cab",
            "attraction",
            "restaurant",
            "hotel",
            "train",
            "bus",
            "flight"
        ];
        for (const category of categories) {
            const patterns = this.SERVICE_KEYWORDS[category];
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    return category;
                }
            }
        }
        return "general";
    }
    static extractOrdinal(text: any) {
        // Check #1, #2, etc.
        const hashMatch = text.match(/#(\d+)/);
        if (hashMatch && hashMatch[1]) {
            const num = parseInt(hashMatch[1], 10);
            if (num >= 1 && num <= 10)
                return num;
        }
        const match = text.match(/\b(1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|pehla|pahila|dusra|tisra|chautha|pachva)\b|(पहला|पहिला|दूसरा|दुसरा|तीसरा|तिसरा|चौथा|पांचवां|पाचवा|पहिलं|दुसरं|तिसरं)/i);
        if (!match)
            return null;
        const val = (match[1] || match[2] || "").toLowerCase();
        if (/^(1st|first|pehla|pahila|पहला|पहिला|पहिलं)$/i.test(val))
            return 1;
        if (/^(2nd|second|dusra|दूसरा|दुसरा|दुसरं)$/i.test(val))
            return 2;
        if (/^(3rd|third|tisra|तीसरा|तिसरा|तिसरं)$/i.test(val))
            return 3;
        if (/^(4th|fourth|chautha|चौथा)$/i.test(val))
            return 4;
        if (/^(5th|fifth|pachva|पांचवां|पाचवा)$/i.test(val))
            return 5;
        return null;
    }
    static extractPartySize(text: any) {
        const match = text.match(/\b(\d+)\s*(?:tickets?|passes?|people|persons?|guests?|members?|seats?|log|vyakti|jan)\b|(\d+)\s*(?:तिकीट|पास|लोग|व्यक्ती|माणसे)/i);
        const countStr = match ? match[1] || match[2] : null;
        if (countStr) {
            const parsed = parseInt(countStr, 10);
            if (Number.isFinite(parsed) && parsed > 0 && parsed <= 50) {
                return parsed;
            }
        }
        const forMatch = text.match(/\bfor\s+(\d+)\b/i);
        if (forMatch && forMatch[1]) {
            const parsed = parseInt(forMatch[1], 10);
            if (Number.isFinite(parsed) && parsed > 0 && parsed <= 50) {
                return parsed;
            }
        }
        return null;
    }
}
