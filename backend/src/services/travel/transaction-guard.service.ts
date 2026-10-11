import { ActionIntent } from "./travel-information.types.js";
import { TransactionRequestDetector } from "./transaction-request.detector.js";
import { TransactionDetectionResult } from "./travel-information.types.js";

export class TransactionGuardService {
    /**
     * Curated official portal URLs for self-service redirection
     */
    static OFFICIAL_PORTALS = {
        irctc: "https://www.irctc.co.in",
        msrtc: "https://msrtc.maharashtra.gov.in",
        redbus: "https://www.redbus.in",
        google_flights: "https://www.google.com/travel/flights",
        asi_monuments: "https://asi.paygov.in",
        pune_metro: "https://www.punemetrorail.org",
        mumbai_metro: "https://www.mmrcl.com"
    };
    /**
     * Multilingual refusal message templates
     */
    static REFUSAL_TEMPLATES = {
        en: {
            train: {
                intro: "⚠️ I am an informational AI travel companion, and cannot book train tickets or reserve seats directly.",
                actionGuidance: "You can check live seat availability and complete your train ticket booking on the official IRCTC portal:",
                officialPortalLabel: "IRCTC Official Portal",
                defaultUrl: "https://www.irctc.co.in"
            },
            bus: {
                intro: "⚠️ I am an informational AI travel companion, and cannot book bus tickets directly.",
                actionGuidance: "You can book your bus tickets through official state transport portals (MSRTC) or verified bus aggregators (RedBus):",
                officialPortalLabel: "MSRTC Portal: https://msrtc.maharashtra.gov.in\nRedBus Portal",
                defaultUrl: "https://www.redbus.in"
            },
            flight: {
                intro: "⚠️ I am an informational AI travel companion, and cannot purchase airline tickets directly.",
                actionGuidance: "You can compare live airfares and book directly through airline websites or Google Flights:",
                officialPortalLabel: "Google Flights Search",
                defaultUrl: "https://www.google.com/travel/flights"
            },
            hotel: {
                intro: "⚠️ I am an informational AI travel companion, and cannot book hotel rooms or process hotel payments directly.",
                actionGuidance: "Please check verified hotel rates and book directly via the hotel's website or Google Maps listing.",
                officialPortalLabel: "Google Maps Stays",
                defaultUrl: "https://www.google.com/maps"
            },
            restaurant: {
                intro: "⚠️ I am an informational AI travel companion, and cannot reserve restaurant tables directly.",
                actionGuidance: "Please call the restaurant directly or check their Google Maps profile to reserve your table."
            },
            attraction: {
                intro: "⚠️ I am an informational AI travel companion, and cannot purchase monument or attraction entry tickets directly.",
                actionGuidance: "You can book official e-tickets for ASI monuments and national heritage sights at the official ticket portal:",
                officialPortalLabel: "ASI Official Ticket Portal",
                defaultUrl: "https://asi.paygov.in"
            },
            cab: {
                intro: "⚠️ I am an informational AI travel companion, and cannot book taxis, cabs, or auto-rickshaws directly.",
                actionGuidance: "Please use official ride-hailing apps (Ola, Uber) or local prepaid taxi booths at stations/airports."
            },
            metro: {
                intro: "⚠️ I am an informational AI travel companion, and cannot purchase metro QR tickets or smart cards directly.",
                actionGuidance: "You can purchase metro tickets at station vending counters, official metro apps, or official operator portals:",
                officialPortalLabel: "Pune Metro / Mumbai Metro",
                defaultUrl: "https://www.punemetrorail.org"
            },
            general: {
                intro: "⚠️ I am an informational AI travel companion, and cannot execute purchases, bookings, or financial transactions.",
                actionGuidance: "I can provide verified route details, timetables, cancellation policies, and official booking portal links so you can complete your booking yourself."
            }
        },
        hi: {
            train: {
                intro: "⚠️ मैं एक सूचनात्मक AI यात्रा सहायक हूँ और सीधे ट्रेन टिकट बुक या सीट रिज़र्व नहीं कर सकता।",
                actionGuidance: "आप वास्तविक सीट उपलब्धता और टिकट बुकिंग आधिकारिक IRCTC पोर्टल पर कर सकते हैं:",
                officialPortalLabel: "IRCTC आधिकारिक पोर्टल",
                defaultUrl: "https://www.irctc.co.in"
            },
            bus: {
                intro: "⚠️ मैं एक सूचनात्मक AI यात्रा सहायक हूँ और सीधे बस टिकट बुक नहीं कर सकता।",
                actionGuidance: "आप आधिकारिक राज्य परिवहन (MSRTC) या RedBus पोर्टल पर अपनी बस टिकट बुक कर सकते हैं:",
                officialPortalLabel: "RedBus पोर्टल",
                defaultUrl: "https://www.redbus.in"
            },
            flight: {
                intro: "⚠️ मैं एक सूचनात्मक AI यात्रा सहायक हूँ और सीधे फ्लाइट टिकट नहीं खरीद सकता।",
                actionGuidance: "आप Google Flights या एयरलाइन की आधिकारिक वेबसाइट पर लाइव किराया देखकर टिकट बुक कर सकते हैं:",
                officialPortalLabel: "Google Flights",
                defaultUrl: "https://www.google.com/travel/flights"
            },
            hotel: {
                intro: "⚠️ मैं एक सूचनात्मक AI यात्रा सहायक हूँ और सीधे होटल रूम बुक नहीं कर सकता।",
                actionGuidance: "कृपया होटल के आधिकारिक पेज या Google Maps लिस्टिंग के माध्यम से सीधे बुकिंग करें।",
                officialPortalLabel: "Google Maps",
                defaultUrl: "https://www.google.com/maps"
            },
            restaurant: {
                intro: "⚠️ मैं एक सूचनात्मक AI यात्रा सहायक हूँ और सीधे रेस्टोरेंट टेबल रिज़र्व नहीं कर सकता।",
                actionGuidance: "कृपया टेबल रिज़र्वेशन के लिए रेस्टोरेंट से सीधे संपर्क करें या उनके Google Maps प्रोफाइल पर देखें।"
            },
            attraction: {
                intro: "⚠️ मैं एक सूचनात्मक AI यात्रा सहायक हूँ और सीधे स्मारक या पर्यटन टिकट नहीं खरीद सकता।",
                actionGuidance: "आप ASI स्मारकों के लिए आधिकारिक ई-टिकट पोर्टल से ऑनलाइन टिकट बुक कर सकते हैं:",
                officialPortalLabel: "ASI टिकट पोर्टल",
                defaultUrl: "https://asi.paygov.in"
            },
            cab: {
                intro: "⚠️ मैं एक सूचनात्मक AI यात्रा सहायक हूँ और सीधे कैब या टैक्सी बुक नहीं कर सकता।",
                actionGuidance: "कृपया कैब बुकिंग के लिए Ola/Uber ऐप या स्टेशन पर प्रीपेड टैक्सी बूथ का उपयोग करें।"
            },
            metro: {
                intro: "⚠️ मैं एक सूचनात्मक AI यात्रा सहायक हूँ और सीधे मेट्रो टिकट नहीं खरीद सकता।",
                actionGuidance: "आप मेट्रो स्टेशन टिकट काउंटर, आधिकारिक मेट्रो ऐप या पोर्टल से टिकट ले सकते हैं:",
                officialPortalLabel: "मेट्रो पोर्टल",
                defaultUrl: "https://www.punemetrorail.org"
            },
            general: {
                intro: "⚠️ मैं एक सूचनात्मक AI यात्रा सहायक हूँ और टिकट बुक, रिज़र्वेशन या वित्तीय लेनदेन नहीं कर सकता।",
                actionGuidance: "मैं आपको यात्रा मार्ग, समय सारिणी, कैंसिलेशन नियम और आधिकारिक बुकिंग लिंक प्रदान कर सकता हूँ ताकि आप स्वयं बुकिंग कर सकें।"
            }
        },
        mr: {
            train: {
                intro: "⚠️ मी एक माहितीपर AI ट्रॅव्हल असिस्टंट आहे आणि थेट रेल्वे तिकीट बुकिंग किंवा आरक्षण करू शकत नाही.",
                actionGuidance: "तुम्ही उपलब्ध जागा तपासून अधिकृत IRCTC पोर्टलवर तिकीट बुकिंग करू शकता:",
                officialPortalLabel: "IRCTC अधिकृत पोर्टल",
                defaultUrl: "https://www.irctc.co.in"
            },
            bus: {
                intro: "⚠️ मी एक माहितीपर AI ट्रॅव्हल असिस्टंट आहे आणि थेट बस तिकीट बुक करू शकत नाही.",
                actionGuidance: "तुम्ही अधिकृत MSRTC (एसटी) किंवा RedBus पोर्टलवरून बस तिकीट बुक करू शकता:",
                officialPortalLabel: "MSRTC पोर्टल: https://msrtc.maharashtra.gov.in\nRedBus",
                defaultUrl: "https://www.redbus.in"
            },
            flight: {
                intro: "⚠️ मी एक माहितीपर AI ट्रॅव्हल असिस्टंट आहे आणि थेट विमान तिकीट खरेदी करू शकत नाही.",
                actionGuidance: "तुम्ही थेट एअरलाईनच्या अधिकृत संकेतस्थळावरून किंवा Google Flights वरून बुकिंग करू शकता:",
                officialPortalLabel: "Google Flights",
                defaultUrl: "https://www.google.com/travel/flights"
            },
            hotel: {
                intro: "⚠️ मी एक माहितीपर AI ट्रॅव्हल असिस्टंट आहे आणि थेट हॉटेल रूम बुक करू शकत नाही.",
                actionGuidance: "कृपया हॉटेलच्या अधिकृत वेबसाईटवरून किंवा Google Maps वरून थेट रूम बुकिंग करा.",
                officialPortalLabel: "Google Maps",
                defaultUrl: "https://www.google.com/maps"
            },
            restaurant: {
                intro: "⚠️ मी एक माहितीपर AI ट्रॅव्हल असिस्टंट आहे आणि थेट रेस्टॉरंट टेबल बुक करू शकत नाही.",
                actionGuidance: "कृपया टेबल आरक्षणासाठी रेस्टॉरंटशी थेट संपर्क साधा किंवा त्यांचे Google Maps प्रोफाईल तपासा."
            },
            attraction: {
                intro: "⚠️ मी एक माहितीपर AI ट्रॅव्हल असिस्टंट आहे आणि थेट स्मारक किंवा पर्यटन तिकीट खरेदी करू शकत नाही.",
                actionGuidance: "तुम्ही ASI स्मारकांसाठी अधिकृत ई-तिकीट पोर्टलवरून ऑनलाईन तिकीट बुक करू शकता:",
                officialPortalLabel: "ASI अधिकृत तिकीट पोर्टल",
                defaultUrl: "https://asi.paygov.in"
            },
            cab: {
                intro: "⚠️ मी एक माहितीपर AI ट्रॅव्हल असिस्टंट आहे आणि थेट टॅक्सी किंवा कॅब बुक करू शकत नाही.",
                actionGuidance: "कृपया प्रवासासाठी Ola, Uber ॲप्स किंवा स्थानिक प्री-पेड टॅक्सी बूथचा वापर करा."
            },
            metro: {
                intro: "⚠️ मी एक माहितीपर AI ट्रॅव्हल असिस्टंट आहे आणि थेट मेट्रो तिकीट खरेदी करू शकत नाही.",
                actionGuidance: "तुम्ही मेट्रो स्टेशन काऊंटर किंवा अधिकृत मेट्रो पोर्टलवरून तिकीट घेऊ शकता:",
                officialPortalLabel: "मेट्रो पोर्टल",
                defaultUrl: "https://www.punemetrorail.org"
            },
            general: {
                intro: "⚠️ मी एक माहितीपर AI ट्रॅव्हल असिस्टंट आहे आणि थेट तिकीट बुकिंग, आरक्षण किंवा कोणतेही आर्थिक व्यवहार करू शकत नाही.",
                actionGuidance: "मी तुम्हाला प्रवासाचे मार्ग, वेळापत्रक, कॅन्सलेशन नियम आणि अधिकृत पोर्टल लिंक्स देऊ शकतो जेणेकरून तुम्ही स्वतः बुकिंग करू शकाल."
            }
        }
    };
    /**
     * Evaluates text for transaction request and returns structured refusal if positive.
     */
    static evaluateTransactionGuard(text: string, language = "en") {
        const detection = TransactionRequestDetector.detect(text);
        if (!detection.isTransactionRequest) {
            return null;
        }
        return this.formatRefusalResponse(detection, language);
    }
    /**
     * Formats a localized refusal response for a detected transaction request.
     */
    static formatRefusalResponse(detection: TransactionDetectionResult, language = "en") {
        const lang = this.REFUSAL_TEMPLATES[language] ? language : "en";
        const serviceType = detection.serviceType || "general";
        const template = this.REFUSAL_TEMPLATES[lang][serviceType] || this.REFUSAL_TEMPLATES[lang].general;
        const parts = [template.intro, template.actionGuidance];
        let portalUrl = template.defaultUrl;
        if (serviceType === "train") {
            portalUrl = this.OFFICIAL_PORTALS.irctc;
        }
        else if (serviceType === "attraction") {
            portalUrl = this.OFFICIAL_PORTALS.asi_monuments;
        }
        else if (serviceType === "flight") {
            portalUrl = this.OFFICIAL_PORTALS.google_flights;
        }
        if (portalUrl) {
            parts.push(portalUrl);
        }
        const message = parts.join("\n\n");
        return {
            refused: true,
            message,
            serviceType,
            officialBookingUrl: portalUrl,
            actionIntent: ActionIntent.TRANSACTION_REQUEST,
            language: lang
        };
    }
}
