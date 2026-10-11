import { RecommendedTransitMode, TransitReasonCode } from "./navigation.types.js";

export interface NavigationPresenterStrings {
    viewOnMap: string;
    directions: string;
    transitAdvisoryHeader: string;
    modes: Record<RecommendedTransitMode, string>;
    reasonNotes: Record<TransitReasonCode, string>;
    stepFreeDisclaimer: string;
}
export const MULTILINGUAL_NAVIGATION_STRINGS = {
    en: {
        viewOnMap: "View on Map",
        directions: "Directions",
        transitAdvisoryHeader: "Transit Advisory",
        modes: {
            walking: "Walking",
            public_transit: "Public Transit",
            taxi_rideshare: "Taxi / Rideshare",
            driving: "Driving"
        },
        reasonNotes: {
            short_walking_distance: "Close proximity; walkable under normal conditions.",
            high_walking_tolerance: "Walkable based on high walking tolerance preference.",
            minimal_walking_preference: "Minimal walking requested; taxi or rideshare recommended.",
            moderate_transit_distance: "Moderate distance; public transit or taxi recommended.",
            long_distance_vehicle: "Cross-city travel; vehicle transport or cab recommended.",
            weather_advisory_vehicle: "Weather may be unfavorable for walking; local transit or cab advised."
        },
        stepFreeDisclaimer: "Please verify step-free access and facility support at venue."
    },
    hi: {
        viewOnMap: "नक्शे पर देखें",
        directions: "दिशा-निर्देश",
        transitAdvisoryHeader: "यात्रा सलाह",
        modes: {
            walking: "पैदल",
            public_transit: "सार्वजनिक परिवहन",
            taxi_rideshare: "टैक्सी / ऑटो",
            driving: "ड्राइविंग"
        },
        reasonNotes: {
            short_walking_distance: "नजदीकी दूरी; सामान्य स्थिति में पैदल जाया जा सकता है।",
            high_walking_tolerance: "पैदल चलने की प्राथमिकता के अनुसार पैदल तय करने योग्य दूरी।",
            minimal_walking_preference: "कम पैदल चलने की प्राथमिकता; टैक्सी या ऑटो का उपयोग सुगम रहेगा।",
            moderate_transit_distance: "मध्यम दूरी; सार्वजनिक परिवहन या टैक्सी का उपयोग सुविधाजनक रहेगा।",
            long_distance_vehicle: "शहर में लंबी दूरी; वाहन या कैब की सलाह दी जाती है।",
            weather_advisory_vehicle: "मौसम पैदल चलने के अनुकूल नहीं हो सकता; स्थानीय वाहन या कैब की सलाह है।"
        },
        stepFreeDisclaimer: "कृपया स्थल पर व्हीलचेयर / रैंप व आवश्यक सुविधाओं की जांच कर लें।"
    },
    mr: {
        viewOnMap: "नकाशावर पहा",
        directions: "मार्गदर्शन",
        transitAdvisoryHeader: "प्रवास सल्ला",
        modes: {
            walking: "चालत",
            public_transit: "सार्वजनिक वाहतूक",
            taxi_rideshare: "टॅक्सी / रिक्षा",
            driving: "स्वतःचे वाहन"
        },
        reasonNotes: {
            short_walking_distance: "जवळचे अंतर; सामान्य स्थितीत चालत जाणे सोयीचे आहे.",
            high_walking_tolerance: "चालण्याची तयारी असल्याने पायी जाणे शक्य आहे.",
            minimal_walking_preference: "कमी चालण्याची विनंती; टॅक्सी किंवा रिक्षा वापरणे सोयीस्कर ठरेल.",
            moderate_transit_distance: "मध्यम अंतर; बस/मेट्रो किंवा टॅक्सीचा वापर सोयीचा ठरेल.",
            long_distance_vehicle: "लांबचे अंतर; वाहन किंवा कॅबचा पर्याय योग्य राहील.",
            weather_advisory_vehicle: "हवामान चालण्यासाठी प्रतिकूल असू शकते; स्थानिक वाहतूक किंवा कॅबचा वापर करा."
        },
        stepFreeDisclaimer: "कृपया त्या ठिकाणी पायऱ्यांशिवाय (रॅम्प) प्रवेश आणि इतर सोयींची खात्री करा."
    }
};
